import { Document, model, Schema } from 'mongoose';

export interface IProduct {
  name: string;
  totalValue: number;
  pricePerSlot: number;
  noOfSlots: number;
  quantity: number;
  category: string;
  image: string;
}

const productSchema = new Schema(
  {
    name: { type: String, required: true },
    totalValue: { type: Number, required: true },
    pricePerSlot: { type: Number, required: true },
    noOfSlots: { type: Number, required: true },
    quantity: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String, required: true },
  },
  { timestamps: true },
);

const Product = model<IProduct>('Product', productSchema);

export { Product };
