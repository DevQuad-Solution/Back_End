"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fraudQueue = exports.runLayer1 = void 0;
const bull_1 = __importDefault(require("bull"));
const account_1 = require("../../models/account");
const FraudAssessment_1 = require("../../models/ai/FraudAssessment");
const slash_1 = require("../../models/slash");
const openai_1 = require("./openai");
const notificationService_1 = require("../../utils/notificationService");
const transaction_1 = require("../../models/transaction");
const mongoose_1 = require("mongoose");
const redisUrl = process.env.REDIS_URL?.replace(/^['"]|['"]$/g, '');
const fraudQueue = new bull_1.default('fraud-analysis', redisUrl);
exports.fraudQueue = fraudQueue;
const runLayer1 = async (userId, trigger, context) => {
    const flags = [];
    const user = await account_1.Account.findById(userId);
    if (!user)
        return flags;
    // Rule: duplicate NIN
    if (trigger === 'kyc_submit' && context.nin) {
        const existing = await account_1.Account.findOne({ 'kyc.nin': context.nin, _id: { $ne: userId } });
        if (existing)
            flags.push('duplicate_nin');
    }
    // Rule: rapid fund + withdraw
    if (trigger === 'wallet_topup') {
        const recentWithdraw = await transaction_1.TransactionHistory.findOne({
            user: userId,
            type: 'withdraw',
            createdAt: { $gt: new Date(Date.now() - 10 * 60 * 1000) },
        });
        if (recentWithdraw)
            flags.push('rapid_fund_withdraw');
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
        const assessment = await FraudAssessment_1.FraudAssessment.create({
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
exports.runLayer1 = runLayer1;
// Layer 2 worker
fraudQueue.process(async (job) => {
    const { userId, assessmentId, flags, trigger } = job.data;
    const user = await account_1.Account.findById(userId);
    if (!user)
        return;
    const [transactions, slashHistory] = await Promise.all([
        transaction_1.TransactionHistory.find({ user: userId }).limit(30).sort({ createdAt: -1 }),
        slash_1.Slash.find({ 'joined.userId': userId }).limit(20).select('pricePerSlot status createdAt'),
    ]);
    const anonymizedContext = {
        userId: userId.toString().slice(-6),
        accountAgeDays: Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000),
        totalTransactions: transactions.length,
        walletBalance_bucket: user.walletBalance > 10000 ? 'high' : user.walletBalance > 2000 ? 'medium' : 'low',
        slashesJoined: slashHistory.length,
        flags,
        trigger,
    };
    try {
        const response = await (0, openai_1.trackedCompletion)({
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
        }, { feature: 'fraud', userId: 'system' });
        const result = JSON.parse(response.choices[0].message.content || '{}');
        await FraudAssessment_1.FraudAssessment.findByIdAndUpdate(assessmentId, {
            riskScore: result.riskScore,
            riskLevel: result.riskLevel,
            recommendation: result.recommendation,
            reasoning: result.reasoning,
            layer: 2,
        });
        // Auto-action if critical
        if (result.recommendation === 'block') {
            await account_1.Account.findByIdAndUpdate(userId, { status: 'Suspended' });
            await (0, notificationService_1.addNotification)('Fraud Alert', `User ${userId} has been blocked due to fraud detection`, [new mongoose_1.Types.ObjectId('admin')]);
        }
        if (result.recommendation === 'hold') {
            // Implement wallet hold logic if needed
        }
        if (result.riskLevel !== 'low') {
            await (0, notificationService_1.addNotification)('Fraud Flag', `User ${userId} flagged with risk level ${result.riskLevel}`, [new mongoose_1.Types.ObjectId('admin')]);
        }
    }
    catch (error) {
        console.error('Layer 2 analysis failed:', error);
    }
});
