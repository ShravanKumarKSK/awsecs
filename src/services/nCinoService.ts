import axios from 'axios';
import jsforce from 'jsforce';
import loanDetails from '../config/loanDetailsConfig.json';
import {
  PaymentDetails,
  RePaymentDetails,
  ReferralObjectInput,
} from '../interfaces';

import lodash from 'lodash';
import { Company, LoanApplication } from '../models';
import { loggerInstance } from './auditService';
import { getCompany } from './portalUserService';

import { getLoanApplication } from './loanApplicationService';

const fs = require('fs');
const documentNames = loanDetails.documentNamesMapping;

const logger = loggerInstance(__filename);
/**
 * function to return nCino credentials
 * @returns nCino credentials
 */
export async function getApiCredentials() {
  return {
    username: `${process.env.NCINO_USERNAME}`,
    password: `${process.env.NCINO_PASSWORD}`,
    security_token: `${process.env.NCINO_SECURITY_TOKEN}`,
    domain: `${process.env.NCINO_DOMAIN}`,
  };
}

const con = new jsforce.Connection({
  loginUrl: `${process.env.NCINO_SALESFORCE_LOGIN_URL}`,
});

/**
 * function to create referral object in ncino
 * @param input, object with required fields
 * @returns referral object
 */
export async function referralObject(
  input: ReferralObjectInput,
  loanApplicationId: number,
  companyRegistrationNumber: string,
  productName: string = 'WorkingCapital'
) {
  logger.defaultMeta.eventType = 'REFERRAL_OBJECT_CREATION'; //referralObject creation
  logger.defaultMeta.eventParams = { referralObject: JSON.stringify(input) };
  try {
    let productIndexReferral = loanDetails.loanTypes.findIndex(
      (type) => type.name == productName
    );
    const nCinoProductDetails =
      loanDetails.loanTypes[productIndexReferral].nCinoProductDetails;
    const credentials = await getApiCredentials();
    await con.login(
      credentials.username,
      credentials.password + credentials.security_token
    );
    const referredTo = await con
      .sobject('User')
      .find({ Name: `${process.env.NCINO_REFERRED_TO}` });
    // const loanApplicationObject = await LoanApplication.findByPk(
    //   loanApplicationId
    // );
    // logger.info('loanApplication object in referral: ', loanApplicationObject);
    // // fetch account id from company table
    // const companyObject = await Company.findOne({
    //   where: {
    //     id: loanApplicationObject.dataValues.companyId,
    //     registrationNumber: companyRegistrationNumber,
    //   },
    //   raw: false,
    // });
    //const accountId = companyObject.nCinoAccountId;
    const accountId = await fetchAccountId(loanApplicationId);
    // create referral in nCino
    const addNew = await con.sobject('nRE__Referral__c').create({
      //"nRE__Branch__c" : branchId,
      nRE__Existing_Relationship__c: accountId,
      nRE__Company__c: input.company,
      nRE__First_Name__c: input.firstName,
      nRE__Last_Name__c: input.lastName,
      nRE__Referred_To__c: referredTo[0].Id,
      nRE__Referral_Amount__c: input.referralAmount,
      nRE__Receiving_Line_of_Business__c: input.receivingLineOfBusiness,
      Product_Line__c: nCinoProductDetails.productLine,
      Product_Type__c: nCinoProductDetails.productType,
      nRE__Referring_Line_of_Business__c: input.referringLineOfBusiness,
      nRE__Preferred_Contact_Method__c: input.preferredContactMethod,
      nRE__Email_address__c: input.emailAddress,
      CompanyRegistrationNumber__c: input.companyRegistrationNumber,
      Loan_Term_Months__c: input.loanTermMonths,
      Non_Property_Loan_Purpose__c: input.nonPropertyLoanPurpose,
      Product__c: nCinoProductDetails.product,
      Sic__c: input.sicCode,
    });

    logger.info(
      'referral object creation response: ' + JSON.stringify(addNew),
      {
        status: 'success',
      }
    );

    return addNew;
  } catch (error) {
    return error.message;
  }
}

/**
 * Updating the loan application elements in the referral
 * @param referralId existing referral Id
 * @param input referral Object from the portal
 * @returns
 */
