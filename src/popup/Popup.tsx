import { useState, useEffect, useCallback } from 'react';
import type { ActionType, ExtensionSettings } from '@/types';
import { ACTION_CONFIGS } from '@/types/constants';
import { loadSettings, saveSettings } from '@/utils/storage';
import ActionButton from '@/components/ActionButton';
import SettingsPanel from '@/components/SettingsPanel';
import ResultPanel from '@/components/ResultPanel';

/**
 * Popup 主组件
 */
export default function Popup() {
  const [selectedText, setSelectedText] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<ActionType | null>(null);
  const [settings, setSettings] = useState<ExtensionSettings>({
    apiKey: '',
    apiUrl: 'https://api.edgefn.net/v1/chat/completions',
    model: 'DeepSeek-V3',
    temperature: 0.7,
  });
  const [showSettings, setShowSettings] = useState(false);

  // 加载设置
  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  // 从当前活动标签页获取选中文本
  const fetchSelectedText = useCallback(async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) return;

      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'GET_SELECTED_TEXT',
      });

      if (response?.selectedText) {
        setSelectedText(response.selectedText);
      }
    } catch {
      // Content script 可能未加载，忽略错误
    }
  }, []);

  useEffect(() => {
    fetchSelectedText();
  }, [fetchSelectedText]);

  // 保存设置
  const handleSaveSettings = useCallback(
    async (newSettings: ExtensionSettings) => {
      setSettings(newSettings);
      await saveSettings(newSettings);
    },
    [],
  );

  // 执行 AI 操作
  const handleAction = useCallback(
    async (actionType: ActionType) => {
      if (!selectedText.trim()) {
        setError('请先在网页中选中文字');
        return;
      }

      if (!settings.apiKey) {
        setShowSettings(true);
        setError('请先配置 DeepSeek API Key');
        return;
      }

      setLoading(true);
      setError('');
      setResult('');
      setActiveAction(actionType);

      try {
        const response = await chrome.runtime.sendMessage({
          type: 'AI_ACTION',
          action: actionType,
          selectedText,
        });

        if (response?.error) {
          setError(response.error);
        } else if (response?.result) {
          setResult(response.result);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '操作失败，请重试');
      } finally {
        setLoading(false);
        setActiveAction(null);
      }
    },
    [selectedText, settings.apiKey],
  );

  // 复制结果到剪贴板
  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
    } catch {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = result;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  }, [result]);

  return (
    <div className="bg-gray-50 min-h-[400px] flex flex-col">
      {/* 头部 */}
      <header className="bg-gradient-to-r from-indigo-500 to-purple-600 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          <h1 className="text-white font-semibold text-base">AI 效率助手</h1>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
          title="设置"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </button>
      </header>

      {/* 设置面板 */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* 主内容区 */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* 选中文本区域 */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">
            选中的文字
          </label>
          <textarea
            value={selectedText}
            onChange={(e) => setSelectedText(e.target.value)}
            placeholder="请在网页中选中文字，或在此处手动输入..."
            className="w-full h-24 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-gray-400"
          />
        </div>

        {/* 操作按钮 */}
        <div className="grid grid-cols-4 gap-2">
          {(Object.keys(ACTION_CONFIGS) as ActionType[]).map((actionType) => (
            <ActionButton
              key={actionType}
              action={ACTION_CONFIGS[actionType]}
              onClick={() => handleAction(actionType)}
              disabled={loading || !selectedText.trim()}
              isLoading={loading && activeAction === actionType}
            />
          ))}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-xs px-3 py-2 rounded-lg flex items-start gap-2">
            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* 结果展示 */}
        {(result || loading) && (
          <ResultPanel
            result={result}
            loading={loading}
            activeAction={activeAction}
            onCopy={handleCopy}
          />
        )}
      </div>

      {/* 底部 */}
      <footer className="px-4 py-2 border-t border-gray-100 text-center">
        <p className="text-[10px] text-gray-400">
          Powered by DeepSeek AI
        </p>
      </footer>
    </div>
  );
}
