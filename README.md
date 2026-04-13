# AI 效率助手 - Chrome 扩展

一个基于 React + TypeScript + Vite 构建的 Chrome 扩展，集成 DeepSeek AI，帮助你在浏览网页时高效处理文字。

## 功能特性

- **改写** - 用不同的表达方式重新书写选中的文字
- **扩写** - 对选中的文字进行扩展和补充
- **翻译** - 中英文智能互译
- **总结** - 提炼文字核心要点

## 使用方式

1. **浮动按钮**：在网页中选中文字后，会出现一个紫色的浮动按钮，点击后展开操作面板
2. **右键菜单**：选中文字后右键，在「AI 效率助手」子菜单中选择操作
3. **弹出窗口**：点击扩展图标打开 Popup，手动输入或自动获取选中文本

## 技术栈

- React 18 + TypeScript
- Vite 5（使用 @crxjs/vite-plugin）
- Tailwind CSS 3
- Chrome Extension Manifest V3
- DeepSeek API

## 项目结构

```
src/
├── background/       # Service Worker（右键菜单、API 调用、消息路由）
│   └── index.ts
├── components/       # 共享 React 组件
│   ├── ActionButton.tsx
│   ├── ResultPanel.tsx
│   └── SettingsPanel.tsx
├── content/          # Content Script（注入页面，浮动按钮和操作面板）
│   ├── content.css
│   └── index.tsx
├── popup/            # 弹出窗口界面
│   ├── index.html
│   ├── main.tsx
│   ├── Popup.tsx
│   └── popup.css
├── types/            # TypeScript 类型定义
│   ├── index.ts
│   └── constants.ts
├── utils/            # 工具函数
│   ├── api.ts        # DeepSeek API 调用
│   └── storage.ts    # Chrome Storage 封装
└── manifest.ts       # Chrome Extension Manifest V3 配置
```

## 开发指南

### 环境准备

- Node.js >= 18
- npm >= 9

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
npm run build
```

构建产物在 `dist/` 目录下。

### 安装到 Chrome

1. 运行 `npm run build` 生成构建产物
2. 打开 Chrome，访问 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择项目的 `dist` 目录
6. 扩展安装完成后，点击扩展图标打开 Popup，在设置中输入你的 DeepSeek API Key

### 获取 API Key

访问 [DeepSeek 开放平台](https://platform.deepseek.com/api_keys) 注册并创建 API Key。

## 配置说明

在 Popup 的设置面板中可以配置：

- **API Key** - DeepSeek API 密钥（必填）
- **模型** - 选择使用的模型（deepseek-chat / deepseek-reasoner）
- **Temperature** - 控制输出随机性（0 = 精确，1.5 = 创意）

## 注意事项

- API Key 存储在浏览器本地（chrome.storage.local），不会上传到任何第三方服务
- 扩展需要网络访问权限以调用 DeepSeek API
- Content Script 会注入到所有网页中，但仅在用户主动操作时才会工作
