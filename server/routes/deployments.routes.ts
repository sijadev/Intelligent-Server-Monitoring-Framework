import { Router } from 'express';
import { storage } from '../storage-init';
import { 
  insertDeploymentSchema,
  insertDeploymentMetricsSchema
} from '@shared/schema';

const router = Router();

// Deployments endpoints
router.get('/', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const deployments = await storage.getDeployments(limit);
    res.json(deployments);
  } catch (error) {
    res.status(500).json({ message: "Failed to get deployments" });
  }
});

router.get('/active', async (req, res) => {
  try {
    const deployments = await storage.getActiveDeployments();
    res.json(deployments);
  } catch (error) {
    res.status(500).json({ message: "Failed to get active deployments" });
  }
});

router.post('/', async (req, res) => {
  try {
    const validatedData = insertDeploymentSchema.parse(req.body);
    const deployment = await storage.createDeployment(validatedData);
    res.status(201).json(deployment);
  } catch (error) {
    res.status(400).json({ message: "Invalid deployment data" });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const deployment = await storage.getDeployment(req.params.id);
    if (!deployment) {
      return res.status(404).json({ message: "Deployment not found" });
    }
    res.json(deployment);
  } catch (error) {
    res.status(500).json({ message: "Failed to get deployment" });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updates = req.body;
    const deployment = await storage.updateDeployment(req.params.id, updates);
    if (!deployment) {
      return res.status(404).json({ message: "Deployment not found" });
    }
    res.json(deployment);
  } catch (error) {
    res.status(500).json({ message: "Failed to update deployment" });
  }
});

// Deployment Metrics endpoints
router.get('/:id/metrics', async (req, res) => {
  try {
    const metrics = await storage.getDeploymentMetrics(req.params.id);
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ message: "Failed to get deployment metrics" });
  }
});

router.post('/:id/metrics', async (req, res) => {
  try {
    const validatedData = insertDeploymentMetricsSchema.parse({
      ...req.body,
      deploymentId: req.params.id
    });
    const metrics = await storage.createDeploymentMetrics(validatedData);
    res.status(201).json(metrics);
  } catch (error) {
    res.status(400).json({ message: "Invalid deployment metrics data" });
  }
});

export { router as deploymentsRoutes };