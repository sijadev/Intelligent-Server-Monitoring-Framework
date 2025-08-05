import { Request, Response } from 'express';
import { getTestManagerService } from '../services/test-manager.service';
import type { TestManagerService } from '../services/test-manager.service';

export class TestManagerController {
  private testManagerService: TestManagerService;

  constructor() {
    try {
      this.testManagerService = getTestManagerService();
    } catch (error) {
      console.warn('Test Manager Service not available:', error.message);
      this.testManagerService = null;
    }
  }

  private checkServiceAvailable(res: Response): boolean {
    if (!this.testManagerService) {
      console.log('❌ Test Manager Service not available');
      res.status(503).json({
        error: 'Test Manager Service not available',
        message: 'Test Manager Service is not initialized or not available'
      });
      return false;
    }
    return true;
  }

  // Profile Management
  async getProfiles(req: Request, res: Response) {
    if (!this.checkServiceAvailable(res)) return;

    try {
      const profiles = await this.testManagerService.getProfiles();
      res.json({ profiles });
    } catch (error) {
      console.error('Error fetching profiles:', error);
      res.status(500).json({ 
        error: 'Failed to fetch profiles',
        message: error.message 
      });
    }
  }

  async getProfile(req: Request, res: Response) {
    if (!this.checkServiceAvailable(res)) return;

    try {
      const { profileId } = req.params;
      const profile = await this.testManagerService.getProfile(profileId);
      
      if (!profile) {
        return res.status(404).json({ 
          error: 'Profile not found',
          profileId 
        });
      }

      res.json({ profile });
    } catch (error) {
      console.error('Error fetching profile:', error);
      res.status(500).json({ 
        error: 'Failed to fetch profile',
        message: error.message 
      });
    }
  }

  async createProfile(req: Request, res: Response) {
    if (!this.checkServiceAvailable(res)) return;

    try {
      console.log('📝 Creating profile with data:', JSON.stringify(req.body, null, 2));
      const profileData = req.body;
      const profile = await this.testManagerService.createProfile(profileData);
      
      console.log('✅ Profile created successfully:', profile.id);
      const response = { 
        profile,
        message: 'Profile created successfully' 
      };
      
      console.log('📤 Sending response:', JSON.stringify(response, null, 2));
      res.status(201).json(response);
    } catch (error) {
      console.error('❌ Error creating profile:', error);
      const errorResponse = { 
        error: 'Failed to create profile',
        message: error.message 
      };
      console.log('📤 Sending error response:', JSON.stringify(errorResponse, null, 2));
      res.status(500).json(errorResponse);
    }
  }

