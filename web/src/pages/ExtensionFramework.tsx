import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Puzzle,
  BookOpen,
  FileCode,
  Plus,
  Download,
  Trash2,
  Copy,
  Check,
  ChevronRight,
  FolderTree,
  Settings,
  Shield,
  Code2,
  Layout,
  Globe,
  Palette,
  Wrench,
  Bot,
  ExternalLink,
  Package,
  X,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import {
  useExtensionStore,
  Extension,
  ExtensionTemplate,
  ExtensionType,
  ExtensionTab,
} from '../store/useExtensionStore';

// ==================== Types ====================
type CodeFileType = 'manifest' | 'background' | 'content' | 'popup' | 'options';

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
}

// ==================== Constants ====================
const DOC_SECTIONS: DocSection[] = [
  { id: 'manifest', title: 'extension.docSections.manifest', icon: <FileCode className="w-4 h-4" /> },
  { id: 'content-scripts', title: 'extension.docSections.content-scripts', icon: <Globe className="w-4 h-4" /> },
  { id: 'background', title: 'extension.docSections.background', icon: <Bot className="w-4 h-4" /> },
  { id: 'popup', title: 'extension.docSections.popup', icon: <Layout className="w-4 h-4" /> },
  { id: 'options', title: 'extension.docSections.options', icon: <Settings className="w-4 h-4" /> },
  { id: 'permissions', title: 'extension.docSections.permissions', icon: <Shield className="w-4 h-4" /> },
  { id: 'publishing', title: 'extension.docSections.publishing', icon: <ExternalLink className="w-4 h-4" /> },
];

const TYPE_ICONS: Record<ExtensionType, React.ReactNode> = {
  productivity: <Wrench className="w-4 h-4" />,
  'ai-assistant': <Bot className="w-4 h-4" />,
  'content-script': <Globe className="w-4 h-4" />,
  devtools: <Code2 className="w-4 h-4" />,
  theme: <Palette className="w-4 h-4" />,
};

const TYPE_COLORS: Record<ExtensionType, string> = {
  productivity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'ai-assistant': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  'content-script': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  devtools: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  theme: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
};

const STATUS_COLORS: Record<string, string> = {
  installed: 'bg-green-500',
  disabled: 'bg-gray-400',
  development: 'bg-amber-500',
};

// ==================== Code Display Component ====================
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'javascript' }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split('\n');

  return (
    <div className="relative group rounded-lg overflow-hidden bg-gray-900 dark:bg-gray-950">
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 border-b border-gray-700">
        <span className="text-xs text-gray-400 uppercase">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="table-row">
                <span className="table-cell text-right pr-4 text-gray-600 select-none w-12">
                  {i + 1}
                </span>
                <span
                  className="table-cell whitespace-pre"
                  dangerouslySetInnerHTML={{ __html: highlightCode(line) }}
                />
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
};

// Simple syntax highlighting
const highlightCode = (line: string): string => {
  let html = line
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Comments
  html = html.replace(/(\/\/.*$)/, '<span class="text-gray-500">$1</span>');
  html = html.replace(/(\/\*[\s\S]*?\*\/)/, '<span class="text-gray-500">$1</span>');

  // Strings
  html = html.replace(/(".*?"|'.*?'|`.*?`)/g, '<span class="text-green-400">$1</span>');

  // Keywords
  const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'async', 'await', 'import', 'export', 'default', 'class', 'interface', 'type'];
  keywords.forEach((kw) => {
    const regex = new RegExp(`\\b(${kw})\\b`, 'g');
    html = html.replace(regex, '<span class="text-purple-400">$1</span>');
  });

  // Numbers
  html = html.replace(/\b(\d+)\b/g, '<span class="text-orange-400">$1</span>');

  // JSON keys
  html = html.replace(/("[\w-]+")(?=\s*:)/g, '<span class="text-blue-400">$1</span>');

  return html;
};

