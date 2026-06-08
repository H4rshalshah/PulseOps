import { Router } from 'express';
import { IncidentController } from '../controllers/IncidentController';

const router = Router();

router.get('/', IncidentController.list);
router.post('/', IncidentController.create);
router.get('/summary', IncidentController.getSummary);
router.get('/:id', IncidentController.getById);
router.patch('/:id', IncidentController.update);
router.delete('/:id', IncidentController.delete);
router.post('/:id/resolve', IncidentController.resolve);
router.post('/:id/situation-report', IncidentController.generateSituationReport);

export default router;
