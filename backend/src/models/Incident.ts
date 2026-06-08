import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { isUsingMemoryStore } from '../db/connection';
import { memoryStore } from '../db/memoryStore';

export type IncidentSeverity = 'critical' | 'high' | 'medium' | 'low';
export type IncidentStatus = 'open' | 'investigating' | 'mitigating' | 'resolved';

export interface Incident {
  id: string;
  title: string;
  description: string | null;
  severity: IncidentSeverity;
  status: IncidentStatus;
  source: string | null;
  service_name: string | null;
  runbook_id: string | null;
  created_at: Date;
  resolved_at: Date | null;
  mttr_seconds: number | null;
  situation_report: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status?: IncidentStatus;
  source?: string;
  service_name?: string;
  runbook_id?: string;
  metadata?: Record<string, unknown>;
}

export interface IncidentFilters {
  status?: string;
  severity?: string;
  source?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const IncidentSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  title: { type: String, required: true, index: 'text' },
  description: { type: String, default: null },
  severity: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true, index: true },
  status: { type: String, enum: ['open', 'investigating', 'mitigating', 'resolved'], default: 'open', index: true },
  source: { type: String, default: 'manual', index: true },
  service_name: { type: String, default: null },
  runbook_id: { type: String, default: null },
  created_at: { type: Date, default: Date.now, index: true },
  resolved_at: { type: Date, default: null },
  mttr_seconds: { type: Number, default: null },
  situation_report: { type: Schema.Types.Mixed, default: null },
  metadata: { type: Schema.Types.Mixed, default: null },
});

IncidentSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const IncidentDocument = mongoose.models.Incident || mongoose.model<Incident>('Incident', IncidentSchema);

function normalize(doc: unknown): Incident {
  const value = typeof (doc as { toJSON?: () => unknown })?.toJSON === 'function'
    ? (doc as { toJSON: () => Incident }).toJSON()
    : doc;
  return value as Incident;
}

function sortIncidents(items: Incident[], sortBy = 'created_at', sortOrder: 'asc' | 'desc' = 'desc'): Incident[] {
  const multiplier = sortOrder === 'asc' ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = a[sortBy as keyof Incident] as Date | string | number | null;
    const bv = b[sortBy as keyof Incident] as Date | string | number | null;
    const aValue = av instanceof Date ? av.getTime() : av ?? '';
    const bValue = bv instanceof Date ? bv.getTime() : bv ?? '';
    return aValue > bValue ? multiplier : aValue < bValue ? -multiplier : 0;
  });
}

export class IncidentModel {
  static async findAll(filters: IncidentFilters = {}): Promise<{ incidents: Incident[]; total: number }> {
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;

    if (isUsingMemoryStore()) {
      let incidents = memoryStore.incidents.filter((incident) => {
        if (filters.status && incident.status !== filters.status) return false;
        if (filters.severity && incident.severity !== filters.severity) return false;
        if (filters.source && incident.source !== filters.source) return false;
        if (filters.search) {
          const haystack = `${incident.title} ${incident.description || ''}`.toLowerCase();
          if (!haystack.includes(filters.search.toLowerCase())) return false;
        }
        return true;
      });
      incidents = sortIncidents(incidents, filters.sortBy, filters.sortOrder);
      return { incidents: incidents.slice(offset, offset + limit), total: incidents.length };
    }

    const conditions: Record<string, unknown> = {};
    if (filters.status) conditions.status = filters.status;
    if (filters.severity) conditions.severity = filters.severity;
    if (filters.source) conditions.source = filters.source;
    if (filters.search) conditions.$or = [
      { title: { $regex: filters.search, $options: 'i' } },
      { description: { $regex: filters.search, $options: 'i' } },
    ];

    const sortField = filters.sortBy || 'created_at';
    const sortDirection = filters.sortOrder === 'asc' ? 1 : -1;
    const [total, docs] = await Promise.all([
      IncidentDocument.countDocuments(conditions),
      IncidentDocument.find(conditions).sort({ [sortField]: sortDirection }).skip(offset).limit(limit),
    ]);
    return { incidents: docs.map(normalize), total };
  }

  static async findById(id: string): Promise<Incident | null> {
    if (isUsingMemoryStore()) return memoryStore.incidents.find((incident) => incident.id === id) || null;
    const doc = await IncidentDocument.findOne({ id });
    return doc ? normalize(doc) : null;
  }

  static async create(input: CreateIncidentInput): Promise<Incident> {
    const incident: Incident = {
      id: uuidv4(),
      title: input.title,
      description: input.description || null,
      severity: input.severity,
      status: input.status || 'open',
      source: input.source || 'manual',
      service_name: input.service_name || null,
      runbook_id: input.runbook_id || null,
      created_at: new Date(),
      resolved_at: null,
      mttr_seconds: null,
      situation_report: null,
      metadata: input.metadata || null,
    };

    if (isUsingMemoryStore()) {
      memoryStore.incidents.unshift(incident);
      return incident;
    }

    return normalize(await IncidentDocument.create(incident));
  }

  static async update(id: string, updates: Partial<Incident>): Promise<Incident | null> {
    if (isUsingMemoryStore()) {
      const index = memoryStore.incidents.findIndex((incident) => incident.id === id);
      if (index === -1) return null;
      memoryStore.incidents[index] = { ...memoryStore.incidents[index], ...updates };
      return memoryStore.incidents[index];
    }

    const doc = await IncidentDocument.findOneAndUpdate({ id }, updates, { new: true });
    return doc ? normalize(doc) : null;
  }

  static async delete(id: string): Promise<boolean> {
    if (isUsingMemoryStore()) {
      const before = memoryStore.incidents.length;
      memoryStore.incidents = memoryStore.incidents.filter((incident) => incident.id !== id);
      return memoryStore.incidents.length < before;
    }

    const result = await IncidentDocument.deleteOne({ id });
    return result.deletedCount > 0;
  }

  static async getSummary(): Promise<{
    activeIncidents: number;
    avgMttr: number | null;
    incidentsToday: number;
    resolvedToday: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const incidents = isUsingMemoryStore()
      ? memoryStore.incidents
      : (await IncidentDocument.find({})).map(normalize);
    const resolvedWithMttr = incidents.filter((incident) => incident.status === 'resolved' && incident.mttr_seconds !== null);
    const mttrSum = resolvedWithMttr.reduce((sum, incident) => sum + (incident.mttr_seconds || 0), 0);

    return {
      activeIncidents: incidents.filter((incident) => incident.status !== 'resolved').length,
      avgMttr: resolvedWithMttr.length > 0 ? mttrSum / resolvedWithMttr.length : null,
      incidentsToday: incidents.filter((incident) => new Date(incident.created_at) >= today).length,
      resolvedToday: incidents.filter((incident) => incident.status === 'resolved' && incident.resolved_at && new Date(incident.resolved_at) >= today).length,
    };
  }
}

export { IncidentDocument };
