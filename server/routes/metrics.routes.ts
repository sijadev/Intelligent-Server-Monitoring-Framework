import { Router } from 'express';
import { MetricsController } from '../controllers';

const router = Router();
const metricsController = new MetricsController();

// Metrics endpoints
router.get('/', metricsController.getMetrics.bind(metricsController));
router.get('/latest', metricsController.getLatestMetrics.bind(metricsController));
router.post('/', metricsController.createMetrics.bind(metricsController));

export { router as metricsRoutes };
