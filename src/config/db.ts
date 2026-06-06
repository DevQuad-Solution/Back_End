import mongoose from 'mongoose';
import { AISettings } from '../models/ai/AISettings';
import { initializeSettings } from '../controllers/admin/settingsControllers';
import type { Db, MongoClient, ClientSession } from 'mongodb';

// Create database connection cache
let cachedDb: typeof mongoose | null = null;
let cachedClient: MongoClient | null = null;
let cachedNativeDb: Db | undefined = undefined;

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
    cachedClient = mongoose.connection.getClient();
    cachedNativeDb = mongoose.connection.db;
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

function getMongoClient(): MongoClient {
  if (cachedClient) {
    return cachedClient;
  }

  const client = mongoose.connection.getClient();
  if (!client) {
    throw new Error('MongoDB client is not initialized. Call connectToDatabase() first.');
  }

  cachedClient = client;
  return cachedClient;
}

function getDatabase(): Db {
  if (cachedNativeDb) {
    return cachedNativeDb;
  }

  if (!mongoose.connection.db) {
    throw new Error('MongoDB database is not initialized. Call connectToDatabase() first.');
  }

  cachedNativeDb = mongoose.connection.db;
  return cachedNativeDb;
}

async function startMongoSession(): Promise<ClientSession> {
  if (!cachedDb) {
    throw new Error(
      'MongoDB is not connected. Call connectToDatabase() before starting a session.',
    );
  }
  return mongoose.startSession();
}

/**
 * Executes a series of database operations within a MongoDB transaction.
 *
 * @param {Function} callback - An async callback function containing the operations to run.
 * @returns {Promise<T>} - Returns the result of the operations if successful.
 */
export async function withTransaction<T>(
  callback: (session: ClientSession) => Promise<T>,
): Promise<T> {
  const session = await startMongoSession();

  try {
    let result: T;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result!;
  } catch (error) {
    throw error; // Automatically aborts/rolls back inside withTransaction
  } finally {
    session.endSession();
  }
}

export { connectToDatabase, getMongoClient, getDatabase, startMongoSession };
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