  async updateProfile(req: Request, res: Response) {
    if (!this.checkServiceAvailable(res)) return;

    try {
      const { profileId } = req.params;
      const updates = req.body;
      
      const profile = await this.testManagerService.updateProfile(profileId, updates);
      
      res.json({ 
        profile,
        message: 'Profile updated successfully' 
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      
      if (error.message.includes('not found')) {
        return res.status(404).json({ 
          error: 'Profile not found',
          profileId: req.params.profileId 
        });
      }

      res.status(500).json({ 
        error: 'Failed to update profile',
        message: error.message 
      });
    }
  }

  async deleteProfile(req: Request, res: Response) {
    if (!this.checkServiceAvailable(res)) return;

    try {
      const { profileId } = req.params;
      const deleted = await this.testManagerService.deleteProfile(profileId);
      
      if (!deleted) {
        return res.status(404).json({ 
          error: 'Profile not found',
          profileId 
        });
      }

      res.json({ 
        message: 'Profile deleted successfully',
        profileId 
      });
    } catch (error) {
      console.error('Error deleting profile:', error);
      res.status(500).json({ 
        error: 'Failed to delete profile',
        message: error.message 
      });
    }
  }

  // Test Data Generation
  async generateTestData(req: Request, res: Response) {
    if (!this.checkServiceAvailable(res)) return;

    try {
      const { profileId } = req.params;
      
      // Verify profile exists
      const profile = await this.testManagerService.getProfile(profileId);
      if (!profile) {
        return res.status(404).json({ 
          error: 'Profile not found',
          profileId 
        });
      }

      // Start generation (this is async and may take time)
      const result = await this.testManagerService.generateTestData(profileId);
      
      res.json({ 
        result,
        message: 'Test data generated successfully' 
      });
    } catch (error) {
      console.error('Error generating test data:', error);
      
      if (error.message.includes('Maximum concurrent generations')) {
        return res.status(429).json({ 
          error: 'Too many concurrent generations',
          message: error.message 
        });
      }

      if (error.message.includes('timeout')) {
        return res.status(408).json({ 
          error: 'Generation timeout',
          message: error.message 
        });
      }

      res.status(500).json({ 
        error: 'Failed to generate test data',
        message: error.message 
      });
    }
  }

  async getGeneratedData(req: Request, res: Response) {
    if (!this.checkServiceAvailable(res)) return;

    try {
      const { profileId } = req.query;
      const data = await this.testManagerService.getGeneratedData(profileId as string);
      
      res.json({ 
        data,
        count: data.length 
      });
    } catch (error) {
      console.error('Error fetching generated data:', error);
      res.status(500).json({ 
        error: 'Failed to fetch generated data',
        message: error.message 
      });
    }
  }

  // Status and Monitoring
  async getStatus(req: Request, res: Response) {
    if (!this.checkServiceAvailable(res)) return;

    try {
      const status = this.testManagerService.getStatus();
      res.json({ status });
    } catch (error) {
      console.error('Error fetching test manager status:', error);
      res.status(500).json({ 
        error: 'Failed to fetch status',
        message: error.message 
      });
    }
  }

  async getHealthCheck(req: Request, res: Response) {
    if (!this.checkServiceAvailable(res)) return;

    try {
      const health = this.testManagerService.getHealthStatus();
      const statusCode = health.healthy ? 200 : 503;
      
      res.status(statusCode).json({ health });
    } catch (error) {
      console.error('Error checking test manager health:', error);
      res.status(503).json({ 
        health: {
          healthy: false,
          error: error.message
        }
      });
    }
  }

  // Utility endpoints
  async getProfileTemplates(req: Request, res: Response) {
    try {
      const templates = [
        {
          id: 'performance-basic',
          name: 'Basic Performance Testing',
          description: 'Standard performance testing with CPU and memory monitoring',
          template: {
            sourceConfig: {
              directories: ['./src'],
              languages: ['typescript', 'javascript'],
              complexity: 'medium'
            },
            scenarios: [{
              id: 'perf-scenario',
              name: 'Performance Test Scenario',
              type: 'performance',
              duration: 300,
              problemTypes: ['memory_leak', 'cpu_spike', 'api_timeout'],
              metrics: {
                cpuPattern: 'spike',
                memoryPattern: 'leak',
                logPattern: 'error'
              }
            }],
            expectations: {
              detectionRate: 85,
              fixSuccessRate: 70,
              falsePositiveRate: 15,
              mlAccuracy: 80
            }
          }
        },
        {
          id: 'security-basic',
          name: 'Basic Security Testing',
          description: 'Security vulnerability detection and testing',
          template: {
            sourceConfig: {
              directories: ['./src'],
              languages: ['typescript', 'javascript'],
              complexity: 'high'
            },
            scenarios: [{
              id: 'security-scenario',
              name: 'Security Test Scenario',
              type: 'security',
              duration: 600,
              problemTypes: ['security_vulnerability', 'sql_injection', 'xss'],
              metrics: {
                cpuPattern: 'stable',
                memoryPattern: 'stable',
                logPattern: 'security'
              }
            }],
            expectations: {
              detectionRate: 90,
              fixSuccessRate: 60,
              falsePositiveRate: 10,
              mlAccuracy: 85
            }
          }
        },
        {
          id: 'ml-training',
          name: 'ML Training Data Generation',
          description: 'Comprehensive data generation for ML model training',
          template: {
            sourceConfig: {
              directories: ['./src'],
              languages: ['typescript', 'javascript', 'python'],
              complexity: 'high'
            },
            scenarios: [{
              id: 'ml-scenario',
              name: 'ML Training Scenario',
              type: 'ml-training',
              duration: 900,
              problemTypes: ['null_pointer', 'memory_leak', 'api_timeout', 'logic_error', 'security_vulnerability'],
              metrics: {
                cpuPattern: 'mixed',
                memoryPattern: 'mixed',
                logPattern: 'mixed'
              }
            }],
            expectations: {
              detectionRate: 80,
              fixSuccessRate: 75,
              falsePositiveRate: 20,
              mlAccuracy: 85
            },
            generationRules: {
              sampleCount: 5000,
              varianceLevel: 'high',
              timespan: '2h'
            }
          }
        }
      ];

      res.json({ templates });
    } catch (error) {
      console.error('Error fetching profile templates:', error);
      res.status(500).json({ 
        error: 'Failed to fetch templates',
        message: error.message 
      });
    }
  }

  async getProblemTypes(req: Request, res: Response) {
    try {
      const problemTypes = [
        {
          id: 'null_pointer',
          name: 'Null Pointer',
          description: 'Null pointer dereference errors',
          severity: 'high',
          languages: ['typescript', 'javascript']
        },
        {
          id: 'memory_leak',
          name: 'Memory Leak',
          description: 'Memory leaks and resource management issues',
          severity: 'critical',
          languages: ['typescript', 'javascript', 'python']
        },
        {
          id: 'api_timeout',
          name: 'API Timeout',
          description: 'API request timeout and connectivity issues',
          severity: 'medium',
          languages: ['typescript', 'javascript', 'python']
        },
        {
          id: 'logic_error',
          name: 'Logic Error',
          description: 'Business logic and algorithmic errors',
          severity: 'medium',
          languages: ['typescript', 'javascript', 'python']
        },
        {
          id: 'security_vulnerability',
          name: 'Security Vulnerability',
          description: 'Security vulnerabilities and attack vectors',
          severity: 'critical',
          languages: ['typescript', 'javascript', 'python']
        },
        {
          id: 'performance_issue',
          name: 'Performance Issue',
          description: 'Performance bottlenecks and inefficiencies',
          severity: 'medium',
          languages: ['typescript', 'javascript', 'python']
        },
        {
          id: 'type_mismatch',
          name: 'Type Mismatch',
          description: 'Type system violations and mismatches',
          severity: 'medium',
          languages: ['typescript']
        },
        {
          id: 'syntax_error',
          name: 'Syntax Error',
          description: 'Syntax and parsing errors',
          severity: 'high',
          languages: ['typescript', 'javascript', 'python']
        }
      ];

      res.json({ problemTypes });
    } catch (error) {
      console.error('Error fetching problem types:', error);
      res.status(500).json({ 
        error: 'Failed to fetch problem types',
        message: error.message 
      });
    }
  }
}