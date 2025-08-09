/**
 * Module Composition DSL Service
 *
 * Ermöglicht es Benutzern, durch natürliche BDD-Sprache vorhandene Module
 * zu kombinieren und automatisch Testprofile zu generieren.
 *
 * Beispiel DSL:
 * GIVEN monitoring is active with log file analysis
 * WHEN error messages are detected in application logs
 * THEN find corresponding code areas and suggest fixes
 * AND generate performance metrics
 *
 */

import { EventEmitter } from 'events';
import { z } from 'zod';

// ============================================================================
// MODULE CAPABILITY DISCOVERY
// ============================================================================

export interface ModuleCapability {
  id: string;
  name: string;
  category: 'monitoring' | 'analysis' | 'detection' | 'remediation' | 'reporting';
  description: string;
  inputs: string[];
  outputs: string[];
  keywords: string[];
  service: string;
  methods: string[];
  dependencies?: string[];
  complexity: 'low' | 'medium' | 'high';
}

export const AVAILABLE_MODULES: Record<string, ModuleCapability> = {
  'log-file-monitoring': {
    id: 'log-file-monitoring',
    name: 'Log File Monitoring',
    category: 'monitoring',
    description: 'Kontinuierliche Überwachung von Log-Dateien und Echtzeitanalyse',
    inputs: ['file-paths', 'patterns'],
    outputs: ['log-entries', 'alerts'],
    keywords: ['monitoring', 'logs', 'files', 'watch', 'tail', 'realtime'],
    service: 'logAggregator',
    methods: ['captureLog', 'getRecentLogs'],
    complexity: 'low',
  },

  'error-detection': {
    id: 'error-detection',
    name: 'Error Pattern Detection',
    category: 'detection',
    description: 'Erkennung von Fehlermuster in Logs und Code',
    inputs: ['log-entries', 'code-files'],
    outputs: ['detected-errors', 'error-patterns'],
    keywords: ['error', 'detection', 'pattern', 'anomaly', 'failure'],
    service: 'pythonFramework',
    methods: ['analyzeErrors', 'detectPatterns'],
    dependencies: ['log-file-monitoring'],
    complexity: 'medium',
  },

  'code-analysis': {
    id: 'code-analysis',
    name: 'Static Code Analysis',
    category: 'analysis',
    description: 'Statische Codeanalyse zur Identifikation von Problemstellen',
    inputs: ['source-code', 'error-context'],
    outputs: ['code-issues', 'suggestions'],
    keywords: ['code', 'analysis', 'static', 'source', 'quality', 'lint'],
    service: 'pythonFramework',
    methods: ['analyzeCode', 'findCodeAreas'],
    complexity: 'high',
  },

  'performance-metrics': {
    id: 'performance-metrics',
    name: 'Performance Metrics Collection',
    category: 'monitoring',
    description: 'Sammlung und Analyse von System-Performance-Metriken',
    inputs: ['system-state', 'process-info'],
    outputs: ['metrics', 'performance-data'],
    keywords: ['performance', 'metrics', 'cpu', 'memory', 'disk', 'network'],
    service: 'pythonMonitor',
    methods: ['collectMetrics', 'analyzePerformance'],
    complexity: 'medium',
  },

  'problem-correlation': {
    id: 'problem-correlation',
    name: 'Problem Correlation Engine',
    category: 'analysis',
    description: 'Korreliert Probleme zwischen verschiedenen Systemkomponenten',
    inputs: ['problems', 'metrics', 'logs'],
    outputs: ['correlations', 'root-causes'],
    keywords: ['correlation', 'problems', 'root-cause', 'dependency', 'impact'],
    service: 'pythonFramework',
    methods: ['correlateProbems', 'findRootCause'],
    dependencies: ['error-detection', 'performance-metrics'],
    complexity: 'high',
  },

  'auto-remediation': {
    id: 'auto-remediation',
    name: 'Automated Remediation',
    category: 'remediation',
    description: 'Automatische Behebung erkannter Probleme',
    inputs: ['problems', 'code-suggestions'],
    outputs: ['fixes', 'remediation-actions'],
    keywords: ['fix', 'auto', 'remediation', 'repair', 'solve'],
    service: 'pythonFramework',
    methods: ['applyFix', 'generateRemediation'],
    dependencies: ['code-analysis', 'problem-correlation'],
    complexity: 'high',
  },

  'mcp-server-discovery': {
    id: 'mcp-server-discovery',
    name: 'MCP Server Discovery',
    category: 'monitoring',
    description: 'Automatische Erkennung und Überwachung von MCP Servern',
    inputs: ['network-scan', 'process-list'],
    outputs: ['mcp-servers', 'server-status'],
    keywords: ['mcp', 'server', 'discovery', 'network', 'scan'],
    service: 'pythonMonitor',
    methods: ['discoverServers', 'monitorServers'],
    complexity: 'medium',
  },

  'test-data-generation': {
    id: 'test-data-generation',
    name: 'Test Data Generation',
    category: 'reporting',
    description: 'Generierung realistischer Testdaten basierend auf Systemzustand',
    inputs: ['system-profile', 'requirements'],
    outputs: ['test-data', 'scenarios'],
    keywords: ['test', 'data', 'generation', 'mock', 'simulation'],
    service: 'testManager',
    methods: ['generateTestData', 'createScenarios'],
    complexity: 'medium',
  },
};

