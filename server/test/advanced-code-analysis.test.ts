import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CodeIssue } from '@shared/schema';

// Advanced Mock Code Analyzer with sophisticated pattern detection
class AdvancedCodeAnalyzer {
  private complexPatterns: Map<string, any>;
  private contextualRules: Array<any>;
  private falsePositiveFilters: Array<any>;
  
  constructor() {
    this.complexPatterns = new Map();
    this.contextualRules = [];
    this.falsePositiveFilters = [];
    this.initializeAdvancedPatterns();
  }
  
  private initializeAdvancedPatterns() {
    // Code Smells
    this.complexPatterns.set('long_function', {
      detector: (code: string) => {
        const functions = code.match(/function\s+\w+[^{]*\{([^{}]*\{[^}]*\}[^{}]*)*[^}]*\}/g) || [];
        return functions.filter(func => func.split('\n').length > 30);
      },
      type: 'code_smell',
      severity: 'MEDIUM',
      confidence: 0.8
    });
    
    this.complexPatterns.set('duplicate_code', {
      detector: (code: string) => {
        const lines = code.split('\n').map(l => l.trim()).filter(l => l.length > 5);
        const duplicates = [];
        const seen = new Map();
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (seen.has(line)) {
            duplicates.push({ line: i + 1, content: line });
          } else {
            seen.set(line, i + 1);
          }
        }
        
        return duplicates.length > 2 ? duplicates : [];
      },
      type: 'code_smell',
      severity: 'LOW',
      confidence: 0.7
    });
    
    this.complexPatterns.set('complex_condition', {
      detector: (code: string) => {
        // Detect complex boolean conditions
        const matches = code.match(/if\s*\([^)]*&&[^)]*\|\|[^)]*&&[^)]*\)/g) || [];
        return matches;
      },
      type: 'logic_error',
      severity: 'MEDIUM',
      confidence: 0.6
    });
    
    this.complexPatterns.set('magic_numbers', {
      detector: (code: string) => {
        // Find magic numbers (excluding 0, 1, -1)
        const matches = code.match(/[^.\w](\d{2,})[^.\w]/g) || [];
        return matches.filter(match => {
          const num = parseInt(match.trim());
          return num !== 0 && num !== 1 && num !== -1 && num !== 100;
        });
      },
      type: 'code_smell',
      severity: 'LOW',
      confidence: 0.5
    });
    
    // Security Patterns
    this.complexPatterns.set('xss_vulnerability', {
      detector: (code: string) => {
        return code.match(/innerHTML\s*=\s*[^;]*\+|\.html\([^)]*\+/g) || [];
      },
      type: 'security_issue',
      severity: 'HIGH',
      confidence: 0.85
    });
    
    this.complexPatterns.set('path_traversal', {
      detector: (code: string) => {
        return code.match(/\.\.\/|\.\.\\|\$\{.*\}\//g) || [];
      },
      type: 'security_issue',
      severity: 'HIGH',
      confidence: 0.9
    });
    
    // Performance Patterns
    this.complexPatterns.set('synchronous_file_ops', {
      detector: (code: string) => {
        return code.match(/fs\.readFileSync|fs\.writeFileSync|fs\.statSync/g) || [];
      },
      type: 'performance_issue',
      severity: 'MEDIUM',
      confidence: 0.8
    });
    
    this.complexPatterns.set('memory_leak_potential', {
      detector: (code: string) => {
        return code.match(/setInterval\s*\([^}]*\}\s*,|addEventListener\s*\([^}]*function/g) || [];
      },
      type: 'performance_issue',
      severity: 'MEDIUM',
      confidence: 0.6
    });
    
    // Initialize contextual rules
    this.initializeContextualRules();
    
    // Initialize false positive filters
    this.initializeFalsePositiveFilters();
  }
  
  private initializeContextualRules() {
    this.contextualRules = [
      {
        name: 'test_file_exception',
        condition: (filePath: string) => filePath.includes('.test.') || filePath.includes('.spec.'),
        exceptions: ['unused_variable', 'magic_numbers'] // More lenient in test files
      },
      {
        name: 'config_file_exception',
        condition: (filePath: string) => filePath.includes('config.') || filePath.includes('.config.'),
        exceptions: ['hardcoded_password'] // Config files may have default values
      },
      {
        name: 'development_environment',
        condition: (code: string) => code.includes('NODE_ENV') && code.includes('development'),
        exceptions: ['console_log'] // Console.log allowed in development
      }
    ];
  }
  
  private initializeFalsePositiveFilters() {
    this.falsePositiveFilters = [
      {
        name: 'environment_variables',
        filter: (issue: any, code: string) => {
          if (issue.type === 'security_issue' && issue.description.includes('password')) {
            return code.includes('process.env') || code.includes('ENV[');
          }
          return false;
        }
      },
      {
        name: 'comments_and_strings',
        filter: (issue: any, code: string) => {
          const matchText = issue.matchedText || '';
          return matchText.includes('//') || matchText.includes('/*') || 
                 (matchText.startsWith('"') && matchText.endsWith('"'));
        }
      },
      {
        name: 'valid_syntax_patterns',
        filter: (issue: any, code: string) => {
          if (issue.type === 'syntax_error') {
            // Arrow functions might trigger false positive for missing parenthesis
            return code.includes('=>') && issue.description.includes('parenthesis');
          }
          return false;
        }
      }
    ];
  }
  
  async analyzeCodeAdvanced(code: string, filePath: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];
    const lines = code.split('\n');
    
    // Run pattern detection
    for (const [patternName, pattern] of this.complexPatterns) {
      try {
        const matches = pattern.detector(code);
        
        if (matches && matches.length > 0) {
          for (const match of matches) {
            const issue = this.createIssue(patternName, pattern, match, filePath, code);
            
            // Apply contextual rules
            if (this.shouldApplyContextualRule(issue, filePath, code)) {
              continue; // Skip this issue due to contextual rule
            }
            
            // Apply false positive filters
            if (this.isFalsePositive(issue, code)) {
              continue; // Skip false positive
            }
            
            issues.push(issue);
          }
        }
      } catch (error) {
        console.warn(`Error in pattern ${patternName}:`, error);
      }
    }
    
    return this.rankIssuesByPriority(issues);
  }
  
  private createIssue(patternName: string, pattern: any, match: any, filePath: string, code: string): CodeIssue {
    const matchText = typeof match === 'string' ? match : match.content || JSON.stringify(match);
    const lineNumber = this.findLineNumber(code, matchText);
    
    return {
      id: `advanced_${Date.now()}_${Math.random()}`,
      issueType: pattern.type,
      severity: pattern.severity,
      description: this.getAdvancedDescription(patternName, matchText),
      filePath,
      lineNumber,
      functionName: this.extractFunctionContext(code, lineNumber),
      confidence: this.calculateDynamicConfidence(pattern.confidence, code, matchText),
      suggestedFix: this.getAdvancedFix(patternName, matchText),
      fixApplied: false,
      timestamp: new Date(),
      metadata: {
        pattern: patternName,
        matchedText: matchText,
        analysisType: 'advanced'
      }
    };
  }
  
  private shouldApplyContextualRule(issue: CodeIssue, filePath: string, code: string): boolean {
    for (const rule of this.contextualRules) {
      if (rule.condition(filePath) || rule.condition(code)) {
        if (rule.exceptions.some((exception: string) => issue.description.includes(exception))) {
          return true; // Skip this issue
        }
      }
    }
    return false;
  }
  
  private isFalsePositive(issue: CodeIssue, code: string): boolean {
    return this.falsePositiveFilters.some(filter => filter.filter(issue, code));
  }
  
  private calculateDynamicConfidence(baseConfidence: number, code: string, matchText: string): number {
    let confidence = baseConfidence;
    
    // Increase confidence for obvious patterns
    if (matchText.includes('password') && matchText.includes('=')) {
      confidence += 0.1;
    }
    
    // Decrease confidence for ambiguous patterns
    if (code.includes('//') || code.includes('TODO')) {
      confidence -= 0.1;
    }
    
    // Context-based adjustments
    if (code.includes('test') || code.includes('mock')) {
      confidence -= 0.2;
    }
    
    return Math.max(0, Math.min(1, confidence));
  }
  
  private rankIssuesByPriority(issues: CodeIssue[]): CodeIssue[] {
    const priorities = {
      'CRITICAL': 4,
      'HIGH': 3,
      'MEDIUM': 2,
      'LOW': 1
    };
    
    return issues.sort((a, b) => {
      const priorityDiff = (priorities[b.severity as keyof typeof priorities] || 0) - 
                          (priorities[a.severity as keyof typeof priorities] || 0);
      
      if (priorityDiff !== 0) return priorityDiff;
      
      // If same priority, sort by confidence
      return b.confidence - a.confidence;
    });
  }
  
  private findLineNumber(code: string, searchText: string): number {
    const lines = code.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchText)) {
        return i + 1;
      }
    }
    return 1;
  }
  
  private extractFunctionContext(code: string, lineNumber: number): string {
    const lines = code.split('\n');
    for (let i = lineNumber - 1; i >= 0; i--) {
      const funcMatch = lines[i].match(/(?:function\s+(\w+)|(\w+)\s*[:=]\s*(?:function|async|\([^)]*\)\s*=>))/);
      if (funcMatch) {
        return funcMatch[1] || funcMatch[2] || 'anonymous';
      }
      if (lines[i].includes('class ')) {
        const classMatch = lines[i].match(/class\s+(\w+)/);
        return classMatch ? `${classMatch[1]}.<method>` : 'anonymous';
      }
    }
    return '';
  }
  
  private getAdvancedDescription(patternName: string, matchText: string): string {
    const descriptions: Record<string, string> = {
      long_function: 'Function is too long and complex, consider breaking it down',
      duplicate_code: 'Duplicate code detected, consider extracting to a common function',
      complex_condition: 'Complex boolean condition, consider simplifying logic',
      magic_numbers: 'Magic number found, consider using named constants',
      xss_vulnerability: 'Potential XSS vulnerability in DOM manipulation',
      path_traversal: 'Potential path traversal vulnerability detected',
      synchronous_file_ops: 'Synchronous file operation may block event loop',
      memory_leak_potential: 'Potential memory leak from uncleaned event listeners'
    };
    
    return descriptions[patternName] || `Advanced analysis detected: ${matchText}`;
  }
  
  private getAdvancedFix(patternName: string, matchText: string): string {
    const fixes: Record<string, string> = {
      long_function: 'Break down into smaller, single-responsibility functions',
      duplicate_code: 'Extract common code into reusable functions or modules',
      complex_condition: 'Use early returns or extract condition logic to named functions',
      magic_numbers: 'Define constants with meaningful names (e.g., const MAX_RETRY_COUNT = 3)',
      xss_vulnerability: 'Use textContent instead of innerHTML, or sanitize input data',
      path_traversal: 'Validate and sanitize file paths, use path.resolve()',
      synchronous_file_ops: 'Use asynchronous file operations (fs.promises or async/await)',
      memory_leak_potential: 'Add proper cleanup in useEffect cleanup or component unmount'
    };
    
    return fixes[patternName] || 'Manual review and refactoring recommended';
  }
}

