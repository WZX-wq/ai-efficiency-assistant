import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ExtensionType = 'productivity' | 'ai-assistant' | 'content-script' | 'devtools' | 'theme';
export type ExtensionStatus = 'installed' | 'disabled' | 'development';

export interface ExtensionManifest {
  manifest_version: 3;
  name: string;
  version: string;
  description: string;
  permissions: string[];
  host_permissions?: string[];
  background?: {
    service_worker: string;
  };
  content_scripts?: Array<{
    matches: string[];
    js?: string[];
    css?: string[];
    run_at?: 'document_start' | 'document_end' | 'document_idle';
  }>;
  action?: {
    default_popup: string;
    default_icon: Record<string, string>;
  };
  options_page?: string;
  icons: Record<string, string>;
  web_accessible_resources?: Array<{
    resources: string[];
    matches: string[];
  }>;
}

export interface ExtensionCode {
  background?: string;
  content?: string;
  popup?: string;
  options?: string;
  manifest?: string;
}

export interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  icon: string;
  type: ExtensionType;
  status: ExtensionStatus;
  permissions: string[];
  manifest: ExtensionManifest;
  code: ExtensionCode;
  createdAt: string;
  updatedAt: string;
}

export interface ExtensionTemplate {
  id: string;
  name: string;
  description: string;
  type: ExtensionType;
  icon: string;
  files: string[];
  code: ExtensionCode;
}

export type ExtensionTab = 'installed' | 'templates' | 'docs' | 'create';

interface ExtensionStore {
  extensions: Extension[];
  templates: ExtensionTemplate[];
  activeExtensionId: string | null;
  activeTab: ExtensionTab;

  setActiveTab: (tab: ExtensionTab) => void;
  setActiveExtension: (id: string | null) => void;
  createExtension: (data: Partial<Extension>) => Extension;
  updateExtension: (id: string, data: Partial<Extension>) => void;
  deleteExtension: (id: string) => void;
  toggleExtension: (id: string) => void;
  updateCode: (id: string, code: Partial<ExtensionCode>) => void;
  exportExtension: (id: string) => { filename: string; content: string };
}

const generateId = () => Math.random().toString(36).substring(2, 15);

const defaultManifest = (name: string, version: string, description: string): ExtensionManifest => ({
  manifest_version: 3,
  name,
  version,
  description,
  permissions: ['storage', 'activeTab'],
  icons: {
    '16': 'icons/icon-16.png',
    '32': 'icons/icon-32.png',
    '48': 'icons/icon-48.png',
    '128': 'icons/icon-128.png',
  },
});

