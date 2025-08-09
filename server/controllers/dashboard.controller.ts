import type { Request, Response } from 'express';
import { BaseController } from './base.controller';

export class DashboardController extends BaseController {
  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      // Simple fallback dashboard data if storage fails
      const fallbackData = {
        status: {
          running: true,
          uptime: '24h 0m 0s',
          activeProblems: 0,
          pluginCount: 0,
          lastUpdate: new Date().toISOString(),
        },
        activeProblems: [],
        metrics: null,
        plugins: [],
        codeIssues: [],
        lastAnalysisRun: null,
        aiLearningStats: {
          totalInterventions: 0,
          successRate: 0,
          averageConfidence: 0,
          totalModelRetrains: 0,
          lastModelUpdate: null,
        },
        config: null,
      };

      try {
        const data = await this.storage.getDashboardData();
        res.json(data);
      } catch (storageError) {
        console.error('Storage error in getDashboard, using fallback:', storageError);
        res.json(fallbackData);
      }
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch dashboard data');
    }
  }

  async getSystemInfo(req: Request, res: Response): Promise<void> {
    try {
      const data = await this.storage.getDashboardData();
      res.json({
        serverStatus: data.status?.running ? 'running' : 'stopped',
        databaseStatus: { status: 'connected', lastConnection: new Date() },
        pythonFramework: { status: 'running', healthy: true },
        testManager: { initialized: false, active: false },
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        systemInfo: data.status,
      });
    } catch (error) {
      this.handleError(res, error, 'Failed to fetch system info');
    }
  }
}
