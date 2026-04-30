import { useState, useCallback, useRef, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { roleplayStore } from '../store/roleplayStore';
import type { CharacterCard, CharacterCategory, QuickCommand, StatusField } from '../data/characterCards';

/* ------------------------------------------------------------------ */
/*  常量                                                                */
/* ------------------------------------------------------------------ */

const MAX_QUICK_COMMANDS = 8;
const MAX_STATUS_FIELDS = 6;

const EMPTY_COMMAND = (): QuickCommand => ({ label: '', prompt: '' });
const EMPTY_STATUS = (): StatusField => ({ name: '', icon: '📊', defaultValue: '' });

const CHARACTER_CATEGORIES: { label: string; value: CharacterCategory }[] = [
  { label: '奇幻', value: 'fantasy' },
  { label: '历史', value: 'historical' },
  { label: '生存', value: 'survival' },
  { label: '推理', value: 'mystery' },
  { label: '科幻', value: 'scifi' },
  { label: '恋爱', value: 'romance' },
  { label: '冒险', value: 'adventure' },
  { label: '日常', value: 'daily' },
];

const CATEGORY_LABELS: Record<string, string> = {
  fantasy: '奇幻',
  historical: '历史',
  survival: '生存',
  mystery: '推理',
  scifi: '科幻',
  romance: '恋爱',
  adventure: '冒险',
  daily: '日常',
  horror: '恐怖',
};

/* ------------------------------------------------------------------ */
/*  表单状态                                                            */
/* ------------------------------------------------------------------ */

interface FormState {
  name: string;
  description: string;
  avatarEmoji: string;
  category: CharacterCategory;
  tags: string;
  worldBackground: string;
  aiPrompt: string;
  openingLine: string;
  quickCommands: QuickCommand[];
  statusFields: StatusField[];
}

interface FormErrors {
  name?: string;
  description?: string;
  worldBackground?: string;
  aiPrompt?: string;
  openingLine?: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  avatarEmoji: '🎭',
  category: 'fantasy' as CharacterCategory,
  tags: '',
  worldBackground: '',
  aiPrompt: '',
  openingLine: '',
  quickCommands: [EMPTY_COMMAND(), EMPTY_COMMAND()],
  statusFields: [EMPTY_STATUS(), EMPTY_STATUS()],
};

/* ------------------------------------------------------------------ */
/*  工具函数                                                            */
/* ------------------------------------------------------------------ */

function generateId(): string {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function downloadJson(data: CharacterCard) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.name || 'character-card'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/*  组件                                                                */
/* ------------------------------------------------------------------ */

export default function CharacterCreator() {
  const navigate = useNavigate();
  const addCard = roleplayStore((s) => s.addCustomCard);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPreview, setShowPreview] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  /* ---- 通用字段更新 ---- */
  const updateField = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    []
  );

  /* ---- 快捷指令操作 ---- */
  const addQuickCommand = useCallback(() => {
    setForm((prev) => {
      if (prev.quickCommands.length >= MAX_QUICK_COMMANDS) return prev;
      return { ...prev, quickCommands: [...prev.quickCommands, EMPTY_COMMAND()] };
    });
  }, []);

  const removeQuickCommand = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      quickCommands: prev.quickCommands.filter((_, i) => i !== index),
    }));
  }, []);

  const updateQuickCommand = useCallback(
    (index: number, field: keyof QuickCommand, value: string) => {
      setForm((prev) => {
        const updated = [...prev.quickCommands];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, quickCommands: updated };
      });
    },
    []
  );

  /* ---- 状态栏操作 ---- */
  const addStatusField = useCallback(() => {
    setForm((prev) => {
      if (prev.statusFields.length >= MAX_STATUS_FIELDS) return prev;
      return { ...prev, statusFields: [...prev.statusFields, EMPTY_STATUS()] };
    });
  }, []);

  const removeStatusField = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      statusFields: prev.statusFields.filter((_, i) => i !== index),
    }));
  }, []);

  const updateStatusField = useCallback(
    (index: number, field: keyof StatusField, value: string) => {
      setForm((prev) => {
        const updated = [...prev.statusFields];
        updated[index] = { ...updated[index], [field]: value };
        return { ...prev, statusFields: updated };
      });
    },
    []
  );

  /* ---- 表单验证 ---- */
  const validate = useCallback((): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim()) e.name = '角色名称不能为空';
    if (!form.description.trim()) e.description = '角色描述不能为空';
    if (form.worldBackground.trim().length < 50)
      e.worldBackground = `世界观背景至少 50 字（当前 ${form.worldBackground.trim().length} 字）`;
    if (form.aiPrompt.trim().length < 50)
      e.aiPrompt = `AI 提示词至少 50 字（当前 ${form.aiPrompt.trim().length} 字）`;
    if (form.openingLine.trim().length < 30)
      e.openingLine = `开场白至少 30 字（当前 ${form.openingLine.trim().length} 字）`;
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [form]);

  /* ---- 构建角色卡对象 ---- */
  const buildCard = useCallback((): CharacterCard => {
    return {
      id: generateId(),
      name: form.name.trim(),
      description: form.description.trim(),
      avatar: form.avatarEmoji.trim() || '🎭',
      category: form.category,
      tags: form.tags
        .split(/[,，]/)
        .map((t) => t.trim())
        .filter(Boolean),
      author: '自定义',
      playCount: 0,
      rating: 0,
      createdAt: new Date().toISOString(),
      worldSetting: form.worldBackground.trim(),
      characterPrompt: form.aiPrompt.trim(),
      greeting: form.openingLine.trim(),
      quickCommands: form.quickCommands.filter((c) => c.label.trim() || c.prompt.trim()),
      statusFields: form.statusFields.filter((s) => s.name.trim()),
    };
  }, [form]);

  /* ---- 保存 ---- */
  const handleSave = useCallback(() => {
    if (!validate()) {
      setToast('请修正表单中的错误');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const card = buildCard();
    addCard(card);
    setToast('角色卡已保存');
    setTimeout(() => setToast(null), 3000);
    navigate('/playground');
  }, [validate, buildCard, addCard, navigate]);

  /* ---- 导出 JSON ---- */
  const handleExport = useCallback(() => {
    if (!validate()) {
      setToast('请修正表单中的错误后再导出');
      setTimeout(() => setToast(null), 3000);
      return;
    }
    const card = buildCard();
    downloadJson(card);
    setToast('JSON 文件已下载');
    setTimeout(() => setToast(null), 3000);
  }, [validate, buildCard]);

  /* ---- 导入 JSON ---- */
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string) as Record<string, unknown>;
          if (!data.name || !data.worldSetting || !data.characterPrompt || !data.greeting) {
            setToast('JSON 格式不正确，缺少必填字段');
            setTimeout(() => setToast(null), 3000);
            return;
          }
          setForm({
            name: (data.name as string) ?? '',
            description: (data.description as string) ?? '',
            avatarEmoji: (data.emoji as string) ?? '🎭',
            category: (data.category as CharacterCategory) ?? 'fantasy',
            tags: ((data.tags as string[]) ?? []).join(', '),
            worldBackground: (data.worldSetting as string) ?? '',
            aiPrompt: (data.characterPrompt as string) ?? '',
            openingLine: (data.greeting as string) ?? '',
            quickCommands: (data.quickCommands as QuickCommand[])?.length
              ? (data.quickCommands as QuickCommand[]).slice(0, MAX_QUICK_COMMANDS)
              : [EMPTY_COMMAND(), EMPTY_COMMAND()],
            statusFields: (data.statusFields as StatusField[])?.length
              ? (data.statusFields as StatusField[]).slice(0, MAX_STATUS_FIELDS)
              : [EMPTY_STATUS(), EMPTY_STATUS()],
          });
          setErrors({});
          setToast('角色卡已导入');
          setTimeout(() => setToast(null), 3000);
        } catch {
          setToast('JSON 解析失败，请检查文件格式');
          setTimeout(() => setToast(null), 3000);
        }
      };
      reader.readAsText(file);
      // 重置 input 以便再次选择同一文件
      e.target.value = '';
    },
    []
  );

  /* ---- 预览 ---- */
  const handlePreview = useCallback(() => {
    setShowPreview((prev) => !prev);
  }, []);

  /* ---- 预览数据 ---- */
  const previewTags = form.tags
    .split(/[,，]/)
    .map((t) => t.trim())
    .filter(Boolean);

  /* ================================================================ */
  /*  渲染                                                              */
  /* ================================================================ */

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Toast 通知 */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 animate-slide-in-right">
          <div className="px-4 py-3 rounded-lg shadow-lg bg-primary-600 text-white text-sm font-medium">
            {toast}
          </div>
        </div>
      )}

      {/* 页面头部 */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-purple-100/60 via-indigo-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-purple-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <button
              onClick={() => navigate('/workspace')}
              className="hover:text-purple-600 transition-colors"
            >
              工具
            </button>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">角色卡创建器</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-purple-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
              角色卡创建器
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            创建自定义角色卡，定义世界观、角色设定和游戏机制
          </p>
        </div>
      </section>

      {/* 表单主体 */}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          handleSave();
        }}
        className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-6"
      >
        {/* ====== 1. 基本信息 ====== */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-sm">
              📋
            </span>
            基本信息
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* 角色名称 */}
            <div className="sm:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                角色名称 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="输入角色名称"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                  ${errors.name ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-500">{errors.name}</p>
              )}
            </div>

            {/* 角色描述 */}
            <div className="sm:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                角色描述 <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                rows={3}
                placeholder="简要描述这个角色的特点、背景和故事"
                className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors resize-y
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                  ${errors.description ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
              />
              {errors.description && (
                <p className="mt-1 text-xs text-red-500">{errors.description}</p>
              )}
            </div>

            {/* 头像 Emoji */}
            <div>
              <label htmlFor="avatarEmoji" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                头像 Emoji
              </label>
              <input
                id="avatarEmoji"
                type="text"
                value={form.avatarEmoji}
                onChange={(e) => updateField('avatarEmoji', e.target.value)}
                placeholder="🎭"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            {/* 分类 */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                分类
              </label>
              <select
                id="category"
                value={form.category}
                onChange={(e) => updateField('category', e.target.value as CharacterCategory)}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {CHARACTER_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 标签 */}
            <div className="sm:col-span-2">
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                标签
              </label>
              <input
                id="tags"
                type="text"
                value={form.tags}
                onChange={(e) => updateField('tags', e.target.value)}
                placeholder="用逗号分隔，例如：魔法, 冒险, 中世纪"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 text-sm
                  bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                  placeholder-gray-400 dark:placeholder-gray-500
                  focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>
        </section>

        {/* ====== 2. 世界观设定 ====== */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm">
              🌍
            </span>
            世界观设定
          </h2>

          <div>
            <label htmlFor="worldBackground" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              世界观背景 <span className="text-red-500">*</span>
              <span className="text-gray-400 dark:text-gray-500 font-normal ml-2">
                至少 50 字
              </span>
            </label>
            <textarea
              id="worldBackground"
              value={form.worldBackground}
              onChange={(e) => updateField('worldBackground', e.target.value)}
              rows={6}
              placeholder="描述这个世界的规则、势力、地理等。例如：这是一个被魔法笼罩的大陆，五大王国各据一方..."
              className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors resize-y
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                ${errors.worldBackground ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            />
            <div className="mt-1 flex justify-between">
              {errors.worldBackground ? (
                <p className="text-xs text-red-500">{errors.worldBackground}</p>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  提示：描述这个世界的规则、势力、地理等
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {form.worldBackground.trim().length} 字
              </span>
            </div>
          </div>
        </section>

        {/* ====== 3. 角色设定 ====== */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-sm">
              🤖
            </span>
            角色设定
          </h2>

          <div>
            <label htmlFor="aiPrompt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              角色 AI 提示词 <span className="text-red-500">*</span>
              <span className="text-gray-400 dark:text-gray-500 font-normal ml-2">
                至少 50 字
              </span>
            </label>
            <textarea
              id="aiPrompt"
              value={form.aiPrompt}
              onChange={(e) => updateField('aiPrompt', e.target.value)}
              rows={6}
              placeholder="描述 AI 应该如何扮演这个角色，包括语气风格、行为规则、知识范围等。例如：你是一位年迈的魔法师，说话缓慢而神秘..."
              className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors resize-y
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                ${errors.aiPrompt ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            />
            <div className="mt-1 flex justify-between">
              {errors.aiPrompt ? (
                <p className="text-xs text-red-500">{errors.aiPrompt}</p>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  提示：描述 AI 应该如何扮演，语气风格，行为规则等
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {form.aiPrompt.trim().length} 字
              </span>
            </div>
          </div>
        </section>

        {/* ====== 4. 开场白 ====== */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-sm">
              💬
            </span>
            开场白
          </h2>

          <div>
            <label htmlFor="openingLine" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              开场白 <span className="text-red-500">*</span>
              <span className="text-gray-400 dark:text-gray-500 font-normal ml-2">
                至少 30 字
              </span>
            </label>
            <textarea
              id="openingLine"
              value={form.openingLine}
              onChange={(e) => updateField('openingLine', e.target.value)}
              rows={4}
              placeholder="玩家进入时看到的第一段文字。例如：你推开沉重的木门，一股陈旧的气息扑面而来..."
              className={`w-full px-4 py-2.5 rounded-lg border text-sm transition-colors resize-y
                bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                ${errors.openingLine ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
            />
            <div className="mt-1 flex justify-between">
              {errors.openingLine ? (
                <p className="text-xs text-red-500">{errors.openingLine}</p>
              ) : (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  提示：玩家进入时看到的第一段文字
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {form.openingLine.trim().length} 字
              </span>
            </div>
          </div>
        </section>

        {/* ====== 5. 游戏机制 - 快捷指令 ====== */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/40 flex items-center justify-center text-sm">
              ⚡
            </span>
            快捷指令
            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-2">
              ({form.quickCommands.length}/{MAX_QUICK_COMMANDS})
            </span>
          </h2>

          <div className="space-y-4">
            {form.quickCommands.map((cmd, index) => (
              <div
                key={index}
                className="relative p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-start gap-3">
                  <span className="mt-2 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-xs font-medium text-purple-700 dark:text-purple-300 flex-shrink-0">
                    {index + 1}
                  </span>
                  <div className="flex-1 space-y-3">
                    <input
                      type="text"
                      value={cmd.label}
                      onChange={(e) => updateQuickCommand(index, 'label', e.target.value)}
                      placeholder="指令标签，例如：查看背包"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                        placeholder-gray-400 dark:placeholder-gray-500
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <textarea
                      value={cmd.prompt}
                      onChange={(e) => updateQuickCommand(index, 'prompt', e.target.value)}
                      rows={2}
                      placeholder="指令内容，例如：你打开了自己的背包，里面有一把生锈的剑..."
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm resize-y
                        bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                        placeholder-gray-400 dark:placeholder-gray-500
                        focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  {form.quickCommands.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeQuickCommand(index)}
                      className="mt-1 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="删除此指令"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {form.quickCommands.length < MAX_QUICK_COMMANDS && (
              <button
                type="button"
                onClick={addQuickCommand}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600
                  text-sm text-gray-500 dark:text-gray-400 hover:border-purple-400 hover:text-purple-600
                  dark:hover:border-purple-500 dark:hover:text-purple-400 transition-colors"
              >
                + 添加快捷指令
              </button>
            )}
          </div>
        </section>

        {/* ====== 6. 游戏机制 - 状态栏字段 ====== */}
        <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center text-sm">
              📊
            </span>
            状态栏字段
            <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-2">
              ({form.statusFields.length}/{MAX_STATUS_FIELDS})
            </span>
          </h2>

          <div className="space-y-4">
            {form.statusFields.map((field, index) => (
              <div
                key={index}
                className="relative p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        字段名称
                      </label>
                      <input
                        type="text"
                        value={field.name}
                        onChange={(e) => updateStatusField(index, 'name', e.target.value)}
                        placeholder="例如：生命值"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500
                          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        图标 Emoji
                      </label>
                      <input
                        type="text"
                        value={field.icon}
                        onChange={(e) => updateStatusField(index, 'icon', e.target.value)}
                        placeholder="📊"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500
                          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                        默认值
                      </label>
                      <input
                        type="text"
                        value={field.defaultValue}
                        onChange={(e) => updateStatusField(index, 'defaultValue', e.target.value)}
                        placeholder="例如：100"
                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500
                          focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  {form.statusFields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStatusField(index)}
                      className="mt-5 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="删除此字段"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {form.statusFields.length < MAX_STATUS_FIELDS && (
              <button
                type="button"
                onClick={addStatusField}
                className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600
                  text-sm text-gray-500 dark:text-gray-400 hover:border-purple-400 hover:text-purple-600
                  dark:hover:border-purple-500 dark:hover:text-purple-400 transition-colors"
              >
                + 添加状态栏字段
              </button>
            )}
          </div>
        </section>

        {/* ====== 预览区域 ====== */}
        {showPreview && (
          <section className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8 animate-slide-up">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-sm">
                👁
              </span>
              角色卡预览
            </h2>

            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              {/* 预览头部 */}
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center gap-4">
                  <span className="text-5xl">{form.avatarEmoji || '🎭'}</span>
                  <div>
                    <h3 className="text-xl font-bold">
                      {form.name || '未命名角色'}
                    </h3>
                    <p className="text-purple-100 text-sm mt-1">
                      {form.description || '暂无描述'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <span className="px-3 py-1 rounded-full bg-white/20 text-white text-xs font-medium backdrop-blur-sm">
                    {CATEGORY_LABELS[form.category] || form.category}
                  </span>
                  {previewTags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded-full bg-white/10 text-purple-100 text-xs backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* 预览内容 */}
              <div className="p-6 space-y-5">
                {/* 世界观 */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <span>🌍</span> 世界观
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                    {form.worldBackground
                      ? form.worldBackground.trim().slice(0, 200) +
                        (form.worldBackground.trim().length > 200 ? '...' : '')
                      : '暂无世界观设定'}
                  </p>
                </div>

                {/* 开场白 */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                    <span>💬</span> 开场白
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed italic">
                    {form.openingLine || '暂无开场白'}
                  </p>
                </div>

                {/* 快捷指令预览 */}
                {form.quickCommands.some((c) => c.label.trim()) && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <span>⚡</span> 快捷指令
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {form.quickCommands
                        .filter((c) => c.label.trim())
                        .map((cmd, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs font-medium border border-purple-200 dark:border-purple-800"
                          >
                            {cmd.label}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                {/* 状态栏预览 */}
                {form.statusFields.some((s) => s.name.trim()) && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                      <span>📊</span> 状态栏
                    </h4>
                    <div className="flex flex-wrap gap-3">
                      {form.statusFields
                        .filter((s) => s.name.trim())
                        .map((field, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
                          >
                            <span>{field.icon || '📊'}</span>
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              {field.name}
                            </span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {field.defaultValue || '-'}
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ====== 底部操作按钮 ====== */}
        <div className="sticky bottom-0 bg-gray-50/80 dark:bg-gray-950/80 backdrop-blur-lg -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              type="button"
              onClick={handlePreview}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600
                text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800
                hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              {showPreview ? '隐藏预览' : '预览角色卡'}
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600
                text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800
                hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              导入 JSON
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="px-5 py-2.5 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600
                text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800
                hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              导出 JSON
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl text-sm font-medium text-white
                bg-gradient-to-r from-purple-600 to-indigo-600
                hover:from-purple-700 hover:to-indigo-700
                shadow-sm hover:shadow-md transition-all"
            >
              保存角色卡
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
