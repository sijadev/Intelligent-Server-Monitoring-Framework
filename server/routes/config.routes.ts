import { Router } from 'express';
import { storage } from '../storage-init';
import { pythonMonitorService } from '../services/python-monitor';
import { insertFrameworkConfigSchema } from '@shared/schema';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const config = await storage.getFrameworkConfig();
    if (!config) {
      return res.status(404).json({ message: "Configuration not found" });
    }
    res.json(config);
  } catch (error) {
    res.status(500).json({ message: "Failed to get configuration" });
  }
});

router.put('/', async (req, res) => {
  try {
    const config = insertFrameworkConfigSchema.parse(req.body);
    const updated = await storage.updateFrameworkConfig(config);
    
    // Restart Python framework with new config
    pythonMonitorService.restart().catch(console.error);
    
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: "Invalid configuration data" });
  }
});

export { router as configRoutes };