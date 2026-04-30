import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// Types
// ============================================================

export interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  type: 'note' | 'article' | 'snippet' | 'bookmark' | 'reference';
  tags: string[];
  category: string;
  createdAt: number;
  updatedAt: number;
  pinned?: boolean;
  favorite?: boolean;
  source?: string;
  summary?: string;
  wordCount: number;
}

export interface KnowledgeCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
  count: number;
}

// ============================================================
// Default Categories
// ============================================================

const DEFAULT_CATEGORIES: KnowledgeCategory[] = [
  { id: 'notes', name: '笔记', icon: '📝', color: '#f59e0b', count: 0 },
  { id: 'articles', name: '文章', icon: '📰', color: '#3b82f6', count: 0 },
  { id: 'snippets', name: '代码片段', icon: '💻', color: '#10b981', count: 0 },
  { id: 'bookmarks', name: '书签', icon: '🔖', color: '#8b5cf6', count: 0 },
  { id: 'references', name: '参考资料', icon: '📚', color: '#ef4444', count: 0 },
  { id: 'ideas', name: '灵感', icon: '💡', color: '#f97316', count: 0 },
  { id: 'tasks', name: '待办', icon: '📋', color: '#06b6d4', count: 0 },
  { id: 'projects', name: '项目', icon: '🎯', color: '#ec4899', count: 0 },
];

// ============================================================
// Sample Data
// ============================================================

