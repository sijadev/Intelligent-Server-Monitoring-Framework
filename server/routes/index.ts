import { Router } from 'express';
import { dashboardRoutes } from './dashboard.routes';
import { pluginsRoutes } from './plugins.routes';
import { problemsRoutes } from './problems.routes';
import { metricsRoutes } from './metrics.routes';

const apiRouter = Router();

// Mount all route modules
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/plugins', pluginsRoutes);
apiRouter.use('/problems', problemsRoutes);
apiRouter.use('/metrics', metricsRoutes);

export { apiRouter };