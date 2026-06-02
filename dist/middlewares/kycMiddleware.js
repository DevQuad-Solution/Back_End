"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireKyc = void 0;
const responseService_1 = require("../utils/responseService");
const account_1 = require("../models/account");
const platformSettings_1 = require("../models/platformSettings");
const requireKyc = async (req, res, next) => {
    try {
        const userId = req.user?._id;
        if (!userId) {
            return (0, responseService_1.resSender)(res, 401, 'fail', 'User not authenticated');
        }
        // Check if KYC is required by platform settings
        const settings = await platformSettings_1.PlatformSettings.findOne();
        if (!settings?.kycRequiredToJoin) {
            // KYC not required, proceed
            return next();
        }
        const user = await account_1.Account.findById(userId);
        if (!user) {
            return (0, responseService_1.resSender)(res, 404, 'fail', 'User not found');
        }
        if (user.kyc?.status !== account_1.KycStatus.VERIFIED) {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'KYC verification required to perform this action');
        }
        next();
    }
    catch (error) {
        console.error('KYC middleware error:', error);
        return (0, responseService_1.resSender)(res, 500, 'error', error.message || 'Failed to verify KYC status');
    }
};
exports.requireKyc = requireKyc;
