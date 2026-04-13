import type { AiProcessRequest, AiProcessResponse } from '../types';

const API_BASE_URL = '/api';

/** 白山智算 API 地址 */
const BAISHAN_API_URL = 'https://api.edgefn.net/v1/chat/completions';

/** 各操作对应的 system prompt */
const ACTION_PROMPTS: Record<string, string> = {
  rewrite: '你是一个专业的文本改写助手。请对用户提供的文本进行改写，保持原意不变，但使表达更加流畅、专业。直接输出改写后的文本，不要添加任何解释或前缀。',
  expand: '你是一个专业的文本扩写助手。请对用户提供的文本进行扩写，丰富细节和内容，使文章更加充实。直接输出扩写后的文本，不要添加任何解释或前缀。',
  translate: '你是一个专业的翻译助手。请将用户提供的文本翻译为中文。如果原文是中文则翻译为英文。直接输出翻译结果，不要添加任何解释或前缀。',
  summarize: '你是一个专业的文本摘要助手。请对用户提供的文本进行精炼摘要，提取核心要点。直接输出摘要内容，不要添加任何解释或前缀。',
};

/**
 * 直接调用白山智算 API（不依赖后端）
 */
export async function callBaishanDirect(
  request: AiProcessRequest
): Promise<AiProcessResponse> {
  const stored = loadApiKey();
  const apiKey = stored?.apiKey || '';
  const model = stored?.model || 'DeepSeek-V3';

  if (!apiKey) {
    return { success: false, error: '请先在设置中配置 API Key' };
  }

  const systemPrompt = ACTION_PROMPTS[request.action] || ACTION_PROMPTS.rewrite;

  try {
    const response = await fetch(BAISHAN_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.text },
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.error?.message || `API 请求失败，状态码: ${response.status}`,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: 'API 返回了空结果' };
    }

    return { success: true, result: content.trim() };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : '网络请求失败，请检查网络连接',
    };
  }
}

/**
 * 调用 AI 处理接口（优先直连白山智算，失败后回退到后端代理）
 */
export async function processAiText(
  request: AiProcessRequest
): Promise<AiProcessResponse> {
  // 优先尝试直连白山智算
  const stored = loadApiKey();
  if (stored?.apiKey) {
    return callBaishanDirect(request);
  }

  // 回退到后端代理
  try {
    const response = await fetch(`${API_BASE_URL}/ai/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || `请求失败，状态码: ${response.status}`
      );
    }

    const data: AiProcessResponse = await response.json();
    return data;
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
      };
    }
    return {
      success: false,
      error: '发生未知错误，请稍后重试',
    };
  }
}

/**
 * 检查 API 连通性
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const stored = loadApiKey();
    if (stored?.apiKey) {
      // 直连模式：发一个简单请求测试
      const response = await fetch(BAISHAN_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${stored.apiKey}`,
        },
        body: JSON.stringify({
          model: stored.model || 'DeepSeek-V3',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 5,
        }),
      });
      return response.ok;
    }
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * 保存 API Key 到本地存储
 */
export function saveApiKey(config: { apiKey: string; provider: string; baseUrl?: string; model?: string }): void {
  try {
    localStorage.setItem('ai-assistant-api-config', JSON.stringify(config));
  } catch {
    console.warn('无法保存 API Key 到本地存储');
  }
}

/**
 * 从本地存储读取 API Key 配置
 */
export function loadApiKey(): { apiKey: string; provider: string; baseUrl?: string; model?: string } | null {
  try {
    const stored = localStorage.getItem('ai-assistant-api-config');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    console.warn('无法读取本地存储中的 API Key');
  }
  return null;
}

/**
 * 清除本地存储的 API Key
 */
export function clearApiKey(): void {
  try {
    localStorage.removeItem('ai-assistant-api-config');
  } catch {
    console.warn('无法清除本地存储中的 API Key');
  }
}
