import { JsonController, Get, Param } from 'routing-controllers';
import { retrieveCompanyDetails, retrieveKeyIndividualsDetails, findCompanyNumberByName } from '../services';

@JsonController("/thirdParty/companiesHouse", { transformResponse: false })
export class CompaniesHouseController {

    /**
     * API to get company details like registered office address and sic code from Companies House.
     * @param companyRegistrationNumber 
     * @returns Registered Address, SIC Code
     */
    @Get('/:companyRegistrationNumber/companyDetails')
    async getData(@Param('companyRegistrationNumber') companyRegistrationNumber: string) {
        return await retrieveCompanyDetails(companyRegistrationNumber)
    }

    /**
     * API to fetch officers details from Companies House.
     * @param companyRegistrationNumber 
     * @returns Key Individuals details
     */
    @Get('/:companyRegistrationNumber/keyIndividuals')
    async getKeyIndividualsData(@Param('companyRegistrationNumber') companyRegistrationNumber: string) {
        return await retrieveKeyIndividualsDetails(companyRegistrationNumber)
    }

    /**
     * API to get company registration number for a given company name
     * @param name full or part of the company name is given as request parameter
     * @returns company registration numbers for the given string which includes in the company name
     */
    @Get('/:companyName')
    async getCompanyRegNumByName(@Param('companyName') companyName: string) {
        return await findCompanyNumberByName(companyName);
    }

}