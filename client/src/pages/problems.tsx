import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Problem } from "@shared/schema";

const severityColors = {
  LOW: "bg-blue-100 text-blue-800",
  MEDIUM: "bg-orange-100 text-orange-800", 
  HIGH: "bg-red-100 text-red-800",
  CRITICAL: "bg-red-100 text-red-800"
};

const severityStatus = {
  LOW: 'running' as const,
  MEDIUM: 'warning' as const,
  HIGH: 'error' as const,
  CRITICAL: 'error' as const
};

const severityIcons = {
  LOW: Info,
  MEDIUM: AlertTriangle,
  HIGH: AlertCircle,
  CRITICAL: AlertCircle
};

export default function Problems() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const { data: problems = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/problems'],
    queryFn: () => api.getProblems(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const { data: activeProblems = [] } = useQuery({
    queryKey: ['/api/problems/active'],
    queryFn: () => api.getActiveProblems(),
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  const resolveProblemMutation = useMutation({
    mutationFn: (problemId: string) => api.resolveProblem(problemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/problems'] });
      queryClient.invalidateQueries({ queryKey: ['/api/problems/active'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      toast({
        title: "Problem Resolved",
        description: "The problem has been marked as resolved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to resolve problem. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter problems
  const filteredProblems = problems.filter(problem => {
    if (statusFilter === "active" && problem.resolved) return false;
    if (statusFilter === "resolved" && !problem.resolved) return false;
    if (severityFilter !== "all" && problem.severity !== severityFilter) return false;
    return true;
  });

  const handleResolveProblem = (problemId: string) => {
    resolveProblemMutation.mutate(problemId);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="Problems"
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
      />
      
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-8 w-8 text-red-500" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Active Problems</p>
                    <p className="text-2xl font-semibold text-gray-900">{activeProblems.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Resolved Problems</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {problems.filter(p => p.resolved).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Critical Problems</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {problems.filter(p => p.severity === 'CRITICAL' && !p.resolved).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-lg font-medium">Problem Filters</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>

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
              </div>
            </CardContent>
          </Card>

          {/* Problems List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Problems ({filteredProblems.length} of {problems.length})
                </h3>
                <Badge variant="outline">
                  {isLoading ? "Updating..." : "Live"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading problems...</div>
              ) : filteredProblems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No problems found matching your criteria
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProblems.map((problem) => {
                    const SeverityIcon = severityIcons[problem.severity as keyof typeof severityIcons];
                    return (
                      <div 
                        key={problem.id}
                        className={cn(
                          "border rounded-lg p-4 transition-colors",
                          problem.resolved ? "bg-gray-50 border-gray-200" : "bg-white border-gray-300"
                        )}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="flex-shrink-0">
                              {problem.resolved ? (
                                <CheckCircle className="h-6 w-6 text-green-500 mt-1" />
                              ) : (
                                <StatusIndicator 
                                  status={severityStatus[problem.severity as keyof typeof severityStatus]} 
                                  size="lg"
                                  className="mt-2"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-3 mb-2">
                                <h4 className={cn(
                                  "text-lg font-medium",
                                  problem.resolved ? "text-gray-600" : "text-gray-900"
                                )}>
                                  {problem.description}
                                </h4>
                                <Badge 
                                  variant="secondary"
                                  className={severityColors[problem.severity as keyof typeof severityColors]}
                                >
                                  {problem.severity}
                                </Badge>
                                {problem.resolved && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700">
                                    Resolved
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm text-gray-600">
                                  <span className="font-medium">Type:</span> {problem.type}
                                </p>
                                
                                {(problem.metadata as any)?.sample_messages && (
                                  <div>
                                    <p className="text-sm font-medium text-gray-600 mb-1">Sample Messages:</p>
                                    <ul className="text-sm text-gray-500 space-y-1">
                                      {(problem.metadata as any).sample_messages.slice(0, 2).map((message: string, index: number) => (
                                        <li key={index} className="truncate">• {message}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                
                                {(problem.metadata as any)?.match_count && (
                                  <p className="text-sm text-gray-600">
                                    <span className="font-medium">Occurrences:</span> {(problem.metadata as any).match_count}
                                  </p>
                                )}
                              </div>
                              
                              <div className="mt-4 flex items-center space-x-4 text-sm text-gray-500">
                                <span>
                                  Detected {formatDistanceToNow(new Date(problem.timestamp), { addSuffix: true })}
                                </span>
                                {problem.resolved && problem.resolvedAt && (
                                  <span>
                                    Resolved {formatDistanceToNow(new Date(problem.resolvedAt), { addSuffix: true })}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {!problem.resolved && (
                            <div className="flex-shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResolveProblem(problem.id)}
                                disabled={resolveProblemMutation.isPending}
                              >
                                {resolveProblemMutation.isPending ? "Resolving..." : "Mark Resolved"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
