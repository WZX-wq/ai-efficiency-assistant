/** AI 处理动作类型 */
export type AIAction = 'rewrite' | 'expand' | 'translate' | 'summarize';

/** AI 处理请求体 */
export interface AIProcessRequest {
  text: string;
  action: AIAction;
  targetLang?: string;
}

/** AI 处理成功响应 */
export interface AIProcessResponse {
  success: boolean;
  result: string;
}

/** 聊天消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 聊天请求体 */
export interface AIChatRequest {
  messages: ChatMessage[];
}

/** DeepSeek API 请求体 */
export interface DeepSeekRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
}

/** DeepSeek API 非流式响应 */
export interface DeepSeekResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** DeepSeek SSE 流式响应中的 delta 数据 */
export interface DeepSeekStreamDelta {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

/** 速率限制存储条目 */
export interface RateLimitEntry {
  count: number;
  resetTime: number;
}
