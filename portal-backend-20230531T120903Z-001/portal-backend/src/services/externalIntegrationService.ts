import { Op } from "sequelize";
import {
  externalIntegrationFilter,
  externalIntegrationInterface,
} from "../interfaces";
import { ExternalIntegrations } from "../models";
import { loggerInstance } from './auditService'


const logger = loggerInstance(__filename);


/**
 * A function to fetch existing externalIntegration to the loan Application 
 * @param params loanApplicationId and provider has to be provided for this function to fetch the record if exists
 * @returns existing record or null
 */
export const getExternalIntegration = async function (
  params: externalIntegrationFilter<externalIntegrationInterface>
): Promise<ExternalIntegrations> {
  let externalIntegration;
  const Clause: any = {};
  if (params.id || (params.loanApplicationId && params.provider)) {
    Clause[Op.and] = params.id
      ? [{ id: params.id }]
      : [
          {
            provider: params.provider,
            loanApplicationId: params.loanApplicationId,
          },
        ];
    externalIntegration = await ExternalIntegrations.findOne({
      where: Clause,
      raw: false,
    });
  } else {
    throw new Error("Invalid or missed arguments");
  }
  return externalIntegration;
};
