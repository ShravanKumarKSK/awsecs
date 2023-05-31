import { uuid } from "aws-sdk/clients/customerprofiles";

export interface companyFilter {
  id?: number;
  registrationNumber?: string;
}

export interface userFilter {
  id?: number;
  email?: string;
  cognitoId?: uuid;
}

//externalIntegrationInterface
export interface loanSecurityFilter {
  loanApplicationId?: number;
  typeOfSecurity?: string;
}

//externalIntegrationInterface
export interface externalIntegrationInterface {
  id?: number;
  loanApplicationId?: number;
  provider?: string;
}

type externalIdProvided<T extends externalIntegrationInterface> = T extends {
  id: number;
}
  ? { loanApplicationId: number; provider: string }
  : { loanApplicationId?: number; provider?: string };

export type externalIntegrationFilter<T extends externalIntegrationInterface> =
  T & externalIdProvided<T>;

//loanApplicationInterface
export interface loanApplicationInterface {
  id?: number;
  portaluserId?: number;
  companyId?: number;
}

type idProvided<T extends loanApplicationInterface> = T extends { id: number }
  ? { portaluserId: number; companyId: number }
  : { portaluserId?: number; companyId?: number };

export type loanApplicationFilter<T extends loanApplicationInterface> = T &
  idProvided<T>;
