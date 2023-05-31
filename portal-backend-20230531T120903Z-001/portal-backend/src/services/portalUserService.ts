import { Op } from "sequelize";
import { companyFilter, userFilter } from "../interfaces";
import { Company, PortalUser } from "../models";
import { loggerInstance } from './auditService'



const logger = loggerInstance(__filename);
/**
 * Call to getPortalUser, to retrieve PortalUser record from db
 * @param params can be one of the arguments {id, email, cognitoId} to retrieve user Record
 * @returns user Record from db
 */



export const getPortalUser = async function (
  params: userFilter
): Promise<PortalUser | null> {
  const idClause = params.id ? { id: params.id } : undefined;
  const emailClause = params.email ? { email: params.email } : undefined;
  const cognitoIdClause = params.cognitoId
    ? { cognitoId: params.cognitoId }
    : undefined;

  const Clause: any = [idClause, emailClause, cognitoIdClause].filter(Boolean);
  const user = await PortalUser.findOne({
    where: { [Op.or]: Clause },
    raw: false,
  });
  return user;
};



/**
 * Call to get company record
 * @param params id or registrationNumber to retrieve Company Record
 * @returns company Record from db
 */
export const getCompany = async function (
  params: companyFilter
): Promise<Company> {
  const Clause: any = {};
  Clause[Op.or] = params.id
    ? [{ id: params.id }]
    : [{ registrationNumber: params.registrationNumber }];
  const company = await Company.findOne({
    where: Clause,
    raw: false,
  });
  return company;
};