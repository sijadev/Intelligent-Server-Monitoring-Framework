import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertCircle, Plus, Play, Download, Settings, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface TestProfile {
  id: string;
  name: string;
  version: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  sourceConfig: {
    directories: string[];
    languages: string[];
    complexity: 'low' | 'medium' | 'high';
    excludePatterns: string[];
  };
  scenarios: TestScenario[];
  expectations: {
    detectionRate: number;
    fixSuccessRate: number;
    falsePositiveRate: number;
    mlAccuracy: number;
  };
  generationRules: {
    sampleCount: number;
    varianceLevel: string;
    timespan: string;
    errorDistribution: Record<string, number>;
  };
}

interface TestScenario {
  id: string;
  name: string;
  type: string;
  duration: number;
  enabled: boolean;
  problemTypes: string[];
  codeInjection: {
    errorTypes: string[];
    frequency: number;
    complexity: string;
  };
  metrics: {
    cpuPattern: string;
    memoryPattern: string;
    logPattern: string;
  };
}

interface TestDataResult {
  profileId: string;
  generatedAt: string;
  generationDuration: number;
  data: {
    logFiles: any[];
    metricStreams: any[];
    codeProblems: any[];
    scenarios: any[];
  };
  statistics: {
    totalLogEntries: number;
    totalMetricPoints: number;
    totalCodeProblems: number;
    dataSize: number;
  };
  metadata: {
    generatorVersion: string;
    profile: TestProfile;
    outputPath: string;
    totalSamples: number;
  };
}

interface ProblemType {
  id: string;
  name: string;
  description: string;
  severity: string;
  languages: string[];
}

interface ProfileTemplate {
  id: string;
  name: string;
  description: string;
  template: Partial<TestProfile>;
}

