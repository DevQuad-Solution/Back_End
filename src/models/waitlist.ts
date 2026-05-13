import { Document, model, Schema } from 'mongoose';

export interface IWaitlist extends Document {
  email: string;
  name: string;
  phone: string;
  campus: string;
}

const waitlistSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String, required: true },
    campus: { type: String, required: true },
  },
  { timestamps: true },
);

const Waitlist = model<IWaitlist>('Waitlist', waitlistSchema);

export { Waitlist };
