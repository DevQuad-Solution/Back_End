"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monnifyService = exports.MonnifyService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const encryption_1 = require("./encryption");
const platformSettings_1 = require("../models/platformSettings");
const account_1 = require("../models/account");
const nameMatch_1 = require("./nameMatch");
const MONNIFY_API_BASE_URL = process.env.MONNIFY_API_BASE_URL || 'https://api.monnify.com/api';
const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY;
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY;
const MONNIFY_CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE;
if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY || !MONNIFY_CONTRACT_CODE) {
    throw new Error('Missing Monnify configuration');
}
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
class MonnifyService {
    constructor() {
        this.client = axios_1.default.create({
            baseURL: MONNIFY_API_BASE_URL,
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' },
        });
        this.NIN_VERIFICATION_COST = Number(process.env.NIN_VERIFICATION_COST ?? 100);
    }
    get basicAuthHeader() {
        return `Basic ${(0, encryption_1.toBase64)(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`)}`;
    }
    isRetryableError(error) {
        const axiosError = error;
        const retryableCodes = [
            'ETIMEDOUT',
            'ECONNRESET',
            'EAI_AGAIN',
            'ENOTFOUND',
            'ECONNREFUSED',
            'EHOSTUNREACH',
        ];
        const retryableStatus = [502, 503, 504];
        return ((axiosError.code !== undefined && retryableCodes.includes(axiosError.code)) ||
            (axiosError.response?.status !== undefined &&
                retryableStatus.includes(axiosError.response.status)));
    }
    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
    async retry(fn, attempts = 3, initialDelay = 500) {
        let lastError;
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (attempt === attempts || !this.isRetryableError(error)) {
                    throw error;
                }
                const backoff = initialDelay * Math.pow(2, attempt - 1);
                console.log(`Monnify retry attempt ${attempt} failed, retrying in ${backoff}ms...`, error);
                await this.delay(backoff);
            }
        }
        throw lastError;
    }
    async authenticate() {
        try {
            const response = await axios_1.default.post(`${MONNIFY_API_BASE_URL}/v1/auth/login`, {}, { headers: { Authorization: this.basicAuthHeader } });
            const auth = response.data.responseBody;
            this.authToken = auth.accessToken;
            this.tokenExpiry = Date.now() + auth.expiresIn * 1000 - 30000; // 30s buffer
            this.client.defaults.headers.Authorization = `Bearer ${this.authToken}`;
            console.log('Monnify Auth done');
        }
        catch (error) {
            console.log('Error logging to monnify: ');
            throw error;
        }
    }
    async ensureAuthenticated() {
        if (!this.authToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
            await this.retry(() => this.authenticate(), 3, 500);
        }
    }
    async createDedicatedAccount(options) {
        return this.retry(async () => {
            await this.ensureAuthenticated();
            const response = await this.client.post('/v2/bank-transfer/reserved-accounts', {
                accountReference: options.accountReference,
                accountName: options.accountName,
                currencyCode: options.currencyCode ?? 'NGN',
                contractCode: MONNIFY_CONTRACT_CODE,
                customerEmail: options.customerEmail,
                customerName: options.customerName,
                preferredBank: options.preferredBank,
                narration: options.narration,
                bvn: options.bvn,
                getAllAvailableBanks: options.getAllAvailableBanks ?? true,
                metaData: options.metaData,
            });
            return response.data.responseBody;
        }, 3, 500);
    }
    async getDedicatedAccount(accountReference) {
        return this.retry(async () => {
            await this.ensureAuthenticated();
            const response = await this.client.get(`/v2/bank-transfer/reserved-accounts/${encodeURIComponent(accountReference)}`);
            return response.data.responseBody;
        }, 3, 500);
    }
    async deallocateAccount(accountReference) {
        return this.retry(async () => {
            await this.ensureAuthenticated();
            await this.client.delete(`/v2/bank-transfer/reserved-accounts/${encodeURIComponent(accountReference)}`);
            return true;
        }, 3, 500);
    }
    async verifyTransaction(paymentReference) {
        return this.retry(async () => {
            await this.ensureAuthenticated();
            const response = await this.client.get(`/v2/transactions/${encodeURIComponent(paymentReference)}`);
            return response.data.responseBody;
        }, 3, 500);
    }
    async isPaymentSuccessful(paymentReference) {
        const transaction = await this.verifyTransaction(paymentReference);
        return transaction.paymentStatus?.toLowerCase() === 'paid';
    }
    verifyWebhookSignature(payload, signature) {
        const expectedSignature = crypto_1.default
            .createHmac('sha512', MONNIFY_SECRET_KEY)
            .update(payload)
            .digest('hex');
        return crypto_1.default.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
    }
    async getAccountTransactions(accountReference, page = 0, size = 10) {
        try {
            await this.ensureAuthenticated();
            const response = await this.client.get(`/v2/bank-transfer/reserved-accounts/${encodeURIComponent(accountReference)}/transactions`, { params: { page, size } });
            return response.data.responseBody;
        }
        catch (error) {
            console.log('Error fetching account transactions: ');
            throw error;
        }
    }
    async verifyNIN(nin) {
        try {
            await this.ensureAuthenticated();
            const response = await this.client.post('/v1/vas/nin-details', { nin });
            return response.data.responseBody;
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * Complete KYC verification flow matching verificationService.ts
     * @param userId - User's ObjectId
     * @param nin - NIN number to verify
     * @param name - User's name from account
     * @param phone - User's phone number from account
     * @param capturedImageBase64 - Base64 encoded image of user (optional)
     * @param consent - User consent for verification
     * @returns KYCVerificationResult with verification details
     */
    async validateNinForUser(userId, nin, name, phone, capturedImageBase64, consent = true) {
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
        // Deduct verification cost
        const user = await account_1.Account.findOneAndUpdate({ _id: userId, walletBalance: { $gte: this.NIN_VERIFICATION_COST } }, { $inc: { walletBalance: -this.NIN_VERIFICATION_COST } }, { returnDocument: 'after' });
        if (!user) {
            throw new Error('Insufficient wallet balance for NIN verification');
        }
        // Call NIN verification API
        let verificationResponse;
        try {
            verificationResponse = await this.verifyNIN(nin);
        }
        catch (error) {
            // Refund the user if API fails
            await account_1.Account.findByIdAndUpdate(userId, {
                $inc: { walletBalance: this.NIN_VERIFICATION_COST },
            });
            throw new Error(error.response?.data?.message || 'NIN verification service unavailable');
        }
        // Normalize names
        const normalizedGivenName = normalizeName(name);
        const normalizedApiName = normalizeName([
            verificationResponse.firstName,
            verificationResponse.middleName,
            verificationResponse.lastName,
        ]
            .filter(Boolean)
            .join(' '));
        // Use flexible name matching instead of exact match
        const nameMatch = (0, nameMatch_1.doNamesMatch)(normalizedGivenName, normalizedApiName, 0.6);
        // For phone, still use exact match (or can also make flexible)
        const normalizedGivenPhone = normalizePhoneNumber(phone);
        const normalizedApiPhone = normalizePhoneNumber(verificationResponse.mobileNumber);
        const phoneMatch = normalizedGivenPhone === normalizedApiPhone;
        // For photo (if applicable)
        const normalizedGivenImage = normalizeBase64Image(capturedImageBase64);
        const normalizedApiImage = ''; //normalizeBase64Image(verificationResponse.photo);
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
            chargedAmount: this.NIN_VERIFICATION_COST,
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
    }
}
exports.MonnifyService = MonnifyService;
exports.monnifyService = new MonnifyService();
