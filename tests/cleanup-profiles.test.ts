import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';

const SCRIPT = path.resolve('scripts/cleanup-test-profiles.ts');

function runCleanup(workspacePath: string, keep: number) {
  const result = spawnSync('npx', ['tsx', SCRIPT], {
    env: { ...process.env, WORKSPACE_PATH: workspacePath, KEEP_PROFILES: String(keep) },
    encoding: 'utf-8',
  });
  if (result.error) throw result.error;
  return { stdout: result.stdout, stderr: result.stderr, status: result.status };
}

describe('profiles cleanup script', () => {
  let tmpDir: string;
  let profilesDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'imf-profiles-test-'));
    profilesDir = path.join(tmpDir, 'profiles');
    fs.mkdirSync(profilesDir);
  });

  it('keeps only the newest N profile files', () => {
    const timestamps = [1000, 2000, 3000, 4000, 5000];
    for (const ts of timestamps) {
      fs.writeFileSync(path.join(profilesDir, `profile-${ts}.json`), JSON.stringify({ ts }));
    }

    const { stdout, status } = runCleanup(tmpDir, 2);
    expect(status).toBe(0);

    const remaining = fs.readdirSync(profilesDir).filter((f) => f.startsWith('profile-'));
    // Should keep 5000 and 4000
    expect(remaining.sort()).toEqual(['profile-4000.json', 'profile-5000.json']);
    expect(stdout).toMatch(/Kept 2, deleted 3/);
  });

  it('does nothing when number of files <= KEEP', () => {
    fs.writeFileSync(path.join(profilesDir, 'profile-10.json'), '{}');
    fs.writeFileSync(path.join(profilesDir, 'profile-20.json'), '{}');

    const { stdout, status } = runCleanup(tmpDir, 5);
    expect(status).toBe(0);
    expect(stdout).toMatch(/Nothing to clean|Files: 2 <= KEEP/);

    const remaining = fs.readdirSync(profilesDir).filter((f) => f.startsWith('profile-'));
    expect(remaining.length).toBe(2);
  });

  it('handles missing profiles directory gracefully', () => {
    const ws = fs.mkdtempSync(path.join(os.tmpdir(), 'imf-profiles-test-nodir-'));
    const { stdout, status } = runCleanup(ws, 3);
    expect(status).toBe(0);
    expect(stdout).toMatch(/No profiles directory to clean/);
  });
});
