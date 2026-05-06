import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { chatWithAiStream, ChatMessage } from '../services/aiChat';
import {
  useCanvasStore,
  CanvasElement,
  CanvasToolType,
  ShapeType,
} from '../store/useCanvasStore';

// ============================================================
// Constants
// ============================================================

const COLORS = [
  '#d946ef', '#ec4899', '#f43f5e', '#f97316',
  '#eab308', '#22c55e', '#06b6d4', '#3b82f6',
  '#8b5cf6', '#ffffff', '#94a3b8', '#1e293b',
];

const STICKY_COLORS = [
  '#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca',
  '#e9d5ff', '#fed7aa', '#a5f3fc', '#fbcfe8',
];

const TOOL_ITEMS: { tool: CanvasToolType; icon: string; labelKey: string }[] = [
  { tool: 'select', icon: 'M4 4h2v2H4zM4 10h2v2H4zM4 16h2v2H4zM10 4h2v2h-2zM10 10h2v2h-2zM10 16h2v2h-2zM16 4h2v2h-2zM16 10h2v2h-2zM16 16h2v2h-2z', labelKey: 'canvas.tools.select' },
  { tool: 'pen', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z', labelKey: 'canvas.tools.pen' },
  { tool: 'eraser', icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16', labelKey: 'canvas.tools.eraser' },
  { tool: 'sticky', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z', labelKey: 'canvas.tools.sticky' },
  { tool: 'shape', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z', labelKey: 'canvas.tools.shape' },
  { tool: 'text', icon: 'M4 6h16M4 12h8m-8 6h16', labelKey: 'canvas.tools.text' },
  { tool: 'ai-assist', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z', labelKey: 'canvas.tools.aiAssist' },
];

// ============================================================
// Sub-components
// ============================================================

/** Tool icon rendered as SVG path */
function ToolIcon({ pathD, className }: { pathD: string; className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={pathD} />
    </svg>
  );
}

/** Left sidebar: canvas list + tool palette */
function LeftSidebar({
  collapsed,
}: {
  collapsed: boolean;
}) {
  const { t } = useTranslation();
  const {
    canvases,
    activeCanvasId,
    activeTool,
    createCanvas,
    renameCanvas,
    deleteCanvas,
    setActiveCanvas,
    setActiveTool,
  } = useCanvasStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const startRename = (id: string, name: string) => {
    setEditingId(id);
    setEditName(name);
  };

  const confirmRename = () => {
    if (editingId && editName.trim()) {
      renameCanvas(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const handleNewCanvas = () => {
    createCanvas();
  };

  return (
    <AnimatePresence>
      {!collapsed && (
        <motion.aside
          initial={{ x: -280, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -280, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-[260px] min-w-[260px] h-full flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Canvas list header */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('canvas.canvasList')}
              </h3>
              <button
                onClick={handleNewCanvas}
                className="p-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white hover:opacity-90 transition-opacity"
                title={t('canvas.newCanvas')}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            {/* Canvas list */}
            <div className="max-h-[180px] overflow-y-auto space-y-1">
              {canvases.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                  {t('canvas.noCanvas')}
                </p>
              )}
              {canvases.map((c) => (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer text-sm transition-colors ${
                    c.id === activeCanvasId
                      ? 'bg-gradient-to-r from-fuchsia-50 to-pink-50 dark:from-fuchsia-900/20 dark:to-pink-900/20 text-fuchsia-700 dark:text-fuchsia-300 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => setActiveCanvas(c.id)}
                >
                  {editingId === c.id ? (
                    <input
                      className="flex-1 bg-white dark:bg-gray-800 border border-fuchsia-300 rounded px-1 py-0.5 text-xs outline-none"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={confirmRename}
                      onKeyDown={(e) => e.key === 'Enter' && confirmRename()}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <>
                      <span className="flex-1 truncate">{c.name}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-fuchsia-600 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); startRename(c.id, c.name); }}
                        title={t('canvas.renameCanvas')}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-500 transition-opacity"
                        onClick={(e) => { e.stopPropagation(); deleteCanvas(c.id); }}
                        title={t('canvas.deleteCanvas')}
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tool palette */}
          <div className="p-3 flex-1 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              {t('canvas.tools.title')}
            </h3>
            <div className="grid grid-cols-4 gap-1.5">
              {TOOL_ITEMS.map(({ tool, icon, labelKey }) => (
                <button
                  key={tool}
                  className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                    activeTool === tool
                      ? 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white shadow-md'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => {
                    setActiveTool(tool);
                  }}
                  title={t(labelKey)}
                >
                  <ToolIcon pathD={icon} className="w-5 h-5" />
                  <span className="text-[10px] leading-tight">{t(labelKey)}</span>
                </button>
              ))}
            </div>

            {/* Shape sub-menu */}
            {activeTool === 'shape' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="mt-2 space-y-1"
              >
                {(['rect', 'circle', 'arrow'] as ShapeType[]).map((shape) => (
                  <button
                    key={shape}
                    className="w-full text-left px-3 py-1.5 text-xs rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    {shape === 'rect' ? 'Rectangle' : shape === 'circle' ? 'Circle' : 'Arrow'}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

/** Top toolbar */
function TopToolbar({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { t } = useTranslation();
  const {
    zoom,
    showGrid,
    snapToGrid,
    setZoom,
    toggleGrid,
    toggleSnapToGrid,
    undo,
    redo,
    canUndo,
    canRedo,
    exportCanvas,
    activeCanvasId,
    getActiveCanvas,
  } = useCanvasStore();

  const handleExport = () => {
    if (!activeCanvasId) return;
    const json = exportCanvas(activeCanvasId);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const canvas = getActiveCanvas();
    a.href = url;
    a.download = `${canvas?.name || 'canvas'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        useCanvasStore.getState().importCanvas(text);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return (
    <div className="h-12 flex items-center gap-2 px-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      {/* Undo / Redo */}
      <button
        onClick={undo}
        disabled={!canUndo()}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
        title={t('canvas.undo')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a5 5 0 015 5v2M3 10l4-4M3 10l4 4" />
        </svg>
      </button>
      <button
        onClick={redo}
        disabled={!canRedo()}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
        title={t('canvas.redo')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 10H11a5 5 0 00-5 5v2m15-7l-4-4m4 4l-4 4" />
        </svg>
      </button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      {/* Zoom */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setZoom(zoom - 0.1)}
          className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
        >
          -
        </button>
        <span className="text-xs text-gray-600 dark:text-gray-300 w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={() => setZoom(zoom + 0.1)}
          className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
        >
          +
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 text-xs"
        >
          1:1
        </button>
      </div>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-700" />

      {/* Grid toggle */}
      <button
        onClick={toggleGrid}
        className={`p-1.5 rounded-lg transition-colors ${
          showGrid
            ? 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600'
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title={t('canvas.grid')}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h16v16H4zM4 10h16M4 16h16M10 4v16M16 4v16" />
        </svg>
      </button>

      {/* Snap to grid */}
      <button
        onClick={toggleSnapToGrid}
        className={`p-1.5 rounded-lg transition-colors text-xs ${
          snapToGrid
            ? 'bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-600'
            : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
        title="Snap to Grid"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>

      <div className="flex-1" />

      {/* Import / Export */}
      <button
        onClick={handleImport}
        className="px-2 py-1 text-xs rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        {t('canvas.import')}
      </button>
      <button
        onClick={handleExport}
        className="px-3 py-1 text-xs rounded-lg bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white hover:opacity-90 transition-opacity"
      >
        {t('canvas.export')}
      </button>
    </div>
  );
}

/** Right panel: properties + AI assistant */
function RightPanel({ collapsed }: { collapsed: boolean }) {
  const { t } = useTranslation();
  const {
    activeColor,
    strokeWidth,
    opacity,
    setActiveColor,
    setStrokeWidth,
    setOpacity,
    getActiveElements,
    addElement,
  } = useCanvasStore();

  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const elements = getActiveElements();
  const selectedElements = elements; // In a full implementation, track selection state

  const handleAiAction = useCallback(
    async (action: 'expand' | 'organize' | 'concepts') => {
      if (aiLoading) return;

      const content = selectedElements
        .filter((el) => el.content)
        .map((el) => el.content)
        .join('\n');

      if (!content && !aiInput.trim()) return;

      const prompts: Record<string, string> = {
        expand: `Based on the following notes/content, expand and elaborate on the ideas with more details, examples, and depth:\n\n${content || aiInput}`,
        organize: `Organize and structure the following notes/content into a clear, logical format with categories and hierarchy:\n\n${content || aiInput}`,
        concepts: `Generate related concepts, ideas, and connections based on the following content. Present them as distinct points:\n\n${content || aiInput}`,
      };

      setAiLoading(true);
      setAiResult('');
      abortRef.current = new AbortController();

      try {
        const messages: ChatMessage[] = [
          { role: 'user', content: prompts[action] },
        ];
        const response = await chatWithAiStream(
          { messages, systemPrompt: 'You are a creative assistant helping with brainstorming and idea organization. Respond in the same language as the input.' },
          abortRef.current.signal
        );

        if (response.stream) {
          const reader = response.stream.getReader();
          let accumulated = '';
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += value;
            setAiResult(accumulated);
          }
          // Create a sticky note with the result
          if (accumulated.trim()) {
            addElement({
              type: 'ai-generated',
              x: 100 + Math.random() * 200,
              y: 100 + Math.random() * 200,
              width: 220,
              height: 160,
              content: accumulated.trim(),
              color: '#e9d5ff',
              opacity: 1,
              strokeWidth: 0,
            });
          }
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('AI assist error:', err);
        }
      } finally {
        setAiLoading(false);
        abortRef.current = null;
      }
    },
    [aiLoading, selectedElements, aiInput, addElement]
  );

  const handleStopAi = () => {
    abortRef.current?.abort();
  };

  if (collapsed) return null;

  return (
    <motion.aside
      initial={{ x: 280, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 280, opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="w-[260px] min-w-[260px] h-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 overflow-y-auto"
    >
      {/* Properties */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
          {t('canvas.properties')}
        </h3>

        {/* Color picker */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
            {t('canvas.color')}
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  activeColor === c ? 'border-fuchsia-500 scale-110' : 'border-gray-300 dark:border-gray-600'
                }`}
                style={{ backgroundColor: c }}
                onClick={() => setActiveColor(c)}
              />
            ))}
          </div>
        </div>

        {/* Stroke width */}
        <div className="mb-3">
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
            {t('canvas.strokeWidth')}: {strokeWidth}px
          </label>
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(Number(e.target.value))}
            className="w-full accent-fuchsia-500"
          />
        </div>

        {/* Opacity */}
        <div>
          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
            {t('canvas.opacity')}: {Math.round(opacity * 100)}%
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            className="w-full accent-fuchsia-500"
          />
        </div>
      </div>

      {/* AI Assistant panel */}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center gap-1.5">
          <svg className="w-4 h-4 text-fuchsia-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          {t('canvas.aiAssistTitle')}
        </h3>

        {/* Quick actions */}
        <div className="space-y-1.5 mb-3">
          <button
            onClick={() => handleAiAction('expand')}
            disabled={aiLoading}
            className="w-full text-left px-3 py-2 text-xs rounded-lg bg-fuchsia-50 dark:bg-fuchsia-900/20 text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/30 transition-colors disabled:opacity-50"
          >
            {t('canvas.aiExpand')}
          </button>
          <button
            onClick={() => handleAiAction('organize')}
            disabled={aiLoading}
            className="w-full text-left px-3 py-2 text-xs rounded-lg bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-900/30 transition-colors disabled:opacity-50"
          >
            {t('canvas.aiOrganize')}
          </button>
          <button
            onClick={() => handleAiAction('concepts')}
            disabled={aiLoading}
            className="w-full text-left px-3 py-2 text-xs rounded-lg bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors disabled:opacity-50"
          >
            {t('canvas.aiConcepts')}
          </button>
        </div>

        {/* AI Input */}
        <div className="relative mb-2">
          <textarea
            className="w-full p-2 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 resize-none outline-none focus:border-fuchsia-400 transition-colors"
            rows={3}
            placeholder={t('canvas.aiAssistPlaceholder')}
            value={aiInput}
            onChange={(e) => setAiInput(e.target.value)}
          />
        </div>

        {/* AI Result */}
        {aiResult && (
          <div className="flex-1 overflow-y-auto mb-2 p-2 text-xs rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {aiResult}
          </div>
        )}

        {aiLoading && (
          <div className="flex items-center gap-2">
            <div className="animate-spin w-3 h-3 border-2 border-fuchsia-500 border-t-transparent rounded-full" />
            <span className="text-xs text-gray-500">Generating...</span>
            <button
              onClick={handleStopAi}
              className="ml-auto text-xs text-red-500 hover:text-red-600"
            >
              Stop
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}

/** Minimap in bottom-right corner */
function MinimapInner({
  canvasRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) {
  const { t } = useTranslation();
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const { zoom, panOffset, getActiveElements } = useCanvasStore();
  const elements = getActiveElements();

  useEffect(() => {
    const minimap = minimapRef.current;
    const mainCanvas = canvasRef.current;
    if (!minimap || !mainCanvas) return;

    const ctx = minimap.getContext('2d');
    if (!ctx) return;

    const mw = minimap.width;
    const mh = minimap.height;
    ctx.clearRect(0, 0, mw, mh);

    // Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, mw, mh);

    // Scale factor
    const scaleX = mw / (mainCanvas.width / zoom);
    const scaleY = mh / (mainCanvas.height / zoom);
    const scale = Math.min(scaleX, scaleY) * 0.8;

    const offsetX = (mw - (mainCanvas.width / zoom) * scale) / 2;
    const offsetY = (mh - (mainCanvas.height / zoom) * scale) / 2;

    // Draw elements
    elements.forEach((el) => {
      const x = (el.x + panOffset.x / zoom) * scale + offsetX;
      const y = (el.y + panOffset.y / zoom) * scale + offsetY;

      ctx.fillStyle = el.color + '80';
      if (el.type === 'sticky' || el.type === 'ai-generated') {
        const w = ((el.width || 160) * scale);
        const h = ((el.height || 120) * scale);
        ctx.fillRect(x, y, Math.max(w, 4), Math.max(h, 3));
      } else if (el.type === 'shape') {
        const w = ((el.width || 100) * scale);
        const h = ((el.height || 80) * scale);
        ctx.fillRect(x, y, Math.max(w, 4), Math.max(h, 3));
      } else if (el.type === 'path' && el.points) {
        ctx.beginPath();
        el.points.forEach((pt, i) => {
          const px = (pt.x + panOffset.x / zoom) * scale + offsetX;
          const py = (pt.y + panOffset.y / zoom) * scale + offsetY;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = el.color + '80';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // Viewport indicator
    const vpX = (-panOffset.x / zoom) * scale + offsetX;
    const vpY = (-panOffset.y / zoom) * scale + offsetY;
    const vpW = (mainCanvas.clientWidth / zoom) * scale;
    const vpH = (mainCanvas.clientHeight / zoom) * scale;
    ctx.strokeStyle = '#d946ef';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vpX, vpY, vpW, vpH);
  }, [elements, zoom, panOffset, canvasRef]);

  return (
    <div className="absolute bottom-3 right-3 w-[140px] h-[100px] rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden">
      <canvas
        ref={minimapRef}
        width={280}
        height={200}
        className="w-full h-full"
      />
      <div className="absolute top-1 left-1.5 text-[9px] text-gray-400 font-medium">
        {t('canvas.minimap')}
      </div>
    </div>
  );
}

// ============================================================
// Main Canvas Drawing Component
// ============================================================

function DrawingCanvas({
  canvasRef,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}) {
  const {
    activeTool,
    activeColor,
    strokeWidth,
    opacity,
    zoom,
    panOffset,
    showGrid,
    snapToGrid,
    gridSize,
    getActiveElements,
    addElement,
    removeElement,
    pushHistory,
  } = useCanvasStore();

  const [isDrawing, setIsDrawing] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrent, setDragCurrent] = useState<{ x: number; y: number } | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textInputPos, setTextInputPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const elements = getActiveElements();
  const animFrameRef = useRef<number>(0);
  const lastPanPos = useRef<{ x: number; y: number } | null>(null);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const x = (screenX - rect.left - panOffset.x) / zoom;
      const y = (screenY - rect.top - panOffset.y) / zoom;
      if (snapToGrid) {
        return {
          x: Math.round(x / gridSize) * gridSize,
          y: Math.round(y / gridSize) * gridSize,
        };
      }
      return { x, y };
    },
    [panOffset, zoom, snapToGrid, gridSize, canvasRef]
  );

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, rect.width, rect.height);

    // Background
    ctx.fillStyle = '#fafafa';
    ctx.fillRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom);

    // Grid
    if (showGrid) {
      const gs = gridSize;
      const startX = Math.floor(-panOffset.x / zoom / gs) * gs - gs;
      const startY = Math.floor(-panOffset.y / zoom / gs) * gs - gs;
      const endX = startX + rect.width / zoom + gs * 2;
      const endY = startY + rect.height / zoom + gs * 2;

      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 0.5 / zoom;
      ctx.beginPath();
      for (let x = startX; x <= endX; x += gs) {
        ctx.moveTo(x, startY);
        ctx.lineTo(x, endY);
      }
      for (let y = startY; y <= endY; y += gs) {
        ctx.moveTo(startX, y);
        ctx.lineTo(endX, y);
      }
      ctx.stroke();
    }

    // Draw elements
    elements.forEach((el) => {
      ctx.globalAlpha = el.opacity ?? 1;

      if (el.type === 'path' && el.points && el.points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.strokeWidth ?? 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        el.points.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
      } else if (el.type === 'sticky' || el.type === 'ai-generated') {
        const w = el.width || 180;
        const h = el.height || 140;
        // Shadow
        ctx.shadowColor = 'rgba(0,0,0,0.1)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 2;
        // Background
        ctx.fillStyle = el.color;
        ctx.beginPath();
        ctx.roundRect(el.x, el.y, w, h, 4);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        // Border
        ctx.strokeStyle = el.type === 'ai-generated' ? '#d946ef' : 'rgba(0,0,0,0.1)';
        ctx.lineWidth = el.type === 'ai-generated' ? 2 : 1;
        ctx.stroke();
        // Text
        if (el.content) {
          ctx.fillStyle = '#1e293b';
          ctx.font = `${12}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          const lines = wrapText(ctx, el.content, w - 16);
          lines.slice(0, 8).forEach((line, i) => {
            ctx.fillText(line, el.x + 8, el.y + 20 + i * 16);
          });
          if (lines.length > 8) {
            ctx.fillStyle = '#94a3b8';
            ctx.fillText('...', el.x + 8, el.y + 20 + 8 * 16);
          }
        }
        // AI badge
        if (el.type === 'ai-generated') {
          ctx.fillStyle = '#d946ef';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('AI', el.x + w - 22, el.y + 14);
        }
      } else if (el.type === 'shape') {
        ctx.strokeStyle = el.color;
        ctx.lineWidth = el.strokeWidth ?? 2;
        ctx.fillStyle = el.color + '20';

        if (el.shapeType === 'rect') {
          const w = el.width || 100;
          const h = el.height || 80;
          ctx.fillRect(el.x, el.y, w, h);
          ctx.strokeRect(el.x, el.y, w, h);
        } else if (el.shapeType === 'circle') {
          const rx = (el.width || 100) / 2;
          const ry = (el.height || 100) / 2;
          ctx.beginPath();
          ctx.ellipse(el.x + rx, el.y + ry, rx, ry, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else if (el.shapeType === 'arrow') {
          const w = el.width || 120;
          ctx.beginPath();
          ctx.moveTo(el.x, el.y);
          ctx.lineTo(el.x + w, el.y);
          ctx.stroke();
          // Arrow head
          ctx.beginPath();
          ctx.moveTo(el.x + w, el.y);
          ctx.lineTo(el.x + w - 10, el.y - 6);
          ctx.lineTo(el.x + w - 10, el.y + 6);
          ctx.closePath();
          ctx.fillStyle = el.color;
          ctx.fill();
        }
      } else if (el.type === 'text') {
        if (el.content) {
          ctx.fillStyle = el.color;
          ctx.font = `${14}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
          ctx.fillText(el.content, el.x, el.y + 14);
        }
      }

      ctx.globalAlpha = 1;
    });

    // Draw current path (while drawing)
    if (isDrawing && currentPath.length > 1 && activeTool === 'pen') {
      ctx.beginPath();
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = opacity;
      currentPath.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Draw shape preview (while dragging)
    if (isDrawing && dragStart && dragCurrent && activeTool === 'shape') {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);

      ctx.strokeStyle = activeColor;
      ctx.lineWidth = strokeWidth;
      ctx.fillStyle = activeColor + '20';
      ctx.globalAlpha = opacity;

      // Default to rect for preview
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);
      ctx.fillRect(x, y, w, h);
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, [elements, currentPath, isDrawing, dragStart, dragCurrent, activeTool, activeColor, strokeWidth, opacity, zoom, panOffset, showGrid, gridSize, canvasRef]);

  // Animation loop for smooth rendering
  useEffect(() => {
    const render = () => {
      redraw();
      animFrameRef.current = requestAnimationFrame(render);
    };
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [redraw]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => redraw();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redraw]);

  // Mouse/touch handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const pos = screenToCanvas(e.clientX, e.clientY);

      // Middle mouse button or space+click for panning
      if (e.button === 1) {
        setIsPanning(true);
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (activeTool === 'pen') {
        setIsDrawing(true);
        setCurrentPath([pos]);
        pushHistory();
      } else if (activeTool === 'eraser') {
        // Find element under cursor and remove it
        const clicked = findElementAt(elements, pos);
        if (clicked) {
          pushHistory();
          removeElement(clicked.id);
        }
      } else if (activeTool === 'sticky') {
        pushHistory();
        const color = STICKY_COLORS[Math.floor(Math.random() * STICKY_COLORS.length)];
        addElement({
          type: 'sticky',
          x: pos.x - 90,
          y: pos.y - 70,
          width: 180,
          height: 140,
          content: '',
          color,
          opacity: 1,
          strokeWidth: 0,
        });
      } else if (activeTool === 'shape') {
        setIsDrawing(true);
        setDragStart(pos);
        setDragCurrent(pos);
        pushHistory();
      } else if (activeTool === 'text') {
        setEditingTextId('new');
        setTextInput('');
        setTextInputPos(pos);
      } else if (activeTool === 'select') {
        // Start panning with left mouse in select mode
        setIsPanning(true);
        lastPanPos.current = { x: e.clientX, y: e.clientY };
      }
    },
    [activeTool, screenToCanvas, pushHistory, addElement, removeElement, elements]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (isPanning && lastPanPos.current) {
        const dx = e.clientX - lastPanPos.current.x;
        const dy = e.clientY - lastPanPos.current.y;
        useCanvasStore.getState().setPanOffset({
          x: panOffset.x + dx,
          y: panOffset.y + dy,
        });
        lastPanPos.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if (!isDrawing) return;

      const pos = screenToCanvas(e.clientX, e.clientY);

      if (activeTool === 'pen') {
        setCurrentPath((prev) => [...prev, pos]);
      } else if (activeTool === 'shape' && dragStart) {
        setDragCurrent(pos);
      }
    },
    [isPanning, isDrawing, activeTool, dragStart, panOffset, screenToCanvas]
  );

  const handlePointerUp = useCallback(() => {
    if (isPanning) {
      setIsPanning(false);
      lastPanPos.current = null;
      return;
    }

    if (!isDrawing) return;

    if (activeTool === 'pen' && currentPath.length > 1) {
      addElement({
        type: 'path',
        x: 0,
        y: 0,
        color: activeColor,
        points: currentPath,
        opacity,
        strokeWidth,
      });
    } else if (activeTool === 'shape' && dragStart && dragCurrent) {
      const x = Math.min(dragStart.x, dragCurrent.x);
      const y = Math.min(dragStart.y, dragCurrent.y);
      const w = Math.abs(dragCurrent.x - dragStart.x);
      const h = Math.abs(dragCurrent.y - dragStart.y);
      if (w > 5 || h > 5) {
        // Determine shape type based on aspect ratio (simple heuristic)
        let shapeType: ShapeType = 'rect';
        if (w < 10 && h > 20) {
          shapeType = 'arrow';
        } else if (Math.abs(w - h) < Math.max(w, h) * 0.3) {
          shapeType = 'circle';
        }
        addElement({
          type: 'shape',
          x,
          y,
          width: w,
          height: h,
          color: activeColor,
          shapeType,
          opacity,
          strokeWidth,
        });
      }
    }

    setIsDrawing(false);
    setCurrentPath([]);
    setDragStart(null);
    setDragCurrent(null);
  }, [isPanning, isDrawing, activeTool, currentPath, dragStart, dragCurrent, activeColor, opacity, strokeWidth, addElement]);

  // Wheel zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        const newZoom = Math.max(0.1, Math.min(5, zoom + delta));
        useCanvasStore.getState().setZoom(newZoom);
      } else {
        useCanvasStore.getState().setPanOffset({
          x: panOffset.x - e.deltaX,
          y: panOffset.y - e.deltaY,
        });
      }
    },
    [zoom, panOffset]
  );

  // Handle text input confirm
  const handleTextConfirm = useCallback(() => {
    if (textInput.trim() && editingTextId === 'new') {
      addElement({
        type: 'text',
        x: textInputPos.x,
        y: textInputPos.y,
        content: textInput.trim(),
        color: activeColor,
        opacity,
        strokeWidth: 0,
      });
    }
    setEditingTextId(null);
    setTextInput('');
  }, [textInput, editingTextId, textInputPos, activeColor, opacity, addElement]);

  return (
    <div className="relative flex-1 overflow-hidden bg-gray-50 dark:bg-gray-950">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        style={{ touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Text input overlay */}
      {editingTextId === 'new' && (
        <div
          className="absolute z-10"
          style={{
            left: textInputPos.x * zoom + panOffset.x,
            top: textInputPos.y * zoom + panOffset.y,
          }}
        >
          <input
            className="bg-transparent border-b-2 border-fuchsia-500 outline-none text-gray-800 dark:text-gray-200 text-sm min-w-[100px]"
            style={{ fontSize: 14 * zoom }}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTextConfirm();
              if (e.key === 'Escape') setEditingTextId(null);
            }}
            onBlur={handleTextConfirm}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split('\n');
  paragraphs.forEach((para) => {
    if (!para) {
      lines.push('');
      return;
    }
    let current = '';
    for (let i = 0; i < para.length; i++) {
      const test = current + para[i];
      if (ctx.measureText(test).width > maxWidth) {
        lines.push(current);
        current = para[i];
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
  });
  return lines;
}

function findElementAt(
  elements: CanvasElement[],
  pos: { x: number; y: number }
): CanvasElement | null {
  // Search in reverse (top-most first)
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.type === 'sticky' || el.type === 'ai-generated') {
      const w = el.width || 180;
      const h = el.height || 140;
      if (pos.x >= el.x && pos.x <= el.x + w && pos.y >= el.y && pos.y <= el.y + h) {
        return el;
      }
    } else if (el.type === 'shape') {
      const w = el.width || 100;
      const h = el.height || 80;
      if (pos.x >= el.x && pos.x <= el.x + w && pos.y >= el.y && pos.y <= el.y + h) {
        return el;
      }
    } else if (el.type === 'text') {
      if (el.content) {
        const textW = el.content.length * 8;
        if (pos.x >= el.x && pos.x <= el.x + textW && pos.y >= el.y - 14 && pos.y <= el.y) {
          return el;
        }
      }
    } else if (el.type === 'path' && el.points) {
      for (const pt of el.points) {
        const dx = pos.x - pt.x;
        const dy = pos.y - pt.y;
        if (dx * dx + dy * dy < 100) return el;
      }
    }
  }
  return null;
}

// ============================================================
// Main Page Component
// ============================================================

export default function AiCanvas() {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const { activeCanvasId, createCanvas, canvases } = useCanvasStore();

  // Create initial canvas if none exists
  useEffect(() => {
    if (canvases.length === 0) {
      createCanvas(t('canvas.newCanvas'));
    } else if (!activeCanvasId) {
      useCanvasStore.getState().setActiveCanvas(canvases[0].id);
    }
  }, [canvases.length, activeCanvasId, createCanvas, t]);

  // Responsive: collapse sidebars on small screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
        setRightPanelCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Top toolbar */}
      <TopToolbar onToggleSidebar={() => setSidebarCollapsed((p) => !p)} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <AnimatePresence>
          <LeftSidebar
            collapsed={sidebarCollapsed}
          />
        </AnimatePresence>

        {/* Canvas area */}
        <div className="flex-1 relative">
          <DrawingCanvas canvasRef={canvasRef} />

          {/* Minimap */}
          <MinimapInner canvasRef={canvasRef} />

          {/* Mobile sidebar toggles */}
          {sidebarCollapsed && (
            <button
              className="absolute top-3 left-3 z-10 p-2 rounded-lg bg-white/80 dark:bg-gray-900/80 shadow-md text-gray-600 dark:text-gray-400 md:hidden"
              onClick={() => setSidebarCollapsed(false)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          )}

          {rightPanelCollapsed && (
            <button
              className="absolute top-3 right-3 z-10 p-2 rounded-lg bg-white/80 dark:bg-gray-900/80 shadow-md text-gray-600 dark:text-gray-400 md:hidden"
              onClick={() => setRightPanelCollapsed(false)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}

          {/* Right panel toggle for desktop */}
          <button
            className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/80 dark:bg-gray-900/80 shadow text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors hidden md:block"
            onClick={() => setRightPanelCollapsed((p) => !p)}
            title={t('canvas.properties')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </button>
        </div>

        {/* Right panel */}
        <AnimatePresence>
          <RightPanel collapsed={rightPanelCollapsed} />
        </AnimatePresence>
      </div>
    </div>
  );
}
