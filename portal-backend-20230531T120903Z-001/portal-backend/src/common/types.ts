import { uuid } from "aws-sdk/clients/customerprofiles";
import loanDetailsConfig from "../config/loanDetailsConfig.json";

export declare class User {
  name: string;
  groups: string[];
  cognitoId: uuid;
}

export const loanTypeIndex = async function (
  loanType: string = "WorkingCapital"
) {
  return Promise.resolve(
    loanDetailsConfig.loanTypes.findIndex((type) => type.name == loanType)
  );
};
