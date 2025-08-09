/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestTube, Play, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useState } from 'react';
import type { TestProfile } from '@shared/schema';
// Helper accessors for optional nested properties without broad any casts
type MaybeRecord = Record<string, unknown> | null | undefined;
const getObj = (v: unknown): MaybeRecord => (v && typeof v === 'object' ? (v as any) : undefined);
const getSourceConfig = (p: TestProfile) => getObj((p as any).sourceConfig);
const getLanguages = (p: TestProfile): string => {
  const sc = getSourceConfig(p);
  const langs = getObj(sc)?.languages;
  return Array.isArray(langs) ? langs.join(', ') : 'N/A';
};
const getComplexity = (p: TestProfile): string => {
  const sc = getSourceConfig(p);
  const c = getObj(sc)?.complexity;
  return typeof c === 'string' && c ? c : 'medium';
};
const getDescription = (p: TestProfile): string | null => {
  const d = (p as any).description;
  return typeof d === 'string' && d.trim() ? d : null;
};
const getScenarioCount = (p: TestProfile): number => {
  const s = (p as any).scenarios;
  return Array.isArray(s) ? s.length : 0;
};
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

  // Fetch all profiles (widget will show subset)
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['/api/test-manager/profiles', 'all'],
    queryFn: async () => {
      try {
        const response = await api.testManagerGet('/test-manager/profiles');
        const profilesData = response.profiles || response;
        return Array.isArray(profilesData) ? profilesData : [];
      } catch (error) {
        console.error('❌ Profiles fetch error:', error);
        return [];
      }
    },
  });
  const profiles = allProfiles.slice(0, 5);
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const profilesListClass =
    allProfiles.length > 5 ? 'max-h-56 overflow-y-auto pr-1 space-y-2' : 'space-y-2';

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
    <div data-testid="test-manager-widget" className="space-y-4">
      {/* Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Test Manager Status</CardTitle>
          <TestTube className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
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

          <div className="mt-4">
            <Link href="/test-manager">
              <Button size="sm" className="w-full">
                <TestTube className="h-3 w-3 mr-1" />
                Open Test Manager
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Profiles */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Recent Test Profiles</CardTitle>
          <CardDescription>Latest test configurations</CardDescription>
        </CardHeader>
        <CardContent>
          {profiles.length === 0 ? (
            <div className="text-center py-4">
              <TestTube className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No profiles created yet</p>
              <Link href="/test-manager">
                <Button size="sm" variant="outline" className="mt-2">
                  Create First Profile
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              <div className={profilesListClass}>
                {profiles.map((profile: TestProfile) => (
                  <div
                    key={profile.id}
                    className="flex items-center justify-between p-2 border rounded"
                  >
                    <div>
                      <div className="font-medium text-sm">{profile.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {getScenarioCount(profile)} scenarios • {getLanguages(profile)}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {getComplexity(profile)}
                    </Badge>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                {allProfiles.length > 5 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex-1"
                    onClick={() => setShowAllProfiles(true)}
                  >
                    Show All ({allProfiles.length})
                  </Button>
                )}
                <Link href="/test-manager" className="flex-1">
                  <Button size="sm" variant="outline" className="w-full mt-0">
                    Open Manager
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAllProfiles} onOpenChange={setShowAllProfiles}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>All Test Profiles</DialogTitle>
            <DialogDescription>Total: {allProfiles.length}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {allProfiles.map((profile: TestProfile) => (
              <div key={profile.id} className="p-3 border rounded">
                <div className="flex items-center justify-between">
                  <div className="font-medium text-sm">{profile.name}</div>
                  <Badge variant="outline" className="text-xs">
                    {getComplexity(profile)}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {getScenarioCount(profile)} scenarios • {getLanguages(profile)}
                </div>
                {getDescription(profile) && (
                  <div className="text-xs mt-1 line-clamp-3 text-muted-foreground">
                    {getDescription(profile)}
                  </div>
                )}
              </div>
            ))}
            {allProfiles.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No profiles found.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Recent Generated Data */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Generated Datasets</CardTitle>
          <CardDescription>Recent test data generation results</CardDescription>
        </CardHeader>
        <CardContent>
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
