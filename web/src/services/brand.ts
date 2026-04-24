/**
 * AI Efficiency Assistant — Brand Voice CRUD Service
 *
 * Manages brand voice configuration stored in localStorage.
 * Provides a helper to convert the configuration into a system-prompt string
 * that can be injected into AI requests for brand-consistent output.
 */

export interface BrandVoice {
  /** 品牌名称 */
  brandName: string;
  /** 行业领域 */
  industry: string;
  /** 目标受众 */
  targetAudience: string;
  /** 品牌调性 */
  tone:
    | '专业权威'
    | '活泼亲切'
    | '温暖真诚'
    | '高端奢华'
    | '简洁直接';
  /** 语言风格 */
  languageStyle: string;
  /** 内容长度偏好 */
  contentLength: string;
  /** 表达方式 */
  expressionStyle: string;
  /** 禁用词汇（逗号分隔） */
  forbiddenWords: string;
  /** 附加说明 */
  additionalNotes: string;
}

const STORAGE_KEY = 'ai-assistant-brand-voice';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Safely read the brand voice object from localStorage. */
function readBrandVoice(): BrandVoice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as BrandVoice;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the saved brand voice configuration.
 *
 * @returns The `BrandVoice` object, or `null` if none has been saved.
 */
export function getBrandVoice(): BrandVoice | null {
  return readBrandVoice();
}

/**
 * Save (or update) the brand voice configuration to localStorage.
 */
export function saveBrandVoice(voice: BrandVoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(voice));
  } catch {
    console.warn(
      `[brand] Failed to write brand voice to localStorage (key: ${STORAGE_KEY})`,
    );
  }
}

/**
 * Delete the saved brand voice configuration from localStorage.
 */
export function clearBrandVoice(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn(
      `[brand] Failed to clear brand voice from localStorage (key: ${STORAGE_KEY})`,
    );
  }
}

/**
 * Convert the current `BrandVoice` configuration into a Chinese system-prompt
 * string suitable for injecting into AI requests.
 *
 * Example output:
 * ```
 * 品牌信息：
 * - 品牌名称：XX
 * - 行业领域：XX
 * - 目标受众：XX
 * - 品牌调性：XX
 * - 语言风格：XX
 * - 内容长度偏好：XX
 * - 表达方式：XX
 * 请避免使用以下词汇：XX。
 * 附加说明：XX。
 * 请在生成内容时保持品牌一致性。
 * ```
 *
 * @returns The prompt string, or an empty string if no brand voice is configured.
 */
export function buildBrandPrompt(override?: BrandVoice): string {
  const voice = override || getBrandVoice();
  if (!voice) return '';

  const parts: string[] = ['品牌信息：'];

  if (voice.brandName.trim()) {
    parts.push(`- 品牌名称：${voice.brandName.trim()}`);
  }
  if (voice.industry.trim()) {
    parts.push(`- 行业领域：${voice.industry.trim()}`);
  }
  if (voice.targetAudience.trim()) {
    parts.push(`- 目标受众：${voice.targetAudience.trim()}`);
  }
  if (voice.tone.trim()) {
    parts.push(`- 品牌调性：${voice.tone.trim()}`);
  }
  if (voice.languageStyle.trim()) {
    parts.push(`- 语言风格：${voice.languageStyle.trim()}`);
  }
  if (voice.contentLength.trim()) {
    parts.push(`- 内容长度偏好：${voice.contentLength.trim()}`);
  }
  if (voice.expressionStyle.trim()) {
    parts.push(`- 表达方式：${voice.expressionStyle.trim()}`);
  }

  if (voice.forbiddenWords.trim()) {
    parts.push(`请避免使用以下词汇：${voice.forbiddenWords.trim()}。`);
  }

  if (voice.additionalNotes.trim()) {
    parts.push(`附加说明：${voice.additionalNotes.trim()}。`);
  }

  parts.push('请在生成内容时保持品牌一致性。');

  return parts.join('\n');
}
