# 白山智算 API 实战：如何用 DeepSeek-V3 打造自己的 AI 工具

> 本文手把手教你从注册白山智算账号到完成一个可用的 AI 应用，包含 API Key 获取、接口调用、错误处理、流式响应等核心知识点。所有代码均来自真实项目「AI 效率助手」。

## 前言

2026 年，DeepSeek-V3 已经成为中文 AI 领域性价比最高的模型之一。而白山智算作为兼容 OpenAI API 格式的推理平台，让开发者可以用最低的成本接入 DeepSeek-V3。

本文将带你从零开始，完成以下内容：

1. 注册白山智算账号并获取 API Key
2. 理解 OpenAI 兼容 API 的请求/响应格式
3. 用原生 `fetch` 调用 API（不依赖任何 SDK）
4. 实现错误处理和重试机制
5. 实现流式响应（SSE）
6. 将 API 集成到 React 项目中

**项目源码**：[https://github.com/WZX-wq/ai-efficiency-assistant](https://github.com/WZX-wq/ai-efficiency-assistant)
**在线体验**：[https://ai-efficiency-assistant.vercel.app](https://ai-efficiency-assistant.vercel.app)

---

## 一、注册白山智算并获取 API Key

### 1.1 注册账号

访问白山智算官网，使用手机号或邮箱注册账号。注册流程简单，几分钟即可完成。

### 1.2 获取 API Key

登录后进入控制台，在「API Keys」页面创建新的 Key：

```
1. 进入控制台 → API Keys → 创建新 Key
2. 复制生成的 Key（格式类似 sk-xxxxxxxxxxxxxxxx）
3. 妥善保存，关闭页面后将无法再次查看
```

### 1.3 充值（可选）

白山智算支持按量付费，新用户通常有免费额度。DeepSeek-V3 的价格非常友好，日常开发测试几乎不需要充值。

> **安全提示**：永远不要将 API Key 硬编码在前端代码中。在本文的实战部分，我会展示如何安全地管理 API Key。

---

## 二、理解 API 接口格式

白山智算兼容 OpenAI API 格式，这意味着你可以用任何支持 OpenAI API 的工具和库来调用它。

### 2.1 接口地址

```
POST https://api.edgefn.net/v1/chat/completions
```

### 2.2 请求头

```typescript
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_API_KEY'
}
```

### 2.3 请求体

```typescript
interface DeepSeekRequest {
  model: string;           // 模型名称，如 "DeepSeek-V3"
  messages: ChatMessage[]; // 对话消息列表
  temperature?: number;    // 温度参数，0-1.5，默认 0.7
  max_tokens?: number;     // 最大生成 token 数，默认 2048
  stream?: boolean;        // 是否流式响应，默认 false
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

### 2.4 响应体

```typescript
interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
```

---

## 三、用 fetch 调用 API（完整代码）

### 3.1 基础调用

```typescript
/**
 * 调用 DeepSeek API - 基础版本
 */
async function callDeepSeek(prompt: string, apiKey: string): Promise<string> {
  const apiUrl = 'https://api.edgefn.net/v1/chat/completions';

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'DeepSeek-V3',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的文字处理助手。',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// 使用示例
const result = await callDeepSeek('请帮我改写这段文字...', 'sk-your-api-key');
console.log(result);
```

### 3.2 带完整错误处理的版本

在实际项目中，你需要处理各种异常情况。以下是我项目中使用的完整版本：

```typescript
import type { DeepSeekRequest, DeepSeekResponse, ExtensionSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types/constants';

const DEFAULT_API_URL = 'https://api.edgefn.net/v1/chat/completions';

/**
 * 调用 DeepSeek API - 生产版本（带完整错误处理）
 */
export async function callDeepSeekAPI(
  prompt: string,
  settings: ExtensionSettings,
): Promise<string> {
  const { apiKey, model, temperature } = settings;

  // 参数校验
  if (!apiKey) {
    throw new Error('请先在设置中配置 DeepSeek API Key');
  }

  const apiUrl = settings.apiUrl || DEFAULT_API_URL;

  // 构建请求体
  const requestBody: DeepSeekRequest = {
    model: model || DEFAULT_SETTINGS.model,
    messages: [
      {
        role: 'system',
        content:
          '你是一个专业的文字处理助手。请根据用户的要求对文字进行处理，直接输出结果，不要添加多余的解释。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: temperature ?? DEFAULT_SETTINGS.temperature,
    max_tokens: 2048,
    stream: false,
  };

  // 发送请求
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  // 错误处理
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.error?.message || `API 请求失败，状态码: ${response.status}`;
    throw new Error(errorMessage);
  }

  // 解析响应
  const data: DeepSeekResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('API 返回了空结果');
  }

  return data.choices[0].message.content.trim();
}
```

### 3.3 带重试机制的版本

网络请求可能会失败，合理的重试机制能大幅提升用户体验：

```typescript
/**
 * 带重试机制的 API 调用
 */
export async function callDeepSeekWithRetry(
  prompt: string,
  settings: ExtensionSettings,
  maxRetries: number = 3,
): Promise<string> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await callDeepSeekAPI(prompt, settings);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('未知错误');

      // 如果是认证错误或参数错误，不需要重试
      if (lastError.message.includes('API Key') ||
          lastError.message.includes('401') ||
          lastError.message.includes('400')) {
        throw lastError;
      }

      // 指数退避等待
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('请求失败，请重试');
}
```

---

## 四、实现流式响应（SSE）

对于长文本生成，流式响应能大幅提升用户体验。用户可以实时看到 AI 的输出，而不是等待整个生成过程完成。

```typescript
/**
 * 流式调用 DeepSeek API
 */
export async function callDeepSeekStream(
  prompt: string,
  settings: ExtensionSettings,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): Promise<void> {
  const { apiKey, model, temperature } = settings;
  const apiUrl = settings.apiUrl || DEFAULT_API_URL;

  const requestBody = {
    model: model || 'DeepSeek-V3',
    messages: [
      { role: 'system', content: '你是一个专业的文字处理助手。' },
      { role: 'user', content: prompt },
    ],
    temperature: temperature ?? 0.7,
    max_tokens: 2048,
    stream: true, // 开启流式响应
  };

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('无法获取响应流');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // 解析 SSE 数据
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();

          if (data === '[DONE]') {
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch {
            // 忽略解析错误
          }
        }
      }
    }

    onDone();
  } catch (error) {
    onError(error instanceof Error ? error.message : '请求失败');
  }
}

