import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Node fallback uses the 'postgres' library already in dependencies
async function applyMigrationsNode(dbUrl: string, migrationFile: string) {
  try {
    const { default: postgres } = await import('postgres');
    const sql = postgres(dbUrl, { max: 1 });
    const raw = await fs.promises.readFile(migrationFile, 'utf8');
    // Basic sanitization: strip \r and trailing spaces – keep semicolons (multi‑statement supported by unsafe)
    const cleaned = raw.replace(/\r/g, '\n');
    console.log('🛠  Applying test migrations via Node fallback...');
    await sql.unsafe(cleaned);
    await sql.end();
    console.log('✅ Test migrations applied (Node fallback)');
  } catch (e: any) {
    console.warn('⚠️ Node fallback migration failed:', e.message || e);
  }
}

/**
 * Auto-applies required test tables before any DB dependent tests run.
 * Runs only if DATABASE_URL is set and tables are missing.
 */
async function ensureTestTables() {
  const dbUrl = process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;
  if (!dbUrl) return; // No DB configured

  let psqlAvailable = false;
  try {
    execSync('psql --version', { stdio: 'ignore' });
    psqlAvailable = true;
  } catch {
    console.warn('⚠️ psql not available – will attempt Node fallback for migrations');
  }

  // Quick existence probe using information_schema
  const checkSql = `SELECT to_regclass('public.test_profiles') as tp, to_regclass('public.generated_test_data') as gtd;`;
  let tablesExist = false;
  const probe = () => {
    try {
      const result = execSync(`psql "${dbUrl}" -At -c "${checkSql}"`, { encoding: 'utf8' }).trim();
      if (result.includes('test_profiles') && result.includes('generated_test_data')) {
        tablesExist = true;
      }
    } catch {
      // ignore in probe
    }
  };
  if (psqlAvailable) probe();
  if (tablesExist) return;

  const migrationFile = path.join(process.cwd(), 'migrations', '0001_add_test_profiles.sql');
  if (!fs.existsSync(migrationFile)) return;

  if (psqlAvailable) {
    try {
      console.log('🛠  Applying test migrations (psql)...');
      execSync(`psql "${dbUrl}" -f "${migrationFile}"`, { stdio: 'inherit' });
      probe();
      if (tablesExist) {
        console.log('✅ Test migrations applied');
        return;
      } else {
        console.warn('⚠️ Tables still missing after psql attempt – trying Node fallback');
      }
    } catch (e) {
      console.warn('⚠️ psql migration attempt failed:', (e as any).message);
    }
  }

  // Node fallback
  if (!tablesExist) {
    await applyMigrationsNode(dbUrl, migrationFile);
  }
}

await ensureTestTables();
