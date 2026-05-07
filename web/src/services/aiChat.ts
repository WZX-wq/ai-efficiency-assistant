import { getModelConfig } from './api';

const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'https://ai-efficiency-assistant-1.onrender.com/api';

/** 聊天消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** chatWithAi 请求参数 */
export interface ChatWithAiRequest {
  messages: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

/** chatWithAi 响应 */
export interface ChatWithAiResponse {
  success: boolean;
  result?: string;
  error?: string;
}

/** chatWithAiStream 流式响应 */
export interface ChatStreamResponse {
  success: boolean;
  error?: string;
  stream: ReadableStream<string> | null;
}

/**
 * 通用 AI 聊天接口（非流式）
 */
export async function chatWithAi(
  request: ChatWithAiRequest,
  signal?: AbortSignal,
): Promise<ChatWithAiResponse> {
  const messages: ChatMessage[] = [];
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  messages.push(...request.messages);
  const { baseUrl, apiKey, model } = getModelConfig();

  const requestBody = {
    model,
    messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 2048,
  };

  // 优先通过后端代理调用
  try {
    const response = await fetch(`${BACKEND_API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: signal || AbortSignal.timeout(60000),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        return { success: true, result: content.trim() };
      }
    }
    // 后端失败，继续回退到直连
  } catch {
    // 后端不可用，继续回退到直连
  }

  // 直连回退
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: signal || AbortSignal.timeout(60000),
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
    const message = err instanceof DOMException && err.name === 'AbortError'
      ? '请求已取消'
      : err instanceof DOMException && err.name === 'TimeoutError'
      ? '请求超时，请稍后重试'
      : err instanceof Error ? err.message : '网络请求失败，请检查网络连接';
    return { success: false, error: message };
  }
}

/**
 * 流式 AI 聊天接口（SSE 打字机效果）
 */
export async function chatWithAiStream(
  request: ChatWithAiRequest,
  signal?: AbortSignal,
): Promise<ChatStreamResponse> {
  const messages: ChatMessage[] = [];
  if (request.systemPrompt) {
    messages.push({ role: 'system', content: request.systemPrompt });
  }
  messages.push(...request.messages);
  const { baseUrl, apiKey, model } = getModelConfig();

  const requestBody = {
    model,
    messages,
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxTokens ?? 2048,
    stream: true,
  };

  // 优先通过后端代理调用
  try {
    const response = await fetch(`${BACKEND_API_URL}/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
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
    // 后端失败，继续回退到直连
  } catch {
    // 后端不可用，继续回退到直连
  }

  // 直连回退
  try {
    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: signal || AbortSignal.timeout(60000),
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
    const message = err instanceof DOMException && err.name === 'AbortError'
      ? '请求已取消'
      : err instanceof DOMException && err.name === 'TimeoutError'
      ? '请求超时，请稍后重试'
      : err instanceof Error ? err.message : '网络请求失败，请检查网络连接';
    return { success: false, stream: null, error: message };
  }
}
