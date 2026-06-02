"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insights = exports.getCosts = exports.editAISettings = exports.getAdminAISettings = exports.getRadarLogs = exports.runsFoodRadar = exports.triggerFraud = exports.getFraudStats = exports.editFraudQueue = exports.getFraudQueue = exports.getRadarByUser = void 0;
const slash_1 = require("../../models/slash");
const FraudAssessment_1 = require("../../models/ai/FraudAssessment");
const account_1 = require("../../models/account");
const fraud_1 = require("../../utils/ai/fraud");
const radar_1 = require("../../utils/ai/radar");
const AILog_1 = require("../../models/ai/AILog");
const AISettings_1 = require("../../models/ai/AISettings");
const openai_1 = require("../../utils/ai/openai");
const getRadarByUser = async (req, res) => {
    try {
        const { hubId } = req.query;
        const slashes = await slash_1.Slash.find({ hub: hubId, status: 'open' })
            .populate('product')
            .sort({ createdAt: -1 })
            .limit(5);
        const deals = slashes.map((slash) => ({
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
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getRadarByUser = getRadarByUser;
const getFraudQueue = async (req, res) => {
    try {
        const assessments = await FraudAssessment_1.FraudAssessment.find({
            riskLevel: { $in: ['high', 'critical'] },
            adminAction: null,
        })
            .sort({ riskScore: -1 })
            .populate('userId', 'name email phone');
        return res.status(200).json({
            status: 'success',
            data: { total: assessments.length, assessments },
        });
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getFraudQueue = getFraudQueue;
const editFraudQueue = async (req, res) => {
    try {
        const { assessmentId } = req.params;
        const { action } = req.body;
        const adminId = req.user?._id;
        if (!['cleared', 'watching', 'blocked'].includes(action)) {
            return res.status(400).json({ status: 'fail', message: 'Invalid action' });
        }
        const assessment = await FraudAssessment_1.FraudAssessment.findById(assessmentId);
        if (!assessment) {
            return res.status(404).json({ status: 'fail', message: 'Assessment not found' });
        }
        if (action === 'blocked') {
            await account_1.Account.findByIdAndUpdate(assessment.userId, { status: 'Suspended' });
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
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.editFraudQueue = editFraudQueue;
const getFraudStats = async (req, res) => {
    try {
        const [total, critical, high, pending, resolvedToday] = await Promise.all([
            FraudAssessment_1.FraudAssessment.countDocuments(),
            FraudAssessment_1.FraudAssessment.countDocuments({ riskLevel: 'critical' }),
            FraudAssessment_1.FraudAssessment.countDocuments({ riskLevel: 'high' }),
            FraudAssessment_1.FraudAssessment.countDocuments({
                adminAction: null,
                riskLevel: { $in: ['high', 'critical'] },
            }),
            FraudAssessment_1.FraudAssessment.countDocuments({
                resolvedAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            }),
        ]);
        return res.status(200).json({
            status: 'success',
            data: { total, critical, high, pending, resolvedToday },
        });
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getFraudStats = getFraudStats;
const triggerFraud = async (req, res) => {
    try {
        const { userId, trigger } = req.body;
        const flags = await (0, fraud_1.runLayer1)(userId, trigger || 'manual', {});
        return res.status(200).json({
            status: 'success',
            message: 'Fraud analysis queued',
            data: { assessmentId: flags.length > 0 ? 'created' : 'none' },
        });
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.triggerFraud = triggerFraud;
const runsFoodRadar = async (req, res) => {
    try {
        const { hubId } = req.body;
        const result = await (0, radar_1.runFoodRadar)(hubId);
        return res.status(200).json({
            status: 'success',
            message: 'Radar run started',
            data: result,
        });
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.runsFoodRadar = runsFoodRadar;
const getRadarLogs = async (req, res) => {
    try {
        const logs = await AILog_1.AILog.find({ feature: 'radar' }).sort({ createdAt: -1 }).limit(20);
        const formattedLogs = logs.map((log) => ({
            runAt: log.createdAt,
            tokensUsed: log.inputTokens + log.outputTokens,
            estimatedCostUsd: log.estimatedCost,
        }));
        return res.status(200).json({
            status: 'success',
            data: { logs: formattedLogs },
        });
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getRadarLogs = getRadarLogs;
const getAdminAISettings = async (req, res) => {
    try {
        let settings = await AISettings_1.AISettings.findOne();
        if (!settings) {
            settings = await AISettings_1.AISettings.create({
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
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getAdminAISettings = getAdminAISettings;
const editAISettings = async (req, res) => {
    try {
        const updates = req.body;
        const adminId = req.user?._id;
        const settings = await AISettings_1.AISettings.findOneAndUpdate({}, { ...updates, updatedBy: adminId, updatedAt: new Date() }, { returnDocument: 'after', upsert: true });
        return res.status(200).json({
            status: 'success',
            message: 'AI settings updated',
            data: settings,
        });
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.editAISettings = editAISettings;
const getCosts = async (req, res) => {
    try {
        const { from, to } = req.query;
        const matchStage = {};
        if (from) {
            matchStage.createdAt = { $gte: new Date(from) };
        }
        if (to) {
            matchStage.createdAt = { ...matchStage.createdAt, $lte: new Date(to) };
        }
        const [total, byFeature, byModel] = await Promise.all([
            AILog_1.AILog.aggregate([
                { $match: matchStage },
                {
                    $group: {
                        _id: null,
                        totalCost: { $sum: '$estimatedCost' },
                        totalTokens: { $sum: '$inputTokens' },
                    },
                },
            ]),
            AILog_1.AILog.aggregate([
                { $match: matchStage },
                { $group: { _id: '$feature', usd: { $sum: '$estimatedCost' }, calls: { $sum: 1 } } },
            ]),
            AILog_1.AILog.aggregate([
                { $match: matchStage },
                { $group: { _id: '$model', usd: { $sum: '$estimatedCost' } } },
            ]),
        ]);
        return res.status(200).json({
            status: 'success',
            data: {
                totalUsd: total[0]?.totalCost || 0,
                totalTokens: total[0]?.totalTokens || 0,
                byFeature: byFeature.reduce((acc, item) => ({ ...acc, [item._id]: { usd: item.usd, calls: item.calls } }), {}),
                byModel: byModel.reduce((acc, item) => ({ ...acc, [item._id]: { usd: item.usd } }), {}),
            },
        });
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.getCosts = getCosts;
const insights = async (req, res) => {
    try {
        const { question } = req.body;
        // Gather relevant data based on question
        const stats = await Promise.all([
            account_1.Account.countDocuments(),
            account_1.Account.countDocuments({ status: 'Suspended' }),
            slash_1.Slash.countDocuments({ status: 'open' }),
            slash_1.Slash.countDocuments({ status: 'completed' }),
        ]);
        const response = await (0, openai_1.trackedCompletion)({
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
        }, { feature: 'insights', userId: req.user?._id?.toString() || 'system' });
        return res.status(200).json({
            status: 'success',
            data: {
                question,
                answer: response.choices[0].message.content,
            },
        });
    }
    catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};
exports.insights = insights;
