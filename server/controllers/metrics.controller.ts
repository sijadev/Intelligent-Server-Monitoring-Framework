import type { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { insertMetricsSchema } from '@shared/schema';

export class MetricsController extends BaseController {
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const metrics = await this.storage.getMetricsHistory(limit);
      res.json(metrics);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch metrics');
    }
  }

  async getLatestMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await this.storage.getLatestMetrics();
      res.json(metrics);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch latest metrics');
    }
  }

  async createMetrics(req: Request, res: Response): Promise<void> {
    try {
      // Convert timestamp string to Date object if needed
      if (req.body.timestamp && typeof req.body.timestamp === 'string') {
        req.body.timestamp = new Date(req.body.timestamp);
      }
      
      const metrics = insertMetricsSchema.parse(req.body);
      const created = await this.storage.createMetrics(metrics);
      res.json(created);
    } catch (error) {
      this.handleValidationError(res, 'Invalid metrics data');
    }
  }
}