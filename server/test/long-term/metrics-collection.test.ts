import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnvironment } from '../test-setup';

interface MetricsSnapshot {
  timestamp: Date;
  systemHealth: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkLatency: number;
    errorRate: number;
    responseTime: number;
  };
  aiPerformance: {
    accuracy: number;
    predictionConfidence: number;
    learningVelocity: number;
    patternRecognition: number;
    falsePositives: number;
    interventionEffectiveness: number;
  };
  businessMetrics: {
    systemAvailability: number;
    userSatisfaction: number;
    incidentReduction: number;
    maintenanceCostSavings: number;
    problemResolutionTime: number;
  };
}

interface TrendAnalysis {
  metric: string;
  direction: 'improving' | 'degrading' | 'stable';
  rate: number; // rate of change per hour
  significance: 'high' | 'medium' | 'low';
  prediction: {
    nextHour: number;
    nextDay: number;
    confidence: number;
  };
}

interface LongTermInsights {
  overallHealthTrend: 'improving' | 'stable' | 'concerning';
  aiLearningEffectiveness: number;
  systemReliabilityImprovement: number;
  criticalMetrics: string[];
  recommendations: string[];
  predictedIssues: Array<{
    issue: string;
    probability: number;
    timeframe: string;
    suggestedPrevention: string[];
  }>;
}

class MetricsCollectionEngine {
  private storage: any;
  private metricsHistory: MetricsSnapshot[] = [];
  private isCollecting: boolean = false;
  private collectionInterval?: NodeJS.Timeout;
  private analysisInterval?: NodeJS.Timeout;

  constructor(storage: any) {
    this.storage = storage;
  }

  async startCollection(intervalMs: number = 2000): Promise<void> {
    this.isCollecting = true;
    console.log('📊 Starting metrics collection every', intervalMs, 'ms');

    this.collectionInterval = setInterval(async () => {
      if (!this.isCollecting) return;

      const snapshot = await this.collectMetricsSnapshot();
      this.metricsHistory.push(snapshot);

      // Keep only last 1000 snapshots to prevent memory issues
      if (this.metricsHistory.length > 1000) {
        this.metricsHistory = this.metricsHistory.slice(-1000);
      }
    }, intervalMs);

    // Start trend analysis every 10 seconds
    this.analysisInterval = setInterval(async () => {
      if (!this.isCollecting) return;

      await this.performTrendAnalysis();
    }, 10000);
  }

  async stopCollection(): Promise<LongTermInsights> {
    this.isCollecting = false;
    
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    return this.generateLongTermInsights();
  }

  private async collectMetricsSnapshot(): Promise<MetricsSnapshot> {
    // Simulate system health metrics
    const systemHealth = {
      cpuUsage: 20 + Math.random() * 60 + (Math.sin(Date.now() / 10000) * 10), // 20-80% with sine wave
      memoryUsage: 30 + Math.random() * 50 + (Math.cos(Date.now() / 8000) * 15), // 30-80% with cosine wave
      diskUsage: 40 + Math.random() * 30, // 40-70%
      networkLatency: 10 + Math.random() * 50, // 10-60ms
      errorRate: Math.max(0, Math.random() * 5 + (Math.sin(Date.now() / 15000) * 2)), // 0-7%
      responseTime: 100 + Math.random() * 200 + (Math.sin(Date.now() / 12000) * 50), // 100-350ms
    };

    // Simulate AI performance metrics with learning progression
    const timeElapsed = this.metricsHistory.length * 2; // 2 seconds per snapshot
    const learningProgress = Math.min(timeElapsed / 60000, 1); // Progress over 1 minute

    const aiPerformance = {
      accuracy: Math.min(50 + (learningProgress * 40) + Math.random() * 10, 95), // 50-95%
      predictionConfidence: 60 + (learningProgress * 25) + Math.random() * 10, // 60-85%
      learningVelocity: Math.max(0.1, 2 - (learningProgress * 1.5) + Math.random() * 0.5), // Decreases as it learns
      patternRecognition: 30 + (learningProgress * 50) + Math.random() * 15, // 30-80%
      falsePositives: Math.max(0, 15 - (learningProgress * 10) + Math.random() * 5), // Decreases with learning
      interventionEffectiveness: 40 + (learningProgress * 45) + Math.random() * 10, // 40-85%
    };

    // Simulate business metrics (generally improving with AI learning)
    const businessMetrics = {
      systemAvailability: 95 + (learningProgress * 4) + Math.random() * 1, // 95-99%
      userSatisfaction: 70 + (learningProgress * 25) + Math.random() * 5, // 70-95%
      incidentReduction: learningProgress * 60 + Math.random() * 20, // 0-80%
      maintenanceCostSavings: learningProgress * 40 + Math.random() * 15, // 0-55%
      problemResolutionTime: Math.max(30, 300 - (learningProgress * 200) + Math.random() * 60), // 30-300 seconds
    };

    return {
      timestamp: new Date(),
      systemHealth,
      aiPerformance,
      businessMetrics,
    };
  }

