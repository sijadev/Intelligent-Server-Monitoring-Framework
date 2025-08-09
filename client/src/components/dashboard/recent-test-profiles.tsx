/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { TestTube } from 'lucide-react';
import { api } from '@/lib/api';
import { useState } from 'react';
import type { TestProfile } from '@shared/schema';
import { Link } from 'wouter';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Helper accessors reused from original widget
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

export function RecentTestProfiles() {
  const { data: allProfiles = [] } = useQuery({
    queryKey: ['/api/test-manager/profiles', 'all'],
    queryFn: async () => {
      try {
        const response = await api.testManagerGet('/test-manager/profiles');
        const profilesData = response.profiles || response;
        return Array.isArray(profilesData) ? profilesData : [];
      } catch (error) {
        console.error('Profiles fetch error:', error);
        return [];
      }
    },
  });

  const profiles = allProfiles.slice(0, 5);
  const [profilesCollapsed, setProfilesCollapsed] = useState(true);
  const [showAllProfiles, setShowAllProfiles] = useState(false);
  const profilesListClass =
    allProfiles.length > 5 ? 'max-h-56 overflow-y-auto pr-1 space-y-2' : 'space-y-2';

  return (
    <>
      <Card className="border border-gray-200">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 px-5 py-3">
          <div>
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <button
                type="button"
                aria-expanded={!profilesCollapsed}
                aria-controls="recent-profiles-content"
                onClick={() => setProfilesCollapsed((c) => !c)}
                className="inline-flex items-center justify-center h-5 w-5 rounded border text-xs hover:bg-muted transition"
              >
                {profilesCollapsed ? '+' : '–'}
              </button>
              Recent Test Profiles
              <span className="text-xs font-normal text-muted-foreground">
                ({allProfiles.length})
              </span>
            </CardTitle>
            <CardDescription>Latest test configurations</CardDescription>
          </div>
          {profilesCollapsed && allProfiles.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setProfilesCollapsed(false)}>
              Expand
            </Button>
          )}
        </CardHeader>
        {!profilesCollapsed && (
          <CardContent id="recent-profiles-content" className="pt-0 pb-3 px-5">
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
        )}
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
    </>
  );
}
