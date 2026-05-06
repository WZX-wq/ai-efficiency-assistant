import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import {
  useFileStore,
  type FileItem,
  type FileType,
  type SortBy,
} from '../store/useFileStore';

// ============================================================
// Helpers
// ============================================================

function formatFileSize(bytes: number, t: (key: string) => string): string {
  if (bytes < 1024) return `${bytes} ${t('fileManager.fileSize.B')}`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('fileManager.fileSize.KB')}`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} ${t('fileManager.fileSize.MB')}`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} ${t('fileManager.fileSize.GB')}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

// ============================================================
// File Type Icon SVG
// ============================================================

const FILE_TYPE_COLORS: Record<FileType, string> = {
  document: '#3b82f6',
  image: '#22c55e',
  video: '#ef4444',
  audio: '#a855f7',
  spreadsheet: '#10b981',
  presentation: '#f97316',
  archive: '#eab308',
  code: '#64748b',
  other: '#9ca3af',
};

function FileTypeIcon({ type, size = 24 }: { type: FileType; size?: number }) {
  const color = FILE_TYPE_COLORS[type] || '#9ca3af';
  switch (type) {
    case 'document':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="14 2 14 8 20 8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="16" y1="13" x2="8" y2="13" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          <line x1="16" y1="17" x2="8" y2="17" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          <polyline points="10 9 9 9 8 9" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        </svg>
      );
    case 'image':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth="2"/>
          <circle cx="8.5" cy="8.5" r="1.5" fill={color}/>
          <polyline points="21 15 16 10 5 21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'video':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <polygon points="23 7 16 12 23 17 23 7" fill={color}/>
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" stroke={color} strokeWidth="2"/>
        </svg>
      );
    case 'audio':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M9 18V5l12-2v13" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="6" cy="18" r="3" stroke={color} strokeWidth="2"/>
          <circle cx="18" cy="16" r="3" stroke={color} strokeWidth="2"/>
        </svg>
      );
    case 'spreadsheet':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke={color} strokeWidth="2"/>
          <line x1="3" y1="9" x2="21" y2="9" stroke={color} strokeWidth="2"/>
          <line x1="3" y1="15" x2="21" y2="15" stroke={color} strokeWidth="2"/>
          <line x1="9" y1="3" x2="9" y2="21" stroke={color} strokeWidth="2"/>
          <line x1="15" y1="3" x2="15" y2="21" stroke={color} strokeWidth="2"/>
        </svg>
      );
    case 'presentation':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" stroke={color} strokeWidth="2"/>
          <line x1="8" y1="21" x2="16" y2="21" stroke={color} strokeWidth="2" strokeLinecap="round"/>
          <line x1="12" y1="17" x2="12" y2="21" stroke={color} strokeWidth="2"/>
        </svg>
      );
    case 'archive':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M21 8v13H3V8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M1 3h22v5H1z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M10 12h4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    case 'code':
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <polyline points="16 18 22 12 16 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="8 6 2 12 8 18" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
    default:
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="13 2 13 9 20 9" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      );
  }
}

// ============================================================
// Sidebar Component
// ============================================================

type SidebarView = 'all' | 'starred' | 'recent';

