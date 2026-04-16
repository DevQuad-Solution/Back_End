import axios from 'axios';
import { Account } from '../models/account';
import { Schema, Types } from 'mongoose';

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

const normalizeBase64Image = (input: string | undefined): string => {
  if (!input) return '';
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

export const verifyNINForUser = async (
  userId: Types.ObjectId,
  nin: string,
  name: string,
  phone: string,
  capturedImageBase64: string,
  consent = true,
) => {
  const user = await Account.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: NIN_VERIFICATION_COST } },
    { $inc: { walletBalance: -NIN_VERIFICATION_COST } },
    { returnDocument: 'after' },
  );

  if (!user) {
    throw new Error('Insufficient wallet balance for NIN verification');
  }

  const verificationResponse = await verifyNIN({ nin, consent });
  if (verificationResponse.status !== 'success') {
    throw new Error(verificationResponse.message || 'NIN verification failed');
  }

  const apiData = verificationResponse.data;
  const normalizedGivenName = normalizeName(name);
  const normalizedApiName = normalizeName(
    [apiData.firstname, apiData.middlename, apiData.surname].filter(Boolean).join(' '),
  );
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
      photo:
        normalizedGivenImage !== '' &&
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

export const comparePhotos = (capturedImageBase64: string, apiPhotoBase64: string): boolean => {
  const normalizedGivenImage = normalizeBase64Image(capturedImageBase64);
  const normalizedApiImage = normalizeBase64Image(apiPhotoBase64);
  return normalizedGivenImage === normalizedApiImage;
};
