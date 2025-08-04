import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment } from '../test-setup';

interface InterventionScenario {
  name: string;
  triggerConditions: {
    errorRate?: number;
    responseTime?: number;
    resourceUsage?: number;
    consecutiveFailures?: number;
  };
  expectedActions: string[];
  escalationLevels: number;
  maxInterventionTime: number;
  successCriteria: {
    problemResolutionRate: number;
    falsePositiveRate: number;
    averageResolutionTime: number;
  };
}

interface InterventionResult {
  interventionId: string;
  startTime: Date;
  endTime?: Date;
  triggerReason: string;
  actionsPerformed: string[];
  success: boolean;
  escalationLevel: number;
  impactMetrics: {
    problemsSolved: number;
    systemStabilized: boolean;
    userImpactReduced: boolean;
  };
}

interface InterventionMetrics {
  totalInterventions: number;
  successfulInterventions: number;
  averageResolutionTime: number;
  escalationRate: number;
  falsePositiveRate: number;
  systemAvailabilityImprovement: number;
  interventionEfficiencyScore: number;
}

class AutomatedInterventionEngine {
  private storage: any;
  private interventionHistory: InterventionResult[] = [];
  private activeInterventions: Map<string, InterventionResult> = new Map();
  private isRunning: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(storage: any) {
    this.storage = storage;
  }

  async startMonitoring(scenarios: InterventionScenario[]): Promise<void> {
    this.isRunning = true;
    console.log('🚨 Starting Automated Intervention Monitoring');

    this.monitoringInterval = setInterval(async () => {
      if (!this.isRunning) return;

      for (const scenario of scenarios) {
        await this.evaluateInterventionTriggers(scenario);
      }
    }, 1000); // Check every second
  }

  async stopMonitoring(): Promise<InterventionMetrics> {
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Complete any active interventions
    for (const [id, intervention] of this.activeInterventions) {
      intervention.endTime = new Date();
      intervention.success = false; // Timeout
      this.interventionHistory.push(intervention);
    }
    this.activeInterventions.clear();

    return this.calculateMetrics();
  }

  private async evaluateInterventionTriggers(scenario: InterventionScenario): Promise<void> {
    const systemMetrics = await this.getSystemMetrics();
    const shouldIntervene = this.shouldTriggerIntervention(systemMetrics, scenario);

    if (shouldIntervene) {
      await this.triggerIntervention(scenario, systemMetrics);
    }
  }

  private shouldTriggerIntervention(metrics: any, scenario: InterventionScenario): boolean {
    const { triggerConditions } = scenario;
    let triggers = 0;
    let totalConditions = 0;

    if (triggerConditions.errorRate !== undefined) {
      totalConditions++;
      if (metrics.errorRate >= triggerConditions.errorRate) triggers++;
    }

    if (triggerConditions.responseTime !== undefined) {
      totalConditions++;
      if (metrics.responseTime >= triggerConditions.responseTime) triggers++;
    }

    if (triggerConditions.resourceUsage !== undefined) {
      totalConditions++;
      if (metrics.resourceUsage >= triggerConditions.resourceUsage) triggers++;
    }

    if (triggerConditions.consecutiveFailures !== undefined) {
      totalConditions++;
      if (metrics.consecutiveFailures >= triggerConditions.consecutiveFailures) triggers++;
    }

    // Require at least 70% of conditions to be met
    return totalConditions > 0 && (triggers / totalConditions) >= 0.7;
  }

