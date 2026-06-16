import { Request, Response } from 'express';
import { IncidentService } from '../services/IncidentService';
import { SituationReportService } from '../services/SituationReportService';
import { RunbookModel } from '../models/Runbook';
import { AuditLogModel } from '../models/AuditLog';
import { z } from 'zod';

const createIncidentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  description: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  source: z.string().optional(),
  service_name: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateIncidentSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  status: z.enum(['open', 'investigating', 'mitigating', 'resolved']).optional(),
  service_name: z.string().optional(),
});

export class IncidentController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const { status, severity, source, search, limit, offset, sortBy, sortOrder } = req.query;
      const result = await IncidentService.list({
        status: status as string | undefined,
        severity: severity as string | undefined,
        source: source as string | undefined,
        search: search as string | undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        offset: offset ? parseInt(offset as string, 10) : undefined,
        sortBy: sortBy as string | undefined,
        sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch incidents' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const incident = await IncidentService.getWithDetails(req.params.id);
      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch incident' });
    }
  }

  static async create(req: AuthRequest, res: Response): Promise<void> {
    try {
      const parsed = createIncidentSchema.parse(req.body);
      const incident = await IncidentService.create({ ...parsed, userId: req.userId });
      res.status(201).json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to create incident' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const parsed = updateIncidentSchema.parse(req.body);
      const incident = await IncidentService.update(req.params.id, parsed);
      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }
      res.json(incident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Validation failed', details: error.errors });
        return;
      }
      res.status(500).json({ error: 'Failed to update incident' });
    }
  }

  static async delete(_req: Request, res: Response): Promise<void> {
    try {
      const deleted = await IncidentService.delete(_req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete incident' });
    }
  }

  static async resolve(req: Request, res: Response): Promise<void> {
    try {
      const incident = await IncidentService.resolve(req.params.id);
      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }
      res.json(incident);
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve incident' });
    }
  }

  static async generateSituationReport(req: Request, res: Response): Promise<void> {
    try {
      const incident = await IncidentService.getById(req.params.id);
      if (!incident) {
        res.status(404).json({ error: 'Incident not found' });
        return;
      }
      const report = await SituationReportService.generate(incident);

      // Save situation report to incident
      await IncidentService.update(incident.id, {
        situation_report: report as unknown as Record<string, unknown>,
      });

      res.json(report);
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate situation report' });
    }
  }

  static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const [incidentSummary, runbookStats, actionsToday] = await Promise.all([
        IncidentService.getSummary(),
        RunbookModel.getStats(),
        AuditLogModel.getExecutionsToday(),
      ]);
      res.json({
        active_incidents: incidentSummary.activeIncidents,
        avg_mttr: incidentSummary.avgMttr,
        incidents_today: incidentSummary.incidentsToday,
        resolved_today: incidentSummary.resolvedToday,
        active_runbooks: runbookStats.active,
        actions_today: actionsToday,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch summary' });
    }
  }
}
