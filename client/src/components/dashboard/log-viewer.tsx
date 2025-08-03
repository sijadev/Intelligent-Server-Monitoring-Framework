import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, Eraser } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import type { LogEntry } from "@shared/schema";

interface LogViewerProps {
  logs: LogEntry[];
  onClear?: () => void;
  className?: string;
}

const logLevelColors = {
  ERROR: "bg-red-900 text-red-100",
  WARN: "bg-orange-900 text-orange-100",
  WARNING: "bg-orange-900 text-orange-100", 
  INFO: "bg-blue-900 text-blue-100",
  DEBUG: "bg-gray-700 text-gray-100"
};

export function LogViewer({ logs, onClear, className }: LogViewerProps) {
  const [isPaused, setIsPaused] = useState(false);
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let filtered = logs;
    
    if (levelFilter !== "all") {
      filtered = logs.filter(log => 
        log.level.toLowerCase() === levelFilter.toLowerCase()
      );
    }
    
    setFilteredLogs(filtered.slice(0, 100)); // Limit to last 100 entries
  }, [logs, levelFilter]);

  useEffect(() => {
    // Auto-scroll to bottom unless paused
    if (!isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, isPaused]);

  const handleClear = () => {
    setFilteredLogs([]);
    onClear?.();
  };

  return (
    <div className={className}>
      <Card className="border border-gray-200">
        <CardHeader className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Real-time Log Stream</h3>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Pause
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClear}
              >
                <Eraser className="h-4 w-4 mr-1" />
                Clear
              </Button>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  <SelectItem value="error">ERROR</SelectItem>
                  <SelectItem value="warning">WARNING</SelectItem>
                  <SelectItem value="info">INFO</SelectItem>
                  <SelectItem value="debug">DEBUG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div 
            ref={logContainerRef}
            className="h-64 overflow-y-auto bg-gray-900 text-gray-100 font-mono text-xs"
          >
            <div className="p-4 space-y-1">
              {filteredLogs.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  No log entries {levelFilter !== "all" && `for level: ${levelFilter.toUpperCase()}`}
                </div>
              ) : (
                filteredLogs.map((entry, index) => (
                  <div key={`${entry.id}-${index}`} className="flex items-start space-x-3">
                    <span className="text-gray-400 flex-shrink-0 w-20">
                      {new Date(entry.timestamp).toLocaleTimeString()}
                    </span>
                    <Badge 
                      variant="secondary"
                      className={cn(
                        "text-xs font-medium flex-shrink-0",
                        logLevelColors[entry.level as keyof typeof logLevelColors] || "bg-gray-700 text-gray-100"
                      )}
                    >
                      {entry.level}
                    </Badge>
                    <span className="text-gray-300 flex-shrink-0">
                      [{entry.source}]
                    </span>
                    <span className="text-gray-100 break-all">
                      {entry.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