const mockExtensions: Extension[] = [
  {
    id: 'ext-1',
    name: 'AI写作助手',
    description: '智能AI写作辅助工具，支持文本生成、改写、翻译等功能',
    version: '1.2.0',
    icon: '✍️',
    type: 'ai-assistant',
    status: 'installed',
    permissions: ['storage', 'activeTab', 'scripting'],
    manifest: {
      ...defaultManifest('AI写作助手', '1.2.0', '智能AI写作辅助工具'),
      permissions: ['storage', 'activeTab', 'scripting'],
      action: {
        default_popup: 'popup.html',
        default_icon: {
          '16': 'icons/icon-16.png',
          '32': 'icons/icon-32.png',
        },
      },
      background: {
        service_worker: 'background.js',
      },
    },
    code: {
      manifest: JSON.stringify({
        manifest_version: 3,
        name: 'AI写作助手',
        version: '1.2.0',
        description: '智能AI写作辅助工具',
        permissions: ['storage', 'activeTab', 'scripting'],
        action: {
          default_popup: 'popup.html',
        },
        background: {
          service_worker: 'background.js',
        },
      }, null, 2),
      background: `// background.js - 后台服务工作者
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI写作助手已安装');
});

chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      alert('AI写作助手已激活！');
    }
  });
});`,
      popup: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { width: 300px; padding: 16px; font-family: system-ui; }
    h1 { font-size: 16px; margin-bottom: 12px; }
    button { width: 100%; padding: 8px; margin: 4px 0; cursor: pointer; }
  </style>
</head>
<body>
  <h1>AI写作助手</h1>
  <button id="generate">生成文本</button>
  <button id="rewrite">智能改写</button>
  <button id="translate">翻译</button>
  <script src="popup.js"></script>
</body>
</html>`,
      content: `// content.js - 内容脚本
console.log('AI写作助手内容脚本已加载');

// 在页面中注入AI助手按钮
function injectAIButton() {
  const button = document.createElement('div');
  button.id = 'ai-writing-assistant';
  button.innerHTML = '🤖';
  button.style.cssText = \`
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 48px;
    height: 48px;
    background: linear-gradient(135deg, #f97316, #d97706);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  \`;
  document.body.appendChild(button);
}

injectAIButton();`,
    },
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-03-20T10:30:00Z',
  },
  {
    id: 'ext-2',
    name: '网页内容提取器',
    description: '一键提取网页正文内容，支持Markdown格式导出',
    version: '2.0.1',
    icon: '📄',
    type: 'content-script',
    status: 'installed',
    permissions: ['activeTab', 'scripting', 'storage'],
    manifest: {
      ...defaultManifest('网页内容提取器', '2.0.1', '一键提取网页正文内容'),
      permissions: ['activeTab', 'scripting', 'storage'],
      content_scripts: [
        {
          matches: ['<all_urls>'],
          js: ['content.js'],
          run_at: 'document_idle',
        },
      ],
    },
    code: {
      manifest: JSON.stringify({
        manifest_version: 3,
        name: '网页内容提取器',
        version: '2.0.1',
        description: '一键提取网页正文内容',
        permissions: ['activeTab', 'scripting', 'storage'],
        content_scripts: [{
          matches: ['<all_urls>'],
          js: ['content.js'],
        }],
      }, null, 2),
      content: `// content.js - 内容提取脚本
function extractContent() {
  const article = document.querySelector('article') || 
                  document.querySelector('[role="main"]') || 
                  document.body;
  
  const title = document.title;
  const url = window.location.href;
  
  // 提取正文
  const paragraphs = article.querySelectorAll('p');
  let content = '';
  paragraphs.forEach(p => {
    if (p.textContent.trim().length > 50) {
      content += p.textContent + '\\n\\n';
    }
  });
  
  return { title, url, content };
}

// 监听来自popup的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'extract') {
    const data = extractContent();
    sendResponse(data);
  }
});`,
      popup: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { width: 320px; padding: 16px; }
    #content { max-height: 300px; overflow-y: auto; }
  </style>
</head>
<body>
  <h2>内容提取器</h2>
  <button id="extract">提取当前页面</button>
  <div id="result"></div>
</body>
</html>`,
    },
    createdAt: '2024-02-01T09:00:00Z',
    updatedAt: '2024-03-15T14:20:00Z',
  },
  {
    id: 'ext-3',
    name: '智能翻译插件',
    description: '划词翻译、整页翻译，支持100+语言互译',
    version: '1.5.3',
    icon: '🌐',
    type: 'content-script',
    status: 'disabled',
    permissions: ['activeTab', 'storage', 'contextMenus'],
    manifest: {
      ...defaultManifest('智能翻译插件', '1.5.3', '划词翻译、整页翻译'),
      permissions: ['activeTab', 'storage', 'contextMenus'],
      content_scripts: [{
        matches: ['<all_urls>'],
        js: ['content.js'],
        css: ['styles.css'],
      }],
    },
    code: {
      manifest: JSON.stringify({
        manifest_version: 3,
        name: '智能翻译插件',
        version: '1.5.3',
        permissions: ['activeTab', 'storage', 'contextMenus'],
      }, null, 2),
      content: `// 划词翻译内容脚本
let selectedText = '';

document.addEventListener('mouseup', (e) => {
  selectedText = window.getSelection().toString().trim();
  if (selectedText.length > 0) {
    showTranslateButton(e.pageX, e.pageY);
  } else {
    hideTranslateButton();
  }
});

function showTranslateButton(x, y) {
  let btn = document.getElementById('translate-btn');
  if (!btn) {
    btn = document.createElement('div');
    btn.id = 'translate-btn';
    btn.textContent = '译';
    document.body.appendChild(btn);
  }
  btn.style.left = x + 'px';
  btn.style.top = y + 'px';
  btn.style.display = 'block';
}`,
    },
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-02-28T16:45:00Z',
  },
  {
    id: 'ext-4',
    name: '主题切换器',
    description: '为任意网站应用暗黑模式或自定义主题',
    version: '3.0.0',
    icon: '🎨',
    type: 'theme',
    status: 'installed',
    permissions: ['activeTab', 'scripting', 'storage'],
    manifest: {
      ...defaultManifest('主题切换器', '3.0.0', '网站主题自定义'),
      permissions: ['activeTab', 'scripting', 'storage'],
      content_scripts: [{
        matches: ['<all_urls>'],
        js: ['content.js'],
        run_at: 'document_start',
      }],
    },
    code: {
      manifest: JSON.stringify({
        manifest_version: 3,
        name: '主题切换器',
        version: '3.0.0',
        description: '网站主题自定义',
      }, null, 2),
      content: `// 主题注入脚本
const themes = {
  dark: \`
    html { filter: invert(1) hue-rotate(180deg) !important; }
    img, video { filter: invert(1) hue-rotate(180deg) !important; }
  \`,
  sepia: \`html { background: #f4ecd8 !important; }\`,
};

function applyTheme(themeName) {
  let style = document.getElementById('custom-theme');
  if (!style) {
    style = document.createElement('style');
    style.id = 'custom-theme';
    document.head.appendChild(style);
  }
  style.textContent = themes[themeName] || '';
}

// 读取保存的主题
chrome.storage.sync.get(['theme'], (result) => {
  if (result.theme) applyTheme(result.theme);
});`,
    },
    createdAt: '2024-03-01T11:00:00Z',
    updatedAt: '2024-03-25T09:15:00Z',
  },
  {
    id: 'ext-5',
    name: '密码生成器',
    description: '安全密码生成器，支持自定义规则和强度检测',
    version: '1.0.5',
    icon: '🔐',
    type: 'productivity',
    status: 'development',
    permissions: ['storage'],
    manifest: {
        ...defaultManifest('密码生成器', '1.0.5', '安全密码生成工具'),
        permissions: ['storage'],
        action: {
          default_popup: 'popup.html',
          default_icon: {
            '16': 'icons/icon-16.png',
            '32': 'icons/icon-32.png',
          },
        },
      },
    code: {
      manifest: JSON.stringify({
        manifest_version: 3,
        name: '密码生成器',
        version: '1.0.5',
        permissions: ['storage'],
      }, null, 2),
      popup: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { width: 280px; padding: 20px; }
    #password { font-family: monospace; font-size: 18px; padding: 10px; }
  </style>
</head>
<body>
  <h3>密码生成器</h3>
  <div id="password"></div>
  <button id="generate">生成新密码</button>
</body>
</html>`,
    },
    createdAt: '2024-03-10T14:00:00Z',
    updatedAt: '2024-03-10T14:00:00Z',
  },
];

const extensionTemplates: ExtensionTemplate[] = [
  {
    id: 'tpl-ai-assistant',
    name: 'AI助手模板',
    description: 'Content script + popup组合，实现AI对话功能',
    type: 'ai-assistant',
    icon: '🤖',
    files: ['manifest.json', 'background.js', 'content.js', 'popup.html', 'popup.js'],
    code: {
      manifest: JSON.stringify({
        manifest_version: 3,
        name: 'My AI Assistant',
        version: '1.0.0',
        description: 'AI-powered assistant extension',
        permissions: ['storage', 'activeTab'],
        action: { default_popup: 'popup.html' },
        background: { service_worker: 'background.js' },
      }, null, 2),
      background: `chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CHAT') {
    // 处理AI对话请求
    fetchAIResponse(msg.text).then(sendResponse);
    return true;
  }
});

async function fetchAIResponse(text) {
  // 调用AI API
  return { response: 'AI response here' };
}`,
      popup: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { width: 350px; height: 500px; margin: 0; }
    #chat { height: 400px; overflow-y: auto; padding: 16px; }
    #input { display: flex; padding: 16px; border-top: 1px solid #ddd; }
  </style>
</head>
<body>
  <div id="chat"></div>
  <div id="input">
    <input type="text" id="message" placeholder="输入消息...">
    <button id="send">发送</button>
  </div>
</body>
</html>`,
      content: `// 在页面中注入AI助手
const assistant = document.createElement('div');
assistant.id = 'ai-assistant-floating';
assistant.innerHTML = '<button>🤖</button>';
document.body.appendChild(assistant);`,
    },
  },
  {
    id: 'tpl-scraper',
    name: '内容提取模板',
    description: '网页数据抓取和提取的content script模板',
    type: 'content-script',
    icon: '🕷️',
    files: ['manifest.json', 'content.js', 'popup.html'],
    code: {
      manifest: JSON.stringify({
        manifest_version: 3,
        name: 'Web Scraper',
        version: '1.0.0',
        permissions: ['activeTab', 'scripting'],
        content_scripts: [{
          matches: ['<all_urls>'],
          js: ['content.js'],
        }],
      }, null, 2),
      content: `// 数据提取逻辑
function scrapeData() {
  const data = {
    title: document.title,
    url: location.href,
    headings: Array.from(document.querySelectorAll('h1, h2, h3'))
      .map(h => h.textContent.trim()),
    links: Array.from(document.querySelectorAll('a[href]'))
      .map(a => ({ text: a.textContent, href: a.href })),
  };
  return data;
}

// 监听消息
chrome.runtime.onMessage.addListener((req, sender, sendResponse) => {
  if (req.action === 'scrape') {
    sendResponse(scrapeData());
  }
});`,
    },
  },
  {
    id: 'tpl-newtab',
    name: '新标签页模板',
    description: '自定义Chrome新标签页',
    type: 'productivity',
    icon: '🆕',
    files: ['manifest.json', 'newtab.html', 'newtab.js', 'newtab.css'],
    code: {
      manifest: JSON.stringify({
        manifest_version: 3,
        name: 'Custom New Tab',
        version: '1.0.0',
        chrome_url_overrides: { newtab: 'newtab.html' },
        permissions: ['storage'],
      }, null, 2),
    },
  },
  {
    id: 'tpl-devtools',
    name: 'DevTools模板',
    description: '添加自定义面板到Chrome开发者工具',
    type: 'devtools',
    icon: '🛠️',
    files: ['manifest.json', 'devtools.html', 'devtools.js', 'panel.html', 'panel.js'],
    code: {
      manifest: JSON.stringify({
        manifest_version: 3,
        name: 'DevTools Extension',
        version: '1.0.0',
        devtools_page: 'devtools.html',
      }, null, 2),
    },
  },
  {
    id: 'tpl-theme',
    name: '主题模板',
    description: '注入CSS改变网页外观',
    type: 'theme',
    icon: '🎨',
    files: ['manifest.json', 'content.js', 'styles.css'],
    code: {
      manifest: JSON.stringify({
        manifest_version: 3,
        name: 'Custom Theme',
        version: '1.0.0',
        permissions: ['activeTab'],
        content_scripts: [{
          matches: ['<all_urls>'],
          js: ['content.js'],
          css: ['styles.css'],
          run_at: 'document_start',
        }],
      }, null, 2),
      content: `// 动态主题切换
function injectTheme(css) {
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
}

// 读取用户设置
chrome.storage.sync.get(['customCSS'], (result) => {
  if (result.customCSS) {
    injectTheme(result.customCSS);
  }
});`,
    },
  },
];

