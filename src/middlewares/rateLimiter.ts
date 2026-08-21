import rateLimit from 'express-rate-limit';

export const createRateLimiter = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: message || 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Moderate per-minute/default rate limits for different route groups
export const authRateLimit = createRateLimiter(60 * 1000, 10); // 10 requests per minute (auth endpoints)
export const reqRateLimit = createRateLimiter(200 * 1000, 60); // 60 requests per minute (global API)
export const adminRateLimit = createRateLimiter(60 * 1000, 30); // 30 requests per minute (admin)
export const aiRateLimit = createRateLimiter(60 * 1000, 5, 'AI requests too frequent'); // 5 requests per minute (AI features)
export const productRateLimit = createRateLimiter(60 * 1000, 60); // 60 requests per minute (product listing)
export const slashRateLimit = createRateLimiter(60 * 1000, 40); // 40 requests per minute (slashes)
export const notificationRateLimit = createRateLimiter(60 * 1000, 20); // 20 requests per minute (notifications)
export const transactionRateLimit = createRateLimiter(60 * 1000, 30); // 30 requests per minute (transactions)
export const attendantRateLimit = createRateLimiter(60 * 1000, 30); // 30 requests per minute (attendant)
export const hubRateLimit = createRateLimiter(60 * 1000, 60); // 60 requests per minute (hub lookups)
