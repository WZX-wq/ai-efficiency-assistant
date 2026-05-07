import { execSync } from 'child_process';
import {
  AIAction,
  ChatMessage,
  DeepSeekResponse,
  DeepSeekStreamDelta,
} from '../types';

// ==================== 白山智算 API 配置 ====================
const API_BASE_URL = process.env.BAISHAN_API_URL || 'https://api.edgefn.net/v1/chat/completions';
const API_KEY = process.env.BAISHAN_API_KEY || process.env.DEEPSEEK_API_KEY || '';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ==================== 模型配置 ====================
// 每个功能对应白山智算平台上最合适的大模型
const MODEL_CONFIG = {
  // 通用对话 - DeepSeek-V3.2: 最强通用对话模型，响应快
  chat: process.env.MODEL_CHAT || 'DeepSeek-V3.2',
  // 文本改写 - DeepSeek-V3.2: 创意写作能力强
  rewrite: process.env.MODEL_REWRITE || 'DeepSeek-V3.2',
  // 文本扩写 - DeepSeek-V3.2: 内容生成丰富
  expand: process.env.MODEL_EXPAND || 'DeepSeek-V3.2',
  // 文本翻译 - DeepSeek-V3.2: 多语言能力优秀
  translate: process.env.MODEL_TRANSLATE || 'DeepSeek-V3.2',
  // 文本摘要 - DeepSeek-V3.2: 理解和归纳能力强
  summarize: process.env.MODEL_SUMMARIZE || 'DeepSeek-V3.2',
  // 代码分析 - Qwen3-Coder-480B-A35B-Instruct: 代码专用模型，代码理解最佳
  code: process.env.MODEL_CODE || 'Qwen3-Coder-480B-A35B-Instruct',
  // 复杂推理 - DeepSeek-R1-0528: 深度推理链，适合复杂分析
  reasoning: process.env.MODEL_REASONING || 'DeepSeek-R1-0528',
  // 轻量快速 - DeepSeek-R1-0528-Qwen3-8B: 低成本高速度
  lightweight: process.env.MODEL_LIGHTWEIGHT || 'DeepSeek-R1-0528-Qwen3-8B',
} as const;

/**
 * 获取指定功能对应的模型名称
 */
export function getModelFor(task: keyof typeof MODEL_CONFIG): string {
  return MODEL_CONFIG[task];
}

/**
 * 获取所有模型配置（供前端展示）
 */
export function getAllModelConfigs(): Record<string, string> {
  return { ...MODEL_CONFIG };
}

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
 * 根据 action 类型自动选择最合适的模型
 */
function getModelForAction(action: AIAction): string {
  const actionModelMap: Record<AIAction, string> = {
    rewrite: MODEL_CONFIG.rewrite,
    expand: MODEL_CONFIG.expand,
    summarize: MODEL_CONFIG.summarize,
    translate: MODEL_CONFIG.translate,
  };
  return actionModelMap[action];
}

/**
 * 延迟指定毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 通过 curl 调用白山智算 API（非流式）
 */
function curlRequest(requestBody: Record<string, unknown>): string {
  const bodyStr = JSON.stringify(requestBody);
  // 使用临时文件传递请求体，避免 shell 转义问题
  const escapedBody = bodyStr.replace(/'/g, "'\\''");

  const command = `curl -s --max-time 60 -X POST '${API_BASE_URL}' \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer ${API_KEY}' \
    -d '${escapedBody}'`;

  return execSync(command, {
    encoding: 'utf-8',
    timeout: 65000,
    maxBuffer: 10 * 1024 * 1024,
  });
}

/**
 * 调用白山智算 API（非流式）
 */
export async function callDeepSeek(
  messages: ChatMessage[],
  stream: false,
  model?: string,
): Promise<DeepSeekResponse>;

/**
 * 调用白山智算 API（流式）- 收集完整响应后返回
 */
export async function callDeepSeek(
  messages: ChatMessage[],
  stream: true,
  model?: string,
): Promise<AsyncGenerator<DeepSeekStreamDelta>>;

/**
 * 调用白山智算 API
 */
export async function callDeepSeek(
  messages: ChatMessage[],
  stream: boolean,
  model: string = MODEL_CONFIG.chat,
): Promise<DeepSeekResponse | AsyncGenerator<DeepSeekStreamDelta>> {
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    stream: false,
    temperature: 0.7,
    max_tokens: 4096,
  };

  if (stream) {
    return streamDeepSeekResponse(messages, model);
  } else {
    return nonStreamDeepSeekResponse(requestBody);
  }
}

/**
 * 非流式请求白山智算 API，带重试机制
 */
async function nonStreamDeepSeekResponse(
  requestBody: Record<string, unknown>,
): Promise<DeepSeekResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const responseData = curlRequest(requestBody);
      const parsed = JSON.parse(responseData);

      if (parsed.error) {
        throw new Error(
          `白山智算 API 错误: ${parsed.error.message || JSON.stringify(parsed.error)}`,
        );
      }

      return parsed as DeepSeekResponse;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw new Error(
    `白山智算 API 调用失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
  );
}

/**
 * 流式请求白山智算 API
 * 使用 curl 的流式输出，通过行解析 SSE 数据
 */
async function streamDeepSeekResponse(
  messages: ChatMessage[],
  model: string = MODEL_CONFIG.chat,
): Promise<AsyncGenerator<DeepSeekStreamDelta>> {
  const requestBody: Record<string, unknown> = {
    model,
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 4096,
  };

  async function* generate(): AsyncGenerator<DeepSeekStreamDelta> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const bodyStr = JSON.stringify(requestBody);
        const escapedBody = bodyStr.replace(/'/g, "'\\''");

        const command = `curl -s --max-time 120 -N -X POST '${API_BASE_URL}' \
          -H 'Content-Type: application/json' \
          -H 'Authorization: Bearer ${API_KEY}' \
          -d '${escapedBody}'`;

        const output = execSync(command, {
          encoding: 'utf-8',
          timeout: 125000,
          maxBuffer: 10 * 1024 * 1024,
        });

        // 解析 SSE 数据
        const lines = output.split('\n');
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

        return; // 成功完成
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < MAX_RETRIES - 1) {
          await delay(RETRY_DELAY_MS * (attempt + 1));
        }
      }
    }

    throw new Error(
      `白山智算 API 流式调用失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
    );
  }

  return generate();
}

/**
 * 根据 action 处理文本（非流式）- 自动选择最佳模型
 */
export async function processText(
  text: string,
  action: AIAction,
  targetLang?: string,
): Promise<string> {
  const systemPrompt = buildSystemPrompt(action, targetLang);
  const model = getModelForAction(action);
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: text },
  ];

  const response = await callDeepSeek(messages, false, model);
  return response.choices[0]?.message?.content || '';
}
