import lodash from "lodash";
import "reflect-metadata";
import {
  Authorized,
  Body,
  BodyParam,
  CurrentUser,
  Get,
  JsonController,
  Param,
  Post,
  UploadedFile,
} from "routing-controllers";

import { User } from "../common/types";
import loanConfig from "../config/loanDetailsConfig.json";
import {
  IndicativeHoTInput,
  LoanDetails,
  PaymentDetails,
  RePaymentDetails,
  ReferralObjectInput
} from "../interfaces";

import { LoanApplication } from "../models";
import {
  downloadDocument,
  downloadHoT,
  getLoanApplication,
  getLoanDetails,
  getPortalUser,
  getnCinoLoan,
  getnCinoLoanDocuments,
  indicativeHoT,
  interestCalculator,
  loanReferral,
  options,
  referralObject,
  referralToLoanApplication,
  saveDIPStatus,
  saveLoanApplication,
  saveLoanSecurities,
  saveNetWorthTonCino,
  sendEmailsToKeyIndividuals,
  updatePaymentDetails,
  updateRePaymentDetails,
  uploadLoanDocuments,
  validateLoanApplication,
  loggerInstance,
} from "../services";

const logger = loggerInstance(__filename);

@JsonController("", { transformResponse: false })
export class LoanController {
  /**
   * API to return loan configuration details
   * @returns loanConfig
   */
  @Get("/loanConfigs")
  async getConfigs() {
    return loanConfig;
  }

  /**
   * API to retrieve loan application from the backend database
   * @param user Current user
   * @returns all the loan application content along with portalUser, company, individual, etc
   */
  @Get("/loanApplication")
  @Authorized()
  async getLoanApplication(@CurrentUser() user: User) {
    let response = await getLoanApplication(user.cognitoId)
      .then(async (loanApplication) => {
        logger.info(loanApplication);
        if (!loanApplication) {
          return Promise.resolve({
            status: "No Draft Loan Application available",
          });
        } else {
          return loanApplication;
        }
      })
      .catch((err) => {
        logger.error(err);
      });
    return response;
  }

  /**
   * API call to get the full Loan Application
   * @param user Current Logged In User
   * @param id loan Application Id in portal
   * @returns external references to the loan Application from the nCino and other
   */
  @Get("/loanApplication/:id")
  @Authorized()
  async getFullLoanApplication(
    @CurrentUser() user: User,
    @Param("id") id: number
  ) {
    let loanApplication: any = await LoanApplication.findByPk(id, options);

    var nCinoLoanDocs = await getnCinoLoanDocuments(
      loanApplication.nCinoLoanId
    );

    var nCinoLoan = await getnCinoLoan(loanApplication.nCinoLoanId);

    var paymentDetails = {
      paymentDetails: {
        bankAccountNumber: nCinoLoan.Disbursement_Bank_Account_Number__c,
        sortCode: nCinoLoan.Disbursement_Bank_Account_Sort_Code__c,
      },
    };

    var rePaymentDetails = {
      rePaymentDetails: {
        bankAccountNumber: nCinoLoan.DD_Bank_Account_Number__c,
        sortCode: nCinoLoan.DD_Bank_Account_Sort_Code__c,
      },
    };

    logger.info(JSON.stringify(paymentDetails));
    logger.info(JSON.stringify(rePaymentDetails));

    return lodash.merge(
      loanApplication.toJSON(),
      nCinoLoanDocs,
      paymentDetails,
      rePaymentDetails
    );
  }

  @Post("/downloadnCinoDocument/:docOwnerId/:docAttachmentId")
  @Authorized()
  async downloadnCinoDocument(
    @Param("docOwnerId") docOwnerId: string,
    @Param("docAttachmentId") docAttachmentId: string,
    @BodyParam("filePath") filePath: string
  ) {
    const downloadResponse = await downloadDocument(
      docOwnerId,
      docAttachmentId,
      filePath
    );
    return downloadResponse;
  }

  /**
   * API to save loan application data along with company, keyIndividuals if any
   * @param user current loggedIn user
   * @param loanApplicationObj
   * @returns save the loan application elements to the tables
   */
  @Post("/loanApplication")
  @Authorized()
  async saveLoanApplication(
    @CurrentUser() user: User,
    @Body() loanApplicationObj
  ) {
    const portalUser = await getPortalUser({ cognitoId: user.cognitoId });
    const loanApplicationObject = await saveLoanApplication(
      portalUser,
      loanApplicationObj
    );

    return loanApplicationObject;
  }

  /**
   * getDIP API will run the companyMasterJourney, InvididualDIP Outcome internally and get the dip STATUS whether accepted or declined
   * Passing loanApplicationObj as object to this api to get dip status
   */
  @Post("/loanApplication/dip")
  @Authorized()
  async getDIP(@CurrentUser() user: User, @Body() loanApplicationObj) {
    //Fetching complete application from db just to get rid of any missed elements in loanApplicationObj
    var loanApplication: LoanApplication = await LoanApplication.findByPk(
      loanApplicationObj.id,
      options
    );

    loanApplication.DIPStatus = await saveDIPStatus(loanApplicationObj);
    loanApplication.save();
    let response = (loanApplication.DIPStatus = "Accepted")
      ? await loanReferral(loanApplication)
      : loanApplication;
    return response;
  }

  /**
   * An API to validate the loan application Object
   * @param user current loggedIn user
   * @param loanApplicationObj
   * @returns validation of loan application object
   */
  @Post("/validateLoanApplication")
  @Authorized()
  async validateLoanApplication(
    @CurrentUser() user: User,
    @Body() loanApplicationObj
  ) {
    let response;
    await validateLoanApplication(loanApplicationObj)
      .then((result) => {
        response = result;
      })
      .catch((err) => {
        logger.error(err);
      });
    return response.length
      ? { _validationErrors: response }
      : loanApplicationObj;
  }

