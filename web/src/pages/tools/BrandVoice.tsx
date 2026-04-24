import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  getBrandVoice,
  saveBrandVoice,
  clearBrandVoice,
  buildBrandPrompt,
  type BrandVoice,
} from '../../services/brand';
import { useToast } from '../../components/ToastProvider';

const EMPTY_FORM: BrandVoice = {
  brandName: '',
  industry: '',
  targetAudience: '',
  tone: '专业权威',
  languageStyle: '正式商务',
  contentLength: '适中详细',
  expressionStyle: '直接陈述',
  forbiddenWords: '',
  additionalNotes: '',
};

const TONE_OPTIONS: BrandVoice['tone'][] = [
  '专业权威',
  '活泼亲切',
  '温暖真诚',
  '高端奢华',
  '简洁直接',
];

const LANGUAGE_STYLE_OPTIONS = [
  '正式商务',
  '轻松口语',
  '文艺优雅',
  '技术专业',
  '感性叙事',
] as const;

const CONTENT_LENGTH_OPTIONS = [
  '简洁精炼',
  '适中详细',
  '丰富全面',
] as const;

const EXPRESSION_STYLE_OPTIONS = [
  '直接陈述',
  '故事化叙述',
  '数据驱动',
  '情感共鸣',
] as const;

/** 9 个维度 key，用于计算完成度 */
const DIMENSION_KEYS: (keyof BrandVoice)[] = [
  'brandName',
  'industry',
  'targetAudience',
  'tone',
  'languageStyle',
  'contentLength',
  'expressionStyle',
  'forbiddenWords',
  'additionalNotes',
];

export default function BrandVoicePage() {
  const [form, setForm] = useState<BrandVoice>(EMPTY_FORM);
  const { toast: showToast } = useToast();

  // Load existing config on mount
  useEffect(() => {
    const saved = getBrandVoice();
    if (saved) {
      setForm((prev) => ({
        ...prev,
        ...saved,
        // Ensure new fields have defaults if missing from saved data
        languageStyle: saved.languageStyle || '正式商务',
        contentLength: saved.contentLength || '适中详细',
        expressionStyle: saved.expressionStyle || '直接陈述',
      }));
    }
  }, []);

  const updateField = useCallback(<K extends keyof BrandVoice>(key: K, value: BrandVoice[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (!form.brandName.trim()) {
      showToast('请至少填写品牌名称', 'error');
      return;
    }
    try {
      saveBrandVoice(form);
      showToast('品牌声音配置已保存', 'success');
    } catch {
      showToast('保存失败，请稍后重试', 'error');
    }
  }, [form, showToast]);

  const handleClear = useCallback(() => {
    try {
      clearBrandVoice();
      setForm(EMPTY_FORM);
      showToast('品牌声音配置已清除', 'success');
    } catch {
      showToast('清除失败，请稍后重试', 'error');
    }
  }, [showToast]);

  // Completion score
  const completedCount = useMemo(() => {
    return DIMENSION_KEYS.filter((key) => {
      const val = form[key];
      return typeof val === 'string' && val.trim().length > 0;
    }).length;
  }, [form]);

  const completionPercent = Math.round((completedCount / DIMENSION_KEYS.length) * 100);

  const previewPrompt = buildBrandPrompt(form as import('../../services/brand').BrandVoice);

  // Progress bar color based on completion
  const progressColor =
    completionPercent === 100
      ? 'bg-green-500'
      : completionPercent >= 60
        ? 'bg-violet-500'
        : completionPercent >= 30
          ? 'bg-yellow-500'
          : 'bg-red-400';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-violet-100/60 via-violet-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-violet-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-violet-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">品牌声音</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 bg-clip-text text-transparent">
              品牌声音
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            配置你的品牌调性，AI 自动适配所有生成内容
          </p>
        </div>
      </section>

      {/* Form Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Header + Completion Score */}
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-violet-600 bg-violet-50 dark:bg-violet-900/30">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">品牌声音配置</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">填写品牌信息，AI 将根据配置生成一致的内容风格</p>
                  </div>
                </div>

                {/* Completion Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {completedCount}/{DIMENSION_KEYS.length} 维度已配置
                  </span>
                  <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="px-6 py-5 space-y-5">
              {/* 品牌名称 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  品牌名称 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.brandName}
                  onChange={(e) => updateField('brandName', e.target.value)}
                  placeholder="例如：花西子"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              {/* 行业领域 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  行业领域
                </label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={(e) => updateField('industry', e.target.value)}
                  placeholder="例如：美妆护肤"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              {/* 目标受众 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  目标受众
                </label>
                <textarea
                  value={form.targetAudience}
                  onChange={(e) => updateField('targetAudience', e.target.value)}
                  placeholder="例如：25-35岁都市女性，追求品质生活"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              {/* 品牌调性 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  品牌调性
                </label>
                <select
                  value={form.tone}
                  onChange={(e) => updateField('tone', e.target.value as BrandVoice['tone'])}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                >
                  {TONE_OPTIONS.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
              </div>

              {/* 语言风格 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  语言风格
                </label>
                <select
                  value={form.languageStyle}
                  onChange={(e) => updateField('languageStyle', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                >
                  {LANGUAGE_STYLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 内容长度偏好 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  内容长度偏好
                </label>
                <select
                  value={form.contentLength}
                  onChange={(e) => updateField('contentLength', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                >
                  {CONTENT_LENGTH_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 表达方式 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  表达方式
                </label>
                <select
                  value={form.expressionStyle}
                  onChange={(e) => updateField('expressionStyle', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                >
                  {EXPRESSION_STYLE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* 禁忌词汇 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  禁忌词汇
                </label>
                <input
                  type="text"
                  value={form.forbiddenWords}
                  onChange={(e) => updateField('forbiddenWords', e.target.value)}
                  placeholder="用逗号分隔，例如：最好,第一,绝对"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              {/* 附加说明 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  附加说明
                </label>
                <textarea
                  value={form.additionalNotes}
                  onChange={(e) => updateField('additionalNotes', e.target.value)}
                  placeholder="其他需要AI注意的品牌要求"
                  rows={2}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700 dark:text-gray-200"
                />
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-violet-500 hover:bg-violet-600 rounded-xl transition-all shadow-md shadow-violet-500/25 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                >
                  保存配置
                </button>
                <button
                  onClick={handleClear}
                  className="px-6 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-xl transition-all"
                >
                  清除配置
                </button>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-violet-600 bg-violet-50 dark:bg-violet-900/30">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">品牌 Prompt 预览</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">AI 将使用以下信息保持品牌一致性</p>
                </div>
              </div>
            </div>
            <div className="px-6 py-5">
              {previewPrompt ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 rounded-xl p-4 leading-relaxed font-sans border border-gray-100 dark:border-gray-600">
                  {previewPrompt}
                </pre>
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-400 dark:text-gray-500">尚未配置品牌信息，填写上方表单后预览将自动更新</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