export const useExtensionStore = create<ExtensionStore>()(
  persist(
    (set, get) => ({
      extensions: mockExtensions,
      templates: extensionTemplates,
      activeExtensionId: null,
      activeTab: 'installed',

      setActiveTab: (tab) => set({ activeTab: tab }),

      setActiveExtension: (id) => set({ activeExtensionId: id }),

      createExtension: (data) => {
        const newExtension: Extension = {
          id: generateId(),
          name: data.name || '新扩展',
          description: data.description || '',
          version: data.version || '1.0.0',
          icon: data.icon || '📦',
          type: data.type || 'productivity',
          status: 'development',
          permissions: data.permissions || ['storage'],
          manifest: data.manifest || defaultManifest(data.name || '新扩展', '1.0.0', data.description || ''),
          code: data.code || {
            manifest: JSON.stringify(defaultManifest(data.name || '新扩展', '1.0.0', data.description || ''), null, 2),
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          extensions: [...state.extensions, newExtension],
        }));

        return newExtension;
      },

      updateExtension: (id, data) => {
        set((state) => ({
          extensions: state.extensions.map((ext) =>
            ext.id === id
              ? { ...ext, ...data, updatedAt: new Date().toISOString() }
              : ext
          ),
        }));
      },

      deleteExtension: (id) => {
        set((state) => ({
          extensions: state.extensions.filter((ext) => ext.id !== id),
          activeExtensionId: state.activeExtensionId === id ? null : state.activeExtensionId,
        }));
      },

      toggleExtension: (id) => {
        set((state) => ({
          extensions: state.extensions.map((ext) =>
            ext.id === id
              ? {
                  ...ext,
                  status: ext.status === 'installed' ? 'disabled' : 'installed',
                  updatedAt: new Date().toISOString(),
                }
              : ext
          ),
        }));
      },

      updateCode: (id, code) => {
        set((state) => ({
          extensions: state.extensions.map((ext) =>
            ext.id === id
              ? {
                  ...ext,
                  code: { ...ext.code, ...code },
                  updatedAt: new Date().toISOString(),
                }
              : ext
          ),
        }));
      },

      exportExtension: (id) => {
        const ext = get().extensions.find((e) => e.id === id);
        if (!ext) throw new Error('Extension not found');

        const zipContent = {
          'manifest.json': ext.code.manifest || JSON.stringify(ext.manifest, null, 2),
          ...(ext.code.background && { 'background.js': ext.code.background }),
          ...(ext.code.content && { 'content.js': ext.code.content }),
          ...(ext.code.popup && { 'popup.html': ext.code.popup }),
          ...(ext.code.options && { 'options.html': ext.code.options }),
        };

        return {
          filename: `${ext.name.replace(/\s+/g, '_')}_v${ext.version}.zip`,
          content: JSON.stringify(zipContent, null, 2),
        };
      },
    }),
    {
      name: 'ai-assistant-extension-store',
      partialize: (state) => ({
        extensions: state.extensions,
        activeExtensionId: state.activeExtensionId,
        activeTab: state.activeTab,
      }),
    }
  )
);
