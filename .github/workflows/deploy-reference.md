# AI 效率助手 — 第 10 轮优化 + 自动部署计划

## 一、任务重述

**目标**: 参考成熟 SaaS 网站持续优化 AI 效率助手，并实现 GitHub Pages 自动部署。

**约束**:
- 技术栈: React 18 + TypeScript + Tailwind CSS + Vite + GitHub Pages
- 无后端服务器，纯前端实现
- 保持现有功能不受影响，增量优化
- 中文界面为主

**成功标准**: TypeScript 零错误 + Vite 构建通过 + GitHub Actions 自动部署成功

---

## 二、当前状态

### 已完成的 9 轮优化回顾
- ✅ 首屏 bundle 优化到 71KB (gzip: 19.69KB)
- ✅ 23+ 组件懒加载，语法高亮按需加载
- ✅ API Key 安全修复 (环境变量)
- ✅ SEO 方案 (SeoHead + JSON-LD + 5 页面集成)
- ✅ 无障碍增强 (skip link + focus-visible)
- ✅ 首页视觉升级 (渐变动画 + 数字滚动 + AI 模型展示)
- ✅ Workspace 增强 (Tab 动画 + 自动保存 + 欢迎引导)
- ✅ 通知系统 (NotificationCenter + Header 集成)
- ✅ 隐私政策/服务条款页面
- ✅ FeedbackWidget / UsageStats / i18n 框架

### 部署状态
| 检查项 | 状态 |
|--------|------|
| `dist/` 目录 | ✅ 存在 |
| `404.html` | ✅ 存在 |
| `sitemap.xml` | ✅ 存在 |
| `robots.txt` | ✅ 存在 |
| `manifest.json` | ✅ 存在 |
| `.nojekyll` | ❌ 缺失 |
| `.github/workflows/` | ❌ 缺失 |
| `package.json` deploy 脚本 | ✅ 已配置 |

---

## 三、本轮优化方案 (8 项改进 + 部署)

### 改进 1: [P0] GitHub Actions 自动部署
**文件**: 新增 `.github/workflows/deploy.yml`
**方案**:
- 创建 GitHub Actions 工作流，push 到 main 分支自动触发
- 步骤: Checkout → Setup Node → npm ci → Build → Add .nojekyll → Upload artifact → Deploy to Pages
- 添加 `public/.nojekyll` 空文件
- 使用 `actions/deploy-pages@v4` 官方部署 Action
- 配置 concurrency 避免并行部署冲突

### 改进 2: [P0] 富文本编辑器升级 — Slash 命令 + 表格 + 待办
**参考**: Notion 的 `/` 命令面板 + 表格 + Checkbox
**文件**: `src/components/RichTextEditor.tsx`, `package.json`
**方案**:
- 安装 TipTap 扩展: `@tiptap/extension-table`, `@tiptap/extension-table-row`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`
- 工具栏添加: 表格插入按钮、待办事项切换按钮
- 添加表格相关 CSS 样式到 index.css
- 添加任务列表样式 (checkbox + 删除线)

### 改进 3: [P1] 聊天界面增强 — 预设提示词 + 重新生成 + 消息反馈
**参考**: LobeChat 的预设提示词库 + 消息操作
**文件**: `src/components/ChatInterface.tsx`
**方案**:
- 添加预设提示词模板 (快速提问入口): 6-8 个常用提示词卡片
- AI 回复添加「重新生成」按钮
- AI 回复添加「点赞/踩」反馈按钮
- 添加对话导出为 Markdown 功能
- 优化空状态 UI (引导更明确)

### 改进 4: [P1] 首页 FAQ 区块
**参考**: Notion/Linear 定价页的 FAQ 手风琴
**文件**: `src/pages/Home.tsx`
**方案**:
- 在 CTA Section 之前添加 FAQ 区块
- 6 个常见问题 (手风琴展开/折叠):
  1. AI效率助手是什么？能帮我做什么？
  2. 支持哪些 AI 模型？
  3. 我的 数据安全吗？
  4. 免费版有什么限制？
  5. 如何切换不同的 AI 模型？
  6. 支持哪些浏览器？
- 使用 Framer Motion 动画展开/折叠

### 改进 5: [P1] 导出功能增强 — PDF + HTML
**文件**: `src/utils/export.ts`, `src/pages/Workspace.tsx`
**方案**:
- 添加 HTML 导出 (将编辑器内容包装为完整 HTML 文件)
- 添加纯文本导出
- 更新 Workspace 导出按钮，支持下拉选择格式 (Markdown / HTML / 纯文本)

### 改进 6: [P1] 全局数据备份/恢复
**文件**: `src/pages/Settings.tsx`
**方案**:
- 在"数据管理"区域添加"导出所有数据"按钮 (JSON 格式)
- 添加"导入数据"按钮 (上传 JSON 文件恢复)
- 导出内容: appStore + chatStore + notificationStore + templates 收藏
- 导入时验证 JSON 格式，提示覆盖警告

### 改进 7: [P2] Footer 社交链接修复 + 增强
**文件**: `src/components/Footer.tsx`
**方案**:
- 修复 GitHub 链接指向具体仓库
- 微信/微博链接改为展示二维码提示 (tooltip)
- 添加 Newsletter 订阅输入框 (仅 UI，存储到 localStorage)
- 添加"返回顶部"快捷链接

### 改进 8: [P2] Header 工具箱下拉增强
**文件**: `src/components/Header.tsx`
**方案**:
- 工具箱下拉菜单添加搜索过滤功能
- 添加 Framer Motion 展开/收起动画
- 移动端菜单添加暗黑模式切换和通知入口

---

## 四、执行顺序

| 步骤 | 改进项 | 复杂度 |
|------|--------|--------|
| 1 | GitHub Actions 自动部署 + .nojekyll | 低 |
| 2 | 富文本编辑器升级 (表格+待办) | 中 |
| 3 | 聊天界面增强 (预设提示词+重新生成+反馈) | 中 |
| 4 | 首页 FAQ 区块 | 低 |
| 5 | 导出功能增强 (HTML+纯文本) | 低 |
| 6 | 全局数据备份/恢复 | 中 |
| 7 | Footer 社交链接修复 | 低 |
| 8 | Header 工具箱下拉增强 | 中 |

---

## 五、验证步骤

1. `npx tsc -b --noEmit` — TypeScript 零错误
2. `npx vite build` — 构建成功
3. 验证 `dist/` 包含 `.nojekyll` 文件
4. 验证 `.github/workflows/deploy.yml` 语法正确
5. 本地预览: `npx vite preview` 验证新功能
