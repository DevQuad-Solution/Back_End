import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

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
    return db;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    throw error;
  }
}
export default connectToDatabase;
// export { client };
