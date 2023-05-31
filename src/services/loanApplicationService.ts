import { uuid } from 'aws-sdk/clients/customerprofiles';
import { IncludeOptions, Op } from 'sequelize';
import { Model } from 'sequelize-typescript';

import dotenv from 'dotenv';
import lodash from 'lodash';
import {
  companyMasterJourney,
  getPortalUser,
  headofTerms,
  individualsDIPOutcome,
  referralObject,
  updateReferralObject,
} from '.';
import { loggerInstance, setBaseParams } from './auditService';

import {
  Address,
  Company,
  ExternalIntegrations,
  Individual,
  LoanApplication,
  LoanOffer,
  LoanSecurities,
  PandadocDocuments,
  Signatory,
} from '../models';

dotenv.config();

import { validationSchema } from '../common/templateSchema';
import {
  ReferralObjectInput,
  loanApplicationFilter,
  loanApplicationInterface,
  loanSecurityFilter,
} from '../interfaces';

dotenv.config();

const logger = loggerInstance(__filename);

const isModel = (instance) => instance instanceof Model;
let companyAssociation: IncludeOptions[] = [
  { model: Address },
  { model: Individual },
];
let pandadocDocumentsAssociation: IncludeOptions[] = [{ model: Signatory }];

export let options = {
  include: [
    {
      model: Company,
      include: companyAssociation,
    },
    { model: LoanOffer },
    { model: LoanSecurities },
    { model: ExternalIntegrations },
    { model: PandadocDocuments, include: pandadocDocumentsAssociation },
  ],
};

/**
 * Function to trigger DIP status based on businessType and return DIP Status string
 * @param data loanApplication object
 * @returns DIPStatus
 */
export const saveDIPStatus = async function (data: LoanApplication) {
  logger.defaultMeta.eventType = 'DIPStatus';
  let DIPResult: string;
  let limitedCompanyBusinessType =
    process.env.LIMITED_COMPANY_BUSINESS_TYPE.split(',');
  let businessType = data.company.businessType;
  let companyName = data.company.name;
  let companyRegistrationNumber = data.company.registrationNumber;
  if (limitedCompanyBusinessType.includes(businessType)) {
    DIPResult = (
      await companyMasterJourney(companyName, companyRegistrationNumber)
    ).DIPStatus;
  } else {
    let keyIndividuals = data.company.keyIndividuals;
    DIPResult = (await individualsDIPOutcome(keyIndividuals)).DIPStatus;
  }
  return DIPResult;
};

/**
 * Save loan application from the api which saves all the information from the payload from frontend
 * @param user loggedIn
 * @param payload Payload comes from the frontend which consists of loan details, businessType,company details etc
 * @returns
 */
export const saveLoanApplication = async function (user, payload) {
  logger.defaultMeta.eventType = 'saveLoanApplication';

  let validationStatus: any = [];
  if (!payload.id) {
    payload.portaluserId = user.id;
    return await LoanApplication.create(payload, options);
  }

  let loanApplication: LoanApplication = await LoanApplication.findByPk(
    payload.id,
    options
  );
  logger.defaultMeta.eventParams = {
    portalUserId: user.id,
    loanApplicationId: loanApplication.id,
  };

  setBaseParams(logger.defaultMeta.eventParams);

  try {
    lodash.merge(loanApplication, payload);
  } catch (error) {
    logger.info(error.stacktrace);
  }

  if (
    payload.hasOwnProperty('company') &&
    payload.company !== null &&
    typeof payload.company === 'object'
  ) {
    // adding company record

    loanApplication.company = !isModel(loanApplication.company)
      ? await Company.create(loanApplication.company as any, {
        include: companyAssociation,
      })
      : await loanApplication.company.save();

    loanApplication.companyId = loanApplication.company.id;
    logger.info('Added Company', {});
    const company = loanApplication.company;

    if (
      company.hasOwnProperty('addresses') &&
      payload.company.addresses !== null &&
      typeof payload.company.addresses === 'object'
    ) {
      for (let i = 0; i < payload.company.addresses.length; i++) {
        const address = company.addresses[i];
        if (isModel(address)) {
          await address.save();
        } else {
          company.$add('addresses', await Address.create(address as any));
        }
      }

      for (
        let i = payload.company.addresses.length;
        i < company.addresses.length;
        i++
      ) {
        await company.addresses[i].destroy();
      }
    }

    if (
      company.hasOwnProperty('keyIndividuals') &&
      payload.company.keyIndividuals !== null &&
      typeof payload.company.keyIndividuals === 'object'
    ) {
      for (let i = 0; i < payload.company.keyIndividuals?.length; i++) {
        const ki = company.keyIndividuals[i];
        if (isModel(ki)) {
          await ki.save();
        } else {
          company.$add('keyIndividuals', await Individual.create(ki as any));
        }
      }
      for (
        let i = payload.company.keyIndividuals?.length;
        i < company.keyIndividuals?.length;
        i++
      ) {
        await company.keyIndividuals[i].destroy();
      }
    }

    const prevLoanRecords = await getCompanyLoans({
      portaluserId: loanApplication.portaluserId,
      companyId: loanApplication.companyId,
    });

    logger.info(JSON.stringify(prevLoanRecords));

    company.existingCustomer = prevLoanRecords.length > 1;

    await company.save();

    if (loanApplication.DIPStatus === 'NotReadyForDIP') {
      validationStatus = await validateLoanApplication(loanApplication);
      if (!validationStatus.length) {
        loanApplication.DIPStatus = 'ReadyForDIP';
      }
    }

    await loanApplication.save();

    //have to fetch the complete object again from the database
    let loanApplicationObject = await LoanApplication.findByPk(
      loanApplication.id,
      options
    );

    const borrower =
      company.businessType === 'SoleTrader'
        ? `${company.keyIndividuals[0].firstName} ${company.keyIndividuals[0].lastName}`
        : company.name;

    let loanOffer = await LoanOffer.findOne({
      where: { loanApplicationId: payload.id },
    });
    const loanOfferEntities = await headofTerms(payload, payload.id, borrower);
    if (loanOffer) {
      await LoanOffer.update(loanOfferEntities, {
        where: { loanApplicationId: payload.id },
      });
    } else {
      await LoanOffer.create(loanOfferEntities);
    }

    const loanOfferOutput = await (
      await LoanOffer.findOne({
        where: { loanApplicationId: payload.id },
      })
    ).dataValues;

    return await {
      ...loanApplicationObject.dataValues,
      ...{ loanOffer: loanOfferOutput },
      ...{ _validationErrors: validationStatus },
    };
  }

  return await {
    ...loanApplication.dataValues,
    ...{ _validationErrors: validationStatus },
  };
};

