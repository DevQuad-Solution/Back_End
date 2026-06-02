import { Document, model, Schema } from 'mongoose';

export interface IPlatformSettings extends Document {
  // Feature Flags
  hosteLeaderboard: boolean;
  banterBoard: boolean;
  referralProgram: boolean;
  paidPlanPackages: boolean;
  foodPackages: boolean;
  walletFunding: boolean;
  transportation: boolean;

  // Platform Config
  processingFeePerSlot: number;
  insuranceRatePct: number;
  defaultTransportFee: number;
  maxSlashDurationHours: number;
  cancellationPenaltyPct: number;
  minSlotsPerSlash: number;
  minTopupAmount: number;

  // Payment Settings
  paymentProvider: string;
  payoutProvider: string;
  escrowReleaseTrigger: 'Attendant Verification' | 'Auto';

  // KYC Settings
  kycRequiredToJoin: boolean;
  kycProvider: string;
  ninVerification: 'Enabled' | 'Disabled';

  // Platform State
  platformPaused: boolean;
  signupsEnabled: boolean;
  escrowFrozen: boolean;
  pausedAt?: Date;
  frozenAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface IFeeHistory extends Document {
  fee_type: string;
  label: string;
  old_value: number;
  new_value: number;
  changed_by: string;
  changed_at: Date;
}

const platformSettingsSchema = new Schema(
  {
    // Feature Flags
    hosteLeaderboard: { type: Boolean, default: true },
    banterBoard: { type: Boolean, default: true },
    referralProgram: { type: Boolean, default: true },
    paidPlanPackages: { type: Boolean, default: true },
    foodPackages: { type: Boolean, default: true },
    walletFunding: { type: Boolean, default: true },
    transportation: { type: Boolean, default: false },

    // Platform Config
    processingFeePerSlot: { type: Number, default: 100 },
    insuranceRatePct: { type: Number, default: 1 },
    defaultTransportFee: { type: Number, default: 500 },
    maxSlashDurationHours: { type: Number, default: 72 },
    cancellationPenaltyPct: { type: Number, default: 7 },
    minSlotsPerSlash: { type: Number, default: 2 },
    minTopupAmount: { type: Number, default: 100 },

    // Payment Settings
    paymentProvider: { type: String, default: 'Monnify' },
    payoutProvider: { type: String, default: 'Paystack' },
    escrowReleaseTrigger: {
      type: String,
      enum: ['Attendant Verification', 'Auto'],
      default: 'Attendant Verification',
    },

    // KYC Settings
    kycRequiredToJoin: { type: Boolean, default: false },
    kycProvider: { type: String, default: 'SmileID / Dojah' },
    ninVerification: { type: String, enum: ['Enabled', 'Disabled'], default: 'Enabled' },

    // Platform State
    platformPaused: { type: Boolean, default: false },
    signupsEnabled: { type: Boolean, default: true },
    escrowFrozen: { type: Boolean, default: false },
    pausedAt: { type: Date },
    frozenAt: { type: Date },
  },
  { timestamps: true },
);

const feeHistorySchema = new Schema({
  fee_type: { type: String, required: true },
  label: { type: String, required: true },
  old_value: { type: Number, required: true },
  new_value: { type: Number, required: true },
  changed_by: { type: String, required: true },
  changed_at: { type: Date, default: Date.now },
});

feeHistorySchema.index({ changed_at: -1 });
feeHistorySchema.index({ fee_type: 1 });

export const PlatformSettings = model<IPlatformSettings>(
  'PlatformSettings',
  platformSettingsSchema,
);
export const FeeHistory = model<IFeeHistory>('FeeHistory', feeHistorySchema);
