# React + TypeScript 开发 Chrome 扩展完整教程（Manifest V3）

> 本文从零开始，手把手教你用 @crxjs/vite-plugin + React 18 + TypeScript 开发一个 Chrome 扩展。包含项目搭建、Manifest V3 配置、Content Script、Background Service Worker、Popup 开发、Chrome 消息通信等核心知识点。所有代码来自真实开源项目，完整可运行。

## 前言

Chrome 扩展是一个非常容易被前端工程师忽视的领域。它本质上就是一个 Web 应用，但拥有普通网页没有的能力：访问浏览器 API、修改网页内容、管理标签页等。

2026 年，Chrome 已经全面推行 Manifest V3 规范。相比 V2，V3 有几个关键变化：

- Background Page 变成了 Service Worker（不能常驻内存）
- 更严格的 CSP（Content Security Policy）策略
- 更规范的权限管理
- 不再支持远程代码加载

本文将以我的开源项目「AI 效率助手」为例，带你从零搭建一个完整的 Chrome 扩展。

**项目源码**：[https://github.com/WZX-wq/ai-efficiency-assistant](https://github.com/WZX-wq/ai-efficiency-assistant)

---

## 一、技术选型

| 技术 | 说明 | 选择理由 |
|------|------|----------|
| React 18 | UI 框架 | 组件化开发，生态丰富 |
| TypeScript | 类型系统 | 类型安全，减少运行时错误 |
| Vite | 构建工具 | 极快的 HMR，开箱即用 |
| @crxjs/vite-plugin | Chrome 扩展插件 | 自动处理 manifest，支持 HMR |
| Tailwind CSS | 样式方案 | 原子化 CSS，开发效率高 |

---

## 二、项目初始化

### 2.1 创建项目

```bash
# 创建项目目录
mkdir ai-efficiency-assistant
cd ai-efficiency-assistant

# 初始化 package.json
npm init -y

# 安装核心依赖
npm install react@^18.3.1 react-dom@^18.3.1

# 安装开发依赖
npm install -D \
  typescript@^5.5.2 \
  vite@^5.3.1 \
  @vitejs/plugin-react@^4.3.1 \
  @crxjs/vite-plugin@^2.0.0-beta.25 \
  @types/chrome@^0.0.268 \
  @types/react@^18.3.3 \
  @types/react-dom@^18.3.0 \
  tailwindcss@^3.4.4 \
  postcss@^8.4.38 \
  autoprefixer@^10.4.19
```

### 2.2 项目结构

```
ai-efficiency-assistant/
├── public/
│   └── icons/                  # 扩展图标
│       ├── icon-16.png
│       ├── icon-32.png
│       ├── icon-48.png
│       └── icon-128.png
├── src/
│   ├── background/
│   │   └── index.ts            # Service Worker
│   ├── content/
│   │   ├── index.tsx           # Content Script
│   │   └── content.css         # Content Script 样式
│   ├── popup/
│   │   ├── index.html          # Popup 入口 HTML
│   │   ├── main.tsx            # Popup React 入口
│   │   ├── Popup.tsx           # Popup 主组件
│   │   └── popup.css           # Popup 样式
│   ├── components/
│   │   ├── ActionButton.tsx    # 操作按钮组件
│   │   ├── ResultPanel.tsx     # 结果面板组件
│   │   └── SettingsPanel.tsx   # 设置面板组件
│   ├── types/
│   │   ├── index.ts            # 类型定义
│   │   └── constants.ts        # 常量配置
│   ├── utils/
│   │   ├── api.ts              # API 调用
│   │   └── storage.ts          # 存储管理
│   └── manifest.ts             # Manifest 配置
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
└── package.json
```

---

## 三、配置文件

### 3.1 TypeScript 配置

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```json
// tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
```

### 3.2 Vite 配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './src/manifest';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
  },
});
```

### 3.3 Tailwind CSS 配置

```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/popup/index.html',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

