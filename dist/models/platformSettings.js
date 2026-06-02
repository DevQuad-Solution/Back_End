"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FeeHistory = exports.PlatformSettings = void 0;
const mongoose_1 = require("mongoose");
const platformSettingsSchema = new mongoose_1.Schema({
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
}, { timestamps: true });
const feeHistorySchema = new mongoose_1.Schema({
    fee_type: { type: String, required: true },
    label: { type: String, required: true },
    old_value: { type: Number, required: true },
    new_value: { type: Number, required: true },
    changed_by: { type: String, required: true },
    changed_at: { type: Date, default: Date.now },
});
feeHistorySchema.index({ changed_at: -1 });
feeHistorySchema.index({ fee_type: 1 });
exports.PlatformSettings = (0, mongoose_1.model)('PlatformSettings', platformSettingsSchema);
exports.FeeHistory = (0, mongoose_1.model)('FeeHistory', feeHistorySchema);
