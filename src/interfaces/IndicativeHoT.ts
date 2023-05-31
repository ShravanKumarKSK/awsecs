/**
 * interface for indicative Head of terms output
 */
export interface IndicativeHoT {
    expiryDate: string,
    borrower: string,
    loanPurpose: string,
    grossLoanAmount: number,
    proposedSecurity: string[],
    term: number,
    arrangementFee: number,
    procurationFee: number,
    interestRate: number,
    repaymentType: string,
    monthlyPayment: number,
    TTFee: number,
    prepaymentFees: string
}


export interface NumberRange {
    min: number,
    max: number
}

/**
 * interface for indicative Head of terms input
 */
export interface IndicativeHoTInput {
    loanAmount: number,
    loanTerm: number,
    loanPurpose: string,
    loanBorrower: string
}

/**
 * interface for loan details
 */
export interface LoanDetails {
    purpose: string,
    term: number,
    amount: number
}

/**
 * interface for loan repayment
 */
export interface MonthlyRepayment {
    monthlyRepayment: number,
    interestRate: number,
    averageMonthlyInterest: number,
    totalInterest: number,
    totalCostOfFinance: number,
    capitalRepayment: number
}


export interface UserDetails {
    name : string,
    email : string
}