import { useState, useCallback } from 'react';
import type { AiProcessRequest, UseAiReturn } from '../types';
import { processAiText } from '../services/api';

/**
 * AI 文本处理自定义 Hook
 * 封装了 API 调用、loading 状态管理和错误处理
 */
export function useAi(): UseAiReturn {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const processText = useCallback(async (request: AiProcessRequest) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await processAiText(request);

      if (response.success && response.result) {
        setResult(response.result);
      } else {
        setError(response.error || '处理失败，请稍后重试');
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : '发生未知错误，请稍后重试';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    processText,
    result,
    error,
    loading,
    clearResult,
  };
}
