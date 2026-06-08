import { initializeDatabase, closeDatabase, isUsingMemoryStore } from './connection';
import { seedMemoryStore, memoryStore } from './memoryStore';
import { IncidentDocument } from '../models/Incident';
import { RunbookDocument } from '../models/Runbook';
import { ActionExecutionDocument } from '../models/AuditLog';
import { MonitorDocument, SettingDocument, WebhookLogDocument } from '../models/Operational';

async function seed() {
  await initializeDatabase();
  seedMemoryStore(true);

  if (isUsingMemoryStore()) {
    console.log(`Seeded in-memory demo store with ${memoryStore.incidents.length} incidents and ${memoryStore.runbooks.length} runbooks.`);
    return;
  }

  await Promise.all([
    IncidentDocument.deleteMany({}),
    RunbookDocument.deleteMany({}),
    ActionExecutionDocument.deleteMany({}),
    MonitorDocument.deleteMany({}),
    SettingDocument.deleteMany({}),
    WebhookLogDocument.deleteMany({}),
  ]);

  await Promise.all([
    IncidentDocument.insertMany(memoryStore.incidents),
    RunbookDocument.insertMany(memoryStore.runbooks),
    ActionExecutionDocument.insertMany(memoryStore.actionExecutions),
    MonitorDocument.insertMany(memoryStore.monitors),
    SettingDocument.insertMany(memoryStore.settings),
    WebhookLogDocument.insertMany(memoryStore.webhookLogs),
  ]);

  console.log(`Seeded MongoDB with ${memoryStore.incidents.length} incidents, ${memoryStore.runbooks.length} runbooks, and ${memoryStore.monitors.length} monitors.`);
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
