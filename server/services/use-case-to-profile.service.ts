/**
 * Use Case to Test Profile Generation Service
 *
 * Dieses System konvertiert strukturierte Use Case Definitionen automatisch
 * in ausführbare Testprofile mit realistischen Testdaten.
 */

import { promises as fs } from 'fs';
import path from 'path';
import { z } from 'zod';

// ============================================================================
// USE CASE DEFINITION SCHEMA
// ============================================================================

const ActorSchema = z.object({
  name: z.string(),
  role: z.enum(['system_admin', 'end_user', 'security_admin', 'developer', 'operator']),
  experience: z.enum(['beginner', 'intermediate', 'expert']),
  goals: z.array(z.string()),
  constraints: z.array(z.string()).optional(),
});

const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  preconditions: z.array(z.string()),
  steps: z.array(
    z.object({
      action: z.string(),
      expectedResult: z.string(),
      data: z.record(z.any()).optional(),
    }),
  ),
  postconditions: z.array(z.string()),
  complexity: z.enum(['low', 'medium', 'high']),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  tags: z.array(z.string()).optional(),
});

const UseCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  actors: z.array(ActorSchema),
  scenarios: z.array(ScenarioSchema),
  systemRequirements: z.object({
    mcpServers: z.number().optional(),
    logVolume: z.enum(['low', 'medium', 'high']),
    problemFrequency: z.enum(['rare', 'occasional', 'frequent']),
    systemLoad: z.enum(['light', 'moderate', 'heavy']),
  }),
  testDataRequirements: z.object({
    languages: z.array(z.string()),
    fileTypes: z.array(z.string()),
    errorTypes: z.array(z.string()),
    dataVolume: z.enum(['small', 'medium', 'large']),
  }),
  successCriteria: z.array(
    z.object({
      metric: z.string(),
      threshold: z.number(),
      operator: z.enum(['>', '<', '>=', '<=', '==']),
    }),
  ),
});

export type UseCase = z.infer<typeof UseCaseSchema>;
export type Actor = z.infer<typeof ActorSchema>;
export type Scenario = z.infer<typeof ScenarioSchema>;

// ============================================================================
// TEST PROFILE GENERATION
// ============================================================================

export interface GeneratedTestProfile {
  id: string;
  name: string;
  version: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  sourceUseCase: string;

  // Test Configuration
  sourceConfig: {
    directories: string[];
    languages: string[];
    complexity: 'low' | 'medium' | 'high';
    excludePatterns: string[];
  };

  // Generated Scenarios
  scenarios: Array<{
    id: string;
    name: string;
    type: string;
    duration: number;
    enabled: boolean;
    problemTypes: string[];
    codeInjection: {
      errorTypes: string[];
      frequency: number;
      complexity: 'low' | 'medium' | 'high';
    };
    metrics: {
      cpuPattern: string;
      memoryPattern: string;
      logPattern: string;
    };
    actorContext?: {
      role: string;
      experience: string;
      goals: string[];
    };
  }>;

  // Expected Results
  expectations: {
    detectionRate: number;
    fixSuccessRate: number;
    falsePositiveRate: number;
    mlAccuracy: number;
    userExperienceScore?: number;
  };

  // Data Generation Rules
  generationRules: {
    sampleCount: number;
    varianceLevel: 'low' | 'medium' | 'high';
    timespan: string;
    errorDistribution: Record<string, number>;
    userJourneySimulation?: boolean;
  };

  // Test Data
  testData: {
    logEntries: number;
    problems: number;
    metrics: number;
    sizeKB: number;
    mcpServers?: number;
  };
}

export class UseCaseToProfileService {
  private workspaceDir: string;

  constructor(workspaceDir: string = './test-workspace') {
    this.workspaceDir = workspaceDir;
  }

