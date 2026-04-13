import { useState, useEffect } from 'react';
import { saveApiKey, loadApiKey, clearApiKey } from '../services/api';

interface ApiKeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeySettings({ isOpen, onClose }: ApiKeySettingsProps) {
  const [provider, setProvider] = useState<'openai' | 'custom'>('custom');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://api.edgefn.net/v1');
  const [model, setModel] = useState('DeepSeek-V3');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = loadApiKey();
      if (stored) {
        setProvider(stored.provider as 'openai' | 'custom');
        setApiKey(stored.apiKey);
        setBaseUrl(stored.baseUrl || '');
        setModel(stored.model || 'DeepSeek-V3');
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (!apiKey.trim()) return;
    saveApiKey({ provider, apiKey: apiKey.trim(), baseUrl: baseUrl.trim() || undefined, model: model.trim() || undefined });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1000);
  };

  const handleClear = () => {
    clearApiKey();
    setApiKey('');
    setBaseUrl('https://api.edgefn.net/v1');
    setModel('DeepSeek-V3');
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in"
      onClick={handleOverlayClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">API Key 设置</h3>
              <p className="text-sm text-gray-500">配置你的 AI 服务密钥</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="关闭"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {/* Provider Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">服务提供商</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { setProvider('openai'); setBaseUrl(''); setModel('gpt-4o-mini'); }}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  provider === 'openai'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                OpenAI
              </button>
              <button
                onClick={() => { setProvider('custom'); setBaseUrl('https://api.edgefn.net/v1'); setModel('DeepSeek-V3'); }}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  provider === 'custom'
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                自定义服务
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-2">
              API Key
            </label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-gray-400"
            />
            <p className="mt-1.5 text-xs text-gray-400">
              你的密钥将安全保存在本地浏览器中
            </p>
          </div>

          {/* Base URL (Custom only) */}
          {provider === 'custom' && (
            <div>
              <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-2">
                API 地址
              </label>
              <input
                id="baseUrl"
                type="url"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-gray-400"
              />
            </div>
          )}

          {/* Model */}
          <div>
            <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-2">
              模型
            </label>
            <input
              id="model"
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-3.5-turbo"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-gray-400"
            />
            {provider === 'openai' && (
              <div className="mt-2 flex flex-wrap gap-2">
                {['gpt-3.5-turbo', 'gpt-4', 'gpt-4o-mini'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setModel(m)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                      model === m
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-between gap-3">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
          >
            清除配置
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              disabled={!apiKey.trim() || saved}
              className={`px-5 py-2 text-sm font-medium rounded-xl transition-all ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md'
              }`}
            >
              {saved ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  已保存
                </span>
              ) : (
                '保存配置'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
