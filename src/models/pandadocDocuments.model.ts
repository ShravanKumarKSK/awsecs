import {
  AllowNull,
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import LoanApplication from './loanApplication.model';
import Signatory from './signatory.model';

@Table({
  tableName: 'pandadocdocuments',
})
export class PandadocDocuments extends Model {
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

  @Column({ type: DataType.STRING })
  documentId: string;

  @Column({ type: DataType.STRING })
  documentName: string;

  @Column({ type: DataType.STRING })
  documentEvent: string;

  @Column({ type: DataType.STRING })
  documentType: string;

  @HasMany(() => Signatory)
  signatories: Signatory[];

  @Column({ type: DataType.ENUM('draft', 'sent', 'viewed', 'completed') })
  status: string;
}

export default PandadocDocuments;