```javascript
// postcss.config.js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

---

## 四、Manifest V3 配置

Manifest 是 Chrome 扩展的核心配置文件。使用 `@crxjs/vite-plugin`，我们可以用 TypeScript 来编写 manifest：

```typescript
// src/manifest.ts
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'AI 效率助手',
  description: '选中网页文字后，一键调用 DeepSeek AI 进行改写、扩写、翻译、总结',
  version: '1.0.0',

  // 权限声明
  permissions: ['storage', 'activeTab', 'contextMenus', 'scripting'],

  // 扩展图标（点击工具栏图标时弹出的页面）
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '32': 'icons/icon-32.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },

  // 后台服务（Service Worker）
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },

  // 内容脚本（注入到网页中）
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.tsx'],
      css: ['src/content/content.css'],
    },
  ],

  // 扩展图标
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
});
```

**权限说明**：

| 权限 | 用途 |
|------|------|
| `storage` | 使用 `chrome.storage` 存储用户设置 |
| `activeTab` | 访问当前活动标签页 |
| `contextMenus` | 创建右键菜单 |
| `scripting` | 动态注入脚本到网页 |

---

## 五、Background Service Worker

Background Service Worker 是扩展的"大脑"，负责处理右键菜单、API 调用和消息路由。

```typescript
// src/background/index.ts
import type { ActionType, ExtensionMessage, ExtensionSettings } from '@/types';
import { getActionPrompt } from '@/types/constants';
import { loadSettings } from '@/utils/storage';
import { callDeepSeekAPI } from '@/utils/api';

// ============ 右键菜单 ============

/** 扩展安装时创建右键菜单 */
chrome.runtime.onInstalled.addListener(() => {
  const actions: { type: ActionType; title: string }[] = [
    { type: 'rewrite', title: 'AI 改写' },
    { type: 'expand', title: 'AI 扩写' },
    { type: 'translate', title: 'AI 翻译' },
    { type: 'summarize', title: 'AI 总结' },
  ];

  // 创建父菜单
  chrome.contextMenus.create({
    id: 'ai-assistant-parent',
    title: 'AI 效率助手',
    contexts: ['selection'],
  });

  // 创建子菜单项
  actions.forEach((action) => {
    chrome.contextMenus.create({
      id: `ai-assistant-${action.type}`,
      parentId: 'ai-assistant-parent',
      title: action.title,
      contexts: ['selection'],
    });
  });
});

/** 右键菜单点击处理 */
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  const menuId = info.menuItemId as string;
  const actionTypeMap: Record<string, ActionType> = {
    'ai-assistant-rewrite': 'rewrite',
    'ai-assistant-expand': 'expand',
    'ai-assistant-translate': 'translate',
    'ai-assistant-summarize': 'summarize',
  };

  const actionType = actionTypeMap[menuId];
  if (!actionType || !info.selectionText) return;

  try {
    const settings = await loadSettings();
    const prompt = getActionPrompt(actionType, info.selectionText);
    const result = await callDeepSeekAPI(prompt, settings);

    // 将结果发送到 content script 显示
    chrome.tabs.sendMessage(tab.id, {
      type: 'ACTION_RESULT',
      action: actionType,
      result,
    } as ExtensionMessage);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    chrome.tabs.sendMessage(tab.id, {
      type: 'ACTION_RESULT',
      action: actionType,
      error: errorMessage,
    } as ExtensionMessage);
  }
});

// ============ 消息处理 ============

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    // 处理来自 content script 的 AI 操作请求
    if (message.type === 'AI_ACTION') {
      handleAIAction(message.action!, message.selectedText!)
        .then((result) => {
          sendResponse({ type: 'ACTION_RESULT', result });
        })
        .catch((error) => {
          sendResponse({
            type: 'ACTION_RESULT',
            error: error instanceof Error ? error.message : '未知错误',
          });
        });
      return true; // 保持异步通道（重要！）
    }

    // 加载设置
    if (message.type === 'LOAD_SETTINGS') {
      loadSettings().then((settings) => {
        sendResponse({ type: 'LOAD_SETTINGS', settings });
      });
      return true;
    }

    // 保存设置
    if (message.type === 'STORE_SETTINGS') {
      const settings = message.settings as ExtensionSettings;
      chrome.storage.local.set({ ai_assistant_settings: settings }, () => {
        sendResponse({ type: 'STORE_SETTINGS', success: true });
      });
      return true;
    }
  },
);

/** 处理 AI 操作 */
async function handleAIAction(
  actionType: ActionType,
  selectedText: string,
): Promise<string> {
  const settings = await loadSettings();
  const prompt = getActionPrompt(actionType, selectedText);
  return callDeepSeekAPI(prompt, settings);
}
```

**关键知识点**：

1. **`return true`**：在 `onMessage` 回调中返回 `true` 表示你要异步调用 `sendResponse`。如果不返回 `true`，消息通道会立即关闭。
2. **Service Worker 生命周期**：Manifest V3 的 Service Worker 不是常驻的，空闲时会被终止。不要在全局作用域中存储状态。
3. **`chrome.contextMenus`**：需要声明 `contextMenus` 权限才能使用。

---

## 六、Content Script

Content Script 是注入到用户正在浏览的网页中的脚本。它可以访问页面的 DOM，但不能访问页面的 JavaScript 变量。

```typescript
// src/content/index.tsx
import type { ActionType, ExtensionMessage } from '@/types';

