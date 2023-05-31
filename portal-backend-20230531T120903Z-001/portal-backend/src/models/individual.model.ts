import {
  AllowNull,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Validate,
} from "sequelize-typescript";
import Company from "./company.model";
import loanDetailsConfig from "../config/loanDetailsConfig.json";

@Table({
  tableName: "individual",
})
export class Individual extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => Company)
  companyId: number;

  @Column({
    type: DataType.ENUM(
      ...loanDetailsConfig.loanTypes.flatMap(
        (elem) => elem.configs.companyDetails.keyIndividualConfigs.titles
      )
    ),
  })
  title: string;

  @Column({
    type: DataType.STRING,
  })
  firstName: string;

  @Column({
    type: DataType.STRING,
  })
  lastName: string;

  @Column({
    type: DataType.STRING,
  })
  phone: string;

  @Validate({
    is: /^[^@]+@[^@]+$/,
  })
  @Column({
    type: DataType.STRING,
  })
  email: string;

  @Column(DataType.DATE)
  dob: Date;

  @Column({
    type: DataType.ENUM("Male", "Female"),
  })
  gender: string;

  @Column({
    type: DataType.STRING,
  })
  nationality: string;

  @Column({
    type: DataType.BOOLEAN,
  })
  permanentResident: boolean;

  @Column({ type: DataType.STRING })
  role: string;

  @Column({ type: DataType.INTEGER })
  companyOwnershipPercentage: number;

  @Column(DataType.STRING)
  address: string;
}

export default Individual;
