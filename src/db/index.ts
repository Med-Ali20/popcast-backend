import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.DB_CONNECTION_STRING;

if (!uri) {
  throw new Error('DB_CONNECTION_STRING environment variable is required');
}

const clientOptions = { 
  serverApi: { 
    version: '1' as const, 
    strict: true, 
    deprecationErrors: true 
  } 
};

export async function connectToDatabase() {
  try {
    await mongoose.connect(uri || '', clientOptions);
    await mongoose.connection.db?.admin().command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error('Database connection failed:', error);
    throw error;
  }
}

export async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
  }
}

// If you want to run this file directly for testing
export async function testConnection() {
  try {
    await connectToDatabase();
    console.log('Connection test successful!');
  } finally {
    await disconnectFromDatabase();
  }
}