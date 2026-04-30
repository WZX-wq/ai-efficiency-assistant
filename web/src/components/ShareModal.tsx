import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from '../i18n';
import { useToast } from './ToastProvider';
import { exportAsMarkdown, exportAsText, exportFile } from '../utils/export';

// ============================================================
// Types
// ============================================================

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
  type: 'text' | 'markdown' | 'html';
}

// ============================================================
// Helpers
// ============================================================

function encodeContent(content: string): string {
  try {
    return btoa(unescape(encodeURIComponent(content)));
  } catch {
    return '';
  }
}

function generateShareUrl(content: string, title: string): string {
  const encoded = encodeContent(content);
  const hash = `#share=${encodeURIComponent(title)}&data=${encoded}`;
  return `${window.location.origin}${window.location.pathname}${hash}`;
}

function countWords(text: string): number {
  if (!text) return 0;
  const chinese = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const english = text.replace(/[\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
  return chinese + english;
}

// ============================================================
// Component
// ============================================================

export default function ShareModal({ isOpen, onClose, title, content, type }: ShareModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'link' | 'export' | 'social'>('link');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedMd, setCopiedMd] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  const shareUrl = useMemo(() => generateShareUrl(content, title), [content, title]);
  const wordCount = useMemo(() => countWords(content), [content]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      onClose();
    }
  }, [onClose]);

  // ---- Copy helpers ----
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      toast(t('collab.share.linkCopied'), 'success');
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast(t('collab.share.copyFailed'), 'error');
    }
  }, [shareUrl, t, toast]);

  const handleCopyPlainText = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedText(true);
      toast(t('common.copied'), 'success');
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast(t('collab.share.copyFailed'), 'error');
    }
  }, [content, t, toast]);

  const handleCopyMarkdown = useCallback(async () => {
    const md = type === 'markdown' ? content : `# ${title}\n\n${content}`;
    try {
      await navigator.clipboard.writeText(md);
      setCopiedMd(true);
      toast(t('common.copied'), 'success');
      setTimeout(() => setCopiedMd(false), 2000);
    } catch {
      toast(t('collab.share.copyFailed'), 'error');
    }
  }, [content, title, type, t, toast]);

  // ---- Download helpers ----
  const handleDownloadTxt = useCallback(() => {
    exportAsText(content, `${title}_${new Date().toISOString().slice(0, 10)}`);
    toast(t('collab.share.downloadSuccess'), 'success');
  }, [content, title, t, toast]);

  const handleDownloadMd = useCallback(() => {
    const md = type === 'markdown' ? content : `# ${title}\n\n${content}`;
    exportAsMarkdown(md, `${title}_${new Date().toISOString().slice(0, 10)}`);
    toast(t('collab.share.downloadSuccess'), 'success');
  }, [content, title, type, t, toast]);

  const handleDownloadHtml = useCallback(() => {
    const htmlContent = type === 'html' ? content : `<h1>${title}</h1>\n<div>${content.replace(/\n/g, '<br>')}</div>`;
    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #333; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #10b981; padding-bottom: 8px; }
    h2 { color: #065f46; margin-top: 2em; }
    blockquote { border-left: 4px solid #10b981; padding-left: 1em; color: #666; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; }
    pre { background: #1f2937; color: #e5e7eb; padding: 1em; border-radius: 8px; overflow-x: auto; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`;
    exportFile(html, `${title}_${new Date().toISOString().slice(0, 10)}`, '.html', 'text/html;charset=utf-8');
    toast(t('collab.share.downloadSuccess'), 'success');
  }, [content, title, type, t, toast]);

  // ---- Social share ----
  const weiboUrl = useMemo(() => {
    const text = encodeURIComponent(`${title} - AI效率助手`);
    const url = encodeURIComponent(shareUrl);
    return `https://service.weibo.com/share/share.php?title=${text}&url=${url}`;
  }, [title, shareUrl]);

  const twitterUrl = useMemo(() => {
    const text = encodeURIComponent(`${title}`);
    const url = encodeURIComponent(shareUrl);
    return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
  }, [title, shareUrl]);

  const emailUrl = useMemo(() => {
    const subject = encodeURIComponent(title);
    const body = encodeURIComponent(`${content}\n\n---\n${shareUrl}`);
    return `mailto:?subject=${subject}&body=${body}`;
  }, [title, content, shareUrl]);

  if (!isOpen) return null;

  // ---- Tabs ----
  const tabs = [
    { key: 'link' as const, label: t('collab.share.shareLink') },
    { key: 'export' as const, label: t('collab.share.exportOptions') },
    { key: 'social' as const, label: t('collab.share.socialShare') },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 w-full max-w-lg mx-4 max-h-[85vh] flex flex-col animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <h2 id="share-modal-title" className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            {t('collab.share.title')}
          </h2>
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

        {/* Tabs */}
        <div className="flex border-b border-gray-100 dark:border-gray-700 px-6 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Tab: Share Link */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('collab.share.shareLink')}
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 truncate font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors shrink-0 ${
                      copiedLink
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {copiedLink ? t('common.copied') : t('collab.share.copyLink')}
                  </button>
                </div>
              </div>

              {/* QR Code placeholder (CSS-based) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('collab.share.qrCode')}
                </label>
                <div className="w-40 h-40 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 flex items-center justify-center">
                  <div className="grid grid-cols-8 gap-px w-full h-full">
                    {Array.from({ length: 64 }, (_, i) => {
                      const row = Math.floor(i / 8);
                      const col = i % 8;
                      const isCorner = (row < 3 && col < 3) || (row < 3 && col > 4) || (row > 4 && col < 3);
                      const isData = (row + col + Math.floor(shareUrl.charCodeAt(i % shareUrl.length) % 3)) % 3 === 0;
                      const isFilled = isCorner || isData;
                      return (
                        <div
                          key={i}
                          className={`rounded-sm ${isFilled ? 'bg-gray-800 dark:bg-gray-200' : 'bg-gray-100 dark:bg-gray-600'}`}
                        />
                      );
                    })}
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-400">{t('collab.share.qrHint')}</p>
              </div>
            </div>
          )}

          {/* Tab: Export Options */}
          {activeTab === 'export' && (
            <div className="space-y-3">
              {/* Copy buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleCopyPlainText}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    copiedText
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                  </svg>
                  {copiedText ? t('common.copied') : t('collab.share.copyAsText')}
                </button>
                <button
                  onClick={handleCopyMarkdown}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    copiedMd
                      ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                      : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                  </svg>
                  {copiedMd ? t('common.copied') : t('collab.share.copyAsMd')}
                </button>
              </div>

              {/* Download buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleDownloadTxt}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <span className="text-lg">📄</span>
                  <span className="text-xs font-medium">.txt</span>
                </button>
                <button
                  onClick={handleDownloadMd}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <span className="text-lg">📋</span>
                  <span className="text-xs font-medium">.md</span>
                </button>
                <button
                  onClick={handleDownloadHtml}
                  className="flex flex-col items-center gap-1.5 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <span className="text-lg">🌐</span>
                  <span className="text-xs font-medium">.html</span>
                </button>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('collab.share.preview')}
                </label>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 max-h-40 overflow-y-auto">
                  <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-words line-clamp-6">
                    {content.slice(0, 500)}
                    {content.length > 500 ? '...' : ''}
                  </p>
                  <p className="mt-2 text-xs text-gray-400 text-right">
                    {wordCount} {t('collab.share.words')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Social Share */}
          {activeTab === 'social' && (
            <div className="space-y-3">
              <a
                href={weiboUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-red-300 dark:hover:border-red-700 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-red-500 flex items-center justify-center text-white text-sm font-bold shrink-0">
                  微
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">微博</p>
                  <p className="text-xs text-gray-400 truncate">{t('collab.share.weiboHint')}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>

              <a
                href={twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-900 dark:bg-white flex items-center justify-center text-white dark:text-gray-900 text-sm font-bold shrink-0">
                  X
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Twitter / X</p>
                  <p className="text-xs text-gray-400 truncate">{t('collab.share.twitterHint')}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>

              <a
                href={emailUrl}
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('collab.share.email')}</p>
                  <p className="text-xs text-gray-400 truncate">{t('collab.share.emailHint')}</p>
                </div>
                <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
