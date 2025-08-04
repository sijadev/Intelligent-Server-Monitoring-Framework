import type { Request, Response } from 'express';
import { storage } from '../storage-init';
import { logAggregator } from '../services/log-aggregator';

export abstract class BaseController {
  protected storage = storage;
  protected logger = logAggregator;

  protected handleError(res: Response, error: unknown, message: string = 'Internal server error'): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.log('ERROR', 'controller', `${message}: ${errorMessage}`);
    res.status(500).json({ message, error: errorMessage });
  }

  protected handleValidationError(res: Response, message: string = 'Invalid request data'): void {
    this.logger.log('WARN', 'controller', `Validation error: ${message}`);
    res.status(400).json({ message });
  }

  protected handleNotFound(res: Response, resource: string): void {
    const message = `${resource} not found`;
    this.logger.log('WARN', 'controller', message);
    res.status(404).json({ message });
  }

  protected logRequest(req: Request): void {
    this.logger.logRequest(
      req.method,
      req.originalUrl,
      200, // Will be updated by middleware
      0, // Will be updated by middleware
      req.get('User-Agent')
    );
  }
}