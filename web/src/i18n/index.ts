import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import zh from './locales/zh';
import en from './locales/en';

/** 支持的语言 */
export type Locale = 'zh' | 'en';

/** 翻译资源映射 */
const messages: Record<Locale, Record<string, string>> = { zh, en };

/** i18n Store 状态定义 */
interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

/** zustand store — 使用 persist 中间件持久化 locale */
const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: 'zh',
      setLocale: (locale) => set({ locale }),
    }),
    {
      name: 'ai-assistant-i18n',
    }
  )
);

/**
 * 翻译函数
 * @param key    点号分隔的翻译键，如 'home.hero.title'
 * @param params 可选的插值参数，如 { name: 'User' }
 * @param locale 当前语言
 * @returns 翻译后的字符串；找不到时返回 key 本身
 */
function translate(
  key: string,
  params: Record<string, string> | undefined,
  locale: Locale
): string {
  const text = messages[locale][key] ?? messages.zh[key] ?? key;
  if (!params) return text;
  return Object.entries(params).reduce(
    (str, [k, v]) => str.replace(new RegExp(`\\{${k}\\}`, 'g'), v),
    text
  );
}

/**
 * useTranslation hook
 *
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useTranslation();
 * t('common.search')                        // => '搜索'
 * t('home.hero.greeting', { name: 'User' }) // => '你好, User'
 * setLocale('en')
 * ```
 */
export function useTranslation() {
  const { locale, setLocale } = useI18nStore();

  const t = (key: string, params?: Record<string, string>): string =>
    translate(key, params, locale);

  return { t, locale, setLocale } as {
    t: (key: string, params?: Record<string, string>) => string;
    locale: string;
    setLocale: (locale: string) => void;
  };
}

export { zh, en };
export default useTranslation;
