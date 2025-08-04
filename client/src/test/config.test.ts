import { describe, it, expect } from 'vitest';
import { appConfig } from '@/config/app';

describe('App Configuration', () => {
  it('should have valid API configuration', () => {
    expect(appConfig.api).toBeDefined();
    expect(appConfig.api.baseUrl).toBe('/api');
    expect(appConfig.api.timeout).toBe(10000);
  });

  it('should have valid WebSocket configuration', () => {
    expect(appConfig.websocket).toBeDefined();
    expect(appConfig.websocket.reconnectInterval).toBe(5000);
    expect(appConfig.websocket.maxReconnectAttempts).toBe(10);
  });

  it('should have valid UI configuration', () => {
    expect(appConfig.ui).toBeDefined();
    expect(appConfig.ui.refreshIntervals).toBeDefined();
    expect(appConfig.ui.refreshIntervals.dashboard).toBe(30000);
    expect(appConfig.ui.refreshIntervals.problems).toBe(10000);
    expect(appConfig.ui.refreshIntervals.metrics).toBe(30000);
    expect(appConfig.ui.refreshIntervals.logs).toBe(5000);
  });

  it('should have valid pagination configuration', () => {
    expect(appConfig.ui.pagination).toBeDefined();
    expect(appConfig.ui.pagination.defaultPageSize).toBe(20);
    expect(appConfig.ui.pagination.maxPageSize).toBe(100);
  });

  it('should have valid chart configuration', () => {
    expect(appConfig.ui.charts).toBeDefined();
    expect(appConfig.ui.charts.maxDataPoints).toBe(100);
    expect(Array.isArray(appConfig.ui.charts.colors)).toBe(true);
    expect(appConfig.ui.charts.colors.length).toBe(4);
  });

  it('should have valid app metadata', () => {
    expect(appConfig.app).toBeDefined();
    expect(appConfig.app.name).toBe('IMF Dashboard');
    expect(appConfig.app.version).toBe('1.0.0');
    expect(appConfig.app.description).toBe('Intelligent Monitoring Framework');
  });
});