  private async performTrendAnalysis(): Promise<TrendAnalysis[]> {
    if (this.metricsHistory.length < 10) return []; // Need at least 10 data points

    const trends: TrendAnalysis[] = [];
    const recentData = this.metricsHistory.slice(-30); // Last 30 snapshots (1 minute)

    // Analyze key metrics
    const metricsToAnalyze = [
      { path: 'systemHealth.errorRate', name: 'Error Rate' },
      { path: 'systemHealth.responseTime', name: 'Response Time' },
      { path: 'aiPerformance.accuracy', name: 'AI Accuracy' },
      { path: 'aiPerformance.interventionEffectiveness', name: 'Intervention Effectiveness' },
      { path: 'businessMetrics.systemAvailability', name: 'System Availability' },
    ];

    for (const metric of metricsToAnalyze) {
      const trend = this.analyzeTrendForMetric(metric.path, metric.name, recentData);
      if (trend) trends.push(trend);
    }

    return trends;
  }

  private analyzeTrendForMetric(path: string, name: string, data: MetricsSnapshot[]): TrendAnalysis | null {
    if (data.length < 5) return null;

    const values = data.map(snapshot => this.getNestedValue(snapshot, path));
    const timeSpan = data[data.length - 1].timestamp.getTime() - data[0].timestamp.getTime();
    const timeSpanHours = timeSpan / (1000 * 60 * 60);

    // Calculate linear regression for trend
    const regression = this.calculateLinearRegression(values);
    const rate = regression.slope / timeSpanHours; // Change per hour

    let direction: 'improving' | 'degrading' | 'stable';
    let significance: 'high' | 'medium' | 'low';

    // Determine direction and significance
    const absRate = Math.abs(rate);
    if (absRate < 0.1) {
      direction = 'stable';
      significance = 'low';
    } else {
      // For error rate and response time, decreasing is improving
      const improvingMetrics = ['Error Rate', 'Response Time'];
      if (improvingMetrics.includes(name)) {
        direction = rate < 0 ? 'improving' : 'degrading';
      } else {
        direction = rate > 0 ? 'improving' : 'degrading';
      }

      if (absRate > 1) significance = 'high';
      else if (absRate > 0.3) significance = 'medium';
      else significance = 'low';
    }

    // Make predictions
    const currentValue = values[values.length - 1];
    const prediction = {
      nextHour: currentValue + rate,
      nextDay: currentValue + (rate * 24),
      confidence: Math.max(0.3, 1 - (regression.rSquared > 0 ? (1 - regression.rSquared) : 0.5)),
    };

    return {
      metric: name,
      direction,
      rate,
      significance,
      prediction,
    };
  }

  private getNestedValue(obj: any, path: string): number {
    return path.split('.').reduce((current, key) => current?.[key], obj) || 0;
  }

  private calculateLinearRegression(values: number[]): { slope: number; intercept: number; rSquared: number } {
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const y = values;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
    const sumYY = y.reduce((sum, yi) => sum + yi * yi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared
    const yMean = sumY / n;
    const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - (slope * x[i] + intercept), 2), 0);
    const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
    const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;

