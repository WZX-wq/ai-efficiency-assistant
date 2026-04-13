import type { DeepSeekRequest, DeepSeekResponse, ExtensionSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types/constants';

const DEFAULT_API_URL = 'https://api.edgefn.net/v1/chat/completions';

/**
 * 调用 DeepSeek API
 */
export async function callDeepSeekAPI(
  prompt: string,
  settings: ExtensionSettings,
): Promise<string> {
  const { apiKey, model, temperature } = settings;

  if (!apiKey) {
    throw new Error('请先在设置中配置 DeepSeek API Key');
  }

  const apiUrl = settings.apiUrl || DEFAULT_API_URL;

  const requestBody: DeepSeekRequest = {
    model: model || DEFAULT_SETTINGS.model,
    messages: [
      {
        role: 'system',
        content:
          '你是一个专业的文字处理助手。请根据用户的要求对文字进行处理，直接输出结果，不要添加多余的解释。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: temperature ?? DEFAULT_SETTINGS.temperature,
    max_tokens: 2048,
    stream: false,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const errorMessage =
      errorData?.error?.message || `API 请求失败，状态码: ${response.status}`;
    throw new Error(errorMessage);
  }

  const data: DeepSeekResponse = await response.json();

  if (!data.choices || data.choices.length === 0) {
    throw new Error('API 返回了空结果');
  }

  return data.choices[0].message.content.trim();
}
