"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runFoodRadar = void 0;
const AISettings_1 = require("../../models/ai/AISettings");
const slash_1 = require("../../models/slash");
const account_1 = require("../../models/account");
const product_1 = require("../../models/product");
const openai_1 = require("./openai");
const notificationService_1 = require("../../utils/notificationService");
const notifRateLimit_1 = require("../../middlewares/ai/notifRateLimit");
const computeRadarScore = async (slash, product, userAffinityCategory = null) => {
    // Price vs market (35%)
    const avgPriceForCategory = await product_1.Product.aggregate([
        { $match: { category: product.category, status: 'Active' } },
        { $group: { _id: null, avgPrice: { $avg: '$pricePerSlot' } } },
    ]);
    const avgPrice = avgPriceForCategory[0]?.avgPrice || product.pricePerSlot;
    const priceScore = Math.max(0, 35 * (1 - product.pricePerSlot / avgPrice));
    // Fill urgency (25%)
    const fillRate = slash.joined.length / product.noOfSlots;
    const timeLeft = Math.max(0, new Date(slash.expiresAt || slash.createdAt).getTime() - Date.now()) /
        (1000 * 60 * 60);
    const urgencyScore = 25 * fillRate * Math.max(0, 1 - timeLeft / 24);
    // Past popularity (20%) - simplified
    const popularityScore = 20 * Math.min(1, product.orders / 100);
    // User affinity (20%)
    let affinityScore = 0;
    if (userAffinityCategory && userAffinityCategory === product.category) {
        affinityScore = 20;
    }
    else if (userAffinityCategory) {
        affinityScore = 10;
    }
    const totalScore = priceScore + urgencyScore + popularityScore + affinityScore;
    return {
        score: Math.min(100, totalScore),
        breakdown: {
            priceVsMarket: priceScore,
            fillUrgency: urgencyScore,
            pastPopularity: popularityScore,
            userAffinity: affinityScore,
        },
    };
};
const generateRadarCopy = async (slash, product, user, score) => {
    const slotsLeft = product.noOfSlots - slash.joined.length;
    const response = await (0, openai_1.trackedCompletion)({
        model: 'gpt-4o-mini',
        messages: [
            {
                role: 'user',
                content: `Write a short, urgent push notification (max 2 sentences) for a Nigerian university student. Deal: ${product.name} at ₦${product.pricePerSlot}/slot. ${slotsLeft} slots left. Deadline: ${slash.timeLimit || 'soon'}. Campus city: ${slash.hub?.city || 'your campus'}. Radar score: ${score}/100. Rules: Be exciting like a classmate texting you, not a company. No emojis. Mention the product name and price. Create urgency without being spammy.`,
            },
        ],
        max_tokens: 80,
    }, { feature: 'radar', userId: user._id.toString() });
    return (response.choices[0].message.content ||
        `🔥 ${product.name} at ₦${product.pricePerSlot}/slot! Only ${slotsLeft} slots left!`);
};
const runFoodRadar = async (hubId) => {
    const settings = await AISettings_1.AISettings.findOne();
    if (!settings?.radarEnabled)
        return { slashesScored: 0, notificationsSent: 0 };
    const query = { status: 'open' };
    if (hubId)
        query.hub = hubId;
    const slashes = await slash_1.Slash.find(query).populate('product').populate('hub');
    let slashesScored = 0;
    let notificationsSent = 0;
    for (const slash of slashes) {
        const product = slash.product;
        if (!product)
            continue;
        // Get top user affinity from user preferences (simplified - would need UserPreference model)
        const candidates = await account_1.Account.find({
            hub: slash.hub,
            _id: { $nin: slash.joined.map((j) => j.user) },
        }).limit(200);
        for (const user of candidates) {
            const canSend = await (0, notifRateLimit_1.canNotify)(user._id.toString(), 'push');
            if (!canSend)
                continue;
            const radarScore = await computeRadarScore(slash, product, null); // Would use user.preferences.category
            if (radarScore.score < (settings.minRadarScore || 60))
                continue;
            const message = await generateRadarCopy(slash, product, user, radarScore.score);
            await (0, notificationService_1.addNotification)('Radar Pick 📡', message, [user._id]);
            notificationsSent++;
            slashesScored++;
        }
    }
    return { slashesScored, notificationsSent };
};
exports.runFoodRadar = runFoodRadar;