export async function updateReferralObject(
  referralId: string,
  input: ReferralObjectInput,
  productName: string = 'WorkingCapital'
) {
  logger.defaultMeta.eventType = 'REFERRAL_OBJECT_UPDATION'; //UPDATEION OF REFERRAL OBJECT
  const credentials = await getApiCredentials();
  let productIndexReferral = loanDetails.loanTypes.findIndex(
    (type) => type.name == productName
  );
  const nCinoProductDetails =
    loanDetails.loanTypes[productIndexReferral].nCinoProductDetails;
  const con = new jsforce.Connection({
    loginUrl: `${process.env.NCINO_SALESFORCE_LOGIN_URL}`,
  });
  await con.login(
    credentials.username,
    credentials.password + credentials.security_token
  );

  const referredTo = await con
    .sobject('User')
    .find({ Name: `${process.env.NCINO_REFERRED_TO}` });

  const updateReferral = await con.sobject('nRE__Referral__c').update({
    Id: referralId, //Id required here to update the same record
    nRE__Company__c: input.company,
    nRE__First_Name__c: input.firstName,
    nRE__Last_Name__c: input.lastName,
    nRE__Referred_To__c: referredTo[0].Id,
    nRE__Referral_Amount__c: input.referralAmount,
    nRE__Receiving_Line_of_Business__c: input.receivingLineOfBusiness,
    Product_Line__c: nCinoProductDetails.productLine,
    Product_Type__c: nCinoProductDetails.productType,
    nRE__Referring_Line_of_Business__c: input.referringLineOfBusiness,
    nRE__Preferred_Contact_Method__c: input.preferredContactMethod,
    nRE__Email_address__c: input.emailAddress,
    CompanyRegistrationNumber__c: input.companyRegistrationNumber,
    Loan_Term_Months__c: input.loanTermMonths,
    Non_Property_Loan_Purpose__c: input.nonPropertyLoanPurpose,
    Product__c: nCinoProductDetails.product,
  });

  await con.logout(function (err: any) {
    if (err) {
      return logger.error(err);
    }
    logger.info('Logged out of ncino salesforce connection');
  });
  return updateReferral;
}

/**
 * A function gets called from the referraltoLoan API to convert referral to Loan application in nCino
 * @param referralId referralId is an argument to this function for referral to loan conversion
 * @returns response of either loan Application Id or error message from the converion
 */
export const referralToLoanApplication = async function (
  loanApplicationId: number,
  userCognitoId: string
) {
  logger.defaultMeta.eventType = 'REFERRAL_TO_LOAN_CONVERSION'; //referral to loan conversion
  const credentials = await getApiCredentials();
  const apiUrl = `${process.env.NCINO_SALESFORCE_LOGIN_URL}/services/apexrest/refToLoanConversion`;
  const con = new jsforce.Connection({
    loginUrl: `${process.env.NCINO_SALESFORCE_LOGIN_URL}`,
  });

  const loginParams = new URLSearchParams({
    grant_type: 'password',
    client_id: `${process.env.NCINO_SALESFORCE_CLIENT_ID}`,
    client_secret: `${process.env.NCINO_SALESFORCE_CLIENT_SECRET}`,
    username: credentials.username,
    password: credentials.password,
  });

  let response: string;
  await axios
    .post(`${process.env.NCINO_SALESFORCE_AUTH_URL}`, loginParams)
    .then(async (res) => {
      const accessToken = res.data.access_token;

      const apiHeaders = {
        Authorization: `Bearer ${accessToken}`,
      };

      let loanApplication = await LoanApplication.findByPk(loanApplicationId);
      const referralId = loanApplication.nCinoReferralId;

      logger.info(`${apiUrl}?id=${referralId}`);
      //      let result: AxiosResponse<any, any>;
      await axios
        .get(`${apiUrl}?id=${referralId}`, { headers: apiHeaders })
        .then(async (res) => {
          response = res.data;
          if (res.data.length === 18) {
            loanApplication.nCinoLoanId = res.data;

            validateReferralLoanRelation(
              loanApplication.nCinoReferralId,
              loanApplication.nCinoLoanId
            );
            let company: Company = await getCompany({
              id: loanApplication.companyId,
            });
            const nCinoLoan = await getnCinoLoan(loanApplication.nCinoLoanId);
            logger.info('nCinoLoan object in referralToLoan: ', nCinoLoan);
            company.nCinoAccountId = nCinoLoan.LLC_BI__Account__c;
            await company.save();
            //as we acheieved nCinoLoaId here, so updating status to Submitted in loanApplication
            let updatedAccount = await updateAccount(userCognitoId);
            logger.info(
              'updated nCino Account object successfully with id: ',
              updatedAccount
            );
            loanApplication.status = 'Submitted';
            await loanApplication.save();
          }
        })
        .catch((err) => {
          logger.error(err);
        });
    })
    .catch((err) => {
      logger.error(err);
    });

  return { status: response };
};

