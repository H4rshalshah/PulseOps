import { Request, Response } from 'express';
import { z } from 'zod';
import axios from 'axios';
import { isUsingMemoryStore } from '../db/connection';
import { memoryStore, MonitorRecord } from '../db/memoryStore';
import { MonitorDocument, normalizeDocument } from '../models/Operational';
import { v4 as uuidv4 } from 'uuid';

const createMonitorSchema = z.object({
  name: z.string().min(1).max(255),
  url: z.string().url(),
  method: z.string().default('GET'),
  interval_seconds: z.number().default(60),
  timeout_ms: z.number().default(5000),
  expected_status: z.number().default(200),
  is_active: z.boolean().default(true),
});

export class MonitorController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      if (isUsingMemoryStore()) {
        res.json([...memoryStore.monitors].sort((a, b) => a.name.localeCompare(b.name)));
        return;
      }

      const monitors = await MonitorDocument.find({}).sort({ name: 1 });
      res.json(monitors.map((monitor) => normalizeDocument(monitor)));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch monitors' });
    }
  }

  static async create(_req: Request, res: Response): Promise<void> {
    try {
      const parsed = createMonitorSchema.parse(_req.body);
      const monitor = {
        id: uuidv4(),
        ...parsed,
        last_checked_at: null,
        last_status: null,
        created_at: new Date(),
        updated_at: new Date(),
      };

      if (isUsingMemoryStore()) {
        memoryStore.monitors.push(monitor);
        res.status(201).json(monitor);
        return;
      }

      res.status(201).json(normalizeDocument(await MonitorDocument.create(monitor)));
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to create monitor' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { name, url, method, interval_seconds, timeout_ms, expected_status, is_active } = req.body;
      const updates = { name, url, method, interval_seconds, timeout_ms, expected_status, is_active, updated_at: new Date() };

      if (isUsingMemoryStore()) {
        const index = memoryStore.monitors.findIndex((monitor) => monitor.id === req.params.id);
        if (index === -1) {
          res.status(404).json({ error: 'Monitor not found' });
          return;
        }
        memoryStore.monitors[index] = { ...memoryStore.monitors[index], ...Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined)) };
        res.json(memoryStore.monitors[index]);
        return;
      }

      const monitor = await MonitorDocument.findOneAndUpdate(
        { id: req.params.id },
        Object.fromEntries(Object.entries(updates).filter(([, value]) => value !== undefined)),
        { new: true }
      );
      if (!monitor) {
        res.status(404).json({ error: 'Monitor not found' });
        return;
      }
      res.json(normalizeDocument(monitor));
    } catch (error) {
      res.status(500).json({ error: 'Failed to update monitor' });
    }
  }

  static async delete(req: Request, res: Response): Promise<void> {
    try {
      if (isUsingMemoryStore()) {
        const before = memoryStore.monitors.length;
        memoryStore.monitors = memoryStore.monitors.filter((monitor) => monitor.id !== req.params.id);
        if (memoryStore.monitors.length === before) {
          res.status(404).json({ error: 'Monitor not found' });
          return;
        }
        res.status(204).send();
        return;
      }

      const result = await MonitorDocument.deleteOne({ id: req.params.id });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: 'Monitor not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete monitor' });
    }
  }

  static async check(req: Request, res: Response): Promise<void> {
    try {
      const monitor = isUsingMemoryStore()
        ? memoryStore.monitors.find((item) => item.id === req.params.id) || null
        : normalizeDocument<MonitorRecord>(await MonitorDocument.findOne({ id: req.params.id }));
      if (!monitor) {
        res.status(404).json({ error: 'Monitor not found' });
        return;
      }

      const start = Date.now();
      const response = await axios({
        method: monitor.method.toLowerCase() as 'get' | 'post',
        url: monitor.url,
        timeout: monitor.timeout_ms || 5000,
        validateStatus: () => true,
      });
      const duration = Date.now() - start;
      const isHealthy = response.status === (monitor.expected_status || 200);

      await updateMonitorStatus(req.params.id, isHealthy ? 'healthy' : 'unhealthy');

      res.json({
        id: req.params.id,
        status: isHealthy ? 'healthy' : 'unhealthy',
        statusCode: response.status,
        responseTimeMs: duration,
        checkedAt: new Date().toISOString(),
      });
    } catch (error) {
      await updateMonitorStatus(req.params.id, 'unhealthy');
      res.json({
        id: req.params.id,
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Connection failed',
        checkedAt: new Date().toISOString(),
      });
    }
  }
}

async function updateMonitorStatus(id: string, status: string): Promise<void> {
  if (isUsingMemoryStore()) {
    const monitor = memoryStore.monitors.find((item) => item.id === id);
    if (monitor) {
      monitor.last_status = status;
      monitor.last_checked_at = new Date();
      monitor.updated_at = new Date();
    }
    return;
  }

  await MonitorDocument.updateOne(
    { id },
    { last_status: status, last_checked_at: new Date(), updated_at: new Date() }
  );
}
