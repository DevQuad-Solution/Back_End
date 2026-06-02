import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';
import { AISettings } from '../models/ai/AISettings';
import { initializeSettings } from '../controllers/admin/settingsControllers';

// Create database connection cache
let cachedDb: typeof mongoose | null = null;

// const client = new MongoClient(dbUri);

async function connectToDatabase(): Promise<typeof mongoose> {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const dbUri =
      process.env.NODE_ENV === 'production'
        ? process.env.LIVE_MONGO_URI!
        : process.env.MONGODB_URI!;
    if (!dbUri) {
      throw new Error('MongoDB URI is not defined');
    }

    const db = await mongoose.connect(dbUri, {
      dbName: process.env.NODE_ENV === 'production' ? 'production' : undefined,
    });
    cachedDb = db;
    console.log('⚡️[server]: Connected to MongoDB');

    // Initialize AI settings
    initializeAISettings();
    // Initialize Platform Setting
    await initializeSettings();
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
export default connectToDatabase;
// export { client };

// Initialize AI settings
export const initializeAISettings = async () => {
  const existing = await AISettings.findOne();
  if (!existing) {
    await AISettings.create({
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