// ============ DOM 元素创建 ============

/** 创建浮动按钮 */
function createFloatingButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.className = 'ai-assistant-float-btn';
  btn.title = 'AI 效率助手';
  btn.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>`;
  return btn;
}

/** 创建快捷操作面板 */
function createPanel(): HTMLDivElement {
  const panel = document.createElement('div');
  panel.className = 'ai-assistant-panel';

  const actions: { type: ActionType; label: string; desc: string; icon: string }[] = [
    { type: 'rewrite', label: '改写', desc: '重新表达选中文字', icon: 'Aa' },
    { type: 'expand', label: '扩写', desc: '扩展补充更多内容', icon: '+' },
    { type: 'translate', label: '翻译', desc: '中英文互译', icon: 'T' },
    { type: 'summarize', label: '总结', desc: '提炼核心要点', icon: 'S' },
  ];

  panel.innerHTML = `
    <div class="ai-assistant-panel-header">AI 效率助手</div>
    ${actions
      .map(
        (a) => `
      <button class="ai-assistant-panel-item" data-action="${a.type}">
        <span class="ai-assistant-panel-item-icon">${a.icon}</span>
        <div>
          <div class="ai-assistant-panel-item-label">${a.label}</div>
          <div class="ai-assistant-panel-item-desc">${a.desc}</div>
        </div>
      </button>
    `,
      )
      .join('')}
  `;

  return panel;
}

// ============ 状态管理 ============

let floatingBtn: HTMLButtonElement;
let panel: HTMLDivElement;
let selectedText = '';
let isPanelVisible = false;

// ============ 位置计算 ============

function getSelectionRect(): DOMRect | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
    return null;
  }
  const range = selection.getRangeAt(0);
  return range.getBoundingClientRect();
}

function positionElements(rect: DOMRect) {
  // 浮动按钮位置（选中文本的右上方）
  const btnX = Math.min(rect.right + 8, window.innerWidth - 48);
  const btnY = Math.max(rect.top - 8, 8);

  floatingBtn.style.left = `${btnX}px`;
  floatingBtn.style.top = `${btnY}px`;

  // 操作面板位置（选中文本的右下方）
  const panelX = Math.min(rect.right + 8, window.innerWidth - 220);
  const panelY = Math.min(rect.bottom + 8, window.innerHeight - 250);

  panel.style.left = `${panelX}px`;
  panel.style.top = `${panelY}px`;
}

// ============ 事件处理 ============

function handleMouseUp() {
  requestAnimationFrame(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0) {
      selectedText = text;
      const rect = getSelectionRect();
      if (rect) {
        positionElements(rect);
        floatingBtn.classList.add('visible');
      }
    } else {
      hideAll();
    }
  });
}

function handleMouseDown(e: MouseEvent) {
  const target = e.target as Node;
  if (!floatingBtn.contains(target) && !panel.contains(target)) {
    hideAll();
  }
}

function handleFloatBtnClick(e: MouseEvent) {
  e.preventDefault();
  e.stopPropagation();
  isPanelVisible ? hidePanel() : showPanel();
}

function handlePanelAction(e: MouseEvent) {
  const target = e.target as HTMLElement;
  const actionItem = target.closest('.ai-assistant-panel-item') as HTMLElement;

  if (actionItem) {
    const actionType = actionItem.dataset.action as ActionType;
    if (actionType && selectedText) {
      // 发送消息给 background script 处理
      chrome.runtime.sendMessage({
        type: 'AI_ACTION',
        action: actionType,
        selectedText,
      } as ExtensionMessage);
      hideAll();
    }
  }
}

function showPanel() {
  panel.classList.add('visible');
  isPanelVisible = true;
}

function hidePanel() {
  panel.classList.remove('visible');
  isPanelVisible = false;
}

function hideAll() {
  floatingBtn.classList.remove('visible');
  hidePanel();
  selectedText = '';
}

// ============ 初始化 ============

function init() {
  floatingBtn = createFloatingButton();
  panel = createPanel();

  document.body.appendChild(floatingBtn);
  document.body.appendChild(panel);

  // 绑定事件
  document.addEventListener('mouseup', handleMouseUp);
  document.addEventListener('mousedown', handleMouseDown);
  floatingBtn.addEventListener('click', handleFloatBtnClick);
  panel.addEventListener('click', handlePanelAction);

  // 监听来自 background 的消息
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'GET_SELECTED_TEXT') {
      const selection = window.getSelection();
      const text = selection?.toString().trim() || '';
      sendResponse({ selectedText: text });
      return true;
    }
  });
}

init();
```

