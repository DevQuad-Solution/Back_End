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
  joined: { user: Types.ObjectId; qrCode: string; claimed: boolean }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
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
        claimed: { type: Boolean, default: false },
      },
    ],
    createdBy: { type: Types.ObjectId, ref: 'Account', required: true },
  },
  { timestamps: true },
);

const Slash = model<ISlash>('Slash', slashSchema);

export { Slash };
