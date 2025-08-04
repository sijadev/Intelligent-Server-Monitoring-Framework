import type { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { insertProblemSchema } from '@shared/schema';

export class ProblemsController extends BaseController {
  async getProblems(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const problems = await this.storage.getProblems(limit);
      res.json(problems);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch problems');
    }
  }

  async getActiveProblems(req: Request, res: Response): Promise<void> {
    try {
      const problems = await this.storage.getActiveProblem();
      res.json(problems);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch active problems');
    }
  }

  async createProblem(req: Request, res: Response): Promise<void> {
    try {
      const problem = insertProblemSchema.parse(req.body);
      const created = await this.storage.createProblem(problem);
      res.json(created);
    } catch (error) {
      this.handleValidationError(res, 'Invalid problem data');
    }
  }

  async resolveProblem(req: Request, res: Response): Promise<void> {
    try {
      const resolved = await this.storage.resolveProblem(req.params.id);
      
      if (!resolved) {
        this.handleNotFound(res, 'Problem');
        return;
      }
      
      res.json(resolved);
    } catch (error) {
      this.handleError(res, error, 'Failed to resolve problem');
    }
  }
}