import { Router } from 'express';
import { DebugController } from '../controllers/debug.controller';

const router = Router();
const debugController = new DebugController();

// Debug endpoints
router.get('/storage', debugController.getStorageDebugInfo.bind(debugController));
router.get('/test-queries', debugController.testQueries.bind(debugController));

export { router as debugRoutes };
