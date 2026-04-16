#!/usr/bin/env node
/**
 * Build script for Qore core package
 * Builds all entry points without clearing the dist directory between builds
 */

import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distPath = join(__dirname, 'dist');

// Ensure dist directory exists
if (!existsSync(distPath)) {
  mkdirSync(distPath, { recursive: true });
}

const builds = [
  { name: 'main', config: 'vite.config.ts' },
  { name: 'ssr', config: 'vite.ssr.config.ts' },
  { name: 'stream', config: 'vite.stream.config.ts' },
  { name: 'virtual-list', config: 'vite.virtual-list.config.ts' },
];

console.log('🔨 Building Qore core package...\n');

for (const build of builds) {
  console.log(`📦 Building ${build.name}...`);
  try {
    execSync(`pnpm exec vite build --config ${build.config}`, {
      stdio: 'inherit',
      cwd: __dirname,
    });
    console.log(`✅ ${build.name} built successfully\n`);
  } catch (error) {
    console.error(`❌ Failed to build ${build.name}`);
    process.exit(1);
  }
}

console.log('🎉 All builds completed successfully!');