/**
 * function to validate referral loan relation
 * @param nCinoReferralId
 * @param nCinoLoanId
 * @returns nCinoReferral
 */
export const validateReferralLoanRelation = async function (
  nCinoReferralId: string,
  nCinoLoanId: string
) {
  logger.defaultMeta.eventType = 'VALIDATION_OF_REFERRAL_LOAN_RELATION'; //referral to loan conversion
  const credentials = await getApiCredentials();

  const con = new jsforce.Connection({
    loginUrl: `${process.env.NCINO_SALESFORCE_LOGIN_URL}`,
  });
  await con.login(
    credentials.username,
    credentials.password + credentials.security_token
  );

  const nCinoReferral = await con
    .sobject('nRE__Referral__c')
    .findOne({ Id: nCinoReferralId }, (err: any, record: any) => {
      if (err) {
        return err;
      }
      return record;
    });

  if (nCinoLoanId === nCinoReferral.Loan_c__c) {
    logger.info(
      'nCinoLoanId :' +
        nCinoLoanId +
        '\n nCinoReferralId:' +
        nCinoReferralId +
        ' is -> ' +
        nCinoReferral.Loan_c__c
    );
  } else {
    logger.info('nCinoLoanId is not updated in nCino Referral');
  }

  await con.logout(function (err: any) {
    if (err) {
      return logger.error(err);
    }
    logger.info('Logged out');
  });
  return nCinoReferral;
};

/**
 * Function to retrieve nCino Loan
 * @param nCinoLoanId
 * @returns nCinoLoan
 */
export const getnCinoLoan = async function (nCinoLoanId: string) {
  logger.defaultMeta.eventType = 'GET_NCINO_LOAN'; //get nCinoLoan whenever required
  logger.defaultMeta.eventParams = { nCinoLoanId: nCinoLoanId };
  const credentials = await getApiCredentials();

  const con = new jsforce.Connection({
    loginUrl: `${process.env.NCINO_SALESFORCE_LOGIN_URL}`,
  });
  await con.login(
    credentials.username,
    credentials.password + credentials.security_token
  );

  const whereClause = {
    Id: nCinoLoanId,
  };

  const nCinoLoan = await con
    .sobject('LLC_BI__Loan__c')
    .findOne(whereClause)
    .execute((err: any, record: any) => {
      if (err) {
        return err;
      }
      return record;
    });

  await con.logout(function (err: any) {
    if (err) {
      return logger.error(err);
    }
    logger.info('Logged out');
  });
  return nCinoLoan;
};

/**
 * A function to retrieve loan documents associated with this loan application
 * @param nCinoLoanId as an argument to fetch the list of documents uploaded to this nCinoLoan
 * @returns array of objects (list of loan documents associated with this loan application)
 */
