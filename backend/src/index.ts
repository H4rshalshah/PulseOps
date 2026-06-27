import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { initSocket } from './websocket/incidentSocket';
import { initWorker } from './workers/actionWorker';
import { closeDatabase, initializeDatabase, isUsingMemoryStore } from './db/connection';
import { seedMemoryStore, memoryStore } from './db/memoryStore';
import { IncidentDocument } from './models/Incident';
import { RunbookDocument } from './models/Runbook';
import { ActionExecutionDocument } from './models/AuditLog';
import { MonitorDocument, SettingDocument, WebhookLogDocument } from './models/Operational';
import winston from 'winston';
import { HealthCheckScheduler } from './services/HealthCheckScheduler';

// Routes
import incidentRoutes from './routes/incidents';
import runbookRoutes from './routes/runbooks';
import webhookRoutes from './routes/webhooks';
import analyticsRoutes from './routes/analytics';
import monitorRoutes from './routes/monitors';
import healthRoutes from './routes/health';
import settingsRoutes from './routes/settings';
import authRoutes from './routes/auth';
import workspaceRoutes from './routes/workspaces';
import { inviteRouter } from './routes/workspaces';
import projectRoutes from './routes/projects';
import alertWebhookRoutes from './routes/alertWebhooks';

const logger = winston.createLogger({
  level: config.isDevelopment ? 'debug' : 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [new winston.transports.Console()],
});

const app = express();
const httpServer = createServer(app);

// Initialize WebSocket
const io = initSocket(httpServer, config.corsOrigin);

// Security middleware
app.use(helmet());

// CORS — allow multiple origins for development flexibility
const corsOrigins = config.corsOrigin.split(',').map((s) => s.trim());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, server-to-server, etc.)
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // In development, allow any localhost port for convenience
      if (config.isDevelopment && origin?.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(null, false);
      }
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Request logging
app.use((_req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${_req.method} ${_req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api', inviteRouter);
app.use('/api/projects', projectRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/runbooks', runbookRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/webhooks/alerts', alertWebhookRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/settings', settingsRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ error: config.isDevelopment ? err.message : 'Internal server error' });
});

// Initialize BullMQ worker (only if Redis is available)
let worker: ReturnType<typeof initWorker> | null = null;
try {
  worker = initWorker();
} catch (error) {
  logger.warn('Failed to initialize BullMQ worker (Redis may not be available)');
}

// Initialize Health Check Scheduler
try {
  HealthCheckScheduler.start();
  logger.info('Health check scheduler initialized');
} catch (error) {
  logger.warn('Failed to start health check scheduler', {
    error: error instanceof Error ? error.message : error,
  });
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  httpServer.close(() => {
    if (worker) worker.close();
    closeDatabase().finally(() => process.exit(0));
  });
});

(async () => {
  try {
    await initializeDatabase();

    // Auto-seed demo data if using MongoDB with empty collections
    if (!isUsingMemoryStore()) {
      const count = await IncidentDocument.countDocuments();
      if (count === 0) {
        seedMemoryStore(true);
        logger.info('Seeding MongoDB with demo data...');
        await Promise.all([
          IncidentDocument.insertMany(memoryStore.incidents),
          RunbookDocument.insertMany(memoryStore.runbooks),
          ActionExecutionDocument.insertMany(memoryStore.actionExecutions),
          MonitorDocument.insertMany(memoryStore.monitors),
          SettingDocument.insertMany(memoryStore.settings),
          WebhookLogDocument.insertMany(memoryStore.webhookLogs),
        ]);
        logger.info(`Auto-seeded MongoDB with ${memoryStore.incidents.length} incidents, ${memoryStore.runbooks.length} runbooks, ${memoryStore.monitors.length} monitors`);
      } else {
        logger.info(`MongoDB has ${count} existing incidents — skipping seed`);
      }
    }

    httpServer.listen(config.port, () => {
      logger.info(`PulseOps backend running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Persistence: ${isUsingMemoryStore() ? 'in-memory fallback' : 'MongoDB'}`);
      logger.info(`WebSocket server ready`);
    });
  } catch (error) {
    logger.error('Failed to initialize persistence and start server', error);
    process.exit(1);
  }
})();

export { app, httpServer, io };
