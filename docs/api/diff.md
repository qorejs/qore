# Qore Diff API

Efficient tree diffing algorithm for minimal DOM updates.

## Overview

Qore's diff algorithm compares virtual DOM trees and generates minimal patches for efficient updates. It uses keyed reconciliation and path-based patches for optimal performance.

## Core API

### `diff`

Compare two VNodes and generate minimal patches.

```typescript
function diff(
  oldVNode: VNode | null,
  newVNode: VNode,
  options?: DiffOptions
): Patch[]
```

**Parameters:**
- `oldVNode` - Previous VNode tree (null for initial render)
- `newVNode` - New VNode tree
- `options` - Optional configuration
  - `maxDepth?: number` - Maximum recursion depth (default: 100)
  - `includeOldValue?: boolean` - Include old values in patches (default: false)

**Returns:** Array of `Patch` objects

**Example:**
```typescript
import { h, diff } from '@qore/core';

const oldTree = h('div', null, 
  h('span', { key: 1 }, 'Hello'),
  h('span', { key: 2 }, 'World')
);

const newTree = h('div', null,
  h('span', { key: 1 }, 'Hello'),
  h('span', { key: 2 }, 'Qore')  // Changed
);

const patches = diff(oldTree, newTree);
// [{ type: 'update', path: ['children', 1, 'children', 0], value: 'Qore' }]
```

### `Patch`

Represents a single change in the tree.

```typescript
interface Patch {
  type: PatchType;
  path: (string | number)[];
  value?: VNode;
  oldValue?: VNode;
}

type PatchType = 'update' | 'insert' | 'remove' | 'replace';
```

**Patch Types:**
- `update` - Change existing value
- `insert` - Add new node
- `remove` - Delete existing node
- `replace` - Replace entire subtree

**Path:** Array of keys to navigate to the changed node

### `applyPatches`

Apply patches to a VNode tree.

```typescript
function applyPatches(
  root: VNode | null,
  patches: Patch[]
): VNode | null
```

**Parameters:**
- `root` - Original VNode tree
- `patches` - Array of patches to apply

**Returns:** Updated VNode tree

**Example:**
```typescript
const updatedTree = applyPatches(oldTree, patches);
```

## Diff Algorithm

### Keyed Reconciliation

Qore uses keys to efficiently match children across renders:

```typescript
// With keys - efficient O(n)
const list = items.map(item => 
  h('li', { key: item.id }, item.name)
);

// Without keys - less efficient
const list = items.map(item => 
  h('li', null, item.name)
);
```

**Best Practices:**
- ✅ Use stable, unique keys (IDs)
- ❌ Don't use array indices for dynamic lists
- ❌ Don't use random values as keys

### Path-Based Patches

Patches use paths to locate changes:

```typescript
// Path navigation
{
  type: 'update',
  path: ['children', 2, 'props', 'className'],
  value: 'active'
}

// Equivalent to:
// vnode.children[2].props.className = 'active'
```

## Optimization Strategies

### 1. Minimal Updates

The algorithm finds the smallest set of changes:

```typescript
// Only this span changes
const old = h('div', null,
  h('span', null, 'A'),
  h('span', null, 'B'),
  h('span', null, 'C')
);

const new = h('div', null,
  h('span', null, 'A'),
  h('span', null, 'B Changed'),  // Only this
  h('span', null, 'C')
);

// Generates 1 patch, not 3
```

### 2. Type Preservation

Same type nodes are diffed, different types are replaced:

```typescript
// Same type - diff children
h('div', null, [...]) → h('div', null, [...])

// Different type - replace
h('div', null, [...]) → h('span', null, [...])
```

### 3. Early Exit

Unchanged subtrees are skipped:

```typescript
// If props and children are identical,
// the entire subtree is skipped
```

## Performance Characteristics

| Operation | Complexity | Notes |
|-----------|-----------|-------|
| Same tree | O(1) | Reference equality check |
| Different types | O(1) | Immediate replace |
| Text nodes | O(1) | String comparison |
| Props diff | O(n) | n = number of props |
| Children diff | O(n) | n = number of children |
| With keys | O(n) | Efficient reconciliation |
| Without keys | O(n²) | Position-based |

## Memory Usage

The diff algorithm is designed for minimal memory allocation:

- Patches are generated lazily
- No intermediate tree copies
- Path arrays are reused when possible

## Examples

### List Reordering

```typescript
// Original: [A, B, C]
const old = h('ul', null,
  h('li', { key: 'a' }, 'A'),
  h('li', { key: 'b' }, 'B'),
  h('li', { key: 'c' }, 'C')
);

// Reordered: [C, A, B]
const new = h('ul', null,
  h('li', { key: 'c' }, 'C'),
  h('li', { key: 'a' }, 'A'),
  h('li', { key: 'b' }, 'B')
);

// With keys: generates move operations
// Without keys: generates full replacements
```

### Conditional Rendering

```typescript
// Show/hide
const old = h('div', null,
  isVisible ? h('span', null, 'Visible') : null
);

const new = h('div', null,
  !isVisible ? null : h('span', null, 'Visible')
);

// Generates insert/remove patches
```

### Deep Updates

```typescript
// Deep nested update
const old = h('div', null,
  h('section', null,
    h('article', null,
      h('p', null, 'Old text')
    )
  )
);

const new = h('div', null,
  h('section', null,
    h('article', null,
      h('p', null, 'New text')
    )
  )
);

// Path: ['children', 0, 'children', 0, 'children', 0]
```

## Debugging

### Patch Count

```typescript
import { diff, patchCount } from '@qore/core';

const patches = diff(oldTree, newTree);
console.log(`${patchCount(patches)} changes detected`);
```

### Tree Size

```typescript
import { nodeSize } from '@qore/core';

console.log(`Tree has ${nodeSize(vnode)} nodes`);
```

### Include Old Values

```typescript
const patches = diff(oldTree, newTree, {
  includeOldValue: true
});

// Patches now include oldValue for debugging
patches.forEach(patch => {
  console.log(`${patch.type}: ${patch.oldValue} → ${patch.value}`);
});
```

## Comparison with Other Frameworks

| Framework | Algorithm | Key Support | Path-based |
|-----------|-----------|-------------|------------|
| React | Heuristic | Yes | No |
| Vue 3 | Optimized | Yes | Partial |
| Solid | No VDOM | Yes | N/A |
| **Qore** | **Tree diff** | **Yes** | **Yes** |

## See Also

- [Stream API](./stream.md) - Streaming with incremental patches
- [Suspense API](./suspense.md) - Async component loading
- [Renderer API](./renderer.md) - VNode structure and rendering
