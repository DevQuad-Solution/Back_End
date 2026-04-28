"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dashboard = void 0;
const responseService_1 = require("../../utils/responseService");
const slash_1 = require("../../models/slash");
const getTodayBounds = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return { start, end };
};
const formatScheduleTime = (timeLimit, fallbackDate) => {
    if (timeLimit && timeLimit.trim()) {
        return timeLimit;
    }
    return fallbackDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
    });
};
const getDeliveryStatusLabel = (status) => {
    switch (status) {
        case slash_1.SlashStatus.PURCHASING:
            return 'Arriving Soon';
        case slash_1.SlashStatus.PICKUP:
            return 'Arrived';
        case slash_1.SlashStatus.COMPLETED:
            return 'Verified';
        default:
            return 'Pending';
    }
};
const dashboard = async (req, res) => {
    try {
        if (req.userRole !== 'attendant') {
            return (0, responseService_1.resSender)(res, 403, 'fail', 'Only attendants can access this dashboard');
        }
        const attendant = req.user;
        if (!attendant || !attendant._id) {
            return (0, responseService_1.resSender)(res, 401, 'fail', 'Unauthorized');
        }
        if (!attendant.hub) {
            return (0, responseService_1.resSender)(res, 400, 'fail', 'Attendant is not assigned to a hub');
        }
        const { start, end } = getTodayBounds();
        const hubId = attendant.hub;
        const [awaitingDelivery, readyForPickup, activeSlashes, verifiedDeliveries, collectedTodayAgg] = await Promise.all([
            slash_1.Slash.countDocuments({ hub: hubId, status: slash_1.SlashStatus.PURCHASING }),
            slash_1.Slash.countDocuments({ hub: hubId, status: slash_1.SlashStatus.PICKUP }),
            slash_1.Slash.countDocuments({
                hub: hubId,
                status: { $in: [slash_1.SlashStatus.OPEN, slash_1.SlashStatus.PURCHASING, slash_1.SlashStatus.PICKUP] },
            }),
            slash_1.Slash.countDocuments({ hub: hubId, status: slash_1.SlashStatus.COMPLETED }),
            slash_1.Slash.aggregate([
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
        const todaySlashes = await slash_1.Slash.find({
            hub: hubId,
            status: { $in: [slash_1.SlashStatus.OPEN, slash_1.SlashStatus.PURCHASING, slash_1.SlashStatus.PICKUP] },
            createdAt: { $gte: start, $lte: end },
        })
            .populate('product', 'name quantity pricePerSlot totalValue')
            .populate('hub', 'name')
            .populate('createdBy', 'name')
            .sort({ createdAt: 1 })
            .lean();
        const schedule = todaySlashes.map((slash) => {
            const product = slash.product || {};
            const createdBy = slash.createdBy;
            const members = Array.isArray(slash.joined) ? slash.joined.length : 0;
            const time = formatScheduleTime(slash.timeLimit, slash.createdAt);
            const slashId = slash._id?.toString?.() ?? '';
            const shortId = slashId.slice(-4);
            let title = 'Collection Window Opens';
            let description = `${product.name ?? 'Product'} — Slash #${shortId}`;
            if (slash.status === slash_1.SlashStatus.PURCHASING) {
                title = 'Delivery Expected';
                description = `${product.name ?? 'Product'} from ${slash.hub?.name ?? 'your hub'}`;
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
        const activeDeliveriesData = await slash_1.Slash.find({
            hub: hubId,
            status: { $in: [slash_1.SlashStatus.PURCHASING, slash_1.SlashStatus.PICKUP, slash_1.SlashStatus.COMPLETED] },
        })
            .populate('product', 'name quantity pricePerSlot totalValue emoji')
            .populate('hub', 'name')
            .populate('createdBy', 'name')
            .lean();
        const activeDeliveries = activeDeliveriesData.map((slash) => {
            const product = slash.product || {};
            const createdBy = slash.createdBy;
            const collectedCount = Array.isArray(slash.joined)
                ? slash.joined.filter((item) => item.claimed).length
                : 0;
            const totalMembers = Array.isArray(slash.joined) ? slash.joined.length : 0;
            const pendingCount = Math.max(totalMembers - collectedCount, 0);
            const progress = totalMembers > 0 ? Math.round((collectedCount / totalMembers) * 100) : 0;
            const statusLabel = getDeliveryStatusLabel(slash.status);
            return {
                id: slash._id?.toString?.() ?? '',
                productName: product.name || 'Unknown product',
                package: totalMembers > 0
                    ? `${totalMembers} slot${totalMembers === 1 ? '' : 's'}`
                    : 'Unknown package',
                vendor: slash.hub?.name || 'Hub vendor',
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
        return (0, responseService_1.resSender)(res, 200, 'success', 'Attendant dashboard fetched', null, dashboardData);
    }
    catch (error) {
        return (0, responseService_1.errorHandler)(error, res, 'Error fetching dashboard');
    }
};
exports.dashboard = dashboard;
