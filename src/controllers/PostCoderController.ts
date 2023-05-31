import { JsonController, Get, Param, QueryParam } from "routing-controllers"
import { postCoderFind, postCoderRetrieve, verifyBankDetails } from "../services"

@JsonController("/thirdParty/postCoder", { transformResponse: false })
export class PostCoderController {

    /**
     * API to get address suggestions using company name search string
     * @param companyName search string
     * @returns address suggestions with IDs
     */
    @Get('/postcoderFind')
    async getPostCoderFindData(@QueryParam('companyName') companyName: string) {
        return await postCoderFind(companyName)
    }

    /**
     * API to retrieve the full address using company name search string and ID of address suggestion which we get from find API call
     * @param companyName search string
     * @param id of address suggestion
     * @returns full address of the suggestion
     */
    @Get('/:companyName/postcoderRetrieve')
    async getPostCoderRetrieveData(@Param('companyName') companyName: string, @QueryParam('id') id: string) {
        return await postCoderRetrieve(companyName, id)
    }

    /**
     * API to validate bank account details (sort code and account number) and fetch the bank name and bank branch
     * @param sortCode 
     * @param accountNumber 
     * @returns bank name and bank branch
     */
    @Get('verifyBankDetails/:sortCode/:accountNumber')
    async bankDetailsValidation(@Param('sortCode') sortCode: string, @Param('accountNumber') accountNumber: string) {
        return await verifyBankDetails(sortCode, accountNumber)
    }

}