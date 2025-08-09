/**
 * DSL Composition Controller
 *
 * REST API für die BDD/DSL-basierte Testprofil-Generierung
 */

import { Request, Response } from 'express';
import { BaseController } from './base.controller';
import { moduleCompositionDSLService } from '../services/module-composition-dsl.service';
import { z } from 'zod';

const DSLScenarioSchema = z.object({
  scenarioText: z.string().min(10, 'Scenario text must be at least 10 characters'),
  title: z.string().optional(),
  description: z.string().optional(),
});

const ModuleSearchSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  category: z.enum(['monitoring', 'analysis', 'detection', 'remediation', 'reporting']).optional(),
});

export class DSLCompositionController extends BaseController {
  /**
   * GET /api/dsl/modules
   * Gibt alle verfügbaren Module zurück
   */
  async getAvailableModules(req: Request, res: Response): Promise<void> {
    try {
      const modules = moduleCompositionDSLService.getAvailableModules();

      res.json({
        success: true,
        data: {
          modules,
          total: modules.length,
          categories: this.groupModulesByCategory(modules),
        },
      });
    } catch (error) {
      this.handleDatabaseError(res, error, 'fetch available modules');
    }
  }

  /**
   * POST /api/dsl/modules/search
   * Sucht Module basierend auf Query
   */
  async searchModules(req: Request, res: Response): Promise<void> {
    try {
      const { query, category } = ModuleSearchSchema.parse(req.body);

      let modules = moduleCompositionDSLService.searchModules(query);

      if (category) {
        modules = modules.filter((m) => m.category === category);
      }

      res.json({
        success: true,
        data: {
          query,
          modules,
          total: modules.length,
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        this.handleValidationError(res, 'Invalid search parameters', error.message);
      } else {
        this.handleDatabaseError(res, error, 'search modules');
      }
    }
  }

  /**
   * POST /api/dsl/parse
   * Parst ein BDD/DSL Szenario und zeigt identifizierte Module
   */
  async parseScenario(req: Request, res: Response): Promise<void> {
    try {
      const { scenarioText } = DSLScenarioSchema.parse(req.body);

      // Validiere das Szenario
      const validation = moduleCompositionDSLService.validateScenario(scenarioText);

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Invalid scenario format',
            details: validation.errors,
            warnings: validation.warnings,
          },
        });
        return;
      }

      // Parse das Szenario
      const parsedScenario = moduleCompositionDSLService.parseScenario(scenarioText);

      // Hole Modul-Details
      const moduleDetails = parsedScenario.requiredModules
        .map((moduleId) => {
          return moduleCompositionDSLService.getAvailableModules().find((m) => m.id === moduleId);
        })
        .filter(Boolean);

      res.json({
        success: true,
        data: {
          scenario: parsedScenario,
          moduleDetails,
          validation: {
            valid: validation.valid,
            warnings: validation.warnings,
          },
          estimatedCosts: {
            complexity: parsedScenario.complexity,
            duration: parsedScenario.estimatedDuration,
            moduleCount: parsedScenario.requiredModules.length,
          },
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        this.handleValidationError(res, 'Invalid scenario data', error.message);
      } else {
        this.handleDatabaseError(res, error, 'parse scenario');
      }
    }
  }

