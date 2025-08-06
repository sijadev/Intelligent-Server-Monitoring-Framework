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

  async getSystemInfo(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.storage.getDashboardData();
      res.json({
        serverStatus: data.serverStatus || 'running',
        databaseStatus: data.databaseStatus || { status: 'connected', lastConnection: new Date() },
        pythonFramework: data.pythonFramework || { status: 'running', healthy: true },
        testManager: data.testManager || { initialized: false, active: false },
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch system info');
    }
  }
}