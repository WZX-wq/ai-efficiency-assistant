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

// ==================== 图片生成相关类型 ====================

/** 图片生成状态 */
export type ImageGenerationStatus = 'pending' | 'processing' | 'success' | 'failed';

/** 图片生成请求 */
export interface ImageGenerationRequest {
  /** 提示词 */
  prompt: string;
  /** 负面提示词 */
  negativePrompt?: string;
  /** 生成图片数量 (1-4) */
  n?: number;
  /** 图片尺寸，如 "1024x1024" */
  size?: string;
  /** 图片质量: standard, hd, ultra */
  quality?: string;
  /** 图片风格: vivid, natural, anime, photographic, digital-art */
  style?: string;
  /** 使用的模型 */
  model?: string;
}

/** 图片生成响应 */
export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url: string;
    revised_prompt?: string;
    b64_json?: string;
  }>;
}

/** 生成的图片信息 */
export interface GeneratedImage {
  /** 图片 URL */
  url: string;
  /** 本地 URL */
  localUrl: string;
  /** 优化后的提示词 */
  revisedPrompt: string;
}

/** 图片生成结果 */
export interface ImageGenerationResult {
  /** 生成任务 ID */
  id: string;
  /** 生成状态 */
  status: ImageGenerationStatus;
  /** 生成的图片列表 */
  images: GeneratedImage[];
  /** 创建时间戳 */
  created: number;
}

/** 图片变体请求 */
export interface ImageVariationRequest {
  /** 原始图片 URL */
  imageUrl: string;
  /** 生成变体数量 (1-4) */
  n?: number;
  /** 图片尺寸 */
  size?: string;
}

/** 图片编辑请求 */
export interface ImageEditRequest {
  /** 原始图片 URL */
  imageUrl: string;
  /** 编辑提示词 */
  prompt: string;
  /** 遮罩图片 URL（可选） */
  mask?: string;
  /** 生成图片数量 (1-4) */
  n?: number;
  /** 图片尺寸 */
  size?: string;
}

// ==================== 语音相关类型 ====================

/** TTS 服务类型 */
export type TTSServiceType = 'baishan' | 'baidu' | 'aliyun';

/** STT 服务类型 */
export type STTServiceType = 'baishan' | 'baidu' | 'aliyun';

/** 语音信息 */
export interface VoiceInfo {
  /** 语音 ID */
  id: string;
  /** 语音名称 */
  name: string;
  /** 性别 */
  gender: 'male' | 'female' | 'neutral';
  /** 语言代码 */
  language: string;
  /** 描述 */
  description: string;
}

/** 文本转语音请求 */
export interface TTSRequest {
  /** 要转换的文本 */
  text: string;
  /** 语音 ID */
  voice?: string;
  /** 使用的模型 */
  model?: string;
  /** 语速 (0.25 - 4.0, 默认 1.0) */
  speed?: number;
  /** 输出格式: mp3, opus, aac, flac, wav, pcm */
  responseFormat?: string;
}

/** 文本转语音响应 */
export interface TTSResponse {
  /** 生成任务 ID */
  id: string;
  /** 音频文件 URL */
  audioUrl: string;
  /** 本地文件路径 */
  localPath: string;
  /** 文件名 */
  filename: string;
  /** 音频格式 */
  format: string;
  /** 音频时长（秒） */
  duration: number;
  /** 文件大小（字节） */
  size: number;
  /** 使用的服务 */
  service: TTSServiceType;
  /** 创建时间戳 */
  created: number;
}

/** 语音转文本请求 */
export interface STTRequest {
  /** Base64 编码的音频数据（与 audioUrl 二选一） */
  audioData?: string;
  /** 音频文件 URL（与 audioData 二选一） */
  audioUrl?: string;
  /** 使用的模型 */
  model?: string;
  /** 语言代码，如 "zh", "en" */
  language?: string;
  /** 提示词，用于提高识别准确率 */
  prompt?: string;
  /** 音频格式: mp3, wav, ogg, opus, aac, flac, m4a */
  format?: string;
}

/** 语音转文本响应 */
export interface STTResponse {
  /** 识别出的文本 */
  text: string;
  /** 语言代码 */
  language: string;
  /** 置信度 (0-1) */
  confidence: number;
  /** 使用的服务 */
  service: STTServiceType;
  /** 创建时间戳 */
  created: number;
}

/** 声音克隆请求 */
export interface VoiceCloneRequest {
  /** 样本音频文件（通过 multipart/form-data 上传） */
  sample?: File;
  /** 要合成的文本 */
  text: string;
  /** 克隆的声音名称 */
  voiceName?: string;
}

/** 声音克隆响应 */
export interface VoiceCloneResponse {
  /** 生成任务 ID */
  id: string;
  /** 音频文件 URL */
  audioUrl: string;
  /** 克隆的声音 ID */
  voiceId: string;
  /** 创建时间戳 */
  created: number;
}

// ==================== 用户相关类型 ====================

/** 用户信息 */
export interface User {
  id: string;
  email: string;
  username: string;
  role: 'admin' | 'user' | 'guest';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** JWT Payload */
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'user' | 'guest';
  iat: number;
  exp: number;
}

// ==================== 文件相关类型 ====================

/** 文件类型 */
export type FileType = 'image' | 'audio' | 'video' | 'document' | 'other';

/** 文件信息 */
export interface FileInfo {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: FileType;
  url: string;
  createdAt: Date;
  userId: string;
}

// ==================== API 通用响应类型 ====================

/** 通用 API 响应 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 分页请求参数 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==================== WebSocket 相关类型 ====================

/** WebSocket 事件类型 */
export type WebSocketEventType =
  | 'connection'
  | 'disconnect'
  | 'message'
  | 'typing'
  | 'notification'
  | 'system';

/** WebSocket 消息 */
export interface WebSocketMessage {
  type: WebSocketEventType;
  payload: unknown;
  timestamp: number;
  userId?: string;
}

// ==================== 系统监控相关类型 ====================

/** 系统状态 */
export interface SystemStatus {
  cpu: {
    usage: number;
    cores: number;
    model: string;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    usage: number;
  };
  uptime: number;
  timestamp: number;
}

/** 服务状态 */
export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  lastChecked: number;
}

// ==================== Express 扩展类型 ====================

import { Request } from 'express';
import { IUserDocument, UserRole } from './user';

// 重新导出用户类型
export { IUserDocument, UserRole } from './user';

/** JWT Payload */
export interface IJwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/** 认证请求 */
export interface IAuthRequest extends Request {
  user?: IUserDocument;
  token?: string;
}

/** API 响应 */
export interface IApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/** 用户响应 */
export interface IUserResponse {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  settings?: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    notifications: {
      email: boolean;
      push: boolean;
      desktop: boolean;
    };
    privacy: {
      showProfile: boolean;
      showActivity: boolean;
    };
  };
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/** 登录请求 */
export interface ILoginRequest {
  email: string;
  password: string;
}

/** 注册请求 */
export interface IRegisterRequest {
  email: string;
  password: string;
  name: string;
}

/** 令牌响应 */
export interface ITokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** 更新用户资料请求 */
export interface IUpdateProfileRequest {
  name?: string;
  avatar?: string;
}

/** 更新用户设置请求 */
export interface IUpdateSettingsRequest {
  theme?: 'light' | 'dark' | 'auto';
  language?: string;
  notifications?: {
    email?: boolean;
    push?: boolean;
    desktop?: boolean;
  };
  privacy?: {
    showProfile?: boolean;
    showActivity?: boolean;
  };
}
