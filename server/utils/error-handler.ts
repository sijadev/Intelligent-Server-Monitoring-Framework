/**
 * Standardized Error Handling Utility for IMF
 * Provides consistent error handling, logging, and response patterns
 */

import { Response } from 'express';
import { logAggregator } from '../services/log-aggregator';

// Standard error types
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  DATABASE = 'DATABASE_ERROR',
  SERVICE = 'SERVICE_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND_ERROR',
  EXTERNAL_API = 'EXTERNAL_API_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
}

// Standard error response structure
export interface ErrorResponse {
  success: false;
  error: {
    type: ErrorType;
    message: string;
    code?: string;
    details?: any;
    timestamp: string;
    requestId?: string;
  };
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Standard error class
export class IMFError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly code?: string;
  public readonly details?: any;
  public readonly timestamp: Date;

  constructor(
    type: ErrorType,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    code?: string,
    details?: any
  ) {
    super(message);
    this.name = 'IMFError';
    this.type = type;
    this.severity = severity;
    this.code = code;
    this.details = details;
    this.timestamp = new Date();
    
    // Capture stack trace
    Error.captureStackTrace(this, IMFError);
  }
}

// HTTP status code mapping
const HTTP_STATUS_MAP: Record<ErrorType, number> = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.AUTHORIZATION]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.DATABASE]: 500,
  [ErrorType.SERVICE]: 500,
  [ErrorType.EXTERNAL_API]: 502,
  [ErrorType.INTERNAL]: 500,
};

// Standardized error handler
export class ErrorHandler {
  /**
   * Handle errors consistently across the application
   */
  static handle(error: unknown, context: string, res?: Response): ErrorResponse {
    const errorResponse = this.createErrorResponse(error, context);
    
    // Log the error
    this.logError(error, context, errorResponse);
    
    // Send HTTP response if res is provided
    if (res) {
      const statusCode = this.getHttpStatusCode(errorResponse.error.type);
      res.status(statusCode).json(errorResponse);
    }
    
    return errorResponse;
  }

  /**
   * Create standardized error response
   */
  private static createErrorResponse(error: unknown, context: string): ErrorResponse {
    if (error instanceof IMFError) {
      return {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          code: error.code,
          details: error.details,
          timestamp: error.timestamp.toISOString(),
        },
      };
    }

    // Handle standard JavaScript errors
    if (error instanceof Error) {
      return {
        success: false,
        error: {
          type: ErrorType.INTERNAL,
          message: error.message,
          details: { context, stack: error.stack },
          timestamp: new Date().toISOString(),
        },
      };
    }

    // Handle unknown errors
    return {
      success: false,
      error: {
        type: ErrorType.INTERNAL,
        message: 'An unexpected error occurred',
        details: { context, originalError: error },
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Log error with appropriate severity
   */
  private static logError(error: unknown, context: string, errorResponse: ErrorResponse) {
    const severity = error instanceof IMFError ? error.severity : ErrorSeverity.HIGH;
    const logLevel = this.getLogLevel(severity);
    
    logAggregator.log(
      logLevel,
      context,
      `${errorResponse.error.type}: ${errorResponse.error.message}`,
      {
        errorType: errorResponse.error.type,
        errorCode: errorResponse.error.code,
        errorDetails: errorResponse.error.details,
        severity,
        timestamp: errorResponse.error.timestamp,
      }
    );
  }

  /**
   * Get HTTP status code for error type
   */
  private static getHttpStatusCode(errorType: ErrorType): number {
    return HTTP_STATUS_MAP[errorType] || 500;
  }

  /**
   * Get log level for error severity
   */
  private static getLogLevel(severity: ErrorSeverity): 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'WARN';
      case ErrorSeverity.MEDIUM:
        return 'ERROR';
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        return 'ERROR';
      default:
        return 'ERROR';
    }
  }
}

// Async error handler wrapper
export function handleAsyncError<T>(
  asyncFn: () => Promise<T>,
  context: string,
  res?: Response
): Promise<T | ErrorResponse> {
  return asyncFn().catch((error) => {
    return ErrorHandler.handle(error, context, res);
  });
}

// Express middleware for error handling
export function errorMiddleware(error: unknown, req: any, res: Response, next: any) {
  const context = `${req.method} ${req.path}`;
  ErrorHandler.handle(error, context, res);
}

// Utility functions for common error types
export const createValidationError = (message: string, details?: any) =>
  new IMFError(ErrorType.VALIDATION, message, ErrorSeverity.LOW, undefined, details);

export const createDatabaseError = (message: string, details?: any) =>
  new IMFError(ErrorType.DATABASE, message, ErrorSeverity.HIGH, undefined, details);

export const createServiceError = (message: string, details?: any) =>
  new IMFError(ErrorType.SERVICE, message, ErrorSeverity.MEDIUM, undefined, details);

export const createNotFoundError = (resource: string) =>
  new IMFError(ErrorType.NOT_FOUND, `${resource} not found`, ErrorSeverity.LOW);

export const createAuthenticationError = (message: string = 'Authentication required') =>
  new IMFError(ErrorType.AUTHENTICATION, message, ErrorSeverity.MEDIUM);

export const createAuthorizationError = (message: string = 'Access denied') =>
  new IMFError(ErrorType.AUTHORIZATION, message, ErrorSeverity.MEDIUM);

// Type guards
export const isIMFError = (error: unknown): error is IMFError =>
  error instanceof IMFError;

export const isErrorResponse = (response: any): response is ErrorResponse =>
  response && typeof response === 'object' && response.success === false && response.error;