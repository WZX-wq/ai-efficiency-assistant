import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// Types
// ============================================================

export type FileType = 'document' | 'image' | 'video' | 'audio' | 'spreadsheet' | 'presentation' | 'archive' | 'code' | 'other';

export type ViewMode = 'grid' | 'list';
export type SortBy = 'name' | 'date' | 'size' | 'type';
export type SortOrder = 'asc' | 'desc';

export interface FileItem {
  id: string;
  name: string;
  type: FileType;
  size: number;
  folderId: string | null;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  content?: string;
  thumbnail?: string;
  starred: boolean;
  shared: boolean;
  sharedWith?: string[];
}

export interface FolderItem {
  id: string;
  name: string;
  parentId: string | null;
  color: string;
  createdAt: number;
}

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `f-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function generateFolderId(): string {
  return `fld-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================
// Mock Data
// ============================================================

const STORAGE_LIMIT = 1024 * 1024 * 1024; // 1GB

function createMockFolders(): FolderItem[] {
  const now = Date.now();
  return [
    { id: 'fld-docs', name: '文档', parentId: null, color: '#3b82f6', createdAt: now - 86400000 * 30 },
    { id: 'fld-images', name: '图片', parentId: null, color: '#22c55e', createdAt: now - 86400000 * 28 },
    { id: 'fld-videos', name: '视频', parentId: null, color: '#ef4444', createdAt: now - 86400000 * 25 },
    { id: 'fld-code', name: '代码', parentId: null, color: '#64748b', createdAt: now - 86400000 * 20 },
    { id: 'fld-backup', name: '备份', parentId: null, color: '#eab308', createdAt: now - 86400000 * 15 },
  ];
}

