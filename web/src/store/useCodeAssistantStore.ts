import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language =
  | 'javascript'
  | 'typescript'
  | 'python'
  | 'java'
  | 'go'
  | 'rust'
  | 'cpp'
  | 'c'
  | 'sql'
  | 'html'
  | 'css'
  | 'json'
  | 'yaml'
  | 'markdown'
  | 'bash'
  | 'powershell';

export interface CodeSnippet {
  id: string;
  title: string;
  language: Language;
  code: string;
  description: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  aiGenerated: boolean;
}

export interface CodeConversation {
  id: string;
  title: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    codeContext?: string;
  }>;
  createdAt: number;
  updatedAt: number;
}

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: Language;
  code: string;
  category: string;
  tags: string[];
}

export interface EditorSettings {
  theme: 'vs-dark' | 'vs-light' | 'hc-black';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
}

interface CodeAssistantState {
  snippets: CodeSnippet[];
  conversations: CodeConversation[];
  templates: CodeTemplate[];
  settings: EditorSettings;
  activeSnippetId: string | null;
  activeConversationId: string | null;
  openTabs: string[];

  // Actions
  createSnippet: (snippet: Omit<CodeSnippet, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateSnippet: (id: string, updates: Partial<CodeSnippet>) => void;
  deleteSnippet: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setActiveSnippet: (id: string | null) => void;
  openTab: (id: string) => void;
  closeTab: (id: string) => void;

  createConversation: (title: string) => string;
  addMessage: (conversationId: string, message: Omit<CodeConversation['messages'][0], 'id' | 'timestamp'>) => void;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;

  addTemplate: (template: Omit<CodeTemplate, 'id'>) => void;
  updateSettings: (settings: Partial<EditorSettings>) => void;

  generateCode: (prompt: string, language: Language) => Promise<string>;
  explainCode: (code: string, language: Language) => Promise<string>;
  refactorCode: (code: string, language: Language) => Promise<string>;
  debugCode: (code: string, language: Language) => Promise<string>;
}

const mockSnippets: CodeSnippet[] = [
  {
    id: 'snippet-1',
    title: 'React UseEffect Hook',
    language: 'typescript',
    code: `import { useEffect, useState } from 'react';

function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    const handleResize = () => {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}`,
    description: '自定义 Hook 用于监听窗口大小变化',
    tags: ['react', 'hooks', 'typescript'],
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 2,
    isFavorite: true,
    aiGenerated: false,
  },
  {
    id: 'snippet-2',
    title: 'Python 快速排序',
    language: 'python',
    code: `def quicksort(arr):
    if len(arr) <= 1:
        return arr
    
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    
    return quicksort(left) + middle + quicksort(right)

# 示例用法
numbers = [3, 6, 8, 10, 1, 2, 1]
print(quicksort(numbers))`,
    description: '经典的快速排序算法实现',
    tags: ['algorithm', 'sorting', 'python'],
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10,
    isFavorite: false,
    aiGenerated: true,
  },
  {
    id: 'snippet-3',
    title: 'Go REST API Handler',
    language: 'go',
    code: `package main

import (
    "encoding/json"
    "net/http"
    "github.com/gorilla/mux"
)

type User struct {
    ID    string ` + '`json:"id"`' + `
    Name  string ` + '`json:"name"`' + `
    Email string ` + '`json:"email"`' + `
}

func getUsers(w http.ResponseWriter, r *http.Request) {
    users := []User{
        {ID: "1", Name: "Alice", Email: "alice@example.com"},
        {ID: "2", Name: "Bob", Email: "bob@example.com"},
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(users)
}

func main() {
    r := mux.NewRouter()
    r.HandleFunc("/api/users", getUsers).Methods("GET")
    http.ListenAndServe(":8080", r)
}`,
    description: 'Go 语言 REST API 基础结构',
    tags: ['go', 'api', 'rest'],
    createdAt: Date.now() - 86400000 * 3,
    updatedAt: Date.now() - 86400000,
    isFavorite: true,
    aiGenerated: false,
  },
  {
    id: 'snippet-4',
    title: 'SQL 用户查询',
    language: 'sql',
    code: `-- 获取活跃用户及其订单统计
SELECT 
    u.id,
    u.username,
    u.email,
    COUNT(o.id) as order_count,
    COALESCE(SUM(o.total_amount), 0) as total_spent,
    MAX(o.created_at) as last_order_date
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
    AND u.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)
GROUP BY u.id, u.username, u.email
HAVING order_count > 0
ORDER BY total_spent DESC
LIMIT 100;`,
    description: '查询活跃用户及其订单统计信息',
    tags: ['sql', 'database', 'analytics'],
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
    isFavorite: false,
    aiGenerated: true,
  },
  {
    id: 'snippet-5',
    title: 'Rust 结构体与实现',
    language: 'rust',
    code: `#[derive(Debug, Clone)]
pub struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // 构造函数
    pub fn new(width: u32, height: u32) -> Self {
        Rectangle { width, height }
    }

    // 计算方法
    pub fn area(&self) -> u32 {
        self.width * self.height
    }

    pub fn perimeter(&self) -> u32 {
        2 * (self.width + self.height)
    }

    pub fn is_square(&self) -> bool {
        self.width == self.height
    }
}

fn main() {
    let rect = Rectangle::new(10, 20);
    println!("Area: {}", rect.area());
    println!("Is square: {}", rect.is_square());
}`,
    description: 'Rust 结构体定义与方法实现',
    tags: ['rust', 'struct', 'oop'],
    createdAt: Date.now() - 86400000 * 4,
    updatedAt: Date.now() - 86400000 * 4,
    isFavorite: true,
    aiGenerated: false,
  },
  {
    id: 'snippet-6',
    title: 'CSS Grid 布局',
    language: 'css',
    code: `.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  padding: 2rem;
}

.grid-item {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  padding: 1.5rem;
  color: white;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.grid-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

@media (max-width: 768px) {
  .grid-container {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }
}`,
    description: '响应式 CSS Grid 布局示例',
    tags: ['css', 'grid', 'responsive'],
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
    isFavorite: false,
    aiGenerated: true,
  },
  {
    id: 'snippet-7',
    title: 'Java 线程池示例',
    language: 'java',
    code: `import java.util.concurrent.*;

public class ThreadPoolExample {
    public static void main(String[] args) {
        // 创建固定大小的线程池
        ExecutorService executor = Executors.newFixedThreadPool(4);
        
        // 提交任务
        for (int i = 0; i < 10; i++) {
            final int taskId = i;
            executor.submit(() -> {
                System.out.println("Task " + taskId + 
                    " running on " + Thread.currentThread().getName());
                try {
                    Thread.sleep(1000);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
                System.out.println("Task " + taskId + " completed");
            });
        }
        
        // 优雅关闭
        executor.shutdown();
        try {
            if (!executor.awaitTermination(60, TimeUnit.SECONDS)) {
                executor.shutdownNow();
            }
        } catch (InterruptedException e) {
            executor.shutdownNow();
        }
    }
}`,
    description: 'Java 线程池创建与使用',
    tags: ['java', 'concurrency', 'threading'],
    createdAt: Date.now() - 86400000 * 6,
    updatedAt: Date.now() - 86400000 * 6,
    isFavorite: true,
    aiGenerated: false,
  },
  {
    id: 'snippet-8',
    title: 'Bash 日志分析脚本',
    language: 'bash',
    code: '#!/bin/bash\n\n# 日志分析脚本\nLOG_FILE="' + "${1:-/var/log/nginx/access.log}" + '"\nREPORT_FILE="log_report_$(date +%Y%m%d).txt"\n\necho "分析日志文件: $LOG_FILE"\necho "报告生成时间: $(date)" > "$REPORT_FILE"\necho "================================" >> "$REPORT_FILE"\n\n# 统计总请求数\ntotal_requests=$(wc -l < "$LOG_FILE")\necho "总请求数: $total_requests" >> "$REPORT_FILE"\n\n# 统计 HTTP 状态码\necho -e "\\nHTTP 状态码分布:" >> "$REPORT_FILE"\nawk \'{print $9}\' "$LOG_FILE" | sort | uniq -c | sort -rn >> "$REPORT_FILE"\n\n# 统计 IP 访问频率\necho -e "\\nTop 10 访问 IP:" >> "$REPORT_FILE"\nawk \'{print $1}\' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10 >> "$REPORT_FILE"\n\n# 统计最热门的 URL\necho -e "\\nTop 10 访问 URL:" >> "$REPORT_FILE"\nawk \'{print $7}\' "$LOG_FILE" | sort | uniq -c | sort -rn | head -10 >> "$REPORT_FILE"\n\necho "报告已保存到: $REPORT_FILE"',
    description: 'Nginx 日志分析 Bash 脚本',
    tags: ['bash', 'shell', 'log-analysis'],
    createdAt: Date.now() - 86400000 * 8,
    updatedAt: Date.now() - 86400000 * 8,
    isFavorite: false,
    aiGenerated: true,
  },
  {
    id: 'snippet-9',
    title: 'TypeScript 泛型工具类',
    language: 'typescript',
    code: `class Cache<T> {
  private cache: Map<string, { value: T; expiry: number }> = new Map();

  set(key: string, value: T, ttlMs: number = 60000): void {
    const expiry = Date.now() + ttlMs;
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    
    return item.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  size(): number {
    return this.cache.size;
  }
}

// 使用示例
const userCache = new Cache<{ id: string; name: string }>();
userCache.set('user-1', { id: '1', name: 'Alice' }, 300000);`,
    description: '带过期时间的 TypeScript 泛型缓存类',
    tags: ['typescript', 'generic', 'cache'],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
    isFavorite: true,
    aiGenerated: false,
  },
  {
    id: 'snippet-10',
    title: 'C++ 智能指针示例',
    language: 'cpp',
    code: `#include <iostream>
#include <memory>
#include <vector>

class Resource {
public:
    Resource(int id) : id_(id) {
        std::cout << "Resource " << id_ << " created\n";
    }
    ~Resource() {
        std::cout << "Resource " << id_ << " destroyed\n";
    }
    void use() const {
        std::cout << "Using resource " << id_ << "\n";
    }
private:
    int id_;
};

int main() {
    // unique_ptr - 独占所有权
    {
        auto res1 = std::make_unique<Resource>(1);
        res1->use();
    } // 自动释放

    // shared_ptr - 共享所有权
    std::shared_ptr<Resource> res2;
    {
        auto res3 = std::make_shared<Resource>(2);
        res2 = res3; // 引用计数 +1
        std::cout << "Reference count: " << res3.use_count() << "\n";
    } // res3 销毁，但 res2 仍持有引用
    
    std::cout << "Reference count: " << res2.use_count() << "\n";
    res2->use();
    
    return 0;
} // res2 销毁，Resource 2 被释放`,
    description: 'C++11 智能指针使用示例',
    tags: ['cpp', 'smart-pointers', 'memory-management'],
    createdAt: Date.now() - 86400000 * 9,
    updatedAt: Date.now() - 86400000 * 9,
    isFavorite: false,
    aiGenerated: true,
  },
];

const defaultTemplates: CodeTemplate[] = [
  {
    id: 'template-1',
    name: 'React Function Component',
    description: 'TypeScript React 函数组件模板',
    language: 'typescript',
    category: 'react',
    tags: ['react', 'component', 'typescript'],
    code: `import React from 'react';

interface Props {
  // 定义组件属性
}

export const ComponentName: React.FC<Props> = (props) => {
  return (
    <div>
      {/* 组件内容 */}
    </div>
  );
};`,
  },
  {
    id: 'template-2',
    name: 'TypeScript Interface',
    description: 'TypeScript 接口定义模板',
    language: 'typescript',
    category: 'typescript',
    tags: ['typescript', 'interface', 'type'],
    code: `export interface EntityName {
  id: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'inactive' | 'pending';
}`,
  },
  {
    id: 'template-3',
    name: 'Python Class',
    description: 'Python 类定义模板',
    language: 'python',
    category: 'python',
    tags: ['python', 'class', 'oop'],
    code: `class ClassName:
    def __init__(self, param1, param2=None):
        self.param1 = param1
        self.param2 = param2
        self._private_var = None
    
    def method_name(self, arg):
        """方法文档字符串"""
        result = self._process(arg)
        return result
    
    def _process(self, data):
        """私有方法"""
        return data`,
  },
  {
    id: 'template-4',
    name: 'SQL Query',
    description: '标准 SQL 查询模板',
    language: 'sql',
    category: 'database',
    tags: ['sql', 'query', 'select'],
    code: `SELECT 
    column1,
    column2,
    COUNT(*) as count
FROM table_name
WHERE condition = 'value'
GROUP BY column1
HAVING count > 0
ORDER BY column2 DESC
LIMIT 100;`,
  },
  {
    id: 'template-5',
    name: 'REST API Endpoint',
    description: 'Express.js REST API 端点',
    language: 'typescript',
    category: 'api',
    tags: ['api', 'rest', 'express'],
    code: `import { Request, Response } from 'express';

export async function handler(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const { body, params, query } = req;
    
    // 业务逻辑处理
    const result = await processRequest(body);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}`,
  },
  {
    id: 'template-6',
    name: 'CSS Animation',
    description: 'CSS 关键帧动画',
    language: 'css',
    category: 'css',
    tags: ['css', 'animation', 'keyframes'],
    code: `@keyframes animationName {
  0% {
    opacity: 0;
    transform: translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateY(0);
  }
}

.animated-element {
  animation: animationName 0.5s ease-out forwards;
}`,
  },
  {
    id: 'template-7',
    name: 'Go Struct',
    description: 'Go 语言结构体定义',
    language: 'go',
    category: 'go',
    tags: ['go', 'struct', 'json'],
    code: `type Entity struct {
    ID        string    ` + '`json:"id" db:"id"`' + `
    Name      string    ` + '`json:"name" db:"name"`' + `
    Email     string    ` + '`json:"email" db:"email"`' + `
    CreatedAt time.Time ` + '`json:"created_at" db:"created_at"`' + `
    UpdatedAt time.Time ` + '`json:"updated_at" db:"updated_at"`' + `
}

func (e *Entity) Validate() error {
    if e.Name == "" {
        return errors.New("name is required")
    }
    return nil
}`,
  },
  {
    id: 'template-8',
    name: 'JavaScript Async Function',
    description: 'JavaScript 异步函数模板',
    language: 'javascript',
    category: 'javascript',
    tags: ['javascript', 'async', 'promise'],
    code: `async function functionName(param) {
  try {
    const response = await fetch(\`/api/endpoint/\${param}\`);
    
    if (!response.ok) {
      throw new Error(\`HTTP error! status: \${response.status}\`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}`,
  },
];

const defaultSettings: EditorSettings = {
  theme: 'vs-dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  lineNumbers: true,
};

export const useCodeAssistantStore = create<CodeAssistantState>()(
  persist(
    (set, get) => ({
      snippets: mockSnippets,
      conversations: [],
      templates: defaultTemplates,
      settings: defaultSettings,
      activeSnippetId: null,
      activeConversationId: null,
      openTabs: [],

      createSnippet: (snippet) => {
        const id = `snippet-${Date.now()}`;
        const newSnippet: CodeSnippet = {
          ...snippet,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          snippets: [newSnippet, ...state.snippets],
          activeSnippetId: id,
          openTabs: state.openTabs.includes(id) ? state.openTabs : [...state.openTabs, id],
        }));
        return id;
      },

      updateSnippet: (id, updates) => {
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
          ),
        }));
      },

      deleteSnippet: (id) => {
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id),
          openTabs: state.openTabs.filter((tabId) => tabId !== id),
          activeSnippetId: state.activeSnippetId === id ? null : state.activeSnippetId,
        }));
      },

      toggleFavorite: (id) => {
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id ? { ...s, isFavorite: !s.isFavorite } : s
          ),
        }));
      },

      setActiveSnippet: (id) => {
        set({ activeSnippetId: id });
        if (id) {
          const { openTabs } = get();
          if (!openTabs.includes(id)) {
            set({ openTabs: [...openTabs, id] });
          }
        }
      },

      openTab: (id) => {
        const { openTabs } = get();
        if (!openTabs.includes(id)) {
          set({ openTabs: [...openTabs, id] });
        }
      },

      closeTab: (id) => {
        set((state) => {
          const newTabs = state.openTabs.filter((tabId) => tabId !== id);
          let newActiveId = state.activeSnippetId;
          if (state.activeSnippetId === id) {
            newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1] : null;
          }
          return {
            openTabs: newTabs,
            activeSnippetId: newActiveId,
          };
        });
      },

      createConversation: (title) => {
        const id = `conv-${Date.now()}`;
        const newConversation: CodeConversation = {
          id,
          title,
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      addMessage: (conversationId, message) => {
        const newMessage = {
          ...message,
          id: `msg-${Date.now()}`,
          timestamp: Date.now(),
        };
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: [...c.messages, newMessage],
                  updatedAt: Date.now(),
                }
              : c
          ),
        }));
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          activeConversationId:
            state.activeConversationId === id ? null : state.activeConversationId,
        }));
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
      },

      addTemplate: (template) => {
        const id = `template-${Date.now()}`;
        set((state) => ({
          templates: [...state.templates, { ...template, id }],
        }));
      },

      updateSettings: (settings) => {
        set((state) => ({
          settings: { ...state.settings, ...settings },
        }));
      },

      generateCode: async (prompt: string, language: Language) => {
        // 模拟 AI 代码生成
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(`// AI 生成的 ${language} 代码\n// 基于提示: ${prompt}\n\n// 这里将显示生成的代码...`);
          }, 1500);
        });
      },

      explainCode: async (_code: string, language: Language) => {
        // 模拟代码解释
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(`## 代码解释\n\n这段 ${language} 代码的功能是...\n\n### 关键部分\n1. ...\n2. ...\n3. ...`);
          }, 1000);
        });
      },

      refactorCode: async (code: string, language: Language) => {
        // 模拟代码重构
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(`// 重构后的 ${language} 代码\n// 改进了性能和可读性\n\n${code}`);
          }, 1200);
        });
      },

      debugCode: async (_code: string, _language: Language) => {
        // 模拟代码调试
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(`## 代码分析结果\n\n### 发现的问题\n1. 潜在的空指针异常\n2. 未使用的变量\n3. 性能优化建议\n\n### 修复建议\n...`);
          }, 1000);
        });
      },
    }),
    {
      name: 'code-assistant-storage',
      partialize: (state) => ({
        snippets: state.snippets,
        conversations: state.conversations,
        templates: state.templates,
        settings: state.settings,
      }),
    }
  )
);
