# GoodLuck

个人理财助手应用，支持实时查看基金和股票行情数据。

## 技术栈

- **框架**: Umi 4 + React 18
- **语言**: TypeScript
- **构建工具**: Vite
- **包管理**: pnpm

## 功能特性

- 📊 实时基金数据展示
- 📈 股票行情实时监控（上证指数、沪深300、创业板等）
- 🔄 数据自动刷新
- 📱 响应式布局

## 本地启动

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 启动步骤

1. **安装依赖**

```bash
pnpm install
```

2. **启动开发服务器**

```bash
pnpm run dev
```

3. **访问地址**

- 首页: http://localhost:8000/#/
- Home 页: http://localhost:8000/#/home
- Chat 页: http://localhost:8000/#/chat
- Docs 页: http://localhost:8000/#/docs

## 部署到远程

### GitHub Pages 部署

项目已配置自动部署流程，步骤如下：

1. **创建 GitHub 仓库**

确保项目已关联到 GitHub 仓库。

2. **启用 GitHub Pages**

在 GitHub 仓库设置中：
- 打开 `Settings` > `Pages`
- 在 `Build and deployment` 部分，选择 `Deploy from a branch`
- 选择 `gh-pages` 分支和 `/ (root)` 目录
- 点击 `Save`

3. **自动部署**

每次提交代码到 `main` 分支，GitHub Actions 会自动构建并部署到 `gh-pages` 分支。

### 手动部署

如果需要手动部署，执行以下命令：

```bash
# 构建项目
pnpm run build

# 部署到 gh-pages 分支
cd dist
git add -f .
git commit -m "Deploy to GitHub Pages"
git push origin master:gh-pages -f
```

## 远程访问地址

部署成功后，通过以下地址访问：

| 页面 | 地址 |
|------|------|
| 首页 | https://ruohan999.github.io/goodluck/#/ |
| Home 页 | https://ruohan999.github.io/goodluck/#/home |
| Chat 页 | https://ruohan999.github.io/goodluck/#/chat |
| Docs 页 | https://ruohan999.github.io/goodluck/#/docs |

## 配置说明

### `.umirc.ts` 关键配置

```typescript
export default defineConfig({
  // 资源路径：开发环境使用 /，生产环境使用 ./
  publicPath: process.env.NODE_ENV === 'production' ? './' : '/',
  // 路由基准路径
  base: '/',
  // 使用 hash 路由模式（避免 GitHub Pages 404 问题）
  history: {
    type: 'hash',
  },
});
```

### API 说明

- **基金数据**: 使用 JSONP 方式请求 `https://fundgz.1234567.com.cn`
- **股票数据**: 使用 JSONP 方式请求 `https://hq.sinajs.cn`

## 注意事项

1. 由于使用 hash 路由模式，所有页面路径需要包含 `#`
2. GitHub Pages 部署时，`publicPath` 必须设置为 `./` 以确保资源正确加载
3. 生产环境中使用 JSONP 方式获取数据，避免跨域问题