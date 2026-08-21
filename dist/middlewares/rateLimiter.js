"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hubRateLimit = exports.attendantRateLimit = exports.transactionRateLimit = exports.notificationRateLimit = exports.slashRateLimit = exports.productRateLimit = exports.aiRateLimit = exports.adminRateLimit = exports.reqRateLimit = exports.authRateLimit = exports.createRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const createRateLimiter = (windowMs, max, message) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: message || 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
    });
};
exports.createRateLimiter = createRateLimiter;
// Moderate per-minute/default rate limits for different route groups
exports.authRateLimit = (0, exports.createRateLimiter)(60 * 1000, 10); // 10 requests per minute (auth endpoints)
exports.reqRateLimit = (0, exports.createRateLimiter)(200 * 1000, 60); // 60 requests per minute (global API)
exports.adminRateLimit = (0, exports.createRateLimiter)(60 * 1000, 30); // 30 requests per minute (admin)
exports.aiRateLimit = (0, exports.createRateLimiter)(60 * 1000, 5, 'AI requests too frequent'); // 5 requests per minute (AI features)
exports.productRateLimit = (0, exports.createRateLimiter)(60 * 1000, 60); // 60 requests per minute (product listing)
exports.slashRateLimit = (0, exports.createRateLimiter)(60 * 1000, 40); // 40 requests per minute (slashes)
exports.notificationRateLimit = (0, exports.createRateLimiter)(60 * 1000, 20); // 20 requests per minute (notifications)
exports.transactionRateLimit = (0, exports.createRateLimiter)(60 * 1000, 30); // 30 requests per minute (transactions)
exports.attendantRateLimit = (0, exports.createRateLimiter)(60 * 1000, 30); // 30 requests per minute (attendant)
exports.hubRateLimit = (0, exports.createRateLimiter)(60 * 1000, 60); // 60 requests per minute (hub lookups)