// ==================== Extension Card ====================
const ExtensionCard: React.FC<{
  extension: Extension;
  onClick: () => void;
  onToggle: () => void;
}> = ({ extension, onClick, onToggle }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 cursor-pointer hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-2xl shadow-lg">
          {extension.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">
              {extension.name}
            </h3>
            <span className="text-xs text-gray-500">v{extension.version}</span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {extension.description}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[extension.type]}`}>
              {TYPE_ICONS[extension.type]}
              {t(`extension.type.${extension.type}`)}
            </span>
            <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[extension.status]}`} />
            <span className="text-xs text-gray-500">
              {t(`extension.${extension.status}`)}
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`absolute top-4 right-4 w-10 h-6 rounded-full transition-colors ${
          extension.status === 'installed' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <motion.div
          className="w-4 h-4 bg-white rounded-full shadow-md"
          animate={{ x: extension.status === 'installed' ? 18 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </button>
    </motion.div>
  );
};

// ==================== Template Card ====================
const TemplateCard: React.FC<{
  template: ExtensionTemplate;
  onUse: () => void;
}> = ({ template, onUse }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-lg transition-shadow"
    >
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-2xl shadow-lg">
          {template.icon}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white">{template.name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {template.description}
          </p>
          <div className="flex items-center gap-2 mt-3">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_COLORS[template.type]}`}>
              {TYPE_ICONS[template.type]}
              {t(`extension.type.${template.type}`)}
            </span>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 mb-2">{t('extension.template.filesIncluded')}:</p>
            <div className="flex flex-wrap gap-1">
              {template.files.map((file) => (
                <span
                  key={file}
                  className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-300"
                >
                  {file}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onUse}
            className="mt-4 w-full py-2 px-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-700 transition-colors"
          >
            {t('extension.useTemplate')}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== Extension Detail Panel ====================
const ExtensionDetailPanel: React.FC<{
  extension: Extension;
  onClose: () => void;
  onDelete: () => void;
  onToggle: () => void;
}> = ({ extension, onClose, onDelete, onToggle }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'permissions' | 'settings'>('overview');
  const [activeFile, setActiveFile] = useState<CodeFileType>('manifest');

  const codeFilesRaw = [
    { key: 'manifest' as CodeFileType, label: 'manifest.json', code: extension.code.manifest },
    { key: 'background' as CodeFileType, label: 'background.js', code: extension.code.background },
    { key: 'content' as CodeFileType, label: 'content.js', code: extension.code.content },
    { key: 'popup' as CodeFileType, label: 'popup.html', code: extension.code.popup },
    { key: 'options' as CodeFileType, label: 'options.html', code: extension.code.options },
  ];
  const codeFiles = codeFilesRaw.filter((f): f is { key: CodeFileType; label: string; code: string } => !!f.code);

  const handleExport = () => {
    const store = useExtensionStore.getState();
    try {
      const result = store.exportExtension(extension.id);
      const blob = new Blob([result.content], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename.replace('.zip', '.json');
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Handle error
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-2xl shadow-lg">
            {extension.icon}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{extension.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-gray-500">v{extension.version}</span>
              <span className={`w-2 h-2 rounded-full ${STATUS_COLORS[extension.status]}`} />
              <span className="text-sm text-gray-500">{t(`extension.${extension.status}`)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              extension.status === 'installed'
                ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {extension.status === 'installed' ? t('extension.enabled') : t('extension.disabled')}
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['overview', 'code', 'permissions', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
              activeTab === tab
                ? 'text-orange-600 dark:text-orange-400'
                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {t(`extension.${tab === 'code' ? 'detail.codeTab' : tab === 'permissions' ? 'detail.permissionsTab' : tab === 'settings' ? 'detail.settingsTab' : 'overview'}`)}
            {activeTab === tab && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-500 to-amber-600"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                {t('extension.description')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">{extension.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">{t('extension.type')}</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {t(`extension.type.${extension.type}`)}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">{t('extension.version')}</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">{extension.version}</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">{t('extension.createdAt')}</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {new Date(extension.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500 uppercase">{t('extension.lastUpdated')}</p>
                <p className="mt-1 font-medium text-gray-900 dark:text-white">
                  {new Date(extension.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                {t('extension.quickActions')}
              </h3>
              <div className="flex gap-3">
                <button
                  onClick={handleExport}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  {t('extension.export')}
                </button>
                <button
                  onClick={onDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {t('extension.delete')}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <div className="flex gap-4 h-full">
            {/* File Tree */}
            <div className="w-48 flex-shrink-0">
              <h3 className="text-xs font-medium text-gray-500 uppercase mb-3 flex items-center gap-2">
                <FolderTree className="w-4 h-4" />
                {t('extension.fileTree')}
              </h3>
              <div className="space-y-1">
                {codeFiles.map((file) => (
                  <button
                    key={file.key}
                    onClick={() => setActiveFile(file.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeFile === file.key
                        ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {file.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Viewer */}
            <div className="flex-1 min-w-0">
              {codeFiles.find((f) => f.key === activeFile)?.code && (
                <CodeBlock
                  code={codeFiles.find((f) => f.key === activeFile)!.code!}
                  language={activeFile === 'manifest' ? 'json' : activeFile === 'popup' || activeFile === 'options' ? 'html' : 'javascript'}
                />
              )}
            </div>
          </div>
        )}

        {activeTab === 'permissions' && (
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              {t('extension.permissions')}
            </h3>
            <div className="space-y-2">
              {extension.permissions.map((permission) => (
                <div
                  key={permission}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <Shield className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{permission}</p>
                    <p className="text-sm text-gray-500">
                      {getPermissionDescription(permission)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                扩展设置功能即将推出。您将能够在此处配置扩展的选项和偏好设置。
              </p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const getPermissionDescription = (permission: string): string => {
  const descriptions: Record<string, string> = {
    storage: '允许扩展存储和读取本地数据',
    activeTab: '允许扩展访问当前活动标签页',
    scripting: '允许扩展在网页中执行脚本',
    'contextMenus': '允许扩展添加右键菜单项',
    tabs: '允许扩展访问浏览器标签页信息',
    bookmarks: '允许扩展读取和修改书签',
    history: '允许扩展访问浏览历史',
    downloads: '允许扩展管理下载内容',
  };
  return descriptions[permission] || '允许扩展执行特定操作';
};

// ==================== Documentation Content ====================
const DocContent: React.FC<{ section: string }> = ({ section }) => {
  const { t } = useTranslation();

  const docs: Record<string, { title: string; content: React.ReactNode }> = {
    manifest: {
      title: t('extension.docs.manifest.title'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">{t('extension.docs.manifest.desc')}</p>
          <CodeBlock
            code={`{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "1.0.0",
  "description": "Extension description",
  "permissions": ["storage", "activeTab"],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content.js"]
  }],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}`}
            language="json"
          />
        </div>
      ),
    },
    'content-scripts': {
      title: t('extension.docs.contentScripts.title'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">{t('extension.docs.contentScripts.desc')}</p>
          <CodeBlock
            code={`// content.js
// 在网页上下文中运行

// 读取页面内容
const title = document.title;
const url = window.location.href;

// 修改页面样式
document.body.style.backgroundColor = 'yellow';

// 与后台脚本通信
chrome.runtime.sendMessage({
  type: 'PAGE_INFO',
  data: { title, url }
}, (response) => {
  console.log('Received:', response);
});

// 监听来自后台的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SELECTED_TEXT') {
    const selected = window.getSelection().toString();
    sendResponse({ text: selected });
  }
});`}
          />
        </div>
      ),
    },
    background: {
      title: t('extension.docs.background.title'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">{t('extension.docs.background.desc')}</p>
          <CodeBlock
            code={`// background.js (Service Worker)

// 扩展安装时
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Extension installed!');
    // 初始化存储
    chrome.storage.sync.set({
      settings: { theme: 'light' }
    });
  }
});

// 点击扩展图标
chrome.action.onClicked.addListener(async (tab) => {
  // 向内容脚本发送消息
  chrome.tabs.sendMessage(tab.id, {
    type: 'TOGGLE_FEATURE'
  });
});

// 监听来自内容脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'FETCH_DATA') {
    fetch(request.url)
      .then(r => r.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // 保持消息通道开放
  }
});`}
          />
        </div>
      ),
    },
    popup: {
      title: t('extension.docs.popup.title'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">{t('extension.docs.popup.desc')}</p>
          <CodeBlock
            code={`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      width: 300px;
      padding: 16px;
      font-family: system-ui, sans-serif;
    }
    button {
      width: 100%;
      padding: 10px;
      margin: 8px 0;
      background: #f97316;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    }
    button:hover {
      background: #ea580c;
    }
  </style>
</head>
<body>
  <h2>My Extension</h2>
  <button id="action1">执行操作</button>
  <button id="action2">打开设置</button>
  
  <script>
    document.getElementById('action1').addEventListener('click', () => {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {type: 'DO_SOMETHING'});
      });
    });
  </script>
</body>
</html>`}
            language="html"
          />
        </div>
      ),
    },
    options: {
      title: t('extension.docs.options.title'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">{t('extension.docs.options.desc')}</p>
          <CodeBlock
            code={`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Extension Settings</title>
  <style>
    body {
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      font-family: system-ui;
    }
    .setting {
      margin: 20px 0;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
    }
  </style>
</head>
<body>
  <h1>设置</h1>
  
  <div class="setting">
    <label>
      <input type="checkbox" id="enabled"> 启用功能
    </label>
  </div>
  
  <div class="setting">
    <label>API Key:</label>
    <input type="text" id="apiKey" style="width: 100%; padding: 8px;">
  </div>
  
  <button id="save">保存设置</button>
  
  <script>
    // 加载保存的设置
    chrome.storage.sync.get(['enabled', 'apiKey'], (result) => {
      document.getElementById('enabled').checked = result.enabled || false;
      document.getElementById('apiKey').value = result.apiKey || '';
    });
    
    // 保存设置
    document.getElementById('save').addEventListener('click', () => {
      chrome.storage.sync.set({
        enabled: document.getElementById('enabled').checked,
        apiKey: document.getElementById('apiKey').value
      }, () => {
        alert('设置已保存！');
      });
    });
  </script>
</body>
</html>`}
            language="html"
          />
        </div>
      ),
    },
    permissions: {
      title: t('extension.docs.permissions.title'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">{t('extension.docs.permissions.desc')}</p>
          <div className="grid gap-3">
            {[
              { name: 'activeTab', desc: '临时访问当前活动标签页' },
              { name: 'storage', desc: '本地存储数据（sync/local）' },
              { name: 'scripting', desc: '在页面中注入和执行脚本' },
              { name: 'tabs', desc: '访问和操作浏览器标签页' },
              { name: 'contextMenus', desc: '添加右键菜单项' },
              { name: 'downloads', desc: '管理文件下载' },
              { name: 'bookmarks', desc: '读取和修改书签' },
              { name: 'history', desc: '访问浏览历史' },
            ].map((perm) => (
              <div key={perm.name} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <code className="text-orange-600 dark:text-orange-400 font-medium">{perm.name}</code>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{perm.desc}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    publishing: {
      title: t('extension.docs.publishing.title'),
      content: (
        <div className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">{t('extension.docs.publishing.desc')}</p>
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center font-medium">1</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">准备扩展包</h4>
                <p className="text-sm text-gray-500">将所有文件打包为ZIP格式，确保manifest.json在根目录</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center font-medium">2</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">注册开发者账号</h4>
                <p className="text-sm text-gray-500">访问 Chrome Web Store Developer Dashboard 注册并支付一次性$5费用</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center font-medium">3</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">填写商店信息</h4>
                <p className="text-sm text-gray-500">提供扩展名称、描述、截图、图标和详细说明</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 flex items-center justify-center font-medium">4</div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">提交审核</h4>
                <p className="text-sm text-gray-500">审核通常需要1-3个工作日，通过后扩展将上线</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
  };

  const doc = docs[section];
  if (!doc) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{doc.title}</h2>
      {doc.content}
    </div>
  );
};

// ==================== Create Extension Form ====================
const CreateExtensionForm: React.FC<{ onCreated: (ext: Extension) => void }> = ({ onCreated }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [type, setType] = useState<ExtensionType>('productivity');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const store = useExtensionStore.getState();
    const ext = store.createExtension({
      name,
      description,
      version,
      type,
    });
    onCreated(ext);
  };

  const manifestPreview = JSON.stringify(
    {
      manifest_version: 3,
      name: name || 'My Extension',
      version: version || '1.0.0',
      description: description || 'Extension description',
      permissions: ['storage'],
    },
    null,
    2
  );

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('extension.extensionName')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('extension.form.namePlaceholder')}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('extension.description')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('extension.form.descriptionPlaceholder')}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('extension.version')}
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder={t('extension.form.versionPlaceholder')}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('extension.type')}
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ExtensionType)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="productivity">{t('extension.productivity')}</option>
              <option value="ai-assistant">{t('extension.type.ai-assistant')}</option>
              <option value="content-script">{t('extension.type.content-script')}</option>
              <option value="devtools">{t('extension.type.devtools')}</option>
              <option value="theme">{t('extension.type.theme')}</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-700 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {t('extension.createExtension')}
        </button>
      </form>

      <div>
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Manifest Preview
        </h3>
        <CodeBlock code={manifestPreview} language="json" />
      </div>
    </div>
  );
};

// ==================== Main Component ====================
const ExtensionFramework: React.FC = () => {
  const { t } = useTranslation();
  const {
    extensions,
    templates,
    activeExtensionId,
    activeTab,
    setActiveTab,
    setActiveExtension,
    deleteExtension,
    toggleExtension,
    createExtension,
  } = useExtensionStore();

  const [activeDocSection, setActiveDocSection] = useState('manifest');

  const activeExtension = extensions.find((e) => e.id === activeExtensionId);

  const tabs: { id: ExtensionTab; label: string; icon: React.ReactNode }[] = [
    { id: 'installed', label: t('extension.tabs.installed'), icon: <Puzzle className="w-4 h-4" /> },
    { id: 'templates', label: t('extension.tabs.templates'), icon: <Package className="w-4 h-4" /> },
    { id: 'docs', label: t('extension.tabs.docs'), icon: <BookOpen className="w-4 h-4" /> },
    { id: 'create', label: t('extension.tabs.create'), icon: <Plus className="w-4 h-4" /> },
  ];

  const handleUseTemplate = (template: ExtensionTemplate) => {
    const ext = createExtension({
      name: `My ${template.name}`,
      description: template.description,
      type: template.type,
      code: template.code,
    });
    setActiveExtension(ext.id);
    setActiveTab('installed');
  };

  const handleCreateExtension = (ext: Extension) => {
    setActiveExtension(ext.id);
    setActiveTab('installed');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg">
              <Puzzle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('extension.title')}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {t('extension.subtitle')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'installed' && (
            <motion.div
              key="installed"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {extensions.length === 0 ? (
                <div className="text-center py-16">
                  <Puzzle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {t('extension.noExtensions')}
                  </h3>
                  <p className="text-gray-500 mt-2">
                    从模板库创建您的第一个扩展
                  </p>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-lg font-medium"
                  >
                    浏览模板
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {extensions.map((ext) => (
                    <ExtensionCard
                      key={ext.id}
                      extension={ext}
                      onClick={() => setActiveExtension(ext.id)}
                      onToggle={() => toggleExtension(ext.id)}
                    />
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'templates' && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid md:grid-cols-2 gap-6"
            >
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onUse={() => handleUseTemplate(template)}
                />
              ))}
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div
              key="docs"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-8"
            >
              {/* Sidebar */}
              <div className="w-64 flex-shrink-0">
                <nav className="space-y-1">
                  {DOC_SECTIONS.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveDocSection(section.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left rounded-lg transition-colors ${
                        activeDocSection === section.id
                          ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {section.icon}
                      <span className="font-medium">{t(section.title)}</span>
                      <ChevronRight className={`w-4 h-4 ml-auto transition-transform ${
                        activeDocSection === section.id ? 'rotate-90' : ''
                      }`} />
                    </button>
                  ))}
                </nav>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                  <DocContent section={activeDocSection} />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'create' && (
            <motion.div
              key="create"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <CreateExtensionForm onCreated={handleCreateExtension} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Extension Detail Panel */}
      <AnimatePresence>
        {activeExtension && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setActiveExtension(null)}
            />
            <ExtensionDetailPanel
              extension={activeExtension}
              onClose={() => setActiveExtension(null)}
              onDelete={() => {
                if (confirm(t('extension.delete.confirm'))) {
                  deleteExtension(activeExtension.id);
                }
              }}
              onToggle={() => toggleExtension(activeExtension.id)}
            />
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExtensionFramework;
