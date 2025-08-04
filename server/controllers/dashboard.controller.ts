import type { Request, Response } from 'express';
import { BaseController } from './base.controller';

export class DashboardController extends BaseController {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.storage.getDashboardData();
      res.json(data);
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch dashboard data');
    }
  }
}