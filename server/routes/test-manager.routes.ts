import { Router } from 'express';
import { TestManagerController } from '../controllers/test-manager.controller';

const router = Router();
const testManagerController = new TestManagerController();

// Profile Management Routes
router.get('/profiles', (req, res) => testManagerController.getProfiles(req, res));
router.get('/profiles/:profileId', (req, res) => testManagerController.getProfile(req, res));
router.post('/profiles', (req, res) => testManagerController.createProfile(req, res));
router.put('/profiles/:profileId', (req, res) => testManagerController.updateProfile(req, res));
router.delete('/profiles/:profileId', (req, res) => testManagerController.deleteProfile(req, res));

// Test Data Generation Routes
router.post('/profiles/:profileId/generate', (req, res) => testManagerController.generateTestData(req, res));
router.get('/generated-data', (req, res) => testManagerController.getGeneratedData(req, res));

// Status and Monitoring Routes
router.get('/status', (req, res) => testManagerController.getStatus(req, res));
router.get('/health', (req, res) => testManagerController.getHealthCheck(req, res));

// Utility Routes
router.get('/templates', (req, res) => testManagerController.getProfileTemplates(req, res));
router.get('/problem-types', (req, res) => testManagerController.getProblemTypes(req, res));

export { router as testManagerRoutes };