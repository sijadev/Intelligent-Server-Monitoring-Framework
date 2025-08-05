import { Router } from 'express';
import { pythonMonitorService } from '../services/python-monitor';

const router = Router();

router.post('/start', async (req, res) => {
  try {
    await pythonMonitorService.start();
    res.json({ message: "Framework started successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to start framework" });
  }
});

router.post('/stop', async (req, res) => {
  try {
    await pythonMonitorService.stop();
    res.json({ message: "Framework stopped successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to stop framework" });
  }
});

router.post('/restart', async (req, res) => {
  try {
    await pythonMonitorService.restart();
    res.json({ message: "Framework restarted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to restart framework" });
  }
});

router.get('/status', async (req, res) => {
  try {
    const status = pythonMonitorService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ message: "Failed to get framework status" });
  }
});

export { router as frameworkRoutes };