  /**
   * Konvertiert eine Use Case Definition in ein Testprofil
   */
  async generateTestProfile(useCase: UseCase): Promise<GeneratedTestProfile> {
    console.log(`🔄 Generating test profile for use case: ${useCase.title}`);

    const profile: GeneratedTestProfile = {
      id: this.generateProfileId(useCase.id),
      name: `Profile: ${useCase.title}`,
      version: '1.0.0',
      description: `Auto-generated test profile from use case: ${useCase.description}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sourceUseCase: useCase.id,

      sourceConfig: this.generateSourceConfig(useCase),
      scenarios: this.generateScenarios(useCase),
      expectations: this.calculateExpectations(useCase),
      generationRules: this.generateDataRules(useCase),
      testData: this.calculateTestData(useCase),
    };

    // Profile speichern
    await this.saveProfile(profile);

    console.log(`✅ Generated test profile: ${profile.id}`);
    return profile;
  }

  /**
   * Generiert Source Configuration basierend auf Use Case
   */
  private generateSourceConfig(useCase: UseCase): GeneratedTestProfile['sourceConfig'] {
    const complexity = this.calculateComplexity(useCase);

    return {
      directories: ['./src', './server', './client/src'],
      languages: useCase.testDataRequirements.languages,
      complexity,
      excludePatterns: ['node_modules', 'dist', '*.log', '.git'],
    };
  }

  /**
   * Generiert Test-Szenarien basierend auf Use Case Szenarien
   */
  private generateScenarios(useCase: UseCase): GeneratedTestProfile['scenarios'] {
    return useCase.scenarios.map((scenario) => ({
      id: scenario.id,
      name: scenario.name,
      type: this.mapScenarioType(scenario, useCase),
      duration: this.calculateDuration(scenario.complexity),
      enabled: scenario.priority !== 'low',
      problemTypes: useCase.testDataRequirements.errorTypes,
      codeInjection: {
        errorTypes: useCase.testDataRequirements.errorTypes,
        frequency: this.calculateErrorFrequency(
          scenario.complexity,
          useCase.systemRequirements.problemFrequency,
        ),
        complexity: scenario.complexity,
      },
      metrics: this.generateMetricsPattern(useCase.systemRequirements.systemLoad),
      actorContext: scenario.tags?.includes('user-centric')
        ? {
            role: useCase.actors[0]?.role || 'end_user',
            experience: useCase.actors[0]?.experience || 'intermediate',
            goals: useCase.actors[0]?.goals || [],
          }
        : undefined,
    }));
  }

  /**
   * Berechnet Erwartungen basierend auf Use Case Kriterien
   */
  private calculateExpectations(useCase: UseCase): GeneratedTestProfile['expectations'] {
    const baseExpectations = {
      detectionRate: 75,
      fixSuccessRate: 60,
      falsePositiveRate: 25,
      mlAccuracy: 70,
    };

    // Anpassungen basierend auf Komplexität
    const avgComplexity =
      useCase.scenarios.reduce((acc, s) => {
        const complexityWeight = { low: 1, medium: 2, high: 3 }[s.complexity];
        return acc + complexityWeight;
      }, 0) / useCase.scenarios.length;

    if (avgComplexity > 2.5) {
      // Hohe Komplexität - niedrigere Erwartungen
      baseExpectations.detectionRate = 60;
      baseExpectations.fixSuccessRate = 45;
      baseExpectations.falsePositiveRate = 35;
    } else if (avgComplexity < 1.5) {
      // Niedrige Komplexität - höhere Erwartungen
      baseExpectations.detectionRate = 85;
      baseExpectations.fixSuccessRate = 75;
      baseExpectations.falsePositiveRate = 15;
    }

    // User Experience Score für user-centric Use Cases
    const hasUserCentricScenarios = useCase.scenarios.some(
      (s) => s.tags?.includes('user-centric') || s.tags?.includes('ui') || s.tags?.includes('ux'),
    );

    return {
      ...baseExpectations,
      userExperienceScore: hasUserCentricScenarios ? 8.0 : undefined,
    };
  }

  /**
   * Generiert Datenregeln basierend auf Use Case Anforderungen
   */
  private generateDataRules(useCase: UseCase): GeneratedTestProfile['generationRules'] {
    const errorTypes = useCase.testDataRequirements.errorTypes;
    const errorDistribution = errorTypes.reduce(
      (acc, errorType) => {
        acc[errorType] = 1 / errorTypes.length; // Gleichmäßige Verteilung
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      sampleCount: this.calculateSampleCount(useCase.testDataRequirements.dataVolume),
      varianceLevel: this.calculateComplexity(useCase),
      timespan: this.calculateTimespan(useCase.systemRequirements.systemLoad),
      errorDistribution,
      userJourneySimulation: useCase.actors.some((a) => a.role === 'end_user'),
    };
  }

  /**
   * Berechnet erwartete Testdatenmengen
   */
  private calculateTestData(useCase: UseCase): GeneratedTestProfile['testData'] {
    const volumeMultiplier = {
      small: 1,
      medium: 3,
      large: 8,
    }[useCase.testDataRequirements.dataVolume];

    const baseData = {
      logEntries: 1000 * volumeMultiplier,
      problems: 20 * volumeMultiplier,
      metrics: 500 * volumeMultiplier,
      sizeKB: 50 * volumeMultiplier,
    };

    return {
      ...baseData,
      mcpServers: useCase.systemRequirements.mcpServers,
    };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private generateProfileId(useCaseId: string): string {
    return `profile-${useCaseId}-${Date.now()}`;
  }

  private calculateComplexity(useCase: UseCase): 'low' | 'medium' | 'high' {
    const complexityScores = useCase.scenarios.map((s) => {
      const weights = { low: 1, medium: 2, high: 3 };
      return weights[s.complexity];
    });

    const avgScore = complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length;

    if (avgScore >= 2.5) return 'high';
    if (avgScore >= 1.5) return 'medium';
    return 'low';
  }

  private mapScenarioType(scenario: Scenario, useCase: UseCase): string {
    // Mapping basierend auf Tags und Kontext
    if (scenario.tags?.includes('performance')) return 'performance';
    if (scenario.tags?.includes('stress')) return 'stress';
    if (scenario.tags?.includes('integration')) return 'integration';
    if (scenario.tags?.includes('user-journey')) return 'user_journey';
    if (useCase.actors.some((a) => a.role === 'end_user')) return 'user_experience';

    return 'functional'; // Default
  }

  private calculateDuration(complexity: 'low' | 'medium' | 'high'): number {
    const durations = { low: 120, medium: 300, high: 600 };
    return durations[complexity];
  }

  private calculateErrorFrequency(
    complexity: 'low' | 'medium' | 'high',
    problemFreq: 'rare' | 'occasional' | 'frequent',
  ): number {
    const base = { rare: 0.1, occasional: 0.2, frequent: 0.4 }[problemFreq];
    const multiplier = { low: 0.5, medium: 1.0, high: 1.5 }[complexity];
    return Math.min(base * multiplier, 0.8);
  }

  private generateMetricsPattern(systemLoad: 'light' | 'moderate' | 'heavy'): {
    cpuPattern: string;
    memoryPattern: string;
    logPattern: string;
  } {
    const patterns = {
      light: { cpuPattern: 'stable', memoryPattern: 'stable', logPattern: 'minimal' },
      moderate: { cpuPattern: 'variable', memoryPattern: 'growing', logPattern: 'normal' },
      heavy: { cpuPattern: 'spike', memoryPattern: 'growing', logPattern: 'verbose' },
    };

    return patterns[systemLoad];
  }

  private calculateSampleCount(dataVolume: 'small' | 'medium' | 'large'): number {
    const counts = { small: 500, medium: 1500, large: 5000 };
    return counts[dataVolume];
  }

  private calculateTimespan(systemLoad: 'light' | 'moderate' | 'heavy'): string {
    const timespans = { light: '30m', moderate: '1h', heavy: '2h' };
    return timespans[systemLoad];
  }

  /**
   * Speichert das generierte Profil
   */
  private async saveProfile(profile: GeneratedTestProfile): Promise<void> {
    const profilesDir = path.join(this.workspaceDir, 'profiles');
    await fs.mkdir(profilesDir, { recursive: true });

    const filePath = path.join(profilesDir, `${profile.id}.json`);
    await fs.writeFile(filePath, JSON.stringify(profile, null, 2));

    console.log(`💾 Profile saved: ${filePath}`);
  }

  /**
   * Lädt eine Use Case Definition aus einer Datei
   */
  async loadUseCase(filePath: string): Promise<UseCase> {
    const content = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(content);

    try {
      return UseCaseSchema.parse(data);
    } catch (error) {
      throw new Error(`Invalid use case format in ${filePath}: ${error.message}`);
    }
  }

  /**
   * Generiert Testprofile für alle Use Cases in einem Verzeichnis
   */
  async generateProfilesFromDirectory(useCasesDir: string): Promise<GeneratedTestProfile[]> {
    const files = await fs.readdir(useCasesDir);
    const useCaseFiles = files.filter((f) => f.endsWith('.json'));

    const profiles: GeneratedTestProfile[] = [];

    for (const file of useCaseFiles) {
      const filePath = path.join(useCasesDir, file);
      try {
        const useCase = await this.loadUseCase(filePath);
        const profile = await this.generateTestProfile(useCase);
        profiles.push(profile);
      } catch (error) {
        console.error(`❌ Failed to process ${file}: ${error.message}`);
      }
    }

    console.log(
      `✅ Generated ${profiles.length} test profiles from ${useCaseFiles.length} use cases`,
    );
    return profiles;
  }

  /**
   * Generiert Testdaten basierend auf einem Profil
   */
  async generateTestData(profile: GeneratedTestProfile): Promise<void> {
    console.log(`🔧 Generating test data for profile: ${profile.id}`);

    // Testdaten-Generierung würde hier implementiert werden
    // Das könnte Logs, Metriken, Probleme, etc. basierend auf den
    // Profil-Spezifikationen generieren

    const outputDir = path.join(this.workspaceDir, 'output');
    await fs.mkdir(outputDir, { recursive: true });

    const testDataPath = path.join(outputDir, `testdata-${profile.id}.json`);
    const testData = {
      profileId: profile.id,
      generatedAt: new Date().toISOString(),
      data: {
        logEntries: [], // Hier würden echte Logs stehen
        problems: [], // Hier würden echte Probleme stehen
        metrics: [], // Hier würden echte Metriken stehen
      },
    };

    await fs.writeFile(testDataPath, JSON.stringify(testData, null, 2));
    console.log(`💾 Test data generated: ${testDataPath}`);
  }
}

// ============================================================================
// EXPORT DEFAULT INSTANCE
// ============================================================================

export const useCaseToProfileService = new UseCaseToProfileService();
