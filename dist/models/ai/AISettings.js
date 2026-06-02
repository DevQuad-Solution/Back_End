"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AISettings = void 0;
const mongoose_1 = require("mongoose");
const aiSettingsSchema = new mongoose_1.Schema({
    radarEnabled: { type: Boolean, default: true },
    fraudEnabled: { type: Boolean, default: true },
    retentionEnabled: { type: Boolean, default: false },
    dailyBudgetUsd: { type: Number, default: 10 },
    pausedForBudget: { type: Boolean, default: false },
    minRadarScore: { type: Number, default: 60 },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Admin' },
}, { timestamps: true });
exports.AISettings = (0, mongoose_1.model)('AISettings', aiSettingsSchema);
