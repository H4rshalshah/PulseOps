import { Router } from 'express';
import { checkDatabaseHealth, isUsingMemoryStore } from '../db/connection';

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

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

export default router;
