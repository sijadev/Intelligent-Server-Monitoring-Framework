import { config } from '../config';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
  metadata?: Record<string, any>;
}

class LoggerService {
  private logLevel: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.logLevel = (config.LOG_LEVEL as LogLevel) || 'INFO';
    this.isDevelopment = config.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      DEBUG: 0,
      INFO: 1,
      WARN: 2,
      ERROR: 3
    };
    
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(entry: LogEntry): string {
    const timestamp = entry.timestamp.toISOString();
    const emoji = this.getEmoji(entry.level);
    
    let message = `${timestamp} ${emoji} [${entry.source}] ${entry.message}`;
    
    if (entry.metadata && Object.keys(entry.metadata).length > 0) {
      message += ` ${JSON.stringify(entry.metadata)}`;
    }
    
    return message;
  }

  private getEmoji(level: LogLevel): string {
    const emojis: Record<LogLevel, string> = {
      DEBUG: '🔍',
      INFO: 'ℹ️',
      WARN: '⚠️',
      ERROR: '❌'
    };
    
    return emojis[level] || 'ℹ️';
  }

  private log(level: LogLevel, source: string, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      source,
      message,
      metadata
    };

    const formattedMessage = this.formatMessage(entry);

    // Use appropriate console method based on level
    switch (level) {
      case 'ERROR':
        console.error(formattedMessage);
        break;
      case 'WARN':
        console.warn(formattedMessage);
        break;
      case 'DEBUG':
        if (this.isDevelopment) {
          console.debug(formattedMessage);
        }
        break;
      default:
        console.log(formattedMessage);
    }
  }

  debug(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('DEBUG', source, message, metadata);
  }

  info(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('INFO', source, message, metadata);
  }

  warn(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('WARN', source, message, metadata);
  }

  error(source: string, message: string, metadata?: Record<string, any>): void {
    this.log('ERROR', source, message, metadata);
  }

  // Convenience methods for common sources
  server(message: string, metadata?: Record<string, any>): void {
    this.info('server', message, metadata);
  }

  database(message: string, metadata?: Record<string, any>): void {
    this.info('database', message, metadata);
  }

  python(message: string, metadata?: Record<string, any>): void {
    this.info('python', message, metadata);
  }

  api(message: string, metadata?: Record<string, any>): void {
    this.info('api', message, metadata);
  }
}

export const logger = new LoggerService();