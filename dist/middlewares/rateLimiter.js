"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reqRateLimit = exports.authRateLimit = exports.createRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const createRateLimiter = (windowMs, max) => {
    return (0, express_rate_limit_1.default)({
        windowMs,
        max,
        message: 'Too many requests from this IP, please try again later.',
        standardHeaders: true,
        legacyHeaders: false,
        validate: { xForwardedForHeader: false },
    });
};
exports.createRateLimiter = createRateLimiter;
// Rate limiters for different endpoints
exports.authRateLimit = (0, exports.createRateLimiter)(15 * 60 * 1000, 10); // 10 requests per 15 minutes
exports.reqRateLimit = (0, exports.createRateLimiter)(60 * 1000, 10); // 30 requests per minute
