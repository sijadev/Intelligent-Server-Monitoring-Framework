import { Router } from 'express';
import { ProblemsController } from '../controllers';

const router = Router();
const problemsController = new ProblemsController();

// Problems management endpoints
router.get('/', problemsController.getProblems.bind(problemsController));
router.get('/active', problemsController.getActiveProblems.bind(problemsController));
router.post('/', problemsController.createProblem.bind(problemsController));
router.patch('/:id/resolve', problemsController.resolveProblem.bind(problemsController));

export { router as problemsRoutes };