"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.monnifyService = exports.MonnifyService = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const encryption_1 = require("./encryption");
const MONNIFY_API_BASE_URL = process.env.MONNIFY_API_BASE_URL || 'https://sandbox.monnify.com/api';
const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY;
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY;
const MONNIFY_CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE;
if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY || !MONNIFY_CONTRACT_CODE) {
    throw new Error('Missing Monnify configuration');
}
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
class MonnifyService {
    constructor() {
        this.client = axios_1.default.create({
            baseURL: MONNIFY_API_BASE_URL,
            timeout: 30000,
            headers: { 'Content-Type': 'application/json' },
        });
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
            console.log('Error loging to monnify: ');
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
    async validateNin(name, phone, nin) {
        try {
            const apiData = await this.verifyNIN(nin);
            const normalizedGivenName = normalizeName(name);
            const normalizedApiName = normalizeName([apiData.firstName, apiData.middleName, apiData.lastName].filter(Boolean).join(' '));
            const normalizedGivenPhone = normalizePhoneNumber(phone);
            const normalizedApiPhone = normalizePhoneNumber(apiData.mobileNumber);
            // const normalizedGivenImage = normalizeBase64Image(capturedImageBase64);
            // const normalizedApiImage = normalizeBase64Image(apiData.photo);
            return {
                verified: true,
                apiResponse: apiData,
                matches: {
                    name: normalizedGivenName === normalizedApiName,
                    phone: normalizedGivenPhone === normalizedApiPhone,
                    // photo:
                    //   normalizedGivenImage !== '' &&
                    //   normalizedApiImage !== '' &&
                    //   normalizedGivenImage === normalizedApiImage,
                },
                normalized: {
                    givenName: normalizedGivenName,
                    apiName: normalizedApiName,
                    givenPhone: normalizedGivenPhone,
                    apiPhone: normalizedApiPhone,
                },
            };
        }
        catch (error) {
            throw error;
        }
    }
}
exports.MonnifyService = MonnifyService;
exports.monnifyService = new MonnifyService();
