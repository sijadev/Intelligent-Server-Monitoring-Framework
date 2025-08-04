import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [limit, setLimit] = useState(100);
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
    refetchInterval: 10000, // Refetch every 10 seconds
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

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="Log Analysis"
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
      />
      
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          {/* Filters */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Log Filters</h3>
                <Button onClick={handleExport} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
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
                    <SelectItem value="ERROR">ERROR</SelectItem>
                    <SelectItem value="WARNING">WARNING</SelectItem>
                    <SelectItem value="INFO">INFO</SelectItem>
                    <SelectItem value="DEBUG">DEBUG</SelectItem>
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

                <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="50">50 entries</SelectItem>
                    <SelectItem value="100">100 entries</SelectItem>
                    <SelectItem value="250">250 entries</SelectItem>
                    <SelectItem value="500">500 entries</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Log Entries */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">
                  Log Entries ({filteredLogs.length} of {logs.length})
                </h3>
                <Badge variant="outline">
                  {isLoading ? "Updating..." : "Live"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">Loading logs...</div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No log entries found matching your criteria
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredLogs.map((log, index) => (
                    <div 
                      key={`${log.id}-${index}`}
                      className="flex items-start space-x-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-shrink-0 text-sm text-gray-500 w-20">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </div>
                      <Badge 
                        variant="secondary"
                        className={cn(
                          "flex-shrink-0",
                          logLevelColors[log.level as keyof typeof logLevelColors] || "bg-gray-100 text-gray-800"
                        )}
                      >
                        {log.level}
                      </Badge>
                      <div className="flex-shrink-0 text-sm text-gray-600 w-24">
                        [{log.source}]
                      </div>
                      <div className="flex-1 text-sm text-gray-900 break-words">
                        {log.message}
                      </div>
                      <div className="flex-shrink-0 text-xs text-gray-400">
                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