function createMockFiles(): FileItem[] {
  const now = Date.now();
  return [
    // 文档 folder
    {
      id: 'file-1', name: '项目需求文档.docx', type: 'document', size: 245760,
      folderId: 'fld-docs', tags: ['重要', '项目'], createdAt: now - 86400000 * 10, updatedAt: now - 86400000 * 2,
      content: '本项目旨在构建一个企业级AI内容创作平台，涵盖文案生成、智能改写、多语言翻译等核心功能模块...',
      starred: true, shared: true, sharedWith: ['张三', '李四'],
    },
    {
      id: 'file-2', name: '会议纪要-2024Q4.md', type: 'document', size: 18432,
      folderId: 'fld-docs', tags: ['会议'], createdAt: now - 86400000 * 5, updatedAt: now - 86400000 * 1,
      content: '# Q4 会议纪要\n\n## 参会人员\n- 产品部：王经理\n- 技术部：李工\n\n## 议题\n1. 产品路线图更新\n2. 技术架构优化方案',
      starred: false, shared: false,
    },
    {
      id: 'file-3', name: '用户调研报告.pdf', type: 'document', size: 5242880,
      folderId: 'fld-docs', tags: ['调研', '用户'], createdAt: now - 86400000 * 15, updatedAt: now - 86400000 * 8,
      starred: true, shared: false,
    },
    {
      id: 'file-4', name: 'API接口文档.md', type: 'document', size: 32768,
      folderId: 'fld-docs', tags: ['技术', 'API'], createdAt: now - 86400000 * 7, updatedAt: now - 86400000 * 3,
      content: '# API 接口文档\n\n## 认证\n所有API请求需要在Header中携带 `Authorization: Bearer <token>`',
      starred: false, shared: true, sharedWith: ['开发组'],
    },
    {
      id: 'file-5', name: '年度总结.txt', type: 'document', size: 8192,
      folderId: 'fld-docs', tags: ['总结'], createdAt: now - 86400000 * 2, updatedAt: now - 86400000 * 1,
      content: '2024年度工作总结：本年度团队完成了多个重要里程碑，产品用户数增长300%...',
      starred: false, shared: false,
    },

    // 图片 folder
    {
      id: 'file-6', name: '产品截图-首页.png', type: 'image', size: 1572864,
      folderId: 'fld-images', tags: ['产品', '截图'], createdAt: now - 86400000 * 12, updatedAt: now - 86400000 * 12,
      starred: true, shared: false,
    },
    {
      id: 'file-7', name: '团队合照.jpg', type: 'image', size: 3145728,
      folderId: 'fld-images', tags: ['团队'], createdAt: now - 86400000 * 20, updatedAt: now - 86400000 * 20,
      starred: false, shared: true, sharedWith: ['全体成员'],
    },
    {
      id: 'file-8', name: 'UI设计稿-v3.png', type: 'image', size: 2097152,
      folderId: 'fld-images', tags: ['设计', 'UI'], createdAt: now - 86400000 * 3, updatedAt: now - 86400000 * 1,
      starred: true, shared: false,
    },
    {
      id: 'file-9', name: 'Logo-最终版.svg', type: 'image', size: 24576,
      folderId: 'fld-images', tags: ['品牌', 'Logo'], createdAt: now - 86400000 * 18, updatedAt: now - 86400000 * 5,
      starred: false, shared: false,
    },

    // 视频 folder
    {
      id: 'file-10', name: '产品演示视频.mp4', type: 'video', size: 104857600,
      folderId: 'fld-videos', tags: ['产品', '演示'], createdAt: now - 86400000 * 8, updatedAt: now - 86400000 * 4,
      starred: true, shared: true, sharedWith: ['市场部'],
    },
    {
      id: 'file-11', name: '培训录像-React入门.mp4', type: 'video', size: 209715200,
      folderId: 'fld-videos', tags: ['培训', 'React'], createdAt: now - 86400000 * 22, updatedAt: now - 86400000 * 22,
      starred: false, shared: false,
    },
    {
      id: 'file-12', name: '用户访谈-第一期.mov', type: 'video', size: 524288000,
      folderId: 'fld-videos', tags: ['用户', '访谈'], createdAt: now - 86400000 * 14, updatedAt: now - 86400000 * 14,
      starred: false, shared: false,
    },

    // 代码 folder
    {
      id: 'file-13', name: 'utils.ts', type: 'code', size: 12288,
      folderId: 'fld-code', tags: ['工具', 'TypeScript'], createdAt: now - 86400000 * 25, updatedAt: now - 86400000 * 1,
      content: 'export function formatDate(date: Date): string {\n  return date.toLocaleDateString("zh-CN");\n}\n\nexport function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {\n  let timer: ReturnType<typeof setTimeout>;\n  return ((...args: any[]) => {\n    clearTimeout(timer);\n    timer = setTimeout(() => fn(...args), ms);\n  }) as T;\n}',
      starred: false, shared: false,
    },
    {
      id: 'file-14', name: 'api-client.py', type: 'code', size: 8192,
      folderId: 'fld-code', tags: ['API', 'Python'], createdAt: now - 86400000 * 18, updatedAt: now - 86400000 * 6,
      content: 'import requests\n\nclass ApiClient:\n    def __init__(self, base_url: str):\n        self.base_url = base_url\n        self.session = requests.Session()\n\n    def get(self, endpoint: str, params: dict = None):\n        return self.session.get(f"{self.base_url}/{endpoint}", params=params)',
      starred: false, shared: false,
    },
    {
      id: 'file-15', name: 'Dockerfile', type: 'code', size: 2048,
      folderId: 'fld-code', tags: ['Docker', '部署'], createdAt: now - 86400000 * 30, updatedAt: now - 86400000 * 10,
      content: 'FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nEXPOSE 3000\nCMD ["node", "dist/server.js"]',
      starred: false, shared: false,
    },
    {
      id: 'file-16', name: 'schema.prisma', type: 'code', size: 4096,
      folderId: 'fld-code', tags: ['数据库', 'Prisma'], createdAt: now - 86400000 * 9, updatedAt: now - 86400000 * 2,
      content: 'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}\n\nmodel User {\n  id        String   @id @default(cuid())\n  name      String\n  email     String   @unique\n  createdAt DateTime @default(now())\n}',
      starred: false, shared: false,
    },

    // 备份 folder
    {
      id: 'file-17', name: '数据库备份-20241201.sql', type: 'archive', size: 52428800,
      folderId: 'fld-backup', tags: ['数据库', '备份'], createdAt: now - 86400000 * 5, updatedAt: now - 86400000 * 5,
      starred: false, shared: false,
    },
    {
      id: 'file-18', name: '项目源码备份.zip', type: 'archive', size: 104857600,
      folderId: 'fld-backup', tags: ['源码', '备份'], createdAt: now - 86400000 * 1, updatedAt: now - 86400000 * 1,
      starred: false, shared: false,
    },

    // Root files (no folder)
    {
      id: 'file-19', name: '数据分析报告.xlsx', type: 'spreadsheet', size: 1048576,
      folderId: null, tags: ['数据', '报告'], createdAt: now - 86400000 * 6, updatedAt: now - 86400000 * 2,
      starred: true, shared: true, sharedWith: ['管理层'],
    },
    {
      id: 'file-20', name: '产品路线图.pptx', type: 'presentation', size: 8388608,
      folderId: null, tags: ['产品', '规划'], createdAt: now - 86400000 * 11, updatedAt: now - 86400000 * 3,
      starred: false, shared: true, sharedWith: ['产品部'],
    },
    {
      id: 'file-21', name: '背景音乐-轻快.mp3', type: 'audio', size: 5242880,
      folderId: null, tags: ['音乐'], createdAt: now - 86400000 * 16, updatedAt: now - 86400000 * 16,
      starred: false, shared: false,
    },
    {
      id: 'file-22', name: 'README.md', type: 'document', size: 4096,
      folderId: null, tags: ['文档'], createdAt: now - 86400000 * 30, updatedAt: now - 86400000 * 7,
      content: '# AI 效率助手\n\n> 企业级 AI 内容创作平台\n\n## 快速开始\n\n```bash\nnpm install\nnpm run dev\n```',
      starred: false, shared: false,
    },
    {
      id: 'file-23', name: '配置文件.conf', type: 'other', size: 1024,
      folderId: null, tags: ['配置'], createdAt: now - 86400000 * 20, updatedAt: now - 86400000 * 20,
      starred: false, shared: false,
    },
  ];
}