export const getnCinoLoanDocuments = async function (nCinoLoanId: string) {
  logger.defaultMeta.eventType = 'GET_NCINO_LOAN_DOCUMENTS'; //get nCinoLoan whenever required
  logger.defaultMeta.eventParams = { nCinoLoanId: nCinoLoanId };
  const credentials = await getApiCredentials();

  const con = new jsforce.Connection({
    loginUrl: `${process.env.NCINO_SALESFORCE_LOGIN_URL}`,
  });
  await con.login(
    credentials.username,
    credentials.password + credentials.security_token
  );

  const whereClause = {
    LLC_BI__Loan__c: nCinoLoanId,
    LLC_BI__Portal_Doc_Name__c: { $exists: true, $ne: null },
    LLC_BI__Portal_Doc_Type__c: { $exists: true, $ne: null },
    LLC_BI__Portal_Upload_Date__c: { $exists: true, $ne: null },
  };

  const fields = [
    'Id',
    'LLC_BI__Loan__c',
    'LLC_BI__Portal_Doc_Name__c', //this name should be appended to the localPath and absolute Path should be passed as filePath variable in the body to download endpoint
    'LLC_BI__Portal_Doc_Type__c',
    'LLC_BI__Portal_Upload_Date__c',
    'CreatedById', //docOwnerId to /downloadnCinoDocument/:docOwnerId/:docAttachmentId"
    'LLC_BI__attachmentId__c', //docAttachmentId to /downloadnCinoDocument/:docOwnerId/:docAttachmentId"
  ];

  var nCinoLoanDocuments = await con
    .sobject('LLC_BI__LLC_LoanDocument__c')
    .find(whereClause, fields)
    .execute((err: any, records: any) => {
      if (err) {
        return err;
      }
      return records;
    });

  var transformedRecords = await nCinoLoanDocuments.map((rec) => {
    return {
      documentId: rec.Id,
      nCinoLoanId: rec.LLC_BI__Loan__c,
      documentName: rec.LLC_BI__Portal_Doc_Name__c,
      documentType: rec.LLC_BI__Portal_Doc_Type__c,
      docOwnerId: rec.CreatedById,
      docAttachmentId: rec.LLC_BI__attachmentId__c,
    };
  });

  await con.logout(function (err: any) {
    if (err) {
      return logger.error(err);
    }
    logger.info('Logged out');
  });

  return {
    Documents: lodash.sortBy(transformedRecords, 'documentName'),
  };
};

/**
 * function to fetch account id for a given loan application id
 * @param loanAppId loan aoolication id
 * @returns account id
 */
export async function fetchAccountId(loanAppId: number) {
  const loanApplicationObject = await LoanApplication.findByPk(loanAppId);
  logger.info('loanApplication object ', loanApplicationObject.companyId);
  // fetch account id from company table
  const companyObject = await Company.findOne({
    where: {
      id: loanApplicationObject.companyId,
    },
    raw: false,
  });
  logger.info('company object ', companyObject.id);
  let accountId = companyObject.nCinoAccountId;
  return accountId;
}

/**
 * function to add net worth details in nCino Asset object
 * @param loanAppId loan application Id
 * @param input net worth details
 * @returns
 */
export async function saveNetWorthTonCino(loanAppId: number, input) {
  let accountId = await fetchAccountId(loanAppId);
  //let accountId = "0013H00000JHdsFQAT"
  if (!accountId) {
    throw new Error('Account Id is not available');
  }
  try {
    const credentials = await getApiCredentials();
    await con.login(
      credentials.username,
      credentials.password + credentials.security_token
    );
    let assets, liabilities;
    let assetObject = { ...input.assets, ...input.income };
    let liabtiesObject = { ...input.expenditure, ...input.liabilities };
    assets = await lodash.map(assetObject, (value, name) => ({ name, value }));
    liabilities = await lodash.map(liabtiesObject, (value, name) => ({
      name,
      value,
    }));
    assets.forEach(async (element) => {
      await con.sobject('Asset').create({
        Name: 'Asset' + '-' + element.name,
        Price: element.value,
        AccountId: accountId,
      });
    });
    liabilities.forEach(async (element) => {
      await con.sobject('Liability').create({
        Name: 'Liability' + '-' + element.name,
        Price: element.value * -1,
        AccountId: accountId,
      });
    });
    return { status: 'success' };
  } catch (error) {
    return error.message;
  }
}

/**
 * A function to update the payment details from the user to nCino for the corresponding nCino Loan Application Id
 * @param loanApplication as argument to the function  along with payemntDetails
 * @param paymentDetails as body argument from the endpoint
 * @returns
 */

