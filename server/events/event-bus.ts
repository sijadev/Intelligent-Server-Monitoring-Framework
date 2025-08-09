import { EventEmitter } from 'events';
import type { Problem, Metrics, Plugin, LogEntry } from '../../shared/schema.js';

// Event Type Definitions
export interface SystemEvents {
  // Server Events
  'server:started': { port: number; timestamp: Date };
  'server:stopping': { reason?: string; timestamp: Date };
  'server:error': { error: Error; timestamp: Date };

  // Database Events
  'database:connected': { timestamp: Date };
  'database:disconnected': { reason?: string; timestamp: Date };
  'database:error': { error: Error; timestamp: Date };

  // Python Framework Events
  'python:started': { pid: number; timestamp: Date };
  'python:stopped': { code?: number; timestamp: Date };
  'python:heartbeat': { status: any; timestamp: Date };
  'python:error': { error: Error; timestamp: Date };

  // Data Events
  'data:problem:created': { problem: Problem; timestamp: Date };
  'data:problem:resolved': { problemId: string; timestamp: Date };
  'data:metrics:updated': { metrics: Metrics; timestamp: Date };
  'data:plugin:created': { plugin: Plugin; timestamp: Date };
  'data:plugin:updated': { plugin: Plugin; timestamp: Date };
  'data:plugin:deleted': { pluginId: string; timestamp: Date };

  // WebSocket Events
  'ws:client:connected': { clientId: string; timestamp: Date };
  'ws:client:disconnected': { clientId: string; timestamp: Date };
  'ws:message:sent': { clientId: string; message: any; timestamp: Date };

  // Log Events
  'log:entry': { entry: LogEntry; timestamp: Date };
  'log:error': { error: Error; source: string; timestamp: Date };

  // Health Events
  'health:check': { healthy: boolean; details: any; timestamp: Date };
  'health:degraded': { service: string; reason: string; timestamp: Date };
}

// Event Handler Type
export type EventHandler<T = any> = (data: T) => void | Promise<void>;

// Event Bus Implementation
class EventBus extends EventEmitter {
  private eventHistory: Array<{ event: string; data: any; timestamp: Date }> = [];
  private maxHistorySize = 1000;

  constructor() {
    super();
    this.setMaxListeners(50); // Increase max listeners for complex systems
  }

  // Typed event emission
  emit<K extends keyof SystemEvents>(event: K, data: SystemEvents[K]): boolean {
    // Add to history
    this.addToHistory(event, data);

    // Emit event
    return super.emit(event, data);
  }

  // Typed event listening
  on<K extends keyof SystemEvents>(event: K, handler: EventHandler<SystemEvents[K]>): this {
    return super.on(event, handler);
  }

  // One-time event listening
  once<K extends keyof SystemEvents>(event: K, handler: EventHandler<SystemEvents[K]>): this {
    return super.once(event, handler);
  }

  // Remove listener
  off<K extends keyof SystemEvents>(event: K, handler: EventHandler<SystemEvents[K]>): this {
    return super.off(event, handler);
  }

  // Event history management
  private addToHistory(event: string, data: any): void {
    this.eventHistory.push({
      event,
      data,
      timestamp: new Date(),
    });

    // Trim history if too large
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory = this.eventHistory.slice(-this.maxHistorySize);
    }
  }

  // Get recent events
  getRecentEvents(limit = 50): Array<{ event: string; data: any; timestamp: Date }> {
    return this.eventHistory.slice(-limit);
  }

  // Get events by type
  getEventsByType(
    eventType: string,
    limit = 50,
  ): Array<{ event: string; data: any; timestamp: Date }> {
    return this.eventHistory.filter((e) => e.event === eventType).slice(-limit);
  }

  // Event statistics
  getEventStats(): Record<string, number> {
    const stats: Record<string, number> = {};

    for (const entry of this.eventHistory) {
      stats[entry.event] = (stats[entry.event] || 0) + 1;
    }

    return stats;
  }

  // Clear history
  clearHistory(): void {
    this.eventHistory = [];
  }

  // Middleware support for event processing
  use<K extends keyof SystemEvents>(
    event: K,
    middleware: (data: SystemEvents[K], next: () => void) => void,
  ): void {
    this.on(event, (data) => {
      middleware(data, () => {
        // Middleware chain continues
      });
    });
  }

  // Batch event emission
  emitBatch<K extends keyof SystemEvents>(
    events: Array<{ event: K; data: SystemEvents[K] }>,
  ): void {
    for (const { event, data } of events) {
      this.emit(event, data);
    }
  }

  // Wait for specific event
  waitFor<K extends keyof SystemEvents>(event: K, timeout = 10000): Promise<SystemEvents[K]> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.off(event, handler);
        reject(new Error(`Event '${event}' timeout after ${timeout}ms`));
      }, timeout);

      const handler = (data: SystemEvents[K]) => {
        clearTimeout(timer);
        resolve(data);
      };

      this.once(event, handler);
    });
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Helper functions
export function emitEvent<K extends keyof SystemEvents>(event: K, data: SystemEvents[K]): void {
  eventBus.emit(event, data);
}

export function onEvent<K extends keyof SystemEvents>(
  event: K,
  handler: EventHandler<SystemEvents[K]>,
): void {
  eventBus.on(event, handler);
}

// Event decorators for automatic event emission
export function EmitEvent<K extends keyof SystemEvents>(event: K) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        const result = await method.apply(this, args);

        // Emit success event with result data
        eventBus.emit(event, {
          ...result,
          timestamp: new Date(),
        } as SystemEvents[K]);

        return result;
      } catch (error) {
        // Emit error event
        eventBus.emit('server:error', {
          error: error as Error,
          timestamp: new Date(),
        });
        throw error;
      }
    };
  };
}
