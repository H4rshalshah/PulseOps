import { Router } from 'express';
import { MonitorController } from '../controllers/MonitorController';

const router = Router();

router.get('/', MonitorController.list);
router.post('/', MonitorController.create);
router.put('/:id', MonitorController.update);
router.delete('/:id', MonitorController.delete);
router.post('/:id/check', MonitorController.check);

export default router;