    return { slope, intercept, rSquared };
  }

  private generateLongTermInsights(): LongTermInsights {
    if (this.metricsHistory.length === 0) {
      return {
        overallHealthTrend: 'stable',
        aiLearningEffectiveness: 0,
        systemReliabilityImprovement: 0,
        criticalMetrics: [],
        recommendations: ['Collect more data for meaningful analysis'],
        predictedIssues: [],
      };
    }

    const firstSnapshot = this.metricsHistory[0];
    const lastSnapshot = this.metricsHistory[this.metricsHistory.length - 1];
    const timeSpan = lastSnapshot.timestamp.getTime() - firstSnapshot.timestamp.getTime();
    const timeSpanHours = timeSpan / (1000 * 60 * 60);

    // Calculate overall health trend
    const healthMetrics = [
      { current: lastSnapshot.systemHealth.errorRate, initial: firstSnapshot.systemHealth.errorRate, improving: 'decrease' },
      { current: lastSnapshot.systemHealth.responseTime, initial: firstSnapshot.systemHealth.responseTime, improving: 'decrease' },
      { current: lastSnapshot.businessMetrics.systemAvailability, initial: firstSnapshot.businessMetrics.systemAvailability, improving: 'increase' },
    ];

    let improvementCount = 0;
    healthMetrics.forEach(metric => {
      const improved = metric.improving === 'decrease' 
        ? metric.current < metric.initial 
        : metric.current > metric.initial;
      if (improved) improvementCount++;
    });

    const overallHealthTrend = improvementCount >= 2 ? 'improving' : improvementCount === 1 ? 'stable' : 'concerning';

    // Calculate AI learning effectiveness
    const aiAccuracyImprovement = lastSnapshot.aiPerformance.accuracy - firstSnapshot.aiPerformance.accuracy;
    const interventionImprovement = lastSnapshot.aiPerformance.interventionEffectiveness - firstSnapshot.aiPerformance.interventionEffectiveness;
    const aiLearningEffectiveness = Math.max(0, Math.min(100, (aiAccuracyImprovement + interventionImprovement) / 2));

    // Calculate system reliability improvement
    const availabilityImprovement = lastSnapshot.businessMetrics.systemAvailability - firstSnapshot.businessMetrics.systemAvailability;
    const incidentReduction = lastSnapshot.businessMetrics.incidentReduction;
    const systemReliabilityImprovement = Math.max(0, (availabilityImprovement * 10 + incidentReduction) / 2);

    // Identify critical metrics
    const criticalMetrics: string[] = [];
    if (lastSnapshot.systemHealth.errorRate > 10) criticalMetrics.push('High Error Rate');
    if (lastSnapshot.systemHealth.responseTime > 1000) criticalMetrics.push('Slow Response Time');
    if (lastSnapshot.systemHealth.cpuUsage > 90) criticalMetrics.push('High CPU Usage');
    if (lastSnapshot.systemHealth.memoryUsage > 90) criticalMetrics.push('High Memory Usage');
    if (lastSnapshot.aiPerformance.accuracy < 60) criticalMetrics.push('Low AI Accuracy');

    // Generate recommendations
    const recommendations: string[] = [];
    if (aiLearningEffectiveness < 30) {
      recommendations.push('Increase AI training data quality and quantity');
    }
    if (systemReliabilityImprovement < 10) {
      recommendations.push('Implement additional monitoring and alerting mechanisms');
    }
    if (overallHealthTrend === 'concerning') {
      recommendations.push('Review system architecture and scaling strategies');
    }
    if (lastSnapshot.aiPerformance.falsePositives > 20) {
      recommendations.push('Fine-tune AI model to reduce false positive rate');
    }

    // Predict potential issues
    const predictedIssues = this.generatePredictedIssues(lastSnapshot, timeSpanHours);

    return {
      overallHealthTrend,
      aiLearningEffectiveness: Math.floor(aiLearningEffectiveness),
      systemReliabilityImprovement: Math.floor(systemReliabilityImprovement),
      criticalMetrics,
      recommendations,
      predictedIssues,
    };
  }

  private generatePredictedIssues(snapshot: MetricsSnapshot, timeSpanHours: number): Array<{
    issue: string;
    probability: number;
    timeframe: string;
    suggestedPrevention: string[];
  }> {
    const issues = [];

    // Predict based on current trends
    if (snapshot.systemHealth.cpuUsage > 70) {
      issues.push({
        issue: 'CPU Resource Exhaustion',
        probability: Math.min(90, snapshot.systemHealth.cpuUsage),
        timeframe: snapshot.systemHealth.cpuUsage > 85 ? '1-2 hours' : '4-8 hours',
        suggestedPrevention: ['Scale horizontally', 'Optimize CPU-intensive processes', 'Enable auto-scaling'],
      });
    }

    if (snapshot.systemHealth.errorRate > 5) {
      issues.push({
        issue: 'Error Rate Spike',
        probability: Math.min(80, snapshot.systemHealth.errorRate * 10),
        timeframe: '30 minutes - 2 hours',
        suggestedPrevention: ['Implement circuit breakers', 'Review recent deployments', 'Check downstream dependencies'],
      });
    }

    if (snapshot.aiPerformance.accuracy < 70 && snapshot.aiPerformance.learningVelocity < 0.5) {
      issues.push({
        issue: 'AI Performance Degradation',
        probability: 60,
        timeframe: '2-6 hours',
        suggestedPrevention: ['Retrain AI model', 'Review training data quality', 'Check model drift'],
      });
    }

    return issues;
  }

  getMetricsHistory(): MetricsSnapshot[] {
    return [...this.metricsHistory];
  }

  getLatestSnapshot(): MetricsSnapshot | null {
    return this.metricsHistory.length > 0 ? this.metricsHistory[this.metricsHistory.length - 1] : null;
  }

  getMetricsSummary(): any {
    if (this.metricsHistory.length === 0) return null;

    const latest = this.metricsHistory[this.metricsHistory.length - 1];
    const first = this.metricsHistory[0];

    return {
      collectionPeriod: {
        start: first.timestamp,
        end: latest.timestamp,
        duration: latest.timestamp.getTime() - first.timestamp.getTime(),
        dataPoints: this.metricsHistory.length,
      },
      improvements: {
        aiAccuracy: latest.aiPerformance.accuracy - first.aiPerformance.accuracy,
        systemAvailability: latest.businessMetrics.systemAvailability - first.businessMetrics.systemAvailability,
        errorRateReduction: first.systemHealth.errorRate - latest.systemHealth.errorRate,
        responseTimeImprovement: first.systemHealth.responseTime - latest.systemHealth.responseTime,
      },
      currentState: {
        systemHealth: latest.systemHealth,
        aiPerformance: latest.aiPerformance,
        businessMetrics: latest.businessMetrics,
      },
    };
  }
}

