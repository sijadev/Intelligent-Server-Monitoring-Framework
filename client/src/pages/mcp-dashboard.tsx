import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Server, 
  Activity, 
  Network, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Play,
  Square,
  Eye,
  BarChart3,
  Wifi,
  Settings
} from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface MCPServer {
  id: string;
  serverId: string;
  name: string;
  host: string;
  port: number;
  protocol: string;
  status: string;
  pid?: number;
  processName?: string;
  version?: string;
  capabilities: string[];
  lastSeen: Date;
  discoveryMethod: string;
  responseTime?: number;
  uptime?: number;
  containerName?: string;
  imageName?: string;
}

interface MCPServerMetrics {
  id: string;
  serverId: string;
  timestamp: Date;
  status: string;
  responseTime: number;
  requestCount: number;
  errorCount: number;
  cpuUsage?: number;
  memoryUsage?: number;
  connections?: number;
  metadata: Record<string, any>;
}

interface MCPDashboardData {
  totalServers: number;
  runningServers: number;
  stoppedServers: number;
  unknownServers: number;
  averageResponseTime: number;
  totalRequests: number;
  totalErrors: number;
  serversByProtocol: Record<string, number>;
  serversByDiscoveryMethod: Record<string, number>;
}

export default function MCPDashboard() {
  usePageTitle("MCP Dashboard");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTab, setSelectedTab] = useState("overview");
  const [selectedServer, setSelectedServer] = useState<string | null>(null);

  // Query MCP dashboard data
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery({
    queryKey: ['/api/mcp/dashboard'],
    queryFn: () => api.httpGet('/api/mcp/dashboard') as Promise<MCPDashboardData>,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Query MCP servers
  const { data: servers, isLoading: serversLoading } = useQuery({
    queryKey: ['/api/mcp/servers'],
    queryFn: () => api.httpGet('/api/mcp/servers') as Promise<MCPServer[]>,
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Query metrics for selected server
  const { data: serverMetrics } = useQuery({
    queryKey: ['/api/mcp/servers', selectedServer, 'metrics'],
    queryFn: () => selectedServer ? api.httpGet(`/api/mcp/servers/${selectedServer}/metrics?limit=50`) as Promise<MCPServerMetrics[]> : Promise.resolve([]),
    enabled: !!selectedServer,
    refetchInterval: 10000,
  });

  // Mutation for server actions
  const serverActionMutation = useMutation({
    mutationFn: ({ serverId, action }: { serverId: string; action: string }) => 
      api.httpPost(`/api/mcp/servers/${serverId}/${action}`),
    onSuccess: (_, { action }) => {
      toast({
        title: "Action Completed",
        description: `Server ${action} completed successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/servers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/mcp/dashboard'] });
    },
    onError: (_, { action }) => {
      toast({
        title: "Action Failed",
        description: `Failed to ${action} server. Please try again.`,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'running':
        return 'text-green-600 bg-green-100';
      case 'stopped':
        return 'text-red-600 bg-red-100';
      case 'unknown':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getProtocolIcon = (protocol: string) => {
    switch (protocol.toLowerCase()) {
      case 'http':
      case 'https':
        return <Network className="h-4 w-4" />;
      case 'websocket':
        return <Wifi className="h-4 w-4" />;
      default:
        return <Server className="h-4 w-4" />;
    }
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

  const formatUptime = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (dashboardLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading MCP Dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="MCP Dashboard"
        onRefresh={() => refetchDashboard()}
        isRefreshing={dashboardLoading}
      />
      
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="servers">Servers</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="discovery">Discovery</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* MCP Statistics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Servers</CardTitle>
                    <Server className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData?.totalServers || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      MCP servers discovered
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Running Servers</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{dashboardData?.runningServers || 0}</div>
                    <Progress 
                      value={dashboardData?.totalServers ? (dashboardData.runningServers / dashboardData.totalServers) * 100 : 0} 
                      className="mt-2" 
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {dashboardData?.averageResponseTime ? `${dashboardData.averageResponseTime.toFixed(0)}ms` : '0ms'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Average server response
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{dashboardData?.totalRequests || 0}</div>
                    <p className="text-xs text-muted-foreground">
                      Requests processed
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Server Status Distribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Server Status Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>Running</span>
                        </div>
                        <span className="font-medium">{dashboardData?.runningServers || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span>Stopped</span>
                        </div>
                        <span className="font-medium">{dashboardData?.stoppedServers || 0}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-gray-600" />
                          <span>Unknown</span>
                        </div>
                        <span className="font-medium">{dashboardData?.unknownServers || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Protocol Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {dashboardData?.serversByProtocol ? Object.entries(dashboardData.serversByProtocol).map(([protocol, count]) => (
                        <div key={protocol} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getProtocolIcon(protocol)}
                            <span className="capitalize">{protocol}</span>
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                      )) : (
                        <div className="text-center text-gray-500">No data available</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Servers Tab */}
            <TabsContent value="servers" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>MCP Servers</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Discovered Model Context Protocol servers
                  </p>
                </CardHeader>
                <CardContent>
                  {serversLoading ? (
                    <div className="text-center py-8">Loading servers...</div>
                  ) : servers && servers.length > 0 ? (
                    <div className="space-y-4">
                      {servers.map((server) => (
                        <div key={server.id} className="border rounded-lg p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-medium">{server.name}</h3>
                                <Badge className={getStatusColor(server.status)}>
                                  {server.status}
                                </Badge>
                                <Badge variant="outline">
                                  {server.protocol}
                                </Badge>
                                {server.containerName && (
                                  <Badge variant="secondary">
                                    Container
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {server.host}:{server.port}
                                {server.version && ` • v${server.version}`}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span>Discovery: {server.discoveryMethod}</span>
                                <span>Last seen: {formatTimeAgo(server.lastSeen)}</span>
                                {server.responseTime && (
                                  <span>Response: {server.responseTime.toFixed(0)}ms</span>
                                )}
                                {server.uptime && (
                                  <span>Uptime: {formatUptime(server.uptime)}</span>
                                )}
                              </div>
                              {server.capabilities.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs text-gray-500 mb-1">Capabilities:</div>
                                  <div className="flex flex-wrap gap-1">
                                    {server.capabilities.slice(0, 5).map((capability) => (
                                      <Badge key={capability} variant="outline" className="text-xs">
                                        {capability}
                                      </Badge>
                                    ))}
                                    {server.capabilities.length > 5 && (
                                      <Badge variant="outline" className="text-xs">
                                        +{server.capabilities.length - 5} more
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            <div className="ml-4 flex flex-col gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedServer(selectedServer === server.serverId ? null : server.serverId)}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                              {server.status === 'running' ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => serverActionMutation.mutate({ serverId: server.serverId, action: 'stop' })}
                                  disabled={serverActionMutation.isPending}
                                >
                                  <Square className="h-3 w-3" />
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => serverActionMutation.mutate({ serverId: server.serverId, action: 'start' })}
                                  disabled={serverActionMutation.isPending}
                                >
                                  <Play className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No MCP servers discovered
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Metrics Tab */}
            <TabsContent value="metrics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Server Metrics</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {selectedServer ? `Metrics for server ${selectedServer}` : 'Select a server to view detailed metrics'}
                  </p>
                </CardHeader>
                <CardContent>
                  {selectedServer && serverMetrics ? (
                    <div className="space-y-4">
                      {serverMetrics.length > 0 ? (
                        serverMetrics.slice(0, 10).map((metric) => (
                          <div key={metric.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{formatTimeAgo(metric.timestamp)}</span>
                              <Badge className={getStatusColor(metric.status)}>
                                {metric.status}
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <div className="text-gray-500">Response Time</div>
                                <div className="font-medium">{metric.responseTime.toFixed(0)}ms</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Requests</div>
                                <div className="font-medium">{metric.requestCount}</div>
                              </div>
                              <div>
                                <div className="text-gray-500">Errors</div>
                                <div className="font-medium">{metric.errorCount}</div>
                              </div>
                              {metric.cpuUsage && (
                                <div>
                                  <div className="text-gray-500">CPU</div>
                                  <div className="font-medium">{metric.cpuUsage.toFixed(1)}%</div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No metrics available for this server
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Select a server from the Servers tab to view metrics
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Discovery Tab */}
            <TabsContent value="discovery" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Discovery Methods</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    How MCP servers are being discovered
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {dashboardData?.serversByDiscoveryMethod ? Object.entries(dashboardData.serversByDiscoveryMethod).map(([method, count]) => (
                      <div key={method} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Settings className="h-4 w-4 text-gray-500" />
                          <span className="font-medium capitalize">{method.replace('_', ' ')}</span>
                        </div>
                        <Badge variant="secondary">{count} servers</Badge>
                      </div>
                    )) : (
                      <div className="text-center py-8 text-gray-500">
                        No discovery data available
                      </div>
                    )}
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