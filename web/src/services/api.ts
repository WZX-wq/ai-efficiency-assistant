import type { AiProcessRequest, AiProcessResponse } from '../types';

/** 后端 API 基础地址 */
const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'https://ai-efficiency-assistant-1.onrender.com/api';

/** 白山智算 API 地址（直连，国内可访问） */
const DEFAULT_API_URL = 'https://api.edgefn.net/v1/chat/completions';
/** 默认 API Key 从环境变量读取，不再硬编码 */
const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY || '';
const DEFAULT_MODEL = import.meta.env.VITE_MODEL || 'DeepSeek-V3';

/** 多模型配置类型 */
interface ModelConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

/**
 * 从 localStorage 读取多模型配置，如果不存在则使用默认值
 */
export function getModelConfig(): ModelConfig {
  try {
    const stored = localStorage.getItem('ai-assistant-model-config');
    if (stored) {
      const config: ModelConfig = JSON.parse(stored);
      return {
        baseUrl: config.baseUrl || DEFAULT_API_URL,
        apiKey: config.apiKey || DEFAULT_API_KEY,
        model: config.model || DEFAULT_MODEL,
      };
    }
  } catch { /* ignore */ }
  return { baseUrl: DEFAULT_API_URL, apiKey: DEFAULT_API_KEY, model: DEFAULT_MODEL };
}

/** 各操作对应的 system prompt */
const ACTION_PROMPTS: Record<string, string> = {
  rewrite: '你是一个专业的文本改写助手。请对用户提供的文本进行改写，保持原意不变，但使表达更加流畅、专业。直接输出改写后的文本，不要添加任何解释或前缀。',
  expand: '你是一个专业的文本扩写助手。请对用户提供的文本进行扩写，丰富细节和内容，使文章更加充实。直接输出扩写后的文本，不要添加任何解释或前缀。',
  translate: '你是一个专业的翻译助手。请将用户提供的文本翻译为中文。如果原文是中文则翻译为英文。直接输出翻译结果，不要添加任何解释或前缀。',
  summarize: '你是一个专业的文本摘要助手。请对用户提供的文本进行精炼摘要，提取核心要点。直接输出摘要内容，不要添加任何解释或前缀。',
};

/**
 * 通过后端代理调用 AI API（推荐方式，API Key 安全存储在后端）
 */
