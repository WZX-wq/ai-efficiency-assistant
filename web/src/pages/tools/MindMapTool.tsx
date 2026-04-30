import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../components/SeoHead';
import { chatWithAiStream } from '../../services/aiChat';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ToastProvider';

// ============================================================
// Types
// ============================================================

interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  color?: string;
}

type MapType = 'brainstorm' | 'flowchart' | 'knowledge' | 'swot' | 'project';
type ViewMode = 'visual' | 'outline';

// ============================================================
// Constants
// ============================================================

const BRANCH_COLORS = [
  '#f59e0b', // amber
  '#3b82f6', // blue
  '#10b981', // emerald
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
];

const MAP_TYPES: { key: MapType; label: string; desc: string }[] = [
  { key: 'brainstorm', label: '思维发散', desc: '从中心主题向外发散' },
  { key: 'flowchart', label: '流程图', desc: '步骤化流程展示' },
  { key: 'knowledge', label: '知识框架', desc: '分类知识结构' },
  { key: 'swot', label: 'SWOT分析', desc: '优势/劣势/机会/威胁' },
  { key: 'project', label: '项目规划', desc: '阶段任务里程碑' },
];

const TIPS = [
  '主题越具体，生成的思维导图越精准',
  '选择合适的导图类型能获得更结构化的结果',
  '点击节点可以展开/折叠子分支',
  '深度越大，内容越详细，生成时间越长',
];

const RELATED = [
  { to: '/workspace/creative', label: '创意灵感' },
  { to: '/workspace/copywriting', label: '文案生成器' },
  { to: '/workspace/longform', label: '长文写作' },
];

// ============================================================
// Helpers
// ============================================================

let nodeIdCounter = 0;
function genId(): string {
  return `n_${++nodeIdCounter}`;
}

function parseMarkdownToTree(md: string): MindMapNode | null {
  const lines = md.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return null;

  const root: MindMapNode = { id: genId(), text: '', children: [] };
  const stack: { node: MindMapNode; level: number }[] = [];
  let rootSet = false;

  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)/);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].trim();
    if (!text) continue;

    const node: MindMapNode = { id: genId(), text, children: [] };

    if (level === 1 && !rootSet) {
      root.text = text;
      root.id = node.id;
      rootSet = true;
      stack.length = 0;
      stack.push({ node: root, level: 1 });
      continue;
    }

    // Pop stack until we find a parent with lower level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length > 0) {
      stack[stack.length - 1].node.children.push(node);
    } else if (!rootSet) {
      root.text = text;
      root.id = node.id;
      rootSet = true;
    }

    stack.push({ node, level });
  }

  if (!rootSet) return null;

  // Assign colors to top-level branches
  root.children.forEach((child, i) => {
    assignColor(child, BRANCH_COLORS[i % BRANCH_COLORS.length]);
  });

  return root;
}

function assignColor(node: MindMapNode, color: string) {
  node.color = color;
  node.children.forEach((child) => assignColor(child, color));
}

function treeToMarkdown(node: MindMapNode, level: number = 1): string {
  const prefix = '#'.repeat(level);
  let md = `${prefix} ${node.text}\n`;
  for (const child of node.children) {
    md += treeToMarkdown(child, level + 1);
  }
  return md;
}

function countNodes(node: MindMapNode): number {
  return 1 + node.children.reduce((sum, c) => sum + countNodes(c), 0);
}