export const updatePaymentDetails = async function (
  loanApplication: LoanApplication,
  paymentDetails: PaymentDetails
) {
  logger.defaultMeta.eventType = 'updatedPaymentDetails';
  logger.defaultMeta.eventParams = {
    loanApplicationId: loanApplication.id,
    paymentDetails: paymentDetails,
  };
  const credentials = await getApiCredentials();

  const con = new jsforce.Connection({
    loginUrl: `${process.env.NCINO_SALESFORCE_LOGIN_URL}`,
  });

  await con.login(
    credentials.username,
    credentials.password + credentials.security_token
  );

  const updatenCinoLoan = await con.sobject('LLC_BI__Loan__c').update({
    Id: loanApplication.nCinoLoanId, //Id required here to update the same record
    Disbursement_Bank_Account_Sort_Code__c: paymentDetails.sortCode,
    Disbursement_Bank_Account_Number__c: paymentDetails.bankAccountNumber,
    Disbursement_Relationship__c: loanApplication.company.nCinoAccountId,
    Disbursement_Bank_Name__c: paymentDetails.bankName,
  });

  logger.info(JSON.stringify(updatenCinoLoan));

  logger.info('Updating loan paymen details');
  await con.logout(function (err: any) {
    if (err) {
      return logger.error(err);
    }
    logger.info('Logged out');
  });
  return updatenCinoLoan;
};

/**
 * A function to update the repayment details from the user to nCino for the corresponding nCino Loan Application Id
 * @param loanApplication as argument to the function  along with payemntDetails
 * @param paymentDetails as body argument from the endpoint
 * @returns
 */

export const updateRePaymentDetails = async function (
  loanApplication: LoanApplication,
  rePaymentDetails: RePaymentDetails
) {
  const credentials = await getApiCredentials();

  const con = new jsforce.Connection({
    loginUrl: `${process.env.NCINO_SALESFORCE_LOGIN_URL}`,
  });

  await con.login(
    credentials.username,
    credentials.password + credentials.security_token
  );

  const updatenCinoLoan = await con.sobject('LLC_BI__Loan__c').update({
    Id: loanApplication.nCinoLoanId, //Id required here to update the same record
    DD_Bank_Account_Sort_Code__c: rePaymentDetails.sortCode,
    DD_Bank_Account_Number__c: rePaymentDetails.bankAccountNumber,
    DD_Relationship__c: loanApplication.company.nCinoAccountId,
    DD_Bank_Name__c: rePaymentDetails.bankName,
  });

  logger.info(JSON.stringify(updatenCinoLoan));
  await con.logout(function (err: any) {
    if (err) {
      return logger.error(err);
    }
    logger.info('Logged out');
  });
  return updatenCinoLoan;
};

//upload document in ContentVersion onject in sales force
const uploadContentVersion = (
  fileName: string,
  file: any
): Promise<jsforce.RecordResult> =>
  con.sobject('ContentVersion').create({
    PathOnClient: fileName,
    VersionData: file.buffer.toString('base64'),
  });

/**
 * function to create Contentversion object by giving file name and file as input
 * @param fileName name of the file uploaing
 * @param file file content
 * @returns ContentVersion id of created Contentversion object
 */
export async function createContentVersion(
  fileName: string,
  file: Express.Multer.File
) {
  const cVersion = await uploadContentVersion(fileName, file);
  return cVersion;
}

/**
 * function to fetch ContentDocumentId from ContentVersion object id
 * @param id ContentVersion object id
 * @returns ContentDocumentId
 */
export async function fetchContentDocId(id: string) {
  const contentVersionObject = await con
    .sobject('ContentVersion')
    .find({ Id: id });
  const contentDocId: string = contentVersionObject[0].ContentDocumentId;
  return contentDocId;
}

/**
 * function to create DocumentStore object
 * @returns created DocumentStore object id
 */
export async function createDocStoreObject() {
  const docStoreObject = await con
    .sobject('LLC_BI__Document_Store__c')
    .create({});
  return docStoreObject;
}

/**
 * function to create DocumentStoreIndex object
 * @returns object with DocumentStore Id and DocumentStoreIndex id
 */
