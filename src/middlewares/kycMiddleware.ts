import { Request } from '../utils/customRequest';
import { NextFunction, Response } from 'express';
import { resSender } from '../utils/responseService';
import { Account, KycStatus } from '../models/account';
import { PlatformSettings } from '../models/platformSettings';

export const requireKyc = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return resSender(res, 401, 'fail', 'User not authenticated');
    }

    // Check if KYC is required by platform settings
    const settings = await PlatformSettings.findOne();
    if (!settings?.kycRequiredToJoin) {
      // KYC not required, proceed
      return next();
    }

    const user = await Account.findById(userId);

    if (!user) {
      return resSender(res, 404, 'fail', 'User not found');
    }

    if (user.kyc?.status !== KycStatus.VERIFIED) {
      return resSender(res, 403, 'fail', 'KYC verification required to perform this action');
    }

    next();
  } catch (error: any) {
    console.error('KYC middleware error:', error);
    return resSender(res, 500, 'error', error.message || 'Failed to verify KYC status');
  }
};
