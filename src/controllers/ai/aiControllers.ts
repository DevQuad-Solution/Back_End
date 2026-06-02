import { Request } from '../../utils/customRequest';
import { NextFunction, Response, Router } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { Slash } from '../../models/slash';
import { FraudAssessment } from '../../models/ai/FraudAssessment';
import { Account } from '../../models/account';
import { runLayer1 } from '../../utils/ai/fraud';
import { runFoodRadar } from '../../utils/ai/radar';
import { AILog } from '../../models/ai/AILog';
import { AISettings } from '../../models/ai/AISettings';
import { trackedCompletion } from '../../utils/ai/openai';

export const getRadarByUser = async (req: Request, res: Response) => {
  try {
    const { hubId } = req.query as { hubId: string };
    const slashes = await Slash.find({ hub: hubId, status: 'open' })
      .populate('product')
      .sort({ createdAt: -1 })
      .limit(5);

    const deals = slashes.map((slash: any) => ({
      _id: slash._id,
      productName: slash.product.name,
      pricePerSlot: slash.product.pricePerSlot,
      slotsLeft: slash.product.noOfSlots - slash.joined.length,
      radarScore: slash.radarScore || 0,
      expiresAt: slash.timeLimit,
      radarHeadline: `${slash.product.name} at ₦${slash.product.pricePerSlot}/slot — ${slash.product.noOfSlots - slash.joined.length} slots left!`,
    }));

    return res.status(200).json({
      status: 'success',
      data: { hubId, deals, cachedAt: new Date().toISOString() },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getFraudQueue = async (req: Request, res: Response) => {
  try {
    const assessments = await FraudAssessment.find({
      riskLevel: { $in: ['high', 'critical'] },
      adminAction: null,
    })
      .sort({ riskScore: -1 })
      .populate('userId', 'name email phone');

    return res.status(200).json({
      status: 'success',
      data: { total: assessments.length, assessments },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const editFraudQueue = async (req: Request, res: Response) => {
  try {
    const { assessmentId } = req.params;
    const { action } = req.body;
    const adminId = req.user?._id;

    if (!['cleared', 'watching', 'blocked'].includes(action)) {
      return res.status(400).json({ status: 'fail', message: 'Invalid action' });
    }

    const assessment = await FraudAssessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({ status: 'fail', message: 'Assessment not found' });
    }

    if (action === 'blocked') {
      await Account.findByIdAndUpdate(assessment.userId, { status: 'Suspended' });
    }

    assessment.adminAction = action;
    assessment.adminId = adminId;
    assessment.resolvedAt = new Date();
    await assessment.save();

    return res.status(200).json({
      status: 'success',
      message: 'Assessment resolved',
      data: { adminAction: action, resolvedAt: assessment.resolvedAt },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getFraudStats = async (req: Request, res: Response) => {
  try {
    const [total, critical, high, pending, resolvedToday] = await Promise.all([
      FraudAssessment.countDocuments(),
      FraudAssessment.countDocuments({ riskLevel: 'critical' }),
      FraudAssessment.countDocuments({ riskLevel: 'high' }),
      FraudAssessment.countDocuments({
        adminAction: null,
        riskLevel: { $in: ['high', 'critical'] },
      }),
      FraudAssessment.countDocuments({
        resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      }),
    ]);

    return res.status(200).json({
      status: 'success',
      data: { total, critical, high, pending, resolvedToday },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const triggerFraud = async (req: Request, res: Response) => {
  try {
    const { userId, trigger } = req.body;
    const flags = await runLayer1(userId, trigger || 'manual', {});

    return res.status(200).json({
      status: 'success',
      message: 'Fraud analysis queued',
      data: { assessmentId: flags.length > 0 ? 'created' : 'none' },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const runsFoodRadar = async (req: Request, res: Response) => {
  try {
    const { hubId } = req.body;
    const result = await runFoodRadar(hubId);

    return res.status(200).json({
      status: 'success',
      message: 'Radar run started',
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getRadarLogs = async (req: Request, res: Response) => {
  try {
    const logs = await AILog.find({ feature: 'radar' }).sort({ createdAt: -1 }).limit(20);

    const formattedLogs = logs.map((log) => ({
      runAt: log.createdAt,
      tokensUsed: log.inputTokens + log.outputTokens,
      estimatedCostUsd: log.estimatedCost,
    }));

    return res.status(200).json({
      status: 'success',
      data: { logs: formattedLogs },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getAdminAISettings = async (req: Request, res: Response) => {
  try {
    let settings = await AISettings.findOne();
    if (!settings) {
      settings = await AISettings.create({
        radarEnabled: true,
        fraudEnabled: true,
        retentionEnabled: false,
        dailyBudgetUsd: 10,
        pausedForBudget: false,
      });
    }

    return res.status(200).json({
      status: 'success',
      data: settings,
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const editAISettings = async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const adminId = req.user?._id;

    const settings = await AISettings.findOneAndUpdate(
      {},
      { ...updates, updatedBy: adminId, updatedAt: new Date() },
      { returnDocument: 'after', upsert: true },
    );

    return res.status(200).json({
      status: 'success',
      message: 'AI settings updated',
      data: settings,
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const getCosts = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;
    const matchStage: any = {};

    if (from) {
      matchStage.createdAt = { $gte: new Date(from as string) };
    }
    if (to) {
      matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(to as string) };
    }

    const [total, byFeature, byModel] = await Promise.all([
      AILog.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalCost: { $sum: '$estimatedCost' },
            totalTokens: { $sum: '$inputTokens' },
          },
        },
      ]),
      AILog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$feature', usd: { $sum: '$estimatedCost' }, calls: { $sum: 1 } } },
      ]),
      AILog.aggregate([
        { $match: matchStage },
        { $group: { _id: '$model', usd: { $sum: '$estimatedCost' } } },
      ]),
    ]);

    return res.status(200).json({
      status: 'success',
      data: {
        totalUsd: total[0]?.totalCost || 0,
        totalTokens: total[0]?.totalTokens || 0,
        byFeature: byFeature.reduce(
          (acc, item) => ({ ...acc, [item._id]: { usd: item.usd, calls: item.calls } }),
          {},
        ),
        byModel: byModel.reduce((acc, item) => ({ ...acc, [item._id]: { usd: item.usd } }), {}),
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};

export const insights = async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    // Gather relevant data based on question
    const stats = await Promise.all([
      Account.countDocuments(),
      Account.countDocuments({ status: 'Suspended' }),
      Slash.countDocuments({ status: 'open' }),
      Slash.countDocuments({ status: 'completed' }),
    ]);

    const response = await trackedCompletion(
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an AI analytics assistant for SlashIt, a Nigerian student group-buying platform. Answer the admin's question using the provided data. Be specific, actionable, and concise.`,
          },
          {
            role: 'user',
            content: `Question: ${question}\n\nPlatform Data:\n- Total Users: ${stats[0]}\n- Suspended Users: ${stats[1]}\n- Active Slashes: ${stats[2]}\n- Completed Slashes: ${stats[3]}\n\nAnswer based on this data. If the question requires data not provided, suggest what to track.`,
          },
        ],
        max_tokens: 500,
      },
      { feature: 'insights', userId: req.user?._id?.toString() || 'system' },
    );

    return res.status(200).json({
      status: 'success',
      data: {
        question,
        answer: response.choices[0].message.content,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ status: 'error', message: error.message });
  }
};
