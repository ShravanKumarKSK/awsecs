import axios from "axios";
import { loggerInstance } from './auditService'


const logger = loggerInstance(__filename);
/**
 * API to get address suggestions using company name search string from post coder
 * @param companyName search string
 * @returns address suggestions with IDs
 */
export async function postCoderFind(companyName: string) {
  try {
    //Post coder find API call which takes company name search string as parameter and gives address suggestions
    const response: any = await axios.get(
      `${process.env.POSTCODER_URL}/autocomplete/find?query=${companyName}&country=uk&apikey=${process.env.POSTCODER_KEY}`
    );
    const x = response.data;

    let suggestions = x.filter((obj) => obj.type === "ADD");
    const suggestions1 = x.filter((obj) => obj.type !== "ADD");

    const ids = suggestions1.map((obj) => obj.id);

    const narrowedSuggestions = ids.reduce(async (data, id) => {
      const acc = await data;
      //find API call to get narrowed address suggestions
      const response = await axios.get(
        `${process.env.POSTCODER_URL}/autocomplete/find?query=${companyName}&pathfilter=${id}&country=uk&apikey=${process.env.POSTCODER_KEY}&format=json`
      );
      const result = response.data;
      return [...acc, ...result];
    }, Promise.resolve([]));

    const allSuggestions = await narrowedSuggestions;
    suggestions.push(...allSuggestions);

    return suggestions.map((x) => ({
      summaryLine: x.summaryline,
      locationSummary: x.locationsummary,
      id: x.id,
    }));
  } catch (error) {
    logger.info("Error in postCoderFind: ", error);
    return { status: 'error', error: error };
  }
}

/**
 * API to retrieve the full address using company name search string and ID of address suggestion which we get from find API call to post coder
 * @param companyName search string, ID of address suggestion
 * @returns full address of the suggestion
 */
export async function postCoderRetrieve(companyName: string, id: string) {

  try {
    const response: any = await axios.get(`${process.env.POSTCODER_URL}/autocomplete/retrieve/?id=${id}&query=${companyName}&country=uk&apikey=${process.env.POSTCODER_KEY}`)
    return response.data.map(obj => ({ ...obj, country: "UK" }));
  }
  catch (error) {
    console.log('Error in postCoderRetrieve: ', error);
    return { status: 'error', error: error };
  }

}

/**
 * API to validate bank account details (sort code and account number) and fetch the bank name and bank branch
 * @param sortCode, accountNumber
 * @returns bank name and bank branch
 */
export async function verifyBankDetails(sortCode: string, accountNumber: string) {

  const data = {
    "sortcode": sortCode,
    "accountnumber": accountNumber
  }
  try {
    const response = await axios.post(`${process.env.POSTCODER_URL}/${process.env.POSTCODER_KEY}/bank`, data);
    const bankDetails = response.data;

    let bankName, branchName

    if (bankDetails.valid === true) {
      bankName = bankDetails.bankname;
      branchName = bankDetails.branchname;
    }
    else {
      bankName = "bank account details are invalid";
      branchName = "bank account details are invalid";
    }

    return { "bankName": bankName, "branchName": branchName };
  }
  catch (error) {
    console.log('Error in Bank Details Validation: ', error);
    return { status: 'error', error: error };
  }

}