function Sidebar({
  sidebarView,
  setSidebarView,
}: {
  sidebarView: SidebarView;
  setSidebarView: (v: SidebarView) => void;
}) {
  const { t } = useTranslation();
  const {
    folders,
    currentFolderId,
    setCurrentFolderId,
    getFolderFileCount,
    getStorageUsage,
    createFolder,
  } = useFileStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null);
  const newFolderRef = useRef<HTMLInputElement>(null);

  const storage = getStorageUsage();
  const rootFolders = folders.filter((f) => f.parentId === null);

  const toggleExpand = (id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    createFolder(newFolderName.trim(), newFolderParent);
    setNewFolderName('');
    setShowNewFolder(false);
  };

  useEffect(() => {
    if (showNewFolder && newFolderRef.current) {
      newFolderRef.current.focus();
    }
  }, [showNewFolder]);

  const sidebarItems: { key: SidebarView; label: string; icon: JSX.Element }[] = [
    {
      key: 'all',
      label: t('fileManager.allFiles'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      key: 'starred',
      label: t('fileManager.starred'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
    },
    {
      key: 'recent',
      label: t('fileManager.recent'),
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const renderFolderTree = (parentId: string | null, depth: number = 0) => {
    const childFolders = folders.filter((f) => f.parentId === parentId);
    return childFolders.map((folder) => {
      const count = getFolderFileCount(folder.id);
      const isExpanded = expandedFolders.has(folder.id);
      const isActive = currentFolderId === folder.id && sidebarView === 'all';
      return (
        <div key={folder.id}>
          <button
            onClick={() => {
              setSidebarView('all');
              setCurrentFolderId(folder.id);
            }}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              isActive
                ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium'
                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
            }`}
            style={{ paddingLeft: `${12 + depth * 16}px` }}
          >
            <span
              className="cursor-pointer shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
            >
              <svg
                className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </span>
            <span
              className="w-3 h-3 rounded-sm shrink-0"
              style={{ backgroundColor: folder.color }}
            />
            <span className="truncate flex-1 text-left">{folder.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{count}</span>
          </button>
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="overflow-hidden"
              >
                {renderFolderTree(folder.id, depth + 1)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    });
  };

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col h-full">
      {/* Quick Access */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-700">
        <div className="space-y-0.5">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setSidebarView(item.key)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm rounded-lg transition-colors ${
                sidebarView === item.key
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white font-medium shadow-sm'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {t('fileManager.allFiles')}
          </span>
          <button
            onClick={() => {
              setNewFolderParent(null);
              setShowNewFolder(true);
            }}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            title={t('fileManager.newFolder')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {showNewFolder && newFolderParent === null && (
          <div className="flex items-center gap-1 mb-2 px-1">
            <input
              ref={newFolderRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
                if (e.key === 'Escape') setShowNewFolder(false);
              }}
              onBlur={() => {
                if (!newFolderName.trim()) setShowNewFolder(false);
              }}
              placeholder={t('fileManager.folderName')}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <button
              onClick={handleCreateFolder}
              className="p-1 text-emerald-600 hover:text-emerald-700"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        )}

        <div className="space-y-0.5">
          {rootFolders.map((folder) => {
            const count = getFolderFileCount(folder.id);
            const isActive = currentFolderId === folder.id && sidebarView === 'all';
            return (
              <button
                key={folder.id}
                onClick={() => {
                  setSidebarView('all');
                  setCurrentFolderId(folder.id);
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-medium'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: folder.color }}
                />
                <span className="truncate flex-1 text-left">{folder.name}</span>
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Storage Usage */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
          <span>{t('fileManager.storageUsed')}</span>
          <span>{formatFileSize(storage.used, t)} {t('fileManager.of')} {formatFileSize(storage.limit, t)}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(storage.percentage, 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
          {storage.percentage}%
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// Context Menu
// ============================================================

interface ContextMenuState {
  x: number;
  y: number;
  file: FileItem | null;
}

function ContextMenu({
  state,
  onClose,
}: {
  state: ContextMenuState;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { renameFile, deleteFile, toggleStar, moveFile } = useFileStore();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const file = state.file;
  if (!file) return null;

  const handleRename = () => {
    if (newName.trim()) {
      renameFile(file.id, newName.trim());
    }
    setRenaming(false);
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(t('fileManager.confirmDelete'))) {
      deleteFile(file.id);
    }
    onClose();
  };

  const handleMove = (folderId: string | null) => {
    moveFile(file.id, folderId);
    setShowMoveMenu(false);
    onClose();
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const folders = useFileStore((s) => s.folders);

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-1 min-w-[180px]"
      style={{ left: state.x, top: state.y }}
    >
      {renaming ? (
        <div className="px-3 py-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') { setRenaming(false); onClose(); }
            }}
            className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      ) : showMoveMenu ? (
        <div>
          <button
            onClick={() => handleMove(null)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {t('fileManager.noFolder')}
          </button>
          {folders.map((f) => (
            <button
              key={f.id}
              onClick={() => handleMove(f.id)}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
            >
              <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: f.color }} />
              {f.name}
            </button>
          ))}
        </div>
      ) : (
        <>
          <button
            onClick={() => { onClose(); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
            {t('fileManager.open')}
          </button>
          <button
            onClick={() => { setNewName(file.name); setRenaming(true); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            {t('fileManager.rename')}
          </button>
          <button
            onClick={() => setShowMoveMenu(true)}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
            {t('fileManager.moveTo')}
          </button>
          <button
            onClick={() => { toggleStar(file.id); onClose(); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill={file.starred ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
            {file.starred ? t('fileManager.deselectAll') : t('fileManager.star')}
          </button>
          <button
            onClick={() => { onClose(); }}
            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            {t('fileManager.download')}
          </button>
          <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
          <button
            onClick={handleDelete}
            className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            {t('fileManager.delete')}
          </button>
        </>
      )}
    </div>
  );
}

// ============================================================
// Detail Panel
// ============================================================

function DetailPanel({ file, onClose }: { file: FileItem; onClose: () => void }) {
  const { t } = useTranslation();
  const { toggleStar, addTag, removeTag } = useFileStore();
  const [newTag, setNewTag] = useState('');

  const handleAddTag = () => {
    if (newTag.trim()) {
      addTag(file.id, newTag.trim());
      setNewTag('');
    }
  };

  return (
    <motion.div
      initial={{ x: 320 }}
      animate={{ x: 0 }}
      exit={{ x: 320 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-80 shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{t('fileManager.details')}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* File Icon & Name */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3"
            style={{ backgroundColor: `${FILE_TYPE_COLORS[file.type]}15` }}
          >
            <FileTypeIcon type={file.type} size={32} />
          </div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-white text-center break-all">{file.name}</h4>
          <button
            onClick={() => toggleStar(file.id)}
            className="mt-1"
          >
            <svg
              className={`w-5 h-5 ${file.starred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
              fill={file.starred ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
        </div>

        {/* File Info */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('fileManager.fileType.' + file.type)}</span>
            <span className="text-gray-900 dark:text-white">{formatFileSize(file.size, t)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('fileManager.createdAt')}</span>
            <span className="text-gray-900 dark:text-white">{formatDate(file.createdAt)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500 dark:text-gray-400">{t('fileManager.updatedAt')}</span>
            <span className="text-gray-900 dark:text-white">{formatDate(file.updatedAt)}</span>
          </div>
          {file.shared && file.sharedWith && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">{t('fileManager.tag')}</span>
              <span className="text-gray-900 dark:text-white">{file.sharedWith.join(', ')}</span>
            </div>
          )}
        </div>

        {/* Preview */}
        {file.content && (
          <div className="mb-6">
            <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {t('fileManager.preview')}
            </h5>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-xs text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto whitespace-pre-wrap font-mono">
              {file.content}
            </div>
          </div>
        )}

        {/* Tags */}
        <div>
          <h5 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
            {t('fileManager.tags')}
          </h5>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {file.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full"
              >
                {tag}
                <button
                  onClick={() => removeTag(file.id, tag)}
                  className="hover:text-red-500 transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-1">
            <input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTag();
              }}
              placeholder={t('fileManager.newTag')}
              className="flex-1 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              onClick={handleAddTag}
              className="px-2 py-1 text-xs bg-emerald-500 text-white rounded-md hover:bg-emerald-600 transition-colors"
            >
              {t('fileManager.addTag')}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Grid View Card
// ============================================================

function FileGridCard({
  file,
  isSelected,
  onSelect,
  onContextMenu,
  onOpenDetail,
}: {
  file: FileItem;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onOpenDetail: () => void;
}) {
  const { t } = useTranslation();
  const toggleStar = useFileStore((s) => s.toggleStar);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          onSelect();
        }
      }}
      onContextMenu={onContextMenu}
      onDoubleClick={onOpenDetail}
      className={`relative group rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-sm'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
    >
      {/* Selection checkbox */}
      <div
        className={`absolute top-2 left-2 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-emerald-500 border-emerald-500'
            : 'border-gray-300 dark:border-gray-600 opacity-0 group-hover:opacity-100'
        }`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {isSelected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* Star toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleStar(file.id);
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <svg
          className={`w-4 h-4 ${file.starred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
          fill={file.starred ? 'currentColor' : 'none'}
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      </button>

      {/* Icon */}
      <div className="flex justify-center mb-3 mt-2">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${FILE_TYPE_COLORS[file.type]}12` }}
        >
          <FileTypeIcon type={file.type} size={28} />
        </div>
      </div>

      {/* Name */}
      <h4 className="text-sm font-medium text-gray-900 dark:text-white text-center truncate mb-1" title={file.name}>
        {file.name}
      </h4>

      {/* Size & Date */}
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
        {formatFileSize(file.size, t)} &middot; {formatDate(file.updatedAt)}
      </p>

      {/* Tags */}
      {file.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2 justify-center">
          {file.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded-full"
            >
              {tag}
            </span>
          ))}
          {file.tags.length > 2 && (
            <span className="px-1.5 py-0.5 text-gray-400 text-[10px]">
              +{file.tags.length - 2}
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ============================================================
// List View Row
// ============================================================

function FileListRow({
  file,
  isSelected,
  onSelect,
  onContextMenu,
  onOpenDetail,
}: {
  file: FileItem;
  isSelected: boolean;
  onSelect: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onOpenDetail: () => void;
}) {
  const { t } = useTranslation();
  const toggleStar = useFileStore((s) => s.toggleStar);

  return (
    <motion.tr
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={(e) => {
        if (e.shiftKey || e.ctrlKey || e.metaKey) {
          onSelect();
        }
      }}
      onContextMenu={onContextMenu}
      onDoubleClick={onOpenDetail}
      className={`border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors ${
        isSelected
          ? 'bg-emerald-50 dark:bg-emerald-900/10'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'
      }`}
    >
      <td className="px-4 py-2.5 w-10">
        <div
          className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
            isSelected
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
        >
          {isSelected && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-3">
          <FileTypeIcon type={file.type} size={20} />
          <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
            {file.name}
          </span>
        </div>
      </td>
      <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
        {formatFileSize(file.size, t)}
      </td>
      <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
        {t('fileManager.fileType.' + file.type)}
      </td>
      <td className="px-4 py-2.5 text-sm text-gray-500 dark:text-gray-400">
        {formatDate(file.updatedAt)}
      </td>
      <td className="px-4 py-2.5">
        <div className="flex flex-wrap gap-1">
          {file.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-[10px] rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      </td>
      <td className="px-4 py-2.5 w-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleStar(file.id);
          }}
        >
          <svg
            className={`w-4 h-4 ${file.starred ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
            fill={file.starred ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
      </td>
    </motion.tr>
  );
}

// ============================================================
// Empty States
// ============================================================

function EmptyState({ type }: { type: 'noFiles' | 'noResults' | 'noStarred' }) {
  const { t } = useTranslation();
  const messages = {
    noFiles: { title: t('fileManager.noFiles'), desc: '' },
    noResults: { title: t('fileManager.noResults'), desc: '' },
    noStarred: { title: t('fileManager.noStarred'), desc: '' },
  };
  const msg = messages[type];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500"
    >
      <svg className="w-16 h-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <p className="text-lg font-medium">{msg.title}</p>
      {msg.desc && <p className="text-sm mt-1">{msg.desc}</p>}
    </motion.div>
  );
}

// ============================================================
// Main FileManager Component
// ============================================================

export default function FileManager() {
  const { t } = useTranslation();
  const {
    currentFolderId,
    viewMode,
    sortBy,
    sortOrder,
    searchQuery,
    selectedFiles,
    setViewMode,
    setSortBy,
    setSortOrder,
    setSearchQuery,
    setCurrentFolderId,
    toggleSelectFile,
    clearSelection,
    selectAll,
    getFilesByFolder,
    getStarredFiles,
    getRecentFiles,
    getBreadcrumbPath,
    uploadFile,
    deleteFile,
    moveFile,
    addTag,
  } = useFileStore();

  const [sidebarView, setSidebarView] = useState<SidebarView>('all');
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [detailFile, setDetailFile] = useState<FileItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState('');
  const [showBatchTag, setShowBatchTag] = useState(false);
  const [showBatchMove, setShowBatchMove] = useState(false);
  const sortRef = useRef<HTMLDivElement>(null);

  const folders = useFileStore((s) => s.folders);

  // Get displayed files based on sidebar view
  const displayFiles = useMemo(() => {
    if (sidebarView === 'starred') return getStarredFiles();
    if (sidebarView === 'recent') return getRecentFiles();
    return getFilesByFolder(currentFolderId);
  }, [sidebarView, currentFolderId, getFilesByFolder, getStarredFiles, getRecentFiles]);

  const breadcrumb = useMemo(() => {
    if (sidebarView !== 'all') return [];
    return getBreadcrumbPath(currentFolderId);
  }, [sidebarView, currentFolderId, getBreadcrumbPath]);

  // Close sort dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close context menu on click
  useEffect(() => {
    const handler = () => setContextMenu(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Simulated upload
  const handleSimulatedUpload = useCallback(
    (name: string) => {
      const ext = name.split('.').pop()?.toLowerCase() || '';
      let type: FileType = 'other';
      if (['doc', 'docx', 'md', 'txt', 'pdf'].includes(ext)) type = 'document';
      else if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) type = 'image';
      else if (['mp4', 'mov', 'avi', 'mkv'].includes(ext)) type = 'video';
      else if (['mp3', 'wav', 'flac', 'aac'].includes(ext)) type = 'audio';
      else if (['xls', 'xlsx', 'csv'].includes(ext)) type = 'spreadsheet';
      else if (['ppt', 'pptx'].includes(ext)) type = 'presentation';
      else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) type = 'archive';
      else if (['ts', 'tsx', 'js', 'jsx', 'py', 'java', 'go', 'rs', 'c', 'cpp', 'h', 'css', 'html', 'sql', 'prisma', 'dockerfile'].includes(ext)) type = 'code';

      const sizes = [1024, 5120, 10240, 102400, 524288, 1048576];
      uploadFile({
        name,
        type,
        size: sizes[Math.floor(Math.random() * sizes.length)],
        tags: [],
      });
    },
    [uploadFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      // Simulate upload from dropped files
      const droppedFiles = Array.from(e.dataTransfer.files);
      droppedFiles.forEach((f) => handleSimulatedUpload(f.name));
    },
    [handleSimulatedUpload]
  );

  const handleBatchDelete = () => {
    if (window.confirm(t('fileManager.confirmDelete'))) {
      selectedFiles.forEach((id) => deleteFile(id));
      clearSelection();
    }
  };

  const handleBatchMove = (folderId: string | null) => {
    selectedFiles.forEach((id) => moveFile(id, folderId));
    clearSelection();
    setShowBatchMove(false);
  };

  const handleBatchTag = () => {
    if (batchTagInput.trim()) {
      selectedFiles.forEach((id) => addTag(id, batchTagInput.trim()));
      setBatchTagInput('');
      setShowBatchTag(false);
    }
  };

  const hasSelection = selectedFiles.length > 0;

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 dark:bg-gray-950">
      {/* Page Header */}
      <section className="relative overflow-hidden pt-28 pb-4 sm:pt-32 sm:pb-6">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-emerald-100/60 via-green-50/40 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
            <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">
              {t('fileManager.title')}
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
            {t('fileManager.allFiles')}
          </p>
        </div>
      </section>

      {/* Main Layout */}
      <section className="flex-1 flex min-h-0 pb-20 sm:pb-28">
        <div className="max-w-full mx-auto w-full flex flex-1 min-h-0">
          {/* Sidebar */}
          <Sidebar sidebarView={sidebarView} setSidebarView={setSidebarView} />

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Toolbar */}
            <div className="px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-sm mb-3">
                <button
                  onClick={() => {
                    setSidebarView('all');
                    setCurrentFolderId(null);
                  }}
                  className={`hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors ${
                    sidebarView === 'all' && currentFolderId === null
                      ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {t('fileManager.allFiles')}
                </button>
                {breadcrumb.map((folder) => (
                  <span key={folder.id} className="flex items-center gap-1">
                    <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    <button
                      onClick={() => setCurrentFolderId(folder.id)}
                      className="hover:text-emerald-600 dark:hover:text-emerald-400 text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      {folder.name}
                    </button>
                  </span>
                ))}
                {sidebarView === 'starred' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                    {t('fileManager.starred')}
                  </span>
                )}
                {sidebarView === 'recent' && (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium ml-1">
                    {t('fileManager.recent')}
                  </span>
                )}
              </div>

              {/* Actions Row */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('fileManager.searchPlaceholder')}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title={t('fileManager.gridView')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="3" y="3" width="7" height="7" rx="1" />
                      <rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" />
                      <rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-gray-600 text-emerald-600 dark:text-emerald-400 shadow-sm'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                    title={t('fileManager.listView')}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                </div>

                {/* Sort Dropdown */}
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => setShowSortDropdown(!showSortDropdown)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                    </svg>
                    {t(`fileManager.sortBy.${sortBy}`)}
                    <svg className={`w-3 h-3 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showSortDropdown && (
                    <div className="absolute right-0 top-full mt-1 z-20 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1">
                      {(Object.keys({ name: 0, date: 0, size: 0, type: 0 }) as SortBy[]).map((key) => (
                        <button
                          key={key}
                          onClick={() => {
                            if (sortBy === key) {
                              setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                            } else {
                              setSortBy(key);
                            }
                            setShowSortDropdown(false);
                          }}
                          className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between transition-colors ${
                            sortBy === key
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          {t(`fileManager.sortBy.${key}`)}
                          {sortBy === key && (
                            <svg
                              className={`w-3 h-3 ${sortOrder === 'desc' ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Batch Actions */}
                {hasSelection && (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">
                      {t('fileManager.selectedCount', { count: selectedFiles.length.toString() })}
                    </span>
                    <button
                      onClick={() => setShowBatchMove(true)}
                      className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {t('fileManager.batchMove')}
                    </button>
                    <button
                      onClick={() => setShowBatchTag(true)}
                      className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {t('fileManager.batchTag')}
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      className="px-3 py-2 text-xs font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {t('fileManager.batchDelete')}
                    </button>
                    <button
                      onClick={clearSelection}
                      className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      title={t('fileManager.deselectAll')}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}

                <div className="flex-1" />

                {/* Upload Button */}
                <button
                  onClick={() => {
                    const mockNames = [
                      '新建文档.docx', '截图.png', '数据.xlsx', '笔记.md',
                      '报告.pdf', '代码片段.ts', '设计稿.pptx', '备份.zip',
                    ];
                    const name = mockNames[Math.floor(Math.random() * mockNames.length)];
                    handleSimulatedUpload(name);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all shadow-sm hover:shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {t('fileManager.uploadFile')}
                </button>
              </div>
            </div>

            {/* Batch Move/Tag Modals */}
            <AnimatePresence>
              {showBatchMove && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center"
                  onClick={() => setShowBatchMove(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-80"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t('fileManager.batchMove')}
                    </h3>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      <button
                        onClick={() => handleBatchMove(null)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        {t('fileManager.noFolder')}
                      </button>
                      {folders.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => handleBatchMove(f.id)}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: f.color }} />
                          {f.name}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showBatchTag && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center"
                  onClick={() => setShowBatchTag(false)}
                >
                  <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.95 }}
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-80"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      {t('fileManager.batchTag')}
                    </h3>
                    <div className="flex gap-2">
                      <input
                        value={batchTagInput}
                        onChange={(e) => setBatchTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleBatchTag();
                          if (e.key === 'Escape') setShowBatchTag(false);
                        }}
                        placeholder={t('fileManager.newTag')}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button
                        onClick={handleBatchTag}
                        className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg hover:from-emerald-600 hover:to-green-700 transition-all"
                      >
                        {t('common.confirm')}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Content Area */}
            <div
              className="flex-1 overflow-y-auto p-4"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {/* Drag & Drop Overlay */}
              <AnimatePresence>
                {isDragOver && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 bg-emerald-500/10 border-2 border-dashed border-emerald-500 rounded-xl flex items-center justify-center pointer-events-none"
                  >
                    <div className="text-center">
                      <svg className="w-12 h-12 text-emerald-500 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                      <p className="text-emerald-600 dark:text-emerald-400 font-medium">{t('fileManager.dragDrop')}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Select All bar */}
              {!hasSelection && displayFiles.length > 0 && (
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={selectAll}
                    className="text-xs text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                  >
                    {t('fileManager.selectAll')}
                  </button>
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {displayFiles.length} {t('fileManager.items')}
                  </span>
                </div>
              )}

              {/* File Display */}
              {displayFiles.length === 0 ? (
                <EmptyState
                  type={
                    searchQuery
                      ? 'noResults'
                      : sidebarView === 'starred'
                        ? 'noStarred'
                        : 'noFiles'
                  }
                />
              ) : viewMode === 'grid' ? (
                <motion.div
                  layout
                  className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
                >
                  <AnimatePresence>
                    {displayFiles.map((file) => (
                      <FileGridCard
                        key={file.id}
                        file={file}
                        isSelected={selectedFiles.includes(file.id)}
                        onSelect={() => toggleSelectFile(file.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ x: e.clientX, y: e.clientY, file });
                        }}
                        onOpenDetail={() => setDetailFile(file)}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                        <th className="px-4 py-2.5 w-10" />
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('fileManager.sortBy.name')}
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('fileManager.sortBy.size')}
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('fileManager.sortBy.type')}
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('fileManager.updatedAt')}
                        </th>
                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          {t('fileManager.tags')}
                        </th>
                        <th className="px-4 py-2.5 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {displayFiles.map((file) => (
                          <FileListRow
                            key={file.id}
                            file={file}
                            isSelected={selectedFiles.includes(file.id)}
                            onSelect={() => toggleSelectFile(file.id)}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.clientX, y: e.clientY, file });
                            }}
                            onOpenDetail={() => setDetailFile(file)}
                          />
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <AnimatePresence>
            {detailFile && (
              <DetailPanel
                file={detailFile}
                onClose={() => setDetailFile(null)}
              />
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Context Menu */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu
            state={contextMenu}
            onClose={() => setContextMenu(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
