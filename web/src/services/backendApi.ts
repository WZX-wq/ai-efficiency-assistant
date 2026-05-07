/**
 * 后端 API 服务
 * 连接 AI 效率助手后端服务
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 获取存储的 token
function getToken(): string | null {
  return localStorage.getItem('ai-assistant-token');
}

// 通用请求函数
async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// ==================== 认证 API ====================

export const authApi = {
  // 注册
  register: (data: { email: string; password: string; name: string }) =>
    request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 登录
  login: (data: { email: string; password: string }) =>
    request<{ token: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 刷新 token
  refresh: (refreshToken: string) =>
    request<{ token: string; refreshToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  
  // 获取当前用户
  me: () =>
    request<{ user: any }>('/auth/me'),
  
  // 修改密码
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==================== 用户 API ====================

export const userApi = {
  // 获取用户资料
  getProfile: () =>
    request<{ user: any }>('/user/profile'),
  
  // 更新用户资料
  updateProfile: (data: any) =>
    request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  // 获取用户设置
  getSettings: () =>
    request<{ settings: any }>('/user/settings'),
  
  // 更新用户设置
  updateSettings: (data: any) =>
    request('/user/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ==================== AI API ====================

export const aiApi = {
  // 文本处理（改写、扩写、翻译、摘要）
  process: (data: {
    text: string;
    action: 'rewrite' | 'expand' | 'translate' | 'summarize';
    targetLang?: string;
  }) =>
    request<{ result: string }>('/ai/process', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 流式对话
  chatStream: (data: {
    messages: Array<{ role: string; content: string }>;
    model?: string;
  }) => {
    const url = `${API_BASE_URL}/ai/chat`;
    const token = getToken();
    
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
  },
};

// ==================== 图片生成 API ====================

export const imageApi = {
  // 生成图片
  generate: (data: {
    prompt: string;
    size?: string;
    style?: string;
    quality?: string;
  }) =>
    request<{ imageUrl: string; filename: string }>('/image/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 流式生成图片
  generateStream: (data: {
    prompt: string;
    size?: string;
    style?: string;
  }) => {
    const url = `${API_BASE_URL}/image/generate/stream`;
    const token = getToken();
    
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
  },
  
  // 获取支持的尺寸
  getSizes: () =>
    request<{ sizes: string[] }>('/image/sizes'),
  
  // 获取支持的风格
  getStyles: () =>
    request<{ styles: string[] }>('/image/styles'),
};

// ==================== 语音 API ====================

export const voiceApi = {
  // 文本转语音
  tts: (data: {
    text: string;
    voice?: string;
    speed?: number;
    format?: string;
  }) =>
    request<{ audioUrl: string; filename: string }>('/voice/tts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 获取支持的语音列表
  getVoices: () =>
    request<{ voices: any[] }>('/voice/voices'),
  
  // 语音转文本
  stt: (audioBase64: string, format?: string) =>
    request<{ text: string }>('/voice/stt', {
      method: 'POST',
      body: JSON.stringify({ audio: audioBase64, format }),
    }),
};

// ==================== 文件管理 API ====================

export const fileApi = {
  // 上传文件
  upload: (file: File, _onProgress?: (progress: number) => void) => {
    const url = `${API_BASE_URL}/files/upload`;
    const token = getToken();
    
    const formData = new FormData();
    formData.append('file', file);
    
    return fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    }).then(r => r.json());
  },
  
  // 获取文件列表
  getFiles: (params?: { page?: number; limit?: number; category?: string }) =>
    request(`/files?page=${params?.page || 1}&limit=${params?.limit || 20}${params?.category ? `&category=${params.category}` : ''}`),
  
  // 下载文件
  download: (fileId: string) =>
    request<{ downloadUrl: string }>(`/files/${fileId}/download`),
  
  // 删除文件
  delete: (fileId: string) =>
    request(`/files/${fileId}`, { method: 'DELETE' }),
};

// ==================== 画布 API ====================

export const canvasApi = {
  // 创建画布
  create: (data: { title: string; description?: string }) =>
    request('/canvas', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 获取画布列表
  getCanvases: () =>
    request<{ canvases: any[] }>('/canvas'),
  
  // 获取单个画布
  getCanvas: (id: string) =>
    request<{ canvas: any }>(`/canvas/${id}`),
  
  // 更新画布
  update: (id: string, data: any) =>
    request(`/canvas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  // 删除画布
  delete: (id: string) =>
    request(`/canvas/${id}`, { method: 'DELETE' }),
};

// ==================== 表格 API ====================

export const spreadsheetApi = {
  // 创建表格
  create: (data: { title: string }) =>
    request('/spreadsheet', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 获取表格列表
  getSpreadsheets: () =>
    request<{ spreadsheets: any[] }>('/spreadsheet'),
  
  // 获取单个表格
  getSpreadsheet: (id: string) =>
    request<{ spreadsheet: any }>(`/spreadsheet/${id}`),
  
  // 更新单元格
  updateCell: (id: string, sheetId: string, cellData: any) =>
    request(`/spreadsheet/${id}/sheets/${sheetId}/cells`, {
      method: 'POST',
      body: JSON.stringify(cellData),
    }),
};

// ==================== 代码助手 API ====================

export const codeApi = {
  // 执行代码
  execute: (data: { code: string; language: string }) =>
    request<{ output: string; error?: string }>('/code/execute', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 代码分析
  analyze: (data: { code: string; language: string; action: string }) =>
    request<{ result: string }>('/code/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 获取支持的语言
  getLanguages: () =>
    request<{ languages: any[] }>('/code/languages'),
  
  // 保存代码片段
  saveSnippet: (data: any) =>
    request('/code/snippets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==================== 数据库管理 API ====================

export const databaseApi = {
  // 获取连接列表
  getConnections: () =>
    request<{ connections: any[] }>('/database/connections'),
  
  // 创建连接
  createConnection: (data: any) =>
    request('/database/connections', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 测试连接
  testConnection: (data: any) =>
    request('/database/connections/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 执行查询
  executeQuery: (connectionId: string, query: string, type: string) =>
    request('/database/query', {
      method: 'POST',
      body: JSON.stringify({ connectionId, query, type }),
    }),
};

// ==================== 系统监控 API ====================

export const monitorApi = {
  // 获取实时指标
  getMetrics: () =>
    request('/monitor/metrics'),
  
  // 获取系统信息
  getSystemInfo: () =>
    request('/monitor/system'),
  
  // 获取进程列表
  getProcesses: () =>
    request('/monitor/processes'),
  
  // 获取服务状态
  getServices: () =>
    request('/monitor/services'),
  
  // 获取告警
  getAlerts: () =>
    request('/monitor/alerts'),
};

// ==================== 团队 API ====================

export const teamApi = {
  // 获取团队列表
  getTeams: () =>
    request<{ teams: any[] }>('/team'),
  
  // 创建团队
  create: (data: { name: string; description?: string }) =>
    request('/team', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 邀请成员
  invite: (teamId: string, data: { email: string; role: string }) =>
    request(`/team/${teamId}/members/invite`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==================== 可视化 API ====================

export const vizApi = {
  // 获取仪表盘列表
  getDashboards: () =>
    request<{ dashboards: any[] }>('/viz/dashboards'),
  
  // 创建仪表盘
  createDashboard: (data: any) =>
    request('/viz/dashboards', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  // 获取图表数据
  getChartData: (dashboardId: string, chartIndex: number) =>
    request(`/viz/dashboards/${dashboardId}/charts/${chartIndex}/data`),
};

// ==================== AI 绘画 API ====================
export const paintingApi = {
  generate: (data: {
    prompt: string;
    style?: string;
    size?: string;
    negativePrompt?: string;
  }) =>
    request('/painting/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getStyles: () =>
    request('/painting/styles'),

  getConfig: () =>
    request('/painting/config'),
};

// ==================== 视频脚本 API ====================
export const videoApi = {
  generateScript: (data: {
    topic: string;
    type?: string;
    duration?: string;
    targetAudience?: string;
    tone?: string;
  }) =>
    request('/video/generate-script', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateStoryboard: (data: { script: string }) =>
    request('/video/generate-storyboard', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getConfig: () =>
    request('/video/config'),
};

// ==================== PPT 生成 API ====================
export const pptApi = {
  generate: (data: {
    topic: string;
    slideCount?: number;
    theme?: string;
    language?: string;
  }) =>
    request('/ppt/generate', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  export: (data: any) =>
    request('/ppt/export', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getConfig: () =>
    request('/ppt/config'),
};

// ==================== 智能客服 API ====================
export const customerServiceApi = {
  createSession: () =>
    request('/customer-service/session', { method: 'POST' }),

  chat: (data: { sessionId: string; message: string }) =>
    request('/customer-service/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getSession: (sessionId: string) =>
    request(`/customer-service/session/${sessionId}`),

  deleteSession: (sessionId: string) =>
    request(`/customer-service/session/${sessionId}`, { method: 'DELETE' }),

  setKnowledgeBase: (items: Array<{ question: string; answer: string }>) =>
    request('/customer-service/knowledge-base', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  getKnowledgeBase: () =>
    request('/customer-service/knowledge-base'),

  getConfig: () =>
    request('/customer-service/config'),
};

// ==================== 数据分析 API ====================
export const dataAnalysisApi = {
  analyze: (data: {
    data: string;
    format: 'csv' | 'json';
    question?: string;
  }) =>
    request('/data-analysis/analyze', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  report: (data: {
    data: string;
    format: 'csv' | 'json';
    reportType: 'summary' | 'detailed' | 'executive';
  }) =>
    request('/data-analysis/report', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  query: (data: {
    data: string;
    format: 'csv' | 'json';
    question: string;
  }) =>
    request('/data-analysis/query', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  charts: (data: {
    data: string;
    format: 'csv' | 'json';
  }) =>
    request('/data-analysis/charts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getConfig: () =>
    request('/data-analysis/config'),
};

// ==================== 告警 API ====================
export const alertApi = {
  getAlerts: (params?: { level?: string; resolved?: boolean; limit?: number }) =>
    request(`/alerts${params ? '?' + new URLSearchParams(params as any).toString() : ''}`),

  getAlert: (id: string) =>
    request(`/alerts/${id}`),

  resolveAlert: (id: string) =>
    request(`/alerts/${id}/resolve`, { method: 'POST' }),

  clearResolved: () =>
    request('/alerts', { method: 'DELETE' }),

  getStats: () =>
    request('/alerts/stats'),
};

export default {
  auth: authApi,
  user: userApi,
  ai: aiApi,
  image: imageApi,
  voice: voiceApi,
  file: fileApi,
  canvas: canvasApi,
  spreadsheet: spreadsheetApi,
  code: codeApi,
  database: databaseApi,
  monitor: monitorApi,
  team: teamApi,
  viz: vizApi,
  painting: paintingApi,
  video: videoApi,
  ppt: pptApi,
  customerService: customerServiceApi,
  dataAnalysis: dataAnalysisApi,
  alert: alertApi,
};
