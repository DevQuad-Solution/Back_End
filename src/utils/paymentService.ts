import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';
import { encrypt, toBase64 } from './encryption';
import { PlatformSettings } from '../models/platformSettings';
import { Account, KycStatus } from '../models/account';
import { Types } from 'mongoose';
import { doNamesMatch } from './nameMatch';

const MONNIFY_API_BASE_URL = process.env.MONNIFY_API_BASE_URL || 'https://api.monnify.com/api';
const MONNIFY_API_KEY = process.env.MONNIFY_API_KEY!;
const MONNIFY_SECRET_KEY = process.env.MONNIFY_SECRET_KEY!;
const MONNIFY_CONTRACT_CODE = process.env.MONNIFY_CONTRACT_CODE!;

if (!MONNIFY_API_KEY || !MONNIFY_SECRET_KEY || !MONNIFY_CONTRACT_CODE) {
  throw new Error('Missing Monnify configuration');
}

export interface MonnifyReservedAccountOptions {
  accountReference: string;
  accountName: string;
  customerEmail: string;
  customerName?: string;
  currencyCode?: 'NGN';
  preferredBank?: string;
  nin?: string;
  narration?: string;
  getAllAvailableBanks?: boolean;
  metaData?: Record<string, unknown>;
}

export interface MonnifyReservedAccountResponse {
  accountReference: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  bankCode: string;
  accounts?: Array<{
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
  }>;
  currency: string;
  accountStatus: string;
  contractCode: string;
  customerEmail: string;
  customerName?: string;
}

export interface MonnifyTransactionResponse {
  transactionReference: string;
  paymentReference: string;
  amountPaid: number;
  paidOn: string;
  paymentStatus: string;
  paymentDescription: string;
  customerName: string;
  customerEmail: string;
  contractCode: string;
  bankName?: string;
  accountNumber?: string;
  currencyCode: string;
  paymentMethod: string;
}

export interface MonnifyNinResponse {
  nin: string;
  lastName: string;
  firstName: string;
  middleName: string;
  dateOfBirth: string;
  gender: string;
  mobileNumber: string;
}

export interface KYCVerificationResult {
  verified: boolean;
  chargedAmount: number;
  walletBalance: number;
  apiResponse: MonnifyNinResponse;
  matches: {
    name: boolean;
    phone: boolean;
    photo: boolean;
  };
  normalized: {
    givenName: string;
    apiName: string;
    givenPhone: string;
    apiPhone: string;
  };
}

const normalizeBase64Image = (input: string | Buffer | undefined): string => {
  if (!input) return '';
  if (Buffer.isBuffer(input)) {
    return input.toString('base64');
  }
  return input
    .replace(/^data:image\/[a-zA-Z]+;base64,/, '')
    .replace(/\s+/g, '')
    .trim();
};

const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/[^0-9]/g, '').replace(/^0/, '');
};

const normalizeName = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, ' ').trim();
};

export class MonnifyService {
  private client: AxiosInstance;
  private authToken?: string;
  private tokenExpiry?: number;
  private readonly NIN_VERIFICATION_COST: number;

  constructor() {
    this.client = axios.create({
      baseURL: MONNIFY_API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });
    this.NIN_VERIFICATION_COST = Number(process.env.NIN_VERIFICATION_COST ?? 100);
  }

  private get basicAuthHeader(): string {
    return `Basic ${toBase64(`${MONNIFY_API_KEY}:${MONNIFY_SECRET_KEY}`)}`;
  }

