import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusIndicator } from '@/components/ui/status-indicator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Code,
  Play,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  Bug,
  Shield,
  Zap,
  FileCode,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { CodeIssue, CodeAnalysisRun } from '@shared/schema';

const severityColors = {
  LOW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const severityStatus = {
  LOW: 'running' as const,
  MEDIUM: 'warning' as const,
  HIGH: 'error' as const,
  CRITICAL: 'error' as const,
};

const issueTypeIcons = {
  syntax_error: Bug,
  logic_error: AlertTriangle,
  security_issue: Shield,
  performance_issue: Zap,
  undefined_function: Code,
  null_pointer: AlertCircle,
  memory_issue: TrendingUp,
  concurrency_issue: Clock,
};

const statusColors = {
  running: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

export default function CodeAnalysis() {
  usePageTitle('Code Analysis');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Query for code analysis configuration
  const { data: config } = useQuery({
    queryKey: ['/api/code-analysis/config'],
    queryFn: () => api.httpGet('/api/code-analysis/config'),
  });

  // Query for active code issues
  const {
    data: codeIssues = [],
    isLoading: issuesLoading,
    refetch: refetchIssues,
  } = useQuery({
    queryKey: ['/api/code-issues/active'],
    queryFn: () => api.httpGet('/api/code-issues/active'),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Query for code analysis runs
  const {
    data: analysisRuns = [],
    isLoading: runsLoading,
    refetch: refetchRuns,
  } = useQuery({
    queryKey: ['/api/code-analysis/runs'],
    queryFn: () => api.httpGet('/api/code-analysis/runs'),
    refetchInterval: 15000, // Refetch every 15 seconds
  });

  // Query for latest analysis run
  const { data: latestRun } = useQuery({
    queryKey: ['/api/code-analysis/runs/latest'],
    queryFn: () => api.httpGet('/api/code-analysis/runs/latest'),
    refetchInterval: 10000,
  });

  // Mutation to start code analysis
  const startAnalysisMutation = useMutation({
    mutationFn: () => api.httpPost('/api/code-analysis/start', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/code-analysis/runs'] });
      queryClient.invalidateQueries({ queryKey: ['/api/code-analysis/runs/latest'] });
      toast({
        title: 'Code Analysis Started',
        description: 'Code analysis is now running in the background.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to start code analysis.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to resolve code issue
  const resolveIssueMutation = useMutation({
    mutationFn: (issueId: string) => api.httpPut(`/api/code-issues/${issueId}/resolve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/code-issues/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: 'Issue Resolved',
        description: 'The code issue has been marked as resolved.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to resolve issue. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Mutation to apply code fix
  const applyFixMutation = useMutation({
    mutationFn: (issueId: string) => api.httpPut(`/api/code-issues/${issueId}/apply-fix`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/code-issues/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: 'Fix Applied',
        description: 'The code fix has been applied successfully.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to apply fix. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Filter issues
  const filteredIssues = codeIssues.filter((issue: CodeIssue) => {
    if (severityFilter !== 'all' && issue.severity !== severityFilter) return false;
    if (typeFilter !== 'all' && issue.issueType !== typeFilter) return false;
    return true;
  });

  const handleStartAnalysis = () => {
    startAnalysisMutation.mutate();
  };

  const handleResolveIssue = (issueId: string) => {
    resolveIssueMutation.mutate(issueId);
  };

  const handleApplyFix = (issueId: string) => {
    applyFixMutation.mutate(issueId);
  };

  if (!config?.enabled) {
    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <Header title="Code Analysis" />
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-96">
            <CardHeader>
              <h3 className="text-lg font-medium">Code Analysis Disabled</h3>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Code analysis is currently disabled. Enable it in the configuration to start
                analyzing your code for issues.
              </p>
              <Button variant="outline" onClick={() => (window.location.href = '/configuration')}>
                <Code className="h-4 w-4 mr-2" />
                Go to Configuration
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="Code Analysis"
        onRefresh={() => {
          refetchIssues();
          refetchRuns();
        }}
        isRefreshing={issuesLoading || runsLoading}
      />

      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Bug className="h-8 w-8 text-red-500" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Active Issues
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {codeIssues.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Critical Issues
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {
                        codeIssues.filter((issue: CodeIssue) => issue.severity === 'CRITICAL')
                          .length
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <FileCode className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Source Directories
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                      {config?.sourceDirectories?.length || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Last Analysis
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {latestRun
                        ? formatDistanceToNow(new Date(latestRun.timestamp), { addSuffix: true })
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analysis Control */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Analysis Control</h3>
                <Button
                  onClick={handleStartAnalysis}
                  disabled={startAnalysisMutation.isPending || latestRun?.status === 'running'}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {latestRun?.status === 'running' ? 'Analysis Running...' : 'Start Analysis'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-Fix</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {config?.autoFix ? '✅ Enabled' : '❌ Disabled'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Confidence Threshold
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {Math.round((config?.confidenceThreshold || 0) * 100)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Status</p>
                  <Badge
                    variant="outline"
                    className={
                      latestRun
                        ? statusColors[latestRun.status as keyof typeof statusColors]
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {latestRun?.status || 'Not Started'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs for Issues and Runs */}
          <Tabs defaultValue="issues" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="issues">Code Issues</TabsTrigger>
              <TabsTrigger value="runs">Analysis Runs</TabsTrigger>
            </TabsList>

            <TabsContent value="issues">
              {/* Filters */}
              <Card className="mb-6">
                <CardHeader>
                  <h3 className="text-lg font-medium">Issue Filters</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select value={severityFilter} onValueChange={setSeverityFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Severities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="LOW">Low</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="syntax_error">Syntax Error</SelectItem>
                        <SelectItem value="logic_error">Logic Error</SelectItem>
                        <SelectItem value="security_issue">Security Issue</SelectItem>
                        <SelectItem value="performance_issue">Performance Issue</SelectItem>
                        <SelectItem value="undefined_function">Undefined Function</SelectItem>
                        <SelectItem value="null_pointer">Null Pointer</SelectItem>
                        <SelectItem value="memory_issue">Memory Issue</SelectItem>
                        <SelectItem value="concurrency_issue">Concurrency Issue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Issues List */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">
                      Code Issues ({filteredIssues.length} of {codeIssues.length})
                    </h3>
                    <Badge variant="outline">{issuesLoading ? 'Updating...' : 'Live'}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {issuesLoading ? (
                    <div className="text-center py-8">Loading code issues...</div>
                  ) : filteredIssues.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      {codeIssues.length === 0
                        ? 'No code issues found'
                        : 'No issues match your criteria'}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredIssues.map((issue: CodeIssue) => {
                        const TypeIcon =
                          issueTypeIcons[issue.issueType as keyof typeof issueTypeIcons] || Bug;
                        return (
                          <div
                            key={issue.id}
                            className="border rounded-lg p-4 transition-colors bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                  <StatusIndicator
                                    status={
                                      severityStatus[issue.severity as keyof typeof severityStatus]
                                    }
                                    size="lg"
                                    className="mt-2"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 mb-2">
                                    <TypeIcon className="h-5 w-5 text-gray-500" />
                                    <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                      {issue.description}
                                    </h4>
                                    <Badge
                                      variant="secondary"
                                      className={
                                        severityColors[
                                          issue.severity as keyof typeof severityColors
                                        ]
                                      }
                                    >
                                      {issue.severity}
                                    </Badge>
                                    <Badge variant="outline">
                                      {issue.issueType.replace('_', ' ')}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      <strong>File:</strong> {issue.filePath}:{issue.lineNumber}
                                    </p>
                                    {issue.functionName && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        <strong>Function:</strong> {issue.functionName}
                                      </p>
                                    )}
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      <strong>Confidence:</strong> {issue.confidence}%
                                    </p>
                                    {issue.suggestedFix && (
                                      <p className="text-sm text-gray-600 dark:text-gray-400">
                                        <strong>Suggested Fix:</strong> {issue.suggestedFix}
                                      </p>
                                    )}
                                    <p className="text-sm text-gray-500 dark:text-gray-500">
                                      Detected{' '}
                                      {formatDistanceToNow(new Date(issue.timestamp), {
                                        addSuffix: true,
                                      })}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col space-y-2">
                                {issue.suggestedFix && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApplyFix(issue.id)}
                                    disabled={applyFixMutation.isPending}
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Apply Fix
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleResolveIssue(issue.id)}
                                  disabled={resolveIssueMutation.isPending}
                                >
                                  Mark Resolved
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="runs">
              {/* Analysis Runs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium">Analysis Run History</h3>
                    <Badge variant="outline">{runsLoading ? 'Updating...' : 'Live'}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {runsLoading ? (
                    <div className="text-center py-8">Loading analysis runs...</div>
                  ) : analysisRuns.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      No analysis runs found. Start your first analysis above.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {analysisRuns.map((run: CodeAnalysisRun) => (
                        <div
                          key={run.id}
                          className="border rounded-lg p-4 transition-colors bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600"
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center space-x-3">
                              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                                Analysis Run
                              </h4>
                              <Badge
                                variant="outline"
                                className={statusColors[run.status as keyof typeof statusColors]}
                              >
                                {run.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              {formatDistanceToNow(new Date(run.timestamp), { addSuffix: true })}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="font-medium text-gray-700 dark:text-gray-300">
                                Files Analyzed
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                {run.filesAnalyzed}
                              </p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 dark:text-gray-300">
                                Issues Found
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">{run.issuesFound}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 dark:text-gray-300">
                                Fixes Applied
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">{run.fixesApplied}</p>
                            </div>
                            <div>
                              <p className="font-medium text-gray-700 dark:text-gray-300">
                                Duration
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                {run.duration ? `${Math.round(run.duration / 1000)}s` : 'N/A'}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
