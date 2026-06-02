"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAISettings = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const AISettings_1 = require("../models/ai/AISettings");
const settingsControllers_1 = require("../controllers/admin/settingsControllers");
// Create database connection cache
let cachedDb = null;
// const client = new MongoClient(dbUri);
async function connectToDatabase() {
    if (cachedDb) {
        return cachedDb;
    }
    try {
        const dbUri = process.env.NODE_ENV === 'production'
            ? process.env.LIVE_MONGO_URI
            : process.env.MONGODB_URI;
        if (!dbUri) {
            throw new Error('MongoDB URI is not defined');
        }
        const db = await mongoose_1.default.connect(dbUri, {
            dbName: process.env.NODE_ENV === 'production' ? 'production' : undefined,
        });
        cachedDb = db;
        console.log('⚡️[server]: Connected to MongoDB');
        // Initialize AI settings
        (0, exports.initializeAISettings)();
        // Initialize Platform Setting
        await (0, settingsControllers_1.initializeSettings)();
        return db;
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}
exports.default = connectToDatabase;
// export { client };
// Initialize AI settings
const initializeAISettings = async () => {
    const existing = await AISettings_1.AISettings.findOne();
    if (!existing) {
        await AISettings_1.AISettings.create({
            radarEnabled: process.env.AI_RADAR_ENABLED === 'true',
            fraudEnabled: process.env.AI_FRAUD_ENABLED === 'true',
            retentionEnabled: process.env.AI_RETENTION_ENABLED === 'true',
            dailyBudgetUsd: Number(process.env.AI_DAILY_BUDGET_USD) || 10,
            pausedForBudget: false,
            minRadarScore: 60,
        });
        console.log('[AI] Default settings initialized');
    }
};
exports.initializeAISettings = initializeAISettings;