// 使用示例
await callDeepSeekStream(
  '请帮我写一段关于 AI 的介绍',
  settings,
  (chunk) => {
    // 每收到一段文本就追加到页面上
    resultElement.textContent += chunk;
  },
  () => {
    console.log('生成完成');
  },
  (error) => {
    console.error('生成失败:', error);
  },
);
```

---

## 五、集成到 React 项目

### 5.1 类型定义

```typescript
// types/index.ts
export type ActionType = 'rewrite' | 'expand' | 'translate' | 'summarize';

export interface ActionConfig {
  type: ActionType;
  label: string;
  description: string;
  promptTemplate: string;
}

export interface ExtensionSettings {
  apiKey: string;
  apiUrl: string;
  model: string;
  temperature: number;
}
```

### 5.2 Prompt 模板管理

好的 Prompt 是 AI 应用效果的关键。我使用模板化的方式管理 Prompt：

```typescript
// types/constants.ts
export const ACTION_CONFIGS: Record<ActionType, ActionConfig> = {
  rewrite: {
    type: 'rewrite',
    label: '改写',
    description: '用不同的表达方式重新书写选中的文字',
    promptTemplate: '请改写以下文字，保持原意不变，但使用不同的表达方式。要求语言流畅、自然：\n\n{text}',
  },
  expand: {
    type: 'expand',
    label: '扩写',
    description: '对选中的文字进行扩展和补充',
    promptTemplate: '请对以下文字进行扩写，补充更多细节、论据和说明，使内容更加丰富完整：\n\n{text}',
  },
  translate: {
    type: 'translate',
    label: '翻译',
    description: '将选中的文字翻译成中文（如果是中文则翻译成英文）',
    promptTemplate: '请翻译以下文字。如果原文是中文，请翻译成英文；如果原文是其他语言，请翻译成中文。只输出翻译结果，不要添加额外说明：\n\n{text}',
  },
  summarize: {
    type: 'summarize',
    label: '总结',
    description: '对选中的文字进行精简总结',
    promptTemplate: '请对以下文字进行简洁的总结，提炼核心要点，控制在原文长度的三分之一以内：\n\n{text}',
  },
};

export function getActionPrompt(actionType: ActionType, text: string): string {
  const config = ACTION_CONFIGS[actionType];
  return config.promptTemplate.replace('{text}', text);
}
```

### 5.3 React 组件中使用

```typescript
// Popup.tsx 核心逻辑
import { useState, useCallback } from 'react';
import { callDeepSeekAPI } from '@/utils/api';
import { getActionPrompt } from '@/types/constants';

