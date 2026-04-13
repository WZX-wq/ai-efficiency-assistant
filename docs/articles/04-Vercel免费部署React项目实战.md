# Vercel 免费部署 React 项目：从 0 到上线只需 5 分钟

> 本文手把手教你用 Vercel CLI 部署 React + Vite 项目到 Vercel 免费版。包含安装 CLI、登录认证、配置 vercel.json、执行部署、绑定自定义域名、环境变量管理等完整步骤。所有命令均经过实际验证。

## 前言

很多前端开发者写完了项目，却卡在了部署这一步。买服务器、配 Nginx、申请 SSL 证书、配域名解析……光是想想就头大。

其实，对于前端项目和全栈应用，Vercel 是最简单的部署方案。免费版提供了足够个人使用的资源，而且部署过程真的只需要几分钟。

本文将以我的「AI 效率助手」Web 版本为例，完整演示从本地项目到线上访问的全过程。

**项目源码**：[https://github.com/WZX-wq/ai-efficiency-assistant](https://github.com/WZX-wq/ai-efficiency-assistant)
**在线体验**：[https://ai-efficiency-assistant.vercel.app](https://ai-efficiency-assistant.vercel.app)

---

## 一、为什么选择 Vercel？

### Vercel 免费版包含什么？

| 资源 | 免费额度 | 说明 |
|------|----------|------|
| 带宽 | 100GB/月 | 个人项目完全够用 |
| 构建时间 | 6000 分钟/月 | 约 100 小时 |
| 部署次数 | 无限制 | 每次推送自动部署 |
| Serverless 函数 | 100GB-Hrs | 免费后端能力 |
| SSL 证书 | 免费 | 自动配置 |
| 自定义域名 | 支持 | 免费配置 |

### Vercel vs 其他方案

| 方案 | 部署难度 | 免费额度 | 自定义域名 | 适合场景 |
|------|----------|----------|------------|----------|
| **Vercel** | 极低 | 慷慨 | 免费 | 前端/全栈 |
| Netlify | 低 | 慷慨 | 免费 | 静态站点 |
| GitHub Pages | 中 | 无限 | 需 CNAME | 静态站点 |
| 云服务器 | 高 | 需付费 | 需配置 | 完全控制 |
| Cloudflare Pages | 低 | 慷慨 | 免费 | 静态站点 |

对于 React + Vite 项目，Vercel 是最佳选择。

---

## 二、准备工作

### 2.1 注册 Vercel 账号

1. 访问 [vercel.com](https://vercel.com)
2. 点击「Sign Up」
3. 推荐使用 GitHub 账号登录（方便后续关联仓库）

### 2.2 确保项目可以本地构建

在部署之前，先确保项目在本地可以正常构建：

```bash
# 进入项目目录
cd ai-efficiency-assistant/web

# 安装依赖
npm install

# 本地构建
npm run build

# 本地预览
npm run preview
```

如果构建成功，说明项目已经可以部署了。

### 2.3 项目结构

我的 Web 版本项目结构如下：

```
web/
├── index.html              # 入口 HTML
├── package.json            # 依赖配置
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 配置
├── postcss.config.js       # PostCSS 配置
├── tailwind.config.js      # Tailwind 配置
├── vite-env.d.ts           # 类型声明
└── src/                    # 源代码
    ├── App.tsx
    ├── main.tsx
    └── ...
```

---

## 三、方式一：Vercel CLI 部署（推荐）

### 3.1 安装 Vercel CLI

```bash
# 全局安装 Vercel CLI
npm i -g vercel

# 验证安装
vercel --version
```

### 3.2 登录 Vercel

```bash
# 登录（会打开浏览器进行认证）
vercel login
```

执行后会显示：

```
Vercel CLI 33.x.x
> Log in to Vercel
? Log in to Vercel (Y/n)
```

输入 `Y` 后会打开浏览器，选择你的 GitHub 账号授权即可。

### 3.3 首次部署

```bash
# 进入项目目录
cd web

# 执行部署
vercel
```

首次部署时，Vercel CLI 会询问一系列配置问题：

```
? Set up and deploy “~/ai-efficiency-assistant/web”? [Y/n] y
? Which scope do you want to deploy to? your-username
? Link to existing project? [y/N] n
? What's your project's name? ai-efficiency-assistant-web
? In which directory is your code located? ./
? Want to modify these settings? [y/N] n
```

Vercel 会自动检测到这是一个 Vite + React 项目，并使用合适的构建配置。

部署完成后，终端会输出：

```
> Deploying...
> Production: https://ai-efficiency-assistant-web-xxx.vercel.app [2s]
```

访问这个链接，你就能看到线上版本了。

### 3.4 生产环境部署

首次 `vercel` 命令创建的是预览部署（Preview Deployment）。要部署到生产环境：

```bash
# 部署到生产环境
vercel --prod
```

```
> Deploying to production...
> Production: https://ai-efficiency-assistant-web.vercel.app [3s]
```

### 3.5 配置 vercel.json

对于 React SPA（单页应用），需要配置路由重写，否则刷新页面会 404：

```json
// vercel.json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

将 `vercel.json` 放在项目根目录，再次部署即可生效。

### 3.6 配置环境变量

如果你的项目需要环境变量（比如 API Key）：

```bash
# 添加环境变量
vercel env add DEEPSEEK_API_KEY

# 查看所有环境变量
vercel env ls

# 拉取环境变量到本地
vercel env pull .env.local
```

Vercel 会提示你选择环境（Production / Preview / Development），可以为不同环境配置不同的值。

### 3.7 常用 CLI 命令

```bash
# 查看部署列表
vercel ls

# 查看项目信息
vercel inspect

# 查看实时日志
vercel logs

# 删除某个部署
vercel rm [deployment-url]

# 查看域名列表
vercel domains ls

# 绑定自定义域名
vercel domains add your-domain.com
```

---

## 四、方式二：GitHub 自动部署

如果你不想用 CLI，可以通过 GitHub 仓库实现自动部署。

### 4.1 关联 GitHub 仓库

1. 将代码推送到 GitHub
2. 访问 [vercel.com/new](https://vercel.com/new)
3. 选择你的 GitHub 仓库
4. Vercel 会自动检测项目类型和构建配置

### 4.2 配置构建设置

Vercel 通常能自动检测到正确的配置。如果没有，可以手动设置：

| 配置项 | 值 |
|--------|-----|
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | `npm install` |
| Development Command | `npm run dev` |

### 4.3 自动部署触发条件

关联 GitHub 后，以下操作会自动触发部署：

- 推送到 `main` 分支 → 生产环境部署
- 推送到其他分支 → 预览环境部署
- 创建 Pull Request → 预览环境部署

### 4.4 忽略特定目录

如果你的仓库中包含不需要部署的目录（比如 Chrome 扩展的源码），可以在 `vercel.json` 中配置：

```json
{
  "git": {
    "deploymentEnabled": {
      "src/**": false
    }
  }
}
```

或者将 Web 版本放在独立的子目录中（如 `web/`），然后在 Vercel 控制台设置 Root Directory 为 `web`。

---

## 五、绑定自定义域名

### 5.1 在 Vercel 添加域名

```bash
# 方式一：CLI
vercel domains add your-domain.com

# 方式二：在 Vercel 控制台操作
# Settings > Domains > Add Domain
```

### 5.2 配置 DNS 解析

在你的域名服务商（如阿里云、Cloudflare）添加 DNS 记录：

**方式一：A 记录**

| 类型 | 名称 | 值 |
|------|------|-----|
| A | @ | 76.76.21.21 |

**方式二：CNAME 记录（推荐）**

| 类型 | 名称 | 值 |
|------|------|-----|
| CNAME | www | cname.vercel-dns.com |
| CNAME | @ | cname.vercel-dns.com |

### 5.3 等待生效

DNS 解析通常需要几分钟到几小时生效。Vercel 会自动为你的域名配置 SSL 证书（Let's Encrypt）。

你可以在 Vercel 控制台的 Domains 页面查看域名的验证状态：

- **Valid Configuration**：配置正确，等待 DNS 生效
- **Invalid Configuration**：DNS 记录配置有误，需要检查
- **Domain Verified**：域名已生效

---

## 六、Vite 项目部署注意事项

### 6.1 Base Path 配置

如果你的项目部署在子路径下（如 `your-domain.com/app/`），需要配置 base：

```typescript
// vite.config.ts
export default defineConfig({
  base: '/app/',
  // ...
});
```

### 6.2 构建输出目录

Vite 默认将构建产物输出到 `dist/` 目录。确保 Vercel 的 Output Directory 设置为 `dist`。

### 6.3 SPA 路由问题

这是最常见的坑。React Router 等路由库使用的是 HTML5 History API，直接刷新页面会 404。解决方案就是前面提到的 `vercel.json` 配置：

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### 6.4 静态资源缓存

Vercel 默认会对 `_next/static/` 目录下的文件设置长期缓存。对于 Vite 项目，静态资源在 `dist/assets/` 下，Vercel 会根据文件名中的 hash 自动处理缓存。

### 6.5 环境变量前缀

在 Vite 项目中，只有以 `VITE_` 开头的环境变量才会暴露给前端代码：

```bash
# 这个变量可以在前端代码中访问
vercel env add VITE_API_URL

# 这个变量只能在 Node.js 环境中访问（Serverless Functions）
vercel env add SECRET_KEY
```

```typescript
// 前端代码中使用
const apiUrl = import.meta.env.VITE_API_URL;
```

---

## 七、常见问题排查

### Q1：部署成功但页面空白

**原因**：通常是 base path 配置错误或构建产物路径不对。

**排查**：
```bash
# 本地构建后检查产物
npm run build
ls dist/
```

确保 `dist/index.html` 存在，且其中引用的资源路径正确。

### Q2：刷新页面 404

**原因**：SPA 路由未配置。

**解决**：添加 `vercel.json` 的 rewrites 配置（见第六章）。

### Q3：API 请求跨域

**原因**：前端和后端不在同一个域名下。

**解决方案**：
1. 使用 Vercel Serverless Functions 作为 API 代理
2. 在后端配置 CORS
3. 使用 Vercel 的 `rewrites` 将 API 请求代理到后端

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" },
    { "source": "/api/(.*)", "destination": "https://your-api.com/api/$1" }
  ]
}
```

### Q4：构建超时

**原因**：依赖安装或构建时间过长。

**解决**：
1. 优化 `package.json`，移除不必要的依赖
2. 使用 `vercel.json` 配置更长的超时时间
3. 检查是否有大型静态资源需要上传

### Q5：部署后样式丢失

**原因**：Tailwind CSS 的 content 路径配置不正确。

**解决**：确保 `tailwind.config.js` 中的 content 路径包含了所有模板文件：

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  // ...
};
```

---

## 八、进阶：Vercel Serverless Functions

如果你需要在 Vercel 上运行后端代码，可以使用 Serverless Functions：

```typescript
// api/hello.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    message: 'Hello from Vercel Serverless Function!',
    timestamp: new Date().toISOString(),
  });
}
```

将这个文件放在 `api/` 目录下，Vercel 会自动将其部署为 Serverless Function，访问路径为 `/api/hello`。

对于我的「AI 效率助手」项目，后端服务使用了独立的 Express 服务器（部署在其他平台），Web 版本通过 API 代理与后端通信。

---

## 九、完整部署流程总结

```bash
# 1. 安装 Vercel CLI
npm i -g vercel

