import { AISettings } from '../../models/ai/AISettings';
import { Slash } from '../../models/slash';
import { Account } from '../../models/account';
import { Product } from '../../models/product';
import { trackedCompletion } from './openai';
import { addNotification } from '../../utils/notificationService';
import { canNotify } from '../../middlewares/ai/notifRateLimit';

interface RadarScoreResult {
  score: number;
  breakdown: {
    priceVsMarket: number;
    fillUrgency: number;
    pastPopularity: number;
    userAffinity: number;
  };
}

const computeRadarScore = async (
  slash: any,
  product: any,
  userAffinityCategory: string | null = null,
): Promise<RadarScoreResult> => {
  // Price vs market (35%)
  const avgPriceForCategory = await Product.aggregate([
    { $match: { category: product.category, status: 'Active' } },
    { $group: { _id: null, avgPrice: { $avg: '$pricePerSlot' } } },
  ]);
  const avgPrice = avgPriceForCategory[0]?.avgPrice || product.pricePerSlot;
  const priceScore = Math.max(0, 35 * (1 - product.pricePerSlot / avgPrice));

  // Fill urgency (25%)
  const fillRate = slash.joined.length / product.noOfSlots;
  const timeLeft =
    Math.max(0, new Date(slash.expiresAt || slash.createdAt).getTime() - Date.now()) /
    (1000 * 60 * 60);
  const urgencyScore = 25 * fillRate * Math.max(0, 1 - timeLeft / 24);

  // Past popularity (20%) - simplified
  const popularityScore = 20 * Math.min(1, product.orders / 100);

  // User affinity (20%)
  let affinityScore = 0;
  if (userAffinityCategory && userAffinityCategory === product.category) {
    affinityScore = 20;
  } else if (userAffinityCategory) {
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

const generateRadarCopy = async (
  slash: any,
  product: any,
  user: any,
  score: number,
): Promise<string> => {
  const slotsLeft = product.noOfSlots - slash.joined.length;
  const response = await trackedCompletion(
    {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `Write a short, urgent push notification (max 2 sentences) for a Nigerian university student. Deal: ${product.name} at ₦${product.pricePerSlot}/slot. ${slotsLeft} slots left. Deadline: ${slash.timeLimit || 'soon'}. Campus city: ${(slash.hub as any)?.city || 'your campus'}. Radar score: ${score}/100. Rules: Be exciting like a classmate texting you, not a company. No emojis. Mention the product name and price. Create urgency without being spammy.`,
        },
      ],
      max_tokens: 80,
    },
    { feature: 'radar', userId: user._id.toString() },
  );

  return (
    response.choices[0].message.content ||
    `🔥 ${product.name} at ₦${product.pricePerSlot}/slot! Only ${slotsLeft} slots left!`
  );
};

export const runFoodRadar = async (hubId?: string) => {
  const settings = await AISettings.findOne();
  if (!settings?.radarEnabled) return { slashesScored: 0, notificationsSent: 0 };

  const query: any = { status: 'open' };
  if (hubId) query.hub = hubId;

  const slashes = await Slash.find(query).populate('product').populate('hub');

  let slashesScored = 0;
  let notificationsSent = 0;

  for (const slash of slashes) {
    const product = slash.product as any;
    if (!product) continue;

    // Get top user affinity from user preferences (simplified - would need UserPreference model)
    const candidates = await Account.find({
      hub: slash.hub,
      _id: { $nin: slash.joined.map((j: any) => j.user) },
    }).limit(200);

    for (const user of candidates) {
      const canSend = await canNotify(user._id.toString(), 'push');
      if (!canSend) continue;

      const radarScore = await computeRadarScore(slash, product, null); // Would use user.preferences.category
      if (radarScore.score < (settings.minRadarScore || 60)) continue;

      const message = await generateRadarCopy(slash, product, user, radarScore.score);

      await addNotification('Radar Pick 📡', message, [user._id]);
      notificationsSent++;
      slashesScored++;
    }
  }

  return { slashesScored, notificationsSent };
};
