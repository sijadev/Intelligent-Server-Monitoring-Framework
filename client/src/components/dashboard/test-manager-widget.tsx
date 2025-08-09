/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestTube, Play, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { Link } from 'wouter';

export function TestManagerWidget() {
  // Fetch test manager status
  const { data: status, error: statusError } = useQuery({
    queryKey: ['/api/test-manager/status'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching test manager status...');
        const response = await api.testManagerGet('/test-manager/status');
        console.log('📊 Status response:', response);
        // Return the nested status object directly
        return response.status || response;
      } catch (error) {
        console.error('❌ Status fetch error:', error);
        // Return a default status structure on error
        return {
          initialized: false,
          active: false,
          activeGenerations: [],
          generationCapacity: 0,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
    refetchInterval: 10000,
    retry: false, // Don't retry automatically
    refetchOnWindowFocus: false,
  });

  // Fetch recent generated data
  const { data: generatedData = [] } = useQuery({
    queryKey: ['/api/test-manager/generated-data'],
    queryFn: async () => {
      try {
        console.log('🔍 Fetching test manager generated data...');
        const response = await api.testManagerGet('/test-manager/generated-data');
        console.log('📊 Generated data response:', response);
        const dataArray = response.data || response;
        return Array.isArray(dataArray) ? dataArray.slice(0, 3) : [];
      } catch (error) {
        console.error('❌ Generated data fetch error:', error);
        return [];
      }
    },
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div data-testid="test-manager-widget" className="space-y-3">
      {/* Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            Test Manager Status
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() =>
                document
                  .getElementById('realtime-log-stream')
                  ?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              Logs
            </Button>
          </CardTitle>
          <TestTube className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={status?.initialized || status?.active ? 'default' : 'destructive'}>
                {status?.initialized || status?.active ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Active
                  </>
                ) : statusError ? (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Connection Error
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Inactive
                  </>
                )}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Generations</span>
              <div className="flex items-center">
                {status?.activeGenerations?.length > 0 && (
                  <Clock className="h-3 w-3 mr-1 animate-spin" />
                )}
                <span className="font-medium">{status?.activeGenerations?.length || 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Capacity</span>
              <span className="font-medium">{status?.generationCapacity || 0}</span>
            </div>
          </div>

          <div className="mt-3">
            <Link href="/test-manager">
              <Button size="sm" className="w-full">
                <TestTube className="h-3 w-3 mr-1" />
                Open Test Manager
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Generated Data */}
      <Card>
        <CardHeader className="py-3 flex flex-row items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Generated Datasets
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-5 px-2 text-[10px]"
                onClick={() =>
                  document
                    .getElementById('realtime-log-stream')
                    ?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Logs
              </Button>
            </CardTitle>
            <CardDescription className="mt-1">Recent test data generation results</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          {generatedData.length === 0 ? (
            <div className="text-center py-4">
              <Play className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No data generated yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {generatedData.map((data: any, index: number) => (
                <div key={index} className="p-2 border rounded">
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-medium text-sm">
                      {data.metadata?.profile?.name || data.profileId}
                    </div>
                    <Badge variant="outline" className="bg-green-50">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Complete
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>
                      <strong>Log Entries:</strong>{' '}
                      {data.statistics?.totalLogEntries?.toLocaleString() || 0}
                    </div>
                    <div>
                      <strong>Problems:</strong>{' '}
                      {data.statistics?.totalCodeProblems?.toLocaleString() || 0}
                    </div>
                    <div>
                      <strong>Metrics:</strong>{' '}
                      {data.statistics?.totalMetricPoints?.toLocaleString() || 0}
                    </div>
                    <div>
                      <strong>Size:</strong> {formatFileSize(data.statistics?.dataSize || 0)}
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground mt-1">
                    Generated:{' '}
                    {data.generatedAt ? new Date(data.generatedAt).toLocaleDateString() : 'Unknown'}
                  </div>
                </div>
              ))}

              <Link href="/test-manager">
                <Button size="sm" variant="outline" className="w-full mt-2">
                  View All Datasets
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
