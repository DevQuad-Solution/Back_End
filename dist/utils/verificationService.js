"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePhotos = exports.verifyNINForUser = exports.verifyNIN = exports.getNINApiBalance = void 0;
const axios_1 = __importDefault(require("axios"));
const account_1 = require("../models/account");
const platformSettings_1 = require("../models/platformSettings");
const encryption_1 = require("./encryption");
const nameMatch_1 = require("./nameMatch");
const NIN_API_BASE_URL = process.env.NIN_API_BASE_URL || 'https://checkmyninbvn.com.ng/api';
const NIN_API_KEY = process.env.NIN_VER_API_KEY;
const NIN_VERIFICATION_COST = Number(process.env.NIN_VERIFICATION_COST ?? 200);
if (!NIN_API_KEY) {
    throw new Error('NIN_API_KEY is required in environment variables');
}
const ninClient = axios_1.default.create({
    baseURL: NIN_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': NIN_API_KEY,
    },
});
const normalizeBase64Image = (input) => {
    if (!input)
        return '';
    if (Buffer.isBuffer(input)) {
        return input.toString('base64');
    }
    return input
        .replace(/^data:image\/[a-zA-Z]+;base64,/, '')
        .replace(/\s+/g, '')
        .trim();
};
const normalizePhoneNumber = (phone) => {
    return phone.replace(/[^0-9]/g, '').replace(/^0/, '');
};
const normalizeName = (name) => {
    return name.toLowerCase().replace(/\s+/g, ' ').trim();
};
const getNINApiBalance = async () => {
    const response = await ninClient.get('/balance');
    return response.data;
};
exports.getNINApiBalance = getNINApiBalance;
const verifyNIN = async (payload) => {
    const response = await ninClient.post('/nin-verification', payload);
    return response.data;
};
exports.verifyNIN = verifyNIN;
const verifyNINForUser = async (userId, nin, name, phone, capturedImageBase64, consent = true) => {
    // Check if NIN verification is enabled
    const settings = await platformSettings_1.PlatformSettings.findOne();
    if (settings?.ninVerification === 'Disabled') {
        throw new Error('NIN verification is currently disabled by admin');
    }
    // Check if user is already verified
    const existingUser = await account_1.Account.findById(userId);
    if (existingUser?.kyc?.status === account_1.KycStatus.VERIFIED) {
        throw new Error('User is already KYC verified');
    }
    const duplicateNinUsers = await account_1.Account.find({
        _id: { $ne: userId },
        'kyc.nin': { $exists: true, $ne: null },
    }).select('_id kyc.nin');
    const ninAlreadyRegistered = duplicateNinUsers.some((account) => (0, encryption_1.isEncryptedTextMatch)(nin, account.kyc?.nin));
    if (ninAlreadyRegistered) {
        throw new Error('This NIN is already registered with another account');
    }
    // Deduct verification cost
    const user = await account_1.Account.findOneAndUpdate({ _id: userId, walletBalance: { $gte: NIN_VERIFICATION_COST } }, { $inc: { walletBalance: -NIN_VERIFICATION_COST } }, { returnDocument: 'after' });
    if (!user) {
        throw new Error('Insufficient wallet balance for NIN verification');
    }
    // Call NIN verification API
    let verificationResponse;
    try {
        verificationResponse = await (0, exports.verifyNIN)({ nin, consent });
    }
    catch (error) {
        // Refund the user if API fails
        await account_1.Account.findByIdAndUpdate(userId, {
            $inc: { walletBalance: NIN_VERIFICATION_COST },
        });
        throw new Error(error.response?.data?.message || 'NIN verification service unavailable');
    }
    if (verificationResponse.status !== 'success') {
        // Refund the user if verification fails
        await account_1.Account.findByIdAndUpdate(userId, {
            $inc: { walletBalance: NIN_VERIFICATION_COST },
        });
        throw new Error(verificationResponse.message || 'NIN verification failed');
    }
    const apiData = verificationResponse.data;
    // Normalize names
    const normalizedGivenName = normalizeName(name);
    const normalizedApiName = normalizeName([apiData.firstname, apiData.middlename, apiData.surname].filter(Boolean).join(' '));
    // Use flexible name matching instead of exact match
    const nameMatch = (0, nameMatch_1.doNamesMatch)(normalizedGivenName, normalizedApiName, 0.6);
    // For phone, still use exact match (or can also make flexible)
    const normalizedGivenPhone = normalizePhoneNumber(phone);
    const normalizedApiPhone = normalizePhoneNumber(apiData.telephoneno);
    const phoneMatch = normalizedGivenPhone === normalizedApiPhone;
    // For photo (if applicable)
    const normalizedGivenImage = normalizeBase64Image(capturedImageBase64);
    const normalizedApiImage = normalizeBase64Image(apiData.photo);
    const photoMatch = normalizedGivenImage !== '' &&
        normalizedApiImage !== '' &&
        normalizedGivenImage === normalizedApiImage;
    // Determine verification success
    // Name match is primary, phone is secondary
    const isVerified = nameMatch; // Or you can require both: nameMatch && phoneMatch
    // Update user KYC status
    if (isVerified) {
        await account_1.Account.findByIdAndUpdate(userId, {
            $set: {
                'kyc.nin': (0, encryption_1.encrypt)(nin),
                'kyc.status': account_1.KycStatus.VERIFIED,
            },
        });
    }
    else {
        await account_1.Account.findByIdAndUpdate(userId, {
            $set: {
                'kyc.nin': (0, encryption_1.encrypt)(nin),
                'kyc.status': account_1.KycStatus.REJECTED,
            },
        });
    }
    return {
        verified: isVerified,
        chargedAmount: NIN_VERIFICATION_COST,
        walletBalance: user.walletBalance,
        apiResponse: verificationResponse,
        matches: {
            name: nameMatch,
            phone: phoneMatch,
            photo: photoMatch,
        },
        normalized: {
            givenName: normalizedGivenName,
            apiName: normalizedApiName,
            givenPhone: normalizedGivenPhone,
            apiPhone: normalizedApiPhone,
        },
    };
};
exports.verifyNINForUser = verifyNINForUser;
const comparePhotos = (capturedImageBase64, apiPhotoBase64) => {
    const normalizedGivenImage = normalizeBase64Image(capturedImageBase64);
    const normalizedApiImage = normalizeBase64Image(apiPhotoBase64);
    return normalizedGivenImage === normalizedApiImage;
};
exports.comparePhotos = comparePhotos;