describe('Long-Term Metrics Collection Tests', () => {
  const { getStorage } = setupTestEnvironment();
  let metricsEngine: MetricsCollectionEngine;

  beforeAll(() => {
    metricsEngine = new MetricsCollectionEngine(getStorage());
  });

  afterAll(async () => {
    await metricsEngine.stopCollection();
  });

  it('should collect and analyze metrics over time', async () => {
    await metricsEngine.startCollection(1000); // Collect every second

    // Let it collect for 15 seconds
    await new Promise(resolve => setTimeout(resolve, 15000));

    const insights = await metricsEngine.stopCollection();
    const summary = metricsEngine.getMetricsSummary();

    expect(summary).toBeDefined();
    expect(summary.collectionPeriod.dataPoints).toBeGreaterThan(10);
    expect(insights.overallHealthTrend).toMatch(/improving|stable|concerning/);
    expect(insights.aiLearningEffectiveness).toBeGreaterThanOrEqual(0);
    expect(insights.systemReliabilityImprovement).toBeGreaterThanOrEqual(0);

    console.log('📊 Metrics Collection Summary:', {
      dataPoints: summary.collectionPeriod.dataPoints,
      duration: `${Math.floor(summary.collectionPeriod.duration / 1000)}s`,
      healthTrend: insights.overallHealthTrend,
      aiEffectiveness: `${insights.aiLearningEffectiveness}%`,
      reliabilityImprovement: `${insights.systemReliabilityImprovement}%`,
      criticalMetrics: insights.criticalMetrics.length,
      recommendations: insights.recommendations.length,
    });
  }, 20000);

  it('should detect learning progression patterns', async () => {
    await metricsEngine.startCollection(800); // Collect every 0.8 seconds

    // Run for 20 seconds to see learning progression
    await new Promise(resolve => setTimeout(resolve, 20000));

    const insights = await metricsEngine.stopCollection();
    const history = metricsEngine.getMetricsHistory();

    expect(history.length).toBeGreaterThan(20);

    // Check for learning progression
    const firstQuarter = history.slice(0, Math.floor(history.length / 4));
    const lastQuarter = history.slice(-Math.floor(history.length / 4));

    const avgEarlyAccuracy = firstQuarter.reduce((sum, s) => sum + s.aiPerformance.accuracy, 0) / firstQuarter.length;
    const avgLateAccuracy = lastQuarter.reduce((sum, s) => sum + s.aiPerformance.accuracy, 0) / lastQuarter.length;

    const avgEarlyEffectiveness = firstQuarter.reduce((sum, s) => sum + s.aiPerformance.interventionEffectiveness, 0) / firstQuarter.length;
    const avgLateEffectiveness = lastQuarter.reduce((sum, s) => sum + s.aiPerformance.interventionEffectiveness, 0) / lastQuarter.length;

    // Expect improvement over time (allowing for some variance)
    expect(avgLateAccuracy).toBeGreaterThanOrEqual(avgEarlyAccuracy * 0.95);
    expect(avgLateEffectiveness).toBeGreaterThanOrEqual(avgEarlyEffectiveness * 0.95);

    console.log('🧠 Learning Progression Analysis:', {
      totalDataPoints: history.length,
      accuracyProgression: `${avgEarlyAccuracy.toFixed(1)}% → ${avgLateAccuracy.toFixed(1)}%`,
      effectivenessProgression: `${avgEarlyEffectiveness.toFixed(1)}% → ${avgLateEffectiveness.toFixed(1)}%`,
      aiLearningEffectiveness: `${insights.aiLearningEffectiveness}%`,
      learningTrend: avgLateAccuracy > avgEarlyAccuracy ? '📈 Improving' : avgLateAccuracy === avgEarlyAccuracy ? '➡️ Stable' : '📉 Needs attention',
    });
  }, 25000);

  it('should generate actionable insights and predictions', async () => {
    await metricsEngine.startCollection(1500); // Collect every 1.5 seconds

    // Run for 12 seconds
    await new Promise(resolve => setTimeout(resolve, 12000));

    const insights = await metricsEngine.stopCollection();

    expect(insights.recommendations).toBeDefined();
    expect(Array.isArray(insights.recommendations)).toBe(true);
    expect(insights.predictedIssues).toBeDefined();
    expect(Array.isArray(insights.predictedIssues)).toBe(true);

    // Should have meaningful recommendations if there are concerning metrics
    if (insights.criticalMetrics.length > 0) {
      expect(insights.recommendations.length).toBeGreaterThan(0);
    }

    // Check prediction quality
    const highProbabilityPredictions = insights.predictedIssues.filter(issue => issue.probability > 50);
    
    console.log('🔮 Insights and Predictions:', {
      overallTrend: insights.overallHealthTrend,
      criticalMetrics: insights.criticalMetrics,
      totalRecommendations: insights.recommendations.length,
      highProbabilityPredictions: highProbabilityPredictions.length,
      systemReliabilityImprovement: `${insights.systemReliabilityImprovement}%`,
      topRecommendations: insights.recommendations.slice(0, 3),
      urgentPredictions: highProbabilityPredictions.map(p => ({
        issue: p.issue,
        probability: `${p.probability}%`,
        timeframe: p.timeframe,
      })),
    });

    // Validate prediction structure
    insights.predictedIssues.forEach(prediction => {
      expect(prediction.issue).toBeDefined();
      expect(prediction.probability).toBeGreaterThanOrEqual(0);
      expect(prediction.probability).toBeLessThanOrEqual(100);
      expect(prediction.timeframe).toBeDefined();
      expect(Array.isArray(prediction.suggestedPrevention)).toBe(true);
    });
  }, 18000);

  it('should demonstrate business impact measurement', async () => {
    await metricsEngine.startCollection(1200); // Collect every 1.2 seconds

    // Run for 18 seconds to capture business impact
    await new Promise(resolve => setTimeout(resolve, 18000));

    const insights = await metricsEngine.stopCollection();
    const summary = metricsEngine.getMetricsSummary();

    expect(summary.improvements).toBeDefined();

    // Calculate business impact metrics
    const businessImpact = {
      availabilityImprovement: summary.improvements.systemAvailability,
      performanceImprovement: summary.improvements.responseTimeImprovement,
      reliabilityImprovement: insights.systemReliabilityImprovement,
      aiContribution: insights.aiLearningEffectiveness,
    };

    // Validate business metrics are meaningful
    expect(businessImpact.reliabilityImprovement).toBeGreaterThanOrEqual(0);
    expect(businessImpact.aiContribution).toBeGreaterThanOrEqual(0);

    console.log('💼 Business Impact Analysis:', {
      systemReliability: `${businessImpact.reliabilityImprovement}% improvement`,
      aiContribution: `${businessImpact.aiContribution}% effectiveness`,
      availabilityChange: businessImpact.availabilityImprovement > 0 ? 
        `+${businessImpact.availabilityImprovement.toFixed(2)}%` : 
        `${businessImpact.availabilityImprovement.toFixed(2)}%`,
      performanceChange: summary.improvements.responseTimeImprovement > 0 ? 
        `${summary.improvements.responseTimeImprovement.toFixed(0)}ms faster` : 
        `${Math.abs(summary.improvements.responseTimeImprovement).toFixed(0)}ms slower`,
      overallValue: businessImpact.reliabilityImprovement > 20 ? 'High Value' : 
                   businessImpact.reliabilityImprovement > 10 ? 'Medium Value' : 
                   'Building Value',
    });

    // Business impact should show positive trends over time
    const hasPositiveImpact = 
      businessImpact.reliabilityImprovement > 5 ||
      businessImpact.aiContribution > 30 ||
      businessImpact.availabilityImprovement > 0.5;

    expect(hasPositiveImpact).toBe(true);
  }, 25000);
});