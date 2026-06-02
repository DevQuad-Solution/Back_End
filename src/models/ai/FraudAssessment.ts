import { Document, model, Schema, Types } from 'mongoose';

export interface IFraudAssessment extends Document {
  userId: Types.ObjectId;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  flags: string[];
  recommendation: 'allow' | 'monitor' | 'hold' | 'block';
  reasoning?: string;
  trigger: 'wallet_topup' | 'slash_join' | 'kyc_submit' | 'manual';
  layer: 1 | 2;
  adminAction?: 'cleared' | 'watching' | 'blocked';
  adminId?: Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
}

const fraudAssessmentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'Account', required: true },
    riskScore: { type: Number, required: true, min: 0, max: 100 },
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    flags: [{ type: String, required: true }],
    recommendation: { type: String, enum: ['allow', 'monitor', 'hold', 'block'], required: true },
    reasoning: { type: String },
    trigger: {
      type: String,
      enum: ['wallet_topup', 'slash_join', 'kyc_submit', 'manual'],
      required: true,
    },
    layer: { type: Number, enum: [1, 2], required: true, default: 1 },
    adminAction: { type: String, enum: ['cleared', 'watching', 'blocked'] },
    adminId: { type: Schema.Types.ObjectId, ref: 'Admin' },
    resolvedAt: { type: Date },
  },
  { timestamps: true },
);

fraudAssessmentSchema.index({ userId: 1 });
fraudAssessmentSchema.index({ riskLevel: 1 });
fraudAssessmentSchema.index({ adminAction: 1 });
fraudAssessmentSchema.index({ createdAt: -1 });

export const FraudAssessment = model<IFraudAssessment>('FraudAssessment', fraudAssessmentSchema);
