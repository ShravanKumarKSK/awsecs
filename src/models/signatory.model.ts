import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  Validate,
} from 'sequelize-typescript';

import Individual from './individual.model';
import PandadocDocuments from './pandadocDocuments.model';

@Table({
  tableName: 'signatory',
})
export class Signatory extends Model {
  @PrimaryKey
  @AllowNull(false)
  @Column({
    type: DataType.INTEGER,
    autoIncrement: true,
  })
  id: number;

  @ForeignKey(() => PandadocDocuments)
  @Column({ type: DataType.INTEGER })
  pandadocdocumentId: number;

  @BelongsTo(() => PandadocDocuments)
  pandadocDocuments: PandadocDocuments;

  @ForeignKey(() => Individual)
  @Column(DataType.INTEGER)
  keyIndividualId: number;

  @BelongsTo(() => Individual)
  individual: Individual;

  @Column({ type: DataType.STRING })
  documentLink: string;

  @Validate({
    is: /^[^@]+@[^@]+$/,
  })
  @Column({
    type: DataType.STRING,
  })
  email: string;

  @Column({ type: DataType.ENUM('Pending', 'Signed') })
  status: string;
}

export default Signatory;
