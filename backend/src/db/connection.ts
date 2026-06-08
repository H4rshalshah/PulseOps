import mongoose from 'mongoose';
import { config } from '../config';
import { seedMemoryStore } from './memoryStore';
import winston from 'winston';

const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

let initialized = false;
let usingMemoryStore = false;

export async function initializeDatabase(): Promise<void> {
  if (initialized) return;

  try {
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    usingMemoryStore = false;
    logger.info('Connected to MongoDB database');
  } catch (error) {
    usingMemoryStore = true;
    seedMemoryStore();
    logger.warn('Failed to connect to MongoDB; using in-memory demo store', {
      error: error instanceof Error ? error.message : error,
    });
  }

  initialized = true;
}

export function isDatabaseInitialized(): boolean {
  return initialized;
}

export function isUsingMemoryStore(): boolean {
  return usingMemoryStore;
}

export async function checkDatabaseHealth(): Promise<boolean> {
  if (usingMemoryStore) return true;
  if (mongoose.connection.readyState !== 1) return false;
  await mongoose.connection.db?.admin().ping();
  return true;
}

export async function closeDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  initialized = false;
}
