/** AI 操作类型 */
export type ActionType = 'rewrite' | 'expand' | 'translate' | 'summarize';

/** AI 操作配置 */
export interface ActionConfig {
  type: ActionType;
  label: string;
  description: string;
  promptTemplate: string;
}

/** DeepSeek API 请求消息 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** DeepSeek API 请求体 */
export interface DeepSeekRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

/** DeepSeek API 响应体 */
export interface DeepSeekResponse {
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

/** 扩展存储的设置 */
export interface ExtensionSettings {
  apiKey: string;
  apiUrl: string;
  model: string;
  temperature: number;
}

/** Content Script 与 Background 之间的消息类型 */
export interface ExtensionMessage {
  type: 'GET_SELECTED_TEXT' | 'AI_ACTION' | 'ACTION_RESULT' | 'STORE_SETTINGS' | 'LOAD_SETTINGS';
  action?: ActionType;
  selectedText?: string;
  result?: string;
  settings?: ExtensionSettings;
  error?: string;
}
