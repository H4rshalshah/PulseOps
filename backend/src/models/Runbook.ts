import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { isUsingMemoryStore } from '../db/connection';
import { memoryStore } from '../db/memoryStore';

export interface RunbookStep {
  id: string;
  name: string;
  type: 'http' | 'shell' | 'slack' | 'aws' | 'wait' | 'condition';
  config: Record<string, unknown>;
  on_failure: 'continue' | 'stop' | 'escalate';
  timeout_ms: number;
}

export interface Runbook {
  id: string;
  name: string;
  description: string | null;
  trigger_conditions: Record<string, unknown> | null;
  steps: RunbookStep[];
  is_active: boolean;
  dry_run_mode: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateRunbookInput {
  name: string;
  description?: string;
  trigger_conditions?: Record<string, unknown>;
  steps?: RunbookStep[];
  is_active?: boolean;
  dry_run_mode?: boolean;
}

const RunbookSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  name: { type: String, required: true, index: true },
  description: { type: String, default: null },
  trigger_conditions: { type: Schema.Types.Mixed, default: null },
  steps: { type: [Schema.Types.Mixed], default: [] },
  is_active: { type: Boolean, default: true, index: true },
  dry_run_mode: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

RunbookSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const RunbookDocument = mongoose.models.Runbook || mongoose.model<Runbook>('Runbook', RunbookSchema);

function normalize(doc: unknown): Runbook {
  const value = typeof (doc as { toJSON?: () => unknown })?.toJSON === 'function'
    ? (doc as { toJSON: () => Runbook }).toJSON()
    : doc;
  return value as Runbook;
}

export class RunbookModel {
  static async findAll(activeOnly = false): Promise<Runbook[]> {
    if (isUsingMemoryStore()) {
      return memoryStore.runbooks
        .filter((runbook) => !activeOnly || runbook.is_active)
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const query = activeOnly ? { is_active: true } : {};
    const docs = await RunbookDocument.find(query).sort({ name: 1 });
    return docs.map(normalize);
  }

  static async findById(id: string): Promise<Runbook | null> {
    if (isUsingMemoryStore()) return memoryStore.runbooks.find((runbook) => runbook.id === id) || null;
    const doc = await RunbookDocument.findOne({ id });
    return doc ? normalize(doc) : null;
  }

  static async findMatching(conditions: Record<string, unknown>): Promise<Runbook | null> {
    const runbooks = await this.findAll(true);
    return runbooks.find((runbook) =>
      !!runbook.trigger_conditions && this.matchesConditions(runbook.trigger_conditions, conditions)
    ) || null;
  }

  private static matchesConditions(trigger: Record<string, unknown>, alert: Record<string, unknown>): boolean {
    for (const [key, value] of Object.entries(trigger)) {
      const alertValue = key === 'service' && alert[key] === undefined ? alert.service_name : alert[key];
      if (alertValue !== value) return false;
    }
    return true;
  }

  static async create(input: CreateRunbookInput): Promise<Runbook> {
    const runbook: Runbook = {
      id: uuidv4(),
      name: input.name,
      description: input.description || null,
      trigger_conditions: input.trigger_conditions || null,
      steps: input.steps || [],
      is_active: input.is_active ?? true,
      dry_run_mode: input.dry_run_mode ?? false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    if (isUsingMemoryStore()) {
      memoryStore.runbooks.push(runbook);
      return runbook;
    }

    return normalize(await RunbookDocument.create(runbook));
  }

  static async update(id: string, updates: Partial<Runbook>): Promise<Runbook | null> {
    const payload = { ...updates, updated_at: new Date() };

    if (isUsingMemoryStore()) {
      const index = memoryStore.runbooks.findIndex((runbook) => runbook.id === id);
      if (index === -1) return null;
      memoryStore.runbooks[index] = { ...memoryStore.runbooks[index], ...payload };
      return memoryStore.runbooks[index];
    }

    const doc = await RunbookDocument.findOneAndUpdate({ id }, payload, { new: true });
    return doc ? normalize(doc) : null;
  }

  static async delete(id: string): Promise<boolean> {
    if (isUsingMemoryStore()) {
      const before = memoryStore.runbooks.length;
      memoryStore.runbooks = memoryStore.runbooks.filter((runbook) => runbook.id !== id);
      return memoryStore.runbooks.length < before;
    }

    const result = await RunbookDocument.deleteOne({ id });
    return result.deletedCount > 0;
  }

  static async getStats(): Promise<{ total: number; active: number }> {
    if (isUsingMemoryStore()) {
      return {
        total: memoryStore.runbooks.length,
        active: memoryStore.runbooks.filter((runbook) => runbook.is_active).length,
      };
    }

    const [total, active] = await Promise.all([
      RunbookDocument.countDocuments({}),
      RunbookDocument.countDocuments({ is_active: true }),
    ]);
    return { total, active };
  }
}

export { RunbookDocument };
