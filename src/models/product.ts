import { Document, model, Schema, Types } from 'mongoose';

export interface IProduct {
  name: string;
  description: string;
  patner: string;
  totalValue: number;
  pricePerSlot: number;
  noOfSlots: number;
  quantity: number;
  category: string;
  emoji: string;
  orders: number;
  revenue: number;
  status: 'Active' | 'Inactive';
  createdBy: Types.ObjectId;
}

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    patner: { type: String },
    totalValue: { type: Number, required: true },
    pricePerSlot: { type: Number, required: true },
    noOfSlots: { type: Number, required: true },
    quantity: { type: Number, required: true },
    category: { type: String, required: true },
    emoji: { type: String },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Inactive'], default: 'Inactive' },
    createdBy: { type: Types.ObjectId, ref: 'Admin', required: true },
  },
  { timestamps: true },
);

const Product = model<IProduct>('Product', productSchema);

export { Product };
