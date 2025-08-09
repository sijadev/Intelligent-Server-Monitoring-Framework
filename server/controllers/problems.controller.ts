import type { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { insertProblemSchema } from '../../shared/schema.js';

export class ProblemsController extends BaseController {
  async getProblems(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      // Validate limit parameter
      if (isNaN(limit) || limit < 1 || limit > 1000) {
        this.handleValidationError(res, 'Limit must be between 1 and 1000', { limit });
        return;
      }

      const problems = await this.storage.getProblems(limit);
      res.json(problems);
    } catch (error) {
      this.handleDatabaseError(res, error, 'fetch problems');
    }
  }

  async getActiveProblems(req: Request, res: Response): Promise<void> {
    try {
      const problems = await this.storage.getActiveProblem();
      res.json(problems);
    } catch (error) {
      this.handleDatabaseError(res, error, 'fetch active problems');
    }
  }

  async createProblem(req: Request, res: Response): Promise<void> {
    try {
      // Convert timestamp string to Date object if needed
      if (req.body.timestamp && typeof req.body.timestamp === 'string') {
        req.body.timestamp = new Date(req.body.timestamp);
      }

      const problem = insertProblemSchema.parse(req.body);
      const created = await this.storage.createProblem(problem);
      res.status(201).json(created);
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        this.handleValidationError(res, 'Invalid problem data', error.message);
      } else {
        this.handleDatabaseError(res, error, 'create problem');
      }
    }
  }

  async resolveProblem(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      // Validate ID parameter
      if (!id || typeof id !== 'string') {
        this.handleValidationError(res, 'Problem ID is required', { id });
        return;
      }

      const resolved = await this.storage.resolveProblem(id);

      if (!resolved) {
        this.handleNotFound(res, 'Problem');
        return;
      }

      res.json(resolved);
    } catch (error) {
      this.handleDatabaseError(res, error, 'resolve problem');
    }
  }
}
