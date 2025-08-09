/**
 * DSL Composition Routes
 *
 * API-Routen für die BDD/DSL-basierte Testprofil-Generierung
 */

import { Router } from 'express';
import { DSLCompositionController } from '../controllers/dsl-composition.controller';

const router = Router();
const dslController = new DSLCompositionController();

// Module Discovery & Search
router.get('/modules', dslController.getAvailableModules.bind(dslController));
router.post('/modules/search', dslController.searchModules.bind(dslController));

// Scenario Processing
router.post('/parse', dslController.parseScenario.bind(dslController));
router.post('/validate', dslController.validateScenario.bind(dslController));
router.post('/generate-profile', dslController.generateTestProfile.bind(dslController));

// Examples & Templates
router.get('/examples', dslController.getExampleScenarios.bind(dslController));

export { router as dslCompositionRoutes };
