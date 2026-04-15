# Qore Framework - Publishing Guide

## Pre-publish Checklist

### 1. Version Update
- [ ] Update version in `packages/core/package.json`
- [ ] Update version in root `package.json` (if applicable)
- [ ] Update `CHANGELOG.md` with new version and changes

### 2. Code Quality
- [ ] All tests pass: `pnpm test`
- [ ] Test coverage >85%: `pnpm test:coverage`
- [ ] Build succeeds: `pnpm build`
- [ ] No TypeScript errors: `pnpm build:types`
- [ ] No console errors in examples

### 3. Documentation
- [ ] README.md is up to date
- [ ] API.md documents all new features
- [ ] EXAMPLES.md includes examples for new features
- [ ] CHANGELOG.md is updated

### 4. Package Structure
- [ ] `.npmignore` is configured correctly
- [ ] `package.json` exports are correct
- [ ] TypeScript types are generated
- [ ] All public APIs are exported from `index.ts`

### 5. Testing
Run full test suite:
```bash
cd packages/core
pnpm test
pnpm test:coverage
```

### 6. Build
Build the package:
```bash
pnpm build
```

Verify output:
```bash
ls -la dist/
# Should include:
# - index.js
# - index.d.ts
# - ssr.js
# - ssr.d.ts
# - virtual-list.js
# - virtual-list.d.ts
```

### 7. Publish to npm

#### Dry Run (Recommended)
```bash
cd packages/core
npm publish --dry-run
```

#### Actual Publish
```bash
cd packages/core
npm publish --access public
```

Or use the script:
```bash
pnpm publish:npm
```

### 8. Post-publish
- [ ] Create git tag: `git tag v0.5.0 && git push origin v0.5.0`
- [ ] Create GitHub release
- [ ] Update documentation website (if applicable)
- [ ] Announce on social media / community channels

## Version Numbering

Qore follows [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
- **MINOR** (0.X.0): New features, backward compatible
- **PATCH** (0.0.X): Bug fixes, backward compatible

### Version Examples
- `0.5.0` - Minor release with new features (SSR, Virtual List)
- `0.5.1` - Patch release with bug fixes
- `1.0.0` - Major release, stable API

## npm Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Development mode with watch |
| `pnpm build` | Production build |
| `pnpm build:types` | Generate TypeScript types |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm test:coverage` | Run tests with coverage |
| `pnpm prepublishOnly` | Pre-publish checks (auto-run) |
| `pnpm publish:npm` | Publish to npm |

## Troubleshooting

### Build Fails
```bash
# Clean and rebuild
rm -rf dist/
pnpm build
```

### Tests Fail
```bash
# Run specific test file
pnpm vitest run tests/path/to/test.test.ts

# Run tests with verbose output
pnpm vitest run --reporter=verbose
```

### TypeScript Errors
```bash
# Check types only
pnpm build:types

# Fix common issues
# - Missing type exports in index.ts
# - Circular dependencies
# - Import/export mismatches
```

### npm Publish Fails
```bash
# Check npm authentication
npm whoami

# Login if needed
npm login

# Check package.json fields
# - name must be unique
# - version must be higher than published version
```

## Release Notes Template

```markdown
## [Version] - YYYY-MM-DD

### New Features
- Feature 1 description
- Feature 2 description

### Improvements
- Improvement 1
- Improvement 2

### Bug Fixes
- Fix for issue #123
- Fix for issue #456

### Breaking Changes
- Description of breaking change
- Migration guide

### Performance
- Performance improvement details

### Documentation
- Updated docs for X
- Added examples for Y
```

## Contact

For publishing issues or questions:
- GitHub Issues: https://github.com/qore-framework/qore/issues
- Email: team@qore.dev