### Content Script 样式

```css
/* src/content/content.css */

/* 浮动按钮 */
.ai-assistant-float-btn {
  position: fixed;
  z-index: 2147483647;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  opacity: 0;
  transform: scale(0.8);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
}

.ai-assistant-float-btn.visible {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

.ai-assistant-float-btn:hover {
  box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5);
  transform: scale(1.1);
}

.ai-assistant-float-btn.visible:hover {
  transform: scale(1.1);
}

/* 操作面板 */
.ai-assistant-panel {
  position: fixed;
  z-index: 2147483647;
  width: 200px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
  border: 1px solid #e5e7eb;
  opacity: 0;
  transform: translateY(-8px);
  transition: opacity 0.2s, transform 0.2s;
  pointer-events: none;
  overflow: hidden;
}

.ai-assistant-panel.visible {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

.ai-assistant-panel-header {
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #f3f4f6;
}

.ai-assistant-panel-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.ai-assistant-panel-item:hover {
  background: #f9fafb;
}

.ai-assistant-panel-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  color: white;
}

.ai-assistant-panel-item-label {
  font-size: 13px;
  font-weight: 500;
  color: #1f2937;
}

.ai-assistant-panel-item-desc {
  font-size: 11px;
  color: #9ca3af;
}
```

---

## 七、Popup 开发

Popup 是用户点击扩展图标时弹出的页面。

### 7.1 入口 HTML

```html
<!-- src/popup/index.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI 效率助手</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

### 7.2 React 入口

```typescript
// src/popup/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import Popup from './Popup';
import '../content/content.css';
import './popup.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
```

### 7.3 Popup 主组件

```typescript
// src/popup/Popup.tsx
import { useState, useEffect, useCallback } from 'react';
import type { ActionType, ExtensionSettings } from '@/types';
import { ACTION_CONFIGS } from '@/types/constants';
import { loadSettings, saveSettings } from '@/utils/storage';