export async function createDocStoreIndexObject() {
  const docStoreObject = await createDocStoreObject();
  const docStoreId = docStoreObject.id;
  const docStoreIndexObject = await con
    .sobject('LLC_BI__Document_Store_Index__c')
    .create({ LLC_BI__Document_Store__c: docStoreId });
  return { docStoreIndexId: docStoreIndexObject.id, docStoreId: docStoreId };
}

/**
 * function to upload loan documents for a given Loan object Id, filename, file and document type
 * @param id Loan application id
 * @param fileName name of the file uploaing
 * @param file file content
 * @param docType type of document
 * @returns uploaded loan document id
 */
export async function uploadLoanDocuments(
  loanApplcationId: string,
  fileName: string,
  file: Express.Multer.File,
  docType: string
) {
  try {
    //mapping rb-portal ocumnet names to nCino document names
    const docName: string = await documentNames[docType];
    //fetch loan application for given loan application id to get nCino loan object id
    const loanApplicationObject = await LoanApplication.findByPk(
      loanApplcationId
    );
    const loanId = loanApplicationObject.dataValues.nCinoLoanId;

    if (!loanId) {
      throw new Error('nCino Loan Id is not available');
    }
    //fetch ncino credentials from .env file
    const credentials = await getApiCredentials();
    //login to ncino using above fetched credentials
    await con.login(
      credentials.username,
      credentials.password + credentials.security_token
    );
    //create ContentVersion object giving input as file name and file
    const contentVersionObject = await createContentVersion(fileName, file);
    const contentVersionId = contentVersionObject.id;
    //fetching ContentDocumentId
    const contentDocumentId = await fetchContentDocId(contentVersionId);
    //creating DocumentStore and DocumentStoreIndex objects
    const docStoreIndexObject = await createDocStoreIndexObject();
    const docStoreIndexId = docStoreIndexObject.docStoreIndexId;
    const docStoreId = docStoreIndexObject.docStoreId;
    //fetch LoanDocument object for given Loan object id and documnet type
    const loanDocumentObject = await con
      .sobject('LLC_BI__LLC_LoanDocument__c')
      .find({ LLC_BI__Loan__c: loanId, Name: docName });
    const loanDocumentId = loanDocumentObject[0].Id;
    logger.info('Content Version Id : ', contentVersionId);
    logger.info('Content Document Id : ', contentDocumentId);
    logger.info('Document Store Index Id : ', docStoreIndexId);
    logger.info('Loan Document Id : ', loanDocumentId);
    logger.info('Document Store Id : ', docStoreId);
    //update the LoanDocument object
    const updatedLoanDocument = await con
      .sobject('LLC_BI__LLC_LoanDocument__c')
      .update({
        Id: loanDocumentId,
        LLC_BI__attachmentId__c: contentDocumentId,
        LLC_BI__Document_Store_Index__c: docStoreIndexId,
        LLC_BI__reviewStatus__c: 'In-File',
        LLC_BI__Download_As_PDF__c: true,
        LLC_BI__Portal_Upload_Date__c: new Date(),
        LLC_BI__Portal_Doc_Name__c: fileName,
        LLC_BI__Portal_Doc_Type__c: docType,
      });
    //create ContentDocumentLink object
    const createContentDocLink = await con
      .sobject('ContentDocumentLink')
      .create({
        ContentDocumentId: contentDocumentId,
        LinkedEntityId: docStoreId,
        ShareType: 'V',
      });
    logger.info('Content Document Link Id : ', createContentDocLink.id);
    //return uploaded LoanDocument Id
    return updatedLoanDocument;
  } catch (error) {
    return error.message;
  }
}

/**
 * function to fetch loan document object
 * @param id
 * @returns loanDocumentObject
 */
export async function fetchDocumentObject(id) {
  const credentials = await getApiCredentials();
  await con.login(
    credentials.username,
    credentials.password + credentials.security_token
  );
  const docClassObject = await con
    .sobject('LLC_BI__Document_Store__c')
    .find({ LLC_BI__Type__c: 'Salesforce Attachment' });
  const loanDocumentObject = await con
    .sobject('LLC_BI__LLC_LoanDocument__c')
    .find({ LLC_BI__Loan__c: id });
  //const contentDocId : string = contentVersionObject[0].ContentDocumentId
  //return docClassObject
  return loanDocumentObject;
}

