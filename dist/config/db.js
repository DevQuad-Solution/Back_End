"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeAISettings = void 0;
exports.withTransaction = withTransaction;
exports.connectToDatabase = connectToDatabase;
exports.getMongoClient = getMongoClient;
exports.getDatabase = getDatabase;
exports.startMongoSession = startMongoSession;
const mongoose_1 = __importDefault(require("mongoose"));
const AISettings_1 = require("../models/ai/AISettings");
const settingsControllers_1 = require("../controllers/admin/settingsControllers");
// Create database connection cache
let cachedDb = null;
let cachedClient = null;
let cachedNativeDb = undefined;
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
        cachedClient = mongoose_1.default.connection.getClient();
        cachedNativeDb = mongoose_1.default.connection.db;
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
function getMongoClient() {
    if (cachedClient) {
        return cachedClient;
    }
    const client = mongoose_1.default.connection.getClient();
    if (!client) {
        throw new Error('MongoDB client is not initialized. Call connectToDatabase() first.');
    }
    cachedClient = client;
    return cachedClient;
}
function getDatabase() {
    if (cachedNativeDb) {
        return cachedNativeDb;
    }
    if (!mongoose_1.default.connection.db) {
        throw new Error('MongoDB database is not initialized. Call connectToDatabase() first.');
    }
    cachedNativeDb = mongoose_1.default.connection.db;
    return cachedNativeDb;
}
async function startMongoSession() {
    if (!cachedDb) {
        throw new Error('MongoDB is not connected. Call connectToDatabase() before starting a session.');
    }
    return mongoose_1.default.startSession();
}
/**
 * Executes a series of database operations within a MongoDB transaction.
 *
 * @param {Function} callback - An async callback function containing the operations to run.
 * @returns {Promise<T>} - Returns the result of the operations if successful.
 */
async function withTransaction(callback) {
    const session = await startMongoSession();
    try {
        let result;
        await session.withTransaction(async () => {
            result = await callback(session);
        });
        return result;
    }
    catch (error) {
        throw error; // Automatically aborts/rolls back inside withTransaction
    }
    finally {
        session.endSession();
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
// // Example of transaction
// const session = await startMongoSession();
// session.startTransaction();
// try {
//   await db
//     .collection('accounts')
//     .updateOne({ accountId: 'A' }, { $inc: { balance: -500 } }, { session });
//   await db
//     .collection('accounts')
//     .updateOne({ accountId: 'B' }, { $inc: { balance: 500 } }, { session });
//   await session.commitTransaction();
// } catch (error) {
//   await session.abortTransaction();
//   throw error;
// } finally {
//   session.endSession();
// }