# 2. 登录
vercel login

# 3. 进入项目目录
cd your-project

# 4. 创建 vercel.json
cat > vercel.json << 'EOF'
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
EOF

# 5. 配置环境变量（如需要）
vercel env add VITE_API_URL

# 6. 首次部署（预览环境）
vercel

# 7. 确认无误后，部署到生产环境
vercel --prod

# 8. 绑定自定义域名（可选）
vercel domains add your-domain.com
```

整个过程不超过 5 分钟。

---

## 总结

Vercel 让前端项目的部署变得极其简单。核心要点：

1. **Vercel 免费版足够个人使用**：100GB 带宽、无限部署次数
2. **CLI 部署最灵活**：`vercel --prod` 一条命令搞定
3. **GitHub 集成最方便**：推送代码自动部署
4. **vercel.json 是关键配置**：SPA 路由、API 代理、缓存策略都在这里配置
5. **自定义域名免费**：自动配置 SSL 证书

如果你想查看实际部署效果，可以访问我的「AI 效率助手」Web 版本：

- **在线体验**：[https://ai-efficiency-assistant.vercel.app](https://ai-efficiency-assistant.vercel.app)
- **GitHub**：[https://github.com/WZX-wq/ai-efficiency-assistant](https://github.com/WZX-wq/ai-efficiency-assistant)

觉得有帮助的话，欢迎给个 Star！
