import { useState, useCallback, useRef } from 'react';
import type { AiProcessRequest, UseAiReturn } from '../types';
import { processAiText, processAiTextStream } from '../services/api';

/**
 * AI 文本处理自定义 Hook (企业级增强版)
 * - 优先使用流式接口，失败时自动回退到非流式
 * - 支持 AbortController 请求取消
 * - 自动超时处理 (60s)
 * - 请求重试机制 (最多2次)
 */
export function useAi(): UseAiReturn {
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  const processText = useCallback(async (request: AiProcessRequest, maxRetries = 1) => {
    // 取消之前的请求
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;
    retryCountRef.current = 0;

    setLoading(true);
    setError(null);
    setResult(null);

    const attempt = async (isRetry = false): Promise<void> => {
      try {
        // 优先尝试流式请求
        const streamResponse = await processAiTextStream(request, controller.signal);

        if (streamResponse.success && streamResponse.stream) {
          const reader = streamResponse.stream.getReader();
          let accumulated = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              accumulated += value;
              setResult(accumulated);
            }
          } catch (streamErr) {
            if (controller.signal.aborted) {
              setError('请求已取消');
              return;
            }
            // 流式读取失败，回退到非流式
            console.warn('流式读取失败，回退到非流式模式:', streamErr);
            const fallbackResponse = await processAiText(request, controller.signal);
            if (fallbackResponse.success && fallbackResponse.result) {
              setResult(fallbackResponse.result);
            } else {
              setError(fallbackResponse.error || '处理失败，请稍后重试');
            }
          }
        } else {
          // 流式请求失败，回退到非流式
          const fallbackResponse = await processAiText(request, controller.signal);
          if (fallbackResponse.success && fallbackResponse.result) {
            setResult(fallbackResponse.result);
          } else {
            setError(streamResponse.error || fallbackResponse.error || '处理失败，请稍后重试');
          }
        }
      } catch (err) {
        if (controller.signal.aborted) {
          setError('请求已取消');
          return;
        }

        // 网络错误自动重试
        if (!isRetry && retryCountRef.current < maxRetries && err instanceof Error && (
          err.message.includes('fetch') ||
          err.message.includes('network') ||
          err.message.includes('timeout') ||
          err.message.includes('Failed to fetch')
        )) {
          retryCountRef.current++;
          console.warn(`请求失败，正在重试 (${retryCountRef.current}/${maxRetries})...`);
          await new Promise(r => setTimeout(r, 1000 * retryCountRef.current));
          return attempt(true);
        }

        const message = err instanceof Error ? err.message : '发生未知错误，请稍后重试';
        setError(message);
      }
    };

    await attempt();

    setLoading(false);
    abortRef.current = null;
  }, []);

  /** 取消当前请求 */
  const cancelRequest = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setLoading(false);
      setError('请求已取消');
    }
  }, []);

  const clearResult = useCallback(() => {
    setResult(null);
    setError(null);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setLoading(false);
  }, []);

  return {
    processText,
    result,
    error,
    loading,
    clearResult,
    cancelRequest,
  };
}
