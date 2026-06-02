"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FraudAssessment = void 0;
const mongoose_1 = require("mongoose");
const fraudAssessmentSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Account', required: true },
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
    adminId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Admin' },
    resolvedAt: { type: Date },
}, { timestamps: true });
fraudAssessmentSchema.index({ userId: 1 });
fraudAssessmentSchema.index({ riskLevel: 1 });
fraudAssessmentSchema.index({ adminAction: 1 });
fraudAssessmentSchema.index({ createdAt: -1 });
exports.FraudAssessment = (0, mongoose_1.model)('FraudAssessment', fraudAssessmentSchema);
