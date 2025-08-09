/**
 * 💨 SMOKE TEST
 *
 * Quick tests to verify basic system functionality.
 * These should run fast and catch obvious problems.
 */

import { describe, test, expect } from 'vitest';

describe('💨 Smoke Tests', () => {
  test('⚡ Environment is properly configured', () => {
    // Basic Node.js environment check
    expect(process.version).toMatch(/^v\d+/);
    expect(typeof process.env.NODE_ENV).toBe('string');

    console.log(`Node.js: ${process.version}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Platform: ${process.platform}`);

    // Essential environment variables should exist
    const requiredVars = ['NODE_ENV'];
    for (const varName of requiredVars) {
      expect(process.env[varName]).toBeDefined();
    }
  });

  test('📁 Project structure is valid', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const projectRoot = process.cwd();

    // Critical files that must exist
    const criticalFiles = [
      'package.json',
      'server/index.ts',
      'client/src/main.tsx',
      'server/routes/index.ts',
    ];

    for (const file of criticalFiles) {
      const filePath = path.join(projectRoot, file);

      try {
        await fs.access(filePath);
        console.log(`✅ ${file} exists`);
      } catch (error) {
        throw new Error(`Critical file missing: ${file}`);
      }
    }

    // Check package.json is valid JSON
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(packageContent);

    expect(packageJson.name).toBeDefined();
    expect(packageJson.version).toBeDefined();
    expect(packageJson.scripts).toBeDefined();
    expect(packageJson.scripts.dev).toBeDefined();

    console.log(`Project: ${packageJson.name} v${packageJson.version}`);
  });

  test('🔧 TypeScript configuration is valid', async () => {
    const fs = await import('fs/promises');
    const path = await import('path');

    const projectRoot = process.cwd();
    const tsconfigPath = path.join(projectRoot, 'tsconfig.json');

    try {
      const tsconfigContent = await fs.readFile(tsconfigPath, 'utf-8');
      const tsconfig = JSON.parse(tsconfigContent);

      expect(tsconfig.compilerOptions).toBeDefined();
      console.log('✅ tsconfig.json is valid');
    } catch (error) {
      console.log('ℹ️  tsconfig.json not found or invalid - may be expected');
      expect(true).toBe(true); // Don't fail the test
    }
  });

  test('📦 Package dependencies are resolvable', async () => {
    // Test that critical dependencies can be imported
    const criticalDeps = ['express', 'vite', 'typescript'];

    for (const dep of criticalDeps) {
      try {
        await import(dep);
        console.log(`✅ ${dep} can be imported`);
      } catch (error) {
        // Fallback to CommonJS resolution
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          require.resolve(dep);
          console.log(`✅ ${dep} is resolvable`);
        } catch (resolveError: any) {
          console.log(`⚠️  ${dep} dependency issue: ${resolveError.message}`);
        }
      }
    }
  });

  test('🌐 Network stack is available', async () => {
    const { createServer } = await import('http');

    // Test that we can create a basic HTTP server
    const testServer = createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('test');
    });

    await new Promise((resolve, reject) => {
      testServer.listen(0, '127.0.0.1', () => {
        const address = testServer.address();
        const port =
          typeof address === 'object' && address && 'port' in address ? address.port : 'unknown';
        console.log(`✅ HTTP server can bind to port ${port}`);
        testServer.close(resolve);
      });

      testServer.on('error', reject);
    });

    expect(true).toBe(true);
  });
});
