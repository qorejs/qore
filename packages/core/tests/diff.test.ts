/**
 * Qore Diff Algorithm Tests
 */

import { describe, it, expect } from 'vitest';
import { h, VNode } from '../src/renderer';
import { diff, applyPatches, Patch, nodeSize, patchCount } from '../src/diff';

describe('Diff Algorithm', () => {
  describe('diff()', () => {
    it('should return insert patch when oldVNode is null', () => {
      const newVNode = h('div', null, 'Hello');
      const patches = diff(null, newVNode);
      
      expect(patches.length).toBe(1);
      expect(patches[0].type).toBe('insert');
      expect(patches[0].path).toEqual([]);
    });

    it('should return no patches for identical nodes', () => {
      const vnode = h('div', null, 'Hello');
      const patches = diff(vnode, vnode);
      
      expect(patches.length).toBe(0);
    });

    it('should detect text changes', () => {
      const oldVNode = h('div', null, 'Hello');
      const newVNode = h('div', null, 'World');
      const patches = diff(oldVNode, newVNode);
      
      expect(patches.length).toBe(1);
      expect(patches[0].type).toBe('update');
      expect(patches[0].path).toEqual(['children', 0]);
    });

    it('should detect prop changes', () => {
      const oldVNode = h('div', { className: 'old' }, 'Content');
      const newVNode = h('div', { className: 'new' }, 'Content');
      const patches = diff(oldVNode, newVNode);
      
      expect(patches.length).toBe(1);
      expect(patches[0].type).toBe('update');
      expect(patches[0].path).toEqual(['props', 'className']);
    });

    it('should detect added props', () => {
      const oldVNode = h('div', null, 'Content');
      const newVNode = h('div', { id: 'test' }, 'Content');
      const patches = diff(oldVNode, newVNode);
      
      expect(patches.length).toBe(1);
      expect(patches[0].type).toBe('insert');
      expect(patches[0].path).toEqual(['props', 'id']);
    });

    it('should detect removed props', () => {
      const oldVNode = h('div', { id: 'test' }, 'Content');
      const newVNode = h('div', null, 'Content');
      const patches = diff(oldVNode, newVNode);
      
      expect(patches.length).toBe(1);
      expect(patches[0].type).toBe('remove');
      expect(patches[0].path).toEqual(['props', 'id']);
    });

    it('should detect element type changes', () => {
      const oldVNode = h('div', null, 'Content');
      const newVNode = h('span', null, 'Content');
      const patches = diff(oldVNode, newVNode);
      
      expect(patches.length).toBe(1);
      expect(patches[0].type).toBe('replace');
    });

    it('should detect added children', () => {
      const oldVNode = h('ul', null, h('li', null, 'Item 1'));
      const newVNode = h('ul', null, 
        h('li', null, 'Item 1'),
        h('li', null, 'Item 2')
      );
      const patches = diff(oldVNode, newVNode);
      
      expect(patches.length).toBe(1);
      expect(patches[0].type).toBe('insert');
      expect(patches[0].path).toEqual(['children', 1]);
    });

    it('should detect removed children', () => {
      const oldVNode = h('ul', null, 
        h('li', null, 'Item 1'),
        h('li', null, 'Item 2')
      );
      const newVNode = h('ul', null, h('li', null, 'Item 1'));
      const patches = diff(oldVNode, newVNode);
      
      expect(patches.length).toBe(1);
      expect(patches[0].type).toBe('remove');
      expect(patches[0].path).toEqual(['children', 1]);
    });

    it('should handle keyed children efficiently', () => {
      const oldVNode = h('ul', null,
        h('li', { key: 'a' }, 'A'),
        h('li', { key: 'b' }, 'B'),
        h('li', { key: 'c' }, 'C')
      );
      const newVNode = h('ul', null,
        h('li', { key: 'c' }, 'C'),
        h('li', { key: 'a' }, 'A'),
        h('li', { key: 'b' }, 'B')
      );
      const patches = diff(oldVNode, newVNode);
      
      // With keys, it should detect nodes by key rather than position
      // This test verifies keyed reconciliation is working
      expect(patches.length).toBeLessThanOrEqual(6);
    });

    it('should handle deep nesting', () => {
      const oldVNode = h('div', null,
        h('div', null,
          h('div', null,
            h('span', null, 'Old')
          )
        )
      );
      const newVNode = h('div', null,
        h('div', null,
          h('div', null,
            h('span', null, 'New')
          )
        )
      );
      const patches = diff(oldVNode, newVNode);
      
      expect(patches.length).toBe(1);
      expect(patches[0].path).toEqual(['children', 0, 'children', 0, 'children', 0, 'children', 0]);
    });

    it('should respect maxDepth option', () => {
      const oldVNode = h('div', null,
        h('div', null,
          h('div', null,
            h('span', null, 'Old')
          )
        )
      );
      const newVNode = h('div', null,
        h('div', null,
          h('div', null,
            h('span', null, 'New')
          )
        )
      );
      const patches = diff(oldVNode, newVNode, { maxDepth: 2 });
      
      // Should replace at depth 2 instead of diffing deeper
      expect(patches.some(p => p.type === 'replace')).toBe(true);
    });

    it('should include oldValue when requested', () => {
      const oldVNode = h('div', { className: 'old' }, 'Old');
      const newVNode = h('div', { className: 'new' }, 'New');
      const patches = diff(oldVNode, newVNode, { includeOldValue: true });
      
      expect(patches.length).toBeGreaterThan(0);
      expect(patches[0].oldValue).toBeDefined();
    });
  });

  describe('applyPatches()', () => {
    it('should return same node when no patches', () => {
      const vnode = h('div', null, 'Hello');
      const result = applyPatches(vnode, []);
      
      expect(result).toBe(vnode);
    });

    it('should apply update patch', () => {
      const vnode = h('div', null, 'Hello');
      const patches: Patch[] = [{
        type: 'update',
        path: ['children', 0],
        value: { type: '#text', value: 'World' }
      }];
      const result = applyPatches(vnode, patches);
      
      expect((result as any).children[0].value).toBe('World');
    });

    it('should apply insert patch', () => {
      const vnode = h('ul', null, h('li', null, 'Item 1'));
      const patches: Patch[] = [{
        type: 'insert',
        path: ['children', 1],
        value: h('li', null, 'Item 2')
      }];
      const result = applyPatches(vnode, patches);
      
      expect((result as any).children.length).toBe(2);
    });

    it('should apply remove patch', () => {
      const vnode = h('ul', null,
        h('li', null, 'Item 1'),
        h('li', null, 'Item 2')
      );
      const patches: Patch[] = [{
        type: 'remove',
        path: ['children', 1],
        value: h('li', null, 'Item 2')
      }];
      const result = applyPatches(vnode, patches);
      
      expect((result as any).children.length).toBe(1);
    });

    it('should apply multiple patches', () => {
      const vnode = h('div', { className: 'old' }, 'Old');
      const patches: Patch[] = [
        { type: 'update', path: ['props', 'className'], value: 'new' },
        { type: 'update', path: ['children', 0], value: { type: '#text', value: 'New' } }
      ];
      const result = applyPatches(vnode, patches);
      
      expect((result as any).props.className).toBe('new');
      expect((result as any).children[0].value).toBe('New');
    });

    it('should handle root-level patch', () => {
      const vnode = h('div', null, 'Old');
      const patches: Patch[] = [{
        type: 'replace',
        path: [],
        value: h('span', null, 'New')
      }];
      const result = applyPatches(vnode, patches);
      
      expect((result as any).type).toBe('span');
    });
  });

  describe('nodeSize()', () => {
    it('should count primitive nodes as 1', () => {
      expect(nodeSize('Hello')).toBe(1);
      expect(nodeSize(123)).toBe(1);
    });

    it('should count text nodes as 1', () => {
      const vnode = { type: '#text', value: 'Hello' };
      expect(nodeSize(vnode as VNode)).toBe(1);
    });

    it('should count element nodes recursively', () => {
      const vnode = h('div', null,
        h('span', null, 'Hello'),
        h('span', null, 'World')
      );
      expect(nodeSize(vnode)).toBe(5); // 1 div + 2 spans + 2 text
    });
  });

  describe('patchCount()', () => {
    it('should return number of patches', () => {
      const patches: Patch[] = [
        { type: 'update', path: ['a'], value: '1' },
        { type: 'update', path: ['b'], value: '2' },
        { type: 'update', path: ['c'], value: '3' }
      ];
      expect(patchCount(patches)).toBe(3);
    });
  });

  describe('Performance', () => {
    it('should generate fewer patches for small changes in large trees', () => {
      // Create a large tree
      const children = Array.from({ length: 100 }, (_, i) => 
        h('li', { key: i }, `Item ${i}`)
      );
      const oldVNode = h('ul', null, ...children);
      
      // Change only one item
      const newChildren = [...children];
      newChildren[50] = h('li', { key: 50 }, 'Item 50 - Updated');
      const newVNode = h('ul', null, ...newChildren);
      
      const patches = diff(oldVNode, newVNode);
      
      // Should only generate patches for the changed item
      expect(patches.length).toBeLessThan(10);
    });

    it('should handle large trees efficiently', () => {
      const children = Array.from({ length: 1000 }, (_, i) => 
        h('li', { key: i }, `Item ${i}`)
      );
      const oldVNode = h('ul', null, ...children);
      const newVNode = h('ul', null, ...children);
      
      const start = performance.now();
      const patches = diff(oldVNode, newVNode);
      const end = performance.now();
      
      // Should complete in reasonable time (< 100ms)
      expect(end - start).toBeLessThan(100);
      expect(patches.length).toBe(0); // Identical trees
    });
  });
});