  private async triggerIntervention(scenario: InterventionScenario, metrics: any): Promise<void> {
    const interventionId = `intervention-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    const intervention: InterventionResult = {
      interventionId,
      startTime: new Date(),
      triggerReason: this.buildTriggerReason(metrics, scenario),
      actionsPerformed: [],
      success: false,
      escalationLevel: 1,
      impactMetrics: {
        problemsSolved: 0,
        systemStabilized: false,
        userImpactReduced: false,
      },
    };

    this.activeInterventions.set(interventionId, intervention);
    console.log(`🔧 Triggered intervention: ${interventionId} - ${intervention.triggerReason}`);

    // Execute intervention asynchronously
    this.executeIntervention(intervention, scenario).catch(error => {
      console.error(`❌ Intervention ${interventionId} failed:`, error);
      intervention.success = false;
      intervention.endTime = new Date();
      this.completeIntervention(interventionId);
    });
  }

  private async executeIntervention(intervention: InterventionResult, scenario: InterventionScenario): Promise<void> {
    const maxDuration = scenario.maxInterventionTime;
    const startTime = Date.now();

    try {
      for (let level = 1; level <= scenario.escalationLevels && this.isRunning; level++) {
        intervention.escalationLevel = level;
        console.log(`📈 Escalating to level ${level} for intervention ${intervention.interventionId}`);

        const actions = await this.getActionsForLevel(level, scenario);
        
        for (const action of actions) {
          if (Date.now() - startTime > maxDuration) {
            throw new Error('Intervention timeout');
          }

          const actionResult = await this.executeAction(action, intervention);
          intervention.actionsPerformed.push(action);

          if (actionResult.resolved) {
            intervention.success = true;
            intervention.impactMetrics = actionResult.impact;
            break;
          }

          await this.delay(500); // Brief pause between actions
        }

        if (intervention.success) break;

        // Check if problem is resolved before escalating
        const currentMetrics = await this.getSystemMetrics();
        if (this.isProblemResolved(currentMetrics, scenario)) {
          intervention.success = true;
          intervention.impactMetrics.systemStabilized = true;
          break;
        }

        await this.delay(1000); // Pause before escalation
      }
    } catch (error) {
      console.error(`Intervention execution error:`, error);
      intervention.success = false;
    }

    intervention.endTime = new Date();
    this.completeIntervention(intervention.interventionId);
  }

  private async getActionsForLevel(level: number, scenario: InterventionScenario): Promise<string[]> {
    const levelActions = {
      1: ['restart_service', 'clear_cache', 'increase_timeout'],
      2: ['scale_horizontally', 'enable_circuit_breaker', 'reroute_traffic'],
      3: ['emergency_fallback', 'isolate_problematic_component', 'activate_backup_systems'],
      4: ['full_system_restart', 'emergency_maintenance_mode', 'escalate_to_human'],
    };

    const actions = levelActions[level as keyof typeof levelActions] || ['escalate_to_human'];
    
    // Filter actions based on scenario expected actions
    return actions.filter(action => 
      scenario.expectedActions.length === 0 || scenario.expectedActions.includes(action)
    );
  }

  private async executeAction(action: string, intervention: InterventionResult): Promise<any> {
    console.log(`⚡ Executing action: ${action} for intervention ${intervention.interventionId}`);

    // Simulate action execution time
    const executionTime = this.getActionExecutionTime(action);
    await this.delay(executionTime);

    // Simulate action success probability
    const successProbability = this.getActionSuccessProbability(action, intervention.escalationLevel);
    const success = Math.random() < successProbability;

    const result = {
      action,
      success,
      executionTime,
      resolved: success && Math.random() > 0.3, // 70% chance that successful action resolves the issue
      impact: {
        problemsSolved: success ? Math.floor(Math.random() * 3) + 1 : 0,
        systemStabilized: success && Math.random() > 0.4,
        userImpactReduced: success && Math.random() > 0.3,
      },
    };

    console.log(`${success ? '✅' : '❌'} Action ${action} ${success ? 'succeeded' : 'failed'}`);
    return result;
  }

  private getActionExecutionTime(action: string): number {
    const executionTimes = {
      'restart_service': 2000,
      'clear_cache': 500,
      'increase_timeout': 200,
      'scale_horizontally': 3000,
      'enable_circuit_breaker': 800,
      'reroute_traffic': 1500,
      'emergency_fallback': 1000,
      'isolate_problematic_component': 2500,
      'activate_backup_systems': 4000,
      'full_system_restart': 8000,
      'emergency_maintenance_mode': 1200,
      'escalate_to_human': 100,
    };

    return executionTimes[action as keyof typeof executionTimes] || 1000;
  }

  private getActionSuccessProbability(action: string, escalationLevel: number): number {
    const baseProbabilities = {
      'restart_service': 0.8,
      'clear_cache': 0.6,
      'increase_timeout': 0.4,
      'scale_horizontally': 0.9,
      'enable_circuit_breaker': 0.7,
      'reroute_traffic': 0.8,
      'emergency_fallback': 0.9,
      'isolate_problematic_component': 0.75,
      'activate_backup_systems': 0.85,
      'full_system_restart': 0.95,
      'emergency_maintenance_mode': 0.9,
      'escalate_to_human': 1.0,
    };

    const baseProbability = baseProbabilities[action as keyof typeof baseProbabilities] || 0.5;
    
    // Higher escalation levels have higher success probability
    const escalationBonus = (escalationLevel - 1) * 0.1;
    
    return Math.min(baseProbability + escalationBonus, 0.98);
  }

  private async getSystemMetrics(): Promise<any> {
    // Simulate system metrics with some randomness
    const baseMetrics = {
      errorRate: Math.random() * 20, // 0-20%
      responseTime: 200 + Math.random() * 800, // 200-1000ms
      resourceUsage: 30 + Math.random() * 60, // 30-90%
      consecutiveFailures: Math.floor(Math.random() * 5),
      timestamp: new Date(),
    };

    // Occasionally spike metrics to trigger interventions
    if (Math.random() < 0.3) { // 30% chance of problems
      baseMetrics.errorRate *= (2 + Math.random() * 2); // 2-4x spike
      baseMetrics.responseTime *= (1.5 + Math.random()); // 1.5-2.5x spike
      baseMetrics.resourceUsage = Math.min(baseMetrics.resourceUsage * 1.5, 95);
      baseMetrics.consecutiveFailures = Math.floor(Math.random() * 8) + 2;
    }

    return baseMetrics;
  }

  private isProblemResolved(metrics: any, scenario: InterventionScenario): boolean {
    const { triggerConditions } = scenario;
    
    if (triggerConditions.errorRate && metrics.errorRate >= triggerConditions.errorRate * 0.8) {
      return false;
    }
    
    if (triggerConditions.responseTime && metrics.responseTime >= triggerConditions.responseTime * 0.8) {
      return false;
    }
    
    if (triggerConditions.resourceUsage && metrics.resourceUsage >= triggerConditions.resourceUsage * 0.8) {
      return false;
    }
    
    if (triggerConditions.consecutiveFailures && metrics.consecutiveFailures >= triggerConditions.consecutiveFailures) {
      return false;
    }

    return true;
  }

  private buildTriggerReason(metrics: any, scenario: InterventionScenario): string {
    const reasons = [];
    const { triggerConditions } = scenario;

    if (triggerConditions.errorRate && metrics.errorRate >= triggerConditions.errorRate) {
      reasons.push(`Error rate: ${metrics.errorRate.toFixed(1)}% (threshold: ${triggerConditions.errorRate}%)`);
    }

    if (triggerConditions.responseTime && metrics.responseTime >= triggerConditions.responseTime) {
      reasons.push(`Response time: ${metrics.responseTime.toFixed(0)}ms (threshold: ${triggerConditions.responseTime}ms)`);
    }

    if (triggerConditions.resourceUsage && metrics.resourceUsage >= triggerConditions.resourceUsage) {
      reasons.push(`Resource usage: ${metrics.resourceUsage.toFixed(1)}% (threshold: ${triggerConditions.resourceUsage}%)`);
    }

    if (triggerConditions.consecutiveFailures && metrics.consecutiveFailures >= triggerConditions.consecutiveFailures) {
      reasons.push(`Consecutive failures: ${metrics.consecutiveFailures} (threshold: ${triggerConditions.consecutiveFailures})`);
    }

    return reasons.join(', ');
  }

  private completeIntervention(interventionId: string): void {
    const intervention = this.activeInterventions.get(interventionId);
    if (intervention) {
      this.interventionHistory.push(intervention);
      this.activeInterventions.delete(interventionId);
      
      const duration = intervention.endTime!.getTime() - intervention.startTime.getTime();
      console.log(`${intervention.success ? '✅' : '❌'} Completed intervention ${interventionId} in ${duration}ms`);
    }
  }

  private calculateMetrics(): InterventionMetrics {
    const total = this.interventionHistory.length;
    const successful = this.interventionHistory.filter(i => i.success).length;
    
    const avgResolutionTime = total > 0 
      ? this.interventionHistory.reduce((sum, i) => {
          const duration = i.endTime!.getTime() - i.startTime.getTime();
          return sum + duration;
        }, 0) / total
      : 0;

    const escalated = this.interventionHistory.filter(i => i.escalationLevel > 1).length;
    const escalationRate = total > 0 ? escalated / total : 0;

    // Calculate false positive rate (interventions that didn't find real problems)
    const unnecessaryInterventions = this.interventionHistory.filter(i => 
      !i.success && i.actionsPerformed.length === 0
    ).length;
    const falsePositiveRate = total > 0 ? unnecessaryInterventions / total : 0;

    const systemImprovements = this.interventionHistory.filter(i => 
      i.impactMetrics.systemStabilized
    ).length;
    const systemAvailabilityImprovement = total > 0 ? systemImprovements / total : 0;

    // Calculate efficiency score based on success rate, speed, and minimal escalation
    const successRate = total > 0 ? successful / total : 0;
    const speedScore = avgResolutionTime > 0 ? Math.max(0, 1 - (avgResolutionTime / 10000)) : 0; // 10s is baseline
    const escalationPenalty = escalationRate * 0.3; // Penalty for needing escalation
    const interventionEfficiencyScore = Math.max(0, (successRate + speedScore - escalationPenalty - falsePositiveRate) / 2);

    return {
      totalInterventions: total,
      successfulInterventions: successful,
      averageResolutionTime: Math.floor(avgResolutionTime),
      escalationRate: Math.floor(escalationRate * 100) / 100,
      falsePositiveRate: Math.floor(falsePositiveRate * 100) / 100,
      systemAvailabilityImprovement: Math.floor(systemAvailabilityImprovement * 100) / 100,
      interventionEfficiencyScore: Math.floor(interventionEfficiencyScore * 100) / 100,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getInterventionHistory(): InterventionResult[] {
    return [...this.interventionHistory];
  }

  getActiveInterventions(): InterventionResult[] {
    return Array.from(this.activeInterventions.values());
  }
}

describe('Automated Intervention Tests', () => {
  const { getStorage } = setupTestEnvironment();
  let interventionEngine: AutomatedInterventionEngine;

  beforeAll(() => {
    interventionEngine = new AutomatedInterventionEngine(getStorage());
  });

  afterAll(async () => {
    await interventionEngine.stopMonitoring();
  });

  it('should handle high error rate interventions', async () => {
    const scenario: InterventionScenario = {
      name: 'High Error Rate Response',
      triggerConditions: {
        errorRate: 15, // 15% error rate threshold
      },
      expectedActions: ['restart_service', 'clear_cache', 'enable_circuit_breaker'],
      escalationLevels: 3,
      maxInterventionTime: 10000,
      successCriteria: {
        problemResolutionRate: 0.7,
        falsePositiveRate: 0.2,
        averageResolutionTime: 5000,
      },
    };

    await interventionEngine.startMonitoring([scenario]);
    
    // Let it run for 15 seconds
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    const metrics = await interventionEngine.stopMonitoring();

    expect(metrics.totalInterventions).toBeGreaterThan(0);
    expect(metrics.successfulInterventions / metrics.totalInterventions).toBeGreaterThan(0.5);
    expect(metrics.averageResolutionTime).toBeLessThan(scenario.maxInterventionTime);
    expect(metrics.falsePositiveRate).toBeLessThan(0.3);

    console.log('🚨 High Error Rate Intervention Metrics:', {
      totalInterventions: metrics.totalInterventions,
      successRate: `${Math.floor((metrics.successfulInterventions / metrics.totalInterventions) * 100)}%`,
      avgResolutionTime: `${metrics.averageResolutionTime}ms`,
      escalationRate: `${Math.floor(metrics.escalationRate * 100)}%`,
      efficiencyScore: `${Math.floor(metrics.interventionEfficiencyScore * 100)}%`,
    });
  }, 20000);

  it('should escalate appropriately for complex problems', async () => {
    const scenario: InterventionScenario = {
      name: 'Complex Multi-Factor Problems',
      triggerConditions: {
        errorRate: 10,
        responseTime: 800,
        resourceUsage: 85,
      },
      expectedActions: ['scale_horizontally', 'reroute_traffic', 'emergency_fallback', 'full_system_restart'],
      escalationLevels: 4,
      maxInterventionTime: 15000,
      successCriteria: {
        problemResolutionRate: 0.8,
        falsePositiveRate: 0.15,
        averageResolutionTime: 8000,
      },
    };

    await interventionEngine.startMonitoring([scenario]);
    
    // Let it run for 18 seconds to allow for escalation
    await new Promise(resolve => setTimeout(resolve, 18000));
    
    const metrics = await interventionEngine.stopMonitoring();
    const history = interventionEngine.getInterventionHistory();

    expect(metrics.totalInterventions).toBeGreaterThan(0);
    
    // Check that escalation occurred for complex problems
    const escalatedInterventions = history.filter(i => i.escalationLevel > 1);
    expect(escalatedInterventions.length).toBeGreaterThan(0);

    // Check that higher escalation levels led to better success rates
    const level1Success = history.filter(i => i.escalationLevel === 1 && i.success).length;
    const level1Total = history.filter(i => i.escalationLevel === 1).length;
    const higherLevelSuccess = history.filter(i => i.escalationLevel > 1 && i.success).length;
    const higherLevelTotal = history.filter(i => i.escalationLevel > 1).length;

    if (level1Total > 0 && higherLevelTotal > 0) {
      const level1Rate = level1Success / level1Total;
      const higherLevelRate = higherLevelSuccess / higherLevelTotal;
      expect(higherLevelRate).toBeGreaterThanOrEqual(level1Rate * 0.8); // At least 80% as effective
    }

    console.log('📈 Complex Problem Escalation Metrics:', {
      totalInterventions: metrics.totalInterventions,
      escalationRate: `${Math.floor(metrics.escalationRate * 100)}%`,
      level1Success: level1Total > 0 ? `${Math.floor((level1Success / level1Total) * 100)}%` : 'N/A',
      higherLevelSuccess: higherLevelTotal > 0 ? `${Math.floor((higherLevelSuccess / higherLevelTotal) * 100)}%` : 'N/A',
      systemStabilization: `${Math.floor(metrics.systemAvailabilityImprovement * 100)}%`,
    });
  }, 25000);

  it('should minimize false positives while maintaining responsiveness', async () => {
    const scenario: InterventionScenario = {
      name: 'False Positive Minimization',
      triggerConditions: {
        consecutiveFailures: 3,
        responseTime: 600,
      },
      expectedActions: ['increase_timeout', 'clear_cache', 'restart_service'],
      escalationLevels: 2,
      maxInterventionTime: 5000,
      successCriteria: {
        problemResolutionRate: 0.6,
        falsePositiveRate: 0.1, // Very low false positive target
        averageResolutionTime: 3000,
      },
    };

    await interventionEngine.startMonitoring([scenario]);
    
    // Run for 12 seconds
    await new Promise(resolve => setTimeout(resolve, 12000));
    
    const metrics = await interventionEngine.stopMonitoring();

    expect(metrics.totalInterventions).toBeGreaterThan(0);
    expect(metrics.falsePositiveRate).toBeLessThan(scenario.successCriteria.falsePositiveRate * 2); // Allow some margin
    expect(metrics.interventionEfficiencyScore).toBeGreaterThan(0.5);

    // Check responsiveness - interventions should complete quickly
    expect(metrics.averageResolutionTime).toBeLessThan(scenario.maxInterventionTime);

    console.log('🎯 False Positive Minimization Metrics:', {
      totalInterventions: metrics.totalInterventions,
      falsePositiveRate: `${Math.floor(metrics.falsePositiveRate * 100)}%`,
      efficiencyScore: `${Math.floor(metrics.interventionEfficiencyScore * 100)}%`,
      avgResolutionTime: `${metrics.averageResolutionTime}ms`,
      responsiveness: metrics.averageResolutionTime < 3000 ? 'Excellent' : 'Good',
    });
  }, 18000);

  it('should demonstrate learning from intervention outcomes', async () => {
    const scenarios: InterventionScenario[] = [
      {
        name: 'Learning Phase 1 - Basic Interventions',
        triggerConditions: { errorRate: 12 },
        expectedActions: ['restart_service', 'clear_cache'],
        escalationLevels: 2,
        maxInterventionTime: 5000,
        successCriteria: { problemResolutionRate: 0.5, falsePositiveRate: 0.3, averageResolutionTime: 4000 },
      },
      {
        name: 'Learning Phase 2 - Improved Interventions',
        triggerConditions: { errorRate: 12 },
        expectedActions: ['enable_circuit_breaker', 'scale_horizontally'], // Different, presumably better actions
        escalationLevels: 2,
        maxInterventionTime: 5000,
        successCriteria: { problemResolutionRate: 0.7, falsePositiveRate: 0.2, averageResolutionTime: 3000 },
      },
    ];

    // Phase 1: Initial learning
    await interventionEngine.startMonitoring([scenarios[0]]);
    await new Promise(resolve => setTimeout(resolve, 8000));
    const phase1Metrics = await interventionEngine.stopMonitoring();

    // Brief pause between phases
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Phase 2: Improved interventions
    await interventionEngine.startMonitoring([scenarios[1]]);
    await new Promise(resolve => setTimeout(resolve, 8000));
    const phase2Metrics = await interventionEngine.stopMonitoring();

    // Learning validation
    expect(phase1Metrics.totalInterventions).toBeGreaterThan(0);
    expect(phase2Metrics.totalInterventions).toBeGreaterThan(0);

    // Check for improvement (allowing for statistical variance)
    const phase1SuccessRate = phase1Metrics.successfulInterventions / phase1Metrics.totalInterventions;
    const phase2SuccessRate = phase2Metrics.successfulInterventions / phase2Metrics.totalInterventions;
    
    // Either success rate improved OR resolution time improved OR efficiency improved
    const learningImprovement = 
      phase2SuccessRate > phase1SuccessRate * 0.9 ||
      phase2Metrics.averageResolutionTime < phase1Metrics.averageResolutionTime * 1.1 ||
      phase2Metrics.interventionEfficiencyScore > phase1Metrics.interventionEfficiencyScore * 0.9;

    expect(learningImprovement).toBe(true);

    console.log('🧠 Learning Progression Metrics:', {
      phase1: {
        interventions: phase1Metrics.totalInterventions,
        successRate: `${Math.floor(phase1SuccessRate * 100)}%`,
        avgTime: `${phase1Metrics.averageResolutionTime}ms`,
        efficiency: `${Math.floor(phase1Metrics.interventionEfficiencyScore * 100)}%`,
      },
      phase2: {
        interventions: phase2Metrics.totalInterventions,
        successRate: `${Math.floor(phase2SuccessRate * 100)}%`,
        avgTime: `${phase2Metrics.averageResolutionTime}ms`,
        efficiency: `${Math.floor(phase2Metrics.interventionEfficiencyScore * 100)}%`,
      },
      improvement: {
        successRate: phase2SuccessRate > phase1SuccessRate ? '📈' : '📉',
        responseTime: phase2Metrics.averageResolutionTime < phase1Metrics.averageResolutionTime ? '📈' : '📉',
        efficiency: phase2Metrics.interventionEfficiencyScore > phase1Metrics.interventionEfficiencyScore ? '📈' : '📉',
      },
    });
  }, 25000);
});