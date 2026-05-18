import { Document, model, Schema, Types } from 'mongoose';

export enum HubStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}
export interface IHub extends Document {
  name: string;
  city: string;
  state: string;
  address: string;
  transportCost: number;
  status: HubStatus;
  attendant?: Types.ObjectId;
  revenue: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAttendant extends Document {
  name: string;
  phone: string;
  email: string;
  emailVerified: boolean;
  hub?: Types.ObjectId;
  password: string;
  status: HubStatus;
  role: 'attendant';
  ratings: {
    rating: number;
    numberofRatings: number;
  };
  joinedAt: Date;
  deliveries: number;
  createdAt: Date;
  updateAt: Date;
}

export interface IHubRating extends Document {
  hub: Types.ObjectId;
  user: Types.ObjectId;
  slash?: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const hubSchema = new Schema(
  {
    name: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    address: { type: String, required: true },
    status: {
      type: String,
      enum: Object.values(HubStatus),
      default: HubStatus.INACTIVE,
    },
    transportCost: { type: Number, required: true },
    attendant: { type: Types.ObjectId, ref: 'Attendant' },
    revenue: { type: Number, default: 0 },
  },
  { timestamps: true },
);
hubSchema.index({ name: 1 }, { unique: true });

const attendantSchema = new Schema(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Boolean, default: false },
    password: { type: String, required: true },
    hub: { type: Types.ObjectId, ref: 'Hub' },
    status: { type: String, enum: Object.values(HubStatus), default: HubStatus.INACTIVE },
    role: { type: String, default: 'attendant' },
    ratings: {
      rating: { type: Number, default: 0 },
      numberofRatings: { type: Number, default: 0 },
    },
    joinedAt: Date,
    deliveries: { type: Number, default: 0 },
  },
  { timestamps: true },
);
// attendantSchema.index({})

const hubRatingSchema = new Schema(
  {
    hub: { type: Types.ObjectId, ref: 'Hub', required: true },
    user: { type: Types.ObjectId, ref: 'Account', required: true },
    slash: { type: Types.ObjectId, ref: 'Slash' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
  },
  { timestamps: true },
);

const HubRating = model<IHubRating>('HubRating', hubRatingSchema);

const Hub = model<IHub>('Hub', hubSchema);
const Attendant = model<IAttendant>('Attendant', attendantSchema);

export { Attendant, Hub, HubRating };
