"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifRateLimitMiddleware = exports.canNotify = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const redisUrl = process.env.REDIS_URL?.replace(/^['"]|['"]$/g, '');
console.log(JSON.stringify(redisUrl));
const redis = new ioredis_1.default(redisUrl);
redis.on('connect', () => {
    console.log('Redis connected');
});
const canNotify = async (userId, channel) => {
    try {
        const today = new Date().toISOString().slice(0, 10);
        const key = `notif:${userId}:${channel}:${today}`;
        const count = await redis.incr(key);
        if (count === 1)
            await redis.expire(key, 86400);
        return count <= 2;
    }
    catch (error) {
        console.error('Redis error in canNotify:', error);
        return true; // Fail open
    }
};
exports.canNotify = canNotify;
const notifRateLimitMiddleware = async (req, res, next) => {
    const userId = req.user?._id;
    if (userId) {
        const allowed = await (0, exports.canNotify)(userId.toString(), 'push');
        if (!allowed) {
            return res.status(429).json({
                status: 'fail',
                message: 'Daily notification limit reached',
            });
        }
    }
    next();
};
exports.notifRateLimitMiddleware = notifRateLimitMiddleware;
