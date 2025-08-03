import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Save, RotateCcw } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { FrameworkConfig } from "@shared/schema";

const configSchema = z.object({
  serverType: z.string(),
  monitoringInterval: z.number().min(1).max(3600),
  learningEnabled: z.boolean(),
  autoRemediation: z.boolean(),
  logLevel: z.string(),
  dataDir: z.string(),
});

type ConfigFormData = z.infer<typeof configSchema>;

interface LogFile {
  path: string;
  type: string;
}

export default function Configuration() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [newLogFile, setNewLogFile] = useState({ path: "", type: "application" });

  const { data: config, isLoading, refetch } = useQuery({
    queryKey: ['/api/config'],
    queryFn: () => api.getConfig(),
  });

  const updateConfigMutation = useMutation({
    mutationFn: (configData: Partial<FrameworkConfig>) => api.updateConfig(configData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/config'] });
      queryClient.invalidateQueries({ queryKey: ['/api/framework/status'] });
      toast({
        title: "Configuration Updated",
        description: "Framework configuration has been updated and framework will restart.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update configuration. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<ConfigFormData>({
    resolver: zodResolver(configSchema),
    defaultValues: {
      serverType: config?.serverType || "generic",
      monitoringInterval: config?.monitoringInterval || 30,
      learningEnabled: config?.learningEnabled || true,
      autoRemediation: config?.autoRemediation || true,
      logLevel: config?.logLevel || "INFO",
      dataDir: config?.dataDir || "./data",
    },
  });

  // Update form when config loads
  React.useEffect(() => {
    if (config) {
      form.reset({
        serverType: config.serverType || "generic",
        monitoringInterval: config.monitoringInterval || 30,
        learningEnabled: config.learningEnabled || true,
        autoRemediation: config.autoRemediation || true,
        logLevel: config.logLevel || "INFO",
        dataDir: config.dataDir || "./data",
      });
      if (Array.isArray(config.logFiles)) {
        setLogFiles(config.logFiles as LogFile[]);
      }
    }
  }, [config, form]);

  const onSubmit = (data: ConfigFormData) => {
    updateConfigMutation.mutate({
      ...data,
      logFiles: logFiles,
      updatedAt: new Date(),
    });
  };

  const addLogFile = () => {
    if (newLogFile.path.trim()) {
      setLogFiles([...logFiles, { ...newLogFile }]);
      setNewLogFile({ path: "", type: "application" });
    }
  };

  const removeLogFile = (index: number) => {
    setLogFiles(logFiles.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading configuration...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header
        title="Configuration"
        onRefresh={() => refetch()}
        isRefreshing={isLoading}
      />
      
      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* General Settings */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">General Settings</h3>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="serverType">Server Type</Label>
                    <Select
                      value={form.watch("serverType")}
                      onValueChange={(value) => form.setValue("serverType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="generic">Generic</SelectItem>
                        <SelectItem value="web">Web Server</SelectItem>
                        <SelectItem value="database">Database Server</SelectItem>
                        <SelectItem value="api">API Server</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="monitoringInterval">Monitoring Interval (seconds)</Label>
                    <Input
                      type="number"
                      min="1"
                      max="3600"
                      {...form.register("monitoringInterval", { valueAsNumber: true })}
                    />
                    {form.formState.errors.monitoringInterval && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.monitoringInterval.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logLevel">Log Level</Label>
                    <Select
                      value={form.watch("logLevel")}
                      onValueChange={(value) => form.setValue("logLevel", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DEBUG">DEBUG</SelectItem>
                        <SelectItem value="INFO">INFO</SelectItem>
                        <SelectItem value="WARNING">WARNING</SelectItem>
                        <SelectItem value="ERROR">ERROR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dataDir">Data Directory</Label>
                    <Input {...form.register("dataDir")} />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Learning</Label>
                      <p className="text-sm text-gray-500">
                        Allow the framework to learn from interventions and improve over time
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("learningEnabled")}
                      onCheckedChange={(checked) => form.setValue("learningEnabled", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto Remediation</Label>
                      <p className="text-sm text-gray-500">
                        Automatically attempt to resolve detected problems
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("autoRemediation")}
                      onCheckedChange={(checked) => form.setValue("autoRemediation", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Log Files Configuration */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Log Files</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Existing Log Files */}
                <div className="space-y-3">
                  {logFiles.map((logFile, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{logFile.path}</div>
                        <Badge variant="outline" className="mt-1">
                          {logFile.type}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLogFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Add New Log File */}
                <div className="border-t pt-4">
                  <div className="flex space-x-2">
                    <div className="flex-1">
                      <Input
                        placeholder="Log file path (e.g., /var/log/application.log)"
                        value={newLogFile.path}
                        onChange={(e) => setNewLogFile({ ...newLogFile, path: e.target.value })}
                      />
                    </div>
                    <Select
                      value={newLogFile.type}
                      onValueChange={(value) => setNewLogFile({ ...newLogFile, type: value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="application">Application</SelectItem>
                        <SelectItem value="system">System</SelectItem>
                        <SelectItem value="security">Security</SelectItem>
                        <SelectItem value="access">Access</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      onClick={addLogFile}
                      variant="outline"
                      disabled={!newLogFile.path.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  if (Array.isArray(config?.logFiles)) {
                    setLogFiles(config.logFiles as LogFile[]);
                  }
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button
                type="submit"
                disabled={updateConfigMutation.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {updateConfigMutation.isPending ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
