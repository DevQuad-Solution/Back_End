import { Document, model, Schema, Types } from 'mongoose';

export interface IAccount extends Document {
  // _id: Types.ObjectId;
  name: string;
  email: string;
  emailVerified: boolean;
  password: string;
  phone: string;
  role: 'user';
  hub?: Types.ObjectId;
  kyc: { nin: string; status: KycStatus };
  status: UserStatus;
  joined: number;
  totalSPend: number;
  walletBalance: number;
  userAccountDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    accountRef: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface IAdmin extends Document {
  name: string;
  email: string;
  emailVerified: boolean;
  password: string;
  phone: string;
  role: 'super admin' | 'admin';
}

export enum KycStatus {
  VERIFIED = 'Verified',
  UNVERIFIED = 'Unverified',
  PENDING = 'Pending',
  REJECTED = 'Rejected',
}

export enum UserStatus {
  ACTIVE = 'Active',
  SUSPENDED = 'Suspended',
}

export enum AppRole {
  USER = 'user',
  ATTENDANT = 'attendant',
  ADMIN = 'admin',
}

const userAccountSchema = new Schema(
  {
    name: String,
    email: { type: String, required: false },
    emailVerified: { type: Boolean, default: false },
    password: String,
    phone: String,
    role: { type: String, enum: Object.values(AppRole), default: 'user' },
    hub: { type: Types.ObjectId, ref: 'Hub' },
    kyc: {
      nin: String,
      status: { type: String, enum: Object.values(KycStatus), default: KycStatus.UNVERIFIED },
    },
    status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
    joined: { type: Number, default: 0 },
    totalSPend: { type: Number, default: 0 },
    walletBalance: { type: Number, default: 0 },
    userAccountDetails: {
      bankName: String,
      accountName: String,
      accountNumber: String,
      accountRef: String,
    },
  },
  { timestamps: true },
);
userAccountSchema.index({ email: 1 });

const adminSchema = new Schema({
  name: String,
  email: { type: String, required: false },
  emailVerified: { type: Boolean, default: false },
  password: String,
  phone: String,
  role: { type: String, enum: ['admin', 'super admin'], default: 'admin' },
});

const Account = model<IAccount>('Account', userAccountSchema);
const Admin = model<IAdmin>('Admin', adminSchema);

export { Account, Admin };