// ============================================================
// Store
// ============================================================

interface FileStore {
  // Data
  files: FileItem[];
  folders: FolderItem[];

  // UI State
  currentFolderId: string | null;
  viewMode: ViewMode;
  sortBy: SortBy;
  sortOrder: SortOrder;
  searchQuery: string;
  selectedFiles: string[];

  // Storage
  storageUsed: number;
  storageLimit: number;

  // Folder Actions
  createFolder: (name: string, parentId?: string | null, color?: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  // File Actions
  uploadFile: (file: Partial<FileItem> & { name: string; type: FileType; size: number }) => string;
  deleteFile: (id: string) => void;
  renameFile: (id: string, name: string) => void;
  moveFile: (id: string, folderId: string | null) => void;
  toggleStar: (id: string) => void;
  addTag: (id: string, tag: string) => void;
  removeTag: (id: string, tag: string) => void;

  // UI Actions
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sortBy: SortBy) => void;
  setSortOrder: (order: SortOrder) => void;
  setSearchQuery: (query: string) => void;
  setCurrentFolderId: (id: string | null) => void;
  toggleSelectFile: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Getters
  getFilesByFolder: (folderId: string | null) => FileItem[];
  getStarredFiles: () => FileItem[];
  getRecentFiles: () => FileItem[];
  getStorageUsage: () => { used: number; limit: number; percentage: number };
  getFolderFileCount: (folderId: string) => number;
  getBreadcrumbPath: (folderId: string | null) => FolderItem[];
}

const mockFolders = createMockFolders();
const mockFiles = createMockFiles();
const mockStorageUsed = mockFiles.reduce((sum, f) => sum + f.size, 0);

