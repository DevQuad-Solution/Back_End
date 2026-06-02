"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiGuardMiddleware = exports.checkBudget = void 0;
const AILog_1 = require("../../models/ai/AILog");
const AISettings_1 = require("../../models/ai/AISettings");
const checkBudget = async () => {
    const today = new Date().toISOString().slice(0, 10);
    const todaySpend = await AILog_1.AILog.aggregate([
        { $match: { createdAt: { $gte: new Date(today) }, success: true } },
        { $group: { _id: null, total: { $sum: '$estimatedCost' } } },
    ]);
    const spent = todaySpend[0]?.total || 0;
    const settings = await AISettings_1.AISettings.findOne();
    const budget = settings?.dailyBudgetUsd || 10;
    if (spent >= budget) {
        await AISettings_1.AISettings.findOneAndUpdate({}, { pausedForBudget: true });
        console.warn(`[AI GUARD] Daily budget $${budget} reached. Spent: $${spent.toFixed(4)}`);
        return false;
    }
    return true;
};
exports.checkBudget = checkBudget;
const aiGuardMiddleware = async (req, res, next) => {
    const budgetOk = await (0, exports.checkBudget)();
    if (!budgetOk) {
        return res.status(429).json({
            status: 'fail',
            message: 'AI service temporarily unavailable - daily budget reached',
        });
    }
    next();
};
exports.aiGuardMiddleware = aiGuardMiddleware;