async function callViaBackend(
  request: AiProcessRequest,
  signal?: AbortSignal
): Promise<AiProcessResponse> {
  try {
    const response = await fetch(`${BACKEND_API_URL}/ai/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: signal || AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        error: errorData?.error || `后端请求失败，状态码: ${response.status}`,
      };
    }

    const data = await response.json();
    return data as AiProcessResponse;
  } catch (err) {
    const message = err instanceof DOMException && err.name === 'TimeoutError'
      ? '请求超时，请稍后重试或缩短输入内容'
      : err instanceof Error ? err.message : '网络请求失败，请检查网络连接';
    return { success: false, error: message };
  }
}

/**
 * 调用 AI API（优先通过后端代理，失败时回退到直连）
 */
export async function callBaishanDirect(
  request: AiProcessRequest,
  signal?: AbortSignal
): Promise<AiProcessResponse> {
  // 优先通过后端代理调用
  const result = await callViaBackend(request, signal);
  if (result.success) return result;

  // 后端失败时，回退到直连白山智算
  const systemPrompt = ACTION_PROMPTS[request.action] || ACTION_PROMPTS.rewrite;
  const { baseUrl, apiKey, model } = getModelConfig();

  if (!apiKey) {
    return { success: false, error: '请先在设置中配置 API Key' };
  }

  try {
    const response = await fetch(baseUrl, {
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
        max_tokens: 1024,
      }),
      signal: signal || AbortSignal.timeout(30000),
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
    const message = err instanceof DOMException && err.name === 'TimeoutError'
      ? '请求超时，请稍后重试或缩短输入内容'
      : err instanceof Error ? err.message : '网络请求失败，请检查网络连接';
    return { success: false, error: message };
  }
}

export async function processAiText(
  request: AiProcessRequest,
  signal?: AbortSignal
): Promise<AiProcessResponse> {
  return callBaishanDirect(request, signal);
}

/** processAiTextStream 流式响应 */
export interface AiProcessStreamResponse {
  success: boolean;
  error?: string;
  stream: ReadableStream<string> | null;
}

/**
 * 流式 AI 文本处理接口（通过后端代理）
 */
export async function processAiTextStream(
  request: AiProcessRequest,
  signal?: AbortSignal
): Promise<AiProcessStreamResponse> {
  const systemPrompt = ACTION_PROMPTS[request.action] || ACTION_PROMPTS.rewrite;
  const { baseUrl, apiKey, model } = getModelConfig();

  // 优先通过后端代理（使用 /ai/chat 端点，将 action 转换为 system prompt）
  try {
    const systemPrompt = ACTION_PROMPTS[request.action] || ACTION_PROMPTS.rewrite;
    const response = await fetch(`${BACKEND_API_URL}/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: request.text },
        ],
      }),
      signal: signal || AbortSignal.timeout(60000),
    });

    if (response.ok && response.body) {
      const { readable, writable } = new TransformStream<string, string>();
      const writer = writable.getWriter();
      const decoder = new TextDecoder();

      (async () => {
        const reader = response.body!.getReader();
        let buffer = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data: ')) continue;
              const data = trimmed.slice(6);
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) await writer.write(content);
              } catch { /* ignore */ }
            }
          }
        } catch (err) {
          console.error('SSE 流读取错误:', err);
        } finally {
          await writer.close();
        }
      })();

      return { success: true, stream: readable };
    }
  } catch { /* fallback to direct */ }

  // 回退到直连
  if (!apiKey) {
    return { success: false, stream: null, error: '请先在设置中配置 API Key' };
  }

  try {
    const response = await fetch(baseUrl, {
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
        max_tokens: 1024,
        stream: true,
      }),
      signal: signal || AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return {
        success: false,
        stream: null,
        error: errorData?.error?.message || `API 请求失败，状态码: ${response.status}`,
      };
    }

    if (!response.body) {
      return { success: false, stream: null, error: '响应体为空' };
    }

    const { readable, writable } = new TransformStream<string, string>();
    const writer = writable.getWriter();
    const decoder = new TextDecoder();

    (async () => {
      const reader = response.body!.getReader();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith('data: ')) continue;
            const data = trimmed.slice(6);
            if (data === '[DONE]') break;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) await writer.write(content);
            } catch { /* ignore */ }
          }
        }
      } catch (err) {
        console.error('SSE 流读取错误:', err);
      } finally {
        await writer.close();
      }
    })();

    return { success: true, stream: readable };
  } catch (err) {
    const message = err instanceof DOMException && err.name === 'TimeoutError'
      ? '请求超时，请稍后重试'
      : err instanceof Error ? err.message : '网络请求失败，请检查网络连接';
    return { success: false, stream: null, error: message };
  }
}

export async function checkApiHealth(): Promise<boolean> {
  // 优先检查后端
  try {
    const response = await fetch(`${BACKEND_API_URL}/health`);
    if (response.ok) return true;
  } catch { /* fallback */ }

  // 回退检查直连
  const { baseUrl, apiKey, model } = getModelConfig();
  if (!apiKey) return false;
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export function saveApiKey(config: { apiKey: string; provider: string; baseUrl?: string; model?: string }): void {
  try { localStorage.setItem('ai-assistant-api-config', JSON.stringify(config)); } catch { /* ignore */ }
}

export function loadApiKey(): { apiKey: string; provider: string; baseUrl?: string; model?: string } | null {
  try { const stored = localStorage.getItem('ai-assistant-api-config'); if (stored) return JSON.parse(stored); } catch { /* ignore */ }
  return null;
}

export function clearApiKey(): void {
  try { localStorage.removeItem('ai-assistant-api-config'); } catch { /* ignore */ }
}