  private isRetryableError(error: unknown): boolean {
    const axiosError = error as { code?: string; response?: { status?: number } };
    const retryableCodes = [
      'ETIMEDOUT',
      'ECONNRESET',
      'EAI_AGAIN',
      'ENOTFOUND',
      'ECONNREFUSED',
      'EHOSTUNREACH',
    ];
    const retryableStatus = [502, 503, 504];

    return (
      (axiosError.code !== undefined && retryableCodes.includes(axiosError.code)) ||
      (axiosError.response?.status !== undefined &&
        retryableStatus.includes(axiosError.response.status))
    );
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async retry<T>(fn: () => Promise<T>, attempts = 3, initialDelay = 500): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        if (attempt === attempts || !this.isRetryableError(error)) {
          console.log('Error 1: ', error.message);
          console.log('Error 2: ', error);
          // let errMsg = error.response.data.responseMessage
          throw error;
        }

        const backoff = initialDelay * Math.pow(2, attempt - 1);
        console.log(`Monnify retry attempt ${attempt} failed, retrying in ${backoff}ms...`, error);
        await this.delay(backoff);
      }
    }

    throw lastError;
  }

  private async authenticate(): Promise<void> {
    try {
      const response = await axios.post(
        `${MONNIFY_API_BASE_URL}/v1/auth/login`,
        {},
        { headers: { Authorization: this.basicAuthHeader } },
      );

      const auth = response.data.responseBody;
      this.authToken = auth.accessToken;
      this.tokenExpiry = Date.now() + auth.expiresIn * 1000 - 30000; // 30s buffer
      this.client.defaults.headers.Authorization = `Bearer ${this.authToken}`;
      console.log('Monnify Auth done');
    } catch (error) {
      console.log('Error logging to monnify: ');
      throw error;
    }
  }

  private async ensureAuthenticated(): Promise<void> {
    if (!this.authToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry) {
      await this.retry(() => this.authenticate(), 3, 500);
    }
  }

  async createDedicatedAccount(
    options: MonnifyReservedAccountOptions,
  ): Promise<MonnifyReservedAccountResponse> {
    return this.retry(
      async () => {
        await this.ensureAuthenticated();

        const response = await this.client.post('/v2/bank-transfer/reserved-accounts', {
          accountReference: options.accountReference,
          accountName: options.accountName,
          currencyCode: options.currencyCode ?? 'NGN',
          contractCode: MONNIFY_CONTRACT_CODE,
          customerEmail: options.customerEmail,
          customerName: options.customerName,
          preferredBank: options.preferredBank ?? ['50515'],
          narration: options.narration,
          nin: options.nin,
          getAllAvailableBanks: options.getAllAvailableBanks ?? true,
          metaData: options.metaData,
        });

        return response.data.responseBody;
      },
      3,
      500,
    );
  }

  async getDedicatedAccount(accountReference: string): Promise<MonnifyReservedAccountResponse> {
    return this.retry(
      async () => {
        await this.ensureAuthenticated();
        const response = await this.client.get(
          `/v2/bank-transfer/reserved-accounts/${encodeURIComponent(accountReference)}`,
        );
        return response.data.responseBody;
      },
      3,
      500,
    );
  }

  async deallocateAccount(accountReference: string): Promise<boolean> {
    return this.retry(
      async () => {
        await this.ensureAuthenticated();
        await this.client.delete(
          `/v2/bank-transfer/reserved-accounts/${encodeURIComponent(accountReference)}`,
        );
        return true;
      },
      3,
      500,
    );
  }

  async verifyTransaction(paymentReference: string): Promise<MonnifyTransactionResponse> {
    return this.retry(
      async () => {
        await this.ensureAuthenticated();
        const response = await this.client.get(
          `/v2/transactions/${encodeURIComponent(paymentReference)}`,
        );
        return response.data.responseBody;
      },
      3,
      500,
    );
  }

  async isPaymentSuccessful(paymentReference: string): Promise<boolean> {
    const transaction = await this.verifyTransaction(paymentReference);
    return transaction.paymentStatus?.toLowerCase() === 'paid';
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const expectedSignature = crypto
      .createHmac('sha512', MONNIFY_SECRET_KEY)
      .update(payload)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  async getAccountTransactions(
    accountReference: string,
    page: number = 0,
    size: number = 10,
  ): Promise<any> {
    try {
      await this.ensureAuthenticated();
      const response = await this.client.get(
        `/v2/bank-transfer/reserved-accounts/${encodeURIComponent(accountReference)}/transactions`,
        { params: { page, size } },
      );
      return response.data.responseBody;
    } catch (error) {
      console.log('Error fetching account transactions: ');
      throw error;
    }
  }

  async verifyNIN(nin: string): Promise<MonnifyNinResponse> {
    try {
      await this.ensureAuthenticated();
      const response = await this.client.post('/v1/vas/nin-details', { nin });
      return response.data.responseBody;
    } catch (error) {
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
  async validateNinForUser(
    userId: Types.ObjectId,
    nin: string,
    name: string,
    phone: string,
    capturedImageBase64?: Buffer | string,
    consent: boolean = true,
  ): Promise<KYCVerificationResult> {
    // Check if NIN verification is enabled
    const settings = await PlatformSettings.findOne();
    if (settings?.ninVerification === 'Disabled') {
      throw new Error('NIN verification is currently disabled by admin');
    }

    // Check if user is already verified
    const existingUser = await Account.findById(userId);
    if (existingUser?.kyc?.status === KycStatus.VERIFIED) {
      throw new Error('User is already KYC verified');
    }

    // Deduct verification cost
    const user = await Account.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: this.NIN_VERIFICATION_COST } },
      { $inc: { walletBalance: -this.NIN_VERIFICATION_COST } },
      { returnDocument: 'after' },
    );

    if (!user) {
      throw new Error('Insufficient wallet balance for NIN verification');
    }

    // Call NIN verification API
    let verificationResponse: MonnifyNinResponse;
    try {
      verificationResponse = await this.verifyNIN(nin);
      console.log('Verification response: ', verificationResponse);
    } catch (error: any) {
      // Refund the user if API fails
      await Account.findByIdAndUpdate(userId, {
        $inc: { walletBalance: this.NIN_VERIFICATION_COST },
      });
      throw new Error(error.response?.data?.message || 'NIN verification service unavailable');
    }

    // Normalize names
    const normalizedGivenName = normalizeName(name);
    const normalizedApiName = normalizeName(
      [
        verificationResponse.firstName,
        verificationResponse.middleName,
        verificationResponse.lastName,
      ]
        .filter(Boolean)
        .join(' '),
    );

    // Use flexible name matching instead of exact match
    const nameMatch = doNamesMatch(normalizedGivenName, normalizedApiName, 0.6);

    // For phone, still use exact match (or can also make flexible)
    const normalizedGivenPhone = normalizePhoneNumber(phone);
    const normalizedApiPhone = normalizePhoneNumber(verificationResponse.mobileNumber);
    const phoneMatch = normalizedGivenPhone === normalizedApiPhone;

    // For photo (if applicable)
    const normalizedGivenImage = normalizeBase64Image(capturedImageBase64);
    const normalizedApiImage = ''; //normalizeBase64Image(verificationResponse.photo);
    const photoMatch =
      normalizedGivenImage !== '' &&
      normalizedApiImage !== '' &&
      normalizedGivenImage === normalizedApiImage;

    // Determine verification success
    // Name match is primary, phone is secondary
    const isVerified = nameMatch; // Or you can require both: nameMatch && phoneMatch

    // Update user KYC status
    if (isVerified) {
      await Account.findByIdAndUpdate(userId, {
        $set: {
          'kyc.nin': encrypt(nin),
          'kyc.status': KycStatus.VERIFIED,
        },
      });
    } else {
      await Account.findByIdAndUpdate(userId, {
        $set: {
          'kyc.nin': encrypt(nin),
          'kyc.status': KycStatus.REJECTED,
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

export const monnifyService = new MonnifyService();
