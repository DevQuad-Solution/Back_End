import { Document, model, Schema } from 'mongoose';

export interface IAILog extends Document {
  feature: 'radar' | 'fraud' | 'retention' | 'insights';
  aiModel: 'gpt-4o' | 'gpt-4o-mini' | 'text-embedding-3-small';
  inputTokens: number;
  outputTokens: number;
  estimatedCost: number;
  latencyMs: number;
  userId: string;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

const aiLogSchema = new Schema(
  {
    feature: { type: String, enum: ['radar', 'fraud', 'retention', 'insights'], required: true },
    aiModel: {
      type: String,
      enum: ['gpt-4o', 'gpt-4o-mini', 'text-embedding-3-small'],
      required: true,
    },
    inputTokens: { type: Number, required: true },
    outputTokens: { type: Number, default: 0 },
    estimatedCost: { type: Number, required: true },
    latencyMs: { type: Number, required: true },
    userId: { type: String, required: true },
    success: { type: Boolean, required: true },
    errorMessage: { type: String },
  },
  { timestamps: true },
);

aiLogSchema.index({ createdAt: -1 });
aiLogSchema.index({ feature: 1 });
aiLogSchema.index({ userId: 1 });

export const AILog = model<IAILog>('AILog', aiLogSchema);
