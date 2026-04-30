import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { useToast } from './ToastProvider';
import ShareModal from './ShareModal';
import VersionHistory from './VersionHistory';
import CommentPanel from './CommentPanel';
import { exportAsMarkdown, exportAsText, exportFile } from '../utils/export';

// ============================================================
// Types
// ============================================================

interface CollabToolbarProps {
  title: string;
  content: string;
  onContentChange: (content: string) => void;
}

// ============================================================
// Helpers
// ============================================================

const BOOKMARKS_KEY = 'ai-assistant-bookmarks';

interface Bookmark {
  id: string;
  title: string;
  content: string;
  timestamp: number;
}

function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Bookmark[];
  } catch {
    return [];
  }
}

function saveBookmarks(bookmarks: Bookmark[]): void {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarks));
  } catch {
    // Storage full
  }
}

// ============================================================
// Component
// ============================================================

export default function CollabToolbar({ title, content, onContentChange }: CollabToolbarProps) {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Panel states
  const [shareOpen, setShareOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [commentOpen, setCommentOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const exportRef = useRef<HTMLDivElement>(null);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!exportOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportOpen]);

  // ---- Bookmark ----
  const handleBookmark = useCallback(() => {
    const bookmarks = loadBookmarks();
    const exists = bookmarks.some(b => b.content === content);
    if (exists) {
      toast(t('collab.bookmark.alreadyBookmarked'), 'warning');
      return;
    }
    const bookmark: Bookmark = {
      id: `bm_${Date.now()}`,
      title,
      content,
      timestamp: Date.now(),
    };
    const updated = [bookmark, ...bookmarks].slice(0, 100);
    saveBookmarks(updated);
    toast(t('collab.bookmark.success'), 'success');
  }, [title, content, t, toast]);

  // ---- Quick export ----
  const handleExportTxt = useCallback(() => {
    exportAsText(content, `${title}_${new Date().toISOString().slice(0, 10)}`);
    setExportOpen(false);
    toast(t('collab.share.downloadSuccess'), 'success');
  }, [content, title, t, toast]);

  const handleExportMd = useCallback(() => {
    exportAsMarkdown(`# ${title}\n\n${content}`, `${title}_${new Date().toISOString().slice(0, 10)}`);
    setExportOpen(false);
    toast(t('collab.share.downloadSuccess'), 'success');
  }, [content, title, t, toast]);

  const handleExportHtml = useCallback(() => {
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #10b981; padding-bottom: 8px; }
  </style>
</head>
<body><h1>${title}</h1><div>${content.replace(/\n/g, '<br>')}</div></body>
</html>`;
    exportFile(html, `${title}_${new Date().toISOString().slice(0, 10)}`, '.html', 'text/html;charset=utf-8');
    setExportOpen(false);
    toast(t('collab.share.downloadSuccess'), 'success');
  }, [content, title, t, toast]);

  // ---- Toolbar buttons ----
  const buttons = [
    {
      key: 'share',
      label: t('collab.toolbar.share'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
      ),
      onClick: () => setShareOpen(true),
    },
    {
      key: 'history',
      label: t('collab.toolbar.history'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      onClick: () => setHistoryOpen(true),
    },
    {
      key: 'comment',
      label: t('collab.toolbar.comments'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
      ),
      onClick: () => setCommentOpen(true),
    },
    {
      key: 'export',
      label: t('collab.toolbar.export'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      ),
      onClick: () => setExportOpen(prev => !prev),
      hasDropdown: true,
    },
    {
      key: 'bookmark',
      label: t('collab.toolbar.bookmark'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
      ),
      onClick: handleBookmark,
    },
  ];

  return (
    <>
      {/* Floating toolbar */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-1 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-1.5">
        {buttons.map((btn) => (
          <button
            key={btn.key}
            onClick={btn.onClick}
            className="relative p-2.5 text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors group"
            title={btn.label}
          >
            {btn.icon}
            {/* Tooltip */}
            <span className="absolute bottom-full right-0 mb-2 px-2.5 py-1 text-xs font-medium text-white bg-gray-800 dark:bg-gray-200 dark:text-gray-800 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap shadow-lg">
              {btn.label}
            </span>
          </button>
        ))}
      </div>

      {/* Export dropdown */}
      {exportOpen && (
        <div
          ref={exportRef}
          className="fixed bottom-20 right-6 z-40 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 animate-fade-in"
        >
          <button
            onClick={handleExportMd}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <span className="text-base">📋</span> Markdown (.md)
          </button>
          <button
            onClick={handleExportTxt}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <span className="text-base">📄</span> Text (.txt)
          </button>
          <button
            onClick={handleExportHtml}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
          >
            <span className="text-base">🌐</span> HTML (.html)
          </button>
        </div>
      )}

      {/* Modals / Panels */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        title={title}
        content={content}
        type="text"
      />
      <VersionHistory
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        currentContent={content}
        onRestore={onContentChange}
      />
      <CommentPanel
        isOpen={commentOpen}
        onClose={() => setCommentOpen(false)}
        content={content}
      />
    </>
  );
}
