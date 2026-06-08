import { Router } from 'express';
import { WebhookController } from '../controllers/WebhookController';

const router = Router();

router.post('/ingest', WebhookController.ingest);
router.get('/logs', WebhookController.getLogs);

export default router;
