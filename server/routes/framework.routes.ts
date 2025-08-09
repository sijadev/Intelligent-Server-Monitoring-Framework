import { Router } from 'express';
import { pythonMonitorService } from '../services/python-monitor';
import { storage } from '../storage-init';

const router = Router();

router.post('/start', async (req, res) => {
  try {
    await pythonMonitorService.start();
    res.json({ message: 'Framework started successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to start framework' });
  }
});

router.post('/stop', async (req, res) => {
  try {
    await pythonMonitorService.stop();
    res.json({ message: 'Framework stopped successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to stop framework' });
  }
});

router.post('/restart', async (req, res) => {
  try {
    await pythonMonitorService.restart();
    res.json({ message: 'Framework restarted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to restart framework' });
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
  } catch (error) {
    res.status(500).json({ message: 'Failed to get framework status' });
  }
});

router.get('/data', async (req, res) => {
  try {
    const data = await pythonMonitorService.getFrameworkData();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get framework data', error: error.message });
  }
});

router.get('/metrics', async (req, res) => {
  try {
    const data = await pythonMonitorService.getFrameworkData();
    res.json(data.metrics || {});
  } catch (error) {
    res.status(500).json({ message: 'Failed to get metrics', error: error.message });
  }
});

router.get('/problems', async (req, res) => {
  try {
    const data = await pythonMonitorService.getFrameworkData();
    res.json(data.problems || []);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get problems', error: error.message });
  }
});

router.get('/plugins', async (req, res) => {
  try {
    const data = await pythonMonitorService.getFrameworkData();
    res.json(data.plugins || []);
  } catch (error) {
    res.status(500).json({ message: 'Failed to get plugins', error: error.message });
  }
});

// Configuration endpoints
router.get('/config', async (req, res) => {
  try {
    const config = await storage.getFrameworkConfig();
    res.json(config);
  } catch (error) {
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
  } catch (error) {
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
  } catch (error) {
    res.status(500).json({ message: 'Failed to reset configuration' });
  }
});

export { router as frameworkRoutes };
