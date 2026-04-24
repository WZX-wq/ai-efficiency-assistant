import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { checkApiHealth, getModelConfig } from '../services/api';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../i18n';
import UsageStats from '../components/UsageStats';
import { useSeo, PAGE_SEO } from '../components/SeoHead';

interface ModelConfig {
  provider: string;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const STORAGE_KEY = 'ai-assistant-model-config';

const DEFAULT_CONFIG: ModelConfig = {
  provider: '白山智算',
  apiKey: '',
  baseUrl: 'https://api.edgefn.net/v1/chat/completions',
  model: 'DeepSeek-V3',
};

const PROVIDER_DEFAULTS: Record<string, { baseUrl: string; model: string }> = {
  '白山智算': { baseUrl: 'https://api.edgefn.net/v1/chat/completions', model: 'DeepSeek-V3' },
  'OpenAI': { baseUrl: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' },
  'Anthropic': { baseUrl: 'https://api.anthropic.com/v1/messages', model: 'claude-3-haiku-20240307' },
  '自定义': { baseUrl: '', model: '' },
};

const SHORTCUTS = [
  { keys: 'Ctrl + K', desc: '打开命令面板' },
  { keys: 'Ctrl + /', desc: '聚焦搜索框' },
  { keys: 'Enter', desc: '发送消息' },
  { keys: 'Shift + Enter', desc: '换行' },
  { keys: 'Ctrl + Enter', desc: '生成内容' },
  { keys: 'Ctrl + Shift + S', desc: '打开设置' },
];

function loadConfig(): ModelConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { ...DEFAULT_CONFIG };
}

export default function Settings() {
  useSeo(PAGE_SEO.settings);
  const { toast } = useToast();
  const { theme, setTheme, totalWordsGenerated, totalActions, recentTools, fontSize, setFontSize } = useAppStore();
  const { locale, setLocale } = useTranslation();
  const [config, setConfig] = useState<ModelConfig>(loadConfig);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'model' | 'shortcuts' | 'about'>('general');
  const [showStats, setShowStats] = useState(false);

  const handleSave = () => {
    if (config.baseUrl && !config.baseUrl.startsWith('http://') && !config.baseUrl.startsWith('https://')) {
      toast('API 地址必须以 http:// 或 https:// 开头', 'error');
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    toast('模型配置已保存', 'success');
  };

  const handleProviderChange = (provider: string) => {
    const defaults = PROVIDER_DEFAULTS[provider];
    if (defaults) {
      setConfig({ ...config, provider, baseUrl: defaults.baseUrl, model: defaults.model });
    } else {
      setConfig({ ...config, provider });
    }
  };

  const handleClearCache = () => {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ai-assistant-')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
    toast(`已清除 ${keysToRemove.length} 条本地缓存`, 'success');
  };

  const handleExportData = () => {
    const data = {
      totalWordsGenerated,
      totalActions,
      recentTools,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-assistant-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('使用数据已导出', 'success');
  };

  const handleExportAllData = () => {
    const data: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('ai-')) {
        data[key] = localStorage.getItem(key) || '';
      }
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-efficiency-assistant-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('数据导出成功', 'success');
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (typeof data !== 'object') throw new Error('Invalid format');
          let count = 0;
          for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('ai-') && typeof value === 'string') {
              localStorage.setItem(key, value);
              count++;
            }
          }
          toast(`成功导入 ${count} 项数据，请刷新页面生效`, 'success');
        } catch {
          toast('导入失败：文件格式不正确', 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleResetAll = () => {
    if (window.confirm('确定要重置所有设置吗？此操作将清除所有应用数据并重新加载页面。')) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleTest = async () => {
    setTesting(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    const ok = await checkApiHealth();
    setTesting(false);
    toast(ok ? '连接成功' : '连接失败，请检查配置', ok ? 'success' : 'error');
  };

  const handleThemeChange = (t: 'light' | 'dark' | 'system') => {
    setTheme(t);
    toast('主题已切换', 'success');
  };

  const currentModel = getModelConfig();

  const tabs = [
    { key: 'general' as const, label: '通用设置', icon: '⚙️' },
    { key: 'model' as const, label: '模型配置', icon: '🤖' },
    { key: 'shortcuts' as const, label: '快捷键', icon: '⌨️' },
    { key: 'about' as const, label: '关于', icon: 'ℹ️' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">设置</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">管理模型配置、外观偏好和使用统计</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-8 bg-white dark:bg-gray-800 rounded-xl p-1 border border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* General Settings */}
        {activeTab === 'general' && (
          <div className="space-y-6 animate-fade-in">
            {/* Theme */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">外观设置</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">选择你喜欢的主题模式</p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'light' as const, label: '亮色', icon: '☀️', desc: '清爽明亮' },
                  { value: 'dark' as const, label: '暗黑', icon: '🌙', desc: '护眼模式' },
                  { value: 'system' as const, label: '跟随系统', icon: '💻', desc: '自动适配' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleThemeChange(opt.value)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                      theme === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <span>{opt.label}</span>
                    <span className="text-xs opacity-60">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Font Size */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">字体大小</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">调整编辑器字体大小</p>
              <div className="grid grid-cols-3 gap-3">
                {([
                  { value: 'small' as const, label: '小', size: '14px' },
                  { value: 'medium' as const, label: '中', size: '16px' },
                  { value: 'large' as const, label: '大', size: '18px' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setFontSize(opt.value)}
                    className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                      fontSize === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span style={{ fontSize: opt.size }}>Aa</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </section>

            {/* Language */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">语言设置</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">选择界面显示语言（部分页面支持）</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: 'zh' as const, label: '中文', icon: '🇨🇳', desc: '简体中文' },
                  { value: 'en' as const, label: 'English', icon: '🇺🇸', desc: 'English (US)' },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setLocale(opt.value)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 text-sm font-medium transition-all ${
                      locale === opt.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 shadow-sm'
                        : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div className="text-left">
                      <div>{opt.label}</div>
                      <div className="text-xs opacity-60">{opt.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Usage Stats */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">使用统计</h2>
                <button
                  onClick={() => setShowStats(true)}
                  className="px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
                >
                  📊 详细统计
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">你的使用数据概览</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-primary-600">{totalWordsGenerated.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">累计生成字数</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{totalActions.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">操作次数</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{recentTools.length}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">使用工具数</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">v2.1</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">当前版本</div>
                </div>
              </div>

              {recentTools.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">最近使用的工具</h3>
                  <div className="flex flex-wrap gap-2">
                    {recentTools.map((toolId) => (
                      <span key={toolId} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-xs">
                        {toolId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Data Management */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">数据管理</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">管理本地缓存和使用数据</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  onClick={handleClearCache}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  清除本地缓存
                </button>
                <button
                  onClick={handleExportData}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  导出使用数据
                </button>
                <button
                  onClick={handleExportAllData}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  导出所有数据
                </button>
                <button
                  onClick={handleImportData}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  导入数据
                </button>
                <button
                  onClick={handleResetAll}
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm font-medium rounded-xl border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  重置所有设置
                </button>
              </div>
            </section>

            {/* Help Links */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">帮助与支持</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">获取帮助、提交反馈或了解相关政策</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <a
                  href="/services#contact"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  帮助中心
                </a>
                <a
                  href="/services#contact"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                  提交反馈
                </a>
                <Link
                  to="/privacy"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  隐私政策
                </Link>
                <Link
                  to="/terms"
                  className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  服务条款
                </Link>
              </div>
            </section>
          </div>
        )}

        {/* Model Config */}
        {activeTab === 'model' && (
          <div className="space-y-6 animate-fade-in">
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">模型配置</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">配置 AI 模型的 API 参数</p>

              {/* Current Model Badge */}
              <div className="flex items-center gap-3 mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-sm text-green-700 dark:text-green-300 font-medium">
                  当前模型: {currentModel.model}
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API 服务商</label>
                  <select
                    value={config.provider}
                    onChange={(e) => handleProviderChange(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  >
                    <option>白山智算</option>
                    <option>OpenAI</option>
                    <option>Anthropic</option>
                    <option>自定义</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={config.apiKey}
                      onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full px-3 py-2.5 pr-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {showKey ? (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API 地址</label>
                  <input
                    type="text"
                    value={config.baseUrl}
                    onChange={(e) => setConfig({ ...config, baseUrl: e.target.value })}
                    placeholder="https://api.example.com/v1/chat/completions"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">模型名称</label>
                  <input
                    type="text"
                    value={config.model}
                    onChange={(e) => setConfig({ ...config, model: e.target.value })}
                    placeholder="DeepSeek-V3"
                    className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleSave}
                    className="px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-sm"
                  >
                    保存配置
                  </button>
                  <button
                    onClick={handleTest}
                    disabled={testing}
                    className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    {testing ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        测试中...
                      </span>
                    ) : '测试连接'}
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Shortcuts */}
        {activeTab === 'shortcuts' && (
          <div className="animate-fade-in">
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">快捷键说明</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">掌握快捷键，提升操作效率</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 pr-4 font-medium text-gray-500 dark:text-gray-400">快捷键</th>
                      <th className="text-left py-3 font-medium text-gray-500 dark:text-gray-400">功能</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHORTCUTS.map((s) => (
                      <tr key={s.keys} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                        <td className="py-3 pr-4">
                          <kbd className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-mono text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                            {s.keys}
                          </kbd>
                        </td>
                        <td className="py-3 text-gray-700 dark:text-gray-300">{s.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {/* About */}
        {activeTab === 'about' && (
          <div className="space-y-6 animate-fade-in">
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/25">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">AI 效率助手</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">企业级 AI 内容创作平台</p>
                </div>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <dt className="text-gray-500 dark:text-gray-400">版本号</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">v2.1.0 (Enterprise)</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <dt className="text-gray-500 dark:text-gray-400">技术栈</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">React 18 + TypeScript + Tailwind CSS</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <dt className="text-gray-500 dark:text-gray-400">编辑器</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">Tiptap (ProseMirror)</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <dt className="text-gray-500 dark:text-gray-400">状态管理</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">Zustand</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <dt className="text-gray-500 dark:text-gray-400">动画</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">Framer Motion</dd>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <dt className="text-gray-500 dark:text-gray-400">当前 AI 模型</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">{currentModel.model}</dd>
                </div>
                <div className="flex justify-between py-2">
                  <dt className="text-gray-500 dark:text-gray-400">功能数量</dt>
                  <dd className="text-gray-900 dark:text-white font-medium">14 工具 + 6 服务 + AI 助手</dd>
                </div>
              </dl>
            </section>

            {/* 参考项目 */}
            <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">参考开源项目</h2>
              <div className="space-y-3">
                {[
                  { name: 'Novel.sh', desc: 'Notion 风格 AI 编辑器', stars: '15.5k' },
                  { name: 'LibreChat', desc: '增强版 ChatGPT 克隆', stars: '28.3k' },
                  { name: 'LobeChat', desc: '企业级 AI Agent 平台', stars: '55k+' },
                ].map((project) => (
                  <div key={project.name} className="flex items-center justify-between py-2">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{project.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{project.desc}</div>
                    </div>
                    <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">
                      ⭐ {project.stars}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
      </div>
      <UsageStats open={showStats} onClose={() => setShowStats(false)} />
    </div>
  );
}