export default function Popup() {
  const [selectedText, setSelectedText] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [settings, setSettings] = useState<ExtensionSettings>({
    apiKey: '',
    apiUrl: 'https://api.edgefn.net/v1/chat/completions',
    model: 'DeepSeek-V3',
    temperature: 0.7,
  });

  // 加载设置
  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  // 获取当前标签页的选中文本
  const fetchSelectedText = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_SELECTED_TEXT',
      });

      if (response?.selectedText) {
        setSelectedText(response.selectedText);
      }
    } catch {
      // Content script 可能未加载
    }
  }, []);

  useEffect(() => {
    fetchSelectedText();
  }, [fetchSelectedText]);

  // 执行 AI 操作
  const handleAction = useCallback(async (actionType: ActionType) => {
    if (!selectedText.trim()) {
      setError('请先在网页中选中文字');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');
    setActiveAction(actionType);

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'AI_ACTION',
        action: actionType,
        selectedText,
      });

      if (response?.error) {
        setError(response.error);
      } else if (response?.result) {
        setResult(response.result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
      setActiveAction(null);
    }
  }, [selectedText]);

  // 复制结果
  const handleCopy = useCallback(async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result);
  }, [result]);

  return (
    <div className="bg-gray-50 min-h-[400px] flex flex-col">
      <header className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3">
        <h1 className="text-white font-semibold text-base">AI 效率助手</h1>
      </header>

      <div className="flex-1 p-4 flex flex-col gap-3">
        <textarea
          value={selectedText}
          onChange={(e) => setSelectedText(e.target.value)}
          placeholder="请在网页中选中文字，或在此处手动输入..."
          className="w-full h-24 px-3 py-2 text-sm bg-white border rounded-lg resize-none"
        />

        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(ACTION_CONFIGS) as ActionType[]).map((actionType) => (
            <button
              key={actionType}
              onClick={() => handleAction(actionType)}
              disabled={loading || !selectedText.trim()}
              className="py-2 px-1 text-xs font-medium rounded-lg bg-white border hover:bg-indigo-50 disabled:opacity-50"
            >
              {ACTION_CONFIGS[actionType].label}
            </button>
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        {result && (
          <div className="bg-white border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium text-gray-500">处理结果</span>
              <button onClick={handleCopy} className="text-xs text-indigo-500 hover:underline">
                复制
              </button>
            </div>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{result}</p>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 八、Chrome 消息通信机制

Chrome 扩展中各部分之间的通信是最核心的知识点。理解了消息通信，你就掌握了 Chrome 扩展开发的精髓。

### 8.1 通信架构

```
┌──────────────┐    sendMessage     ┌──────────────────┐
│  Content      │ ────────────────> │  Background       │
│  Script       │ <──────────────── │  Service Worker   │
│               │    sendMessage     │                   │
└──────────────┘                   └──────────────────┘
        ^                                   ^
        │                                   │
        │  sendMessage                      │  sendMessage
        │                                   │
┌───────┴──────┐                   ┌───────┴──────────┐
│   Popup      │                   │  chrome.storage  │
│              │                   │                  │
└──────────────┘                   └──────────────────┘
```

### 8.2 消息类型定义

```typescript
// types/index.ts
export interface ExtensionMessage {
  type: 'GET_SELECTED_TEXT' | 'AI_ACTION' | 'ACTION_RESULT' | 'STORE_SETTINGS' | 'LOAD_SETTINGS';
  action?: ActionType;
  selectedText?: string;
  result?: string;
  settings?: ExtensionSettings;
  error?: string;
}
```

### 8.3 通信模式

**单向请求-响应**：

```typescript
// 发送方（Content Script 或 Popup）
const response = await chrome.runtime.sendMessage({
  type: 'AI_ACTION',
  action: 'rewrite',
  selectedText: '要处理的文字',
});

// 接收方（Background）
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'AI_ACTION') {
    // 处理请求
    processAction(message.action, message.selectedText)
      .then(result => sendResponse({ result }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // 异步响应必须返回 true
  }
});
```

**主动推送（Background -> Content Script）**：

```typescript
// Background 主动向特定标签页发送消息
chrome.tabs.sendMessage(tabId, {
  type: 'ACTION_RESULT',
  action: 'rewrite',
  result: '处理结果...',
});

// Content Script 接收
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ACTION_RESULT') {
    // 处理结果
    displayResult(message.result);
  }
});
```

---

## 九、调试技巧

### 9.1 调试 Content Script

1. 在目标网页上按 F12 打开开发者工具
2. 在 Console 中可以看到 Content Script 的 `console.log` 输出
3. 在 Sources 面板中可以找到 Content Script 的源码并设置断点

### 9.2 调试 Background Service Worker

1. 打开 `chrome://extensions/`
2. 找到你的扩展，点击「Service Worker」链接
3. 会打开一个独立的开发者工具窗口

### 9.3 调试 Popup

1. 点击扩展图标打开 Popup
2. 右键点击 Popup 界面，选择「检查」
3. 会打开 Popup 的开发者工具

### 9.4 热更新开发

使用 `@crxjs/vite-plugin`，修改代码后会自动热更新：

```bash
npm run dev
```

然后在 `chrome://extensions/` 中加载 `dist/` 目录即可。修改代码后，在扩展管理页面点击刷新按钮即可看到更新。

---

## 十、构建和发布

### 10.1 构建

```bash
npm run build
```

构建产物在 `dist/` 目录中。

### 10.2 本地安装

1. 打开 `chrome://extensions/`
2. 开启「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `dist/` 目录

### 10.3 发布到 Chrome Web Store

1. 将 `dist/` 目录打包为 `.zip`
2. 访问 [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
3. 上传 `.zip` 文件
4. 填写商店信息（名称、描述、截图等）
5. 提交审核（通常 1-3 个工作日）

---

## 总结

本文完整介绍了用 React + TypeScript 开发 Chrome 扩展的全流程。核心知识点回顾：

1. **@crxjs/vite-plugin** 让 Chrome 扩展开发体验和普通 Web 应用一样流畅
2. **Manifest V3** 是当前的标准，Service Worker 替代了 Background Page
3. **消息通信**是扩展各部分协作的核心机制
4. **Content Script** 可以操作页面 DOM，但受 CSP 限制
5. **chrome.storage** 是扩展内数据持久化的推荐方案

完整项目代码已开源，欢迎 Star 和 Fork：

- **GitHub**：[https://github.com/WZX-wq/ai-efficiency-assistant](https://github.com/WZX-wq/ai-efficiency-assistant)
- **在线体验**：[https://ai-efficiency-assistant.vercel.app](https://ai-efficiency-assistant.vercel.app)

如果这篇文章对你有帮助，欢迎点赞收藏。有问题欢迎在评论区讨论！
