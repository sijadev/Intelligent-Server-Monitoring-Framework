import { Router } from 'express';
import { PluginsController } from '../controllers';

const router = Router();
const pluginsController = new PluginsController();

// Plugin management endpoints
router.get('/', pluginsController.getPlugins.bind(pluginsController));
router.post('/', pluginsController.createPlugin.bind(pluginsController));
router.get('/:id', pluginsController.getPlugin.bind(pluginsController));
router.put('/:id', pluginsController.updatePlugin.bind(pluginsController));
router.delete('/:id', pluginsController.deletePlugin.bind(pluginsController));

// Plugin control endpoints
router.post('/:pluginId/start', pluginsController.startPlugin.bind(pluginsController));
router.post('/:pluginId/stop', pluginsController.stopPlugin.bind(pluginsController));

export { router as pluginsRoutes };
