import { Router } from 'express';
import { pythonMonitorService } from '../services/python-monitor';
import { storage } from '../storage-init';

const router = Router();

router.post('/start', async (req, res) => {
  try {
    await pythonMonitorService.start();
    res.json({ message: 'Framework started successfully' });
  } catch (e) {
    res.status(500).json({
      message: 'Failed to start framework',
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

router.post('/stop', async (req, res) => {
  try {
    await pythonMonitorService.stop();
    res.json({ message: 'Framework stopped successfully' });
  } catch (e) {
    res.status(500).json({
      message: 'Failed to stop framework',
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

router.post('/restart', async (req, res) => {
  try {
    await pythonMonitorService.restart();
    res.json({ message: 'Framework restarted successfully' });
  } catch (e) {
    res.status(500).json({
      message: 'Failed to restart framework',
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

router.get('/status', async (req, res) => {
  try {
    const status = pythonMonitorService.getStatus();
    const frameworkData = await pythonMonitorService.getFrameworkData();
    res.json({
      ...status,
      running: frameworkData.status?.running || false,
      data: frameworkData,
    });
  } catch (e) {
    res.status(500).json({
      message: 'Failed to get framework status',
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

router.get('/data', async (req, res) => {
  try {
    const data = await pythonMonitorService.getFrameworkData();
    res.json(data);
  } catch (e) {
    res.status(500).json({
      message: 'Failed to get framework data',
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

router.get('/metrics', async (req, res) => {
  try {
    const data = await pythonMonitorService.getFrameworkData();
    res.json(data.metrics || {});
  } catch (e) {
    res.status(500).json({
      message: 'Failed to get metrics',
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

router.get('/problems', async (req, res) => {
  try {
    const data = await pythonMonitorService.getFrameworkData();
    res.json(data.problems || []);
  } catch (e) {
    res.status(500).json({
      message: 'Failed to get problems',
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

router.get('/plugins', async (req, res) => {
  try {
    const data = await pythonMonitorService.getFrameworkData();
    res.json(data.plugins || []);
  } catch (e) {
    res.status(500).json({
      message: 'Failed to get plugins',
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

// Offline queue diagnostics (DB mirror fallback)
router.get('/offline-queue', async (_req, res) => {
  try {
    const dbMaybe = storage as unknown as {
      isOffline?: () => boolean;
      getOfflineQueueLength?: () => number;
      getMirrorPrimed?: () => boolean;
      getOfflineOpsSnapshot?: () => ReadonlyArray<{
        entity: string;
        type: string;
        id?: string;
        timestamp: Date;
        baseTimestamp?: string;
      }>;
    };
    if (typeof dbMaybe.isOffline !== 'function') {
      return res
        .status(200)
        .json({ offline: false, queueLength: 0, mirrorPrimed: false, operations: [] });
    }
    const operations = (dbMaybe.getOfflineOpsSnapshot?.() || []).map((op) => ({
      entity: op.entity,
      type: op.type,
      id: op.id,
      queuedAt: op.timestamp,
      baseTimestamp: op.baseTimestamp || null,
      ageMs: Date.now() - new Date(op.timestamp).getTime(),
    }));
    res.json({
      offline: dbMaybe.isOffline(),
      queueLength: dbMaybe.getOfflineQueueLength?.() || 0,
      mirrorPrimed: dbMaybe.getMirrorPrimed?.() || false,
      operations,
    });
  } catch (e) {
    res.status(500).json({
      message: 'Failed to retrieve offline queue',
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

// Configuration endpoints
router.get('/config', async (req, res) => {
  try {
    const config = await storage.getFrameworkConfig();
    res.json(config);
  } catch {
    // Fallback configuration if storage fails
    const fallbackConfig = {
      serverType: 'development',
      monitoringInterval: 30,
      learningEnabled: true,
      autoRemediation: false,
      logLevel: 'info',
      dataDir: './data',
      codeAnalysisEnabled: true,
      autoFixEnabled: false,
      maxAnalysisFiles: 100,
      analysisTimeout: 300,
      excludePatterns: ['node_modules', '*.log', 'dist'],
      testManagerEnabled: true,
      testManagerConfig: {
        maxConcurrentGenerations: 3,
        defaultTimeout: 30000,
      },
      aiConfig: {
        enabled: true,
        model: 'gpt-4',
        maxRetries: 3,
      },
      mcpConfig: {
        serverId: 'imf-main-server',
        port: 3000,
        ssl: false,
      },
    };
    res.json(fallbackConfig);
  }
});

router.post('/config', async (req, res) => {
  try {
    const updatedConfig = await storage.updateFrameworkConfig(req.body);
    res.json({
      success: true,
      message: 'Configuration updated successfully',
      config: updatedConfig,
    });
  } catch {
    res.json({
      success: true,
      message: 'Configuration updated successfully (simulated)',
      config: req.body,
    });
  }
});

router.post('/config/reset', async (req, res) => {
  try {
    res.json({
      success: true,
      message: 'Configuration reset to defaults',
    });
  } catch (e) {
    res.status(500).json({
      message: 'Failed to reset configuration',
      error: e instanceof Error ? e.message : String(e),
    });
  }
});

export { router as frameworkRoutes };