/**
 *  A function call to fetch loan list of loan applications
 * @param portalUserId get all the loan Details mapped with this portalUser
 * @returns complete list of loan applications along with their associations
 */
export const getLoanDetails = async function (portalUserId: number) {
  logger.defaultMeta.eventType = 'LoanApplicationJourney'; //homePage/viewLoanApplication
  const loanApplications = await LoanApplication.findAll({
    where: { portaluserId: portalUserId },
    include: options.include,
  });

  return loanApplications;
};

/**
 *  A function which will retrieve all the loans mapped for that portaluser and company
 * @param params both companyId and portaluserId  are required
 * @returns all the loan application mapped to that company and portal user
 */
export const getCompanyLoans = async function (
  params: loanApplicationFilter<loanApplicationInterface>
) {
  logger.defaultMeta.eventType = 'getCompanyLoans'; //fetch all the loans mapped to that company.. to check exist customer or not
  let loanAppRecords = [];
  const Clause: any = {};
  if (params.id || (params.portaluserId && params.companyId)) {
    Clause[Op.and] = params.id
      ? [{ id: params.id }]
      : [
        {
          portaluserId: params.portaluserId,
          companyId: params.companyId,
        },
      ];
    loanAppRecords = await LoanApplication.findAll({
      where: Clause,
      raw: false,
    });
  } else {
    throw new Error('Invalid or missed arguments');
  }
  return loanAppRecords;
};

/**
 * fetching loan Application from database
 * @param userCognitoId from the authorized login
 * @returns loan Application  along with user, company, companyUser etc
 */
export const getLoanApplication = async function (
  userCognitoId: uuid
): Promise<any> {
  logger.defaultMeta.eventType = 'getLoanApplication'; //getLoanApplication

  // retrieve user Information based on the cognitoId
  const portalUser = await getPortalUser({ cognitoId: userCognitoId });
  const loanApplication = await LoanApplication.findOne({
    where: {
      portaluserId: portalUser.id,
      status: ['Draft', 'Submitted'],
    },
    include: options.include,
  });

  return loanApplication;
};

/**
 *  A function which will handle either will create a referral or update, * based on available referral id for this loan application
 * @param loanApplication argument to this loanReferral function
 */

