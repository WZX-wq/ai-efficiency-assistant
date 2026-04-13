import { useState } from 'react';
import type { ExtensionSettings } from '@/types';

interface SettingsPanelProps {
  settings: ExtensionSettings;
  onSave: (settings: ExtensionSettings) => void;
  onClose: () => void;
}

/**
 * 设置面板组件
 */
export default function SettingsPanel({ settings, onSave, onClose }: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<ExtensionSettings>({ ...settings });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700">设置</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* API Key */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          DeepSeek API Key
        </label>
        <input
          type="password"
          value={localSettings.apiKey}
          onChange={(e) =>
            setLocalSettings({ ...localSettings, apiKey: e.target.value })
          }
          placeholder="sk-..."
          className="w-full px-3 py-1.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 placeholder-gray-400"
        />
        <p className="text-[10px] text-gray-400 mt-1">
          从{' '}
          <a
            href="https://platform.deepseek.com/api_keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:underline"
          >
            platform.deepseek.com
          </a>{' '}
          获取 API Key
        </p>
      </div>

      {/* Model */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          模型
        </label>
        <select
          value={localSettings.model}
          onChange={(e) =>
            setLocalSettings({ ...localSettings, model: e.target.value })
          }
          className="w-full px-3 py-1.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        >
          <option value="deepseek-chat">deepseek-chat</option>
          <option value="deepseek-reasoner">deepseek-reasoner</option>
        </select>
      </div>

      {/* Temperature */}
      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">
          Temperature: {localSettings.temperature.toFixed(1)}
        </label>
        <input
          type="range"
          min="0"
          max="1.5"
          step="0.1"
          value={localSettings.temperature}
          onChange={(e) =>
            setLocalSettings({
              ...localSettings,
              temperature: parseFloat(e.target.value),
            })
          }
          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
          <span>精确</span>
          <span>创意</span>
        </div>
      </div>

      {/* 保存按钮 */}
      <button
        onClick={handleSave}
        className="w-full py-1.5 px-3 text-sm font-medium text-white bg-indigo-500 rounded-md hover:bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        {saved ? '已保存' : '保存设置'}
      </button>
    </div>
  );
}
