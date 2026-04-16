import { Document, model, Schema, Types } from 'mongoose';

export interface IAccount extends Document {
  // _id: Types.ObjectId;
  name: string;
  email: string;
  emailVerified: boolean;
  password: string;
  phone: string;
  role: 'user' | 'attendant' | 'admin';
  hub?: Types.ObjectId;
  kycStatus: KycStatus;
  status: UserStatus;
  walletBalance: number;
  userAccountDetails: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    accountRef: string;
  };
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

const userAccountSchema = new Schema({
  name: String,
  email: { type: String, required: false },
  emailVerified: { type: Boolean, default: false },
  password: String,
  phone: String,
  role: { type: String, enum: Object.values(AppRole), default: AppRole.USER },
  hub: { type: Types.ObjectId, ref: 'Hub' },
  kycStatus: { type: String, enum: Object.values(KycStatus), default: KycStatus.UNVERIFIED },
  status: { type: String, enum: Object.values(UserStatus), default: UserStatus.ACTIVE },
  walletBalance: { type: Number, default: 0 },
  userAccountDetails: {
    bankName: String,
    accountName: String,
    accountNumber: String,
    accountRef: String,
  },
});

userAccountSchema.index({ email: 1 });

const Account = model<IAccount>('Account', userAccountSchema);

export { Account };
