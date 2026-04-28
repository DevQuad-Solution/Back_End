import { Document, model, Schema, Types } from 'mongoose';

export enum SlashStatus {
  FULL = 'full',
  OPEN = 'open',
  PURCHASING = 'purchasing',
  PICKUP = 'pickup',
  COMPLETED = 'completed',
  DISSOLVED = 'dissolved',
}

export interface ISlash {
  product: Types.ObjectId;
  hub: Types.ObjectId;
  timeLimit: string;
  status: SlashStatus;
  joined: { user: Types.ObjectId; qrCode: string; claimCode: string; claimed: boolean }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQr {
  id: string;
  data: string;
  timestamp: number;
  hash: string;
}

const slashSchema = new Schema(
  {
    product: { type: Types.ObjectId, ref: 'Product', required: true },
    hub: { type: Types.ObjectId, ref: 'Hub', required: true },
    timeLimit: { type: String, required: true },
    status: { type: String, enum: Object.values(SlashStatus) },
    joined: [
      {
        user: { type: Types.ObjectId, ref: 'Account', required: true },
        qrCode: String,
        claimCode: String,
        claimed: { type: Boolean, default: false },
      },
    ],
    createdBy: { type: Types.ObjectId, ref: 'Account', required: true },
  },
  { timestamps: true },
);

const qrSchema = new Schema({
  id: String,
  data: String,
  timestamp: Number,
  hash: String,
});

const Slash = model<ISlash>('Slash', slashSchema);
const Qr = model<IQr>('Qr', qrSchema);

export { Qr, Slash };
