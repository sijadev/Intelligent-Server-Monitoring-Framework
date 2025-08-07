import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePageTitle } from "@/hooks/use-page-title";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Download, Filter, Server, Terminal, Globe, Database } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { LogFilterOptions, LogEntry } from "@shared/schema";

const logLevelColors = {
  ERROR: "bg-red-100 text-red-800",
  WARN: "bg-orange-100 text-orange-800",
  WARNING: "bg-orange-100 text-orange-800",
  INFO: "bg-blue-100 text-blue-800",
  DEBUG: "bg-gray-100 text-gray-800"
};

const sourceIcons = {
  server: Server,
  http: Globe,
  websocket: Terminal,
  database: Database,
  'python-framework': Terminal,
  plugin: Terminal,
  system: Server
};

export default function Logs() {
  usePageTitle("Logs");
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [limit, _setLimit] = useState(100);
  const [activeTab, setActiveTab] = useState("all");

  // Build filter options
  const filterOptions: LogFilterOptions = {
    limit,
    ...(levelFilter !== "all" && { level: levelFilter }),
    ...(sourceFilter !== "all" && { source: sourceFilter }),
  };

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/logs', filterOptions],
    queryFn: () => api.getLogs(filterOptions),
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });

  // Filter logs by search term and tab
  const filteredLogs = logs.filter(log => {
    // Tab filtering
    if (activeTab === "server" && !['server', 'http', 'websocket', 'database'].includes(log.source)) return false;
    if (activeTab === "python" && log.source !== 'python-framework') return false;
    if (activeTab === "plugins" && log.source !== 'plugin') return false;
    if (activeTab === "system" && !['system', 'plugin', 'python-framework'].includes(log.source)) return false;
    
    // Search filtering
    return searchTerm === "" || 
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.source.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Get unique sources for filter dropdown
  const uniqueSources = Array.from(new Set(logs.map(log => log.source)));

  // Separate logs by category
  const serverLogs = logs.filter(log => ['server', 'http', 'websocket', 'database'].includes(log.source));
  const pythonLogs = logs.filter(log => log.source === 'python-framework');
  const pluginLogs = logs.filter(log => log.source === 'plugin');
  const systemLogs = logs.filter(log => ['system', 'plugin', 'python-framework'].includes(log.source));

  const handleExport = () => {
    const csvContent = [
      ['Timestamp', 'Level', 'Source', 'Message'].join(','),
      ...filteredLogs.map(log => [
        new Date(log.timestamp).toISOString(),
        log.level,
        log.source,
        `"${log.message.replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderLogEntry = (log: LogEntry) => {
    const SourceIcon = sourceIcons[log.source as keyof typeof sourceIcons] || Terminal;
    
    return (
      <div key={`${log.timestamp}-${log.source}-${log.message.slice(0, 50)}`} className="border-b border-gray-200 py-4 last:border-b-0">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-1">
            <SourceIcon className="h-4 w-4 text-gray-500" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Badge
                variant="outline"
                className={cn("text-xs", logLevelColors[log.level as keyof typeof logLevelColors])}
              >
                {log.level}
              </Badge>
              <span className="text-sm text-gray-500">{log.source}</span>
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
              </span>
            </div>
            <p className="text-sm text-gray-900 break-words font-mono">
              {log.message}
            </p>
            {log.metadata && typeof log.metadata === 'object' && Object.keys(log.metadata).length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                  Show metadata
                </summary>
                <pre className="text-xs text-gray-600 mt-1 bg-gray-50 p-2 rounded overflow-auto">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="System Logs"
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
      />
      
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <h3 className="text-lg font-medium">Log Filters</h3>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="ERROR">Error</SelectItem>
                    <SelectItem value="WARN">Warning</SelectItem>
                    <SelectItem value="INFO">Info</SelectItem>
                    <SelectItem value="DEBUG">Debug</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sources</SelectItem>
                    {uniqueSources.map(source => (
                      <SelectItem key={source} value={source}>
                        {source}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button onClick={handleExport} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Log Categories Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <span>All ({logs.length})</span>
              </TabsTrigger>
              <TabsTrigger value="server" className="flex items-center space-x-2">
                <Server className="h-4 w-4" />
                <span>Server ({serverLogs.length})</span>
              </TabsTrigger>
              <TabsTrigger value="python" className="flex items-center space-x-2">
                <Terminal className="h-4 w-4" />
                <span>Python ({pythonLogs.length})</span>
              </TabsTrigger>
              <TabsTrigger value="plugins" className="flex items-center space-x-2">
                <Terminal className="h-4 w-4" />
                <span>Plugins ({pluginLogs.length})</span>
              </TabsTrigger>
              <TabsTrigger value="system" className="flex items-center space-x-2">
                <Database className="h-4 w-4" />
                <span>System ({systemLogs.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">All System Logs</h3>
                  <p className="text-sm text-gray-500">Real-time logs from all system components</p>
                </CardHeader>
                <CardContent>
                  {filteredLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No logs found matching your filters.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredLogs.slice(0, 50).map(renderLogEntry)}
                      {filteredLogs.length > 50 && (
                        <div className="text-center py-4 text-gray-500">
                          Showing 50 of {filteredLogs.length} logs. Use filters to narrow down results.
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="server" className="mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Server Logs</h3>
                  <p className="text-sm text-gray-500">HTTP requests, WebSocket connections, and database operations</p>
                </CardHeader>
                <CardContent>
                  {serverLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No server logs found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {serverLogs.filter(log => 
                        searchTerm === "" || 
                        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        log.source.toLowerCase().includes(searchTerm.toLowerCase())
                      ).slice(0, 50).map(renderLogEntry)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="python" className="mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Python Framework Logs</h3>
                  <p className="text-sm text-gray-500">MCP.Guard framework events and operations</p>
                </CardHeader>
                <CardContent>
                  {pythonLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No Python framework logs found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pythonLogs.filter(log => 
                        searchTerm === "" || 
                        log.message.toLowerCase().includes(searchTerm.toLowerCase())
                      ).slice(0, 50).map(renderLogEntry)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="plugins" className="mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Plugin Logs</h3>
                  <p className="text-sm text-gray-500">Individual plugin operations and events</p>
                </CardHeader>
                <CardContent>
                  {pluginLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No plugin logs found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {pluginLogs.filter(log => 
                        searchTerm === "" || 
                        log.message.toLowerCase().includes(searchTerm.toLowerCase())
                      ).slice(0, 50).map(renderLogEntry)}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="mt-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">System Logs</h3>
                  <p className="text-sm text-gray-500">Overall system events and operations</p>
                </CardHeader>
                <CardContent>
                  {systemLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No system logs found.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {systemLogs.filter(log => 
                        searchTerm === "" || 
                        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        log.source.toLowerCase().includes(searchTerm.toLowerCase())
                      ).slice(0, 50).map(renderLogEntry)}
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