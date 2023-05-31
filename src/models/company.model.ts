import {
    AllowNull,
    Column,
    DataType,
    HasMany,
    Model,
    PrimaryKey,
    Table,
} from "sequelize-typescript";

import loanDetailsConfig from "../config/loanDetailsConfig.json";
import Address from "./address.model";
import Individual from "./individual.model";
import LoanApplication from "./loanApplication.model";

@Table({
    tableName: "company",
})
export class Company extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
    })
    id: number;

    @Column({
        type: DataType.STRING,
    })
    name: string;

    @Column({
        type: DataType.ENUM(
            ...loanDetailsConfig.loanTypes.flatMap((elem) =>
                elem.configs.companyDetails.businessEntities.flatMap(
                    (subElem) => subElem.name
                )
            )
        ),
    })
    businessType: string;

    @Column({
        type: DataType.STRING,
    })
    registrationNumber: string;

    @Column({
        type: DataType.STRING,
    })
    tradingSince: string;

    @Column({
        type: DataType.STRING,
    })
    phone: string;

    @Column(DataType.STRING)
    email: string;

    @Column(DataType.STRING)
    sicCode: number;

    @Column({
        type: DataType.STRING,
    })
    businessDescription: string;

    @Column({
        type: DataType.STRING,
    })
    employeeCount: string;

    @Column({
        type: DataType.STRING,
    })
    nCinoAccountId: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    existingCustomer: boolean;

    @HasMany(() => LoanApplication)
    loanApplications: LoanApplication[];

    @HasMany(() => Address)
    addresses: Address[];

    @HasMany(() => Individual)
    keyIndividuals: Individual[];
}

export default Company;
