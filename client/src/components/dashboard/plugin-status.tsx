import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { Plugin } from "@shared/schema";

interface PluginStatusProps {
  plugins: Plugin[];
}

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

export function PluginStatus({ plugins }: PluginStatusProps) {
  return (
    <Card data-testid="plugin-status" className="border border-gray-200">
      <CardHeader className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Active Plugins</h3>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-gray-200">
          {plugins.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No plugins loaded
            </div>
          ) : (
            plugins.map((plugin) => (
              <div key={plugin.id} className="px-6 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <StatusIndicator 
                      status={getPluginStatus(plugin.status)}
                      animated={plugin.status === 'running'}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {plugin.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {plugin.version} • {plugin.type}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 capitalize">
                    {plugin.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
