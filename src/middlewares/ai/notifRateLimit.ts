import Redis from 'ioredis';
import { Request } from '../../utils/customRequest';
import { NextFunction, Response } from 'express';
import { errorHandler, resSender } from '../../utils/responseService';

console.log('Redis Url: ', process.env.REDIS_URL);
const redis = new Redis(process.env.REDIS_URL!);
redis.on('connect', () => {
  console.log('Redis connected');
});

export const canNotify = async (userId: string, channel: string): Promise<boolean> => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const key = `notif:${userId}:${channel}:${today}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 86400);
    return count <= 2;
  } catch (error) {
    console.error('Redis error in canNotify:', error);
    return true; // Fail open
  }
};

export const notifRateLimitMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.user?._id;
  if (userId) {
    const allowed = await canNotify(userId.toString(), 'push');
    if (!allowed) {
      return res.status(429).json({
        status: 'fail',
        message: 'Daily notification limit reached',
      });
    }
  }
  next();
};
