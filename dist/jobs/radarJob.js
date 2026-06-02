"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopRadarJob = exports.startRadarJob = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const radar_1 = require("../utils/ai/radar");
const AISettings_1 = require("../models/ai/AISettings");
const startRadarJob = () => {
    // Run every 4 hours: 0 */4 * * *
    node_cron_1.default.schedule('0 */4 * * *', async () => {
        console.log('[Radar Job] Starting scheduled run at', new Date().toISOString());
        try {
            await (0, radar_1.runFoodRadar)();
            console.log('[Radar Job] Completed successfully');
        }
        catch (err) {
            console.error('[Radar Job] Failed:', err.message);
        }
    });
    // Reset AI budget pause at midnight every day
    node_cron_1.default.schedule('0 0 * * *', async () => {
        await AISettings_1.AISettings.findOneAndUpdate({}, { pausedForBudget: false });
        console.log('[AI Guard] Daily budget reset');
    });
    console.log('[Radar Job] Cron scheduled --- runs every 4 hours');
};
exports.startRadarJob = startRadarJob;
const stopRadarJob = () => {
    // For testing purposes - get all tasks and stop them
    const tasks = node_cron_1.default.getTasks();
    tasks.forEach((task) => task.stop());
};
exports.stopRadarJob = stopRadarJob;
