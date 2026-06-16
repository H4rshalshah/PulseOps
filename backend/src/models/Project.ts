import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { isUsingMemoryStore } from '../db/connection';

export type ProjectEnvironment = 'production' | 'staging' | 'development';
export type ProjectStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface HealthCheckRecord {
  id: string;
  projectId: string;
  statusCode: number | null;
  latencyMs: number | null;
  isHealthy: boolean;
  errorMessage: string | null;
  checkedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  description: string | null;
  environment: ProjectEnvironment;
  baseUrl: string | null;
  healthCheckUrl: string | null;
  repositoryUrl: string | null;
  status: ProjectStatus;
  webhookToken: string;
  healthCheckInterval: number; // seconds
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  userId: { type: String, required: true, index: true },
  workspaceId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  description: { type: String, default: null },
  environment: { type: String, enum: ['production', 'staging', 'development'], default: 'production' },
  baseUrl: { type: String, default: null },
  healthCheckUrl: { type: String, default: null },
  repositoryUrl: { type: String, default: null },
  status: { type: String, enum: ['healthy', 'degraded', 'down', 'unknown'], default: 'unknown' },
  webhookToken: { type: String, unique: true, default: () => uuidv4().replace(/-/g, '') },
  healthCheckInterval: { type: Number, default: 300 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const HealthCheckSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  projectId: { type: String, required: true, index: true },
  statusCode: { type: Number, default: null },
  latencyMs: { type: Number, default: null },
  isHealthy: { type: Boolean, default: false },
  errorMessage: { type: String, default: null },
  checkedAt: { type: Date, default: Date.now },
});

ProjectSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

HealthCheckSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const ProjectDocument = mongoose.models.Project || mongoose.model<Project>('Project', ProjectSchema);
export const HealthCheckDocument = mongoose.models.HealthCheck || mongoose.model<HealthCheckRecord>('HealthCheck', HealthCheckSchema);

// In-memory stores
export const projectMemoryStore: Project[] = [];
export const healthCheckMemoryStore: HealthCheckRecord[] = [];

function normalize<T>(doc: unknown): T {
  const value = typeof (doc as { toJSON?: () => unknown })?.toJSON === 'function'
    ? (doc as { toJSON: () => T }).toJSON()
    : doc;
  return value as T;
}

export class ProjectModel {
  static async findByWorkspace(workspaceId: string): Promise<Project[]> {
    if (isUsingMemoryStore()) {
      return projectMemoryStore.filter((p) => p.workspaceId === workspaceId)
        .sort((a, b) => a.name.localeCompare(b.name));
    }
    const docs = await ProjectDocument.find({ workspaceId }).sort({ name: 1 });
    return docs.map((d) => normalize<Project>(d));
  }

  static async findById(id: string): Promise<Project | null> {
    if (isUsingMemoryStore()) return projectMemoryStore.find((p) => p.id === id) || null;
    const doc = await ProjectDocument.findOne({ id });
    return doc ? normalize<Project>(doc) : null;
  }

  static async findByWebhookToken(token: string): Promise<Project | null> {
    if (isUsingMemoryStore()) return projectMemoryStore.find((p) => p.webhookToken === token) || null;
    const doc = await ProjectDocument.findOne({ webhookToken: token });
    return doc ? normalize<Project>(doc) : null;
  }

  static async create(data: {
    userId: string;
    workspaceId: string;
    name: string;
    description?: string;
    environment?: ProjectEnvironment;
    baseUrl?: string;
    healthCheckUrl?: string;
    repositoryUrl?: string;
  }): Promise<Project> {
    const project: Project = {
      id: uuidv4(),
      userId: data.userId,
      workspaceId: data.workspaceId,
      name: data.name,
      description: data.description || null,
      environment: data.environment || 'production',
      baseUrl: data.baseUrl || null,
      healthCheckUrl: data.healthCheckUrl || null,
      repositoryUrl: data.repositoryUrl || null,
      status: 'unknown',
      webhookToken: uuidv4().replace(/-/g, ''),
      healthCheckInterval: 300,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isUsingMemoryStore()) {
      projectMemoryStore.push(project);
      return project;
    }
    return normalize<Project>(await ProjectDocument.create(project));
  }

  static async update(id: string, updates: Partial<Project>): Promise<Project | null> {
    const payload = { ...updates, updatedAt: new Date() };
    if (isUsingMemoryStore()) {
      const idx = projectMemoryStore.findIndex((p) => p.id === id);
      if (idx === -1) return null;
      projectMemoryStore[idx] = { ...projectMemoryStore[idx], ...payload };
      return projectMemoryStore[idx];
    }
    const doc = await ProjectDocument.findOneAndUpdate({ id }, payload, { new: true });
    return doc ? normalize<Project>(doc) : null;
  }

  static async delete(id: string): Promise<boolean> {
    if (isUsingMemoryStore()) {
      const idx = projectMemoryStore.findIndex((p) => p.id === id);
      if (idx === -1) return false;
      projectMemoryStore.splice(idx, 1);
      return true;
    }
    const result = await ProjectDocument.deleteOne({ id });
    return result.deletedCount > 0;
  }

  static async regenerateWebhookToken(id: string): Promise<string | null> {
    const token = uuidv4().replace(/-/g, '');
    const project = await this.update(id, { webhookToken: token });
    return project ? token : null;
  }

  static async getCountByWorkspace(workspaceId: string): Promise<number> {
    if (isUsingMemoryStore()) return projectMemoryStore.filter((p) => p.workspaceId === workspaceId).length;
    return ProjectDocument.countDocuments({ workspaceId });
  }
}

export class HealthCheckModel {
  static async create(data: {
    projectId: string;
    statusCode: number | null;
    latencyMs: number | null;
    isHealthy: boolean;
    errorMessage?: string | null;
  }): Promise<HealthCheckRecord> {
    const record: HealthCheckRecord = {
      id: uuidv4(),
      projectId: data.projectId,
      statusCode: data.statusCode,
      latencyMs: data.latencyMs,
      isHealthy: data.isHealthy,
      errorMessage: data.errorMessage || null,
      checkedAt: new Date(),
    };

    if (isUsingMemoryStore()) {
      healthCheckMemoryStore.push(record);
      return record;
    }
    return normalize<HealthCheckRecord>(await HealthCheckDocument.create(record));
  }

  static async findByProject(projectId: string, limit = 50): Promise<HealthCheckRecord[]> {
    if (isUsingMemoryStore()) {
      return healthCheckMemoryStore
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime())
        .slice(0, limit);
    }
    const docs = await HealthCheckDocument.find({ projectId })
      .sort({ checkedAt: -1 })
      .limit(limit);
    return docs.map((d) => normalize<HealthCheckRecord>(d));
  }

  static async getLatest(projectId: string): Promise<HealthCheckRecord | null> {
    if (isUsingMemoryStore()) {
      const records = healthCheckMemoryStore
        .filter((r) => r.projectId === projectId)
        .sort((a, b) => new Date(b.checkedAt).getTime() - new Date(a.checkedAt).getTime());
      return records[0] || null;
    }
    const doc = await HealthCheckDocument.findOne({ projectId }).sort({ checkedAt: -1 });
    return doc ? normalize<HealthCheckRecord>(doc) : null;
  }
}
