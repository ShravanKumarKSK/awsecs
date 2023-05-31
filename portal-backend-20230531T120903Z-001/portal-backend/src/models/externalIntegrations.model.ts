import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique
} from "sequelize-typescript";

import LoanApplication from "./loanApplication.model";

@Table({
  tableName: "externalintegrations",
})
export class ExternalIntegrations extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @Unique("externalIntegrationType")
  @Column({
    type: DataType.INTEGER,
  })
  @ForeignKey(() => LoanApplication)
  loanApplicationId: number;

  @BelongsTo(() => LoanApplication)
  loanApplication: LoanApplication;

  //Unique on loanApplicationId, provider
  @Unique("externalIntegrationType")
  @Column({
    type: DataType.ENUM("CODAT", "OPEN_BANKING"),
  })
  provider: string;

  
  @Column({ type: DataType.STRING })
  externalId: string;

  @Column({ type: DataType.DATE })
  startTimestamp: Date;

  @Column({ type: DataType.DATE })
  completeTimestamp: Date;

  @Column({ type: DataType.DATE })
  lastStatusCheckTimestamp: Date;

  @Column({
    type: DataType.ENUM("STARTED", "COMPLETED"),
  })
  status: string;

  @Column({
    type: DataType.STRING,
  })
  externalStatus: string;
}

export default ExternalIntegrations;
