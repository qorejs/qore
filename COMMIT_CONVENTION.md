# Commit Message Convention

## Rule: English Only for Commit Messages

**All commit messages MUST be in English.** This is a strict requirement for the Qore project.

### Why?
- 🌍 **Internationalization**: Qore is a global project, English is the universal language
- 👥 **Collaboration**: Enables contributions from developers worldwide
- 🤖 **Automation**: Compatible with automated changelog generators and tools
- 📖 **Consistency**: Maintains uniform Git history format

### Format
```
<type>: <subject>

[optional body]

[optional footer]
```

### Types
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation updates
- `style`: Code formatting (no logic changes)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test-related changes
- `chore`: Build process or tooling changes

### Examples

✅ **Correct (English)**:
```
feat: add backpressure handling for streaming rendering
fix: resolve circular dependency in computed signals
docs: update API documentation for signal module
test: add comprehensive tests for SSR rendering
chore: configure Vercel deployment
```

❌ **Wrong (Chinese)**:
```
feat: 添加背压处理
fix: 修复循环依赖
docs: 更新文档
chore: 添加 Vercel 配置
```

### Enforcement
- This rule is **mandatory** for all team members
- PRs with non-English commit messages will be rejected
- Use `git commit --amend` to fix mistakes before pushing

---

**Last Updated**: 2026-04-16  
**Effective Immediately**: All future commits must follow this convention