function getSystemPrompt(mapType: MapType, depth: number): string {
  const depthNote = `请生成 ${depth} 层深度的内容。`;

  const typeInstructions: Record<MapType, string> = {
    brainstorm: `你是一个专业的思维导图生成专家。请根据用户提供的主题，生成一个发散式思维导图。

要求：
- 使用 Markdown 标题格式（# 表示中心主题，## 表示主要分支，### 表示子分支，#### 表示更深层）
- # 一级标题是中心主题
- ## 二级标题是 4-6 个主要分支方向
- ### 三级标题是每个分支下的 2-4 个子主题
- ${depth >= 4 ? '#### 四级标题是更细化的要点\n' : ''}
${depthNote}
- 每个节点文字简洁，不超过15个字
- 只输出 Markdown 标题，不要输出其他任何内容`,

    flowchart: `你是一个专业的流程图生成专家。请根据用户提供的主题，生成一个步骤化的流程导图。

要求：
- 使用 Markdown 标题格式
- # 一级标题是流程主题
- ## 二级标题是主要阶段/步骤（按顺序排列）
- ### 三级标题是每个步骤下的具体操作/要点
- ${depth >= 4 ? '#### 四级标题是更细化的子步骤\n' : ''}
${depthNote}
- 步骤之间有逻辑顺序
- 每个节点文字简洁，不超过15个字
- 只输出 Markdown 标题，不要输出其他任何内容`,

    knowledge: `你是一个专业的知识框架生成专家。请根据用户提供的主题，生成一个结构化的知识导图。

要求：
- 使用 Markdown 标题格式
- # 一级标题是知识主题
- ## 二级标题是主要知识分类（4-6个）
- ### 三级标题是每个分类下的核心概念
- ${depth >= 4 ? '#### 四级标题是关键细节/例子\n' : ''}
${depthNote}
- 结构清晰，分类合理
- 每个节点文字简洁，不超过15个字
- 只输出 Markdown 标题，不要输出其他任何内容`,

    swot: `你是一个专业的SWOT分析专家。请根据用户提供的主题，生成一个SWOT分析导图。

要求：
- 使用 Markdown 标题格式
- # 一级标题是分析主题
- ## 二级标题必须是以下四个：优势 (Strengths)、劣势 (Weaknesses)、机会 (Opportunities)、威胁 (Threats)
- ### 三级标题是每个SWOT维度下的 3-4 个具体要点
- ${depth >= 4 ? '#### 四级标题是每个要点的详细说明\n' : ''}
${depthNote}
- 分析客观全面
- 每个节点文字简洁，不超过15个字
- 只输出 Markdown 标题，不要输出其他任何内容`,

    project: `你是一个专业的项目规划专家。请根据用户提供的主题，生成一个项目规划导图。

要求：
- 使用 Markdown 标题格式
- # 一级标题是项目名称
- ## 二级标题是项目阶段（如：启动阶段、规划阶段、执行阶段、收尾阶段）
- ### 三级标题是每个阶段下的关键任务/里程碑
- ${depth >= 4 ? '#### 四级标题是具体行动项\n' : ''}
${depthNote}
- 规划合理，可执行性强
- 每个节点文字简洁，不超过15个字
- 只输出 Markdown 标题，不要输出其他任何内容`,
  };

  return typeInstructions[mapType];
}

// ============================================================
// Tree Node Component (Visual)
// ============================================================

