import axios from 'axios';
import { Account, KycStatus } from '../models/account';
import { Schema, Types } from 'mongoose';
import { PlatformSettings } from '../models/platformSettings';
import { encrypt } from './encryption';
import { doNamesMatch } from './nameMatch';

const NIN_API_BASE_URL = process.env.NIN_API_BASE_URL || 'https://checkmyninbvn.com.ng/api';
const NIN_API_KEY = process.env.NIN_VER_API_KEY;
const NIN_VERIFICATION_COST = Number(process.env.NIN_VERIFICATION_COST ?? 200);

if (!NIN_API_KEY) {
  throw new Error('NIN_API_KEY is required in environment variables');
}

const ninClient = axios.create({
  baseURL: NIN_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': NIN_API_KEY,
  },
});

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

export interface NINVerificationPayload {
  nin: string;
  consent: boolean;
}

export interface NINVerificationResponse {
  status: string;
  reportID: string | null;
  message: string;
  data: {
    firstname: string;
    middlename: string;
    surname: string;
    telephoneno: string;
    residence_state: string;
    residence_town: string;
    residence_address: string;
    residence_lga: string;
    birthcountry: string;
    birthstate: string;
    birthlga: string;
    gender: string;
    nin: string;
    birthdate: string;
    photo: string;
    [key: string]: any;
  };
}

export interface NINBalanceResponse {
  status: string;
  reportID: string | null;
  message: string;
  data: {
    user_id: number;
    username: string;
    balance: number;
    formatted_balance: string;
    user_type: string;
    api_requests_today: number;
    api_limit: number;
    [key: string]: any;
  };
}

export const getNINApiBalance = async (): Promise<NINBalanceResponse> => {
  const response = await ninClient.get('/balance');
  return response.data;
};

export const verifyNIN = async (
  payload: NINVerificationPayload,
): Promise<NINVerificationResponse> => {
  const response = await ninClient.post('/nin-verification', payload);
  return response.data;
};

export interface KYCVerificationResult {
  verified: boolean;
  chargedAmount: number;
  walletBalance: number;
  apiResponse: NINVerificationResponse;
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

export const verifyNINForUser = async (
  userId: Types.ObjectId,
  nin: string,
  name: string,
  phone: string,
  capturedImageBase64: Buffer | string,
  consent = true,
): Promise<KYCVerificationResult> => {
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
    { _id: userId, walletBalance: { $gte: NIN_VERIFICATION_COST } },
    { $inc: { walletBalance: -NIN_VERIFICATION_COST } },
    { returnDocument: 'after' },
  );

  if (!user) {
    throw new Error('Insufficient wallet balance for NIN verification');
  }

  // Call NIN verification API
  let verificationResponse: NINVerificationResponse;
  try {
    verificationResponse = await verifyNIN({ nin, consent });
  } catch (error: any) {
    // Refund the user if API fails
    await Account.findByIdAndUpdate(userId, {
      $inc: { walletBalance: NIN_VERIFICATION_COST },
    });
    throw new Error(error.response?.data?.message || 'NIN verification service unavailable');
  }

  if (verificationResponse.status !== 'success') {
    // Refund the user if verification fails
    await Account.findByIdAndUpdate(userId, {
      $inc: { walletBalance: NIN_VERIFICATION_COST },
    });
    throw new Error(verificationResponse.message || 'NIN verification failed');
  }

  const apiData = verificationResponse.data;

  // Normalize names
  const normalizedGivenName = normalizeName(name);
  const normalizedApiName = normalizeName(
    [apiData.firstname, apiData.middlename, apiData.surname].filter(Boolean).join(' '),
  );

  // Use flexible name matching instead of exact match
  const nameMatch = doNamesMatch(normalizedGivenName, normalizedApiName, 0.6);

  // For phone, still use exact match (or can also make flexible)
  const normalizedGivenPhone = normalizePhoneNumber(phone);
  const normalizedApiPhone = normalizePhoneNumber(apiData.telephoneno);
  const phoneMatch = normalizedGivenPhone === normalizedApiPhone;

  // For photo (if applicable)
  const normalizedGivenImage = normalizeBase64Image(capturedImageBase64);
  const normalizedApiImage = normalizeBase64Image(apiData.photo);
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

export const comparePhotos = (capturedImageBase64: string, apiPhotoBase64: string): boolean => {
  const normalizedGivenImage = normalizeBase64Image(capturedImageBase64);
  const normalizedApiImage = normalizeBase64Image(apiPhotoBase64);
  return normalizedGivenImage === normalizedApiImage;
};