export const loanReferral = async function (
  loanApplication: LoanApplication,
  productName = 'Working Capital'
) {
  // let loanApplicationRecord: LoanApplication = await LoanApplication.findByPk(
  //   loanApplication.id,
  //   options
  // );
  logger.defaultMeta.eventType = 'Preperation of referralObject'; //getLoanApplication

  const portalUser = await getPortalUser({
    id: loanApplication.portaluserId,
  });

  const referral: ReferralObjectInput = {
    company: loanApplication.company.name,
    referralAmount: loanApplication.loanAmount,
    receivingLineOfBusiness:
      productName as ReferralObjectInput['receivingLineOfBusiness'],
    referringLineOfBusiness: (await portalUser)
      .cognitoGroup as ReferralObjectInput['referringLineOfBusiness'],
    preferredContactMethod: 'Email',
    emailAddress: (await portalUser).email,
    companyRegistrationNumber: loanApplication.company.registrationNumber,
    loanTermMonths: loanApplication.loanTerm,
    nonPropertyLoanPurpose: loanApplication.loanPurpose,
    sicCode: loanApplication.company.sicCode,
  };

  // Create a referral if not created already for this application
  if (!loanApplication.nCinoReferralId) {
    logger.info(
      'referralid is null, calling create referral with object: ',
      referral,
      '\n for loanApplicationId: ',
      loanApplication.id
    );
    await referralObject(
      referral,
      loanApplication.id,
      loanApplication.company.registrationNumber
    )
      .then(async (result) => {
        (loanApplication.nCinoReferralId = result.id),
          await loanApplication.save();
      })
      .catch((err) => {
        logger.error(err.message);
      });
  } else {
    logger.info(
      'referralid is not null, calling update referral with object: ',
      referral,
      '\n for loanApplicationId: ',
      loanApplication.id
    );
    await updateReferralObject(loanApplication.nCinoReferralId, referral).then(
      async (result) => {
        logger.info(
          'Inside updated referral object : ' + JSON.stringify(result)
        );
        // loanApplication.nCinoLoanId = null; //this will get updated with actual loan application id from nCino till then given as null
        await loanApplication.save();
      }
    );
  }
  return loanApplication;
};

/**
 * A function to validate loan application
 * @param loanApplication
 */
export const validateLoanApplication = async function (loanApplication: any) {
  logger.defaultMeta.eventType = 'validateLoanApplication'; //validateLoanApplication
  const schema = validationSchema;
  try {
    const validStatus: [] = (await schema)
      .validate(loanApplication, {
        abortEarly: false,
      })
      .then(() => {
        logger.info('Validation completed and no errors found');
        return [];
      })
      .catch((err) => {
        logger.error(err.errors.join('\n'));
        return err.errors;
      });
    return validStatus;
  } catch (err) {
    logger.error(err.message);
  }
};

/**
 * A function call to fetch the existing Loan Security
 * @param params loanApplicationId,typeOfSecurity to be provided
 * @returns existing loanSecurity mapped to this loanApplication
 */
export const getLoanSecurity = async function (
  params: loanSecurityFilter
): Promise<LoanSecurities> {
  let loanSecurity;
  const Clause: any = {};
  if (params.loanApplicationId && params.typeOfSecurity) {
    Clause[Op.and] = [
      {
        typeOfSecurity: params.typeOfSecurity,
        loanApplicationId: params.loanApplicationId,
      },
    ];
    loanSecurity = await LoanSecurities.findOne({
      where: Clause,
      raw: false,
    });
  } else {
    throw new Error('Invalid or missed arguments');
  }
  return loanSecurity;
};

/**
 * A function call to add the LoanSecurities
 * @param loanApplicationId loanApplicationId must be provided to attach/save the LoanSecurity
 * @param loanSecurities
 */
export const saveLoanSecurities = async function (loanApplicationId, payload) {
  let loanApplication = await LoanApplication.findByPk(
    loanApplicationId,
    options
  );

  for (let i = 0; i < payload.loanSecurities.length; i++) {
    const loanSecurity = payload.loanSecurities[i];
    if (isModel(loanSecurity)) {
      await loanSecurity.save();
    } else {
      await loanApplication.$add(
        'loanSecurities',
        await LoanSecurities.create(loanSecurity as any)
      );
      await loanApplication.save();
    }
  }

  // for (
  //   let i = payload.loanSecurities?.length;
  //   i < loanApplication.loanSecurities?.length;
  //   i++
  // ) {
  //   await loanApplication.loanSecurities[i].destroy();
  // }

  let loanApplicationObject = await LoanApplication.findByPk(
    loanApplicationId,
    options
  );

  return await loanApplicationObject.dataValues;

  // for (
  //   let i = payload.loanSecurities.length;
  //   i < loanApplication.loanSecurities.length;
  //   i++
  // ) {
  //   await loanApplication.loanSecurities[i].destroy();
  // }

  // for (
  //   let i = payload.loanSecurities.length;
  //   i < loanApplication.loanSecurities.length;
  //   i++
  // ) {
  //   await loanApplication.loanSecurities[i].destroy();
  // }
  // await loanApplication.save();

  // let loanSecurity = await getLoanSecurity({
  //   typeOfSecurity: loanSecurities.typeOfSecurity,
  //   loanApplicationId: loanApplicationId,
  // });
  // if (!loanSecurity) {
  //   loanSecurity = await LoanSecurities.create({
  //     loanApplicationId: loanApplicationId,
  //     typeOfSecurity: loanSecurities.typeOfSecurity,
  //     value: loanSecurities.value,
  //     description: loanSecurities.description,
  //   });
  // } else {
  //   // loanSecurity.typeOfSecurity = loanSecurities.typeOfSecurity;
  //   loanSecurity.value = loanSecurities.value;
  //   loanSecurity.description = loanSecurities.description;
  //   loanSecurity = await loanSecurity.save();
  // }

  // logger.info(JSON.stringify(loanApplication.dataValues));
  // return await { ...loanApplication.dataValues }; //await is mandatory here
};
