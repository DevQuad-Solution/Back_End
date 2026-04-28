"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const otpSchema = new mongoose_1.Schema({
    email: {
        type: String,
        required: true, // Ensure user email is always required
    },
    otp: {
        type: String,
        required: true,
    },
    reason: {
        type: String,
        required: true,
    },
    expiresAt: {
        type: Date,
        required: true,
    },
}, { timestamps: true });
// TTL index for expiration
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Automatically delete expired OTPs
exports.default = (0, mongoose_1.model)("OTP", otpSchema);
