import type { Request, Response } from 'express';
import { storage } from '../storage-init';
import { logAggregator } from '../services/log-aggregator';
import { 
  ErrorHandler, 
  createValidationError, 
  createNotFoundError,
  createDatabaseError,
  createServiceError,
  ErrorType,
  isIMFError
} from '../utils/error-handler';

export abstract class BaseController {
  protected storage = storage;
  protected logger = logAggregator;

  protected handleError(res: Response, error: unknown, context: string = 'controller'): void {
    ErrorHandler.handle(error, context, res);
  }

  protected handleValidationError(res: Response, message: string = 'Invalid request data', details?: any): void {
    const error = createValidationError(message, details);
    ErrorHandler.handle(error, 'controller-validation', res);
  }

  protected handleNotFound(res: Response, resource: string): void {
    const error = createNotFoundError(resource);
    ErrorHandler.handle(error, 'controller-not-found', res);
  }

  protected handleDatabaseError(res: Response, error: unknown, operation: string): void {
    const dbError = createDatabaseError(`Database ${operation} failed`, { originalError: error });
    ErrorHandler.handle(dbError, 'controller-database', res);
  }

  protected handleServiceError(res: Response, error: unknown, service: string): void {
    const serviceError = createServiceError(`${service} service error`, { originalError: error });
    ErrorHandler.handle(serviceError, 'controller-service', res);
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