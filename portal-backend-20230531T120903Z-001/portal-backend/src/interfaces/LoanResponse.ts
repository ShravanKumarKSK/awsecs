export interface loanResponse {
  id: number;
  loanType: string;
  loanPurpose: string;
  loanAmount: number;
  loanTerm: number;
  status: string;
}

export interface loanSecurities {
  typeOfSecurity: string;
  value: string;
  description: string;
}
