# AI 效率助手 - Web 前端

基于 React 18 + TypeScript + Vite + Tailwind CSS 构建的 AI 文案处理 Web 应用。

## 功能特性

- **智能改写** - 优化文案表达，让文字更加专业流畅
- **一键扩写** - 基于原文扩展内容，丰富细节和论述
- **多语言翻译** - 支持多语言互译，打破语言壁垒
- **内容总结** - 提炼核心要点，快速把握文章主旨

## 技术栈

- **React 18** - UI 框架
- **TypeScript** - 类型安全
- **Vite 6** - 构建工具
- **Tailwind CSS 3** - 样式方案
- **React Router 6** - 路由管理

## 项目结构

```
web/
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── AiTextProcessor.tsx   # AI 文本处理核心组件
│   │   ├── ApiKeySettings.tsx     # API Key 设置弹窗
│   │   ├── Header.tsx             # 导航栏
│   │   └── Footer.tsx             # 页脚
│   ├── hooks/
│   │   └── useAi.ts              # AI 调用自定义 Hook
│   ├── pages/
│   │   ├── Home.tsx              # 首页/落地页
│   │   ├── Workspace.tsx         # 工作台页面
│   │   └── Pricing.tsx           # 定价页面
│   ├── services/
│   │   └── api.ts                # API 调用封装
│   ├── types/
│   │   └── index.ts              # TypeScript 类型定义
│   ├── App.tsx                   # 主应用组件
│   ├── main.tsx                  # 应用入口
│   └── index.css                 # 全局样式
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── vite-env.d.ts
```

## 快速开始

### 安装依赖

```bash
cd web
npm install
```

### 启动开发服务器

```bash
npm run dev
```

应用将在 http://localhost:3000 启动。

### 构建生产版本

```bash
npm run build
```

构建产物将输出到 `dist/` 目录。

### 预览生产版本

```bash
npm run preview
```

## API 配置

应用支持两种 AI 服务接入方式：

1. **OpenAI** - 直接使用 OpenAI API Key
2. **自定义服务** - 配置兼容 OpenAI 接口的自定义服务地址

API Key 仅保存在浏览器本地存储中，不会上传到服务器。

## 开发说明

- 开发环境下，Vite 会将 `/api` 路径的请求代理到 `http://localhost:8080`
- 如需修改后端地址，请编辑 `vite.config.ts` 中的 `server.proxy` 配置
