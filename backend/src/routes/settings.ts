import { Router } from 'express';
import { NotificationService } from '../services/NotificationService';
import { GitHubService } from '../services/GitHubService';
import { isUsingMemoryStore } from '../db/connection';
import { memoryStore } from '../db/memoryStore';
import { normalizeDocument, SettingDocument } from '../models/Operational';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

function groupSettings(rows: Array<{ key: string; value: string; category: string }>) {
  const grouped: Record<string, Array<{ key: string; value: string }>> = {};
  for (const row of rows) {
    if (!grouped[row.category]) grouped[row.category] = [];
    grouped[row.category].push({ key: row.key, value: row.value });
  }
  return grouped;
}

function categoryForKey(key: string): string {
  if (key.startsWith('slack')) return 'slack';
  if (key.startsWith('github')) return 'github';
  if (key.startsWith('pagerduty')) return 'pagerduty';
  return 'general';
}

router.get('/', async (_req, res) => {
  try {
    if (isUsingMemoryStore()) {
      res.json(groupSettings([...memoryStore.settings].sort((a, b) => a.category.localeCompare(b.category) || a.key.localeCompare(b.key))));
      return;
    }

    const settings = await SettingDocument.find({}).sort({ category: 1, key: 1 });
    res.json(groupSettings(settings.map((setting) => normalizeDocument(setting))));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

router.put('/', async (req, res) => {
  try {
    const updates = req.body as Record<string, string>;

    if (isUsingMemoryStore()) {
      for (const [key, value] of Object.entries(updates)) {
        const setting = memoryStore.settings.find((item) => item.key === key);
        if (setting) {
          setting.value = value;
          setting.updated_at = new Date();
        } else {
          memoryStore.settings.push({
            id: uuidv4(),
            key,
            value,
            category: categoryForKey(key),
            updated_at: new Date(),
          });
        }
      }
      res.json([...memoryStore.settings].sort((a, b) => a.category.localeCompare(b.category) || a.key.localeCompare(b.key)));
      return;
    }

    for (const [key, value] of Object.entries(updates)) {
      await SettingDocument.updateOne(
        { key },
        { key, value, category: categoryForKey(key), updated_at: new Date() },
        { upsert: true }
      );
    }
    const settings = await SettingDocument.find({}).sort({ category: 1, key: 1 });
    res.json(settings.map((setting) => normalizeDocument(setting)));
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

router.post('/slack/test', async (_req, res) => {
  const result = await NotificationService.testSlackConnection();
  res.json(result);
});

router.post('/github/test', async (_req, res) => {
  const result = await GitHubService.testConnection();
  res.json(result);
});

router.post('/pagerduty/test', async (_req, res) => {
  const result = await NotificationService.testPagerDutyConnection();
  res.json(result);
});

export default router;
