import axios from "axios";
import { keyIndividualsDetails } from "../interfaces";
import { loggerInstance } from './auditService'

const logger = loggerInstance(__filename);

/**
 * API to fetch company details like registered office address and sic code from Companies House.
 * @param companyRegistrationNumber
 * @returns Registered Address, SIC Code
 */
export async function retrieveCompanyDetails(
  companyRegistrationNumber: string
) {
  //company profile API call to Companies House
  const response = await axios.get(
    `${process.env.COMPANY_HOUSE_URL}/company/${companyRegistrationNumber}`,
    {
      headers: {
        Authorization: `Basic ${process.env.COMPANY_HOUSE_TOKEN}`,
      },
    }
  );

  let registeredAddress = response.data.registered_office_address;
  const SICCode = response.data.sic_codes;

  registeredAddress = {
    line1: registeredAddress.address_line_1,
    line2: registeredAddress.address_line_2,
    city: registeredAddress.locality,
    country: registeredAddress.country,
    postalcode: registeredAddress.postal_code,
    addressType: "REGISTERED_ADDRESS",
  };

  return { registered_address: registeredAddress, sic_code: SICCode };
}

/**
 * API to fetch officers details from Companies House.
 * @param companyRegistrationNumber
 * @returns Key Individuals details
 */
export async function retrieveKeyIndividualsDetails(
  companyRegistrationNumber: string
): Promise<keyIndividualsDetails[]> {
  //officers API call to Companies House
  const response = await axios.get(
    `${process.env.COMPANY_HOUSE_URL}/company/${companyRegistrationNumber}/officers`,
    {
      headers: {
        Authorization: `Basic ${process.env.COMPANY_HOUSE_TOKEN}`,
      },
    }
  );

  const officersDetails = response.data.items;

  const keyIndividualsDetails = officersDetails.map((item) => ({
    title: "",
    firstName: item.name.split(",")[0]?.trim(),
    lastName: item.name.split(",")[1]?.trim(),
    dob: item.date_of_birth,
    email: "",
    phone: "",
    nationality: item.nationality,
    role: item.officer_role,
    permanentResident: "",
    companyOwnershipPercentage: "",
    address: item.address,
  }));

  return keyIndividualsDetails;
}

/**
 * API to fetch company reg number and name using companyname search string
 * @param companyName
 * @returns {'companyName', 'companyRegistrationNumber'}
 */
export async function findCompanyNumberByName(
  companyName: string
): Promise<object[]> {
  try {
    const response: any = await axios.get(
      `${process.env.COMPANY_HOUSE_URL}/advanced-search/companies?company_name_includes=${companyName}`,
      {
        headers: {
          Authorization: `Basic ${process.env.COMPANY_HOUSE_TOKEN}`,
        },
      }
    );
    return response.data.items.map((x) => ({
      companyName: x.company_name,
      companyRegistrationNumber: x.company_number,
    }));
  } catch (error) {
    logger.info("Error in findCompanyNumberByName: ", error);
    return [];
  }
}
