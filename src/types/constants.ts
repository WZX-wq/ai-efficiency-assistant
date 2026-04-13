import type { ActionConfig, ActionType } from '@/types';

/** 各操作对应的 prompt 模板配置 */
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

/** 获取操作的 prompt */
export function getActionPrompt(actionType: ActionType, text: string): string {
  const config = ACTION_CONFIGS[actionType];
  return config.promptTemplate.replace('{text}', text);
}

/** 默认设置 */
export const DEFAULT_SETTINGS = {
  apiKey: '',
  apiUrl: 'https://api.edgefn.net/v1/chat/completions',
  model: 'DeepSeek-V3',
  temperature: 0.7,
};
