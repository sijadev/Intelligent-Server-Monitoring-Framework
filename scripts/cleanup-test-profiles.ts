#!/usr/bin/env tsx
/**
 * Cleans up old generated profile JSON files in test-workspace/profiles keeping the most recent N.
 */
import fs from 'fs';
import path from 'path';

const WORKSPACE = process.env.WORKSPACE_PATH || './test-workspace';
const PROFILES_DIR = path.join(WORKSPACE, 'profiles');
const KEEP = parseInt(process.env.KEEP_PROFILES || '5', 10);

async function main() {
  if (!fs.existsSync(PROFILES_DIR)) {
    console.log('No profiles directory to clean');
    return;
  }
  const files = await fs.promises.readdir(PROFILES_DIR);
  const profileFiles = files.filter((f) => f.startsWith('profile-') && f.endsWith('.json'));
  if (profileFiles.length <= KEEP) {
    console.log(`Nothing to clean. Files: ${profileFiles.length} <= KEEP (${KEEP})`);
    return;
  }
  // Sort by extracted timestamp if present
  const parsed = profileFiles
    .map((f) => {
      const m = f.match(/profile-(\d+)\.json/);
      return { file: f, ts: m ? parseInt(m[1], 10) : 0 };
    })
    .sort((a, b) => b.ts - a.ts);

  const toKeep = parsed.slice(0, KEEP).map((p) => p.file);
  const toDelete = parsed.slice(KEEP).map((p) => p.file);

  for (const f of toDelete) {
    try {
      await fs.promises.unlink(path.join(PROFILES_DIR, f));
      console.log('Deleted old profile', f);
    } catch (e: any) {
      console.warn('Failed to delete', f, e.message || e);
    }
  }
  console.log(`Kept ${toKeep.length}, deleted ${toDelete.length}`);
}

main().catch((e) => {
  console.error('Cleanup failed:', e);
  process.exit(1);
});