// ============================================================================
// BDD/DSL PARSING
// ============================================================================

export interface DSLStatement {
  type: 'given' | 'when' | 'then' | 'and' | 'but';
  text: string;
  modules: string[];
  parameters: Record<string, any>;
  conditions?: string[];
}

export interface ParsedScenario {
  title: string;
  description?: string;
  statements: DSLStatement[];
  requiredModules: string[];
  executionOrder: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedDuration: number;
}

export interface GeneratedTestProfile {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  sourceScenario: ParsedScenario;
  moduleConfiguration: Record<string, any>;
  testData: {
    expectedLogs: number;
    expectedProblems: number;
    expectedMetrics: number;
    duration: number;
  };
  executionPlan: Array<{
    step: number;
    module: string;
    action: string;
    inputs: string[];
    outputs: string[];
    timeout: number;
  }>;
}

export class ModuleCompositionDSLService extends EventEmitter {
  private moduleRegistry = new Map<string, ModuleCapability>();
  private keywordIndex = new Map<string, string[]>();

  constructor() {
    super();
    this.buildModuleRegistry();
    this.buildKeywordIndex();
  }

  /**
   * Baut das Modul-Registry auf
   */
  private buildModuleRegistry(): void {
    Object.values(AVAILABLE_MODULES).forEach((module) => {
      this.moduleRegistry.set(module.id, module);
    });

    console.log(`📦 Loaded ${this.moduleRegistry.size} available modules`);
  }

  /**
   * Baut den Keyword-Index für Modul-Matching auf
   */
  private buildKeywordIndex(): void {
    this.moduleRegistry.forEach((module) => {
      module.keywords.forEach((keyword) => {
        if (!this.keywordIndex.has(keyword)) {
          this.keywordIndex.set(keyword, []);
        }
        this.keywordIndex.get(keyword)!.push(module.id);
      });
    });
  }

  /**
   * Parst ein BDD/DSL Szenario und identifiziert benötigte Module
   */
  parseScenario(scenarioText: string): ParsedScenario {
    const lines = scenarioText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    let title = 'Generated Scenario';
    let description = '';
    const statements: DSLStatement[] = [];

    for (const line of lines) {
      if (line.startsWith('Scenario:') || line.startsWith('Feature:')) {
        title = line.replace(/^(Scenario|Feature):\s*/, '');
        continue;
      }

      if (line.startsWith('Description:')) {
        description = line.replace(/^Description:\s*/, '');
        continue;
      }

      const statement = this.parseStatement(line);
      if (statement) {
        statements.push(statement);
      }
    }

    const allModules = new Set<string>();
    statements.forEach((stmt) => stmt.modules.forEach((mod) => allModules.add(mod)));

    const requiredModules = Array.from(allModules);
    const executionOrder = this.calculateExecutionOrder(requiredModules);
    const complexity = this.calculateComplexity(requiredModules);
    const estimatedDuration = this.estimateDuration(requiredModules, complexity);

    return {
      title,
      description,
      statements,
      requiredModules,
      executionOrder,
      complexity,
      estimatedDuration,
    };
  }