export default function TestManager() {
  usePageTitle("Test Manager");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProfile, setSelectedProfile] = useState<TestProfile | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Fetch test profiles
  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['/api/test-manager/profiles'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching test manager profiles...');
        const response = await api.testManagerGet('/test-manager/profiles');
        console.log('📋 Profiles response:', response);
        return response.profiles || response || [];
      } catch (error) {
        console.error('❌ Profiles fetch error:', error);
        return [];
      }
    },
  });

  // Fetch generated data
  const { data: generatedData = [] } = useQuery({
    queryKey: ['/api/test-manager/generated-data'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching test manager generated data...');
        const response = await api.testManagerGet('/test-manager/generated-data');
        console.log('📊 Generated data response:', response);
        return response.data || response || [];
      } catch (error) {
        console.error('❌ Generated data fetch error:', error);
        return [];
      }
    },
  });

  // Fetch problem types
  const { data: problemTypes = [] } = useQuery({
    queryKey: ['/api/test-manager/problem-types'],
    queryFn: () => api.testManagerGet('/test-manager/problem-types').then(res => res.problemTypes),
  });

  // Fetch profile templates
  const { data: templates = [] } = useQuery({
    queryKey: ['/api/test-manager/templates'],
    queryFn: () => api.testManagerGet('/test-manager/templates').then(res => res.templates),
  });

  // Fetch test manager status
  const { data: status } = useQuery({
    queryKey: ['/api/test-manager/status'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching test manager status...');
        const response = await api.testManagerGet('/test-manager/status');
        console.log('📊 Status response:', response);
        return response.status || response;
      } catch (error) {
        console.error('❌ Status fetch error:', error);
        return { initialized: false, active: false, activeGenerations: [], generationCapacity: 0 };
      }
    },
    refetchInterval: 5000,
  });

  // Create profile mutation
  const createProfileMutation = useMutation({
    mutationFn: async (profileData: Partial<TestProfile>) => {
      console.log('🔥 Using dedicated createTestProfile method');
      return await api.createTestProfile(profileData);
    },
    onSuccess: (data) => {
      console.log('Profile created successfully:', data);
      queryClient.invalidateQueries({ queryKey: ['/api/test-manager/profiles'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Profile Created",
        description: "Test profile has been created successfully.",
      });
    },
    onError: (error: any) => {
      console.error('Profile creation error:', error);
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to create profile.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Generate test data mutation
  const generateDataMutation = useMutation({
    mutationFn: (profileId: string) => 
      api.testManagerPost(`/test-manager/profiles/${profileId}/generate`),
    onSuccess: (_data, profileId) => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-manager/generated-data'] });
      setIsGenerating(null);
      toast({
        title: "Generation Complete",
        description: `Test data generated successfully for profile ${profileId}.`,
      });
    },
    onError: (error: any, profileId) => {
      setIsGenerating(null);
      toast({
        title: "Generation Failed",
        description: error.message || `Failed to generate test data for profile ${profileId}.`,
        variant: "destructive",
      });
    },
  });

  // Delete profile mutation
  const deleteProfileMutation = useMutation({
    mutationFn: (profileId: string) => 
      api.testManagerDelete(`/test-manager/profiles/${profileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/test-manager/profiles'] });
      setSelectedProfile(null);
      toast({
        title: "Profile Deleted",
        description: "Test profile has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete profile.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateData = (profileId: string) => {
    setIsGenerating(profileId);
    generateDataMutation.mutate(profileId);
  };

  const handleCreateFromTemplate = (template: ProfileTemplate) => {
    const profileData = {
      name: template.name,
      description: template.description,
      ...template.template
    };
    createProfileMutation.mutate(profileData);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  if (profilesLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading test manager...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="Test Manager"
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: ['/api/test-manager/profiles'] });
          queryClient.invalidateQueries({ queryKey: ['/api/test-manager/generated-data'] });
        }}
      />
      
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profiles</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{profiles.length}</div>
                <p className="text-xs text-muted-foreground">
                  Test configurations
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Generated Datasets</CardTitle>
                <Download className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{generatedData.length}</div>
                <p className="text-xs text-muted-foreground">
                  Available datasets
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Generations</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {status?.activeGenerations?.length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Currently running
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Capacity</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {status?.generationCapacity || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Free slots
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="profiles" className="space-y-4">
            <TabsList>
              <TabsTrigger value="profiles">Test Profiles</TabsTrigger>
              <TabsTrigger value="data">Generated Data</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="profiles" className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold">Test Profiles</h2>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Profile
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Create Test Profile</DialogTitle>
                      <DialogDescription>
                        Create a new test profile for data generation
                      </DialogDescription>
                    </DialogHeader>
                    <CreateProfileForm 
                      onSubmit={(data) => createProfileMutation.mutate(data)}
                      problemTypes={problemTypes}
                      isLoading={createProfileMutation.status === 'pending'}
                    />
                  </DialogContent>
                </Dialog>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {profiles.map((profile: TestProfile) => (
                  <Card key={profile.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">{profile.name}</CardTitle>
                          <CardDescription className="mt-1">
                            {profile.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline">
                          {profile.sourceConfig.complexity}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">
                          <strong>Languages:</strong> {profile.sourceConfig.languages.join(', ')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Scenarios:</strong> {profile.scenarios.length}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <strong>Created:</strong> {new Date(profile.createdAt).toLocaleDateString()}
                        </div>
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={() => handleGenerateData(profile.id)}
                            disabled={isGenerating === profile.id}
                          >
                            {isGenerating === profile.id ? (
                              <>
                                <Clock className="h-3 w-3 mr-1 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3 mr-1" />
                                Generate
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedProfile(profile)}
                          >
                            View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="data" className="space-y-4">
              <h2 className="text-lg font-semibold">Generated Test Data</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {generatedData.map((data: TestDataResult, index: number) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-base">
                            Dataset for {data.metadata?.profile?.name || data.profileId}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Generated {new Date(data.generatedAt).toLocaleString()}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="bg-green-50">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-medium">Log Entries</div>
                          <div className="text-muted-foreground">
                            {data.statistics.totalLogEntries.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Metric Points</div>
                          <div className="text-muted-foreground">
                            {data.statistics.totalMetricPoints.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Code Problems</div>
                          <div className="text-muted-foreground">
                            {data.statistics.totalCodeProblems.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Data Size</div>
                          <div className="text-muted-foreground">
                            {formatFileSize(data.statistics.dataSize)}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Generation Time</div>
                          <div className="text-muted-foreground">
                            {formatDuration(data.generationDuration)}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium">Samples</div>
                          <div className="text-muted-foreground">
                            {data.metadata.totalSamples?.toLocaleString() || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4">
                        <Button size="sm" variant="outline" className="w-full">
                          <Download className="h-3 w-3 mr-1" />
                          Export Dataset
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <h2 className="text-lg font-semibold">Profile Templates</h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {templates.map((template: ProfileTemplate) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button 
                        onClick={() => handleCreateFromTemplate(template)}
                        disabled={createProfileMutation.status === 'pending'}
                        className="w-full"
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Profile Detail Dialog */}
          {selectedProfile && (
            <Dialog open={!!selectedProfile} onOpenChange={() => setSelectedProfile(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedProfile.name}</DialogTitle>
                  <DialogDescription>{selectedProfile.description}</DialogDescription>
                </DialogHeader>
                <ProfileDetails 
                  profile={selectedProfile} 
                  onDelete={() => deleteProfileMutation.mutate(selectedProfile.id)}
                  onGenerate={() => handleGenerateData(selectedProfile.id)}
                  isDeleting={deleteProfileMutation.status === 'pending'}
                  isGenerating={isGenerating === selectedProfile.id}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </main>
    </div>
  );
}

// Create Profile Form Component
function CreateProfileForm({ 
  onSubmit, 
  problemTypes, 
  isLoading 
}: { 
  onSubmit: (data: any) => void; 
  problemTypes: ProblemType[]; 
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sourceConfig: {
      directories: ['./src'],
      languages: ['typescript', 'javascript'],
      complexity: 'medium' as 'low' | 'medium' | 'high',
    },
    problemTypes: ['null_pointer', 'memory_leak', 'api_timeout'],
    expectations: {
      detectionRate: 85,
      fixSuccessRate: 70,
      falsePositiveRate: 15,
      mlAccuracy: 80
    }
  });

  const handleLanguageChange = (language: string, checked: boolean | string) => {
    const isChecked = checked === true || checked === "true";
    console.log('Language change:', language, 'checked:', isChecked);
    
    setFormData(prev => ({
      ...prev,
      sourceConfig: {
        ...prev.sourceConfig,
        languages: isChecked 
          ? [...prev.sourceConfig.languages.filter(l => l !== language), language]
          : prev.sourceConfig.languages.filter(l => l !== language)
      }
    }));
  };

  const handleProblemTypeChange = (problemType: string, checked: boolean | string) => {
    const isChecked = checked === true || checked === "true";
    console.log('Problem type change:', problemType, 'checked:', isChecked);
    
    setFormData(prev => ({
      ...prev,
      problemTypes: isChecked
        ? [...prev.problemTypes.filter(t => t !== problemType), problemType]
        : prev.problemTypes.filter(t => t !== problemType)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submit - current formData:', formData);
    
    // Basic validation with detailed logging
    if (!formData.name.trim()) {
      console.log('Validation failed: name is empty');
      toast({
        title: "Validation Error", 
        description: "Profile name is required",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.sourceConfig.languages.length === 0) {
      console.log('Validation failed: no languages selected');
      toast({
        title: "Validation Error",
        description: "At least one language must be selected",
        variant: "destructive",
      });
      return;
    }
    
    if (formData.problemTypes.length === 0) {
      console.log('Validation failed: no problem types selected');
      toast({
        title: "Validation Error",
        description: "At least one problem type must be selected",
        variant: "destructive",
      });
      return;
    }
    
    // Prepare clean profile data
    const profileData = {
      name: formData.name,
      description: formData.description,
      sourceConfig: {
        directories: formData.sourceConfig.directories,
        languages: formData.sourceConfig.languages,
        complexity: formData.sourceConfig.complexity,
        excludePatterns: ["node_modules", "dist", "*.log"]
      },
      problemTypes: formData.problemTypes,
      expectations: formData.expectations,
      scenarios: [{
        id: 'main-scenario',
        name: 'Main Test Scenario',
        type: 'performance',
        duration: 300,
        enabled: true,
        problemTypes: formData.problemTypes,
        codeInjection: {
          errorTypes: formData.problemTypes,
          frequency: 0.1,
          complexity: formData.sourceConfig.complexity
        },
        metrics: {
          cpuPattern: 'stable',
          memoryPattern: 'stable',
          logPattern: 'normal'
        }
      }]
    };
    
    console.log('Final profile data to submit:', JSON.stringify(profileData, null, 2));
    onSubmit(profileData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Profile Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter profile name"
          required
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Enter profile description"
        />
      </div>

      <div>
        <Label htmlFor="directories">Source Directories</Label>
        <Input
          id="directories"
          value={formData.sourceConfig.directories.join(', ')}
          onChange={(e) => setFormData(prev => ({
            ...prev,
            sourceConfig: {
              ...prev.sourceConfig,
              directories: e.target.value.split(',').map(d => d.trim())
            }
          }))}
          placeholder="./src, ./lib"
        />
      </div>

      <div>
        <Label>Languages</Label>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {['typescript', 'javascript', 'python'].map(lang => (
            <div key={lang} className="flex items-center space-x-2">
              <Checkbox
                id={lang}
                checked={formData.sourceConfig.languages.includes(lang)}
                onCheckedChange={(checked) => {
                  console.log('Checkbox change for', lang, ':', checked);
                  handleLanguageChange(lang, checked);
                }}
              />
              <Label htmlFor={lang} className="text-sm">{lang}</Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="complexity">Complexity</Label>
        <Select 
          value={formData.sourceConfig.complexity} 
          onValueChange={(value) => setFormData(prev => ({
            ...prev,
            sourceConfig: { ...prev.sourceConfig, complexity: value as 'low' | 'medium' | 'high' }
          }))}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Problem Types</Label>
        <div className="grid grid-cols-2 gap-2 mt-2 max-h-32 overflow-y-auto">
          {problemTypes.map(problemType => (
            <div key={problemType.id} className="flex items-center space-x-2">
              <Checkbox
                id={problemType.id}
                checked={formData.problemTypes.includes(problemType.id)}
                onCheckedChange={(checked) => {
                  console.log('Problem type change for', problemType.id, ':', checked);
                  handleProblemTypeChange(problemType.id, checked);
                }}
              />
              <Label htmlFor={problemType.id} className="text-sm">{problemType.name}</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Profile'}
        </Button>
      </div>
    </form>
  );
}

// Profile Details Component
function ProfileDetails({ 
  profile, 
  onDelete, 
  onGenerate, 
  isDeleting, 
  isGenerating 
}: {
  profile: TestProfile;
  onDelete: () => void;
  onGenerate: () => void;
  isDeleting: boolean;
  isGenerating: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="font-medium">Basic Information</h3>
          <div className="mt-2 space-y-1 text-sm">
            <div><strong>ID:</strong> {profile.id}</div>
            <div><strong>Version:</strong> {profile.version}</div>
            <div><strong>Created:</strong> {new Date(profile.createdAt).toLocaleString()}</div>
            <div><strong>Updated:</strong> {new Date(profile.updatedAt).toLocaleString()}</div>
          </div>
        </div>
        
        <div>
          <h3 className="font-medium">Source Configuration</h3>
          <div className="mt-2 space-y-1 text-sm">
            <div><strong>Directories:</strong> {profile.sourceConfig.directories.join(', ')}</div>
            <div><strong>Languages:</strong> {profile.sourceConfig.languages.join(', ')}</div>
            <div><strong>Complexity:</strong> {profile.sourceConfig.complexity}</div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="font-medium">Scenarios</h3>
        <div className="mt-2 space-y-2">
          {profile.scenarios.map(scenario => (
            <Card key={scenario.id} className="p-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium">{scenario.name}</div>
                  <div className="text-sm text-muted-foreground">
                    Type: {scenario.type} | Duration: {scenario.duration}s
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Problems: {scenario.problemTypes.join(', ')}
                  </div>
                </div>
                <Badge variant={scenario.enabled ? "default" : "secondary"}>
                  {scenario.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium">Expectations</h3>
        <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
          <div><strong>Detection Rate:</strong> {profile.expectations.detectionRate}%</div>
          <div><strong>Fix Success Rate:</strong> {profile.expectations.fixSuccessRate}%</div>
          <div><strong>False Positive Rate:</strong> {profile.expectations.falsePositiveRate}%</div>
          <div><strong>ML Accuracy:</strong> {profile.expectations.mlAccuracy}%</div>
        </div>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete Profile'}
        </Button>
        <Button onClick={onGenerate} disabled={isGenerating}>
          {isGenerating ? 'Generating...' : 'Generate Test Data'}
        </Button>
      </div>
    </div>
  );
}