function TreeNode({
  node,
  collapsed,
  onToggle,
  onExpand,
  isRoot = false,
}: {
  node: MindMapNode;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onExpand: (node: MindMapNode) => void;
  isRoot?: boolean;
}) {
  const isCollapsed = collapsed.has(node.id);
  const hasChildren = node.children.length > 0;
  const borderColor = node.color || BRANCH_COLORS[0];

  return (
    <li className="relative">
      <div
        className={`
          group relative rounded-lg border transition-all duration-200 cursor-pointer select-none
          ${isRoot
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30 px-5 py-3 text-base font-bold'
            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200'
          }
        `}
        style={!isRoot ? { borderLeftWidth: '3px', borderLeftColor: borderColor } : undefined}
        onClick={() => hasChildren && onToggle(node.id)}
      >
        <div className="flex items-center gap-2">
          {hasChildren && (
            <svg
              className={`w-3.5 h-3.5 shrink-0 transition-transform duration-200 ${isCollapsed ? '' : 'rotate-90'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          )}
          {!hasChildren && <span className="w-3.5 shrink-0" />}
          <span className="flex-1 truncate">{node.text}</span>
          {!isRoot && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExpand(node);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 text-xs rounded bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 shrink-0"
              title="展开此节点"
            >
              +AI
            </button>
          )}
        </div>
      </div>
      {hasChildren && !isCollapsed && (
        <ul className="mt-1.5 ml-4 border-l-2 border-gray-200 dark:border-gray-700 pl-3 space-y-1.5">
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              collapsed={collapsed}
              onToggle={onToggle}
              onExpand={onExpand}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// ============================================================
// Outline View Component
// ============================================================

function OutlineNode({ node, level = 1 }: { node: MindMapNode; level?: number }) {
  const borderColor = node.color || BRANCH_COLORS[0];
  const indent = (level - 1) * 20;

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: borderColor }}
        />
        <span
          className={`text-gray-800 dark:text-gray-200 ${
            level === 1 ? 'font-bold text-base' : level === 2 ? 'font-semibold text-sm' : 'text-sm'
          }`}
        >
          {node.text}
        </span>
      </div>
      {node.children.map((child) => (
        <OutlineNode key={child.id} node={child} level={level + 1} />
      ))}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function MindMapTool() {
  useSeo('mindmap');
  const { addRecentTool, incrementActions } = useAppStore();
  const { toast } = useToast();

  const [topic, setTopic] = useState('');
  const [mapType, setMapType] = useState<MapType>('brainstorm');
  const [depth, setDepth] = useState(3);
  const [viewMode, setViewMode] = useState<ViewMode>('visual');
  const [tree, setTree] = useState<MindMapNode | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [zoom, setZoom] = useState(100);
  const abortRef = useRef<AbortController | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // Track tool usage
  useEffect(() => {
    addRecentTool('mindmap');
  }, [addRecentTool]);

  const toggleCollapse = useCallback((id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const expandNode = useCallback(
    async (node: MindMapNode) => {
      if (!topic.trim()) return;
      setLoading(true);
      try {
        const controller = new AbortController();
        abortRef.current = controller;

        const prompt = `请对以下思维导图节点进行扩展，生成3-4个子主题。只输出Markdown标题格式，## 为父节点，### 为子节点。\n\n## ${node.text}`;
        const res = await chatWithAiStream(
          { messages: [{ role: 'user', content: prompt }] },
          controller.signal,
        );

        if (!res.success || !res.stream) {
          toast(res.error || '扩展失败', 'error');
          return;
        }

        let fullText = '';
        const reader = res.stream.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += value;
        }

        // Parse the expanded nodes
        const lines = fullText.split('\n').filter((l) => l.trim());
        const newChildren: MindMapNode[] = [];
        for (const line of lines) {
          const match = line.match(/^###\s+(.+)/);
          if (match) {
            newChildren.push({
              id: genId(),
              text: match[1].trim(),
              children: [],
              color: node.color || BRANCH_COLORS[0],
            });
          }
        }

        if (newChildren.length > 0) {
          const updateTree = (n: MindMapNode): MindMapNode => {
            if (n.id === node.id) {
              return { ...n, children: [...n.children, ...newChildren] };
            }
            return { ...n, children: n.children.map(updateTree) };
          };
          setTree((prev) => (prev ? updateTree(prev) : prev));
          incrementActions();
          toast('节点已扩展', 'success');
        }
      } catch {
        // aborted
      } finally {
        setLoading(false);
      }
    },
    [topic, toast, incrementActions],
  );

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      toast('请输入主题', 'warning');
      return;
    }

    setLoading(true);
    setTree(null);
    setStreamingText('');
    setCollapsed(new Set());
    setZoom(100);

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const systemPrompt = getSystemPrompt(mapType, depth);
      const res = await chatWithAiStream(
        {
          messages: [{ role: 'user', content: topic }],
          systemPrompt,
          temperature: 0.7,
          maxTokens: 4096,
        },
        controller.signal,
      );

      if (!res.success || !res.stream) {
        toast(res.error || '生成失败', 'error');
        return;
      }

      let fullText = '';
      const reader = res.stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += value;
        setStreamingText(fullText);
      }

      const parsed = parseMarkdownToTree(fullText);
      if (parsed) {
        setTree(parsed);
        incrementActions();
        toast(`已生成 ${countNodes(parsed)} 个节点的思维导图`, 'success');
      } else {
        toast('AI 返回的内容格式异常，请重试', 'warning');
      }
    } catch {
      // aborted
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  }, [topic, mapType, depth, toast, incrementActions]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const handleCopyMarkdown = useCallback(() => {
    if (!tree) return;
    const md = treeToMarkdown(tree);
    navigator.clipboard.writeText(md).then(
      () => toast('已复制为 Markdown', 'success'),
      () => toast('复制失败', 'error'),
    );
  }, [tree, toast]);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(z + 10, 200)), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(z - 10, 50)), []);
  const handleZoomReset = useCallback(() => setZoom(100), []);

  const hasContent = tree !== null || streamingText;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-orange-100/60 via-amber-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-orange-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-orange-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">思维导图</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent">
              AI 思维导图
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            输入主题，AI 自动生成结构化思维导图，支持多种导图类型和深度控制
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - Input & Options */}
            <div className="lg:col-span-4 space-y-4">
              {/* Topic Input */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  中心主题
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
                  placeholder="例如：人工智能发展趋势、创业计划、项目管理..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                  disabled={loading}
                />

                {/* Map Type Selection */}
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mt-5 mb-2">
                  导图类型
                </label>
                <div className="flex flex-wrap gap-2">
                  {MAP_TYPES.map((mt) => (
                    <button
                      key={mt.key}
                      onClick={() => setMapType(mt.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        mapType === mt.key
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                      disabled={loading}
                      title={mt.desc}
                    >
                      {mt.label}
                    </button>
                  ))}
                </div>

                {/* Depth Control */}
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mt-5 mb-2">
                  展开深度: <span className="text-orange-500">{depth}</span> 层
                </label>
                <input
                  type="range"
                  min={2}
                  max={4}
                  value={depth}
                  onChange={(e) => setDepth(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                  disabled={loading}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>简洁</span>
                  <span>详细</span>
                </div>

                {/* Generate Button */}
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={loading ? handleStop : handleGenerate}
                    disabled={!topic.trim() && !loading}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                      loading
                        ? 'bg-red-500 hover:bg-red-600 text-white'
                        : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-200 dark:shadow-orange-900/30 disabled:opacity-50 disabled:cursor-not-allowed'
                    }`}
                  >
                    {loading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        停止生成
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                        </svg>
                        生成思维导图
                      </>
                    )}
                  </button>
                  {tree && (
                    <button
                      onClick={handleGenerate}
                      className="px-3 py-3 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      title="重新生成"
                      disabled={loading}
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Examples */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  快速试试
                </h3>
                <div className="space-y-2">
                  {[
                    { label: '人工智能发展趋势', type: 'brainstorm' as MapType },
                    { label: 'SWOT分析：新能源汽车', type: 'swot' as MapType },
                    { label: '产品上线项目规划', type: 'project' as MapType },
                    { label: '机器学习知识框架', type: 'knowledge' as MapType },
                  ].map((ex) => (
                    <button
                      key={ex.label}
                      onClick={() => {
                        setTopic(ex.label);
                        setMapType(ex.type);
                      }}
                      disabled={loading}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {ex.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Panel - Mind Map Visualization */}
            <div className="lg:col-span-8">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('visual')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        viewMode === 'visual'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      可视化
                    </button>
                    <button
                      onClick={() => setViewMode('outline')}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        viewMode === 'outline'
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      大纲
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {tree && (
                      <>
                        <button
                          onClick={handleCopyMarkdown}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="复制为 Markdown"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                          </svg>
                          复制
                        </button>
                        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700" />
                      </>
                    )}
                    {viewMode === 'visual' && hasContent && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={handleZoomOut}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          title="缩小"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM13.5 10.5h-6" />
                          </svg>
                        </button>
                        <button
                          onClick={handleZoomReset}
                          className="px-2 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors min-w-[40px] text-center"
                        >
                          {zoom}%
                        </button>
                        <button
                          onClick={handleZoomIn}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          title="放大"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607ZM10.5 7.5v6m3-3h-6" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Content Area */}
                <div
                  ref={mapContainerRef}
                  className="p-5 min-h-[400px] max-h-[600px] overflow-auto"
                >
                  {!hasContent && !loading && (
                    <div className="flex flex-col items-center justify-center h-[400px] text-gray-400 dark:text-gray-600">
                      <svg className="w-16 h-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                      <p className="text-sm">输入主题并点击生成，AI 将为你创建思维导图</p>
                    </div>
                  )}

                  {loading && !tree && streamingText && (
                    <div className="animate-pulse">
                      <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-48 mb-4" />
                      <div className="space-y-2 ml-4">
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-36" />
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-32" />
                        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-40" />
                      </div>
                    </div>
                  )}

                  {loading && !tree && !streamingText && (
                    <div className="flex flex-col items-center justify-center h-[400px]">
                      <div className="relative">
                        <div className="w-12 h-12 border-4 border-orange-200 dark:border-orange-900 border-t-orange-500 rounded-full animate-spin" />
                      </div>
                      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">AI 正在思考...</p>
                    </div>
                  )}

                  {tree && viewMode === 'visual' && (
                    <div
                      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left', transition: 'transform 0.2s ease' }}
                    >
                      <ul className="space-y-0">
                        <TreeNode
                          node={tree}
                          collapsed={collapsed}
                          onToggle={toggleCollapse}
                          onExpand={expandNode}
                          isRoot
                        />
                      </ul>
                    </div>
                  )}

                  {tree && viewMode === 'outline' && (
                    <div className="space-y-0">
                      <OutlineNode node={tree} />
                    </div>
                  )}
                </div>

                {/* Stats Bar */}
                {tree && (
                  <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-400">
                    <span>{countNodes(tree)} 个节点</span>
                    <span>{tree.children.length} 个主分支</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">使用技巧</h3>
        <ul className="space-y-2">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-orange-500 mt-0.5 shrink-0">-</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Related Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">相关工具</h3>
        <div className="flex flex-wrap gap-2">
          {RELATED.map((r) => (
            <Link key={r.to} to={r.to} className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 transition-colors">
              {r.label} &rarr;
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
