#!/usr/bin/env node

/**
 * create-qore CLI
 * 
 * Create Qore Framework projects with ease.
 * 
 * Usage:
 *   pnpm create qore my-app
 *   npx create-qore my-app
 *   npm create qore@latest my-app
 */

import { program } from 'commander'
import { create } from './create.js'
import { version } from '../package.json'

program
  .name('create-qore')
  .description('Create a new Qore Framework project')
  .version(version)
  .argument('<project-name>', 'Name of the project directory')
  .option('-t, --template <template>', 'Template to use (basic|full|library)')
  .option('--typescript', 'Use TypeScript (default: true)')
  .option('--no-typescript', 'Use JavaScript instead of TypeScript')
  .option('--no-git', 'Skip Git initialization')
  .option('--no-install', 'Skip dependency installation')
  .action(create)

program.parse()
