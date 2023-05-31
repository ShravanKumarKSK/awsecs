import {
    Authorized,
    Get,
    JsonController,
    Param,
} from "routing-controllers";
import {
    codatIntegrationStatus,
    getCodatIntegrationLink,
    sendCodatLinkViaEmail,
} from "../services";

@JsonController("/thirdParty/codat", { transformResponse: false })
export class CodatController {
    /**
     * API to fetch codat integration/Consent link
     * @param loanApplicationId
     * @returns IntegrationLink
     */
    @Get("/:loanApplicationId/getIntegrationLink")
    @Authorized()
    async integrationLink(@Param("loanApplicationId") loanApplicationId: number) {
        return await getCodatIntegrationLink(loanApplicationId);
    }

    /**
     * API to fetch integration status
     * @param loanApplicationId
     * @returns integrationStatus
     */
    @Get("/:loanApplicationId/getIntegrationStatus")
    @Authorized()
    async integrationStatus(@Param("loanApplicationId") loanApplicationId: number) {
        return await codatIntegrationStatus(loanApplicationId);
    }

    /**
     * API to send codat integration link via email
     * @param loanApplicationId 
     * @param recipientEmailID
     * @returns sends codat integration link via email
     */
    @Get("/:loanApplicationId/sendIntegrationLink/:emailID")
    @Authorized()
    async sendIntegrationLink(
        @Param("loanApplicationId") loanApplicationId: number,
        @Param("emailID") emailID: string,
    ) {
        return await sendCodatLinkViaEmail(loanApplicationId, emailID);
    }
}
