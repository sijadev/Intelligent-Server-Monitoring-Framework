import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  TrendingUp,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  BarChart3,
  Settings,
  Play,
  Pause,
  RotateCcw,
  Activity,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface AiStats {
  totalInterventions: number;
  successRate: number;
  problemTypesLearned: number;
  averageConfidence: number;
  recentDeployments: number;
  lastModelUpdate: Date | null;
}

interface AiIntervention {
  id: string;
  problemType: string;
  issueDescription: string;
  confidence: number;
  riskScore: number;
  outcome: string;
  timestamp: Date;
  deploymentId?: string;
}

interface Deployment {
  id: string;
  type: string;
  status: string;
  description: string;
  startTime: Date;
  duration?: number;
  initiatedBy: string;
  filesChanged: string[];
}

export default function AiDashboard() {
  usePageTitle('AI Dashboard');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState('overview');

  // Query AI learning statistics
  const {
    data: aiStats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['/api/ai/stats'],
    queryFn: () => api.httpGet('/api/ai/stats') as Promise<AiStats>,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Query recent AI interventions
  const { data: recentInterventions, isLoading: interventionsLoading } = useQuery({
    queryKey: ['/api/ai/interventions/recent'],
    queryFn: () =>
      api.httpGet('/api/ai/interventions/recent?hours=24') as Promise<AiIntervention[]>,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Query active deployments
  const { data: activeDeployments, isLoading: deploymentsLoading } = useQuery({
    queryKey: ['/api/deployments/active'],
    queryFn: () => api.httpGet('/api/deployments/active') as Promise<Deployment[]>,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Query recent deployments
  const { data: recentDeployments } = useQuery({
    queryKey: ['/api/deployments'],
    queryFn: () => api.httpGet('/api/deployments?limit=10') as Promise<Deployment[]>,
    refetchInterval: 30000,
  });

  // Mutation for training AI models
  const trainModelMutation = useMutation({
    mutationFn: () => api.httpPost('/api/ai/train'),
    onSuccess: () => {
      toast({
        title: 'AI Training Started',
        description: 'AI models are being retrained with the latest data.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/ai/stats'] });
    },
    onError: () => {
      toast({
        title: 'Training Failed',
        description: 'Failed to start AI model training. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'text-green-600 bg-green-100';
      case 'in_progress':
      case 'pending':
        return 'text-blue-600 bg-blue-100';
      case 'failed':
      case 'failure':
        return 'text-red-600 bg-red-100';
      case 'partial':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'Just now';
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading AI Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="AI Dashboard" onRefresh={() => refetchStats()} isRefreshing={statsLoading} />

      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="interventions">Interventions</TabsTrigger>
              <TabsTrigger value="deployments">Deployments</TabsTrigger>
              <TabsTrigger value="models">Models</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* AI Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Interventions</CardTitle>
                    <Brain className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiStats?.totalInterventions || 0}</div>
                    <p className="text-xs text-muted-foreground">AI-powered problem fixes</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {aiStats?.successRate ? `${(aiStats.successRate * 100).toFixed(1)}%` : '0%'}
                    </div>
                    <Progress value={(aiStats?.successRate || 0) * 100} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Problem Types</CardTitle>
                    <Target className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{aiStats?.problemTypesLearned || 0}</div>
                    <p className="text-xs text-muted-foreground">Types learned by AI</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {aiStats?.averageConfidence
                        ? `${(aiStats.averageConfidence * 100).toFixed(1)}%`
                        : '0%'}
                    </div>
                    <Progress value={(aiStats?.averageConfidence || 0) * 100} className="mt-2" />
                  </CardContent>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  onClick={() => trainModelMutation.mutate()}
                  disabled={trainModelMutation.isPending}
                  className="flex items-center gap-2"
                >
                  {trainModelMutation.isPending ? (
                    <RotateCcw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {trainModelMutation.isPending ? 'Training...' : 'Retrain AI Models'}
                </Button>
              </div>

              {/* Active Deployments */}
              {activeDeployments && activeDeployments.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Active Deployments
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {activeDeployments.map((deployment) => (
                        <div
                          key={deployment.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{deployment.description}</div>
                            <div className="text-sm text-gray-500">
                              Started {formatTimeAgo(deployment.startTime)} by{' '}
                              {deployment.initiatedBy}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(deployment.status)}>
                              {deployment.status}
                            </Badge>
                            <Badge variant="outline">{deployment.type}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Interventions Tab */}
            <TabsContent value="interventions" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent AI Interventions</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    AI-powered problem detections and fixes from the last 24 hours
                  </p>
                </CardHeader>
                <CardContent>
                  {interventionsLoading ? (
                    <div className="text-center py-8">Loading interventions...</div>
                  ) : recentInterventions && recentInterventions.length > 0 ? (
                    <div className="space-y-4">
                      {recentInterventions.map((intervention) => (
                        <div key={intervention.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{intervention.problemType}</h3>
                                <Badge className={getStatusColor(intervention.outcome)}>
                                  {intervention.outcome}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {intervention.issueDescription}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>
                                  Confidence: {(intervention.confidence * 100).toFixed(1)}%
                                </span>
                                <span>Risk: {(intervention.riskScore * 100).toFixed(1)}%</span>
                                <span>{formatTimeAgo(intervention.timestamp)}</span>
                                {intervention.deploymentId && (
                                  <span>Deployment: {intervention.deploymentId}</span>
                                )}
                              </div>
                            </div>
                            <div className="ml-4">
                              {intervention.outcome === 'success' ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : intervention.outcome === 'failure' ? (
                                <XCircle className="h-5 w-5 text-red-600" />
                              ) : (
                                <AlertCircle className="h-5 w-5 text-yellow-600" />
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No recent AI interventions found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Deployments Tab */}
            <TabsContent value="deployments" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Deployments</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Automated deployments triggered by AI interventions
                  </p>
                </CardHeader>
                <CardContent>
                  {deploymentsLoading ? (
                    <div className="text-center py-8">Loading deployments...</div>
                  ) : recentDeployments && recentDeployments.length > 0 ? (
                    <div className="space-y-4">
                      {recentDeployments.map((deployment) => (
                        <div key={deployment.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{deployment.description}</h3>
                                <Badge className={getStatusColor(deployment.status)}>
                                  {deployment.status}
                                </Badge>
                                <Badge variant="outline">{deployment.type}</Badge>
                              </div>
                              <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                                <span>Started: {formatTimeAgo(deployment.startTime)}</span>
                                <span>Duration: {formatDuration(deployment.duration)}</span>
                                <span>By: {deployment.initiatedBy}</span>
                              </div>
                              {deployment.filesChanged.length > 0 && (
                                <div className="text-xs text-gray-500">
                                  Files: {deployment.filesChanged.slice(0, 3).join(', ')}
                                  {deployment.filesChanged.length > 3 &&
                                    ` +${deployment.filesChanged.length - 3} more`}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <Clock className="h-5 w-5 text-gray-400" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No recent deployments found
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Models Tab */}
            <TabsContent value="models" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Models</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Trained models for problem detection and intervention
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    AI Models dashboard coming soon...
                    <br />
                    <span className="text-xs">
                      This will show trained models, accuracy metrics, and training history
                    </span>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