  /**
   * Parst eine einzelne BDD-Anweisung
   */
  private parseStatement(line: string): DSLStatement | null {
    const bddPattern = /^(GIVEN|WHEN|THEN|AND|BUT)\s+(.+)$/i;
    const match = line.match(bddPattern);

    if (!match) return null;

    const type = match[1].toLowerCase() as DSLStatement['type'];
    const text = match[2];

    // Identifiziere Module basierend auf Keywords
    const modules = this.identifyModulesFromText(text);

    // Extrahiere Parameter
    const parameters = this.extractParameters(text);

    return {
      type,
      text,
      modules,
      parameters,
    };
  }

  /**
   * Identifiziert Module basierend auf Textinhalt
   */
  private identifyModulesFromText(text: string): string[] {
    const lowerText = text.toLowerCase();
    const identifiedModules = new Set<string>();

    // Suche nach Keyword-Matches
    this.keywordIndex.forEach((moduleIds, keyword) => {
      if (lowerText.includes(keyword)) {
        moduleIds.forEach((moduleId) => identifiedModules.add(moduleId));
      }
    });

    // Spezielle Pattern-Erkennung
    if (lowerText.includes('log') && lowerText.includes('analysis')) {
      identifiedModules.add('log-file-monitoring');
      identifiedModules.add('error-detection');
    }

    if (lowerText.includes('error') && lowerText.includes('code')) {
      identifiedModules.add('error-detection');
      identifiedModules.add('code-analysis');
    }

    if (lowerText.includes('performance') && lowerText.includes('metrics')) {
      identifiedModules.add('performance-metrics');
    }

    if (lowerText.includes('mcp server') || lowerText.includes('mcp-server')) {
      identifiedModules.add('mcp-server-discovery');
    }

    return Array.from(identifiedModules);
  }

  /**
   * Extrahiert Parameter aus dem Text
   */
  private extractParameters(text: string): Record<string, any> {
    const parameters: Record<string, any> = {};

    // Zahlen extrahieren
    const numbers = text.match(/\d+/g);
    if (numbers) {
      parameters.numericValues = numbers.map((n) => parseInt(n));
    }

    // Dateipfade extrahieren
    const paths = text.match(/[\/\w\-\.]+\.(log|txt|json|js|ts|py)/g);
    if (paths) {
      parameters.filePaths = paths;
    }

    // Zeitangaben extrahieren
    const timeMatches = text.match(/(\d+)\s*(second|minute|hour|day)s?/gi);
    if (timeMatches) {
      parameters.timeValues = timeMatches;
    }

    return parameters;
  }

  /**
   * Berechnet die Ausführungsreihenfolge basierend auf Abhängigkeiten
   */
  private calculateExecutionOrder(moduleIds: string[]): string[] {
    const modules = moduleIds.map((id) => this.moduleRegistry.get(id)!).filter(Boolean);
    const ordered: string[] = [];
    const visited = new Set<string>();

    const visit = (module: ModuleCapability) => {
      if (visited.has(module.id)) return;

      // Abhängigkeiten zuerst besuchen
      if (module.dependencies) {
        module.dependencies.forEach((depId) => {
          const depModule = this.moduleRegistry.get(depId);
          if (depModule && moduleIds.includes(depId)) {
            visit(depModule);
          }
        });
      }

      visited.add(module.id);
      ordered.push(module.id);
    };

    modules.forEach(visit);
    return ordered;
  }

