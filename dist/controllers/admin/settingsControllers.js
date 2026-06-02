"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unfreezeEscrow = exports.freezeEscrow = exports.enableSignups = exports.disableSignups = exports.resumePlatform = exports.pausePlatform = exports.getFeeHistory = exports.updateKycSettings = exports.getKycSettings = exports.updatePaymentSettings = exports.getPaymentSettings = exports.updatePlatformConfig = exports.getPlatformConfig = exports.toggleFeatureFlag = exports.getFeatureFlags = exports.initializeSettings = void 0;
const responseService_1 = require("../../utils/responseService");
const joi_1 = __importDefault(require("joi"));
const validationSchema_1 = __importDefault(require("../../utils/validationSchema"));
const platformSettings_1 = require("../../models/platformSettings");
// Initialize default settings if none exist
const initializeSettings = async () => {
    const existing = await platformSettings_1.PlatformSettings.findOne();
    if (!existing) {
        await platformSettings_1.PlatformSettings.create({});
        console.log('[Settings] Default platform settings initialized');
    }
};
exports.initializeSettings = initializeSettings;
// Get all feature flags
const getFeatureFlags = async (req, res) => {
    try {
        let settings = await platformSettings_1.PlatformSettings.findOne();
        if (!settings) {
            settings = await platformSettings_1.PlatformSettings.create({});
        }
        const flags = {
            hosteLeaderboard: settings.hosteLeaderboard,
            banterBoard: settings.banterBoard,
            referralProgram: settings.referralProgram,
            paidPlanPackages: settings.paidPlanPackages,
            foodPackages: settings.foodPackages,
            walletFunding: settings.walletFunding,
            transportation: settings.transportation,
        };
        return (0, responseService_1.resSender)(res, 200, 'success', 'Feature flags fetched', null, flags);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching feature flags');
    }
};
exports.getFeatureFlags = getFeatureFlags;
// Toggle a specific feature flag
const toggleFeatureFlag = async (req, res) => {
    try {
        const { flag_key } = req.params;
        const { enabled } = req.body;
        const adminEmail = req.user?.email || 'admin';
        const { error } = joi_1.default.object({
            enabled: validationSchema_1.default.boolean.required(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const validFlags = [
            'hosteLeaderboard',
            'banterBoard',
            'referralProgram',
            'paidPlanPackages',
            'foodPackages',
            'walletFunding',
            'transportation',
        ];
        if (!validFlags.includes(flag_key)) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Invalid feature flag key');
        }
        const settings = await platformSettings_1.PlatformSettings.findOneAndUpdate({}, { [flag_key]: enabled, updatedAt: new Date() }, { returnDocument: 'after', upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Feature flag updated', null, {
            flag_key,
            enabled: settings[flag_key],
            updated_at: settings.updatedAt,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error toggling feature flag');
    }
};
exports.toggleFeatureFlag = toggleFeatureFlag;
// Get platform configuration
const getPlatformConfig = async (req, res) => {
    try {
        let settings = await platformSettings_1.PlatformSettings.findOne();
        if (!settings) {
            settings = await platformSettings_1.PlatformSettings.create({});
        }
        const config = {
            processingFeePerSlot: settings.processingFeePerSlot,
            insuranceRatePct: settings.insuranceRatePct,
            defaultTransportFee: settings.defaultTransportFee,
            maxSlashDurationHours: settings.maxSlashDurationHours,
            cancellationPenaltyPct: settings.cancellationPenaltyPct,
            minSlotsPerSlash: settings.minSlotsPerSlash,
            minTopupAmount: settings.minTopupAmount,
        };
        return (0, responseService_1.resSender)(res, 200, 'success', 'Platform config fetched', null, config);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching platform config');
    }
};
exports.getPlatformConfig = getPlatformConfig;
// Update platform configuration
const updatePlatformConfig = async (req, res) => {
    try {
        const updates = req.body;
        const adminEmail = req.user?.email || 'admin';
        const configSchema = joi_1.default.object({
            processingFeePerSlot: validationSchema_1.default.number.min(0).optional(),
            insuranceRatePct: validationSchema_1.default.number.min(0).max(100).optional(),
            defaultTransportFee: validationSchema_1.default.number.min(0).optional(),
            maxSlashDurationHours: validationSchema_1.default.number.min(1).max(168).optional(),
            cancellationPenaltyPct: validationSchema_1.default.number.min(0).max(100).optional(),
            minSlotsPerSlash: validationSchema_1.default.number.min(1).optional(),
            minTopupAmount: validationSchema_1.default.number.min(0).optional(),
        });
        const { error } = configSchema.validate(updates);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const current = await platformSettings_1.PlatformSettings.findOne();
        if (!current) {
            await platformSettings_1.PlatformSettings.create({});
        }
        // Log fee changes to history
        const feeFields = ['processingFeePerSlot', 'defaultTransportFee', 'insuranceRatePct'];
        for (const field of feeFields) {
            if (updates[field] !== undefined &&
                current &&
                current[field] !== updates[field]) {
                await platformSettings_1.FeeHistory.create({
                    fee_type: field,
                    label: field.replace(/_/g, ' '),
                    old_value: current[field],
                    new_value: updates[field],
                    changed_by: adminEmail,
                    changed_at: new Date(),
                });
            }
        }
        const settings = await platformSettings_1.PlatformSettings.findOneAndUpdate({}, { ...updates, updatedAt: new Date() }, { returnDocument: 'after', upsert: true });
        const config = {
            processingFeePerSlot: settings.processingFeePerSlot,
            insuranceRatePct: settings.insuranceRatePct,
            defaultTransportFee: settings.defaultTransportFee,
            maxSlashDurationHours: settings.maxSlashDurationHours,
            cancellationPenaltyPct: settings.cancellationPenaltyPct,
            minSlotsPerSlash: settings.minSlotsPerSlash,
            minTopupAmount: settings.minTopupAmount,
        };
        return (0, responseService_1.resSender)(res, 200, 'success', 'Platform config updated', null, config);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error updating platform config');
    }
};
exports.updatePlatformConfig = updatePlatformConfig;
// Get payment settings
const getPaymentSettings = async (req, res) => {
    try {
        let settings = await platformSettings_1.PlatformSettings.findOne();
        if (!settings) {
            settings = await platformSettings_1.PlatformSettings.create({});
        }
        const paymentSettings = {
            paymentProvider: settings.paymentProvider,
            payoutProvider: settings.payoutProvider,
            escrowReleaseTrigger: settings.escrowReleaseTrigger,
        };
        return (0, responseService_1.resSender)(res, 200, 'success', 'Payment settings fetched', null, paymentSettings);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching payment settings');
    }
};
exports.getPaymentSettings = getPaymentSettings;
// Update payment settings
const updatePaymentSettings = async (req, res) => {
    try {
        const { paymentProvider, payoutProvider, escrowReleaseTrigger } = req.body;
        const { error } = joi_1.default.object({
            paymentProvider: validationSchema_1.default.strings.optional(),
            payoutProvider: validationSchema_1.default.strings.optional(),
            escrowReleaseTrigger: validationSchema_1.default.strings
                .valid('Attendant Verification', 'Auto')
                .optional(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const updates = {};
        if (paymentProvider !== undefined)
            updates.paymentProvider = paymentProvider;
        if (payoutProvider !== undefined)
            updates.payoutProvider = payoutProvider;
        if (escrowReleaseTrigger !== undefined)
            updates.escrowReleaseTrigger = escrowReleaseTrigger;
        updates.updatedAt = new Date();
        const settings = await platformSettings_1.PlatformSettings.findOneAndUpdate({}, updates, {
            returnDocument: 'after',
            upsert: true,
        });
        const paymentSettings = {
            paymentProvider: settings.paymentProvider,
            payoutProvider: settings.payoutProvider,
            escrowReleaseTrigger: settings.escrowReleaseTrigger,
        };
        return (0, responseService_1.resSender)(res, 200, 'success', 'Payment settings updated', null, paymentSettings);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error updating payment settings');
    }
};
exports.updatePaymentSettings = updatePaymentSettings;
// Get KYC settings
const getKycSettings = async (req, res) => {
    try {
        let settings = await platformSettings_1.PlatformSettings.findOne();
        if (!settings) {
            settings = await platformSettings_1.PlatformSettings.create({});
        }
        const kycSettings = {
            kycRequiredToJoin: settings.kycRequiredToJoin,
            kycProvider: settings.kycProvider,
            ninVerification: settings.ninVerification,
        };
        return (0, responseService_1.resSender)(res, 200, 'success', 'KYC settings fetched', null, kycSettings);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching KYC settings');
    }
};
exports.getKycSettings = getKycSettings;
// Update KYC settings
const updateKycSettings = async (req, res) => {
    try {
        const { kycRequiredToJoin, kycProvider, ninVerification } = req.body;
        const { error } = joi_1.default.object({
            kycRequiredToJoin: validationSchema_1.default.boolean.optional(),
            kycProvider: validationSchema_1.default.strings.optional(),
            ninVerification: validationSchema_1.default.strings.valid('Enabled', 'Disabled').optional(),
        }).validate(req.body);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        const updates = {};
        if (kycRequiredToJoin !== undefined)
            updates.kycRequiredToJoin = kycRequiredToJoin;
        if (kycProvider !== undefined)
            updates.kycProvider = kycProvider;
        if (ninVerification !== undefined)
            updates.ninVerification = ninVerification;
        updates.updatedAt = new Date();
        const settings = await platformSettings_1.PlatformSettings.findOneAndUpdate({}, updates, {
            returnDocument: 'after',
            upsert: true,
        });
        const kycSettings = {
            kycRequiredToJoin: settings.kycRequiredToJoin,
            kycProvider: settings.kycProvider,
            ninVerification: settings.ninVerification,
        };
        return (0, responseService_1.resSender)(res, 200, 'success', 'KYC settings updated', null, kycSettings);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error updating KYC settings');
    }
};
exports.updateKycSettings = updateKycSettings;
// Get fee change history
const getFeeHistory = async (req, res) => {
    try {
        let { type, page = 1, limit = 20 } = req.query;
        const { error } = joi_1.default.object({
            type: validationSchema_1.default.strings.optional(),
            page: validationSchema_1.default.number,
            limit: validationSchema_1.default.number,
        }).validate(req.query);
        if (error)
            return (0, responseService_1.resSender)(res, 400, 'fail', error.details[0].message);
        page = Number(page) || 1;
        limit = Number(limit) || 20;
        const query = {};
        if (type) {
            query.fee_type = type;
        }
        const total = await platformSettings_1.FeeHistory.countDocuments(query);
        const records = await platformSettings_1.FeeHistory.find(query)
            .sort({ changed_at: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
        return (0, responseService_1.resSender)(res, 200, 'success', 'Fee history fetched', null, {
            total,
            page,
            totalPages: Math.ceil(total / limit),
            records,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching fee history');
    }
};
exports.getFeeHistory = getFeeHistory;
// Danger Zone Actions
const pausePlatform = async (req, res) => {
    try {
        const settings = await platformSettings_1.PlatformSettings.findOneAndUpdate({}, {
            platformPaused: true,
            pausedAt: new Date(),
            updatedAt: new Date(),
        }, { returnDocument: 'after', upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Platform paused', null, {
            status: 'paused',
            pausedAt: settings.pausedAt,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error pausing platform');
    }
};
exports.pausePlatform = pausePlatform;
const resumePlatform = async (req, res) => {
    try {
        const settings = await platformSettings_1.PlatformSettings.findOneAndUpdate({}, {
            platformPaused: false,
            pausedAt: null,
            updatedAt: new Date(),
        }, { returnDocument: 'after', upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Platform resumed', null, {
            status: 'active',
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error resuming platform');
    }
};
exports.resumePlatform = resumePlatform;
const disableSignups = async (req, res) => {
    try {
        const settings = await platformSettings_1.PlatformSettings.findOneAndUpdate({}, { signupsEnabled: false, updatedAt: new Date() }, { returnDocument: 'after', upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Signups disabled', null, {
            signupsEnabled: false,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error disabling signups');
    }
};
exports.disableSignups = disableSignups;
const enableSignups = async (req, res) => {
    try {
        const settings = await platformSettings_1.PlatformSettings.findOneAndUpdate({}, { signupsEnabled: true, updatedAt: new Date() }, { returnDocument: 'after', upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Signups enabled', null, {
            signupsEnabled: true,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error enabling signups');
    }
};
exports.enableSignups = enableSignups;
const freezeEscrow = async (req, res) => {
    try {
        const settings = await platformSettings_1.PlatformSettings.findOneAndUpdate({}, {
            escrowFrozen: true,
            frozenAt: new Date(),
            updatedAt: new Date(),
        }, { returnDocument: 'after', upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Escrow frozen', null, {
            escrowFrozen: true,
            frozenAt: settings.frozenAt,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error freezing escrow');
    }
};
exports.freezeEscrow = freezeEscrow;
const unfreezeEscrow = async (req, res) => {
    try {
        const settings = await platformSettings_1.PlatformSettings.findOneAndUpdate({}, {
            escrowFrozen: false,
            frozenAt: null,
            updatedAt: new Date(),
        }, { returnDocument: 'after', upsert: true });
        return (0, responseService_1.resSender)(res, 200, 'success', 'Escrow unfrozen', null, {
            escrowFrozen: false,
        });
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error unfreezing escrow');
    }
};
exports.unfreezeEscrow = unfreezeEscrow;
