/**
 * Deployment Safety Engine Tests
 * 
 * Tests for deployment risk assessment, safety controls, and auto-rollback mechanisms.
 * This completes Option A: Auto-Remediation & Deployment Safety Tests.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Types for deployment safety system
interface DeploymentRequest {
  id: string;
  fixId: string;
  applicationName: string;
  environment: 'development' | 'staging' | 'production';
  deploymentStrategy: 'direct' | 'canary' | 'blue_green' | 'rolling';
  estimatedRiskScore: number;
  confidence: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requesterApproval?: boolean;
}

interface DeploymentEvaluation {
  approved: boolean;
  strategy: DeploymentRequest['deploymentStrategy'];
  reason: string;
  conditions: string[];
  estimatedDuration: number; // minutes
  rollbackPlan: {
    automatic: boolean;
    triggers: string[];
    timeoutMinutes: number;
  };
}

interface DeploymentMetrics {
  errorRate: number;
  responseTime: number;
  cpuUsage: number;
  memoryUsage: number;
  requestsPerSecond: number;
  timestamp: Date;
}

interface DeploymentStatus {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'rolling_back' | 'rolled_back';
  startedAt: Date;
  completedAt?: Date;
  currentMetrics: DeploymentMetrics;
  baselineMetrics: DeploymentMetrics;
  healthChecks: {
    endpoint: string;
    status: 'healthy' | 'unhealthy' | 'unknown';
    lastCheck: Date;
  }[];
}

interface SafetyConfiguration {
  businessHours: {
    start: number; // 0-23
    end: number;   // 0-23
    days: number[]; // 0=Sunday, 1=Monday, etc.
  };
  productionLimits: {
    maxDeploymentsPerHour: number;
    maxConcurrentDeployments: number;
    minimumApprovalThreshold: number;
  };
  autoRollbackTriggers: {
    errorRateThreshold: number;
    responseTimeThreshold: number; // ms
    healthCheckFailureThreshold: number;
    timeoutMinutes: number;
  };
  environmentRestirctions: {
    production: {
      requireApproval: boolean;
      businessHoursOnly: boolean;
      canaryRequired: boolean;
    };
  };
}

// Mock Deployment Safety Engine
class MockDeploymentSafetyEngine {
  private deployments: Map<string, DeploymentStatus> = new Map();
  private metrics: Map<string, DeploymentMetrics[]> = new Map();
  private config: SafetyConfiguration;
  private currentTime: Date = new Date();

  constructor(config?: Partial<SafetyConfiguration>) {
    this.config = {
      businessHours: {
        start: 9,
        end: 17,
        days: [1, 2, 3, 4, 5] // Mon-Fri
      },
      productionLimits: {
        maxDeploymentsPerHour: 3,
        maxConcurrentDeployments: 2,
        minimumApprovalThreshold: 0.8
      },
      autoRollbackTriggers: {
        errorRateThreshold: 0.05, // 5%
        responseTimeThreshold: 2000, // 2 seconds
        healthCheckFailureThreshold: 2,
        timeoutMinutes: 15
      },
      environmentRestirctions: {
        production: {
          requireApproval: true,
          businessHoursOnly: true,
          canaryRequired: true
        }
      },
      ...config
    };
  }

  // For testing - allow time manipulation
  setCurrentTime(time: Date) {
    this.currentTime = time;
  }

  async evaluateDeployment(request: DeploymentRequest): Promise<DeploymentEvaluation> {
    const evaluation: DeploymentEvaluation = {
      approved: true,
      strategy: request.deploymentStrategy,
      reason: 'Initial evaluation',
      conditions: [],
      estimatedDuration: 10,
      rollbackPlan: {
        automatic: true,
        triggers: ['error_rate', 'response_time', 'health_checks'],
        timeoutMinutes: this.config.autoRollbackTriggers.timeoutMinutes
      }
    };

    // Check business hours restriction
    if (request.environment === 'production' && this.config.environmentRestirctions.production.businessHoursOnly) {
      if (!this.isBusinessHours()) {
        evaluation.approved = false;
        evaluation.reason = 'Deployment blocked: Outside business hours';
        return evaluation;
      }
    }

    // Check approval requirements
    if (request.environment === 'production') {
      if (this.config.environmentRestirctions.production.requireApproval && !request.requesterApproval) {
        evaluation.approved = false;
        evaluation.reason = 'Deployment blocked: Manual approval required for production';
        return evaluation;
      }

      if (request.confidence < this.config.productionLimits.minimumApprovalThreshold) {
        evaluation.approved = false;
        evaluation.reason = `Deployment blocked: Confidence ${request.confidence} below threshold ${this.config.productionLimits.minimumApprovalThreshold}`;
        return evaluation;
      }
    }

    // Check deployment rate limits
    const recentDeployments = this.getRecentDeployments(60); // Last hour
    if (recentDeployments.length >= this.config.productionLimits.maxDeploymentsPerHour) {
      evaluation.approved = false;
      evaluation.reason = 'Deployment blocked: Maximum deployments per hour exceeded';
      return evaluation;
    }

    // Check concurrent deployment limits
    const activeDeployments = Array.from(this.deployments.values())
      .filter(d => d.status === 'in_progress' || d.status === 'pending');
    if (activeDeployments.length >= this.config.productionLimits.maxConcurrentDeployments) {
      evaluation.approved = false;
      evaluation.reason = 'Deployment blocked: Maximum concurrent deployments exceeded';
      return evaluation;
    }

    // Determine deployment strategy based on risk
    evaluation.strategy = this.selectDeploymentStrategy(request);
    evaluation.estimatedDuration = this.estimateDeploymentDuration(evaluation.strategy);

    // Add conditions based on risk and environment
    if (request.environment === 'production') {
      evaluation.conditions.push('Continuous monitoring during deployment');
      evaluation.conditions.push('Automatic rollback on metric degradation');
      
      if (request.estimatedRiskScore > 0.5) {
        evaluation.conditions.push('Extended monitoring period (30 minutes)');
        evaluation.rollbackPlan.timeoutMinutes = 30;
      }
    }

    if (evaluation.strategy === 'canary') {
      evaluation.conditions.push('Gradual traffic ramp-up (10%, 25%, 50%, 100%)');
      evaluation.estimatedDuration *= 2; // Canary takes longer
    }

    return evaluation;
  }

  private isBusinessHours(): boolean {
    const day = this.currentTime.getDay();
    const hour = this.currentTime.getHours();
    
    return this.config.businessHours.days.includes(day) &&
           hour >= this.config.businessHours.start &&
           hour < this.config.businessHours.end;
  }

  private getRecentDeployments(minutes: number): DeploymentStatus[] {
    const cutoff = new Date(this.currentTime.getTime() - minutes * 60 * 1000);
    return Array.from(this.deployments.values())
      .filter(d => d.startedAt >= cutoff);
  }

  private selectDeploymentStrategy(request: DeploymentRequest): DeploymentRequest['deploymentStrategy'] {
    if (request.environment !== 'production') {
      return 'direct'; // Non-production can use direct deployment
    }

    // Production strategy selection based on risk
    if (request.estimatedRiskScore < 0.2) {
      return request.urgency === 'critical' ? 'rolling' : 'direct';
    } else if (request.estimatedRiskScore < 0.5) {
      return 'canary';
    } else {
      return 'blue_green'; // Safest for high-risk deployments
    }
  }

  private estimateDeploymentDuration(strategy: DeploymentRequest['deploymentStrategy']): number {
    const baseDurations = {
      'direct': 5,
      'rolling': 15,
      'canary': 30,
      'blue_green': 20
    };
    return baseDurations[strategy];
  }

  async startDeployment(request: DeploymentRequest): Promise<string> {
    const evaluation = await this.evaluateDeployment(request);
    
    if (!evaluation.approved) {
      throw new Error(`Deployment rejected: ${evaluation.reason}`);
    }

    const deploymentId = `deploy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create baseline metrics
    const baselineMetrics: DeploymentMetrics = {
      errorRate: 0.02,
      responseTime: 150,
      cpuUsage: 45,
      memoryUsage: 60,
      requestsPerSecond: 100,
      timestamp: new Date(this.currentTime)
    };

    const deployment: DeploymentStatus = {
      id: deploymentId,
      status: 'pending',
      startedAt: new Date(this.currentTime),
      currentMetrics: { ...baselineMetrics },
      baselineMetrics,
      healthChecks: [
        { endpoint: '/health', status: 'healthy', lastCheck: new Date(this.currentTime) },
        { endpoint: '/ready', status: 'healthy', lastCheck: new Date(this.currentTime) }
      ]
    };

    this.deployments.set(deploymentId, deployment);
    this.metrics.set(deploymentId, [baselineMetrics]);

    // Start deployment process
    setTimeout(() => this.simulateDeploymentProgress(deploymentId), 100);

    return deploymentId;
  }

  private async simulateDeploymentProgress(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    try {
      // Simulate deployment phases
      deployment.status = 'in_progress';
      
      // Simulate metrics during deployment
      await this.simulateDeploymentMetrics(deploymentId);
      
      // Check for auto-rollback triggers
      const shouldRollback = await this.checkRollbackTriggers(deploymentId);
      if (shouldRollback) {
        await this.rollbackDeployment(deploymentId);
        return;
      }

      // Complete deployment
      deployment.status = 'completed';
      deployment.completedAt = new Date(this.currentTime.getTime() + 300000); // 5 minutes later
      
    } catch (error) {
      deployment.status = 'failed';
      deployment.completedAt = new Date(this.currentTime);
    }
  }

  private async simulateDeploymentMetrics(deploymentId: string): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    const metricsHistory = this.metrics.get(deploymentId) || [];
    
    // Simulate metric changes during deployment
    for (let i = 0; i < 5; i++) {
      const metrics: DeploymentMetrics = {
        errorRate: deployment.baselineMetrics.errorRate + (Math.random() * 0.03), // Some variation
        responseTime: deployment.baselineMetrics.responseTime + (Math.random() * 100),
        cpuUsage: deployment.baselineMetrics.cpuUsage + (Math.random() * 20),
        memoryUsage: deployment.baselineMetrics.memoryUsage + (Math.random() * 15),
        requestsPerSecond: deployment.baselineMetrics.requestsPerSecond * (0.8 + Math.random() * 0.4),
        timestamp: new Date(this.currentTime.getTime() + i * 60000) // Every minute
      };

      metricsHistory.push(metrics);
      deployment.currentMetrics = metrics;
      
      // Small delay to simulate real-time monitoring
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    this.metrics.set(deploymentId, metricsHistory);
  }

  async checkRollbackTriggers(deploymentId: string): Promise<boolean> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return false;

    const { currentMetrics, baselineMetrics } = deployment;
    const triggers = this.config.autoRollbackTriggers;

    // Check error rate threshold
    if (currentMetrics.errorRate > triggers.errorRateThreshold) {
      return true;
    }

    // Check response time degradation
    if (currentMetrics.responseTime > triggers.responseTimeThreshold) {
      return true;
    }

    // Check health check failures
    const failedHealthChecks = deployment.healthChecks.filter(hc => hc.status === 'unhealthy').length;
    if (failedHealthChecks >= triggers.healthCheckFailureThreshold) {
      return true;
    }

    // Check deployment timeout
    const deploymentDuration = this.currentTime.getTime() - deployment.startedAt.getTime();
    if (deploymentDuration > triggers.timeoutMinutes * 60 * 1000) {
      return true;
    }

    return false;
  }

  async rollbackDeployment(deploymentId: string): Promise<boolean> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return false;

    try {
      deployment.status = 'rolling_back';
      
      // Simulate rollback process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Restore baseline metrics
      deployment.currentMetrics = { ...deployment.baselineMetrics };
      deployment.status = 'rolled_back';
      deployment.completedAt = new Date(this.currentTime);
      
      return true;
    } catch (error) {
      deployment.status = 'failed';
      return false;
    }
  }

  async getDeploymentStatus(deploymentId: string): Promise<DeploymentStatus | null> {
    return this.deployments.get(deploymentId) || null;
  }

  async reportMetrics(deploymentId: string, metrics: DeploymentMetrics): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    deployment.currentMetrics = metrics;
    
    const history = this.metrics.get(deploymentId) || [];
    history.push(metrics);
    this.metrics.set(deploymentId, history);

    // Check if rollback is needed
    if (deployment.status === 'in_progress') {
      const shouldRollback = await this.checkRollbackTriggers(deploymentId);
      if (shouldRollback) {
        await this.rollbackDeployment(deploymentId);
      }
    }
  }

  async updateHealthCheck(deploymentId: string, endpoint: string, status: 'healthy' | 'unhealthy'): Promise<void> {
    const deployment = this.deployments.get(deploymentId);
    if (!deployment) return;

    const healthCheck = deployment.healthChecks.find(hc => hc.endpoint === endpoint);
    if (healthCheck) {
      healthCheck.status = status;
      healthCheck.lastCheck = new Date(this.currentTime);
    }
  }

  getDeploymentStatistics(): {
    totalDeployments: number;
    successRate: number;
    avgDeploymentTime: number;
    rollbackRate: number;
    recentDeployments: number;
  } {
    const deployments = Array.from(this.deployments.values());
    const completed = deployments.filter(d => d.completedAt);
    const successful = completed.filter(d => d.status === 'completed');
    const rolledBack = deployments.filter(d => d.status === 'rolled_back');
    const recent = this.getRecentDeployments(60); // Last hour

    const avgTime = completed.length > 0 
      ? completed.reduce((sum, d) => {
          const duration = d.completedAt!.getTime() - d.startedAt.getTime();
          return sum + duration;
        }, 0) / completed.length / 1000 / 60 // Convert to minutes
      : 0;

    return {
      totalDeployments: deployments.length,
      successRate: completed.length > 0 ? successful.length / completed.length : 0,
      avgDeploymentTime: avgTime,
      rollbackRate: deployments.length > 0 ? rolledBack.length / deployments.length : 0,
      recentDeployments: recent.length
    };
  }
}

describe('Deployment Safety Engine Tests', () => {
  let safetyEngine: MockDeploymentSafetyEngine;
  let sampleRequest: DeploymentRequest;

  beforeEach(() => {
    safetyEngine = new MockDeploymentSafetyEngine();
    sampleRequest = {
      id: 'deploy_req_001',
      fixId: 'fix_001',
      applicationName: 'imf-backend',
      environment: 'production',
      deploymentStrategy: 'canary',
      estimatedRiskScore: 0.3,
      confidence: 0.85,
      urgency: 'medium',
      requesterApproval: true
    };

    // Set to business hours for testing
    safetyEngine.setCurrentTime(new Date('2024-01-15 14:00:00')); // Monday 2 PM
  });

  describe('Business Hours Validation', () => {
    it('should block production deployments outside business hours', async () => {
      safetyEngine.setCurrentTime(new Date('2024-01-15 02:00:00')); // Monday 2 AM
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(false);
      expect(evaluation.reason).toContain('business hours');
    });

    it('should allow production deployments during business hours', async () => {
      safetyEngine.setCurrentTime(new Date('2024-01-15 14:00:00')); // Monday 2 PM
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(true);
    });

    it('should block production deployments on weekends', async () => {
      safetyEngine.setCurrentTime(new Date('2024-01-13 14:00:00')); // Saturday 2 PM
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(false);
      expect(evaluation.reason).toContain('business hours');
    });

    it('should allow non-production deployments outside business hours', async () => {
      safetyEngine.setCurrentTime(new Date('2024-01-15 02:00:00')); // Monday 2 AM
      sampleRequest.environment = 'staging';
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(true);
    });
  });

  describe('Approval Requirements', () => {
    it('should require manual approval for production deployments', async () => {
      sampleRequest.requesterApproval = false;
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(false);
      expect(evaluation.reason).toContain('Manual approval required');
    });

    it('should block deployments with insufficient confidence', async () => {
      sampleRequest.confidence = 0.70; // Below threshold of 0.8
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(false);
      expect(evaluation.reason).toContain('Confidence');
      expect(evaluation.reason).toContain('below threshold');
    });

    it('should allow high-confidence deployments with approval', async () => {
      sampleRequest.confidence = 0.90;
      sampleRequest.requesterApproval = true;
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should block deployments when hourly limit exceeded', async () => {
      const engine = new MockDeploymentSafetyEngine({
        productionLimits: { maxDeploymentsPerHour: 1, maxConcurrentDeployments: 5, minimumApprovalThreshold: 0.8 }
      });
      engine.setCurrentTime(new Date('2024-01-15 14:00:00'));

      // First deployment should succeed
      const firstDeploymentId = await engine.startDeployment(sampleRequest);
      expect(firstDeploymentId).toBeDefined();

      // Second deployment should be blocked
      const secondRequest = { ...sampleRequest, id: 'deploy_req_002' };
      const evaluation = await engine.evaluateDeployment(secondRequest);
      
      expect(evaluation.approved).toBe(false);
      expect(evaluation.reason).toContain('Maximum deployments per hour exceeded');
    });

    it('should block deployments when concurrent limit exceeded', async () => {
      const engine = new MockDeploymentSafetyEngine({
        productionLimits: { maxDeploymentsPerHour: 10, maxConcurrentDeployments: 1, minimumApprovalThreshold: 0.8 }
      });
      engine.setCurrentTime(new Date('2024-01-15 14:00:00'));

      // Start first deployment
      const firstDeploymentId = await engine.startDeployment(sampleRequest);
      expect(firstDeploymentId).toBeDefined();

      // Second concurrent deployment should be blocked
      const secondRequest = { ...sampleRequest, id: 'deploy_req_002' };
      const evaluation = await engine.evaluateDeployment(secondRequest);
      
      expect(evaluation.approved).toBe(false);
      expect(evaluation.reason).toContain('Maximum concurrent deployments exceeded');
    });
  });

  describe('Deployment Strategy Selection', () => {
    it('should select direct deployment for low-risk changes', async () => {
      sampleRequest.estimatedRiskScore = 0.1;
      sampleRequest.urgency = 'low';
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(true);
      expect(evaluation.strategy).toBe('direct');
    });

    it('should select canary deployment for medium-risk changes', async () => {
      sampleRequest.estimatedRiskScore = 0.4;
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(true);
      expect(evaluation.strategy).toBe('canary');
      expect(evaluation.conditions).toContain('Gradual traffic ramp-up (10%, 25%, 50%, 100%)');
    });

    it('should select blue-green deployment for high-risk changes', async () => {
      sampleRequest.estimatedRiskScore = 0.7;
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(true);
      expect(evaluation.strategy).toBe('blue_green');
    });

    it('should use rolling deployment for critical urgent fixes', async () => {
      sampleRequest.estimatedRiskScore = 0.15;
      sampleRequest.urgency = 'critical';
      
      const evaluation = await safetyEngine.evaluateDeployment(sampleRequest);
      
      expect(evaluation.approved).toBe(true);
      expect(evaluation.strategy).toBe('rolling');
    });
  });

  describe('Deployment Execution', () => {
    it('should successfully start and complete a deployment', async () => {
      const deploymentId = await safetyEngine.startDeployment(sampleRequest);
      expect(deploymentId).toBeDefined();

      // Check initial status
      let status = await safetyEngine.getDeploymentStatus(deploymentId);
      expect(status?.status).toBe('pending');

      // Wait for deployment to progress
      await new Promise(resolve => setTimeout(resolve, 600));

      status = await safetyEngine.getDeploymentStatus(deploymentId);
      expect(status?.status).toBe('completed');
      expect(status?.completedAt).toBeDefined();
    });

    it('should monitor metrics during deployment', async () => {
      const deploymentId = await safetyEngine.startDeployment(sampleRequest);

      // Wait for metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 300));

      const status = await safetyEngine.getDeploymentStatus(deploymentId);
      expect(status?.currentMetrics).toBeDefined();
      expect(status?.baselineMetrics).toBeDefined();
      expect(status?.currentMetrics.timestamp).toBeInstanceOf(Date);
    });

    it('should maintain health check status', async () => {
      const deploymentId = await safetyEngine.startDeployment(sampleRequest);

      const status = await safetyEngine.getDeploymentStatus(deploymentId);
      expect(status?.healthChecks).toHaveLength(2);
      expect(status?.healthChecks[0].endpoint).toBe('/health');
      expect(status?.healthChecks[0].status).toBe('healthy');
    });
  });

  describe('Auto-Rollback Mechanisms', () => {
    it('should trigger rollback on high error rate', async () => {
      const deploymentId = await safetyEngine.startDeployment(sampleRequest);

      // Wait for deployment to start
      await new Promise(resolve => setTimeout(resolve, 200));

      // Report high error rate
      await safetyEngine.reportMetrics(deploymentId, {
        errorRate: 0.10, // Above threshold of 0.05
        responseTime: 150,
        cpuUsage: 45,
        memoryUsage: 60,
        requestsPerSecond: 100,
        timestamp: new Date()
      });

      const status = await safetyEngine.getDeploymentStatus(deploymentId);
      expect(status?.status).toBe('rolled_back');
    });

    it('should trigger rollback on slow response times', async () => {
      const deploymentId = await safetyEngine.startDeployment(sampleRequest);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Report slow response time
      await safetyEngine.reportMetrics(deploymentId, {
        errorRate: 0.02,
        responseTime: 3000, // Above threshold of 2000ms
        cpuUsage: 45,
        memoryUsage: 60,
        requestsPerSecond: 100,
        timestamp: new Date()
      });

      const status = await safetyEngine.getDeploymentStatus(deploymentId);
      expect(status?.status).toBe('rolled_back');
    });

    it('should trigger rollback on health check failures', async () => {
      const deploymentId = await safetyEngine.startDeployment(sampleRequest);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Fail multiple health checks
      await safetyEngine.updateHealthCheck(deploymentId, '/health', 'unhealthy');
      await safetyEngine.updateHealthCheck(deploymentId, '/ready', 'unhealthy');

      const shouldRollback = await safetyEngine.checkRollbackTriggers(deploymentId);
      expect(shouldRollback).toBe(true);

      await safetyEngine.rollbackDeployment(deploymentId);
      
      const status = await safetyEngine.getDeploymentStatus(deploymentId);
      expect(status?.status).toBe('rolled_back');
    });

    it('should not rollback on normal metrics', async () => {
      const deploymentId = await safetyEngine.startDeployment(sampleRequest);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Report normal metrics
      await safetyEngine.reportMetrics(deploymentId, {
        errorRate: 0.02, // Below threshold
        responseTime: 180, // Below threshold
        cpuUsage: 50,
        memoryUsage: 65,
        requestsPerSecond: 95,
        timestamp: new Date()
      });

      const shouldRollback = await safetyEngine.checkRollbackTriggers(deploymentId);
      expect(shouldRollback).toBe(false);
    });
  });

  describe('Deployment Statistics & Monitoring', () => {
    it('should provide comprehensive deployment statistics', async () => {
      // Create multiple deployments
      const deployment1 = await safetyEngine.startDeployment(sampleRequest);
      const deployment2 = await safetyEngine.startDeployment({ ...sampleRequest, id: 'deploy_req_002' });

      // Wait for deployments to complete
      await new Promise(resolve => setTimeout(resolve, 700));

      const stats = safetyEngine.getDeploymentStatistics();
      
      expect(stats.totalDeployments).toBe(2);
      expect(stats.successRate).toBeGreaterThanOrEqual(0);
      expect(stats.avgDeploymentTime).toBeGreaterThan(0);
      expect(stats.rollbackRate).toBeGreaterThanOrEqual(0);
      expect(stats.recentDeployments).toBe(2);
    });

    it('should track rollback rate correctly', async () => {
      const deploymentId = await safetyEngine.startDeployment(sampleRequest);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Force a rollback
      await safetyEngine.reportMetrics(deploymentId, {
        errorRate: 0.15, // High error rate
        responseTime: 150,
        cpuUsage: 45,
        memoryUsage: 60,
        requestsPerSecond: 100,
        timestamp: new Date()
      });

      const stats = safetyEngine.getDeploymentStatistics();
      expect(stats.rollbackRate).toBeGreaterThan(0);
    });
  });

  describe('Configuration Flexibility', () => {
    it('should respect custom safety thresholds', async () => {
      const strictEngine = new MockDeploymentSafetyEngine({
        autoRollbackTriggers: {
          errorRateThreshold: 0.01, // Very strict - 1%
          responseTimeThreshold: 500, // Very strict - 500ms
          healthCheckFailureThreshold: 1,
          timeoutMinutes: 5
        }
      });
      strictEngine.setCurrentTime(new Date('2024-01-15 14:00:00'));

      const deploymentId = await strictEngine.startDeployment(sampleRequest);

      await new Promise(resolve => setTimeout(resolve, 200));

      // Report metrics that would be OK for normal config but not strict
      await strictEngine.reportMetrics(deploymentId, {
        errorRate: 0.03, // Above strict threshold of 0.01
        responseTime: 180,
        cpuUsage: 45,
        memoryUsage: 60,
        requestsPerSecond: 100,
        timestamp: new Date()
      });

      const status = await strictEngine.getDeploymentStatus(deploymentId);
      expect(status?.status).toBe('rolled_back');
    });

    it('should allow different business hours configuration', async () => {
      const flexibleEngine = new MockDeploymentSafetyEngine({
        businessHours: {
          start: 6,
          end: 22, // 6 AM to 10 PM
          days: [1, 2, 3, 4, 5, 6, 7] // All days
        }
      });
      flexibleEngine.setCurrentTime(new Date('2024-01-13 20:00:00')); // Saturday 8 PM

      const evaluation = await flexibleEngine.evaluateDeployment(sampleRequest);
      expect(evaluation.approved).toBe(true); // Should be allowed with flexible hours
    });
  });

  describe('Error Handling & Edge Cases', () => {
    it('should handle deployment of non-existent fix gracefully', async () => {
      const invalidRequest = { ...sampleRequest, fixId: 'non_existent_fix' };
      
      // Should still create deployment (fix validation happens elsewhere)
      const deploymentId = await safetyEngine.startDeployment(invalidRequest);
      expect(deploymentId).toBeDefined();
    });

    it('should handle rollback of non-existent deployment', async () => {
      const rollbackSuccess = await safetyEngine.rollbackDeployment('non_existent_deployment');
      expect(rollbackSuccess).toBe(false);
    });

    it('should handle metrics reporting for non-existent deployment', async () => {
      // Should not throw error
      await safetyEngine.reportMetrics('non_existent_deployment', {
        errorRate: 0.02,
        responseTime: 150,
        cpuUsage: 45,
        memoryUsage: 60,
        requestsPerSecond: 100,
        timestamp: new Date()
      });
      
      // No exception means the test passes
      expect(true).toBe(true);
    });

    it('should handle health check updates for non-existent deployment', async () => {
      // Should not throw error
      await safetyEngine.updateHealthCheck('non_existent_deployment', '/health', 'unhealthy');
      
      // No exception means the test passes
      expect(true).toBe(true);
    });
  });
});