  /**
   * Berechnet die Komplexität basierend auf verwendeten Modulen
   */
  private calculateComplexity(moduleIds: string[]): 'low' | 'medium' | 'high' {
    const modules = moduleIds.map((id) => this.moduleRegistry.get(id)!).filter(Boolean);
    const complexityScores = modules.map((m) => ({ low: 1, medium: 2, high: 3 })[m.complexity]);
    const avgComplexity = complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length;

    if (avgComplexity >= 2.5) return 'high';
    if (avgComplexity >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * Schätzt die Ausführungsdauer
   */
  private estimateDuration(moduleIds: string[], complexity: 'low' | 'medium' | 'high'): number {
    const baseTime = moduleIds.length * 30; // 30 Sekunden pro Modul
    const complexityMultiplier = { low: 1, medium: 1.5, high: 2.5 }[complexity];
    return Math.ceil(baseTime * complexityMultiplier);
  }

  /**
   * Generiert ein Testprofil aus einem geparsten Szenario
   */
  async generateTestProfile(scenario: ParsedScenario): Promise<GeneratedTestProfile> {
    console.log(`🔧 Generating test profile for: ${scenario.title}`);

    const profile: GeneratedTestProfile = {
      id: `profile-${Date.now()}`,
      name: `Profile: ${scenario.title}`,
      description: scenario.description || `Auto-generated profile from BDD scenario`,
      createdAt: new Date().toISOString(),
      sourceScenario: scenario,
      moduleConfiguration: this.generateModuleConfiguration(scenario),
      testData: this.calculateTestData(scenario),
      executionPlan: this.generateExecutionPlan(scenario),
    };

    // Profile speichern
    await this.saveProfile(profile);

    console.log(`✅ Generated test profile: ${profile.id}`);
    return profile;
  }

  /**
   * Generiert Modul-Konfiguration
   */
  private generateModuleConfiguration(scenario: ParsedScenario): Record<string, any> {
    const config: Record<string, any> = {};

    scenario.requiredModules.forEach((moduleId) => {
      const module = this.moduleRegistry.get(moduleId);
      if (!module) return;

      config[moduleId] = {
        enabled: true,
        service: module.service,
        methods: module.methods,
        category: module.category,
        inputs: module.inputs,
        outputs: module.outputs,
      };
    });

    return config;
  }

  /**
   * Berechnet erwartete Testdaten
   */
  private calculateTestData(scenario: ParsedScenario): GeneratedTestProfile['testData'] {
    const baseMultiplier = { low: 1, medium: 3, high: 8 }[scenario.complexity];

    return {
      expectedLogs: 500 * baseMultiplier,
      expectedProblems: 10 * baseMultiplier,
      expectedMetrics: 200 * baseMultiplier,
      duration: scenario.estimatedDuration,
    };
  }

  /**
   * Generiert detaillierten Ausführungsplan
   */
  private generateExecutionPlan(scenario: ParsedScenario): GeneratedTestProfile['executionPlan'] {
    const plan: GeneratedTestProfile['executionPlan'] = [];

    scenario.executionOrder.forEach((moduleId, index) => {
      const module = this.moduleRegistry.get(moduleId);
      if (!module) return;

      plan.push({
        step: index + 1,
        module: moduleId,
        action: module.methods[0] || 'execute',
        inputs: module.inputs,
        outputs: module.outputs,
        timeout: this.calculateTimeout(module.complexity),
      });
    });

    return plan;
  }

  private calculateTimeout(complexity: 'low' | 'medium' | 'high'): number {
    return { low: 30, medium: 60, high: 120 }[complexity];
  }

  /**
   * Speichert das Testprofil
   */
  private async saveProfile(profile: GeneratedTestProfile): Promise<void> {
    const fs = await import('fs/promises');
    const path = await import('path');

    const profilesDir = path.join('./test-workspace', 'profiles');
    await fs.mkdir(profilesDir, { recursive: true });

    const filePath = path.join(profilesDir, `${profile.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(profile, null, 2));

    console.log(`💾 Profile saved: ${filePath}`);
  }

  /**
   * Validiert ein DSL-Szenario
   */
  validateScenario(scenarioText: string): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const scenario = this.parseScenario(scenarioText);

      if (scenario.requiredModules.length === 0) {
        errors.push('No modules could be identified from the scenario text');
      }

      // Prüfe auf unerfüllbare Abhängigkeiten
      scenario.requiredModules.forEach((moduleId) => {
        const module = this.moduleRegistry.get(moduleId);
        if (!module) {
          errors.push(`Module '${moduleId}' not found`);
          return;
        }

        if (module.dependencies) {
          module.dependencies.forEach((depId) => {
            if (!scenario.requiredModules.includes(depId)) {
              warnings.push(`Module '${moduleId}' requires '${depId}' but it's not included`);
            }
          });
        }
      });
    } catch (error) {
      errors.push(`Parse error: ${error.message}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Gibt verfügbare Module und ihre Fähigkeiten zurück
   */
  getAvailableModules(): ModuleCapability[] {
    return Array.from(this.moduleRegistry.values());
  }

  /**
   * Sucht Module basierend auf Keywords
   */
  searchModules(query: string): ModuleCapability[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.moduleRegistry.values()).filter((module) => {
      return (
        module.keywords.some((keyword) => keyword.includes(lowerQuery)) ||
        module.name.toLowerCase().includes(lowerQuery) ||
        module.description.toLowerCase().includes(lowerQuery)
      );
    });
  }
}

export const moduleCompositionDSLService = new ModuleCompositionDSLService();
