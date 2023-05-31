import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  HasOne,
  Model,
  PrimaryKey,
  Table,
} from "sequelize-typescript";

import loanDetailsConfig from "../config/loanDetailsConfig.json";
import Company from "./company.model";
import ExternalIntegrations from "./externalIntegrations.model";
import LoanOffer from "./loanOffer.model";
import LoanSecurities from "./loanSecurities.model";
import PandadocDocuments from "./pandadocDocuments.model";
import PortalUser from "./portalUser.model";

@Table({
  tableName: "loanapplication",
})
export class LoanApplication extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => PortalUser)
  @AllowNull(false)
  @Column(DataType.INTEGER)
  portaluserId: number;

  @BelongsTo(() => PortalUser)
  portaluser: PortalUser;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @Column({
    type: DataType.ENUM(
      ...loanDetailsConfig.loanTypes.flatMap((elem) => elem.name)
    ),
  })
  loanType: string;

  @Column({
    type: DataType.INTEGER,
  })
  loanAmount: number;

  @Column({
    type: DataType.ENUM(
      ...loanDetailsConfig.loanTypes.flatMap((elem) => elem.configs.loanPurpose)
    ),
  })
  loanPurpose: string;

  @Column(DataType.INTEGER)
  loanTerm: number;

  @Column({
    type: DataType.ENUM("Draft", "Submitted", "Approved", "Rejected"),
    defaultValue: "Draft",
  })
  status: string;

  @Column({
    type: DataType.ENUM(
      "NotReadyForDIP",
      "ReadyForDIP",
      "Accepted",
      "Declined"
    ),
    defaultValue: "NotReadyForDIP",
  })
  DIPStatus: string;

  @Column({
    type: DataType.STRING,
  })
  nCinoReferralId: string;

  @Column({
    type: DataType.STRING,
  })
  nCinoLoanId: string;

  @Column({ type: DataType.STRING })
  businessInsuranceCover: string;

  @HasMany(() => LoanSecurities)
  loanSecurities: LoanSecurities[];

  @HasMany(() => ExternalIntegrations)
  externalIntegrations: ExternalIntegrations[];

  @HasMany(() => PandadocDocuments)
  pandadocDocuments: PandadocDocuments[];

  @HasOne(() => LoanOffer)
  loanOffer: LoanOffer;
}

export default LoanApplication;
