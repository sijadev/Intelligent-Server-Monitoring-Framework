import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Metrics } from '@shared/schema';

interface SystemInfoProps {
  metrics?: Metrics | null;
  uptime?: string;
}

export function SystemInfo({ metrics, uptime }: SystemInfoProps) {
  const getProgressColor = (value: number) => {
    if (value >= 90) return 'bg-red-500';
    if (value >= 75) return 'bg-orange-500';
    return 'bg-primary';
  };

  const systemMetrics = [
    {
      label: 'CPU Usage',
      value: metrics?.cpuUsage || 0,
      unit: '%',
    },
    {
      label: 'Memory Usage',
      value: metrics?.memoryUsage || 0,
      unit: '%',
    },
    {
      label: 'Disk Usage',
      value: metrics?.diskUsage || 0,
      unit: '%',
    },
  ];

  return (
    <div data-testid="system-info">
      <Card className="border border-gray-200 mb-4">
        <CardHeader className="px-5 py-3 border-b border-gray-200">
          <h3 className="text-base font-medium text-gray-900">System Information</h3>
        </CardHeader>
        <CardContent className="px-5 py-3 space-y-3">
          {systemMetrics.map((metric) => (
            <div key={metric.label}>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-gray-500">{metric.label}</span>
                <span className="text-sm font-medium text-gray-900">
                  {metric.value}
                  {metric.unit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={cn(
                    'progress-bar',
                    `progress-${Math.round(Math.min(metric.value, 100))}`,
                    getProgressColor(metric.value),
                  )}
                />
              </div>
            </div>
          ))}

          {uptime && (
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Uptime</span>
                <span className="font-medium text-gray-900">{uptime}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
