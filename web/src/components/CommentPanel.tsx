import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from '../i18n';
import { useToast } from './ToastProvider';

// ============================================================
// Types
// ============================================================

interface CommentPanelProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

interface Comment {
  id: string;
  text: string;
  timestamp: number;
}

// ============================================================
// Helpers
// ============================================================

const STORAGE_KEY = 'ai-assistant-comments';

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function loadComments(contentHash: string): Comment[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}_${contentHash}`);
    if (!raw) return [];
    return JSON.parse(raw) as Comment[];
  } catch {
    return [];
  }
}

function saveComments(contentHash: string, comments: Comment[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEY}_${contentHash}`, JSON.stringify(comments));
  } catch {
    // Storage full or unavailable
  }
}

// ============================================================
// Component
// ============================================================

export default function CommentPanel({ isOpen, onClose, content }: CommentPanelProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const contentHash = useMemo(() => simpleHash(content), [content]);

  // Load comments on open
  useEffect(() => {
    if (isOpen) {
      setComments(loadComments(contentHash));
      setNewComment('');
    }
  }, [isOpen, contentHash]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Focus textarea on open
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // ---- Handlers ----
  const handleAddComment = useCallback(() => {
    const text = newComment.trim();
    if (!text) return;

    const comment: Comment = {
      id: `c_${Date.now()}`,
      text,
      timestamp: Date.now(),
    };

    const updated = [...comments, comment];
    saveComments(contentHash, updated);
    setComments(updated);
    setNewComment('');
    toast(t('collab.comment.addSuccess'), 'success');
  }, [newComment, comments, contentHash, t, toast]);

  const handleDeleteComment = useCallback((id: string) => {
    const updated = comments.filter(c => c.id !== id);
    saveComments(contentHash, updated);
    setComments(updated);
    toast(t('collab.comment.deleteSuccess'), 'success');
  }, [comments, contentHash, t, toast]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleAddComment();
    }
  }, [handleAddComment]);

  const formatTime = useCallback((ts: number) => {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="w-full max-w-sm bg-white dark:bg-gray-800 shadow-2xl border-l border-gray-100 dark:border-gray-700 flex flex-col animate-slide-left h-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
            </svg>
            {t('collab.comment.title')}
            {comments.length > 0 && (
              <span className="text-xs font-normal text-white bg-emerald-500 px-2 py-0.5 rounded-full">
                {comments.length}
              </span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Add comment form */}
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <textarea
            ref={textareaRef}
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('collab.comment.placeholder')}
            rows={3}
            className="w-full px-3 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">
              {t('collab.comment.submitHint')}
            </span>
            <button
              onClick={handleAddComment}
              disabled={!newComment.trim()}
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {t('collab.comment.add')}
            </button>
          </div>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto">
          {comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 px-5">
              <svg className="w-12 h-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              <p className="text-sm">{t('collab.comment.noComments')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 dark:divide-gray-750">
              {[...comments].reverse().map((comment) => (
                <div key={comment.id} className="px-5 py-3 group">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-400 mb-1">{formatTime(comment.timestamp)}</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                        {comment.text}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all rounded"
                      title={t('common.delete')}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
