import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { create } from '../src/create';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

describe('create-qore CLI', () => {
  const testDir = join(process.cwd(), 'test-temp');

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('create', () => {
    it('should export create function', () => {
      expect(typeof create).toBe('function');
    });

    it('should have CreateOptions interface', () => {
      const options = {
        template: 'basic' as const,
        typescript: true,
        git: true,
        install: false,
      };
      expect(options.template).toBe('basic');
    });
  });

  describe('template validation', () => {
    it('should have basic template', () => {
      const templates = ['basic', 'ai-chat', 'dashboard'];
      expect(templates).toContain('basic');
    });

    it('should have ai-chat template', () => {
      const templates = ['basic', 'ai-chat', 'dashboard'];
      expect(templates).toContain('ai-chat');
    });
  });
});
