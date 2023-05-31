import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  AllowNull,
  ForeignKey,
  BelongsTo,
} from "sequelize-typescript";
import { LoanApplication } from "../models/loanApplication.model";

@Table({ tableName: "loanoffer" })
export class LoanOffer extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => LoanApplication)
  @Column({
    type: DataType.INTEGER,
  })
  loanApplicationId: number;

  @BelongsTo(() => LoanApplication)
  loanApplication: LoanApplication;

  @Column({
    type: DataType.FLOAT,
  })
  loanAmount: number;

  @Column({
    type: DataType.INTEGER,
  })
  loanTerm: number;

  @Column({
    type: DataType.ENUM("Draft", "Final"),
    defaultValue: "Draft",
  })
  offerType: string;

  @Column({
    type: DataType.FLOAT,
  })
  monthlyRepayment: number;

  @Column({
    type: DataType.FLOAT,
  })
  capitalRepayment: number;

  @Column({
    type: DataType.FLOAT,
  })
  averageMonthlyInterest: number;

  @Column({
    type: DataType.FLOAT,
  })
  totalCostOfFinance: number;

  @Column({
    type: DataType.FLOAT,
  })
  totalInterest: number;

  @Column({
    type: DataType.FLOAT,
  })
  interestRate: number;

  @Column({
    type: DataType.STRING,
  })
  expiryDate: string;

  @Column({
    type: DataType.STRING,
  })
  borrower: string;

  @Column({
    type: DataType.STRING,
  })
  loanPurpose: string;

  @Column({
    type: DataType.INTEGER,
  })
  arrangementFee: number;

  @Column({
    type: DataType.INTEGER,
  })
  procurationFee: number;

  @Column({
    type: DataType.STRING,
  })
  repaymentType: string;

  @Column({
    type: DataType.INTEGER,
  })
  TTFee: number;

  @Column({
    type: DataType.STRING,
  })
  prepaymentFees: string;

  @Column({
    type: DataType.FLOAT,
  })
  baseRate: number;
}

export default LoanOffer;