  /**
   * POST /api/dsl/generate-profile
   * Generiert ein Testprofil aus einem DSL-Szenario
   */
  async generateTestProfile(req: Request, res: Response): Promise<void> {
    try {
      const { scenarioText, title, description } = DSLScenarioSchema.parse(req.body);

      // Parse das Szenario
      const scenario = moduleCompositionDSLService.parseScenario(scenarioText);

      // Optional: Title und Description überschreiben
      if (title) scenario.title = title;
      if (description) scenario.description = description;

      // Validiere vor der Generierung
      const validation = moduleCompositionDSLService.validateScenario(scenarioText);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: {
            type: 'VALIDATION_ERROR',
            message: 'Cannot generate profile from invalid scenario',
            details: validation.errors,
          },
        });
        return;
      }

      // Generiere das Testprofil
      const profile = await moduleCompositionDSLService.generateTestProfile(scenario);

      res.status(201).json({
        success: true,
        data: {
          profile,
          generationInfo: {
            modulesUsed: scenario.requiredModules.length,
            complexity: scenario.complexity,
            estimatedDuration: scenario.estimatedDuration,
            generatedAt: new Date().toISOString(),
          },
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        this.handleValidationError(res, 'Invalid profile generation data', error.message);
      } else {
        this.handleDatabaseError(res, error, 'generate test profile');
      }
    }
  }

  /**
   * GET /api/dsl/examples
   * Gibt Beispiel-DSL-Szenarien zurück
   */
  async getExampleScenarios(req: Request, res: Response): Promise<void> {
    try {
      const examples = [
        {
          id: 'log-monitoring-basic',
          title: 'Basic Log Monitoring',
          description: 'Einfache Log-Überwachung mit Fehlererkennung',
          scenarioText: `Scenario: Monitor application logs for errors
GIVEN monitoring is active with log file analysis
WHEN error messages are detected in application logs
THEN identify error patterns and create alerts
AND collect performance metrics during error periods`,
          complexity: 'medium',
          expectedModules: ['log-file-monitoring', 'error-detection', 'performance-metrics'],
        },

        {
          id: 'code-analysis-advanced',
          title: 'Advanced Code Analysis',
          description: 'Erweiterte Codeanalyse mit automatischer Korrektur',
          scenarioText: `Scenario: Comprehensive code quality analysis
GIVEN code analysis tools are configured
WHEN static analysis detects quality issues
THEN find corresponding code areas and suggest fixes
AND generate automated remediation proposals
BUT validate fixes before applying them`,
          complexity: 'high',
          expectedModules: ['code-analysis', 'error-detection', 'auto-remediation'],
        },

        {
          id: 'mcp-monitoring',
          title: 'MCP Server Monitoring',
          description: 'Vollständige MCP Server Überwachung',
          scenarioText: `Scenario: Monitor MCP server infrastructure
GIVEN MCP server discovery is active
WHEN new servers are detected on the network
THEN monitor server performance and health
AND correlate problems across multiple servers
AND generate test data for validation scenarios`,
          complexity: 'high',
          expectedModules: [
            'mcp-server-discovery',
            'performance-metrics',
            'problem-correlation',
            'test-data-generation',
          ],
        },

        {
          id: 'simple-monitoring',
          title: 'Simple Performance Monitoring',
          description: 'Einfache Performance-Überwachung',
          scenarioText: `Scenario: Basic performance monitoring
GIVEN performance monitoring is enabled
WHEN system metrics exceed thresholds
THEN generate performance alerts`,
          complexity: 'low',
          expectedModules: ['performance-metrics'],
        },
      ];

      res.json({
        success: true,
        data: {
          examples,
          total: examples.length,
          categories: {
            basic: examples.filter((e) => e.complexity === 'low').length,
            intermediate: examples.filter((e) => e.complexity === 'medium').length,
            advanced: examples.filter((e) => e.complexity === 'high').length,
          },
        },
      });
    } catch (error) {
      this.handleDatabaseError(res, error, 'fetch example scenarios');
    }
  }

  /**
   * POST /api/dsl/validate
   * Validiert ein DSL-Szenario ohne es zu parsen
   */
  async validateScenario(req: Request, res: Response): Promise<void> {
    try {
      const { scenarioText } = DSLScenarioSchema.parse(req.body);

      const validation = moduleCompositionDSLService.validateScenario(scenarioText);

      res.json({
        success: true,
        data: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          suggestions: this.generateValidationSuggestions(validation, scenarioText),
        },
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'ZodError') {
        this.handleValidationError(res, 'Invalid validation request', error.message);
      } else {
        this.handleDatabaseError(res, error, 'validate scenario');
      }
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Gruppiert Module nach Kategorien
   */
  private groupModulesByCategory(modules: any[]) {
    const categories = modules.reduce((acc, module) => {
      if (!acc[module.category]) {
        acc[module.category] = [];
      }
      acc[module.category].push(module);
      return acc;
    }, {});

    return Object.keys(categories).map((category) => ({
      name: category,
      count: categories[category].length,
      modules: categories[category],
    }));
  }

  /**
   * Generiert Verbesserungsvorschläge für die Validierung
   */
  private generateValidationSuggestions(validation: any, scenarioText: string): string[] {
    const suggestions: string[] = [];

    if (validation.errors.includes('No modules could be identified from the scenario text')) {
      suggestions.push(
        'Try using more specific keywords like "monitoring", "analysis", "detection", or "remediation"',
      );
      suggestions.push(
        'Include technical terms like "logs", "errors", "performance", "metrics", or "code"',
      );
    }

    if (validation.warnings.length > 0) {
      suggestions.push('Consider adding the missing dependency modules mentioned in warnings');
    }

    // Prüfe auf häufige Patterns
    const lowerText = scenarioText.toLowerCase();
    if (
      !lowerText.includes('given') &&
      !lowerText.includes('when') &&
      !lowerText.includes('then')
    ) {
      suggestions.push('Use BDD format with GIVEN, WHEN, THEN statements for better parsing');
    }

    return suggestions;
  }
}
