import { AILog } from '../../models/ai/AILog';
import { AISettings } from '../../models/ai/AISettings';
import { Request } from '../../utils/customRequest';
import { Response, NextFunction } from 'express';

export const checkBudget = async (): Promise<boolean> => {
  const today = new Date().toISOString().slice(0, 10);
  const todaySpend = await AILog.aggregate([
    { $match: { createdAt: { $gte: new Date(today) }, success: true } },
    { $group: { _id: null, total: { $sum: '$estimatedCost' } } },
  ]);

  const spent = todaySpend[0]?.total || 0;
  const settings = await AISettings.findOne();
  const budget = settings?.dailyBudgetUsd || 10;

  if (spent >= budget) {
    await AISettings.findOneAndUpdate({}, { pausedForBudget: true });
    console.warn(`[AI GUARD] Daily budget $${budget} reached. Spent: $${spent.toFixed(4)}`);
    return false;
  }

  return true;
};

export const aiGuardMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const budgetOk = await checkBudget();
  if (!budgetOk) {
    return res.status(429).json({
      status: 'fail',
      message: 'AI service temporarily unavailable - daily budget reached',
    });
  }
  next();
};
