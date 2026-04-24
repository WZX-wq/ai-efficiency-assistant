import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';

/**
 * Markdown 渲染组件
 * 使用 react-markdown + remark-gfm 渲染 Markdown 内容
 * 语法高亮按需加载（动态 import），避免首屏 bundle 膨胀
 * 支持 14 种编程语言 + 暗色/亮色主题自动切换
 */

/** 语言别名映射 */
const LANGUAGE_ALIASES: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  sh: 'bash',
  shell: 'bash',
  c: 'cpp',
  yml: 'yaml',
};

/** SyntaxHighlighter Light 组件类型 */
type SyntaxHighlighterComponent = React.ComponentType<React.ComponentProps<typeof import('react-syntax-highlighter').Light>>;

/** 已注册的语言缓存 */
const registeredLanguages = new Set<string>();

/** 动态加载并注册语言 */
async function loadLanguage(lang: string): Promise<SyntaxHighlighterComponent | null> {
  const normalizedLang = LANGUAGE_ALIASES[lang] || lang;

  if (registeredLanguages.has(normalizedLang)) {
    const { Light } = await import('react-syntax-highlighter');
    return Light;
  }

  const languageImports: Record<string, () => Promise<unknown>> = {
    javascript: () => import('react-syntax-highlighter/dist/esm/languages/hljs/javascript'),
    typescript: () => import('react-syntax-highlighter/dist/esm/languages/hljs/typescript'),
    python: () => import('react-syntax-highlighter/dist/esm/languages/hljs/python'),
    css: () => import('react-syntax-highlighter/dist/esm/languages/hljs/css'),
    xml: () => import('react-syntax-highlighter/dist/esm/languages/hljs/xml'),
    json: () => import('react-syntax-highlighter/dist/esm/languages/hljs/json'),
    bash: () => import('react-syntax-highlighter/dist/esm/languages/hljs/bash'),
    java: () => import('react-syntax-highlighter/dist/esm/languages/hljs/java'),
    cpp: () => import('react-syntax-highlighter/dist/esm/languages/hljs/cpp'),
    go: () => import('react-syntax-highlighter/dist/esm/languages/hljs/go'),
    rust: () => import('react-syntax-highlighter/dist/esm/languages/hljs/rust'),
    sql: () => import('react-syntax-highlighter/dist/esm/languages/hljs/sql'),
    markdown: () => import('react-syntax-highlighter/dist/esm/languages/hljs/markdown'),
    yaml: () => import('react-syntax-highlighter/dist/esm/languages/hljs/yaml'),
  };

  const loader = languageImports[normalizedLang];
  if (!loader) return null;

  try {
    const { Light } = await import('react-syntax-highlighter');
    const langModule = await loader() as { default: unknown };
    const langRegister = langModule.default;
    if (langRegister) {
      Light.registerLanguage(normalizedLang, langRegister as Parameters<typeof Light.registerLanguage>[1]);
    }
    registeredLanguages.add(normalizedLang);
    return Light;
  } catch {
    console.warn(`Failed to load syntax highlighter for: ${normalizedLang}`);
    return null;
  }
}

/** 获取当前主题 */
async function getTheme(isDark: boolean) {
  if (isDark) {
    const { atomOneDark } = await import('react-syntax-highlighter/dist/esm/styles/hljs');
    return atomOneDark;
  } else {
    const { atomOneLight } = await import('react-syntax-highlighter/dist/esm/styles/hljs');
    return atomOneLight;
  }
}

interface CodeBlockProps {
  language: string;
  code: string;
}

/** 带语法高亮和复制按钮的代码块组件 */
function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [Highlighter, setHighlighter] = useState<SyntaxHighlighterComponent | null>(null);
  const [themeStyle, setThemeStyle] = useState<Record<string, React.CSSProperties>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const isDark = document.documentElement.classList.contains('dark');

    Promise.all([loadLanguage(language), getTheme(isDark)]).then(
      ([hlComponent, theme]) => {
        if (cancelled) return;
        if (hlComponent) setHighlighter(() => hlComponent);
        if (theme) setThemeStyle(theme);
        setLoading(false);
      }
    );

    return () => { cancelled = true; };
  }, [language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-800 dark:border-gray-700 mb-4">
      {/* 头部栏：语言名称 + 复制按钮 */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 dark:bg-gray-900 text-gray-300 text-xs">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="px-2 py-1 rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors text-gray-300 hover:text-white"
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      {/* 代码高亮区域 */}
      {loading ? (
        <div className="px-4 py-3 bg-gray-900 text-gray-400 text-sm font-mono animate-pulse">
          加载语法高亮...
        </div>
      ) : Highlighter ? (
        <Highlighter
          language={language}
          style={themeStyle}
          customStyle={{
            margin: 0,
            borderRadius: 0,
            fontSize: '0.875rem',
            lineHeight: '1.625',
          }}
          showLineNumbers={false}
        >
          {code}
        </Highlighter>
      ) : (
        <pre className="px-4 py-3 bg-gray-900 text-gray-300 text-sm font-mono overflow-x-auto">
          <code>{code}</code>
        </pre>
      )}
    </div>
  );
}

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

