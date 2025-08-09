import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePageTitle } from '@/hooks/use-page-title';
import { Header } from '@/components/layout/header';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Cpu, HardDrive, Activity, Network, Users } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { Metrics } from '@shared/schema';

const timeRanges = [
  { value: '1h', label: 'Last Hour', limit: 120 },
  { value: '6h', label: 'Last 6 Hours', limit: 360 },
  { value: '24h', label: 'Last 24 Hours', limit: 1440 },
  { value: '7d', label: 'Last 7 Days', limit: 10080 },
];

const COLORS = [
  'hsl(207, 90%, 54%)',
  'hsl(0, 84.2%, 60.2%)',
  'hsl(38, 92%, 50%)',
  'hsl(142, 71%, 45%)',
];

export default function Metrics() {
  usePageTitle('Metrics');
  const [timeRange, setTimeRange] = useState('6h');

  const selectedRange = timeRanges.find((r) => r.value === timeRange) || timeRanges[1];

  const {
    data: metricsHistory = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['/api/metrics', selectedRange.limit],
    queryFn: () => api.getMetrics(selectedRange.limit),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const { data: latestMetrics } = useQuery({
    queryKey: ['/api/metrics/latest'],
    queryFn: () => api.getLatestMetrics(),
    refetchInterval: 10000, // Refetch every 10 seconds
  });

  // Process data for charts
  const chartData = metricsHistory
    .slice(-100) // Limit to last 100 points for performance
    .map((metric) => ({
      time: new Date(metric.timestamp).toLocaleTimeString(),
      cpu: metric.cpuUsage || 0,
      memory: metric.memoryUsage || 0,
      disk: metric.diskUsage || 0,
      connections: metric.networkConnections || 0,
      processes: metric.processes || 0,
    }))
    .reverse();

  // Current usage for pie chart
  const currentUsageData = latestMetrics
    ? [
        { name: 'CPU', value: latestMetrics.cpuUsage || 0, color: COLORS[0] },
        { name: 'Memory', value: latestMetrics.memoryUsage || 0, color: COLORS[1] },
        { name: 'Disk', value: latestMetrics.diskUsage || 0, color: COLORS[2] },
      ]
    : [];

  const getUsageColor = (value: number) => {
    if (value >= 90) return 'text-red-600';
    if (value >= 75) return 'text-orange-600';
    return 'text-green-600';
  };

  const getProgressColor = (value: number) => {
    if (value >= 90) return 'bg-red-500';
    if (value >= 75) return 'bg-orange-500';
    return 'bg-primary';
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <Header title="Metrics" onRefresh={() => refetch()} isRefreshing={isLoading} />

      <main className="flex-1 relative overflow-y-auto focus:outline-none">
        <div className="py-6 px-6">
          {/* Time Range Selector */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">System Metrics</h2>
            <div className="flex items-center space-x-4">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {timeRanges.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant="outline">{isLoading ? 'Updating...' : 'Live'}</Badge>
            </div>
          </div>

          {/* Current Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">CPU Usage</p>
                    <p
                      className={cn(
                        'text-2xl font-semibold',
                        getUsageColor(latestMetrics?.cpuUsage || 0),
                      )}
                    >
                      {latestMetrics?.cpuUsage || 0}%
                    </p>
                  </div>
                  <Cpu className="h-8 w-8 text-gray-400" />
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'progress-bar',
                        `progress-${Math.round(Math.min(latestMetrics?.cpuUsage || 0, 100))}`,
                        getProgressColor(latestMetrics?.cpuUsage || 0),
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Memory Usage</p>
                    <p
                      className={cn(
                        'text-2xl font-semibold',
                        getUsageColor(latestMetrics?.memoryUsage || 0),
                      )}
                    >
                      {latestMetrics?.memoryUsage || 0}%
                    </p>
                  </div>
                  <Activity className="h-8 w-8 text-gray-400" />
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'progress-bar',
                        `progress-${Math.round(Math.min(latestMetrics?.memoryUsage || 0, 100))}`,
                        getProgressColor(latestMetrics?.memoryUsage || 0),
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Disk Usage</p>
                    <p
                      className={cn(
                        'text-2xl font-semibold',
                        getUsageColor(latestMetrics?.diskUsage || 0),
                      )}
                    >
                      {latestMetrics?.diskUsage || 0}%
                    </p>
                  </div>
                  <HardDrive className="h-8 w-8 text-gray-400" />
                </div>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={cn(
                        'progress-bar',
                        `progress-${Math.round(Math.min(latestMetrics?.diskUsage || 0, 100))}`,
                        getProgressColor(latestMetrics?.diskUsage || 0),
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Network Connections</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {latestMetrics?.networkConnections || 0}
                    </p>
                  </div>
                  <Network className="h-8 w-8 text-gray-400" />
                </div>
                <div className="mt-4">
                  <p className="text-xs text-gray-500">Active connections</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Processes</p>
                    <p className="text-2xl font-semibold text-gray-900">
                      {latestMetrics?.processes || 0}
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <div className="mt-4">
                  <p className="text-xs text-gray-500">Running processes</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* System Usage Trend */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <h3 className="text-lg font-medium">System Usage Trend</h3>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="cpu"
                        stroke={COLORS[0]}
                        strokeWidth={2}
                        name="CPU %"
                      />
                      <Line
                        type="monotone"
                        dataKey="memory"
                        stroke={COLORS[1]}
                        strokeWidth={2}
                        name="Memory %"
                      />
                      <Line
                        type="monotone"
                        dataKey="disk"
                        stroke={COLORS[2]}
                        strokeWidth={2}
                        name="Disk %"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Current Usage Distribution */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Current Usage</h3>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={currentUsageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {currentUsageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Network and Process Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Network Connections</h3>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.slice(-20)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="connections" fill={COLORS[0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Process Count</h3>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData.slice(-20)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="processes" fill={COLORS[3]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Metrics Summary */}
          {latestMetrics && (
            <Card className="mt-6">
              <CardHeader>
                <h3 className="text-lg font-medium">Latest Metrics Summary</h3>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-900">Load Average</p>
                    <p className="text-gray-600">
                      {latestMetrics.loadAverage?.toFixed(2) || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Last Updated</p>
                    <p className="text-gray-600">
                      {formatDistanceToNow(new Date(latestMetrics.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Data Points</p>
                    <p className="text-gray-600">{metricsHistory.length} collected</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Time Range</p>
                    <p className="text-gray-600">{selectedRange.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
