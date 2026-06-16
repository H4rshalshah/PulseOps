import { Router } from 'express';
import { RunbookController } from '../controllers/RunbookController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.use(requireAuth);

router.get('/', RunbookController.list);
router.post('/', RunbookController.create);
router.get('/stats', RunbookController.getStats);
router.get('/:id', RunbookController.getById);
router.put('/:id', RunbookController.update);
router.delete('/:id', RunbookController.delete);
router.post('/:id/execute', RunbookController.execute);
router.post('/:id/test', RunbookController.test);

export default router;