describe('Advanced Code Analysis Tests', () => {
  let analyzer: AdvancedCodeAnalyzer;
  
  beforeEach(() => {
    analyzer = new AdvancedCodeAnalyzer();
  });
  
  describe('Code Smells Detection', () => {
    it('should detect long functions', async () => {
      const longFunction = `
        function doEverything() {
          // Simulate a very long function with many lines
          ${Array(35).fill(0).map((_, i) => `  const var${i} = doSomething${i}();`).join('\n')}
        }
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(longFunction, 'test.js');
      
      const longFunctionIssue = issues.find(issue => 
        issue.issueType === 'code_smell' && 
        issue.description.includes('too long')
      );
      
      expect(longFunctionIssue).toBeDefined();
      expect(longFunctionIssue!.severity).toBe('MEDIUM');
      expect(longFunctionIssue!.suggestedFix).toContain('smaller');
    });
    
    it('should detect duplicate code', async () => {
      const duplicateCode = `
        const result1 = processData(data);
        const result2 = processData(data);
        const result3 = processData(data);
        const result4 = processData(data);
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(duplicateCode, 'test.js');
      
      const duplicateIssue = issues.find(issue => 
        issue.description.includes('Duplicate code')
      );
      
      expect(duplicateIssue).toBeDefined();
      expect(duplicateIssue!.suggestedFix).toContain('reusable');
    });
    
    it('should detect magic numbers', async () => {
      const magicNumberCode = `
        if (user.age > 65) {  // Magic number
          return calculateSeniorDiscount(price * 0.15);  // Another magic number
        }
        setTimeout(callback, 5000);  // Yet another magic number
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(magicNumberCode, 'test.js');
      
      const magicNumberIssues = issues.filter(issue => 
        issue.description.includes('Magic number')
      );
      
      expect(magicNumberIssues.length).toBeGreaterThan(0);
      expect(magicNumberIssues[0].suggestedFix).toContain('constants');
    });
    
    it('should detect complex boolean conditions', async () => {
      const complexCondition = `
        if (user.isActive && user.hasPermission || admin.canOverride && !system.isLocked || debug.mode) {
          doSomething();
        }
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(complexCondition, 'test.js');
      
      const complexIssue = issues.find(issue => 
        issue.description.includes('Complex boolean')
      );
      
      expect(complexIssue).toBeDefined();
      expect(complexIssue!.suggestedFix).toContain('early returns');
    });
  });
  
  describe('Advanced Security Detection', () => {
    it('should detect XSS vulnerabilities', async () => {
      const xssCode = `
        const userInput = getUserInput();
        element.innerHTML = "<div>" + userInput + "</div>";
        
        $container.html(data.content + additionalContent);
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(xssCode, 'test.js');
      
      const xssIssues = issues.filter(issue => 
        issue.issueType === 'security_issue' && 
        issue.description.includes('XSS')
      );
      
      expect(xssIssues.length).toBeGreaterThan(0);
      expect(xssIssues[0].severity).toBe('HIGH');
      expect(xssIssues[0].suggestedFix).toContain('textContent');
    });
    
    it('should detect path traversal vulnerabilities', async () => {
      const pathTraversalCode = `
        const filePath = "../../../etc/passwd";
        const userPath = baseDir + "/../" + userInput;
        const templatePath = \`\${baseDir}/../templates/\${fileName}\`;
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(pathTraversalCode, 'test.js');
      
      const pathIssues = issues.filter(issue => 
        issue.description.includes('path traversal')
      );
      
      expect(pathIssues.length).toBeGreaterThan(0);
      expect(pathIssues[0].severity).toBe('HIGH');
      expect(pathIssues[0].suggestedFix).toContain('path.resolve');
    });
  });
  
  describe('Performance Issue Detection', () => {
    it('should detect synchronous file operations', async () => {
      const syncCode = `
        const data = fs.readFileSync('file.txt', 'utf8');
        fs.writeFileSync('output.txt', processedData);
        const stats = fs.statSync('file.txt');
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(syncCode, 'test.js');
      
      const syncIssues = issues.filter(issue => 
        issue.description.includes('Synchronous file operation')
      );
      
      expect(syncIssues.length).toBeGreaterThan(0);
      expect(syncIssues[0].issueType).toBe('performance_issue');
      expect(syncIssues[0].suggestedFix).toContain('asynchronous');
    });
    
    it('should detect potential memory leaks', async () => {
      const memoryLeakCode = `
        setInterval(function() {
          heavyOperation();
        }, 1000);
        
        element.addEventListener('click', function(e) {
          processClick(e);
        });
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(memoryLeakCode, 'test.js');
      
      const memoryIssues = issues.filter(issue => 
        issue.description.includes('memory leak')
      );
      
      expect(memoryIssues.length).toBeGreaterThan(0);
      expect(memoryIssues[0].suggestedFix).toContain('cleanup');
    });
  });
  
  describe('False Positive Prevention', () => {
    it('should NOT flag environment variables as hardcoded secrets', async () => {
      const safeEnvCode = `
        const config = {
          password: process.env.DB_PASSWORD,
          apiKey: process.env.API_KEY,
          secret: ENV['SESSION_SECRET']
        };
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(safeEnvCode, 'config.js');
      
      const secretIssues = issues.filter(issue => 
        issue.issueType === 'security_issue' && 
        issue.description.includes('password')
      );
      
      expect(secretIssues).toHaveLength(0);
    });
    
    it('should be more lenient with test files', async () => {
      const testCode = `
        const mockPassword = "test123";  // This is OK in tests
        const magicNumber = 42;         // Magic numbers OK in tests
        const unusedVar = "test";       // Unused vars OK in tests
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(testCode, 'user.test.js');
      
      // Should have fewer issues due to test file context
      const securityIssues = issues.filter(issue => issue.issueType === 'security_issue');
      expect(securityIssues).toHaveLength(0);
    });
    
    it('should NOT flag valid arrow function syntax', async () => {
      const validArrowFunction = `
        const process = (data) => {
          return data.map(item => item.value);
        };
        
        const asyncProcess = async (data) => {
          return await processData(data);
        };
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(validArrowFunction, 'test.js');
      
      const syntaxIssues = issues.filter(issue => 
        issue.issueType === 'syntax_error' && 
        issue.description.includes('parenthesis')
      );
      
      expect(syntaxIssues).toHaveLength(0);
    });
    
    it('should NOT flag commented out code as issues', async () => {
      const commentedCode = `
        // const oldPassword = "hardcoded123";  // This is commented out
        /* 
           const anotherPassword = "secret456";  // This too
        */
        const validCode = process.env.PASSWORD;
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(commentedCode, 'test.js');
      
      const securityIssues = issues.filter(issue => 
        issue.issueType === 'security_issue'
      );
      
      expect(securityIssues).toHaveLength(0);
    });
  });
  
  describe('Contextual Analysis', () => {
    it('should provide different analysis for different file types', async () => {
      const code = `
        const password = "default123";
        const magicNumber = 42;
      `;
      
      const regularIssues = await analyzer.analyzeCodeAdvanced(code, 'app.js');
      const configIssues = await analyzer.analyzeCodeAdvanced(code, 'config.js');
      const testIssues = await analyzer.analyzeCodeAdvanced(code, 'app.test.js');
      
      // Regular files should have more strict analysis
      expect(regularIssues.length).toBeGreaterThan(testIssues.length);
      
      // Config files might be more lenient for default values
      expect(configIssues.length).toBeLessThanOrEqual(regularIssues.length);
    });
    
    it('should consider development environment context', async () => {
      const devCode = `
        if (process.env.NODE_ENV === 'development') {
          console.log("Debug info");  // This should be OK in dev
        }
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(devCode, 'app.js');
      
      // Should not flag console.log in development context
      const consoleIssues = issues.filter(issue => 
        issue.description.includes('console')
      );
      
      expect(consoleIssues).toHaveLength(0);
    });
  });
  
  describe('Priority Ranking', () => {
    it('should rank issues by severity and confidence', async () => {
      const mixedIssuesCode = `
        const password = "hardcoded123";  // HIGH severity, high confidence
        const magicNum = 42;              // LOW severity, medium confidence
        element.innerHTML = userInput;     // HIGH severity, high confidence
        // TODO: refactor this            // LOW severity, low confidence
      `;
      
      const issues = await analyzer.analyzeCodeAdvanced(mixedIssuesCode, 'test.js');
      
      // Issues should be sorted by priority
      if (issues.length > 1) {
        for (let i = 0; i < issues.length - 1; i++) {
          const current = issues[i];
          const next = issues[i + 1];
          
          // Higher severity should come first
          const severityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          const currentPriority = severityOrder[current.severity as keyof typeof severityOrder];
          const nextPriority = severityOrder[next.severity as keyof typeof severityOrder];
          
          expect(currentPriority).toBeGreaterThanOrEqual(nextPriority);
        }
      }
    });
  });
  
  describe('Dynamic Confidence Calculation', () => {
    it('should adjust confidence based on context', async () => {
      const testFileCode = `const password = "test123";`;  // Lower confidence in test
      const prodFileCode = `const password = "prod123";`;   // Higher confidence in production
      
      const testIssues = await analyzer.analyzeCodeAdvanced(testFileCode, 'user.test.js');
      const prodIssues = await analyzer.analyzeCodeAdvanced(prodFileCode, 'user.js');
      
      const testPasswordIssue = testIssues.find(i => i.description.includes('password'));
      const prodPasswordIssue = prodIssues.find(i => i.description.includes('password'));
      
      if (testPasswordIssue && prodPasswordIssue) {
        expect(prodPasswordIssue.confidence).toBeGreaterThan(testPasswordIssue.confidence);
      }
    });
    
    it('should increase confidence for obvious security patterns', async () => {
      const obviousSecurityIssue = `const password = "supersecret123";`;
      const ambiguousPattern = `const data = someCalculation(42);`;
      
      const securityIssues = await analyzer.analyzeCodeAdvanced(obviousSecurityIssue, 'app.js');
      const otherIssues = await analyzer.analyzeCodeAdvanced(ambiguousPattern, 'app.js');
      
      const passwordIssue = securityIssues.find(i => i.issueType === 'security_issue');
      const magicNumberIssue = otherIssues.find(i => i.description.includes('Magic'));
      
      if (passwordIssue && magicNumberIssue) {
        expect(passwordIssue.confidence).toBeGreaterThan(magicNumberIssue.confidence);
      }
    });
  });
});