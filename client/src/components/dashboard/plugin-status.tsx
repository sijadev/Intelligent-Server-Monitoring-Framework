/* eslint-disable @typescript-eslint/no-explicit-any */
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusIndicator } from '@/components/ui/status-indicator';
import type { Plugin } from '@shared/schema';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  const [showAll, setShowAll] = useState(false);
  const [collapsed, setCollapsed] = useState(true); // default collapsed
  const display = plugins.slice(0, 5);
  const scrollClass =
    plugins.length > 5
      ? 'max-h-72 overflow-y-auto divide-y divide-gray-200'
      : 'divide-y divide-gray-200';
  return (
    <>
      <Card data-testid="plugin-status" className="border border-gray-200">
        <CardHeader className="px-5 py-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-expanded={!collapsed}
                aria-controls="active-plugins-content"
                onClick={() => setCollapsed((c) => !c)}
                className="inline-flex items-center justify-center h-6 w-6 rounded border text-sm hover:bg-muted transition"
              >
                {collapsed ? '+' : '–'}
              </button>
              <h3 className="text-lg font-medium text-gray-900">Active Plugins</h3>
              <span className="text-xs text-gray-500">({plugins.length})</span>
            </div>
            <div className="flex items-center gap-2">
              {plugins.length > 5 && (
                <Button size="sm" variant="outline" onClick={() => setShowAll(true)}>
                  Show All ({plugins.length})
                </Button>
              )}
              {collapsed && plugins.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setCollapsed(false)}>
                  Expand
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        {!collapsed && (
          <CardContent id="active-plugins-content" className="p-0">
            {plugins.length === 0 ? (
              <div className="px-5 py-6 text-center text-gray-500">No plugins loaded</div>
            ) : (
              <div className={scrollClass}>
                {display.map((plugin) => (
                  <div key={plugin.id} className="px-5 py-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <StatusIndicator
                          status={getPluginStatus(plugin.status)}
                          animated={plugin.status === 'running'}
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{plugin.name}</p>
                          <p className="text-xs text-gray-500">
                            {plugin.version} • {plugin.type}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 capitalize">{plugin.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>
      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Active Plugins</DialogTitle>
            <DialogDescription>Total: {plugins.length}</DialogDescription>
          </DialogHeader>
          <div className="divide-y divide-gray-200">
            {plugins.map((plugin) => (
              <div key={plugin.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <StatusIndicator
                      status={getPluginStatus(plugin.status)}
                      animated={plugin.status === 'running'}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{plugin.name}</p>
                      <p className="text-xs text-gray-500">
                        {plugin.version} • {plugin.type}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 capitalize">{plugin.status}</span>
                </div>
                {plugin.config ? (
                  <pre className="mt-2 bg-gray-50 rounded p-2 text-xs overflow-x-auto whitespace-pre-wrap">
                    {String(JSON.stringify(plugin.config as any, null, 2))}
                  </pre>
                ) : null}
              </div>
            ))}
            {plugins.length === 0 && (
              <div className="text-sm text-gray-500 py-6 text-center">No plugins available.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
