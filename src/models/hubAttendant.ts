import { Document, model, Schema, Types } from 'mongoose';

export enum HubStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}
export interface IHub {
  name: string;
  city: string;
  state: string;
  address: string;
  status: HubStatus;
  attendant: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendant {
  name: string;
  phone: string;
  email: string;
  hub: Types.ObjectId;
  pin: string;
  status: HubStatus;
  ratings: {
    rating: number;
    numberofRatings: number;
  };
  joinedAt: Date;
  deliveries: number;
  createdAt: Date;
  updateAt: Date;
}

const hubSchema = new Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    address: { type: String, required: true },
    status: { type: String, enum: Object.values(HubStatus), required: true },
    attendant: { type: Types.ObjectId, ref: 'Attendant' },
  },
  { timestamps: true },
);
hubSchema.index({ name: 1 }, { unique: true });

const attendantSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    pin: { type: String, required: true },
    hub: { type: Types.ObjectId, ref: 'Hub', required: true },
    status: { type: String, enum: Object.values(HubStatus) },
    ratings: {
      rating: Number,
      numberofRatings: Number,
    },
    joinedAt: Date,
    deliveries: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const Hub = model<IHub>('Hub', hubSchema);
const Attendant = model<IAttendant>('Attendant', attendantSchema);

export { Attendant, Hub };
