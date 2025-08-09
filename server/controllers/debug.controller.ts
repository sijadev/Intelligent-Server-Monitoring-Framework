import type { Request, Response } from 'express';
import { BaseController } from './base.controller';

export class DebugController extends BaseController {
  async getStorageDebugInfo(req: Request, res: Response): Promise<void> {
    try {
      const debugInfo = {
        storageType: 'DatabaseStorage',
        pluginsCount: 0,
        problemsCount: 0,
        metricsCount: 0,
        databaseUrl: process.env.DATABASE_URL ? 'configured' : 'not configured',
        configuration: {
          nodeEnv: process.env.NODE_ENV,
          pythonFrameworkEnabled: process.env.PYTHON_FRAMEWORK_ENABLED === 'true',
          testManagerEnabled: process.env.TEST_MANAGER_ENABLED === 'true',
        },
        timestamp: new Date().toISOString(),
      };

      res.json(debugInfo);
    } catch (error) {
      this.handleError(res, error, 'Failed to get storage debug info');
    }
  }

  async testQueries(req: Request, res: Response): Promise<void> {
    try {
      const results: any = {};

      // Test each method individually
      try {
        await this.storage.getActiveProblem();
        results.activeProblems = 'OK';
      } catch (error) {
        results.activeProblems = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      }

      try {
        await this.storage.getLatestMetrics();
        results.latestMetrics = 'OK';
      } catch (error) {
        results.latestMetrics = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      }

      try {
        await this.storage.getPlugins();
        results.plugins = 'OK';
      } catch (error) {
        results.plugins = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      }

      try {
        await this.storage.getActiveCodeIssues();
        results.activeCodeIssues = 'OK';
      } catch (error) {
        results.activeCodeIssues = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      }

      try {
        await this.storage.getLatestCodeAnalysisRun();
        results.latestCodeAnalysisRun = 'OK';
      } catch (error) {
        results.latestCodeAnalysisRun = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      }

      try {
        await this.storage.getFrameworkConfig();
        results.frameworkConfig = 'OK';
      } catch (error) {
        results.frameworkConfig = `ERROR: ${error instanceof Error ? error.message : String(error)}`;
      }

      res.json(results);
    } catch (error) {
      this.handleError(res, error, 'Failed to test queries');
    }
  }
}
