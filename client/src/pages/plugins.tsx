import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { 
  Puzzle, 
  Database, 
  AlertCircle, 
  Wrench, 
  Play, 
  Pause, 
  RotateCcw,
  Settings,
  Plus,
  Code,
  Download
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

// Default plugin templates
const defaultPlugins = {
  collector: {
    system_metrics: {
      name: 'Custom System Metrics Collector',
      description: 'Collects CPU, memory, and disk usage metrics',
      code: `import psutil
import asyncio
from datetime import datetime

class CustomSystemMetricsCollector:
    def __init__(self):
        self.name = "custom_system_metrics"
        self.version = "1.0.0"
        self.type = "collector"
    
    async def collect_metrics(self):
        return {
            'timestamp': datetime.now().isoformat(),
            'cpuUsage': psutil.cpu_percent(interval=0.1),
            'memoryUsage': psutil.virtual_memory().percent,
            'diskUsage': psutil.disk_usage('/').percent,
            'processes': len(psutil.pids())
        }
    
    async def run(self):
        while True:
            metrics = await self.collect_metrics()
            print(f"Metrics: {metrics}")
            await asyncio.sleep(30)

if __name__ == "__main__":
    collector = CustomSystemMetricsCollector()
    asyncio.run(collector.run())`
    },
    network_monitor: {
      name: 'Network Traffic Monitor',
      description: 'Monitors network interfaces and traffic',
      code: `import psutil
import asyncio
from datetime import datetime

class NetworkMonitor:
    def __init__(self):
        self.name = "network_monitor"
        self.version = "1.0.0"
        self.type = "collector"
        self.last_net_io = None
    
    async def collect_network_metrics(self):
        net_io = psutil.net_io_counters()
        interfaces = psutil.net_if_stats()
        
        metrics = {
            'timestamp': datetime.now().isoformat(),
            'totalBytesSent': net_io.bytes_sent,
            'totalBytesReceived': net_io.bytes_recv,
            'totalPacketsSent': net_io.packets_sent,
            'totalPacketsReceived': net_io.packets_recv,
            'activeInterfaces': len([name for name, stats in interfaces.items() if stats.isup])
        }
        
        return metrics
    
    async def run(self):
        while True:
            metrics = await self.collect_network_metrics()
            print(f"Network Metrics: {metrics}")
            await asyncio.sleep(30)

if __name__ == "__main__":
    monitor = NetworkMonitor()
    asyncio.run(monitor.run())`
    }
  },
  detector: {
    threshold_detector: {
      name: 'Custom Threshold Detector',
      description: 'Detects when system metrics exceed thresholds',
      code: `import asyncio
from datetime import datetime
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class Problem:
    type: str
    severity: str
    description: str
    timestamp: datetime
    metadata: Dict[str, Any]

class ThresholdDetector:
    def __init__(self):
        self.name = "custom_threshold_detector"
        self.version = "1.0.0"
        self.type = "detector"
        self.thresholds = {
            'cpu_usage': {'warning': 80, 'critical': 95},
            'memory_usage': {'warning': 85, 'critical': 95},
            'disk_usage': {'warning': 80, 'critical': 95}
        }
    
    async def detect_problems(self, metrics: Dict[str, Any]) -> List[Problem]:
        problems = []
        
        # Check CPU usage
        cpu_usage = metrics.get('cpuUsage', 0)
        if cpu_usage > self.thresholds['cpu_usage']['critical']:
            problems.append(Problem(
                type='HIGH_CPU_USAGE',
                severity='CRITICAL',
                description=f'CPU usage is critically high: {cpu_usage:.1f}%',
                timestamp=datetime.now(),
                metadata={'value': cpu_usage, 'threshold': self.thresholds['cpu_usage']['critical']}
            ))
        elif cpu_usage > self.thresholds['cpu_usage']['warning']:
            problems.append(Problem(
                type='HIGH_CPU_USAGE',
                severity='WARNING',
                description=f'CPU usage is high: {cpu_usage:.1f}%',
                timestamp=datetime.now(),
                metadata={'value': cpu_usage, 'threshold': self.thresholds['cpu_usage']['warning']}
            ))
        
        # Check Memory usage
        memory_usage = metrics.get('memoryUsage', 0)
        if memory_usage > self.thresholds['memory_usage']['critical']:
            problems.append(Problem(
                type='HIGH_MEMORY_USAGE',
                severity='CRITICAL',
                description=f'Memory usage is critically high: {memory_usage:.1f}%',
                timestamp=datetime.now(),
                metadata={'value': memory_usage, 'threshold': self.thresholds['memory_usage']['critical']}
            ))
        elif memory_usage > self.thresholds['memory_usage']['warning']:
            problems.append(Problem(
                type='HIGH_MEMORY_USAGE',
                severity='WARNING',
                description=f'Memory usage is high: {memory_usage:.1f}%',
                timestamp=datetime.now(),
                metadata={'value': memory_usage, 'threshold': self.thresholds['memory_usage']['warning']}
            ))
        
        return problems
    
    async def run(self, metrics_stream):
        async for metrics in metrics_stream:
            problems = await self.detect_problems(metrics)
            for problem in problems:
                print(f"Problem detected: {problem}")

if __name__ == "__main__":
    detector = ThresholdDetector()
    # Example usage with mock metrics
    mock_metrics = {'cpuUsage': 85, 'memoryUsage': 90, 'diskUsage': 75}
    problems = asyncio.run(detector.detect_problems(mock_metrics))
    for problem in problems:
        print(problem)`
    },
    security_monitor: {
      name: 'Security Monitor',
      description: 'Monitors for security-related issues and anomalies',
      code: `import psutil
import asyncio
import os
from datetime import datetime
from dataclasses import dataclass
from typing import List, Dict, Any

@dataclass
class SecurityIssue:
    type: str
    severity: str
    description: str
    timestamp: datetime
    metadata: Dict[str, Any]

class SecurityMonitor:
    def __init__(self):
        self.name = "security_monitor"
        self.version = "1.0.0"
        self.type = "detector"
        self.max_processes = 500
        self.suspicious_processes = ['nc', 'netcat', 'nmap']
    
    async def check_process_count(self) -> List[SecurityIssue]:
        issues = []
        process_count = len(psutil.pids())
        
        if process_count > self.max_processes:
            issues.append(SecurityIssue(
                type='EXCESSIVE_PROCESSES',
                severity='WARNING',
                description=f'High number of processes detected: {process_count}',
                timestamp=datetime.now(),
                metadata={'process_count': process_count, 'threshold': self.max_processes}
            ))
        
        return issues
    
    async def check_suspicious_processes(self) -> List[SecurityIssue]:
        issues = []
        
        for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
            try:
                if proc.info['name'] in self.suspicious_processes:
                    issues.append(SecurityIssue(
                        type='SUSPICIOUS_PROCESS',
                        severity='HIGH',
                        description=f'Suspicious process detected: {proc.info["name"]} (PID: {proc.info["pid"]})',
                        timestamp=datetime.now(),
                        metadata={
                            'process_name': proc.info['name'],
                            'pid': proc.info['pid'],
                            'cmdline': proc.info['cmdline']
                        }
                    ))
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue
        
        return issues
    
    async def monitor_security(self) -> List[SecurityIssue]:
        all_issues = []
        
        # Check process count
        process_issues = await self.check_process_count()
        all_issues.extend(process_issues)
        
        # Check for suspicious processes
        suspicious_issues = await self.check_suspicious_processes()
        all_issues.extend(suspicious_issues)
        
        return all_issues
    
    async def run(self):
        while True:
            issues = await self.monitor_security()
            for issue in issues:
                print(f"Security Issue: {issue}")
            await asyncio.sleep(60)  # Check every minute

if __name__ == "__main__":
    monitor = SecurityMonitor()
    asyncio.run(monitor.run())`
    }
  },
  remediator: {
    auto_remediator: {
      name: 'Auto Remediator',
      description: 'Automatically attempts to fix common system issues',
      code: `import asyncio
import subprocess
import gc
from datetime import datetime
from typing import Dict, Any, List

class AutoRemediator:
    def __init__(self):
        self.name = "auto_remediator"
        self.version = "1.0.0"
        self.type = "remediator"
        self.safe_mode = True
        self.max_actions_per_hour = 5
        self.actions_taken = []
    
    async def remediate_high_memory(self, problem_data: Dict[str, Any]) -> bool:
        """Attempt to free memory by running garbage collection"""
        try:
            if self.safe_mode:
                print("Safe mode: Running garbage collection")
                gc.collect()
                return True
            else:
                print("Aggressive mode: Running system memory cleanup")
                # More aggressive memory cleanup could go here
                gc.collect()
                return True
        except Exception as e:
            print(f"Failed to remediate memory issue: {e}")
            return False
    
    async def remediate_high_cpu(self, problem_data: Dict[str, Any]) -> bool:
        """Attempt to reduce CPU usage by identifying resource-heavy processes"""
        try:
            import psutil
            
            print("Identifying high CPU processes...")
            processes = [(p.info['pid'], p.info['name'], p.info['cpu_percent']) 
                        for p in psutil.process_iter(['pid', 'name', 'cpu_percent'])
                        if p.info['cpu_percent'] > 50]
            
            processes.sort(key=lambda x: x[2], reverse=True)
            
            if processes:
                top_process = processes[0]
                print(f"Top CPU consumer: {top_process[1]} (PID: {top_process[0]}, CPU: {top_process[2]}%)")
                
                if self.safe_mode:
                    print("Safe mode: Only reporting, not taking action")
                    return True
                else:
                    print("Would attempt to nice/renice high CPU processes")
                    return True
            
            return True
        except Exception as e:
            print(f"Failed to remediate CPU issue: {e}")
            return False
    
    async def remediate_disk_space(self, problem_data: Dict[str, Any]) -> bool:
        """Attempt to free disk space by cleaning temporary files"""
        try:
            if self.safe_mode:
                print("Safe mode: Would clean temporary files and logs")
                # In safe mode, just report what would be done
                return True
            else:
                print("Attempting to clean temporary files...")
                # Could implement actual cleanup here
                return True
        except Exception as e:
            print(f"Failed to remediate disk space issue: {e}")
            return False
    
    async def remediate_problem(self, problem_type: str, problem_data: Dict[str, Any]) -> bool:
        """Route problem to appropriate remediation method"""
        
        # Check rate limiting
        current_hour = datetime.now().hour
        recent_actions = [a for a in self.actions_taken 
                         if a['timestamp'].hour == current_hour]
        
        if len(recent_actions) >= self.max_actions_per_hour:
            print(f"Rate limit reached: {len(recent_actions)} actions this hour")
            return False
        
        success = False
        
        if problem_type == 'HIGH_MEMORY_USAGE':
            success = await self.remediate_high_memory(problem_data)
        elif problem_type == 'HIGH_CPU_USAGE':
            success = await self.remediate_high_cpu(problem_data)
        elif problem_type == 'LOW_DISK_SPACE':
            success = await self.remediate_disk_space(problem_data)
        else:
            print(f"No remediation available for problem type: {problem_type}")
            return False
        
        # Log the action
        if success:
            self.actions_taken.append({
                'timestamp': datetime.now(),
                'problem_type': problem_type,
                'success': success
            })
        
        return success
    
    async def run(self, problem_stream):
        async for problem in problem_stream:
            result = await self.remediate_problem(problem['type'], problem)
            if result:
                print(f"Successfully remediated {problem['type']}")
            else:
                print(f"Failed to remediate {problem['type']}")

if __name__ == "__main__":
    remediator = AutoRemediator()
    # Example usage
    mock_problem = {'type': 'HIGH_MEMORY_USAGE', 'severity': 'WARNING'}
    result = asyncio.run(remediator.remediate_problem('HIGH_MEMORY_USAGE', mock_problem))
    print(f"Remediation result: {result}")`
    }
  }
};

export default function Plugins() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showEditor, setShowEditor] = useState(false);
  const [showDefaultPlugins, setShowDefaultPlugins] = useState(false);
  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [pluginCode, setPluginCode] = useState('');
  const [pluginName, setPluginName] = useState('');
  const [pluginDescription, setPluginDescription] = useState('');
  const [pluginType, setPluginType] = useState<'collector' | 'detector' | 'remediator'>('collector');

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

  const createPluginMutation = useMutation({
    mutationFn: (pluginData: any) => api.createPlugin(pluginData),
    onSuccess: () => {
      toast({
        title: "Plugin Created",
        description: "The plugin has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      setShowEditor(false);
      resetEditor();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create plugin. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePluginMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.updatePlugin(id, data),
    onSuccess: () => {
      toast({
        title: "Plugin Updated",
        description: "The plugin has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
      setShowEditor(false);
      resetEditor();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update plugin. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startPluginMutation = useMutation({
    mutationFn: (pluginId: string) => api.post(`/api/plugins/${pluginId}/start`),
    onSuccess: (_, pluginId) => {
      toast({
        title: "Plugin Started",
        description: "The plugin has been started successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start plugin. Please try again.",
        variant: "destructive",
      });
    },
  });

  const stopPluginMutation = useMutation({
    mutationFn: (pluginId: string) => api.post(`/api/plugins/${pluginId}/stop`),
    onSuccess: (_, pluginId) => {
      toast({
        title: "Plugin Stopped",
        description: "The plugin has been stopped successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/plugins'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to stop plugin. Please try again.",
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

  const resetEditor = () => {
    setPluginCode('');
    setPluginName('');
    setPluginDescription('');
    setPluginType('collector');
    setSelectedPlugin(null);
    setEditorMode('create');
  };

  const handleCreatePlugin = () => {
    setEditorMode('create');
    resetEditor();
    setShowEditor(true);
  };

  const handleEditPlugin = (plugin: Plugin) => {
    setEditorMode('edit');
    setSelectedPlugin(plugin);
    setPluginName(plugin.name);
    setPluginDescription(plugin.metadata?.description || '');
    setPluginType(plugin.type as 'collector' | 'detector' | 'remediator');
    setPluginCode(plugin.metadata?.code || '# Plugin code here');
    setShowEditor(true);
  };

  const handleLoadDefaultPlugin = (type: string, template: string) => {
    const defaultPlugin = (defaultPlugins as any)[type][template];
    if (defaultPlugin) {
      setPluginName(defaultPlugin.name);
      setPluginDescription(defaultPlugin.description);
      setPluginType(type as 'collector' | 'detector' | 'remediator');
      setPluginCode(defaultPlugin.code);
      setShowDefaultPlugins(false);
      setShowEditor(true);
    }
  };

  const handleSavePlugin = () => {
    const pluginData = {
      name: pluginName,
      version: '1.0.0',
      type: pluginType,
      status: 'running',
      config: {},
      metadata: {
        description: pluginDescription,
        code: pluginCode
      }
    };

    if (editorMode === 'create') {
      createPluginMutation.mutate(pluginData);
    } else if (selectedPlugin) {
      updatePluginMutation.mutate({ id: selectedPlugin.id, ...pluginData });
    }
  };

  const handleStartPlugin = (pluginId: string) => {
    startPluginMutation.mutate(pluginId);
  };

  const handleStopPlugin = (pluginId: string) => {
    stopPluginMutation.mutate(pluginId);
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

          {/* Plugin Management */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Plugin Management</h3>
                <div className="flex space-x-2">
                  <Button onClick={() => setShowDefaultPlugins(true)} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Default Plugins
                  </Button>
                  <Button onClick={handleCreatePlugin} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Plugin
                  </Button>
                </div>
              </div>
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
                              <div className="flex space-x-1">
                                {plugin.status === 'running' ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStopPlugin(plugin.id)}
                                    disabled={stopPluginMutation.isPending}
                                  >
                                    <Pause className="h-4 w-4" />
                                  </Button>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleStartPlugin(plugin.id)}
                                    disabled={startPluginMutation.isPending}
                                  >
                                    <Play className="h-4 w-4" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditPlugin(plugin)}
                                >
                                  <Code className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                >
                                  <Settings className="h-4 w-4" />
                                </Button>
                              </div>
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

      {/* Plugin Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editorMode === 'create' ? 'Create New Plugin' : 'Edit Plugin'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="plugin-name">Plugin Name</Label>
                <Input
                  id="plugin-name"
                  value={pluginName}
                  onChange={(e) => setPluginName(e.target.value)}
                  placeholder="Enter plugin name"
                />
              </div>
              <div>
                <Label htmlFor="plugin-type">Plugin Type</Label>
                <Select value={pluginType} onValueChange={(value: 'collector' | 'detector' | 'remediator') => setPluginType(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="collector">Collector</SelectItem>
                    <SelectItem value="detector">Detector</SelectItem>
                    <SelectItem value="remediator">Remediator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="plugin-description">Description</Label>
              <Input
                id="plugin-description"
                value={pluginDescription}
                onChange={(e) => setPluginDescription(e.target.value)}
                placeholder="Enter plugin description"
              />
            </div>
            
            <div>
              <Label htmlFor="plugin-code">Plugin Code (Python)</Label>
              <Textarea
                id="plugin-code"
                value={pluginCode}
                onChange={(e) => setPluginCode(e.target.value)}
                placeholder="Enter your Python plugin code here..."
                className="min-h-[400px] font-mono text-sm"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditor(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSavePlugin}
              disabled={!pluginName || !pluginCode || createPluginMutation.isPending || updatePluginMutation.isPending}
            >
              {editorMode === 'create' ? 'Create Plugin' : 'Update Plugin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Default Plugins Dialog */}
      <Dialog open={showDefaultPlugins} onOpenChange={setShowDefaultPlugins}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Default Plugin Templates</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="collector" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="collector">Collectors</TabsTrigger>
              <TabsTrigger value="detector">Detectors</TabsTrigger>
              <TabsTrigger value="remediator">Remediators</TabsTrigger>
            </TabsList>
            
            <TabsContent value="collector" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(defaultPlugins.collector).map(([key, plugin]) => (
                  <Card key={key} className="cursor-pointer hover:bg-gray-50" onClick={() => handleLoadDefaultPlugin('collector', key)}>
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <Database className="h-5 w-5 text-blue-500" />
                        <h4 className="font-medium">{plugin.name}</h4>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{plugin.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="detector" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(defaultPlugins.detector).map(([key, plugin]) => (
                  <Card key={key} className="cursor-pointer hover:bg-gray-50" onClick={() => handleLoadDefaultPlugin('detector', key)}>
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-5 w-5 text-orange-500" />
                        <h4 className="font-medium">{plugin.name}</h4>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{plugin.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="remediator" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(defaultPlugins.remediator).map(([key, plugin]) => (
                  <Card key={key} className="cursor-pointer hover:bg-gray-50" onClick={() => handleLoadDefaultPlugin('remediator', key)}>
                    <CardHeader>
                      <div className="flex items-center space-x-2">
                        <Wrench className="h-5 w-5 text-green-500" />
                        <h4 className="font-medium">{plugin.name}</h4>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{plugin.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDefaultPlugins(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
