"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.comparePhotos = exports.verifyNINForUser = exports.verifyNIN = exports.getNINApiBalance = void 0;
const axios_1 = __importDefault(require("axios"));
const account_1 = require("../models/account");
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
    const user = await account_1.Account.findOneAndUpdate({ _id: userId, walletBalance: { $gte: NIN_VERIFICATION_COST } }, { $inc: { walletBalance: -NIN_VERIFICATION_COST } }, { returnDocument: 'after' });
    if (!user) {
        throw new Error('Insufficient wallet balance for NIN verification');
    }
    const verificationResponse = await (0, exports.verifyNIN)({ nin, consent });
    if (verificationResponse.status !== 'success') {
        throw new Error(verificationResponse.message || 'NIN verification failed');
    }
    const apiData = verificationResponse.data;
    const normalizedGivenName = normalizeName(name);
    const normalizedApiName = normalizeName([apiData.firstname, apiData.middlename, apiData.surname].filter(Boolean).join(' '));
    const normalizedGivenPhone = normalizePhoneNumber(phone);
    const normalizedApiPhone = normalizePhoneNumber(apiData.telephoneno);
    const normalizedGivenImage = normalizeBase64Image(capturedImageBase64);
    const normalizedApiImage = normalizeBase64Image(apiData.photo);
    return {
        verified: true,
        chargedAmount: NIN_VERIFICATION_COST,
        walletBalance: user.walletBalance,
        apiResponse: verificationResponse,
        matches: {
            name: normalizedGivenName === normalizedApiName,
            phone: normalizedGivenPhone === normalizedApiPhone,
            photo: normalizedGivenImage !== '' &&
                normalizedApiImage !== '' &&
                normalizedGivenImage === normalizedApiImage,
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
