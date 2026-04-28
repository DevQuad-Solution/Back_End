"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
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
        const db = await mongoose_1.default.connect(dbUri);
        cachedDb = db;
        console.log('⚡️[server]: Connected to MongoDB');
        return db;
    }
    catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}
exports.default = connectToDatabase;
// export { client };