/** 自定义 Markdown 渲染组件样式 */
const components: Components = {
  /** 标题样式 */
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-bold text-gray-900 dark:text-white mt-5 mb-2.5 pb-1.5 border-b border-gray-100 dark:border-gray-700">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold text-gray-800 dark:text-gray-200 mt-3 mb-1.5">
      {children}
    </h4>
  ),

  /** 段落 */
  p: ({ children }) => (
    <p className="text-gray-700 dark:text-gray-300 leading-relaxed mb-3">{children}</p>
  ),

  /** 加粗文本 */
  strong: ({ children }) => (
    <strong className="text-gray-900 dark:text-white font-semibold">{children}</strong>
  ),

  /** 斜体文本 */
  em: ({ children }) => <em className="text-gray-700 dark:text-gray-300 italic">{children}</em>,

  /** 链接 */
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 hover:underline underline-offset-2 transition-colors"
    >
      {children}
    </a>
  ),

  /** 行内代码 & 代码块 */
  code: ({ className, children }) => {
    const match = className?.match(/language-(\w+)/);
    if (match) {
      const language = match[1];
      const codeString = String(children).replace(/\n$/, '');
      return (
        <CodeBlock language={language} code={codeString} />
      );
    }
    return (
      <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-pink-600 dark:text-pink-400 rounded-md text-sm font-mono">
        {children}
      </code>
    );
  },

  /** 代码块 - 保持简单包装 */
  pre: ({ children }) => (
    <pre className="mb-4">{children}</pre>
  ),

  /** 无序列表 */
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-5 mb-3 space-y-1 text-gray-700 dark:text-gray-300">
      {children}
    </ul>
  ),

  /** 有序列表 */
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 mb-3 space-y-1 text-gray-700 dark:text-gray-300">
      {children}
    </ol>
  ),

  /** 列表项 */
  li: ({ children }) => (
    <li className="leading-relaxed pl-1">{children}</li>
  ),

  /** 引用块 */
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-blue-400 bg-blue-50 dark:bg-blue-900/20 pl-4 pr-3 py-2.5 my-3 rounded-r-lg text-gray-700 dark:text-gray-300 italic">
      {children}
    </blockquote>
  ),

  /** 分割线 */
  hr: () => (
    <hr className="my-5 border-gray-200 dark:border-gray-700" />
  ),

  /** 表格 */
  table: ({ children }) => (
    <div className="overflow-x-auto mb-4 rounded-xl border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  ),

  /** 表头 */
  thead: ({ children }) => (
    <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white font-semibold">
      {children}
    </thead>
  ),

  /** 表体 */
  tbody: ({ children }) => <tbody className="divide-y divide-gray-100 dark:divide-gray-700">{children}</tbody>,

  /** 表格行 */
  tr: ({ children }) => (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">{children}</tr>
  ),

  /** 表头单元格 */
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-sm font-semibold text-gray-900 dark:text-white whitespace-nowrap">
      {children}
    </th>
  ),

  /** 表格单元格 */
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300">{children}</td>
  ),

  /** 删除线 */
  del: ({ children }) => (
    <del className="text-gray-400 dark:text-gray-500 line-through">{children}</del>
  ),

  /** 图片 */
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt || ''}
      className="max-w-full h-auto rounded-xl my-3 border border-gray-200 dark:border-gray-700"
      loading="lazy"
    />
  ),
};

export default function MarkdownRenderer({
  content,
  className = '',
}: MarkdownRendererProps) {
  return (
    <div className={`prose prose-slate dark:prose-invert max-w-none ${className}`}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  );
}