// export async function createContentDocLink(id) {
//   return con.sobject('ContentDocumentLink').find({ Id: id})
// }

/**
 *  functiona call will download the document from salesforce to local
 * @param docOwnerId  should be provided from the loan Document
 * @param docAttachmentId  should be provided from the loan Document
 * @param filePath should be provided by user
 * @returns reponse of file download status
 */
export const downloadDocument = async function (
  docOwnerId,
  docAttachmentId,
  filePath
) {
  logger.defaultMeta.eventType = 'downloadDocument';
  logger.defaultMeta.eventParams = {
    docOnwerId: docOwnerId,
    docAttachmentId: docAttachmentId,
    filePath: filePath,
  };

  //fetch ncino credentials from .env file
  const credentials = await getApiCredentials();
  //login to ncino using above fetched credentials
  await con.login(
    credentials.username,
    credentials.password + credentials.security_token
  );

  const contentVersionObject = await con
    .sobject('ContentVersion')
    .find({ OwnerId: docOwnerId, ContentDocumentId: docAttachmentId });

  const contentVersionId = contentVersionObject[0].Id;
  const downloadUrl =
    `${process.env.NCINO_SALESFORCE_DOWNLOAD_FILE_URL}` + contentVersionId;

  let response = await con.request(
    {
      method: 'GET',
      url: downloadUrl,
      headers: {
        Authorization: `Bearer ${con.accessToken}`,
      },
      encoding: null,
    },
    (err, res) => {
      if (err) {
        return logger.error(err);
      }

      fs.writeFile(filePath, res, 'binary', (fileErr) => {
        if (fileErr) {
          logger.error(fileErr);
          return { status: fileErr };
        }
        logger.info(`File has been downloaded successfully in ${filePath}`);
      });
    }
  );
  logger.defaultMeta.status = 'success';
  return {
    status: `File has been downloaded successfully in ${filePath}`,
  };
};

/**
 * function to update nCino Account object with the fields in portal
 * @param userCognitoId logged in user's cognito id
 * @param productName
 * @returns
 */
export async function updateAccount(
  userCognitoId,
  productName: string = 'WorkingCapital'
) {

  logger.defaultMeta.eventType='UPDATING_NCINO_LOAN_ACCOUNT'
  let productIndex = loanDetails.loanTypes.findIndex(
    (type) => type.name == productName
  );
  let businessEntitiy;
  const businessEntities =
    loanDetails.loanTypes[productIndex].configs.companyDetails.businessEntities;

  const loanApplicationObject = await getLoanApplication(userCognitoId);

  let companyName = loanApplicationObject.company.name;
  let accountId = loanApplicationObject.company.nCinoAccountId;
  let registeredAddress, tradingAddress;
  loanApplicationObject.company.addresses.forEach((element) => {
    if (element.addressType == 'REGISTERED_ADDRESS') {
      registeredAddress = element.dataValues;
    }
    if (element.addressType == 'TRADING_ADDRESS') {
      tradingAddress = element.dataValues;
    }
  });
  businessEntities.forEach((element) => {
    if (element.name == loanApplicationObject.company.businessType) {
      businessEntitiy = element.nCinoName;
    }
  });
  logger.info('updating nCino Account object, Account id: '+ accountId);
  let updatedAccountObject = await con.sobject('Account').update({
    Id: accountId,
    ShippingStreet: registeredAddress.line1 + ',' + registeredAddress.line2,
    ShippingCity: registeredAddress.city,
    ShippingCountry: registeredAddress.country,
    ShippingPostalCode: registeredAddress.postalCode,
    BillingStreet: tradingAddress.line1 + ',' + tradingAddress.line2,
    BillingCity: tradingAddress.city,
    BillingCountry: tradingAddress.country,
    BillingPostalCode: tradingAddress.postalCode,
    NumberOfEmployees: loanApplicationObject.company.employeeCount,
    SIC_Code_Description__c: loanApplicationObject.company.businessDescription,
    Type: businessEntitiy,
    LLC_BI__lookupKey__c: accountId,
    Registered_Company_Name__c: companyName,
  });
  return updatedAccountObject;
}
