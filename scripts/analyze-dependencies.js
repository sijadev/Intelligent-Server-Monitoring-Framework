#!/usr/bin/env node
/**
 * Dependency Analysis Script
 * Analyzes package.json dependencies and identifies potential issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json
const packageJsonPath = path.join(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const { dependencies = {}, devDependencies = {} } = packageJson;
const allDeps = { ...dependencies, ...devDependencies };

console.log('🔍 Dependency Analysis Report');
console.log('=' .repeat(50));

// Analyze dependency categories
const categories = {
  react: [],
  radixUI: [],
  testing: [],
  build: [],
  database: [],
  server: [],
  ui: [],
  development: [],
  unused: [],
  potential_duplicates: []
};

// Categorize dependencies
for (const [name, version] of Object.entries(allDeps)) {
  if (name.startsWith('@radix-ui/')) {
    categories.radixUI.push({ name, version });
  } else if (name.includes('react') || name.includes('React')) {
    categories.react.push({ name, version });
  } else if (name.includes('test') || name.includes('vitest') || name.includes('jest')) {
    categories.testing.push({ name, version });
  } else if (name.includes('vite') || name.includes('esbuild') || name.includes('typescript')) {
    categories.build.push({ name, version });
  } else if (name.includes('drizzle') || name.includes('postgres') || name.includes('database')) {
    categories.database.push({ name, version });
  } else if (name.includes('express') || name.includes('server') || name.includes('passport')) {
    categories.server.push({ name, version });
  } else if (name.includes('tailwind') || name.includes('css') || name.includes('style')) {
    categories.ui.push({ name, version });
  } else if (name.startsWith('@types/') || name.includes('tsx')) {
    categories.development.push({ name, version });
  }
}

// Print categorized analysis
console.log('\n📦 Dependencies by Category:');
console.log('─'.repeat(30));

Object.entries(categories).forEach(([category, deps]) => {
  if (deps.length > 0) {
    console.log(`\n${category.toUpperCase()} (${deps.length}):`);
    deps.forEach(dep => {
      console.log(`  - ${dep.name}@${dep.version}`);
    });
  }
});

// Identify potential issues
console.log('\n⚠️  Potential Issues:');
console.log('─'.repeat(30));

// Check for unused dependencies (simplified heuristic)
const suspiciouslyUnused = [
  'connect-pg-simple', // Only needed if using PostgreSQL sessions
  'passport', // Only if authentication is implemented
  'passport-local', // Only if local auth is used
  'memorystore', // Only if using memory store for sessions
  'embla-carousel-react', // Only if carousel is used
  'vaul', // Drawer component - might not be used
  'tw-animate-css', // Additional animation library
  'input-otp', // OTP component - might not be used
  'react-resizable-panels', // Specific UI component
  'react-day-picker', // Date picker - might not be used
  'wouter', // Router - check if used instead of react-router
];

suspiciouslyUnused.forEach(dep => {
  if (allDeps[dep]) {
    console.log(`  🤔 ${dep} - might be unused`);
  }
});

// Check for potential duplicates
const potentialDuplicates = [
  ['node-fetch', 'axios'], // Both for HTTP requests
  ['react-icons', 'lucide-react'], // Both for icons
  ['tailwindcss-animate', 'tw-animate-css'], // Both for animations
  ['@tanstack/react-query', 'axios'], // Query vs direct HTTP
];

potentialDuplicates.forEach(([dep1, dep2]) => {
  if (allDeps[dep1] && allDeps[dep2]) {
    console.log(`  🔄 ${dep1} + ${dep2} - potential duplicate functionality`);
  }
});

// Analyze Radix UI usage
console.log(`\n📊 Radix UI Components: ${categories.radixUI.length} installed`);
if (categories.radixUI.length > 10) {
  console.log('  ⚠️  Large number of Radix UI components. Consider using a component library.');
}

// Check dependencies in wrong section
const misplacedDeps = [];
Object.keys(dependencies).forEach(dep => {
  if (dep.startsWith('@types/') || 
      dep.includes('vitest') || 
      dep.includes('typescript') ||
      dep.includes('drizzle-kit')) {
    misplacedDeps.push(dep);
  }
});

if (misplacedDeps.length > 0) {
  console.log(`\n📦 Dependencies that should be devDependencies:`);
  misplacedDeps.forEach(dep => {
    console.log(`  - ${dep}`);
  });
}

console.log('\n✅ Analysis Complete!');
console.log('\nRecommendations:');
console.log('1. Move development-only packages to devDependencies');
console.log('2. Remove unused dependencies');  
console.log('3. Consider consolidating similar packages');
console.log('4. Audit Radix UI components for actual usage');