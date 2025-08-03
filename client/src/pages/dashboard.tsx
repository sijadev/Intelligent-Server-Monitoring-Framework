import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { StatusCards } from "@/components/dashboard/status-cards";
import { ProblemsList } from "@/components/dashboard/problems-list";
import { SystemInfo } from "@/components/dashboard/system-info";
import { PluginStatus } from "@/components/dashboard/plugin-status";
import { LogViewer } from "@/components/dashboard/log-viewer";
import { useWebSocket } from "@/hooks/use-websocket";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { DashboardData, LogEntry } from "@shared/schema";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [realtimeLogs, setRealtimeLogs] = useState<LogEntry[]>([]);
  const [isLive, setIsLive] = useState(false);

  // Fetch dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['/api/dashboard'],
    queryFn: () => api.getDashboard(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch logs separately for real-time viewer
  const { data: logs = [] } = useQuery({
    queryKey: ['/api/logs'],
    queryFn: () => api.getLogs({ limit: 100 }),
    refetchInterval: 5000, // Refetch every 5 seconds
  });

  // Resolve problem mutation
  const resolveProblemMutation = useMutation({
    mutationFn: (problemId: string) => api.resolveProblem(problemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['/api/problems'] });
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

  // WebSocket for real-time updates
  const { isConnected } = useWebSocket({
    onMessage: (message) => {
      switch (message.type) {
        case 'dashboard':
          queryClient.setQueryData(['/api/dashboard'], message.data);
          break;
        case 'problems':
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['/api/problems'] });
          break;
        case 'metrics':
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['/api/metrics'] });
          break;
        case 'logEntries':
          setRealtimeLogs(prev => [...message.data, ...prev].slice(0, 100));
          break;
        case 'plugins':
          queryClient.invalidateQueries({ queryKey: ['/api/dashboard'] });
          queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
          break;
      }
    },
    onOpen: () => setIsLive(true),
    onClose: () => setIsLive(false),
  });

  // Initialize real-time logs with initial data
  useEffect(() => {
    if (logs.length > 0 && realtimeLogs.length === 0) {
      setRealtimeLogs(logs);
    }
  }, [logs, realtimeLogs.length]);

  const handleRefresh = () => {
    refetch();
    queryClient.invalidateQueries({ queryKey: ['/api/logs'] });
  };

  const handleResolveProblem = (problemId: string) => {
    resolveProblemMutation.mutate(problemId);
  };

  const handleClearLogs = () => {
    setRealtimeLogs([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="System Overview"
        onRefresh={handleRefresh}
        isLive={isConnected && isLive}
        isRefreshing={isLoading}
      />
      
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          <StatusCards status={dashboardData?.status} />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <ProblemsList 
              problems={dashboardData?.recentProblems || []}
              onResolveProblem={handleResolveProblem}
            />
            
            <div>
              <SystemInfo 
                metrics={dashboardData?.currentMetrics}
                uptime={dashboardData?.status?.uptime}
              />
              <PluginStatus plugins={dashboardData?.pluginStatus || []} />
            </div>
          </div>
          
          <LogViewer 
            logs={realtimeLogs}
            onClear={handleClearLogs}
            className="mt-8"
          />
        </div>
      </main>
    </div>
  );
}
