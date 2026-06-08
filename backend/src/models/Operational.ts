import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import type { MonitorRecord, SettingRecord, WebhookLogRecord } from '../db/memoryStore';

function stripMongoFields(_doc: unknown, ret: Record<string, unknown>) {
  delete ret._id;
  delete ret.__v;
  return ret;
}

const MonitorSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  name: { type: String, required: true, index: true },
  url: { type: String, required: true },
  method: { type: String, default: 'GET' },
  interval_seconds: { type: Number, default: 60 },
  timeout_ms: { type: Number, default: 5000 },
  expected_status: { type: Number, default: 200 },
  is_active: { type: Boolean, default: true },
  last_checked_at: { type: Date, default: null },
  last_status: { type: String, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const SettingSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  key: { type: String, required: true, unique: true, index: true },
  value: { type: String, default: '' },
  category: { type: String, required: true, index: true },
  updated_at: { type: Date, default: Date.now },
});

const WebhookLogSchema = new Schema({
  id: { type: String, default: () => uuidv4(), unique: true, index: true },
  source: { type: String, required: true, index: true },
  payload: { type: Schema.Types.Mixed, default: {} },
  incident_id: { type: String, required: true, index: true },
  received_at: { type: Date, default: Date.now, index: true },
});

MonitorSchema.set('toJSON', { transform: stripMongoFields });
SettingSchema.set('toJSON', { transform: stripMongoFields });
WebhookLogSchema.set('toJSON', { transform: stripMongoFields });

export const MonitorDocument = mongoose.models.Monitor || mongoose.model<MonitorRecord>('Monitor', MonitorSchema);
export const SettingDocument = mongoose.models.Setting || mongoose.model<SettingRecord>('Setting', SettingSchema);
export const WebhookLogDocument = mongoose.models.WebhookLog || mongoose.model<WebhookLogRecord>('WebhookLog', WebhookLogSchema);

export function normalizeDocument<T>(doc: unknown): T {
  const value = typeof (doc as { toJSON?: () => unknown })?.toJSON === 'function'
    ? (doc as { toJSON: () => T }).toJSON()
    : doc;
  return value as T;
}
