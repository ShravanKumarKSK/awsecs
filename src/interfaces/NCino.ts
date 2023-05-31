export interface ReferralObjectInput {
  company: string;
  firstName?: string;
  lastName?: string;
  referralAmount: number;
  receivingLineOfBusiness:
  | "Bridging"
  | "Professional Practice"
  | "Working Capital"
  | "Commercial Property"
  | "Professional Buy to Let"
  | "Commercial"
  | "Asset Finance Hire Purchase";
  referringLineOfBusiness: "Broker" | "Customer" | "BDM" | "Vendor";
  preferredContactMethod:
  | "Email"
  | "Work Phone"
  | "Mobile Phone"
  | "Home Phone";
  emailAddress: string;
  companyRegistrationNumber: string;
  loanTermMonths: number;
  nonPropertyLoanPurpose: string;
  sicCode: number;
}

export interface PaymentDetails {
  sortCode: string;
  bankAccountNumber: string;
  bankName: string;
}


export interface RePaymentDetails {
  sortCode: string;
  bankAccountNumber: string;
  bankName: string;
}

interface ReferralObject {
  assignedBDM: string;
  branch: string;
  broker: string;
  brokerManager: string;
  channelLineOfBusiness: "Broker" | "Customer" | "BDM" | "Vendor";
  company: string;
  companyRegistrationNumber: string;
  createdBy: string;
  declinedOrLostReasons:
  | "BORROWER - CREDIT HISTORY"
  | "BORROWER - EXPERIENCE"
  | "BORROWER - NET WORTH / INCOME (ALIE)"
  | "BORROWER - SATISFACTION OF AML REQUIREMENTS"
  | "LEGAL - DUE DILIGENCE ISSUES"
  | "OUT OF POLICY - AGGREGATION"
  | "OUT OF POLICY - LOAN AMOUNT"
  | "OUT OF POLICY - LOAN TERM"
  | "OUT OF POLICY - LTV"
  | "OUT OF POLICY - PROPERTY SECTOR"
  | "PROPERTY - LOCATION"
  | "PROPERTY - QUALITY"
  | "RECOGNISE - RESOURCING CONSTRAINTS"
  | "RECOGNISE - SECURITY OFFERED"
  | "RECOGNISE - TYPE OF LENDING / COMPETITIVENESS"
  | "VALUATION REPORT - UNSATISFACTORY PROPERTY / PROJECT"
  | "CUSTOMER WITHDREW - NOT PROCEEDING WITH PURCHASE / PROJECT"
  | "CUSTOMER WITHDREW - RAISING ADDITIONAL EQUITY"
  | "CUSTOMER WITHDREW - TERMS OFFERED NOT SUITABLE"
  | "LOST BUSINESS TO COMPETITOR - BASED ON LOAN AMOUNT"
  | "LOST BUSINESS TO COMPETITOR - BASED ON LTV"
  | "LOST BUSINESS TO COMPETITOR - BASED ON PRICING"
  | "LOST TO COMPETITOR - INTEREST ONLY"
  | "LOST TO COMPETITOR - PRODUCT UNAVAILABLE"
  | "LOST TO COMPETITOR - TERM"
  | "LOST TO COMPETITOR - SECTOR"
  | "LOST TO COMPETITOR - PROVISION OF A PG"
  | "LOST TO COMPETITOR - PROVISION OF OTHER SECURITY"
  | "LOST TO COMPETITOR - INFORMATION REQUIREMENTS /MONITORING"
  | "DECLINED - TENANT UNSATISFACTORY COVENANT"
  | "DECLINED - TENANT LENGTH OF LEASE";
  emailAddress: string;
  existingRelationship: string;
  firstName: string;
  headsOfTermsIssueDate: string;
  headsOfTermsStatus:
  | "Not Issued"
  | "HoT's Issued - highly likely to proceed"
  | "HoT's Issued - unknown likelihood to proceed"
  | "HoT's accepted";
  homePhone: string;
  lastModifiedBy: string;
  lastName: string;
  loanTerm: number;
  loan: string;
  lostOrDeclineComments: string;
  mobilePhone: string;
  noAdverseCreditIdentified: "Yes" | "No";
  nonPropertyLoanPurpose:
  | "Aged Debtors"
  | "Association Membership Fees"
  | "Block Fee Purchase"
  | "Building Works"
  | "Legal Case Acquisition Fees"
  | "Disbursement Funding"
  | "DX Fees"
  | "Equipment & Furniture"
  | "Equity or Share Buy In/Out"
  | "Goodwill Acquisition"
  | "Office/General Insurance"
  | "Practising Certificates"
  | "Private Healthcare Insurance"
  | "Professional Indemnity"
  | "Recruitment Fees"
  | "Refurbishment"
  | "Shop Fittings"
  | "Software (Annual Licenses)"
  | "Stock Purchase"
  | "Tax Liabilities"
  | "VAT (Trading & Property)"
  | "Work in Progress"
  | "Working Capital/Cashflow"
  | "Mixed Purposes"
  | "Healthcare Acquisition"
  | "Healthcare Refinance"
  | "Healthcare Acquisition & Refinance";
  otherRepaymentSource: string;
  owner: string;
  phoneNumber: string;
  preferredContactMethod:
  | "Email"
  | "Work Phone"
  | "Mobile Phone"
  | "Home Phone";
  preferredContactTime: "Morning" | "Afternoon" | "Evening" | "Anytime";
  product:
  | "Bridging Owner Business"
  | "Bridging Property"
  | "Commercial Property"
  | "Commercial Property Owner Business"
  | "Professional BTL"
  | "Professional Practice"
  | "Working Capital Commercial Loan"
  | "Commercial Property (Extended Amortisation)"
  | "Commercial Property Owner Business (Extended Amortisation)"
  | "Professional BTL (Extended Amortisation)"
  | "Bridging Loan - Tranched Drawdown"
  | "Professional BTL FIXED RATE"
  | "Professional BTL FIXED RATE (Extended Amortisation)"
  | "Professional Practice (Extended Amortisation)"
  | "Asset Finance Hire Purchase";
  productLine: "Commercial";
  productPackage: string;
  productType: "Owner Business" | "Property" | "Asset Finance";
  professionalRegistrationNumber: string;
  recordType: string;
  referralAmount: number;
  referralCloseDate: string;
  referralDetails: string;
  //referralNumber : number,
  referralQuality: "Qualified" | "Unqualified";
  referralQualityNotes: string;
  referralReceivedDate: any;
  referralSentDate: any;
  referralSourceContact: string;
  referralStatus: "Open" | "Converted" | "Declined" | "Lost";
  referredBy: string;
  referredTo: string;
  referredToProductLine: string;
  repaymentSource:
  | "Sale of Asset"
  | "Re-Finance"
  | "Fully Amortising Over Term"
  | "Other";
  repaymentSourceConfirmation: "Yes" | "No";
  securityCity: string;
  securityPostCode: string;
  securityStreetAddress: string;
  // SICCode
  // SIC Code
  statusForBroker: string;
  typeOfLoan:
  | "Bridging"
  | "Professional Practice"
  | "Working Capital"
  | "Commercial Property"
  | "Professional Buy to Let"
  | "Commercial"
  | "Asset Finance Hire Purchase";
  whereDidTheyHearAboutUs:
  | "Advert - Promotion"
  | "Broker"
  | "Customer Advocacy Referral"
  | "Debt Provider Platform"
  | "Direct - Search Engine"
  | "Email Campaign"
  | "Employee Referral"
  | "Existing Customer"
  | "NACFB"
  | "Professional Partner Relationship"
  | "Trade Association"
  | "Trade Show";
  workPhone: string;
}

export interface netWorthInput {
  name: string;
  value: number,
  type: "Asset" | "Liability"
}
