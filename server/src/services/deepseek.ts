import https from 'https';
import http from 'http';
import { URL } from 'url';
import {
  AIAction,
  ChatMessage,
  DeepSeekRequest,
  DeepSeekResponse,
  DeepSeekStreamDelta,
} from '../types';

const API_BASE_URL = 'https://api.edgefn.net/v1/chat/completions';
const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const DEFAULT_MODEL = 'DeepSeek-V3';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

/**
 * 根据 action 类型构建对应的 system prompt
 */
function buildSystemPrompt(action: AIAction, targetLang?: string): string {
  const prompts: Record<AIAction, string> = {
    rewrite:
      '你是一个专业的文本改写助手。请对用户提供的文本进行改写，保持原意不变，但使表达更加流畅、专业。直接输出改写后的文本，不要添加任何解释或前缀。',
    expand:
      '你是一个专业的文本扩写助手。请对用户提供的文本进行扩写，丰富细节和内容，使文章更加充实。直接输出扩写后的文本，不要添加任何解释或前缀。',
    summarize:
      '你是一个专业的文本摘要助手。请对用户提供的文本进行精炼摘要，提取核心要点。直接输出摘要内容，不要添加任何解释或前缀。',
    translate: targetLang
      ? `你是一个专业的翻译助手。请将用户提供的文本翻译为${targetLang}。直接输出翻译结果，不要添加任何解释或前缀。`
      : '你是一个专业的翻译助手。请将用户提供的文本翻译为中文。直接输出翻译结果，不要添加任何解释或前缀。',
  };

  return prompts[action];
}

/**
 * 发送 HTTP/HTTPS 请求的通用方法
 */
function httpRequest(
  urlStr: string,
  options: https.RequestOptions,
  body: string,
): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;

    const reqOptions: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'POST',
      headers: options.headers || {},
    };

    const req = lib.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf-8');
        resolve({ statusCode: res.statusCode || 200, data });
      });
    });

    req.on('error', reject);

    // 设置超时
    req.setTimeout(60000, () => {
      req.destroy(new Error('请求超时'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * 延迟指定毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 调用 DeepSeek API（非流式）
 */
export async function callDeepSeek(
  messages: ChatMessage[],
  stream: false,
  model?: string,
): Promise<DeepSeekResponse>;

/**
 * 调用 DeepSeek API（流式）- 返回一个 async generator
 */
export async function callDeepSeek(
  messages: ChatMessage[],
  stream: true,
  model?: string,
): Promise<AsyncGenerator<DeepSeekStreamDelta>>;

/**
 * 调用 DeepSeek API
 */
export async function callDeepSeek(
  messages: ChatMessage[],
  stream: boolean,
  model: string = DEFAULT_MODEL,
): Promise<DeepSeekResponse | AsyncGenerator<DeepSeekStreamDelta>> {
  const requestBody: DeepSeekRequest = {
    model,
    messages,
    stream,
    temperature: 0.7,
    max_tokens: 4096,
  };

  const bodyStr = JSON.stringify(requestBody);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
    'Content-Length': Buffer.byteLength(bodyStr).toString(),
  };

  if (stream) {
    return streamDeepSeekResponse(bodyStr, headers);
  } else {
    return nonStreamDeepSeekResponse(bodyStr, headers);
  }
}

/**
 * 非流式请求 DeepSeek API，带重试机制
 */
async function nonStreamDeepSeekResponse(
  bodyStr: string,
  headers: Record<string, string>,
): Promise<DeepSeekResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await httpRequest(API_BASE_URL, {
        method: 'POST',
        headers,
      }, bodyStr);

      if (response.statusCode === 200) {
        return JSON.parse(response.data) as DeepSeekResponse;
      }

      // 4xx 错误不重试
      if (response.statusCode >= 400 && response.statusCode < 500) {
        const errorData = JSON.parse(response.data);
        throw new Error(
          `DeepSeek API 错误 (${response.statusCode}): ${errorData.error?.message || response.data}`,
        );
      }

      // 5xx 错误重试
      lastError = new Error(
        `DeepSeek API 服务器错误 (${response.statusCode}): ${response.data}`,
      );
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      // 网络错误重试
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw new Error(
    `DeepSeek API 调用失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
  );
}

/**
 * 流式请求 DeepSeek API，返回 async generator
 */
async function streamDeepSeekResponse(
  bodyStr: string,
  headers: Record<string, string>,
): Promise<AsyncGenerator<DeepSeekStreamDelta>> {
  const url = new URL(API_BASE_URL);

  async function* generate(): AsyncGenerator<DeepSeekStreamDelta> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await new Promise<{
          statusCode: number;
          stream: NodeJS.ReadableStream;
        }>((resolve, reject) => {
          const req = https.request(
            {
              hostname: url.hostname,
              port: 443,
              path: url.pathname,
              method: 'POST',
              headers,
            },
            (res) => {
              resolve({ statusCode: res.statusCode || 200, stream: res });
            },
          );

          req.on('error', reject);
          req.setTimeout(60000, () => {
            req.destroy(new Error('请求超时'));
          });
          req.write(bodyStr);
          req.end();
        });

        if (response.statusCode !== 200) {
          // 流式请求失败时不适合重试（已经发送了响应头），直接抛出
          throw new Error(`DeepSeek API 流式请求失败: HTTP ${response.statusCode}`);
        }

        let buffer = '';

        for await (const chunk of response.stream) {
          buffer += chunk.toString('utf-8');

          const lines = buffer.split('\n');
          // 保留最后一行（可能不完整）
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') {
              continue;
            }
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.slice(6);
              try {
                const parsed = JSON.parse(jsonStr) as DeepSeekStreamDelta;
                yield parsed;
              } catch {
                // 忽略解析错误的行
              }
            }
          }
        }

        return; // 成功完成
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES - 1) {
          await delay(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    throw new Error(
      `DeepSeek API 流式调用失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
    );
  }

  return generate();
}

/**
 * 根据 action 处理文本（非流式）
 */
export async function processText(
  text: string,
  action: AIAction,
  targetLang?: string,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(action, targetLang);
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ];

  const response = await callDeepSeek(messages, false);
  return response.choices[0]?.message?.content || '';
}
