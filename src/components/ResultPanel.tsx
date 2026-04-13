import { useState } from 'react';
import type { ActionType } from '@/types';
import { ACTION_CONFIGS } from '@/types/constants';

interface ResultPanelProps {
  result: string;
  loading: boolean;
  activeAction: ActionType | null;
  onCopy: () => void;
}

/**
 * 结果展示面板组件
 */
export default function ResultPanel({
  result,
  loading,
  activeAction,
  onCopy,
}: ResultPanelProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const actionLabel = activeAction
    ? ACTION_CONFIGS[activeAction].label
    : 'AI';

  return (
    <div className="flex-1 flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-500">
          {loading ? `${actionLabel}处理中...` : `${actionLabel}结果`}
        </span>
        {result && (
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-600 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {copied ? '已复制' : '复制'}
          </button>
        )}
      </div>

      {/* 结果内容 */}
      <div className="flex-1 bg-white border border-gray-200 rounded-lg p-3 min-h-[100px] max-h-[200px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2">
              <svg
                className="w-6 h-6 text-indigo-500 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-xs text-gray-400">AI 正在思考...</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
            {result}
          </p>
        )}
      </div>
    </div>
  );
}