export default function Popup() {
  const [selectedText, setSelectedText] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ExtensionSettings>({
    apiKey: '',
    apiUrl: 'https://api.edgefn.net/v1/chat/completions',
    model: 'DeepSeek-V3',
    temperature: 0.7,
  });

  const handleAction = useCallback(async (actionType: ActionType) => {
    if (!selectedText.trim()) return;
    if (!settings.apiKey) {
      setError('请先配置 API Key');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');

    try {
      const prompt = getActionPrompt(actionType, selectedText);
      const result = await callDeepSeekAPI(prompt, settings);
      setResult(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setLoading(false);
    }
  }, [selectedText, settings]);

  return (
    <div>
      <textarea
        value={selectedText}
        onChange={(e) => setSelectedText(e.target.value)}
        placeholder="请输入文字..."
      />
      <div className="grid grid-cols-4 gap-2">
        <button onClick={() => handleAction('rewrite')}>改写</button>
        <button onClick={() => handleAction('expand')}>扩写</button>
        <button onClick={() => handleAction('translate')}>翻译</button>
        <button onClick={() => handleAction('summarize')}>总结</button>
      </div>
      {result && <div>{result}</div>}
    </div>
  );
}
```

---

## 六、API Key 安全管理

### 6.1 Chrome 扩展方案

在 Chrome 扩展中，API Key 存储在 `chrome.storage.local` 中，用户自己配置：

```typescript
// utils/storage.ts
import type { ExtensionSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types/constants';

const SETTINGS_KEY = 'ai_assistant_settings';

export async function loadSettings(): Promise<ExtensionSettings> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(SETTINGS_KEY, (result) => {
        if (result[SETTINGS_KEY]) {
          resolve({ ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] });
        } else {
          resolve({ ...DEFAULT_SETTINGS });
        }
      });
    } else {
      resolve({ ...DEFAULT_SETTINGS });
    }
  });
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  return new Promise((resolve) => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ [SETTINGS_KEY]: settings }, () => {
        resolve();
      });
    } else {
      resolve();
    }
  });
}
```

### 6.2 Web 应用方案

在 Web 应用中，通过后端代理转发请求，API Key 存储在服务端环境变量中：

```bash
# .env
DEEPSEEK_API_KEY=sk-your-api-key-here
API_KEY=your-auth-api-key
```

```typescript
// server/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers.authorization?.replace('Bearer ', '');

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ success: false, error: '认证失败' });
  }

  next();
}
```

---

## 七、实用技巧

### 7.1 Token 消耗控制

DeepSeek-V3 的价格虽然低，但控制 Token 消耗依然是好习惯：

```typescript
// 1. 限制 max_tokens
const requestBody = {
  max_tokens: 2048, // 根据实际需求调整
};

// 2. 精简 system prompt
// 差的 system prompt："你是一个非常有经验的专业文字处理助手，擅长各种文字处理任务..."
// 好的 system prompt："你是文字处理助手，直接输出结果。"

// 3. 截断过长的输入文本
const MAX_INPUT_LENGTH = 5000;
const truncatedText = text.length > MAX_INPUT_LENGTH
  ? text.slice(0, MAX_INPUT_LENGTH) + '...'
  : text;
```

### 7.2 Temperature 参数调优

```typescript
// 不同场景的推荐 temperature 值
const TEMPERATURE_PRESETS = {
  translation: 0.3,  // 翻译需要精确，低 temperature
  rewrite: 0.7,      // 改写需要一定创意
  expand: 0.8,       // 扩写需要更多创意
  summarize: 0.5,    // 总结需要准确性
};
```

### 7.3 速率限制

如果你的应用面向公众，一定要做速率限制：

```typescript
// server/src/middleware/rateLimit.ts
import rateLimit from 'express-rate-limit';

export function createRateLimit(maxRequests: number, windowMs: number) {
  return rateLimit({
    windowMs,
    max: maxRequests,
    message: {
      success: false,
      error: '请求过于频繁，请稍后再试',
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
```

---

## 八、完整项目架构

```
ai-efficiency-assistant/
├── src/
│   ├── background/index.ts     # Chrome 扩展后台服务
│   ├── content/index.tsx        # 注入网页的 Content Script
│   ├── popup/Popup.tsx          # 扩展弹窗界面
│   ├── components/              # React 组件
│   │   ├── ActionButton.tsx     # 操作按钮
│   │   ├── ResultPanel.tsx      # 结果展示面板
│   │   └── SettingsPanel.tsx    # 设置面板
│   ├── types/
│   │   ├── index.ts             # 类型定义
│   │   └── constants.ts         # 常量和配置
│   ├── utils/
│   │   ├── api.ts               # API 调用封装
│   │   └── storage.ts           # 存储管理
│   └── manifest.ts              # Chrome 扩展配置
├── web/                         # Web 版本
├── server/                      # 后端服务
│   ├── src/
│   │   ├── index.ts             # Express 入口
│   │   ├── routes/ai.ts         # AI 路由
│   │   └── middleware/          # 中间件
│   └── .env                     # 环境变量
└── vercel.json                  # Vercel 部署配置
```

---

## 总结

本文从注册白山智算账号开始，完整介绍了如何用 DeepSeek-V3 打造 AI 工具。核心要点：

1. **白山智算兼容 OpenAI API**，迁移成本几乎为零
2. **用原生 fetch 即可调用**，不需要额外的 SDK
3. **错误处理和重试机制**是生产环境的必备项
4. **流式响应**能大幅提升用户体验
5. **API Key 安全**是必须重视的问题

如果你想查看完整的项目代码，或者直接使用这个工具，可以访问：

- **GitHub**：[https://github.com/WZX-wq/ai-efficiency-assistant](https://github.com/WZX-wq/ai-efficiency-assistant)
- **在线体验**：[https://ai-efficiency-assistant.vercel.app](https://ai-efficiency-assistant.vercel.app)

觉得有帮助的话，欢迎给个 Star！
