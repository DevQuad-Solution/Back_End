import { model, Schema, Types } from 'mongoose';

export interface IDispute {
  productName: string;
  description: string;
  filedBy: Types.ObjectId;
  slash: Types.ObjectId;
  hub: Types.ObjectId;
  estimatedLoss: number;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Under Review' | 'Resolved - Refunded';
  createdAt: Date;
  updatedAt: Date;
}

const disputeSchema = new Schema(
  {
    productName: { type: String, required: true },
    description: { type: String, required: true },
    filedBy: { type: Types.ObjectId, ref: 'Attendant', required: true },
    slash: { type: Types.ObjectId, ref: 'Slash', required: true },
    hub: { type: Types.ObjectId, ref: 'Hub', required: true },
    estimatedLoss: { type: Number, required: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Low' },
    status: {
      type: String,
      enum: ['Open', 'Under Review', 'Resolved - Refunded'],
      default: 'Open',
    },
  },
  { timestamps: true },
);

const Dispute = model<IDispute>('Dispute', disputeSchema);

export { Dispute };
