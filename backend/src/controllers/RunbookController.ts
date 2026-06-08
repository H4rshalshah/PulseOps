import { Request, Response } from 'express';
import { RunbookModel } from '../models/Runbook';
import { RunbookExecutor } from '../services/RunbookExecutor';
import { z } from 'zod';

const createRunbookSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  trigger_conditions: z.record(z.unknown()).optional(),
  steps: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['http', 'shell', 'slack', 'aws', 'wait', 'condition']),
    config: z.record(z.unknown()),
    on_failure: z.enum(['continue', 'stop', 'escalate']).default('continue'),
    timeout_ms: z.number().default(5000),
  })).optional(),
  is_active: z.boolean().optional(),
  dry_run_mode: z.boolean().optional(),
});

const executeRunbookSchema = z.object({
  incidentId: z.string().uuid(),
  dryRun: z.boolean().default(false),
});

export class RunbookController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const activeOnly = req.query.active === 'true';
      const runbooks = await RunbookModel.findAll(activeOnly);
      res.json(runbooks);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch runbooks' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const runbook = await RunbookModel.findById(req.params.id);
      if (!runbook) {
        res.status(404).json({ error: 'Runbook not found' });
        return;
      }
      res.json(runbook);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch runbook' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const parsed = createRunbookSchema.parse(req.body);
      const runbook = await RunbookModel.create(parsed);
      res.status(201).json(runbook);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to create runbook' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const updates = req.body;
      const runbook = await RunbookModel.update(req.params.id, updates);
      if (!runbook) {
        res.status(404).json({ error: 'Runbook not found' });
        return;
      }
      res.json(runbook);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update runbook' });
    }
  }

  static async delete(_req: Request, res: Response): Promise<void> {
    try {
      const deleted = await RunbookModel.delete(_req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Runbook not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete runbook' });
    }
  }

  static async execute(req: Request, res: Response): Promise<void> {
    try {
      const parsed = executeRunbookSchema.parse(req.body);
      const result = await RunbookExecutor.execute(req.params.id, parsed.incidentId, parsed.dryRun);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(500).json({ error: error instanceof Error ? error.message : 'Execution failed' });
    }
  }

  static async test(req: Request, res: Response): Promise<void> {
    try {
      const runbook = await RunbookModel.findById(req.params.id);
      if (!runbook) {
        res.status(404).json({ error: 'Runbook not found' });
        return;
      }

      const mockIncidentId = '00000000-0000-0000-0000-000000000000';
      const result = await RunbookExecutor.execute(req.params.id, mockIncidentId, true);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : 'Test execution failed' });
    }
  }

  static async getStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await RunbookModel.getStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch runbook stats' });
    }
  }
}
