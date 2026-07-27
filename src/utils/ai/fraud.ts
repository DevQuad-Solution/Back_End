import Bull from 'bull';
import { Account } from '../../models/account';
import { FraudAssessment } from '../../models/ai/FraudAssessment';
import { Slash } from '../../models/slash';
import { trackedCompletion } from './openai';
import { addNotification } from '../../utils/notificationService';
import { TransactionHistory as Transaction } from '../../models/transaction';
import { Types } from 'mongoose';
import { isEncryptedTextMatch } from '../encryption';

const redisUrl = process.env.REDIS_URL?.replace(/^['"]|['"]$/g, '');
const fraudQueue = new Bull('fraud-analysis', redisUrl!);

interface Layer1Context {
  nin?: string;
  amount?: number;
  slash?: any;
  deviceId?: string;
}

export const runLayer1 = async (userId: string, trigger: string, context: Layer1Context) => {
  const flags: string[] = [];
  const user = await Account.findById(userId);

  if (!user) return flags;

  // Rule: duplicate NIN
  if (trigger === 'kyc_submit' && context.nin) {
    const existing = await Account.find({
      _id: { $ne: userId },
      'kyc.nin': { $exists: true, $ne: null },
    }).select('_id kyc.nin');

    const duplicateNin = existing.some((account) => isEncryptedTextMatch(context.nin!, account.kyc?.nin));
    if (duplicateNin) flags.push('duplicate_nin');
  }

  // Rule: rapid fund + withdraw
  if (trigger === 'wallet_topup') {
    const recentWithdraw = await Transaction.findOne({
      user: userId,
      type: 'withdraw',
      createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) },
    });
    if (recentWithdraw) flags.push('rapid_fund_withdraw');
  }

  // Rule: new account joining high-value slash
  if (trigger === 'slash_join' && context.slash) {
    const ageMs = Date.now() - new Date(user.createdAt).getTime();
    if (ageMs < 3600000 && context.slash.pricePerSlot > 5000) {
      flags.push('new_account_high_slash');
    }
  }

  // If any flag triggered, create assessment and queue Layer 2
  if (flags.length > 0) {
    const assessment = await FraudAssessment.create({
      userId,
      trigger,
      flags,
      layer: 1,
      riskScore: flags.length * 25,
      riskLevel: flags.length >= 3 ? 'critical' : flags.length >= 2 ? 'high' : 'medium',
      recommendation: flags.includes('duplicate_nin') ? 'block' : 'monitor',
    });

    // Queue Layer 2 GPT analysis
    await fraudQueue.add({ userId, assessmentId: assessment._id, flags, trigger });
  }

  return flags;
};

// Layer 2 worker
fraudQueue.process(async (job) => {
  const { userId, assessmentId, flags, trigger } = job.data;

  const user = await Account.findById(userId);
  if (!user) return;

  const [transactions, slashHistory] = await Promise.all([
    Transaction.find({ user: userId }).limit(30).sort({ createdAt: -1 }),
    Slash.find({ 'joined.userId': userId }).limit(20).select('pricePerSlot status createdAt'),
  ]);

  const anonymizedContext = {
    userId: userId.toString().slice(-6),
    accountAgeDays: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000),
    totalTransactions: transactions.length,
    walletBalance_bucket:
      user.walletBalance > 10000 ? 'high' : user.walletBalance > 2000 ? 'medium' : 'low',
    slashesJoined: slashHistory.length,
    flags,
    trigger,
  };

  try {
    const response = await trackedCompletion(
      {
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are a fraud analyst for a Nigerian student group-buying platform. Analyse anonymised user behaviour and return ONLY a JSON object with these exact keys: riskScore (0-100), riskLevel ('low'|'medium'|'high'|'critical'), recommendation ('allow'|'monitor'|'hold'|'block'), reasoning (string, max 150 words explaining the risk in plain English for a non-technical admin).`,
          },
          {
            role: 'user',
            content: JSON.stringify(anonymizedContext),
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 300,
      },
      { feature: 'fraud', userId: 'system' },
    );

    const result = JSON.parse(response.choices[0].message.content || '{}');

    await FraudAssessment.findByIdAndUpdate(assessmentId, {
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      recommendation: result.recommendation,
      reasoning: result.reasoning,
      layer: 2,
    });

    // Auto-action if critical
    if (result.recommendation === 'block') {
      await Account.findByIdAndUpdate(userId, { status: 'Suspended' });
      await addNotification(
        'Fraud Alert',
        `User ${userId} has been blocked due to fraud detection`,
        [new Types.ObjectId('admin')],
      );
    }

    if (result.recommendation === 'hold') {
      // Implement wallet hold logic if needed
    }

    if (result.riskLevel !== 'low') {
      await addNotification(
        'Fraud Flag',
        `User ${userId} flagged with risk level ${result.riskLevel}`,
        [new Types.ObjectId('admin')],
      );
    }
  } catch (error) {
    console.error('Layer 2 analysis failed:', error);
  }
});

export { fraudQueue };
