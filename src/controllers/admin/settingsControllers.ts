import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import Joi from 'joi';
import validationSchema from '../../utils/validationSchema';
import { PlatformSettings, FeeHistory } from '../../models/platformSettings';

// Initialize default settings if none exist
export const initializeSettings = async () => {
  const existing = await PlatformSettings.findOne();
  if (!existing) {
    await PlatformSettings.create({});
    console.log('[Settings] Default platform settings initialized');
  }
};

// Get all feature flags
export const getFeatureFlags = async (req: Request, res: Response) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
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

    return resSender(res, 200, 'success', 'Feature flags fetched', null, flags);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching feature flags');
  }
};

// Toggle a specific feature flag
export const toggleFeatureFlag = async (req: Request, res: Response) => {
  try {
    const { flag_key } = req.params as { flag_key: string };
    const { enabled } = req.body;
    const adminEmail = req.user?.email || 'admin';

    const { error } = Joi.object({
      enabled: validationSchema.boolean.required(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

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
      return resSender(res, 400, 'fail', 'Invalid feature flag key');
    }

    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { [flag_key]: enabled, updatedAt: new Date() },
      { returnDocument: 'after', upsert: true },
    );

    return resSender(res, 200, 'success', 'Feature flag updated', null, {
      flag_key,
      enabled: settings[flag_key as keyof typeof settings],
      updated_at: settings.updatedAt,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error toggling feature flag');
  }
};

// Get platform configuration
export const getPlatformConfig = async (req: Request, res: Response) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
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

    return resSender(res, 200, 'success', 'Platform config fetched', null, config);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching platform config');
  }
};

// Update platform configuration
export const updatePlatformConfig = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const adminEmail = req.user?.email || 'admin';

    const configSchema = Joi.object({
      processingFeePerSlot: validationSchema.number.min(0).optional(),
      insuranceRatePct: validationSchema.number.min(0).max(100).optional(),
      defaultTransportFee: validationSchema.number.min(0).optional(),
      maxSlashDurationHours: validationSchema.number.min(1).max(168).optional(),
      cancellationPenaltyPct: validationSchema.number.min(0).max(100).optional(),
      minSlotsPerSlash: validationSchema.number.min(1).optional(),
      minTopupAmount: validationSchema.number.min(0).optional(),
    });

    const { error } = configSchema.validate(updates);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const current = await PlatformSettings.findOne();
    if (!current) {
      await PlatformSettings.create({});
    }

    // Log fee changes to history
    const feeFields = ['processingFeePerSlot', 'defaultTransportFee', 'insuranceRatePct'];

    for (const field of feeFields) {
      if (
        updates[field] !== undefined &&
        current &&
        current[field as keyof typeof current] !== updates[field]
      ) {
        await FeeHistory.create({
          fee_type: field,
          label: field.replace(/_/g, ' '),
          old_value: current[field as keyof typeof current] as number,
          new_value: updates[field],
          changed_by: adminEmail,
          changed_at: new Date(),
        });
      }
    }

    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { ...updates, updatedAt: new Date() },
      { returnDocument: 'after', upsert: true },
    );

    const config = {
      processingFeePerSlot: settings.processingFeePerSlot,
      insuranceRatePct: settings.insuranceRatePct,
      defaultTransportFee: settings.defaultTransportFee,
      maxSlashDurationHours: settings.maxSlashDurationHours,
      cancellationPenaltyPct: settings.cancellationPenaltyPct,
      minSlotsPerSlash: settings.minSlotsPerSlash,
      minTopupAmount: settings.minTopupAmount,
    };

    return resSender(res, 200, 'success', 'Platform config updated', null, config);
  } catch (error: any) {
    return errorHandler(error, res, 'Error updating platform config');
  }
};

// Get payment settings
export const getPaymentSettings = async (req: Request, res: Response) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }

    const paymentSettings = {
      paymentProvider: settings.paymentProvider,
      payoutProvider: settings.payoutProvider,
      escrowReleaseTrigger: settings.escrowReleaseTrigger,
    };

    return resSender(res, 200, 'success', 'Payment settings fetched', null, paymentSettings);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching payment settings');
  }
};

