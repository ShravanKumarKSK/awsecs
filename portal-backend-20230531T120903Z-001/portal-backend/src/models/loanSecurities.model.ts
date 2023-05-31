import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Unique,
} from "sequelize-typescript";

import LoanApplication from "./loanApplication.model";

@Table({
  tableName: "loansecurities",
})
export class LoanSecurities extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @Unique("loan_security_type")
  @ForeignKey(() => LoanApplication)
  @Column(DataType.INTEGER)
  loanApplicationId: number;

  @BelongsTo(() => LoanApplication)
  loanApplication: LoanApplication;

  @Unique("loan_security_type")
  @Column({ type: DataType.STRING })
  typeOfSecurity: string;

  @Column({ type: DataType.STRING })
  value: string;

  @Column({ type: DataType.STRING })
  description: string;
}

export default LoanSecurities;
