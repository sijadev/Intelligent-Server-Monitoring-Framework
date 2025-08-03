import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { 
  Puzzle, 
  Database, 
  AlertCircle, 
  Wrench, 
  Play, 
  Pause, 
  RotateCcw,
  Settings
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Plugin } from "@shared/schema";

const pluginTypeIcons = {
  collector: Database,
  detector: AlertCircle,
  remediator: Wrench
};

const pluginTypeColors = {
  collector: "bg-blue-100 text-blue-800",
  detector: "bg-orange-100 text-orange-800", 
  remediator: "bg-green-100 text-green-800"
};

const getPluginStatus = (status: string) => {
  switch (status.toLowerCase()) {
    case 'running':
      return 'running' as const;
    case 'stopped':
      return 'stopped' as const;
    case 'error':
      return 'error' as const;
    default:
      return 'warning' as const;
  }
};

export default function Plugins() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: plugins = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/plugins'],
    queryFn: () => api.getPlugins(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  const { data: frameworkStatus } = useQuery({
    queryKey: ['/api/framework/status'],
    queryFn: () => api.getFrameworkStatus(),
    refetchInterval: 5000,
  });

  const restartFrameworkMutation = useMutation({
    mutationFn: () => api.restartFramework(),
    onSuccess: () => {
      toast({
        title: "Framework Restarted",
        description: "The monitoring framework has been restarted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      queryClient.invalidateQueries({ queryKey: ['/api/framework/status'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to restart framework. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Filter plugins
  const filteredPlugins = plugins.filter(plugin => {
    if (typeFilter !== "all" && plugin.type !== typeFilter) return false;
    if (statusFilter !== "all" && plugin.status.toLowerCase() !== statusFilter) return false;
    return true;
  });

  // Group plugins by type
  const pluginsByType = filteredPlugins.reduce((acc, plugin) => {
    if (!acc[plugin.type]) acc[plugin.type] = [];
    acc[plugin.type].push(plugin);
    return acc;
  }, {} as Record<string, Plugin[]>);

  const handleRestartFramework = () => {
    restartFrameworkMutation.mutate();
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="Plugins"
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
      />
      
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          {/* Framework Status */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Framework Status</h3>
                <Button
                  onClick={handleRestartFramework}
                  disabled={restartFrameworkMutation.isPending}
                  variant="outline"
                  size="sm"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  {restartFrameworkMutation.isPending ? "Restarting..." : "Restart Framework"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <StatusIndicator 
                  status={frameworkStatus?.running ? 'running' : 'stopped'} 
                  animated={frameworkStatus?.running}
                  size="lg"
                />
                <div>
                  <p className="font-medium">
                    {frameworkStatus?.running ? 'Running' : 'Stopped'}
                  </p>
                  {frameworkStatus?.processId && (
                    <p className="text-sm text-gray-500">
                      Process ID: {frameworkStatus.processId}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plugin Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Puzzle className="h-8 w-8 text-primary" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Total Plugins</p>
                    <p className="text-2xl font-semibold text-gray-900">{plugins.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Database className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Collectors</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {plugins.filter(p => p.type === 'collector').length}
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
                    <p className="text-sm font-medium text-gray-500">Detectors</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {plugins.filter(p => p.type === 'detector').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Wrench className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-5">
                    <p className="text-sm font-medium text-gray-500">Remediators</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {plugins.filter(p => p.type === 'remediator').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-lg font-medium">Plugin Filters</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="collector">Collectors</SelectItem>
                    <SelectItem value="detector">Detectors</SelectItem>
                    <SelectItem value="remediator">Remediators</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="stopped">Stopped</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Plugins List */}
          <div className="space-y-6">
            {Object.entries(pluginsByType).map(([type, typePlugins]) => {
              const TypeIcon = pluginTypeIcons[type as keyof typeof pluginTypeIcons] || Puzzle;
              
              return (
                <Card key={type}>
                  <CardHeader>
                    <div className="flex items-center space-x-3">
                      <TypeIcon className="h-6 w-6" />
                      <h3 className="text-lg font-medium capitalize">
                        {type}s ({typePlugins.length})
                      </h3>
                      <Badge 
                        variant="secondary"
                        className={pluginTypeColors[type as keyof typeof pluginTypeColors]}
                      >
                        {type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {typePlugins.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No {type} plugins found
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {typePlugins.map((plugin) => (
                          <div 
                            key={plugin.id}
                            className="border rounded-lg p-4 bg-gray-50"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3">
                                <StatusIndicator 
                                  status={getPluginStatus(plugin.status)}
                                  animated={plugin.status === 'running'}
                                  className="mt-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-lg font-medium text-gray-900">
                                    {plugin.name}
                                  </h4>
                                  <p className="text-sm text-gray-500">
                                    Version {plugin.version}
                                  </p>
                                  <div className="mt-2">
                                    <Badge 
                                      variant="outline"
                                      className={cn(
                                        "capitalize",
                                        plugin.status === 'running' ? "bg-green-50 text-green-700" :
                                        plugin.status === 'stopped' ? "bg-gray-50 text-gray-700" :
                                        "bg-red-50 text-red-700"
                                      )}
                                    >
                                      {plugin.status}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                            </div>
                            
                            <div className="mt-4 text-sm text-gray-500">
                              Last updated {formatDistanceToNow(new Date(plugin.lastUpdate), { addSuffix: true })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredPlugins.length === 0 && !isLoading && (
            <Card>
              <CardContent className="text-center py-12">
                <Puzzle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No plugins found</h3>
                <p className="text-gray-500">
                  {plugins.length === 0 
                    ? "No plugins are currently loaded in the framework."
                    : "No plugins match your current filters."
                  }
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
