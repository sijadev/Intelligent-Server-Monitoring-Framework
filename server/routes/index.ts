import { Router } from 'express';
import { dashboardRoutes } from './dashboard.routes';
import { pluginsRoutes } from './plugins.routes';
import { problemsRoutes } from './problems.routes';
import { metricsRoutes } from './metrics.routes';
import { testManagerRoutes } from './test-manager.routes';
import { mcpRoutes } from './mcp.routes';
import { logsRoutes } from './logs.routes';
import { configRoutes } from './config.routes';
import { frameworkRoutes } from './framework.routes';
import { aiRoutes } from './ai.routes';
import { deploymentsRoutes } from './deployments.routes';
import { codeAnalysisRoutes } from './code-analysis.routes';
import { debugRoutes } from './debug.routes';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (_req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Mount all route modules
apiRouter.use('/dashboard', dashboardRoutes);
apiRouter.use('/plugins', pluginsRoutes);
apiRouter.use('/problems', problemsRoutes);
apiRouter.use('/metrics', metricsRoutes);
apiRouter.use('/test-manager', testManagerRoutes);
apiRouter.use('/mcp', mcpRoutes);
apiRouter.use('/logs', logsRoutes);
apiRouter.use('/config', configRoutes);
apiRouter.use('/framework', frameworkRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/deployments', deploymentsRoutes);
apiRouter.use('/code-analysis', codeAnalysisRoutes);
apiRouter.use('/debug', debugRoutes);

export { apiRouter };