export const useFileStore = create<FileStore>()(
  persist(
    (set, get) => ({
      files: mockFiles,
      folders: mockFolders,

      currentFolderId: null,
      viewMode: 'grid',
      sortBy: 'date',
      sortOrder: 'desc',
      searchQuery: '',
      selectedFiles: [],

      storageUsed: mockStorageUsed,
      storageLimit: STORAGE_LIMIT,

      // ---- Folder Actions ----

      createFolder: (name, parentId = null, color = '#6366f1') => {
        const id = generateFolderId();
        const now = Date.now();
        const newFolder: FolderItem = {
          id,
          name,
          parentId,
          color,
          createdAt: now,
        };
        set((state) => ({
          folders: [...state.folders, newFolder],
        }));
        return id;
      },

      renameFolder: (id, name) => {
        set((state) => ({
          folders: state.folders.map((f) =>
            f.id === id ? { ...f, name } : f
          ),
        }));
      },

      deleteFolder: (id) => {
        set((state) => {
          // Move all files in this folder to root
          const updatedFiles = state.files.map((f) =>
            f.folderId === id ? { ...f, folderId: null } : f
          );
          // Remove subfolders
          const updatedFolders = state.folders.filter(
            (f) => f.id !== id && f.parentId !== id
          );
          return {
            files: updatedFiles,
            folders: updatedFolders,
            currentFolderId:
              state.currentFolderId === id ? null : state.currentFolderId,
          };
        });
      },

      // ---- File Actions ----

      uploadFile: (fileData) => {
        const id = generateId();
        const now = Date.now();
        const newFile: FileItem = {
          id,
          name: fileData.name,
          type: fileData.type,
          size: fileData.size,
          folderId: fileData.folderId ?? get().currentFolderId,
          tags: fileData.tags ?? [],
          createdAt: now,
          updatedAt: now,
          content: fileData.content,
          thumbnail: fileData.thumbnail,
          starred: fileData.starred ?? false,
          shared: fileData.shared ?? false,
          sharedWith: fileData.sharedWith,
        };
        set((state) => ({
          files: [...state.files, newFile],
          storageUsed: state.storageUsed + fileData.size,
        }));
        return id;
      },

      deleteFile: (id) => {
        set((state) => {
          const file = state.files.find((f) => f.id === id);
          return {
            files: state.files.filter((f) => f.id !== id),
            selectedFiles: state.selectedFiles.filter((fid) => fid !== id),
            storageUsed: file
              ? state.storageUsed - file.size
              : state.storageUsed,
          };
        });
      },

      renameFile: (id, name) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, name, updatedAt: Date.now() } : f
          ),
        }));
      },

      moveFile: (id, folderId) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, folderId, updatedAt: Date.now() } : f
          ),
        }));
      },

      toggleStar: (id) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id ? { ...f, starred: !f.starred } : f
          ),
        }));
      },

      addTag: (id, tag) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id && !f.tags.includes(tag)
              ? { ...f, tags: [...f.tags, tag], updatedAt: Date.now() }
              : f
          ),
        }));
      },

      removeTag: (id, tag) => {
        set((state) => ({
          files: state.files.map((f) =>
            f.id === id
              ? { ...f, tags: f.tags.filter((t) => t !== tag), updatedAt: Date.now() }
              : f
          ),
        }));
      },

      // ---- UI Actions ----

      setViewMode: (mode) => set({ viewMode: mode }),
      setSortBy: (sortBy) => set({ sortBy }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      setCurrentFolderId: (id) => {
        set({ currentFolderId: id, selectedFiles: [] });
      },

      toggleSelectFile: (id) => {
        set((state) => ({
          selectedFiles: state.selectedFiles.includes(id)
            ? state.selectedFiles.filter((fid) => fid !== id)
            : [...state.selectedFiles, id],
        }));
      },

      clearSelection: () => set({ selectedFiles: [] }),

      selectAll: () => {
        const state = get();
        const folderFiles = state.getFilesByFolder(state.currentFolderId);
        set({ selectedFiles: folderFiles.map((f) => f.id) });
      },

      // ---- Getters ----

      getFilesByFolder: (folderId) => {
        const state = get();
        let files = state.files.filter((f) => f.folderId === folderId);

        // Search filter
        if (state.searchQuery.trim()) {
          const query = state.searchQuery.toLowerCase();
          files = files.filter(
            (f) =>
              f.name.toLowerCase().includes(query) ||
              f.tags.some((tag) => tag.toLowerCase().includes(query))
          );
        }

        // Sort
        files = [...files].sort((a, b) => {
          let cmp = 0;
          switch (state.sortBy) {
            case 'name':
              cmp = a.name.localeCompare(b.name, 'zh-CN');
              break;
            case 'date':
              cmp = a.updatedAt - b.updatedAt;
              break;
            case 'size':
              cmp = a.size - b.size;
              break;
            case 'type':
              cmp = a.type.localeCompare(b.type);
              break;
          }
          return state.sortOrder === 'asc' ? cmp : -cmp;
        });

        return files;
      },

      getStarredFiles: () => {
        return get()
          .files.filter((f) => f.starred)
          .sort((a, b) => b.updatedAt - a.updatedAt);
      },

      getRecentFiles: () => {
        return [...get().files]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 10);
      },

      getStorageUsage: () => {
        const state = get();
        return {
          used: state.storageUsed,
          limit: state.storageLimit,
          percentage: Math.round((state.storageUsed / state.storageLimit) * 100),
        };
      },

      getFolderFileCount: (folderId) => {
        return get().files.filter((f) => f.folderId === folderId).length;
      },

      getBreadcrumbPath: (folderId) => {
        const state = get();
        const path: FolderItem[] = [];
        let currentId = folderId;
        while (currentId) {
          const folder = state.folders.find((f) => f.id === currentId);
          if (folder) {
            path.unshift(folder);
            currentId = folder.parentId;
          } else {
            break;
          }
        }
        return path;
      },
    }),
    {
      name: 'ai-assistant-file-store',
      partialize: (state) => ({
        files: state.files,
        folders: state.folders,
        viewMode: state.viewMode,
        sortBy: state.sortBy,
        sortOrder: state.sortOrder,
        storageUsed: state.storageUsed,
      }),
    }
  )
);
