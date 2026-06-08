import { Router } from 'express';
import IORedis from 'ioredis';
import { checkDatabaseHealth, isUsingMemoryStore } from '../db/connection';
import { config } from '../config';

const router = Router();

router.get('/', async (_req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    checks: {
      database: 'unknown',
      redis: 'unknown',
    },
    persistence: isUsingMemoryStore() ? 'in-memory fallback' : 'mongodb',
  };

  try {
    await checkDatabaseHealth();
    health.checks.database = 'healthy';
  } catch {
    health.checks.database = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    const redis = new IORedis(config.redisUrl, {
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    await redis.connect();
    await redis.ping();
    await redis.quit();
    health.checks.redis = 'healthy';
  } catch {
    health.checks.redis = 'unhealthy';
    if (health.checks.database !== 'unhealthy') {
      health.status = 'degraded';
    }
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

export default router;
