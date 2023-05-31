import {
  AllowNull,
  Column,
  DataType,
  Index,
  IsUUID,
  Model,
  PrimaryKey,
  Table,
  Validate,
} from "sequelize-typescript";

@Table({
  tableName: "portaluser", //It should match with the created table name in mysql else foreignKeys are being duplicated for every alteration in the sequelize Sync
})
export class PortalUser extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @Index({
    unique: true,
  })
  @IsUUID(4)
  @Column({
    type: DataType.UUID,
  })
  cognitoId: string;

  @Column({
    type: DataType.STRING,
  })
  cognitoGroup: string;

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

  @Index({
    unique: true,
  })
  @Validate({
    is: /^[^@]+@[^@]+$/,
  })
  @Column({
    type: DataType.STRING,
  })
  email: string;

  @Column({
    type: DataType.ENUM("Male", "Female"),
  })
  gender: string;
}

export default PortalUser;
