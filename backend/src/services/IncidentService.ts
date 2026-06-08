import { IncidentModel, CreateIncidentInput, IncidentFilters, Incident } from '../models/Incident';
import { RunbookModel } from '../models/Runbook';
import { AuditLogModel } from '../models/AuditLog';
import { getIO } from '../websocket/incidentSocket';

export class IncidentService {
  static async list(filters: IncidentFilters = {}) {
    return IncidentModel.findAll(filters);
  }

  static async getById(id: string): Promise<Incident | null> {
    return IncidentModel.findById(id);
  }

  static async getWithDetails(id: string) {
    const incident = await IncidentModel.findById(id);
    if (!incident) return null;

    const executions = await AuditLogModel.findByIncident(id);
    let runbook = null;
    if (incident.runbook_id) {
      runbook = await RunbookModel.findById(incident.runbook_id);
    }

    return { ...incident, executions, runbook };
  }

  static async create(input: CreateIncidentInput): Promise<Incident> {
    const incident = await IncidentModel.create(input);

    // Emit WebSocket event
    const io = getIO();
    if (io) {
      io.emit('incident:new', incident);
    }

    // Auto-match runbook
    const runbook = await RunbookModel.findMatching({
      service: input.service_name,
      severity: input.severity,
    });

    if (runbook) {
      await IncidentModel.update(incident.id, { runbook_id: runbook.id });
      incident.runbook_id = runbook.id;
    }

    return incident;
  }

  static async update(id: string, updates: Partial<Incident>): Promise<Incident | null> {
    const existing = await IncidentModel.findById(id);
    if (!existing) return null;

    const finalUpdates = { ...updates };
    if (updates.status === 'resolved' && !existing.resolved_at) {
      const resolvedAt = new Date();
      finalUpdates.resolved_at = resolvedAt;
      finalUpdates.mttr_seconds = Math.round((resolvedAt.getTime() - new Date(existing.created_at).getTime()) / 1000);
    }

    const incident = await IncidentModel.update(id, finalUpdates);

    if (incident) {
      const io = getIO();
      if (io) {
        io.emit('incident:updated', incident);
      }
    }

    return incident;
  }

  static async delete(id: string): Promise<boolean> {
    return IncidentModel.delete(id);
  }

  static async resolve(id: string): Promise<Incident | null> {
    return this.update(id, { status: 'resolved' });
  }

  static async findSimilar(title: string): Promise<Incident[]> {
    const result = await IncidentModel.findAll({
      limit: 5,
      sortBy: 'created_at',
      sortOrder: 'desc',
    } as IncidentFilters);

    return result.incidents.filter(
      (inc) => inc.title.toLowerCase().includes(title.toLowerCase().split(' ')[0]?.toLowerCase() || '')
    ).slice(0, 5);
  }

  static async getSummary() {
    return IncidentModel.getSummary();
  }

  static async createFromAlert(alert: {
    title: string;
    description?: string;
    severity: string;
    source: string;
    service_name?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Incident> {
    const severity = ['critical', 'high', 'medium', 'low'].includes(alert.severity)
      ? alert.severity as 'critical' | 'high' | 'medium' | 'low'
      : 'medium';

    return this.create({
      title: alert.title,
      description: alert.description,
      severity,
      source: alert.source,
      service_name: alert.service_name,
      metadata: alert.metadata,
    });
  }
}
