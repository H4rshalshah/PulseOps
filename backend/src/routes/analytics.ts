import { Router } from 'express';
import { IncidentDocument } from '../models/Incident';
import { RunbookModel } from '../models/Runbook';
import { AuditLogModel } from '../models/AuditLog';
import { isUsingMemoryStore } from '../db/connection';
import { memoryStore } from '../db/memoryStore';

const router = Router();

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function startOfWindow(days: number): Date {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

function dateKey(value: Date | string): string {
  return new Date(value).toISOString().slice(0, 10);
}

async function getIncidents() {
  if (isUsingMemoryStore()) return memoryStore.incidents;
  return IncidentDocument.find({}).lean();
}

router.get('/mttr', async (_req, res) => {
  try {
    const since = startOfWindow(30);
    const incidents = (await getIncidents()).filter((incident) =>
      incident.status === 'resolved' &&
      incident.mttr_seconds !== null &&
      new Date(incident.created_at) >= since
    );
    const grouped = new Map<string, { date: string; totalMttr: number; incident_count: number }>();

    for (const incident of incidents) {
      const key = dateKey(incident.created_at);
      const current = grouped.get(key) || { date: key, totalMttr: 0, incident_count: 0 };
      current.totalMttr += incident.mttr_seconds || 0;
      current.incident_count += 1;
      grouped.set(key, current);
    }

    res.json([...grouped.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => ({ date: row.date, avg_mttr: row.totalMttr / row.incident_count, incident_count: row.incident_count })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch MTTR data' });
  }
});

router.get('/summary', async (_req, res) => {
  try {
    const today = startOfToday();
    const incidents = await getIncidents();
    const resolvedWithMttr = incidents.filter((incident) => incident.status === 'resolved' && incident.mttr_seconds !== null);
    const avgMttr = resolvedWithMttr.length
      ? Math.round(resolvedWithMttr.reduce((sum, incident) => sum + (incident.mttr_seconds || 0), 0) / resolvedWithMttr.length)
      : null;
    const [runbookStats, actionsToday] = await Promise.all([
      RunbookModel.getStats(),
      AuditLogModel.getExecutionsToday(),
    ]);

    res.json({
      active_incidents: incidents.filter((incident) => incident.status !== 'resolved').length,
      avg_mttr: avgMttr,
      incidents_today: incidents.filter((incident) => new Date(incident.created_at) >= today).length,
      resolved_today: incidents.filter((incident) => incident.status === 'resolved' && incident.resolved_at && new Date(incident.resolved_at) >= today).length,
      active_runbooks: runbookStats.active,
      actions_today: actionsToday,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

router.get('/incidents-by-day', async (_req, res) => {
  try {
    const since = startOfWindow(30);
    const grouped = new Map<string, { date: string; total: number; critical: number; high: number; medium: number; low: number }>();

    for (const incident of (await getIncidents()).filter((item) => new Date(item.created_at) >= since)) {
      const key = dateKey(incident.created_at);
      const row = grouped.get(key) || { date: key, total: 0, critical: 0, high: 0, medium: 0, low: 0 };
      row.total += 1;
      row[incident.severity as 'critical' | 'high' | 'medium' | 'low'] += 1;
      grouped.set(key, row);
    }

    res.json([...grouped.values()].sort((a, b) => a.date.localeCompare(b.date)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch incidents by day' });
  }
});

router.get('/sources', async (_req, res) => {
  try {
    const counts = new Map<string, number>();
    for (const incident of await getIncidents()) {
      if (incident.source) counts.set(incident.source, (counts.get(incident.source) || 0) + 1);
    }
    res.json([...counts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sources' });
  }
});

router.get('/resolution-rate', async (_req, res) => {
  try {
    const incidents = await getIncidents();
    const resolved = incidents.filter((incident) => incident.status === 'resolved').length;
    res.json({ resolution_rate: incidents.length ? Math.round((resolved / incidents.length) * 1000) / 10 : 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch resolution rate' });
  }
});

export default router;
