import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { useToast } from './ToastProvider';

// ============================================================
// Types
// ============================================================

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  currentContent: string;
  onRestore: (content: string) => void;
}

interface Version {
  id: string;
  content: string;
  timestamp: number;
  wordCount: number;
  preview: string;
}

// ============================================================
// Helpers
// ============================================================

const STORAGE_KEY = 'ai-assistant-version-history';
const MAX_VERSIONS = 50;

function countWords(text: string): number {
  if (!text) return 0;
  const chinese = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const english = text.replace(/[\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
  return chinese + english;
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function loadVersions(contentHash: string): Version[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${contentHash}`);
    if (!raw) return [];
    return JSON.parse(raw) as Version[];
  } catch {
    return [];
  }
}

function saveVersions(contentHash: string, versions: Version[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${contentHash}`, JSON.stringify(versions));
  } catch {
    // Storage full or unavailable
  }
}

// ============================================================
// Simple diff
// ============================================================

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

function computeDiff(oldText: string, newText: string): DiffLine[] {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const result: DiffLine[] = [];

  // Simple LCS-based diff
  const m = oldLines.length;
  const n = newLines.length;

  // Build LCS table
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to get diff
  let i = m;
  let j = n;
  const temp: DiffLine[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      temp.unshift({ type: 'unchanged', text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      temp.unshift({ type: 'added', text: newLines[j - 1] });
      j--;
    } else {
      temp.unshift({ type: 'removed', text: oldLines[i - 1] });
      i--;
    }
  }

  // Collapse consecutive unchanged lines for readability
  let unchangedCount = 0;
  for (const line of temp) {
    if (line.type === 'unchanged') {
      unchangedCount++;
      if (unchangedCount <= 3 || unchangedCount === temp.length) {
        result.push(line);
      } else if (unchangedCount === 4) {
        result.push({ type: 'unchanged', text: '...' });
      }
    } else {
      unchangedCount = 0;
      result.push(line);
    }
  }

  return result;
}

// ============================================================
// Component
// ============================================================

export default function VersionHistory({ isOpen, onClose, currentContent, onRestore }: VersionHistoryProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [diffVersionId, setDiffVersionId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const contentHash = useMemo(() => simpleHash(currentContent), [currentContent]);

  // Load versions on open
  useEffect(() => {
    if (isOpen) {
      setVersions(loadVersions(contentHash));
      setDiffVersionId(null);
      setShowClearConfirm(false);
    }
  }, [isOpen, contentHash]);

  // Auto-save current version (debounced)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!currentContent.trim()) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const existing = loadVersions(contentHash);
      const lastVersion = existing[existing.length - 1];
      // Only save if content changed from last version
      if (lastVersion && lastVersion.content === currentContent) return;

      const newVersion: Version = {
        id: `v_${Date.now()}`,
        content: currentContent,
        timestamp: Date.now(),
        wordCount: countWords(currentContent),
        preview: currentContent.slice(0, 100),
      };

      const updated = [...existing, newVersion].slice(-MAX_VERSIONS);
      saveVersions(contentHash, updated);
      setVersions(updated);
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [currentContent, contentHash]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // ---- Handlers ----
  const handleRestore = useCallback((version: Version) => {
    onRestore(version.content);
    toast(t('collab.version.restoreSuccess'), 'success');
  }, [onRestore, t, toast]);

  const handleClearHistory = useCallback(() => {
    saveVersions(contentHash, []);
    setVersions([]);
    setShowClearConfirm(false);
    toast(t('collab.version.clearSuccess'), 'success');
  }, [contentHash, t, toast]);

  const formatTime = useCallback((ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }, []);

  // ---- Diff view ----
  const diffVersion = useMemo(
    () => versions.find(v => v.id === diffVersionId),
    [versions, diffVersionId]
  );

  const diffLines = useMemo(() => {
    if (!diffVersion) return [];
    return computeDiff(diffVersion.content, currentContent);
  }, [diffVersion, currentContent]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
      }}
      role="presentation"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="version-history-title"
        className="w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-100 dark:border-gray-700 flex flex-col animate-slide-left h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 id="version-history-title" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('collab.version.title')}
            <span className="text-xs font-normal text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
              {versions.length}
            </span>
          </h2>
          <div className="flex items-center gap-2">
            {versions.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                {t('collab.version.clearAll')}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label={t('common.close')}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Clear confirmation */}
        {showClearConfirm && (
          <div className="px-5 py-3 bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 shrink-0">
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{t('collab.version.clearConfirm')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleClearHistory}
                className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
              >
                {t('common.confirm')}
              </button>
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        )}

        {/* Version list */}
        <div className="flex-1 overflow-y-auto">
          {versions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 px-5">
              <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm">{t('collab.version.noVersions')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-750">
              {[...versions].reverse().map((version) => (
                <div
                  key={version.id}
                  className="px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {formatTime(version.timestamp)}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5 truncate">
                        {version.preview || t('collab.version.emptyContent')}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0">
                      {version.wordCount} {t('collab.share.words')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => handleRestore(version)}
                      className="px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                    >
                      {t('collab.version.restore')}
                    </button>
                    <button
                      onClick={() => setDiffVersionId(diffVersionId === version.id ? null : version.id)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors ${
                        diffVersionId === version.id
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                          : 'text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                      }`}
                    >
                      {t('collab.version.diff')}
                    </button>
                  </div>

                  {/* Diff view */}
                  {diffVersionId === version.id && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-600 max-h-60 overflow-y-auto">
                      <div className="text-xs font-mono space-y-0.5">
                        {diffLines.map((line, idx) => (
                          <div
                            key={idx}
                            className={`px-2 py-0.5 rounded ${
                              line.type === 'added'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : line.type === 'removed'
                                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 line-through'
                                : 'text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            <span className="inline-block w-4 mr-2 text-center opacity-50">
                              {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
                            </span>
                            {line.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
