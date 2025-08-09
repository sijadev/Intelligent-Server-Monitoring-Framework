import { Router } from 'express';
import { DashboardController } from '../controllers';

const router = Router();
const dashboardController = new DashboardController();

// Dashboard data endpoint
router.get('/', dashboardController.getDashboard.bind(dashboardController));
router.get('/system-info', dashboardController.getSystemInfo.bind(dashboardController));

export { router as dashboardRoutes };
