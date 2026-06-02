import { Document, model, Schema, Types } from 'mongoose';

export interface IAISettings extends Document {
  radarEnabled: boolean;
  fraudEnabled: boolean;
  retentionEnabled: boolean;
  dailyBudgetUsd: number;
  pausedForBudget: boolean;
  minRadarScore: number;
  updatedBy?: Types.ObjectId;
  updatedAt: Date;
}

const aiSettingsSchema = new Schema(
  {
    radarEnabled: { type: Boolean, default: true },
    fraudEnabled: { type: Boolean, default: true },
    retentionEnabled: { type: Boolean, default: false },
    dailyBudgetUsd: { type: Number, default: 10 },
    pausedForBudget: { type: Boolean, default: false },
    minRadarScore: { type: Number, default: 60 },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'Admin' },
  },
  { timestamps: true },
);

export const AISettings = model<IAISettings>('AISettings', aiSettingsSchema);
