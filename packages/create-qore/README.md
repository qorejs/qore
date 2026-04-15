# create-qore

Qore Framework CLI - 快速创建 Qore 项目

## 快速开始

使用以下任一命令创建新项目：

```bash
# 使用 pnpm
pnpm create qore my-app

# 使用 npx
npx create-qore my-app

# 使用 npm
npm create qore@latest my-app
```

## 交互式创建

运行命令后，CLI 会引导你选择：

1. **模板类型**
   - `basic` - 最小化 Qore 应用
   - `full` - 完整应用（含组件和路由）
   - `library` - 组件库

2. **配置选项**
   - TypeScript 支持（默认启用）
   - Git 初始化（默认启用）
   - 依赖安装（默认启用）

## 命令行选项

```bash
# 指定模板
pnpm create qore my-app --template basic

# 使用 JavaScript（不使用 TypeScript）
pnpm create qore my-app --no-typescript

# 跳过 Git 初始化
pnpm create qore my-app --no-git

# 跳过依赖安装
pnpm create qore my-app --no-install

# 组合选项
pnpm create qore my-app -t full --no-git --no-install
```

## 模板说明

### Basic（基础模板）

最小化的 Qore 应用，包含：

- Qore Core
- Vite 构建工具
- TypeScript 配置
- 基础组件示例

**适合**: 学习 Qore、简单项目

### Full（完整模板）

功能完整的应用，包含：

- Qore Core
- Qore Primitives（UI 组件库）
- Qore Devtools（开发者工具）
- Toast 通知
- Tabs 示例
- 完整的项目结构

**适合**: 生产应用、需要快速上手

### Library（库模板）

组件库模板，包含：

- 库构建配置
- TypeScript 类型导出
- Vite 库模式配置
- 示例组件

**适合**: 创建可复用的组件库

## 项目结构

### Basic 模板

```
my-app/
├── src/
│   ├── App.ts        # 主组件
│   └── main.ts       # 入口文件
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Full 模板

```
my-app/
├── src/
│   ├── components/   # 组件目录
│   ├── pages/        # 页面目录
│   ├── App.ts        # 主组件
│   └── main.ts       # 入口文件
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### Library 模板

```
my-library/
├── src/
│   └── index.ts      # 导出入口
├── dist/             # 构建输出
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 开发

创建项目后：

```bash
cd my-app
pnpm dev
```

访问 http://localhost:3000 查看应用。

## 构建

```bash
# 开发构建
pnpm build

# 预览构建结果
pnpm preview
```

## 示例

### 创建基础应用

```bash
pnpm create qore my-basic-app --template basic
cd my-basic-app
pnpm dev
```

### 创建完整应用

```bash
pnpm create qore my-full-app --template full
cd my-full-app
pnpm dev
```

### 创建组件库

```bash
pnpm create qore my-components --template library
cd my-components
pnpm build
```

## 故障排除

### 依赖安装失败

如果自动安装依赖失败，可以手动安装：

```bash
cd my-app
pnpm install
```

### Git 初始化失败

如果 Git 初始化失败，可以手动初始化：

```bash
cd my-app
git init
git add .
git commit -m "Initial commit"
```

## 许可证

MIT
