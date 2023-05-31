import axios from "axios";
import { keyIndividualsDetails } from "../interfaces";

import { loggerInstance } from "./auditService";

const logger = loggerInstance(__filename);
/**
 * Function to get DIP status for business types Limited company, PLC and Limited Liability Partnership
 * @param companyName, companyRegistrationNumber
 * @returns DIP status
 */
export async function companyMasterJourney(
  companyName: string,
  companyRegistrationNumber: string
) {
  // Request body for company Master Journey
  var data = {
    country: "United Kingdom",
    journeyId: 4288,
    journeyName: "1a. Company Master Journey",
    journeyType: {
      id: 5,
      label: "KYC",
    },
    company: [
      {
        businessName: companyName,
        businessRegNumber: companyRegistrationNumber,
      },
    ],
  };

  // company Master Journey response
  const runjourneyResponse = await axios.post(
    `${process.env.TRUNARRATIVE_URL}/TruRest/RunJourney`,
    data,
    {
      headers: {
        Authorization: `Basic ${process.env.TRUNARRATIVE_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  // retrieving DIP outcome from company Master Journey response data
  const DIPOutcome = runjourneyResponse.data.status.Label;

  const DIPAccepted = process.env.DIP_STATUS_ACCEPTED.split(",");

  let DIPStatus: string = "Declined";

  // Update the DIP status for accepeted outcomes
  if (DIPAccepted.includes(DIPOutcome)) {
    DIPStatus = "Accepted";
  }

  return { DIPStatus: DIPStatus };
}

/**
 * Function to get DIP status of each key individual from Individual DIP journey
 * @param person: Key Individual
 * @returns DIP status for each key individual
 */
export async function individualDIPJourney(person) {
  // Request body for Individual DIP Journey
  var data = {
    country: "United Kingdom",
    journeyId: 19235,
    journeyName: "Individual DIP Journey",
    journeyType: {
      id: 5,
      label: "KYC",
    },
    person: [person],
  };

  // Individual DIP Journey response
  const runjourneyResponse = await axios.post(
    `${process.env.TRUNARRATIVE_URL}/TruRest/RunJourney`,
    data,
    {
      headers: {
        Authorization: `Basic ${process.env.TRUNARRATIVE_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  // retrieving DIP outcome for a individual from Individual DIP Journey response data
  const DIPOutcome = runjourneyResponse.data.status.Label;

  return DIPOutcome;
}

/**
 * Function to get DIP status for business types General Partnership and Sole Trader
 * Makes individualDIPJourney function call to each key individual and returns the DIP status of the entity
 * @param keyIndividuals
 * @returns DIP status of the entity
 */
export async function individualsDIPOutcome(
  keyIndividuals: keyIndividualsDetails[]
): Promise<any> {
  // fetching data required for individual DIP Journey request body from key Individuals details
  var individualsDetails = keyIndividuals.map((obj) => ({
    role: obj.positionHeld,
    clientReference: "",
    firstName: obj.firstName,
    middleNames: "",
    lastName: obj.lastName,
    dateOfBirth: "",
    emailAddress: obj.email,
    mobilePhoneNumber: obj.phone,
    gender: "",
    residentialAddress: [
      {
        addressLine1: "",
        addressLine2: "",
        addressLine3: "",
        addressLine4: "",
        addressLine5: "",
        zipPostcode: "",
        country: "",
      },
    ],
  }));

  // making Individual DIP Journey for all key individuals and storing their DIP outcome
  let DIPOutcomes: any[] = await Promise.all(
    individualsDetails.map(individualDIPJourney)
  );

  const DIPAccepted = process.env.DIP_STATUS_ACCEPTED.split(",");

  let DIPStatus: string;

  for (let i = 0; i < DIPOutcomes.length; i++) {
    if (DIPAccepted.includes(DIPOutcomes[i]) && DIPStatus != "Declined") {
      DIPStatus = "Accepted";
    } else {
      DIPStatus = "Declined";
    }
  }

  return { DIPStatus: DIPStatus };
}