const SAMPLE_ITEMS: KnowledgeItem[] = [
  {
    id: 'sample-1',
    title: 'AI提示工程指南',
    content: '# AI提示工程指南\n\n## 基本原则\n\n1. **清晰明确**：使用清晰、具体的语言描述你的需求\n2. **提供上下文**：给AI足够的背景信息\n3. **分步指令**：复杂任务拆分为多个步骤\n\n## 常用技巧\n\n- 角色扮演法：让AI扮演特定角色\n- 示例驱动法：提供输入输出示例\n- 思维链法：引导AI逐步推理\n\n## 最佳实践\n\n- 迭代优化提示词\n- 使用系统提示设定行为边界\n- 合理控制输出长度和格式',
    type: 'article',
    tags: ['AI', '提示工程'],
    category: 'references',
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    pinned: true,
    favorite: true,
    summary: '系统介绍AI提示工程的基本原则、常用技巧和最佳实践',
    wordCount: 180,
  },
  {
    id: 'sample-2',
    title: 'React Hooks速查表',
    content: '```tsx\n// useState\nconst [count, setCount] = useState(0);\n\n// useEffect\nuseEffect(() => {\n  document.title = `Count: ${count}`;\n  return () => { /* cleanup */ };\n}, [count]);\n\n// useRef\nconst inputRef = useRef<HTMLInputElement>(null);\n\n// useMemo\nconst memo = useMemo(() => compute(a, b), [a, b]);\n\n// useCallback\nconst fn = useCallback((x) => doSomething(x), [deps]);\n\n// useReducer\nconst [state, dispatch] = useReducer(reducer, initialState);\n```',
    type: 'snippet',
    tags: ['React', '前端'],
    category: 'snippets',
    createdAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 5 * 24 * 60 * 60 * 1000,
    pinned: false,
    favorite: true,
    summary: '常用React Hooks快速参考，包含useState、useEffect等',
    wordCount: 95,
  },
  {
    id: 'sample-3',
    title: '项目灵感：AI写作助手',
    content: '## 核心功能\n\n- 智能续写：根据上下文自动续写文章\n- 风格迁移：将文章转换为不同写作风格\n- 多语言支持：中英日韩多语言写作辅助\n\n## 技术方案\n\n- 前端：React + TypeScript + Tailwind CSS\n- AI模型：接入GPT-4 / Claude API\n- 存储：本地IndexedDB + 云端同步\n\n## 商业模式\n\n- 免费版：每日10次调用\n- Pro版：无限调用 + 高级功能\n- 企业版：私有部署 + 定制模型',
    type: 'note',
    tags: ['灵感', 'AI'],
    category: 'ideas',
    createdAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    pinned: false,
    favorite: false,
    summary: 'AI写作助手项目灵感，包含核心功能、技术方案和商业模式',
    wordCount: 120,
  },
  {
    id: 'sample-4',
    title: 'Tailwind CSS常用类',
    content: '```css\n/* 布局 */\nflex grid grid-cols-3 gap-4\ncontainer mx-auto px-4\n\n/* 间距 */\np-4 px-6 py-2 m-auto mt-4\nspace-x-4 space-y-2\n\n/* 文字 */\ntext-sm text-lg text-xl font-bold\ntext-gray-600 text-center\ntruncate line-clamp-2\n\n/* 背景 */\nbg-white bg-gray-100 bg-gradient-to-r\nfrom-blue-500 to-purple-600\n\n/* 边框 */\nborder border-gray-200 rounded-lg\nrounded-full shadow-lg\n\n/* 动画 */\ntransition-all duration-300\nhover:scale-105 animate-pulse\n```',
    type: 'snippet',
    tags: ['CSS', '前端'],
    category: 'snippets',
    createdAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
    pinned: false,
    favorite: false,
    summary: 'Tailwind CSS常用类名速查，涵盖布局、间距、文字、背景等',
    wordCount: 85,
  },
  {
    id: 'sample-5',
    title: '每周学习计划',
    content: '## 本周目标\n\n- [ ] 完成 TypeScript 高级类型学习\n- [ ] 阅读《设计模式》第3-5章\n- [ ] 实践 React Server Components\n- [ ] 完成 LeetCode 5道中等难度题\n\n## 每日安排\n\n**周一至周三**：TypeScript 深入学习\n**周四**：阅读技术书籍\n**周五**：项目实战练习\n**周末**：算法练习 + 总结复盘\n\n## 学习资源\n\n- TypeScript 官方文档\n- TypeScript Handbook\n- Total TypeScript 课程',
    type: 'note',
    tags: ['学习', '计划'],
    category: 'tasks',
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    pinned: true,
    favorite: false,
    summary: '本周学习计划安排，涵盖TypeScript、设计模式和算法练习',
    wordCount: 130,
  },
  {
    id: 'sample-6',
    title: 'TypeScript高级类型',
    content: '# TypeScript高级类型\n\n## 条件类型\n\n```typescript\ntype IsString<T> = T extends string ? true : false;\ntype A = IsString<"hello">; // true\ntype B = IsString<42>;      // false\n```\n\n## 映射类型\n\n```typescript\ntype Readonly<T> = {\n  readonly [P in keyof T]: T[P];\n};\n```\n\n## 模板字面量类型\n\n```typescript\ntype EventName = `on${Capitalize<string>}`;\n```\n\n## 实用工具类型\n\n- `Partial<T>` - 所有属性可选\n- `Required<T>` - 所有属性必填\n- `Pick<T, K>` - 选取部分属性\n- `Omit<T, K>` - 排除部分属性\n- `Record<K, V>` - 构造键值对类型',
    type: 'article',
    tags: ['TypeScript', '编程'],
    category: 'references',
    createdAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
    updatedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    pinned: false,
    favorite: true,
    summary: 'TypeScript高级类型详解：条件类型、映射类型、模板字面量类型等',
    wordCount: 150,
  },
];

// ============================================================
// Store
// ============================================================

interface KnowledgeStore {
  items: KnowledgeItem[];
  categories: KnowledgeCategory[];

  // CRUD
  addItem: (item: Omit<KnowledgeItem, 'id' | 'createdAt' | 'updatedAt' | 'wordCount'>) => void;
  updateItem: (id: string, updates: Partial<KnowledgeItem>) => void;
  deleteItem: (id: string) => void;
  deleteItems: (ids: string[]) => void;

  // Actions
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;

  // Search
  search: (query: string, filters?: { type?: string; category?: string; tags?: string[] }) => KnowledgeItem[];

  // Getters
  getPinnedItems: () => KnowledgeItem[];
  getFavorites: () => KnowledgeItem[];
  getRecentItems: (limit?: number) => KnowledgeItem[];
  getItemsByCategory: (categoryId: string) => KnowledgeItem[];
  getItemsByTag: (tag: string) => KnowledgeItem[];
  getAllTags: () => { tag: string; count: number }[];

  // Import/Export
  exportData: () => string;
  importData: (json: string) => void;
}

