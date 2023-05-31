import loanDetails from '../config/loanDetailsConfig.json';
import { IndicativeHoT, MonthlyRepayment, NumberRange } from '../interfaces';
import { loggerInstance } from './auditService';

const logger = loggerInstance(__filename);

/**
 * function to check whether the give number n is in given range r
 * @param n given number
 * @param r given range
 * @returns boolean
 */
export function isInRange(n: number, r: NumberRange) {
  return r.min <= n && r.max >= n;
}

/**
 * function to fetch basis points based for term and amount based on purpose
 * @param Object term or amount basis points object
 * @param interestPurpose loan purpose
 * @param interest term or amount
 * @returns term or amount basis points
 */
export function fetchBasisPoints(
  Object,
  interestPurpose: string,
  interest: number
) {
  var basis;
  for (var i = 0; i < Object.length; i++) {
    if (Object[i].purpose === interestPurpose) {
      const objectRanges = Object[i].markupConfig;
      for (var j = 0; j < objectRanges.length; j++) {
        if (isInRange(interest, objectRanges[j].range)) {
          basis = objectRanges[j].markup;
        }
      }
    }
  }
  return basis;
}

/**
 * funtion to calculate montly interest repayment
 * @param interestRate
 * @param interestAmount
 * @param interestTerm
 * @returns montly interest repayment
 */
export function monthlyInterest(
  interestRate: number,
  interestAmount: number,
  interestTerm: number
) {
  logger.info(
    'interestRate: ',
    interestRate,
    '\t interestAmount: ',
    interestAmount,
    '\t interestTerm: ',
    interestTerm
  );
  const monthlyamount =
    (interestAmount * (interestRate / 1200)) /
    (1 - Math.pow(1 + interestRate / 1200, -interestTerm));
  return monthlyamount;
}

/**
 * function to calculte required field for monthly repayment tab
 * @param interestPurpose
 * @param interestTerm
 * @param interestAmount
 * @returns monthly payment, interest rate, average monthly interest rate, total interest, total cost of finance and capital repayment as an object
 */
export async function interestCalculator(
  interestPurpose: string,
  interestTerm: number,
  interestAmount: number,
  productName: string = 'WorkingCapital'
): Promise<MonthlyRepayment> {
  logger.defaultMeta.eventType = 'Interest Calculation';
  logger.defaultMeta.eventParams = {
    interestPurpose: interestPurpose,
    intersetTerm: interestTerm,
    interestAmount: interestAmount,
    productName: productName,
  };
  let productIndex_interest = loanDetails.loanTypes.findIndex(
    (type) => type.name == productName
  );
  const interestRateConfig =
    loanDetails.loanTypes[productIndex_interest].configs.interestRateConfig;
  if (
    (interestTerm > interestRateConfig.maxTerm &&
      interestAmount > interestRateConfig.maxAmount) ||
    (interestTerm < interestRateConfig.minTerm &&
      interestAmount < interestRateConfig.minAmount)
  ) {
    throw new Error(
      'Applied Loan Amount and Loan Term are not within the range'
    );
  }
  if (
    interestTerm > interestRateConfig.maxTerm ||
    interestTerm < interestRateConfig.minTerm
  ) {
    throw new Error('Applied Loan Term is not within the range');
  }
  if (
    interestAmount > interestRateConfig.maxAmount ||
    interestAmount < interestRateConfig.minAmount
  ) {
    throw new Error('Applied Loan Amount is not within the range');
  }
  let monthlyPayment = 0;
  //logger.info('productoneinside interestCalculator', monthlyPayment)
  const termObject = interestRateConfig.termBasedMarkup;
  const amountObject = interestRateConfig.amountBasedMarkup;
  const termBasis = await fetchBasisPoints(
    termObject,
    interestPurpose,
    interestTerm
  );
  const amountBasis = await fetchBasisPoints(
    amountObject,
    interestPurpose,
    interestAmount
  );
  const base = interestRateConfig.baseRate;
  logger.info('termbasis: ' + termBasis + '\t amountbasis: ' + amountBasis);
  const interestRates = (termBasis + amountBasis) * 0.01 + base;
  monthlyPayment = monthlyInterest(interestRates, interestAmount, interestTerm);
  const avgMonthlyPayment: number =
    monthlyPayment - interestAmount / interestTerm;
  const totalInterestCaluculated: number = avgMonthlyPayment * interestTerm;
  const totalCostOfFinanceCalculated: number =
    interestAmount + totalInterestCaluculated;
  const capitalRepaymentCaluculated: number =
    monthlyPayment - avgMonthlyPayment;
  const loanConfig: MonthlyRepayment = {
    monthlyRepayment: monthlyPayment,
    interestRate: interestRates,
    averageMonthlyInterest: avgMonthlyPayment,
    totalInterest: totalInterestCaluculated,
    totalCostOfFinance: totalCostOfFinanceCalculated,
    capitalRepayment: capitalRepaymentCaluculated,
  };
  //logger.info('monthlyPayment in interestCalculator: ', monthlyPayments)
  return loanConfig;
}

