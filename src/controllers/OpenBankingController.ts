import { JsonController, Get, CurrentUser, Authorized, Param, Post, Body } from 'routing-controllers';
import { getOpenBankingIntegrationLink, trackOpenBankingStatus, sendOpenBankingLinkViaEmail } from '../services';
import { User } from '../common/types';


@JsonController("/thirdParty/openBanking", { transformResponse: false })
export class OpenBankingController {

  /**
   * API to fetch codat integration/Consent link
   * @param user, loanApplicationId
   * @returns IntegrationLink
   */
  @Post('/:loanApplicationId/getIntegrationLink/')
  @Authorized()
  async integrationLink(@Param("loanApplicationId") loanApplicationId: number, @CurrentUser() user: User) {
    return await getOpenBankingIntegrationLink(loanApplicationId, user.name);
  }

  /**
   * API to track open banking status
   * @param loanApplicationId 
   * @returns 
   */
  @Get('/:loanApplicationId/getIntegrationStatus')
  @Authorized()
  async trackingOpenBanking(@Param("loanApplicationId") loanApplicationId: number) {
    return await trackOpenBankingStatus(loanApplicationId)
  }

  /**
 * API to send codat integration link via email
 * @param user, recipientEmailID
 * @returns sends codat integration link via email
 */
  @Get("/:loanApplicationId/sendIntegrationLink/:emailId")
  @Authorized()
  async sendOBIntegrationLinkViaEmail(
    @Param("loanApplicationId") loanApplicationId: number,
    @Param("emailId") emailId: string,
  ) {
    return await sendOpenBankingLinkViaEmail(loanApplicationId, emailId);
  }

}