function generateId(): string {
  return `kb-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function countWords(text: string): number {
  if (!text) return 0;
  // Count Chinese characters + English words
  const chinese = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const english = (text.match(/[a-zA-Z]+/g) || []).length;
  return chinese + english;
}

function recalcCategoryCounts(items: KnowledgeItem[]): KnowledgeCategory[] {
  return DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    count: items.filter((item) => item.category === cat.id).length,
  }));
}

export const useKnowledgeStore = create<KnowledgeStore>()(
  persist(
    (set, get) => ({
      items: SAMPLE_ITEMS,
      categories: recalcCategoryCounts(SAMPLE_ITEMS),

      // CRUD
      addItem: (item) => {
        const now = Date.now();
        const newItem: KnowledgeItem = {
          ...item,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
          wordCount: countWords(item.content),
        };
        set((state) => {
          const items = [newItem, ...state.items];
          return { items, categories: recalcCategoryCounts(items) };
        });
      },

      updateItem: (id, updates) => {
        set((state) => {
          const items = state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  ...updates,
                  updatedAt: Date.now(),
                  wordCount: updates.content !== undefined ? countWords(updates.content) : item.wordCount,
                }
              : item
          );
          return { items, categories: recalcCategoryCounts(items) };
        });
      },

      deleteItem: (id) => {
        set((state) => {
          const items = state.items.filter((item) => item.id !== id);
          return { items, categories: recalcCategoryCounts(items) };
        });
      },

      deleteItems: (ids) => {
        const idSet = new Set(ids);
        set((state) => {
          const items = state.items.filter((item) => !idSet.has(item.id));
          return { items, categories: recalcCategoryCounts(items) };
        });
      },

      // Actions
      togglePin: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, pinned: !item.pinned, updatedAt: Date.now() } : item
          ),
        }));
      },

      toggleFavorite: (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, favorite: !item.favorite, updatedAt: Date.now() } : item
          ),
        }));
      },

      addTag: (id, tag) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id && !item.tags.includes(tag)
              ? { ...item, tags: [...item.tags, tag], updatedAt: Date.now() }
              : item
          ),
        }));
      },

      removeTag: (id, tag) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? { ...item, tags: item.tags.filter((t) => t !== tag), updatedAt: Date.now() }
              : item
          ),
        }));
      },

      // Search
      search: (query, filters) => {
        const { items } = get();
        const q = query.toLowerCase().trim();
        let result = items;

        if (filters?.type) {
          result = result.filter((item) => item.type === filters.type);
        }
        if (filters?.category) {
          result = result.filter((item) => item.category === filters.category);
        }
        if (filters?.tags && filters.tags.length > 0) {
          result = result.filter((item) =>
            filters.tags!.some((tag) => item.tags.includes(tag))
          );
        }
        if (q) {
          result = result.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.content.toLowerCase().includes(q) ||
              item.tags.some((tag) => tag.toLowerCase().includes(q)) ||
              (item.summary && item.summary.toLowerCase().includes(q))
          );
        }

        return result;
      },

      // Getters
      getPinnedItems: () => get().items.filter((item) => item.pinned),
      getFavorites: () => get().items.filter((item) => item.favorite),
      getRecentItems: (limit = 10) =>
        [...get().items].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit),
      getItemsByCategory: (categoryId) =>
        get().items.filter((item) => item.category === categoryId),
      getItemsByTag: (tag) =>
        get().items.filter((item) => item.tags.includes(tag)),
      getAllTags: () => {
        const { items } = get();
        const tagMap = new Map<string, number>();
        items.forEach((item) => {
          item.tags.forEach((tag) => {
            tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
          });
        });
        return Array.from(tagMap.entries())
          .map(([tag, count]) => ({ tag, count }))
          .sort((a, b) => b.count - a.count);
      },

      // Import/Export
      exportData: () => {
        const { items } = get();
        return JSON.stringify({ version: 1, items, exportedAt: Date.now() }, null, 2);
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json);
          if (data.items && Array.isArray(data.items)) {
            set((state) => {
              const existingIds = new Set(state.items.map((i) => i.id));
              const newItems = data.items.filter((i: KnowledgeItem) => !existingIds.has(i.id));
              const items = [...newItems, ...state.items];
              return { items, categories: recalcCategoryCounts(items) };
            });
          }
        } catch {
          console.error('Failed to import knowledge data');
        }
      },
    }),
    {
      name: 'ai-assistant-knowledge-store',
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);
