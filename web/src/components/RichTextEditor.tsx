import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import { useCallback, useEffect, useState, useRef } from 'react';
import type { Editor } from '@tiptap/react';
import { chatWithAi } from '../services/aiChat';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  editable?: boolean;
  onWordCount?: (count: number) => void;
}

export default function RichTextEditor({
  content,
  onChange,
  placeholder = '开始写作...',
  className = '',
  editable = true,
  onWordCount,
}: RichTextEditorProps) {
  // Slash command state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [slashPosition, setSlashPosition] = useState({ top: 0, left: 0 });
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Link input state
  const [linkUrl, setLinkUrl] = useState('');
  const [showLinkInput, setShowLinkInput] = useState(false);

  // Image input state
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const SLASH_COMMANDS: Array<{
    title: string;
    icon: string;
    action?: (editor: Editor) => void;
    isAi?: boolean;
    desc?: string;
    aiAction?: string;
  }> = [
    { title: '一级标题', icon: 'H1', action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { title: '二级标题', icon: 'H2', action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { title: '三级标题', icon: 'H3', action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { title: '四级标题', icon: 'H4', action: (editor: Editor) => editor.chain().focus().toggleHeading({ level: 4 }).run() },
    { title: '粗体', icon: 'B', action: (editor: Editor) => editor.chain().focus().toggleBold().run() },
    { title: '斜体', icon: 'I', action: (editor: Editor) => editor.chain().focus().toggleItalic().run() },
    { title: '下划线', icon: 'U', action: (editor: Editor) => editor.chain().focus().toggleUnderline().run() },
    { title: '删除线', icon: 'S', action: (editor: Editor) => editor.chain().focus().toggleStrike().run() },
    { title: '无序列表', icon: '•', action: (editor: Editor) => editor.chain().focus().toggleBulletList().run() },
    { title: '有序列表', icon: '1.', action: (editor: Editor) => editor.chain().focus().toggleOrderedList().run() },
    { title: '引用块', icon: '❝', action: (editor: Editor) => editor.chain().focus().toggleBlockquote().run() },
    { title: '代码块', icon: '</>', action: (editor: Editor) => editor.chain().focus().toggleCodeBlock().run() },
    { title: '分割线', icon: '—', action: (editor: Editor) => editor.chain().focus().setHorizontalRule().run() },
    { title: '插入表格', icon: '⊞', action: (editor: Editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
    { title: '待办事项', icon: '☑', action: (editor: Editor) => editor.chain().focus().toggleTaskList().run() },
    { title: '高亮', icon: '◐', action: (editor: Editor) => editor.chain().focus().toggleHighlight().run() },
    { title: 'AI 润色', icon: '✨', desc: '优化文字表达', isAi: true, aiAction: 'polish' },
    { title: 'AI 改写', icon: '🔄', desc: '重新表述内容', isAi: true, aiAction: 'rewrite' },
    { title: 'AI 扩写', icon: '📝', desc: '扩展详细内容', isAi: true, aiAction: 'expand' },
    { title: 'AI 缩写', icon: '✂️', desc: '精简提炼内容', isAi: true, aiAction: 'condense' },
    { title: 'AI 翻译', icon: '🌐', desc: '翻译为英文', isAi: true, aiAction: 'translate' },
    { title: 'AI 总结', icon: '📋', desc: '提取核心要点', isAi: true, aiAction: 'summarize' },
  ];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        underline: false,
        link: false,
      }),
      Placeholder.configure({
        placeholder,
      }),
      Highlight.configure({
        multicolor: true,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary-600 underline cursor-pointer',
        },
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      TextStyle,
      Color,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      if (showSlashMenu) {
        const { from } = editor.state.selection;
        const textBefore = editor.state.doc.textBetween(
          Math.max(0, from - 20), from, '\n'
        );
        const match = textBefore.match(/\/([^\s]*)$/);
        if (match) {
          setSlashFilter(match[1]);
        } else {
          setShowSlashMenu(false);
        }
      }
      const html = editor.getHTML();
      onChange(html);
      if (onWordCount) {
        const text = editor.getText();
        onWordCount(text.length);
      }
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-1 py-1',
      },
      handleKeyDown: (view, event) => {
        if (event.key === '/' && !showSlashMenu) {
          const { from } = view.state.selection;
          const coords = view.coordsAtPos(from);
          setSlashPosition({ top: coords.bottom + 8, left: coords.left });
          setShowSlashMenu(true);
          setSlashFilter('');
          return true;
        }
        if (showSlashMenu) {
          if (event.key === 'Escape') {
            setShowSlashMenu(false);
            return true;
          }
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            return true;
          }
        }
        return false;
      },
    },
  });

  // 同步外部内容变化
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    setShowLinkInput(prev => !prev);
    setLinkUrl(editor.getAttributes('link').href || '');
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    setShowImageInput(prev => !prev);
    setImageUrl('');
  }, [editor]);

  const handleAiCommand = useCallback(async (aiAction: string) => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, '\n');

    if (!selectedText.trim()) {
      alert('请先选中需要处理的文本');
      setShowSlashMenu(false);
      return;
    }

    setAiLoading(true);
    setShowSlashMenu(false);

    const prompts: Record<string, string> = {
      polish: `请润色以下文本，使其更加流畅优美，保持原意不变：\n\n${selectedText}`,
      rewrite: `请改写以下文本，用不同的表达方式重新表述：\n\n${selectedText}`,
      expand: `请扩写以下文本，添加更多细节和内容：\n\n${selectedText}`,
      condense: `请精简以下文本，保留核心要点，缩短到原来的三分之一：\n\n${selectedText}`,
      translate: `请将以下文本翻译为英文：\n\n${selectedText}`,
      summarize: `请总结以下文本的核心要点，用简洁的列表形式呈现：\n\n${selectedText}`,
    };

    try {
      const result = await chatWithAi({
        messages: [{ role: 'user', content: prompts[aiAction] }],
        systemPrompt: '你是一个专业的AI写作助手，请直接返回处理后的文本，不要添加任何解释或前缀。',
      });

      if (result.success && result.result) {
        editor.chain().focus().deleteSelection().insertContent(result.result).run();
      }
    } catch (err) {
      console.error('AI command failed:', err);
    } finally {
      setAiLoading(false);
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={`rich-text-editor ${className}`}>
      {/* 工具栏 */}
      {editable && (
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 rounded-t-xl">
          {/* 标题 */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              active={editor.isActive('heading', { level: 1 })}
              title="标题1"
            >
              H1
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              active={editor.isActive('heading', { level: 2 })}
              title="标题2"
            >
              H2
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              active={editor.isActive('heading', { level: 3 })}
              title="标题3"
            >
              H3
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* 文本格式 */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive('bold')}
              title="粗体 (Ctrl+B)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive('italic')}
              title="斜体 (Ctrl+I)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 4h4m-2 0l-4 16m0 0h4" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive('underline')}
              title="下划线 (Ctrl+U)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v7a5 5 0 0 0 10 0V4M5 20h14" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              active={editor.isActive('strike')}
              title="删除线"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5c0 0-4 2-4 4m4-4c0 0 4 2 4 4M12 19c0 0-4-2-4-4m4 4c0 0 4-2 4-4" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHighlight().run()}
              active={editor.isActive('highlight')}
              title="高亮"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* 表格和任务列表 */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              title="插入表格"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M3 6h18M3 18h18" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleTaskList().run()}
              active={editor.isActive('taskList')}
              title="任务列表"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* 对齐 */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              active={editor.isActive({ textAlign: 'left' })}
              title="左对齐"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h14" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              active={editor.isActive({ textAlign: 'center' })}
              title="居中"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M7 12h10M5 18h14" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              active={editor.isActive({ textAlign: 'right' })}
              title="右对齐"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M10 12h10M6 18h14" />
              </svg>
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* 列表 */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive('bulletList')}
              title="无序列表"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive('orderedList')}
              title="有序列表"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3 6h0M3 12h0M3 18h0" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive('blockquote')}
              title="引用"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              active={editor.isActive('codeBlock')}
              title="代码块"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* 插入 */}
          <ToolbarGroup>
            <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="插入链接">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </ToolbarButton>
            <ToolbarButton onClick={addImage} title="插入图片">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="分割线"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16" />
              </svg>
            </ToolbarButton>
          </ToolbarGroup>

          <ToolbarDivider />

          {/* 撤销/重做 */}
          <ToolbarGroup>
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              title="撤销 (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 0 1 5 5v2M3 10l4-4M3 10l4 4" />
              </svg>
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              title="重做 (Ctrl+Shift+Z)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 0 0-5 5v2m15-7l-4-4m4 4l-4 4" />
              </svg>
            </ToolbarButton>
          </ToolbarGroup>
        </div>
      )}

      {/* 链接输入栏 */}
      {showLinkInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="输入链接 URL..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && linkUrl) {
                editor.chain().focus().setLink({ href: linkUrl }).run();
                setShowLinkInput(false);
                setLinkUrl('');
              }
              if (e.key === 'Escape') {
                setShowLinkInput(false);
                setLinkUrl('');
              }
            }}
            autoFocus
          />
          <button onClick={() => { editor.chain().focus().setLink({ href: linkUrl }).run(); setShowLinkInput(false); setLinkUrl(''); }} className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">确认</button>
          <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); }} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">取消</button>
        </div>
      )}

      {/* 图片输入栏 */}
      {showImageInput && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  editor.chain().focus().setImage({ src: reader.result as string }).run();
                  setShowImageInput(false);
                };
                reader.readAsDataURL(file);
              }
            }}
          />
          <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">上传图片</button>
          <span className="text-gray-400 text-xs">或</span>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="输入图片 URL..."
            className="flex-1 px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && imageUrl) {
                editor.chain().focus().setImage({ src: imageUrl }).run();
                setShowImageInput(false);
                setImageUrl('');
              }
              if (e.key === 'Escape') { setShowImageInput(false); setImageUrl(''); }
            }}
          />
          <button onClick={() => { if (imageUrl) { editor.chain().focus().setImage({ src: imageUrl }).run(); } setShowImageInput(false); setImageUrl(''); }} className="px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700">插入</button>
        </div>
      )}

      {/* 编辑区域 */}
      <div
        className="min-h-[300px] max-h-[600px] overflow-y-auto px-4 py-3 bg-white dark:bg-gray-700 rounded-b-xl border border-t-0 border-gray-200 dark:border-gray-600 relative"
        onDrop={(e) => {
          e.preventDefault();
          const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
          files.forEach(file => {
            const reader = new FileReader();
            reader.onload = () => {
              editor.chain().focus().setImage({ src: reader.result as string }).run();
            };
            reader.readAsDataURL(file);
          });
        }}
        onPaste={(e) => {
          const items = Array.from(e.clipboardData.items).filter(item => item.type.startsWith('image/'));
          if (items.length > 0) {
            e.preventDefault();
            items.forEach(item => {
              const file = item.getAsFile();
              if (file) {
                const reader = new FileReader();
                reader.onload = () => {
                  editor.chain().focus().setImage({ src: reader.result as string }).run();
                };
                reader.readAsDataURL(file);
              }
            });
          }
        }}
      >
        <EditorContent editor={editor} />
        {/* 斜杠命令菜单 */}
        {showSlashMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowSlashMenu(false)} />
            <div
              ref={slashMenuRef}
              className="absolute z-20 w-64 max-h-72 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl py-2"
              style={{ top: slashPosition.top, left: slashPosition.left }}
            >
              <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">命令</div>
              {SLASH_COMMANDS
                .filter(cmd => cmd.title.toLowerCase().includes(slashFilter.toLowerCase()))
                .map((cmd, i) => {
                  const isDivider = cmd.isAi && i > 0 && !SLASH_COMMANDS[i - 1].isAi;
                  return (
                    <div key={cmd.title}>
                      {isDivider && (
                        <>
                          <div className="my-1 border-t border-gray-200 dark:border-gray-700" />
                          <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">AI 助手</div>
                        </>
                      )}
                      <button
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${i === 0 ? 'bg-gray-50 dark:bg-gray-750' : ''}`}
                        onClick={() => {
                          if (cmd.isAi && cmd.aiAction) {
                            handleAiCommand(cmd.aiAction);
                          } else if (cmd.action) {
                            cmd.action(editor);
                          }
                          setShowSlashMenu(false);
                        }}
                      >
                        <span className="w-8 h-8 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg text-xs font-bold text-gray-600 dark:text-gray-300">{cmd.icon}</span>
                        <div className="flex flex-col">
                          <span className="text-gray-700 dark:text-gray-200">{cmd.title}</span>
                          {cmd.desc && <span className="text-xs text-gray-400">{cmd.desc}</span>}
                        </div>
                      </button>
                    </div>
                  );
                })}
            </div>
          </>
        )}
        {aiLoading && (
          <div className="absolute inset-0 z-30 bg-white/60 dark:bg-gray-900/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-gray-700 dark:text-gray-300">AI 处理中...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 工具栏分组 */
function ToolbarGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

/** 工具栏分隔线 */
function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-1" />;
}

/** 工具栏按钮 */
function ToolbarButton({
  children,
  onClick,
  active = false,
  disabled = false,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded-md text-xs font-medium transition-all ${
        active
          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  );
}