// Update payment settings
export const updatePaymentSettings = async (req: Request, res: Response) => {
  try {
    const { paymentProvider, payoutProvider, escrowReleaseTrigger } = req.body;

    const { error } = Joi.object({
      paymentProvider: validationSchema.strings.optional(),
      payoutProvider: validationSchema.strings.optional(),
      escrowReleaseTrigger: validationSchema.strings
        .valid('Attendant Verification', 'Auto')
        .optional(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const updates: any = {};
    if (paymentProvider !== undefined) updates.paymentProvider = paymentProvider;
    if (payoutProvider !== undefined) updates.payoutProvider = payoutProvider;
    if (escrowReleaseTrigger !== undefined) updates.escrowReleaseTrigger = escrowReleaseTrigger;
    updates.updatedAt = new Date();

    const settings = await PlatformSettings.findOneAndUpdate({}, updates, {
      returnDocument: 'after',
      upsert: true,
    });

    const paymentSettings = {
      paymentProvider: settings.paymentProvider,
      payoutProvider: settings.payoutProvider,
      escrowReleaseTrigger: settings.escrowReleaseTrigger,
    };

    return resSender(res, 200, 'success', 'Payment settings updated', null, paymentSettings);
  } catch (error: any) {
    return errorHandler(error, res, 'Error updating payment settings');
  }
};

// Get KYC settings
export const getKycSettings = async (req: Request, res: Response) => {
  try {
    let settings = await PlatformSettings.findOne();
    if (!settings) {
      settings = await PlatformSettings.create({});
    }

    const kycSettings = {
      kycRequiredToJoin: settings.kycRequiredToJoin,
      kycProvider: settings.kycProvider,
      ninVerification: settings.ninVerification,
    };

    return resSender(res, 200, 'success', 'KYC settings fetched', null, kycSettings);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching KYC settings');
  }
};

// Update KYC settings
export const updateKycSettings = async (req: Request, res: Response) => {
  try {
    const { kycRequiredToJoin, kycProvider, ninVerification } = req.body;

    const { error } = Joi.object({
      kycRequiredToJoin: validationSchema.boolean.optional(),
      kycProvider: validationSchema.strings.optional(),
      ninVerification: validationSchema.strings.valid('Enabled', 'Disabled').optional(),
    }).validate(req.body);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    const updates: any = {};
    if (kycRequiredToJoin !== undefined) updates.kycRequiredToJoin = kycRequiredToJoin;
    if (kycProvider !== undefined) updates.kycProvider = kycProvider;
    if (ninVerification !== undefined) updates.ninVerification = ninVerification;
    updates.updatedAt = new Date();

    const settings = await PlatformSettings.findOneAndUpdate({}, updates, {
      returnDocument: 'after',
      upsert: true,
    });

    const kycSettings = {
      kycRequiredToJoin: settings.kycRequiredToJoin,
      kycProvider: settings.kycProvider,
      ninVerification: settings.ninVerification,
    };

    return resSender(res, 200, 'success', 'KYC settings updated', null, kycSettings);
  } catch (error: any) {
    return errorHandler(error, res, 'Error updating KYC settings');
  }
};

// Get fee change history
export const getFeeHistory = async (req: Request, res: Response) => {
  try {
    let { type, page = 1, limit = 20 } = req.query;

    const { error } = Joi.object({
      type: validationSchema.strings.optional(),
      page: validationSchema.number,
      limit: validationSchema.number,
    }).validate(req.query);
    if (error) return resSender(res, 400, 'fail', error.details[0].message);

    page = Number(page) || 1;
    limit = Number(limit) || 20;

    const query: any = {};
    if (type) {
      query.fee_type = type;
    }

    const total = await FeeHistory.countDocuments(query);
    const records = await FeeHistory.find(query)
      .sort({ changed_at: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return resSender(res, 200, 'success', 'Fee history fetched', null, {
      total,
      page,
      totalPages: Math.ceil(total / limit),
      records,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching fee history');
  }
};

// Danger Zone Actions
export const pausePlatform = async (req: Request, res: Response) => {
  try {
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      {
        platformPaused: true,
        pausedAt: new Date(),
        updatedAt: new Date(),
      },
      { returnDocument: 'after', upsert: true },
    );

    return resSender(res, 200, 'success', 'Platform paused', null, {
      status: 'paused',
      pausedAt: settings.pausedAt,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error pausing platform');
  }
};

export const resumePlatform = async (req: Request, res: Response) => {
  try {
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      {
        platformPaused: false,
        pausedAt: null,
        updatedAt: new Date(),
      },
      { returnDocument: 'after', upsert: true },
    );

    return resSender(res, 200, 'success', 'Platform resumed', null, {
      status: 'active',
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error resuming platform');
  }
};

export const disableSignups = async (req: Request, res: Response) => {
  try {
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { signupsEnabled: false, updatedAt: new Date() },
      { returnDocument: 'after', upsert: true },
    );

    return resSender(res, 200, 'success', 'Signups disabled', null, {
      signupsEnabled: false,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error disabling signups');
  }
};

export const enableSignups = async (req: Request, res: Response) => {
  try {
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      { signupsEnabled: true, updatedAt: new Date() },
      { returnDocument: 'after', upsert: true },
    );

    return resSender(res, 200, 'success', 'Signups enabled', null, {
      signupsEnabled: true,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error enabling signups');
  }
};

export const freezeEscrow = async (req: Request, res: Response) => {
  try {
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      {
        escrowFrozen: true,
        frozenAt: new Date(),
        updatedAt: new Date(),
      },
      { returnDocument: 'after', upsert: true },
    );

    return resSender(res, 200, 'success', 'Escrow frozen', null, {
      escrowFrozen: true,
      frozenAt: settings.frozenAt,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error freezing escrow');
  }
};

export const unfreezeEscrow = async (req: Request, res: Response) => {
  try {
    const settings = await PlatformSettings.findOneAndUpdate(
      {},
      {
        escrowFrozen: false,
        frozenAt: null,
        updatedAt: new Date(),
      },
      { returnDocument: 'after', upsert: true },
    );

    return resSender(res, 200, 'success', 'Escrow unfrozen', null, {
      escrowFrozen: false,
    });
  } catch (error: any) {
    return errorHandler(error, res, 'Error unfreezing escrow');
  }
};
