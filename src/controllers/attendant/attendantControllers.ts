import { Request } from '../../utils/customRequest';
import { Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';
import { Slash, SlashStatus } from '../../models/slash';
import { IAttendant } from '../../models/hubAttendant';

const getTodayBounds = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const formatScheduleTime = (timeLimit: string | undefined, fallbackDate: Date) => {
  if (timeLimit && timeLimit.trim()) {
    return timeLimit;
  }
  return fallbackDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getDeliveryStatusLabel = (status: SlashStatus) => {
  switch (status) {
    case SlashStatus.PURCHASING:
      return 'Arriving Soon';
    case SlashStatus.PICKUP:
      return 'Arrived';
    case SlashStatus.COMPLETED:
      return 'Verified';
    default:
      return 'Pending';
  }
};

export const dashboard = async (req: Request, res: Response) => {
  try {
    if (req.userRole !== 'attendant') {
      return resSender(res, 403, 'fail', 'Only attendants can access this dashboard');
    }

    const attendant = req.user as IAttendant | null;
    if (!attendant || !attendant._id) {
      return resSender(res, 401, 'fail', 'Unauthorized');
    }

    if (!attendant.hub) {
      return resSender(res, 400, 'fail', 'Attendant is not assigned to a hub');
    }

    const { start, end } = getTodayBounds();
    const hubId = attendant.hub;

    const [awaitingDelivery, readyForPickup, activeSlashes, verifiedDeliveries, collectedTodayAgg] =
      await Promise.all([
        Slash.countDocuments({ hub: hubId, status: SlashStatus.PURCHASING }),
        Slash.countDocuments({ hub: hubId, status: SlashStatus.PICKUP }),
        Slash.countDocuments({
          hub: hubId,
          status: { $in: [SlashStatus.OPEN, SlashStatus.PURCHASING, SlashStatus.PICKUP] },
        }),
        Slash.countDocuments({ hub: hubId, status: SlashStatus.COMPLETED }),
        Slash.aggregate([
          {
            $match: {
              hub: hubId,
              updatedAt: { $gte: start, $lte: end },
              'joined.claimed': true,
            },
          },
          {
            $project: {
              claimedCount: {
                $size: {
                  $filter: {
                    input: '$joined',
                    as: 'item',
                    cond: { $eq: ['$$item.claimed', true] },
                  },
                },
              },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$claimedCount' },
            },
          },
        ]),
      ]);

    const collectedToday = collectedTodayAgg?.[0]?.total || 0;

    const todaySlashes = await Slash.find({
      hub: hubId,
      status: { $in: [SlashStatus.OPEN, SlashStatus.PURCHASING, SlashStatus.PICKUP] },
      createdAt: { $gte: start, $lte: end },
    })
      .populate('product', 'name quantity pricePerSlot totalValue')
      .populate('hub', 'name')
      .populate('createdBy', 'name')
      .sort({ createdAt: 1 })
      .lean();

    const schedule = todaySlashes.map((slash) => {
      const product = (slash.product as any) || {};
      const createdBy = slash.createdBy as any;
      const members = Array.isArray(slash.joined) ? slash.joined.length : 0;
      const time = formatScheduleTime(slash.timeLimit, slash.createdAt);
      const slashId = slash._id?.toString?.() ?? '';
      const shortId = slashId.slice(-4);
      let title = 'Collection Window Opens';
      let description = `${product.name ?? 'Product'} — Slash #${shortId}`;

      if (slash.status === SlashStatus.PURCHASING) {
        title = 'Delivery Expected';
        description = `${product.name ?? 'Product'} from ${(slash.hub as any)?.name ?? 'your hub'}`;
      }

      return {
        id: slashId,
        time,
        title,
        subtitle: description,
        members,
        status: slash.status,
        leader: createdBy?.name || 'Unknown',
      };
    });

    const activeDeliveriesData = await Slash.find({
      hub: hubId,
      status: { $in: [SlashStatus.PURCHASING, SlashStatus.PICKUP, SlashStatus.COMPLETED] },
    })
      .populate('product', 'name quantity pricePerSlot totalValue emoji')
      .populate('hub', 'name')
      .populate('createdBy', 'name')
      .lean();

    const activeDeliveries = activeDeliveriesData.map((slash) => {
      const product = (slash.product as any) || {};
      const createdBy = slash.createdBy as any;
      const collectedCount = Array.isArray(slash.joined)
        ? slash.joined.filter((item: any) => item.claimed).length
        : 0;
      const totalMembers = Array.isArray(slash.joined) ? slash.joined.length : 0;
      const pendingCount = Math.max(totalMembers - collectedCount, 0);
      const progress = totalMembers > 0 ? Math.round((collectedCount / totalMembers) * 100) : 0;
      const statusLabel = getDeliveryStatusLabel(slash.status);

      return {
        id: slash._id?.toString?.() ?? '',
        productName: product.name || 'Unknown product',
        package:
          totalMembers > 0
            ? `${totalMembers} slot${totalMembers === 1 ? '' : 's'}`
            : 'Unknown package',
        vendor: (slash.hub as any)?.name || 'Hub vendor',
        price: Number(product.totalValue ?? 0),
        leader: createdBy?.name || 'Unknown leader',
        statusLabel,
        collectedCount,
        pendingCount,
        progress,
        slashRef: `#${slash._id?.toString().slice(-4)}`,
      };
    });

    const dashboardData = {
      counts: {
        awaitingDelivery,
        readyForPickup,
        collectedToday,
        activeSlashes,
      },
      deliverySummary: {
        arriving: awaitingDelivery,
        arrived: readyForPickup,
        verified: verifiedDeliveries,
      },
      schedule,
      activeDeliveries,
    };

    return resSender(res, 200, 'success', 'Attendant dashboard fetched', null, dashboardData);
  } catch (error: any) {
    return errorHandler(error, res, 'Error fetching dashboard');
  }
};
