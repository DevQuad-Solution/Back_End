"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AILog = void 0;
const mongoose_1 = require("mongoose");
const aiLogSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
aiLogSchema.index({ createdAt: -1 });
aiLogSchema.index({ feature: 1 });
aiLogSchema.index({ userId: 1 });
exports.AILog = (0, mongoose_1.model)('AILog', aiLogSchema);
