import {
    AllowNull,
    Column,
    DataType,
    ForeignKey,
    Model,
    PrimaryKey,
    Table,
    Unique,
} from "sequelize-typescript";
import Company from "./company.model";

@Table({
    tableName: "address",
})
export class Address extends Model {
    @PrimaryKey
    @AllowNull(false)
    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
    })
    id: number;

    @Unique("company_addr_type")
    @ForeignKey(() => Company)
    @Column(DataType.INTEGER)
    companyId: number;

    @Column({
        type: DataType.STRING(1024),
    })
    line1: string;

    @Column({
        type: DataType.STRING(1024),
    })
    line2: string;

    @Column({
        type: DataType.STRING,
    })
    city: string;

    @Column({
        type: DataType.STRING,
    })
    country: string;

    @Column({
        type: DataType.STRING,
    })
    postalCode: string;

    @Unique("company_addr_type")
    @Column({
        type: DataType.ENUM(
            "REGISTERED_ADDRESS",
            "TRADING_ADDRESS",
            "CORRESPONDENCE_ADDRESS"
        ),
    })
    addressType: string;
}

export default Address;
