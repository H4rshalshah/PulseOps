import { Request, Response } from 'express';
import { IncidentService } from '../services/IncidentService';
import { RunbookExecutor } from '../services/RunbookExecutor';
import { RunbookModel } from '../models/Runbook';
import { isUsingMemoryStore } from '../db/connection';
import { memoryStore } from '../db/memoryStore';
import { normalizeDocument, WebhookLogDocument } from '../models/Operational';
import { v4 as uuidv4 } from 'uuid';

function detectSource(payload: Record<string, unknown>): string {
  if (payload?.alerts && Array.isArray(payload.alerts)) return 'prometheus';
  if (payload?.alertId || payload?.alert_id) return 'datadog';
  if (payload?.panelId || payload?.panel_id) return 'grafana';
  if (payload?.source && typeof payload.source === 'string') return payload.source;
  return 'unknown';
}

function normalizeAlert(payload: Record<string, unknown>, source: string): {
  title: string;
  description: string;
  severity: string;
  source: string;
  service_name: string;
  metadata: Record<string, unknown>;
} {
  switch (source) {
    case 'prometheus': {
      const alerts = (payload.alerts as Array<Record<string, unknown>>) || [];
      const first = alerts[0] || {};
      const labels = (first.labels as Record<string, string>) || {};
      return {
        title: (first.annotations as Record<string, string>)?.summary || `Alert: ${labels.alertname || 'Unknown'}`,
        description: (first.annotations as Record<string, string>)?.description || '',
        severity: labels.severity || 'medium',
        source: 'prometheus',
        service_name: labels.service || labels.job || 'unknown',
        metadata: payload as Record<string, unknown>,
      };
    }
    case 'datadog': {
      return {
        title: (payload.title as string) || 'Datadog Alert',
        description: (payload.text as string) || '',
        severity: (payload.severity as string) || 'medium',
        source: 'datadog',
        service_name: (payload.service as string) || 'unknown',
        metadata: payload as Record<string, unknown>,
      };
    }
    case 'grafana':
    default: {
      return {
        title: (payload.title as string) || (payload.message as string) || 'Grafana Alert',
        description: (payload.message as string) || '',
        severity: (payload.severity as string) || (payload.state as string) === 'alerting' ? 'critical' : 'medium',
        source: 'grafana',
        service_name: (payload.service_name as string) || 'unknown',
        metadata: payload as Record<string, unknown>,
      };
    }
  }
}

export class WebhookController {
  static async ingest(req: Request, res: Response): Promise<void> {
    try {
      const payload = req.body;
      const source = detectSource(payload);
      const normalized = normalizeAlert(payload, source);

      const incident = await IncidentService.createFromAlert(normalized);
      const runbook = await RunbookModel.findMatching(normalized);

      if (runbook && incident) {
        // Execute runbook asynchronously (don't await)
        RunbookExecutor.execute(runbook.id, incident.id, runbook.dry_run_mode).catch(err => {
          console.error('Runbook execution failed:', err);
        });
      }

      if (isUsingMemoryStore()) {
        memoryStore.webhookLogs.unshift({
          id: uuidv4(),
          source,
          payload,
          incident_id: incident.id,
          received_at: new Date(),
        });
      } else {
        await WebhookLogDocument.create({ source, payload, incident_id: incident.id });
      }

      res.json({ received: true, incidentId: incident.id, runbookMatched: !!runbook });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process webhook' });
    }
  }

  static async getLogs(_req: Request, res: Response): Promise<void> {
    try {
      if (isUsingMemoryStore()) {
        res.json(memoryStore.webhookLogs.slice(0, 50));
        return;
      }

      const logs = await WebhookLogDocument.find({}).sort({ received_at: -1 }).limit(50);
      res.json(logs.map((log) => normalizeDocument(log)));
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch webhook logs' });
    }
  }
}