/**
 * function to populate monthly repayment and interest rate to loan tables
 * @param loanPurpose
 * @param loanTerm
 * @param amount
 */
export async function headofTerms(
  loanEntities,
  loanAppId,
  borrower,
  productName: string = 'WorkingCapital'
) {
  const loanAmount = loanEntities.loanAmount;
  const loanTerm = loanEntities.loanTerm;
  const loanPurpose = loanEntities.loanPurpose;
  let baseIndex = loanDetails.loanTypes.findIndex(
    (type) => type.name == productName
  );
  const baseRate =
    loanDetails.loanTypes[baseIndex].configs.interestRateConfig.baseRate;
  const loanId = { loanApplicationId: loanAppId };

  const indicative: IndicativeHoT = await indicativeHoT(
    loanAmount,
    loanTerm,
    loanPurpose,
    borrower
  );
  const monthlyRepayment = await interestCalculator(
    loanPurpose,
    loanTerm,
    loanAmount
  );
  const loanOfferEntities = await {
    ...loanEntities,
    ...indicative,
    ...monthlyRepayment,
    ...{ baseRate: baseRate },
    ...loanId,
  };
  return loanOfferEntities;
}

/**
 * function to get required fields for indicative head of terms tab
 * @param loanAmount, applied loan amount
 * @param loanTerm, term for which loan applied
 * @param loanPurpose, purpse for which loan applied
 * @param loanBorrower, company applying for loan
 * @returns indicate head of terms object
 */
export async function indicativeHoT(
  loanAmount: number,
  loanTerm: number,
  loanPurpose: string,
  loanBorrower: string,
  productName: string = 'WorkingCapital'
) {
  let productIndex = loanDetails.loanTypes.findIndex(
    (type) => type.name == productName
  );
  const prodConfig = loanDetails.loanTypes[productIndex].configs.prodConfig;
  const calculatedInterestTerms: MonthlyRepayment = await interestCalculator(
    loanPurpose,
    loanTerm,
    loanAmount
  );
  const indicativeHeadOfTerms: IndicativeHoT = {
    expiryDate: prodConfig['expiryDate'],
    borrower: loanBorrower,
    loanPurpose: loanPurpose,
    grossLoanAmount: loanAmount,
    proposedSecurity: prodConfig['proposedSecurity'],
    term: loanTerm,
    arrangementFee: prodConfig['arrangementFee'] * loanAmount,
    procurationFee: prodConfig['procurationFee'] * loanAmount,
    interestRate: calculatedInterestTerms.interestRate,
    repaymentType: prodConfig['repaymentType'],
    monthlyPayment: calculatedInterestTerms.monthlyRepayment,
    TTFee: prodConfig['TTFee'],
    prepaymentFees: prodConfig['prepaymentFees'],
  };
  return indicativeHeadOfTerms;
}
