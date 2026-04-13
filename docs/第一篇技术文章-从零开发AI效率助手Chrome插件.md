# 从零开发一款 AI 效率助手 Chrome 插件（附完整源码）

> 本文记录了我从零开始，用 React + TypeScript + DeepSeek API 开发一款 AI 效率助手 Chrome 插件的全过程。插件支持选中网页文字后一键改写、扩写、翻译、总结。项目已开源，代码完整可运行。

## 前言

2026年，AI 工具已经渗透到我们工作的方方面面。但每次使用 AI 都要切换到 ChatGPT/DeepSeek 的网页，复制粘贴文本，再切回来——这个流程实在太繁琐了。

于是我想到：**能不能做一个 Chrome 插件，选中网页上的文字，右键就能直接调用 AI 处理？**

说干就干，花了两个周末，这款「AI 效率助手」就诞生了。

## 技术选型

| 技术 | 选择 | 理由 |
|------|------|------|
| 构建工具 | Vite + @crxjs/vite-plugin | 开发体验好，HMR 支持完善 |
| 前端框架 | React 18 + TypeScript | 组件化开发，类型安全 |
| 样式方案 | Tailwind CSS | 快速开发，不需要写 CSS 文件 |
| AI 能力 | DeepSeek API | 性价比高，中文能力强 |
| 扩展规范 | Manifest V3 | Chrome 最新标准 |

## 项目结构

```
ai-efficiency-assistant/
├── src/
│   ├── manifest.ts           # Manifest V3 配置
│   ├── background/
│   │   └── index.ts          # Service Worker（右键菜单、API 调用）
│   ├── content/
│   │   ├── index.tsx         # Content Script（浮动按钮 + 操作面板）
│   │   └── content.css       # 注入样式
│   ├── components/
│   │   ├── ActionButton.tsx   # 操作按钮组件
│   │   ├── SettingsPanel.tsx  # 设置面板
│   │   └── ResultPanel.tsx    # 结果展示
│   ├── popup/
│   │   ├── Popup.tsx          # Popup 主界面
│   │   └── main.tsx           # React 入口
│   ├── types/
│   │   ├── index.ts           # 类型定义
│   │   └── constants.ts       # 操作配置
│   └── utils/
│       ├── api.ts             # DeepSeek API 封装
│       └── storage.ts         # Chrome Storage 封装
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

## 核心实现

### 1. Manifest V3 配置

Chrome 扩展的配置文件定义了扩展的权限、入口文件等：

```typescript
// src/manifest.ts
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'AI 效率助手',
  description: '选中文字，一键 AI 改写/扩写/翻译/总结',
  version: '1.0.0',
  permissions: ['storage', 'activeTab', 'contextMenus'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.tsx'],
      css: ['src/content/content.css'],
    },
  ],
  action: {
    default_popup: 'src/popup/index.html',
    default_icon: {
      '16': 'icons/icon-16.png',
      '48': 'icons/icon-48.png',
      '128': 'icons/icon-128.png',
    },
  },
  icons: {
    '16': 'icons/icon-16.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
});
```

### 2. 三种触发方式

插件支持三种使用方式，覆盖不同场景：

**方式一：浮动按钮（Content Script）**

当用户选中网页文字后，自动在选区附近显示一个浮动按钮：

```typescript
// src/content/index.tsx 核心逻辑
document.addEventListener('mouseup', (e) => {
  const selection = window.getSelection();
  const selectedText = selection?.toString().trim();
  
  if (selectedText && selectedText.length > 0) {
    showFloatingButton(e.clientX, e.clientY, selectedText);
  } else {
    hideFloatingButton();
  }
});
```

**方式二：右键菜单（Background Service Worker）**

```typescript
// src/background/index.ts
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'ai-assistant',
    title: 'AI 效率助手',
    contexts: ['selection'],
  });
  
  // 创建子菜单
  ACTIONS.forEach(action => {
    chrome.contextMenus.create({
      id: `ai-${action.id}`,
      parentId: 'ai-assistant',
      title: action.label,
      contexts: ['selection'],
    });
  });
});
```

**方式三：Popup 窗口**

点击扩展图标，弹出独立窗口，可以手动输入或自动获取选中文本。

### 3. DeepSeek API 调用封装

```typescript
// src/utils/api.ts
const SYSTEM_PROMPTS: Record<AiActionType, string> = {
  rewrite: '你是一个专业的文案改写助手。请改写以下文本，保持原意但使用不同的表达方式。',
  expand: '你是一个专业的文案扩写助手。请在保持原意的基础上，扩写以下文本，增加更多细节。',
  translate: '你是一个专业的翻译助手。请将以下文本翻译为中文（如果原文是中文则翻译为英文）。',
  summarize: '你是一个专业的文本摘要助手。请用简洁的语言总结以下文本的核心内容。',
};

export async function callDeepSeek(
  text: string,
  action: AiActionType,
  apiKey: string,
  model: string = 'deepseek-chat'
): Promise<string> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[action] },
        { role: 'user', content: text },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

### 4. Chrome 消息通信

Content Script 无法直接调用外部 API（CORS 限制），所以需要通过 Background Service Worker 中转：

```
Content Script → chrome.runtime.sendMessage → Background → fetch DeepSeek API → sendResponse → Content Script
```

```typescript
// Background 中处理消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'AI_PROCESS') {
    callDeepSeek(message.text, message.action, message.apiKey, message.model)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 保持消息通道开启（异步响应）
  }
});
```

### 5. 设置持久化

使用 Chrome Storage API 保存用户的 API Key 等设置：

```typescript
// src/utils/storage.ts
export async function getSettings(): Promise<Settings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(DEFAULT_SETTINGS, (result) => {
      resolve(result as Settings);
    });
  });
}

export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set(settings, resolve);
  });
}
```

## 后端服务（可选）

如果不想在插件中直接调用 DeepSeek API（API Key 暴露风险），可以部署一个后端代理服务：

- **技术栈**：Node.js + Express + TypeScript
- **核心接口**：`POST /api/ai/process`（文本处理）、`POST /api/ai/chat`（流式对话）
- **安全特性**：速率限制、API Key 验证、请求体大小限制

## Web 端（可选）

除了 Chrome 插件，还提供了 Web 版本，方便不想安装插件的用户使用：

- **首页**：产品介绍、功能展示
- **工作台**：在线使用 AI 文本处理功能
- **定价页**：免费版 / Pro 版 / Team 版

## 安装使用

### 1. 克隆项目
```bash
git clone <your-repo-url>
cd ai-efficiency-assistant
npm install
```

### 2. 构建
```bash
npm run build
```

### 3. 安装到 Chrome
1. 打开 Chrome，访问 `chrome://extensions/`
2. 开启右上角的「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择项目的 `dist` 目录

### 4. 配置 API Key
1. 点击扩展图标，打开 Popup
2. 在设置面板中填入你的 DeepSeek API Key
3. 开始使用！

## 效果演示

- 选中任意网页文字 → 出现浮动按钮 → 点击选择操作 → AI 处理结果展示
- 右键选中文字 → 选择 AI 操作 → 弹窗显示结果
- Popup 窗口手动输入 → 选择操作 → 查看结果

## 总结与展望

这款插件只是一个 MVP，后续计划添加：

- [ ] 支持更多 AI 模型（GPT-4、Claude 等）
- [ ] 自定义 Prompt 模板
- [ ] 历史记录功能
- [ ] 快捷键支持
- [ ] 多语言界面

如果你也在做独立开发，欢迎交流！项目完整源码已开源，欢迎 Star 和 PR。

---

*本文首发于掘金，作者原创，转载请注明出处。*