  /**
   * api to get loan repayment details for given input
   * @param input loan amount, loan term and loan purpose as object
   * @returns monthly payment, interest rate, average monthly interest rate, total interest, total cost of finance and capital repayment as an object
   */
  @Post("/monthlyRepayment")
  async getInterestRate(@Body() input: LoanDetails) {
    return await interestCalculator(input.purpose, input.term, input.amount);
  }

  /**
   * api to get indicative head of terms for given input
   * @param input loan amount, loan term, loan purpose and company that applying for loan as object
   * @returns indicative head of terms
   */
  @Post("/indicativeHot")
  async getIndicativeHoT(@Body() input: IndicativeHoTInput) {
    return await indicativeHoT(
      input.loanAmount,
      input.loanTerm,
      input.loanPurpose,
      input.loanBorrower
    );
  }
  /**
   * API to return response for homepage of given user with all loanapplication data
   * @param user
   * @returns loanApplications
   */
  @Get("/homeDashboard")
  @Authorized()
  async getDashboard(@CurrentUser() user: User) {
    const portalUser = await getPortalUser({ cognitoId: user.cognitoId });
    const response = await getLoanDetails(portalUser.id);
    return { loanApplications: response };
  }

  /**
   * API to create referral object
   * @param input, object with required fields
   * @returns referral object
   */
  @Post("/createReferral/:loanApplicationId/:companyRegistrationNumber")
  @Authorized()
  async createReferralObjectExisting(
    @Body() input: ReferralObjectInput,
    @CurrentUser() user: User,
    @Param("companyRegistrationNumber") companyRegistrationNumber: string,
    @Param("loanApplicationId") loanApplicationId: number
  ) {
    return await referralObject(
      input,
      loanApplicationId,
      companyRegistrationNumber
    );
  }

  /**
   * API to convert referral to loan in nCino
   * @param referralId
   * @returns nCino loanObject
   */
  @Post("/referralToLoan")
  @Authorized()
  async referralToLoan(
    @BodyParam("loanApplicationId") loanApplicationId: number,
    @CurrentUser() user: User
  ) {
    return referralToLoanApplication(loanApplicationId, user.cognitoId);
  }

  /**
   * An endpoint to update or attach the payment details from the user to nCinoLoanObject
   * @param loanApplicationId
   * @param paymentDetails as an input body to update corresponding details in nCinoLoanObject
   * @returns
   */
  @Post("/paymentDetailsTonCino/:loanApplicationId")
  async updatePaymentDetailsTonCino(
    @Param("loanApplicationId") loanApplicationId: number,
    @Body() paymentDetails: PaymentDetails
  ) {
    const loanApplication = await LoanApplication.findByPk(
      loanApplicationId,
      options
    );

    return await updatePaymentDetails(loanApplication, paymentDetails);
  }

  /**
   * An endpoint to update or attach the repayment details from the user to nCinoLoanObject
   * @param loanApplicationId
   * @param rePaymentDetails as an input body to update corresponding details in nCinoLoanObject
   * @returns
   */
  @Post("/rePaymentDetailsTonCino/:loanApplicationId")
  async updateRePaymentDetailsTonCino(
    @Param("loanApplicationId") loanApplicationId: number,
    @Body() rePaymentDetails: RePaymentDetails
  ) {
    const loanApplication = await LoanApplication.findByPk(
      loanApplicationId,
      options
    );

    return await updateRePaymentDetails(loanApplication, rePaymentDetails);
  }

  /**
   * API to upload loan documents
   * @param loanapplicationId - loanApplicationId
   * @param file - file to be uploaded
   * @param docType - document type
   * @returns uploadedLoanDocument
   */
  @Post("/uploadLoanDocument/:loanApplicationId/:docType")
  async fetchLoan(
    @Param("loanApplicationId") loanapplicationId: string,
    @UploadedFile("file") file: Express.Multer.File,
    @Param("docType") docType: string
  ) {
    return await uploadLoanDocuments(
      loanapplicationId,
      file.originalname,
      file,
      docType
    );
  }

  /**
   * API to download Indicative HoT Document
   * @param user
   * @returns indicative Hot Document
   */
  @Get("/downloadHoT")
  @Authorized()
  async getHoT(@CurrentUser() user: User) {
    return await downloadHoT(user.cognitoId);
  }

  /**
   * API to send emails to key individuals
   * @param user
   * @returns message Id
   */
  @Get("/sendEmails")
  @Authorized()
  async sendEmailsToKeyIndividuals(@CurrentUser() user: User) {
    return await sendEmailsToKeyIndividuals(user.cognitoId);
  }

  /**
   * API to add net worth details to nCino
   * @param input net worth input
   * @param loanAppId loan application id
   * @returns
   */
  @Post("/netWorth/:loanAppId")
  async saveNetWorth(
    @Body() input: any,
    @Param("loanAppId") loanAppId: number
  ) {
    return await saveNetWorthTonCino(loanAppId, input);
  }

  /**
   * A endpoint to save the loanSecurities
   * @param user current User
   * @param loanApplicationId loanApplicationId
   * @param securities typeOfSecurity, value, desciption to be provided as request to this endpoint
   * @returns
   */
  @Post("/loanSecurities/:loanApplicationId")
  async saveLoanSecurities(
    @CurrentUser() user: User,
    @Param("loanApplicationId") loanApplicationId: number,
    @Body() securities: any
  ) {
    return await saveLoanSecurities(loanApplicationId, securities);
  }
}
