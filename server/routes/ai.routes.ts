import { Router } from 'express';
import { storage } from '../storage-init';
import { 
  insertAiInterventionSchema,
  insertAiModelSchema,
  insertDeploymentSchema,
  insertDeploymentMetricsSchema
} from '@shared/schema';

const router = Router();

// AI Interventions endpoints
router.get('/interventions', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const interventions = await storage.getAiInterventions(limit);
    res.json(interventions);
  } catch (error) {
    res.status(500).json({ message: "Failed to get AI interventions" });
  }
});

router.post('/interventions', async (req, res) => {
  try {
    const validatedData = insertAiInterventionSchema.parse(req.body);
    const intervention = await storage.createAiIntervention(validatedData);
    res.status(201).json(intervention);
  } catch (error) {
    res.status(400).json({ message: "Invalid intervention data" });
  }
});

router.get('/interventions/recent', async (req, res) => {
  try {
    const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
    const interventions = await storage.getRecentAiInterventions(hours);
    res.json(interventions);
  } catch (error) {
    res.status(500).json({ message: "Failed to get recent AI interventions" });
  }
});

// AI Models endpoints
router.get('/models', async (req, res) => {
  try {
    const models = await storage.getAiModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ message: "Failed to get AI models" });
  }
});

router.get('/models/active', async (req, res) => {
  try {
    const models = await storage.getActiveAiModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ message: "Failed to get active AI models" });
  }
});

router.post('/models', async (req, res) => {
  try {
    const validatedData = insertAiModelSchema.parse(req.body);
    const model = await storage.createAiModel(validatedData);
    res.status(201).json(model);
  } catch (error) {
    res.status(400).json({ message: "Invalid AI model data" });
  }
});

router.patch('/models/:id', async (req, res) => {
  try {
    const updates = req.body;
    const model = await storage.updateAiModel(req.params.id, updates);
    if (!model) {
      return res.status(404).json({ message: "AI model not found" });
    }
    res.json(model);
  } catch (error) {
    res.status(500).json({ message: "Failed to update AI model" });
  }
});

// AI Learning Statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const stats = await storage.getAiLearningStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: "Failed to get AI learning statistics" });
  }
});

// AI Operations endpoints
router.post('/train', async (req, res) => {
  try {
    // This would trigger AI model training
    // For now, return a placeholder response
    res.json({ 
      message: "AI training initiated",
      status: "started",
      estimatedDuration: "5-10 minutes"
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to start AI training" });
  }
});

router.post('/predict', async (req, res) => {
  try {
    const { problemType, confidence, riskScore } = req.body;
    
    // This would use the AI system to predict intervention success
    // For now, return a placeholder prediction
    const prediction = {
      successProbability: Math.max(0, confidence - riskScore),
      recommendedAction: confidence > 0.8 ? "auto_apply" : "manual_review",
      confidence: confidence || 0.5
    };
    
    res.json(prediction);
  } catch (error) {
    res.status(500).json({ message: "Failed to generate AI prediction" });
  }
});

export { router as aiRoutes };