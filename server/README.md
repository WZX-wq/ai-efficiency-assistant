# AI 效率助手 - 后端服务

基于 Node.js + Express + TypeScript 的后端 API 服务，代理调用 DeepSeek API，为前端和 Chrome 插件提供统一的 AI 能力接口。

## 项目结构

```
server/
├── src/
│   ├── index.ts              # 入口文件
│   ├── routes/
│   │   └── ai.ts             # AI 相关路由
│   ├── services/
│   │   └── deepseek.ts       # DeepSeek API 调用封装
│   ├── middleware/
│   │   ├── rateLimit.ts      # 速率限制中间件
│   │   └── auth.ts           # API Key 验证中间件
│   └── types/
│       └── index.ts          # TypeScript 类型定义
├── package.json
├── tsconfig.json
├── .env.example              # 环境变量示例
└── README.md
```

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入实际的配置值：

```env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
API_KEY=your_secret_api_key
RATE_LIMIT_MAX=20
BODY_LIMIT=1mb
```

### 3. 启动服务

**开发模式（热重载）：**

```bash
npm run dev
```

**生产模式：**

```bash
npm run build
npm start
```

服务启动后访问 `http://localhost:3000/api/health` 验证是否正常运行。

## API 接口

### 健康检查

```
GET /api/health
```

响应示例：

```json
{
  "status": "ok",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### AI 文本处理

```
POST /api/ai/process
```

请求头：

```
Authorization: Bearer <your_api_key>
Content-Type: application/json
```

请求体：

```json
{
  "text": "需要处理的文本",
  "action": "rewrite",
  "targetLang": "英语"
}
```

`action` 支持以下值：

| action | 说明 | 是否需要 targetLang |
|--------|------|---------------------|
| `rewrite` | 改写文本 | 否 |
| `expand` | 扩写文本 | 否 |
| `translate` | 翻译文本 | 是 |
| `summarize` | 摘要提取 | 否 |

响应示例：

```json
{
  "success": true,
  "result": "处理后的文本结果"
}
```

### AI 流式对话

```
POST /api/ai/chat
```

请求头：

```
Authorization: Bearer <your_api_key>
Content-Type: application/json
```

请求体：

```json
{
  "messages": [
    { "role": "system", "content": "你是一个有用的助手" },
    { "role": "user", "content": "你好" }
  ]
}
```

响应：SSE（Server-Sent Events）流式返回

```
data: {"content": "你"}

data: {"content": "好"}

data: {"content": "！"}

data: [DONE]
```

## 安全说明

- 所有 `/api/ai/*` 接口需要通过 `Authorization: Bearer <api_key>` 进行身份验证
- 速率限制默认为每分钟 20 次请求，可通过 `RATE_LIMIT_MAX` 环境变量调整
- 请求体大小默认限制为 1MB，可通过 `BODY_LIMIT` 环境变量调整
- DeepSeek API Key 仅存储在服务端，不会暴露给客户端
