# Changelog

All notable changes to Qore Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.5.0] - 2026-04-15

### New Features

#### SSR (Server-Side Rendering)
- `renderToString()` - Synchronous SSR rendering
- `renderToStream()` - Streaming SSR with chunked output
- `renderAsync()` - Async component support
- `renderWithSuspense()` - Suspense boundary for SSR
- `prefetchAndRender()` - Data prefetching before render
- `renderSSR()` - Complete SSR solution with state hydration

#### Virtual List
- `VirtualList` - High-performance virtualized list component
- `InfiniteList` - Infinite scroll support with auto-loading
- `FixedVirtualList` - Optimized for uniform item heights
- `VirtualGrid` - 2D grid layout with virtualization
- Dynamic height support
- Overscan configuration
- Scroll event callbacks

### Improvements

#### Signal System
- Fixed computed dependency tracking
- Fixed effect cleanup on re-run
- Fixed signal garbage collection
- Improved batch processing
- Better handling of deep dependency chains
- Better handling of diamond dependency patterns

#### Testing
- All 150 tests passing (100% pass rate)
- Fixed 11 flaky tests
- Improved test stability

### Documentation

- Created `PUBLISHING.md` - npm publishing guide
- Created `CHANGELOG.md` - This changelog
- Updated `README.md` - v0.5.0 features
- Updated API documentation

### Package Structure

- Updated `package.json` for npm publishing
- Added `.npmignore` for clean package
- Added subpath exports (`./ssr`, `./virtual-list`)
- Added TypeScript type definitions
- Set `sideEffects: false` for tree-shaking

### Bug Fixes

- Fixed computed not tracking dependencies correctly
- Fixed effect cleanup not being called
- Fixed signal garbage collection issues
- Fixed render function parameter order in tests
- Fixed async component test imports

### Performance

- Virtual list renders only visible items
- Efficient re-rendering with fine-grained reactivity
- Batch updates for better performance
- Optimized dependency tracking

### Breaking Changes

None - This release is backward compatible with v0.4.x.

---

## [0.4.0] - 2026-04-14

### Summary

Week 1-4 POC completed with technical validation.

### Features

- Core signal system (signal, computed, effect, batch)
- Fine-grained renderer with no VDOM
- AI streaming support
- Server-side streaming
- Error handling utilities

### Test Results

- 241/252 tests passing (95.6%)

---

## [0.1.0] - 2026-04-08

### Initial Release

- Project setup
- Basic signal implementation
- Initial renderer
