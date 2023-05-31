import { JsonController, Get, Param, Body } from "routing-controllers"
import { companyMasterJourney, individualsDIPOutcome } from "../services";
import { companyMasterJourneyInput, individualDIPJourneyInput } from "../interfaces";

@JsonController("/thirdParty/truNarrative", { transformResponse: false })
export class TruNarrativeController {

    /**
     * API for company Master Journey
     * @param input companyName and companyRegistrationNumber are given as input in request body
     * @returns DIP status for business types Limited company, PLC and Limited Liability Partnership
     */
    @Get('/companyMasterJourney')
    async getCompanyMasterJourney(@Body() input: companyMasterJourneyInput) {
        return await companyMasterJourney(input.companyName, input.companyRegistrationNumber)
    }


    /**
     * API to get DIP status for business types General Partnership and Sole Trader
     * @param input keyIndividuals object is given as input in request body
     * @returns DIP status for business types General Partnership and Sole Trader
     */
    @Get('/individualDIPJourney')
    async getIndividualsDIPJourney(@Body() input: individualDIPJourneyInput) {
        return await individualsDIPOutcome(input.keyIndividuals)
    }

}