import { Document, model, Schema, Types } from 'mongoose';

export interface ITransactionHistory {
  type: TrxType;
  amount: number;
  userId: Types.ObjectId;
  trxReference?: string;
  trxDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface INotification {
  title: string;
  details: string;
  receivers: { user: Types.ObjectId; read: boolean }[];
  createdAt: Date;
  updatedAt: Date;
}

export enum TrxType {
  TRANSFER = 'Bank Transfer',
  JOIN = 'Joined Slash',
  FEE = 'Processing Fee',
  REFUND = 'Refund',
}

const trxSchema = new Schema(
  {
    type: { type: String, enum: Object.values(TrxType) },
    userId: { type: Types.ObjectId, ref: 'Account', required: true },
    amount: { type: Number },
    trxReference: { type: String },
    trxDate: { type: Date },
  },
  { timestamps: true },
);

const notificationSchema = new Schema({
  title: { type: String, required: true },
  details: { type: String, required: true },
  receivers: [{ user: { type: Types.ObjectId, ref: 'Account' }, read: Boolean }],
});

const TransactionHistory = model<ITransactionHistory>('TransactionHistory', trxSchema);
const Notification = model<INotification>('Notification', notificationSchema);

export { Notification, TransactionHistory };
