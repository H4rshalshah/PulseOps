import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { isUsingMemoryStore } from '../db/connection';
import { memoryStore } from '../db/memoryStore';

export type ExecutionStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface ActionExecution {
  id: string;
  incident_id: string;
  runbook_id: string | null;
  step_id: string;
  step_name: string;
  action_type: string;
  status: ExecutionStatus;
  dry_run: boolean;
  input_payload: Record<string, unknown> | null;
  output_payload: Record<string, unknown> | null;
  error_message: string | null;
  duration_ms: number | null;
  executed_at: Date;
}

const ActionExecutionSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  incident_id: { type: String, required: true, index: true },
  runbook_id: { type: String, default: null, index: true },
  step_id: { type: String, required: true },
  step_name: { type: String, required: true },
  action_type: { type: String, required: true },
  status: { type: String, enum: ['pending', 'running', 'success', 'failed', 'skipped'], required: true, index: true },
  dry_run: { type: Boolean, default: false },
  input_payload: { type: Schema.Types.Mixed, default: null },
  output_payload: { type: Schema.Types.Mixed, default: null },
  error_message: { type: String, default: null },
  duration_ms: { type: Number, default: null },
  executed_at: { type: Date, default: Date.now, index: true },
});

ActionExecutionSchema.set('toJSON', {
  transform: (_doc, ret: Record<string, unknown>) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

const ActionExecutionDocument = mongoose.models.ActionExecution || mongoose.model<ActionExecution>('ActionExecution', ActionExecutionSchema);

function normalize(doc: unknown): ActionExecution {
  const value = typeof (doc as { toJSON?: () => unknown })?.toJSON === 'function'
    ? (doc as { toJSON: () => ActionExecution }).toJSON()
    : doc;
  return value as ActionExecution;
}

export class AuditLogModel {
  static async create(data: {
    incidentId: string;
    runbookId?: string;
    stepId: string;
    stepName: string;
    actionType: string;
    status: ExecutionStatus;
    dryRun?: boolean;
    inputPayload?: Record<string, unknown>;
    outputPayload?: Record<string, unknown>;
    errorMessage?: string;
    durationMs?: number;
  }): Promise<ActionExecution> {
    const execution: ActionExecution = {
      id: uuidv4(),
      incident_id: data.incidentId,
      runbook_id: data.runbookId || null,
      step_id: data.stepId,
      step_name: data.stepName,
      action_type: data.actionType,
      status: data.status,
      dry_run: data.dryRun ?? false,
      input_payload: data.inputPayload || null,
      output_payload: data.outputPayload || null,
      error_message: data.errorMessage || null,
      duration_ms: data.durationMs || null,
      executed_at: new Date(),
    };

    if (isUsingMemoryStore()) {
      memoryStore.actionExecutions.push(execution);
      return execution;
    }

    return normalize(await ActionExecutionDocument.create(execution));
  }

  static async findByIncident(incidentId: string): Promise<ActionExecution[]> {
    if (isUsingMemoryStore()) {
      return memoryStore.actionExecutions
        .filter((execution) => execution.incident_id === incidentId)
        .sort((a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime());
    }

    const docs = await ActionExecutionDocument.find({ incident_id: incidentId }).sort({ executed_at: 1 });
    return docs.map(normalize);
  }

  static async getExecutionsToday(): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isUsingMemoryStore()) {
      return memoryStore.actionExecutions.filter((execution) => new Date(execution.executed_at) >= today).length;
    }

    return ActionExecutionDocument.countDocuments({ executed_at: { $gte: today } });
  }

  static async updateStatus(
    id: string,
    status: ExecutionStatus,
    updates?: { outputPayload?: Record<string, unknown>; errorMessage?: string; durationMs?: number }
  ): Promise<void> {
    const payload = {
      status,
      ...(updates?.outputPayload ? { output_payload: updates.outputPayload } : {}),
      ...(updates?.errorMessage !== undefined ? { error_message: updates.errorMessage } : {}),
      ...(updates?.durationMs !== undefined ? { duration_ms: updates.durationMs } : {}),
    };

    if (isUsingMemoryStore()) {
      const execution = memoryStore.actionExecutions.find((item) => item.id === id);
      if (execution) Object.assign(execution, payload);
      return;
    }

    await ActionExecutionDocument.updateOne({ id }, payload);
  }
}

export { ActionExecutionDocument };
