import { EventEmitter } from 'events';
import { config } from '../config';
import type { Problem, Metrics, Plugin, LogEntry } from '@shared/schema';

// Server State Types
export interface ServerState {
  status: 'starting' | 'running' | 'stopping' | 'stopped' | 'error';
  startTime: Date | null;
  pythonFramework: {
    status: 'starting' | 'running' | 'stopped' | 'error';
    pid: number | null;
    lastHeartbeat: Date | null;
  };
  database: {
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    lastConnection: Date | null;
  };
  metrics: {
    requestCount: number;
    errorCount: number;
    lastMetrics: Metrics | null;
  };
  activeConnections: {
    websocket: number;
    http: number;
  };
}

export interface StateChangeEvent {
  type: 'server' | 'python' | 'database' | 'metrics';
  oldState: any;
  newState: any;
  timestamp: Date;
}

// Centralized State Manager
class ServerStateManager extends EventEmitter {
  private state: ServerState;
  
  constructor() {
    super();
    this.state = this.getInitialState();
  }

  private getInitialState(): ServerState {
    return {
      status: 'starting',
      startTime: null,
      pythonFramework: {
        status: 'stopped',
        pid: null,
        lastHeartbeat: null,
      },
      database: {
        status: 'connecting',
        lastConnection: null,
      },
      metrics: {
        requestCount: 0,
        errorCount: 0,
        lastMetrics: null,
      },
      activeConnections: {
        websocket: 0,
        http: 0,
      },
    };
  }

  // State Getters
  getState(): Readonly<ServerState> {
    return { ...this.state };
  }

  getServerStatus(): ServerState['status'] {
    return this.state.status;
  }

  getPythonFrameworkStatus(): ServerState['pythonFramework'] {
    return { ...this.state.pythonFramework };
  }

  getDatabaseStatus(): ServerState['database'] {
    return { ...this.state.database };
  }

  getMetrics(): ServerState['metrics'] {
    return { ...this.state.metrics };
  }

  // State Setters with Events
  setServerStatus(status: ServerState['status']) {
    const oldState = this.state.status;
    this.state.status = status;
    
    if (status === 'running' && !this.state.startTime) {
      this.state.startTime = new Date();
    }

    this.emitStateChange('server', oldState, status);
    this.emit('server:status', status, oldState);
  }

  setPythonFrameworkStatus(updates: Partial<ServerState['pythonFramework']>) {
    const oldState = { ...this.state.pythonFramework };
    this.state.pythonFramework = { ...this.state.pythonFramework, ...updates };
    
    this.emitStateChange('python', oldState, this.state.pythonFramework);
    this.emit('python:status', this.state.pythonFramework, oldState);
  }

  setDatabaseStatus(updates: Partial<ServerState['database']>) {
    const oldState = { ...this.state.database };
    this.state.database = { ...this.state.database, ...updates };
    
    this.emitStateChange('database', oldState, this.state.database);
    this.emit('database:status', this.state.database, oldState);
  }

  updateMetrics(updates: Partial<ServerState['metrics']>) {
    const oldState = { ...this.state.metrics };
    this.state.metrics = { ...this.state.metrics, ...updates };
    
    this.emitStateChange('metrics', oldState, this.state.metrics);
    this.emit('metrics:updated', this.state.metrics);
  }

  incrementRequestCount() {
    this.state.metrics.requestCount++;
    this.emit('metrics:request');
  }

  incrementErrorCount() {
    this.state.metrics.errorCount++;
    this.emit('metrics:error');
  }

  updateActiveConnections(type: 'websocket' | 'http', count: number) {
    this.state.activeConnections[type] = count;
    this.emit('connections:updated', this.state.activeConnections);
  }

  private emitStateChange(type: StateChangeEvent['type'], oldState: any, newState: any) {
    const event: StateChangeEvent = {
      type,
      oldState,
      newState,
      timestamp: new Date(),
    };
    this.emit('state:change', event);
  }

  // Health Check
  isHealthy(): boolean {
    return (
      this.state.status === 'running' &&
      this.state.database.status === 'connected' &&
      (this.state.pythonFramework.status === 'running' || !config.PYTHON_FRAMEWORK_ENABLED)
    );
  }

  getUptime(): number {
    if (!this.state.startTime) return 0;
    return Date.now() - this.state.startTime.getTime();
  }

  // Graceful Shutdown
  async shutdown(): Promise<void> {
    this.setServerStatus('stopping');
    
    // Emit shutdown event
    this.emit('server:shutdown');
    
    // Wait for cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.setServerStatus('stopped');
  }

  // Reset State (for testing)
  reset(): void {
    this.state = this.getInitialState();
    this.emit('state:reset');
  }
}

// Singleton instance
export const serverState = new ServerStateManager();

// Type exports
export type { ServerStateManager };