#!/usr/bin/env tsx
/**
 * Cleanup script for plugins.
 * Deletes plugins from the configured storage (DB or Mem) based on optional filters.
 *
 * Environment variables:
 *  DRY_RUN=true            -> Only list what would be deleted.
 *  PLUGIN_STATUS=stopped    -> Only delete plugins with this status (comma separated list allowed).
 *  MAX_AGE_HOURS=24         -> Only delete plugins whose lastUpdate is older than this many hours.
 *  NAME_MATCH=regex         -> Only delete plugins whose name matches this (JS RegExp literal without slashes).
 *
 * Examples:
 *  DRY_RUN=true tsx scripts/cleanup-plugins.ts
 *  PLUGIN_STATUS=stopped MAX_AGE_HOURS=12 tsx scripts/cleanup-plugins.ts
 *  NAME_MATCH=template_ MAX_AGE_HOURS=1 tsx scripts/cleanup-plugins.ts
 */
import { storage } from '../server/storage-init';
import type { Plugin } from '../shared/schema';

interface Filters {
  statuses: Set<string> | null;
  maxAgeHours: number | null;
  nameRegex: RegExp | null;
}

function parseFilters(): Filters {
  const statusEnv = process.env.PLUGIN_STATUS || process.env.PLUGIN_STATUSES || '';
  const statuses = statusEnv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const maxAgeHours = process.env.MAX_AGE_HOURS ? parseFloat(process.env.MAX_AGE_HOURS) : null;
  const nameRegex = process.env.NAME_MATCH ? new RegExp(process.env.NAME_MATCH, 'i') : null;
  return {
    statuses: statuses.length ? new Set(statuses) : null,
    maxAgeHours: maxAgeHours && !isNaN(maxAgeHours) ? maxAgeHours : null,
    nameRegex,
  };
}

function matches(p: Plugin, filters: Filters): boolean {
  if (filters.statuses && !filters.statuses.has(p.status)) return false;
  if (filters.nameRegex && !filters.nameRegex.test(p.name)) return false;
  if (filters.maxAgeHours != null) {
    const ageMs = Date.now() - new Date(p.lastUpdate).getTime();
    const maxMs = filters.maxAgeHours * 3600 * 1000;
    if (ageMs < maxMs) return false; // too new
  }
  return true;
}

async function run() {
  const filters = parseFilters();
  const dryRun = /^true$/i.test(process.env.DRY_RUN || 'false');
  const plugins = await storage.getPlugins();
  if (!plugins.length) {
    console.log('No plugins found. Nothing to do.');
    return;
  }

  const toDelete: Plugin[] = plugins.filter((p) => matches(p, filters));
  console.log(`Found ${plugins.length} plugins, ${toDelete.length} match filters.`);

  if (!toDelete.length) {
    console.log('Nothing to delete.');
    return;
  }

  for (const p of toDelete) {
    if (dryRun) {
      console.log(`[DRY_RUN] Would delete plugin ${p.id} ${p.name} status=${p.status}`);
    } else {
      await storage.deletePlugin(p.id);
      console.log(`Deleted plugin ${p.id} ${p.name}`);
    }
  }

  if (dryRun) {
    console.log('Dry run complete. No deletions performed.');
  } else {
    console.log('Cleanup complete.');
  }
}

run().catch((err) => {
  console.error('Plugin cleanup failed:', err);
  process.exit(1);
});
