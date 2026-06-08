import { initializeDatabase, closeDatabase, isUsingMemoryStore } from './connection';
import { IncidentDocument } from '../models/Incident';
import { RunbookDocument } from '../models/Runbook';
import { ActionExecutionDocument } from '../models/AuditLog';
import { MonitorDocument, SettingDocument, WebhookLogDocument } from '../models/Operational';

async function migrate() {
  await initializeDatabase();

  if (isUsingMemoryStore()) {
    console.log('MongoDB is unavailable; using in-memory demo store. No migrations required.');
    return;
  }

  await Promise.all([
    IncidentDocument.syncIndexes(),
    RunbookDocument.syncIndexes(),
    ActionExecutionDocument.syncIndexes(),
    MonitorDocument.syncIndexes(),
    SettingDocument.syncIndexes(),
    WebhookLogDocument.syncIndexes(),
  ]);

  console.log('MongoDB indexes synchronized successfully.');
}

migrate()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase();
  });
