import axios from "axios";
import { ExternalIntegrations } from "../models";
import { createMimeMessage, sendMail } from "./emailService";
import { getExternalIntegration } from "./externalIntegrationService";
import { fetchAccountId } from "./nCinoService";
import { loggerInstance } from "./auditService";

const logger = loggerInstance(__filename);
/**
 * API to fetch organisationId from codat
 * @returns organisationId
 */
export async function fetchOrganisationID() {
  const response = await axios.get(
    `${process.env.CODAT_URL}/connections?page=1&pageSize=100}`,
    {
      headers: {
        Authorization: `Basic ${process.env.CODAT_TOKEN}`,
      },
    }
  );
  logger.info("response for codat fetchOrganisationid: ", response);
  return response.data.results[0].organizationId;
}

/**
 * API to get Integration link from codat for given user
 * @param loanApplicationId
 * @returns Integrationlink
 */
export async function getCodatIntegrationLink(loanApplicationId: number) {
  const accountId = await fetchAccountId(loanApplicationId);
  if (!accountId) {
    throw new Error("Account Id is not available");
  }
  const organisationID = await fetchOrganisationID();

  let payload = {
    accountId: `${accountId}`,
    organizationId: `${organisationID}`,
  };

  // Fetch codat status
  const getresponse = await fetchCodatIntegrationStatus(accountId);
  logger.info(
    "getresponse in fetch codatstatus of company: ",
    getresponse,
    "\n nCinoAccountId: ",
    accountId
  );

  let link, postresponse, codatRecordID;
  // If codat link is already generated but not consent not yet given, then send the same link. Else generate link and send
  if (getresponse.data.status != "NotConnected") {
    link = getresponse.data.linkSiteUrl;
    codatRecordID = getresponse.data.id;
  } else {
    postresponse = await axios.post(
      `${process.env.CODAT_URL}/account/${accountId}/company?organizationId=${organisationID}`,
      payload,
      {
        headers: {
          Authorization: `Basic ${process.env.CODAT_TOKEN}`,
        },
      }
    );
    logger.info(
      "postresponse in fetch codatstatus of company: ",
      postresponse,
      "\n nCinoAccountId: ",
      accountId
    );
    link = postresponse.data.linkSiteUrl;
    codatRecordID = postresponse.data.id;
  }
  // Saving Codat details to Portal Application data (backend db)
  let externalIntegration = await getExternalIntegration({
    provider: "CODAT",
    loanApplicationId: loanApplicationId,
  });

  if (!externalIntegration && codatRecordID) {
    await ExternalIntegrations.create({
      loanApplicationId: loanApplicationId,
      provider: "CODAT",
      externalId: codatRecordID,
      startTimestamp: new Date(),
      status: "STARTED",
      externalStatus: "CodatConnectionPending",
    });
  } else {
    externalIntegration.startTimestamp = new Date();
    await externalIntegration.save();
  }

  return { link: link, codatRecordID: codatRecordID };
}

/**
 * API to return custom response based on codat integration status
 * @param loanApplicationId
 * @returns codatConnectionStatus
 */
export async function codatIntegrationStatus(loanApplicationId: number) {
  const accountId = await fetchAccountId(loanApplicationId);
  if (!accountId) {
    throw new Error("Account Id is not available");
  }
  const getresponse = await fetchCodatIntegrationStatus(accountId);

  let status = getresponse.data.status;
  const CodatConnectionPending = process.env.CODAT_PENDING.split(",");
  const CodatConnectionSuccessful = process.env.CODAT_SUCCESSFUL.split(",");
  let codatConnectionStatus;

  let externalIntegration = await getExternalIntegration({
    provider: "CODAT",
    loanApplicationId: loanApplicationId,
  });

  codatConnectionStatus = CodatConnectionPending.includes(status)
    ? "CodatConnectionPending"
    : "CodatConnectionSuccessful";

  if (codatConnectionStatus === "CodatConnectionSuccessful") {
    externalIntegration.status = "COMPLETED";
    externalIntegration.completeTimestamp = getresponse.data.lastSync; //codat status timestamp should be assigned
  }

  externalIntegration.lastStatusCheckTimestamp = new Date();
  externalIntegration.externalStatus = codatConnectionStatus;

  await externalIntegration.save();
  return { codatConnectionStatus: codatConnectionStatus };
}

/**
 * API to fetch codat integration status of a given account
 * @param accountId
 * @returns response
 */
export async function fetchCodatIntegrationStatus(accountId) {
  return await axios.get(
    `${process.env.CODAT_URL}/account/${accountId}/company`,
    {
      headers: {
        Authorization: `Basic ${process.env.CODAT_TOKEN}`,
      },
    }
  );
}
/**
 * API to send codat integration link via email
 * @param loanApplicationId
 * @param emailID
 * @returns sends codat integration link via email
 */
export async function sendCodatLinkViaEmail(loanApplicationId, emailID) {
  let recipientEmailID = emailID;
  let consentLink = (await getCodatIntegrationLink(loanApplicationId)).link;

  try {
    let info: any;
    info = {
      from: `${process.env.SES_SENDER_EMAIL}`,
      to: recipientEmailID,
      subject: "Codat consent link",
      text: `${consentLink}`,
    };
    const params = await {
      RawMessage: {
        Data: await createMimeMessage(info),
      },
    };
    var output = await sendMail(params);
    return await output;
  } catch (err) {
    logger.info("error message", err.message);
    return err.message;
  }
}
