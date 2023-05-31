import axios from 'axios';
import lodash from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import { ExternalIntegrations } from '../models';

import {
    createMimeMessage,
    fetchAccountId,
    getExternalIntegration,
    sendMail,
} from '../services';

import { loggerInstance } from './auditService';

const logger = loggerInstance(__filename);
/**
 * function to fetch external id/ tracking id from external integration table
 * @param loanAppId loan application id
 * @returns tracking id/external id
 */
export async function fetchExternalIdOpenBanking(loanAppId: number) {
  let externalIntegration = await getExternalIntegration({
    provider: 'OPEN_BANKING',
    loanApplicationId: loanAppId,
  });
  let trackingId;
  if (!externalIntegration) {
    trackingId = await uuidv4();
    await ExternalIntegrations.create({
      loanApplicationId: loanAppId,
      provider: 'OPEN_BANKING',
      externalId: trackingId,
      startTimestamp: new Date(),
      status: 'STARTED',
      externalStatus: 'OpenBankingConnectionPending',
    });
  } else {
    trackingId = externalIntegration.externalId;
  }
  return trackingId;
}

/**
 * function to generate open banking url
 * @param loanAppId loan application id
 * @param userEmail user email id
 * @returns open banking url
 */
export async function getOpenBankingIntegrationLink(
  loanAppId: number,
  userEmail
) {
  const accountId = await fetchAccountId(loanAppId);
  if (!accountId) {
    throw new Error('Account Id is not available');
  }
  let trackingId = await fetchExternalIdOpenBanking(loanAppId);
  const response = `${process.env.OPEN_BANKING_URL}/?response_type=${process.env.OPEN_BANKING_RESPONSE_TYPE}&client_id=${process.env.OPEN_BANKING_CLIENT_ID}&scope=${process.env.OPEN_BANKING_SCOPE}&redirect_uri=${process.env.OPEN_BANKING_REDIRECT_URI}&providers=${process.env.OPEN_BANKING_PROVIDERS1}&user_email=${userEmail}&providers=${process.env.OPEN_BANKING_PROVIDERS2}&state=${accountId}&tracking_id=${trackingId}`;
  return { link: response };
}

/**
 * function to fetch access token to track open banking status
 * @returns access token
 */
export async function fetchAccessToken() {
  try {
    let payload = {
      grant_type: process.env.OPEN_BANKING_GRANT_TYPE,
      scope: 'tracking',
      client_id: process.env.OPEN_BANKING_CLIENT_ID,
      client_secret: process.env.OPEN_BANKING_CLIENT_SECRET,
    };
    let postUrl = `${process.env.OPEN_BANKING_URL}/connect/token`;
    let response = await axios.post(postUrl, payload, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    return response.data.access_token;
  } catch (error) {
    return error.message;
  }
}

/**
 * function to track open banking status
 * @param loanAppId loan application id
 * @returns open banking status
 */
export async function trackOpenBankingStatus(loanAppId: number) {
  try {
    let trackingId = await fetchExternalIdOpenBanking(loanAppId);
    let accessToken = await fetchAccessToken();
    let trackingUrl = `${process.env.OPEN_BANKING_TRACKING_URL}/v1/tracked-events?tracking_id=${trackingId}`;
    let response = await axios.get(trackingUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });
    let openBankingStatus, statusDB, requiredResponse;
    const results = response.data.results;
    const sortedByLatest = await lodash.sortBy(results, 'time').reverse();
    openBankingStatus = sortedByLatest[0].name;
    if (openBankingStatus == process.env.OPEN_BANKING_SUCCESS_STATUS) {
      statusDB = 'COMPLETED';
      requiredResponse = 'Success';
    }
    if (statusDB == 'COMPLETED') {
      await ExternalIntegrations.update(
        {
          externalStatus: openBankingStatus,
          completeTimestamp: sortedByLatest[0].time,
          lastStatusCheckTimestamp: new Date(),
          status: statusDB,
        },
        { where: { externalId: trackingId } }
      );
    } else {
      requiredResponse = 'In process';
      await ExternalIntegrations.update(
        {
          externalStatus: openBankingStatus,
          lastStatusCheckTimestamp: new Date(),
        },
        { where: { externalId: trackingId } }
      );
    }
    return { openBankingConnectionStatus: requiredResponse };
  } catch (error) {
    if (error.code == 'ERR_BAD_REQUEST') {
      throw new Error('Open Banking Flow not yet started');
    } else {
      return error;
    }
  }
}

/**
 * function to send open banking url via email
 * @param loanAppId loan application Id
 * @param emailId to email id
 * @returns message id
 */
export async function sendOpenBankingLinkViaEmail(loanAppId, emailId) {
  let consentLink = (await getOpenBankingIntegrationLink(loanAppId, emailId))
    .link;
  try {
    let info: any;
    info = {
      from: `${process.env.SES_SENDER_EMAIL}`,
      to: emailId,
      subject: 'Open Banking consent link',
      text: `${consentLink}`,
    };
    const params = await {
      RawMessage: {
        Data: await createMimeMessage(info),
      },
    };
    var output: any = await sendMail(params);
    return { ...{ 'Email sent to ': emailId }, ...output };
  } catch (err) {
    logger.info('error message', err.message);
    return err.message;
  }
}
