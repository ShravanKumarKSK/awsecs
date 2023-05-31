import {
  Table,
  Column,
  Model,
  DataType,
  IsUUID,
} from "sequelize-typescript";

@Table({
  tableName: "portalusersession",
})
export class PortalUserSession extends Model {

  @IsUUID(4)
  @Column({
    type: DataType.UUID,
  })
  cognitoId: string;

  @Column({ type: DataType.DATE })
  loginTime: Date;

  @Column({
    type: DataType.DATE,
  })
  expiryTime: Date;
}

export default PortalUserSession;
