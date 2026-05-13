"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Waitlist = void 0;
const mongoose_1 = require("mongoose");
const waitlistSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    phone: { type: String, required: true },
    campus: { type: String, required: true },
}, { timestamps: true });
const Waitlist = (0, mongoose_1.model)('Waitlist', waitlistSchema);
exports.Waitlist = Waitlist;
