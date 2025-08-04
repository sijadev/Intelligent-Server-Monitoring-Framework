import { EventEmitter } from 'events';
import { storage } from '../storage-init';
import type { InsertLogEntry } from '@shared/schema';

export interface LogEntry {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  source: string;
  rawLine?: string;
  metadata?: Record<string, any>;
}

class LogAggregator extends EventEmitter {
  private originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info,
    debug: console.debug
  };

  constructor() {
    super();
    this.setMaxListeners(50); // Increase max listeners to handle multiple test scenarios
    this.interceptConsole();
  }

  private interceptConsole() {
    // Intercept console.log
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.captureLog('INFO', 'server', args.join(' '));
    };

    // Intercept console.warn
    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.captureLog('WARN', 'server', args.join(' '));
    };

    // Intercept console.error
    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.captureLog('ERROR', 'server', args.join(' '));
    };

    // Intercept console.info
    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.captureLog('INFO', 'server', args.join(' '));
    };

    // Intercept console.debug
    console.debug = (...args: any[]) => {
      this.originalConsole.debug(...args);
      this.captureLog('DEBUG', 'server', args.join(' '));
    };
  }

  private async captureLog(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', source: string, message: string, metadata?: Record<string, any>) {
    const logEntry: InsertLogEntry = {
      timestamp: new Date(),
      level,
      message,
      source,
      rawLine: message,
      metadata: metadata || {}
    };

    try {
      // Store in database
      await storage.createLogEntry(logEntry);
      
      // Emit event for real-time updates
      this.emit('log', logEntry);
    } catch (error) {
      // Use original console to avoid recursion
      this.originalConsole.error('Failed to store log entry:', error);
    }
  }

  // Method to log custom entries
  async log(level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', source: string, message: string, metadata?: Record<string, any>) {
    await this.captureLog(level, source, message, metadata);
  }

  // Method to restore original console (for cleanup)
  restore() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
  }

  // Log HTTP requests
  logRequest(method: string, url: string, statusCode: number, duration: number, userAgent?: string) {
    this.captureLog('INFO', 'http', `${method} ${url} ${statusCode} - ${duration}ms`, {
      method,
      url,
      statusCode,
      duration,
      userAgent
    });
  }

  // Log WebSocket events
  logWebSocket(event: string, clientId?: string, data?: any) {
    this.captureLog('INFO', 'websocket', `${event}${clientId ? ` - Client: ${clientId}` : ''}`, {
      event,
      clientId,
      data
    });
  }

  // Log Python framework events
  logPythonFramework(event: string, message: string, data?: any) {
    // Determine log level from data if provided
    const level = data?.level || 'INFO';
    
    // Clean up the message to remove redundant prefixes
    let cleanMessage = message;
    if (message.includes(' - INFO -')) {
      cleanMessage = message.split(' - INFO - ')[1] || message;
    } else if (message.includes(' - ERROR -')) {
      cleanMessage = message.split(' - ERROR - ')[1] || message;
    } else if (message.includes(' - WARNING -')) {
      cleanMessage = message.split(' - WARNING - ')[1] || message;
    } else if (message.includes(' - DEBUG -')) {
      cleanMessage = message.split(' - DEBUG - ')[1] || message;
    }
    
    this.captureLog(level as 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', 'python-framework', cleanMessage, {
      event,
      originalMessage: message !== cleanMessage ? message : undefined,
      ...data
    });
  }

  // Log database operations
  logDatabase(operation: string, table: string, success: boolean, duration?: number, error?: string) {
    const level = success ? 'INFO' : 'ERROR';
    const message = success 
      ? `${operation} on ${table}${duration ? ` (${duration}ms)` : ''}`
      : `${operation} on ${table} failed: ${error}`;
    
    this.captureLog(level, 'database', message, {
      operation,
      table,
      success,
      duration,
      error
    });
  }

  // Log plugin operations
  logPlugin(pluginName: string, operation: string, success: boolean, message?: string, data?: any) {
    const level = success ? 'INFO' : 'ERROR';
    const logMessage = `Plugin ${pluginName}: ${operation}${message ? ` - ${message}` : ''}`;
    
    this.captureLog(level, 'plugin', logMessage, {
      pluginName,
      operation,
      success,
      data
    });
  }
}

// Singleton instance
export const logAggregator = new LogAggregator();