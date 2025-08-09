/**
 * 🛡️ SERVICE RESILIENCE MANAGER
 * Lightweight shell retained for future capability registration.
 * All concrete fallback implementations were removed.
 */
export interface ServiceCapability {
  name: string;
  critical: boolean;
  healthCheck: () => Promise<boolean>;
  lastHealthStatus: boolean;
  retryCount: number;
  maxRetries: number;
}

export class ServiceResilienceManager {
  private capabilities: Map<string, ServiceCapability> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  registerCapability(capability: ServiceCapability) {
    this.capabilities.set(capability.name, capability);
  }

  startHealthMonitoring(intervalMs: number = 30000) {
    if (this.healthCheckInterval) return;
    this.healthCheckInterval = setInterval(async () => {
      const caps = Array.from(this.capabilities.values());
      for (let i = 0; i < caps.length; i++) {
        const cap = caps[i];
        try {
          const healthy = await cap.healthCheck();
          cap.lastHealthStatus = healthy;
          cap.retryCount = healthy ? 0 : cap.retryCount + 1;
        } catch {
          cap.lastHealthStatus = false;
          cap.retryCount++;
        }
      }
    }, intervalMs);
  }

  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  getSystemHealth() {
    const criticalServicesDown: string[] = [];
    let healthy = 0;
    const caps = Array.from(this.capabilities.values());
    for (let i = 0; i < caps.length; i++) {
      const cap = caps[i];
      if (cap.lastHealthStatus) healthy++;
      else if (cap.critical) criticalServicesDown.push(cap.name);
    }
    return {
      totalServices: this.capabilities.size,
      healthyServices: healthy,
      criticalServicesDown,
      degradedFunctionality: criticalServicesDown.length > 0,
    };
  }
}

// NOTE: Removed TestManagerFallback & PythonAPIFallback.
