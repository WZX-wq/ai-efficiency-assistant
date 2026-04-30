import type { ReactNode } from 'react';

/** AI 处理操作类型 */
export type AiActionType = 'rewrite' | 'expand' | 'translate' | 'summarize';

/** AI 处理请求 */
export interface AiProcessRequest {
  text: string;
  action: AiActionType;
  apiKey?: string;
  targetLanguage?: string;
}

/** AI 处理响应 */
export interface AiProcessResponse {
  success: boolean;
  result?: string;
  error?: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/** API Key 配置 */
export interface ApiKeyConfig {
  provider: 'openai' | 'custom';
  apiKey: string;
  baseUrl?: string;
  model?: string;
}

/** 定价方案 */
export interface PricingPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  features: string[];
  callLimit: string;
  highlighted: boolean;
  ctaText: string;
}

/** 功能卡片 */
export interface FeatureCard {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  color: string;
  bgColor: string;
  textColor: string;
  to?: string;
}

/** useAi Hook 返回类型 */
export interface UseAiReturn {
  processText: (request: AiProcessRequest, maxRetries?: number) => Promise<void>;
  result: string | null;
  error: string | null;
  loading: boolean;
  clearResult: () => void;
  cancelRequest: () => void;
}

/** AI 操作的中文标签映射 */
export const ACTION_LABELS: Record<AiActionType, string> = {
  rewrite: '智能改写',
  expand: '一键扩写',
  translate: '多语言翻译',
  summarize: '内容总结',
};

/** AI 操作的描述映射 */
export const ACTION_DESCRIPTIONS: Record<AiActionType, string> = {
  rewrite: '优化文案表达，让文字更加专业流畅',
  expand: '基于原文扩展内容，丰富细节和论述',
  translate: '支持多语言互译，打破语言壁垒',
  summarize: '提炼核心要点，快速把握文章主旨',
};
