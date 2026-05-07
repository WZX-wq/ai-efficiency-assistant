# Render.com 部署指南

## 部署前准备

### 1. 创建 MongoDB Atlas 数据库
按照 `MONGODB_SETUP.md` 的指引创建免费 MongoDB 数据库，并获取连接字符串。

### 2. 准备环境变量

你需要在 Render 控制台设置以下环境变量：

#### 后端服务 (ai-efficiency-api) 必需变量：

| 变量名 | 说明 | 示例值 |
|--------|------|--------|
| `BAISHAN_API_KEY` | 白山智算 API Key | `sk-jOvwoQc8LmiyPDrZ4c3fB5Fd117f49FcA41f7f0aDa223dB1` |
| `MONGODB_URI` | MongoDB 连接字符串 | `mongodb+srv://user:pass@cluster0.xxx.mongodb.net/ai-efficiency-assistant` |
| `JWT_SECRET` | JWT 签名密钥 | 随机生成的 32 位以上字符串 |

**生成 JWT_SECRET 的方法：**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 部署步骤

### 第一步：部署后端 API 服务

1. 登录 Render 控制台：https://dashboard.render.com

2. 点击 **"New +"** → **"Blueprint"**（蓝图部署）

3. 如果看到 `ai-efficiency-assistant` 仓库，点击 **"Connect"**
   - 如果没有，先点击 **"Connect account"** 授权 GitHub 访问

4. Render 会自动识别 `render.yaml` 文件，显示两个服务：
   - `ai-efficiency-api` (Web Service)
   - `ai-efficiency-web` (Static Site)

5. 先部署后端服务：
   - 点击 `ai-efficiency-api` 的 **"Apply"**
   - 在环境变量部分，填写以下变量：
     - `BAISHAN_API_KEY` = `sk-jOvwoQc8LmiyPDrZ4c3fB5Fd117f49FcA41f7f0aDa223dB1`
     - `MONGODB_URI` = 你的 MongoDB Atlas 连接字符串
     - `JWT_SECRET` = 生成的随机字符串
   - 点击 **"Apply Changes"**

6. 等待部署完成（约 3-5 分钟）
   - 可以在 **"Logs"** 标签页查看部署进度
   - 看到 `Server running on port 10000` 表示成功

7. 获取后端服务地址：
   - 部署成功后，在顶部会看到类似 `https://ai-efficiency-api.onrender.com` 的 URL
   - 复制这个地址，下一步需要用到

### 第二步：部署前端静态网站

1. 回到 Render Dashboard

2. 点击 **"New +"** → **"Blueprint"**

3. 选择 `ai-efficiency-assistant` 仓库

4. 部署前端服务：
   - 点击 `ai-efficiency-web` 的 **"Apply"**
   - 检查环境变量 `VITE_API_URL` 是否正确：
     - 如果后端地址是 `https://ai-efficiency-api.onrender.com`
     - 那么 `VITE_API_URL` 应该是 `https://ai-efficiency-api.onrender.com/api`
   - 点击 **"Apply Changes"**

5. 等待部署完成（约 2-3 分钟）

6. 获取前端网站地址：
   - 类似 `https://ai-efficiency-web.onrender.com`
   - 点击即可访问你的 AI 效率助手！

---

## 部署后验证

### 测试后端 API
访问：`https://ai-efficiency-api.onrender.com/api/health`

应该返回：
```json
{"status":"ok","timestamp":"2025-..."}
```

### 测试前端网站
访问你的前端地址，应该能看到首页并能正常使用各项功能。

---

## 常见问题

### 1. 后端部署失败，日志显示 "MongoDB connection error"
- 检查 `MONGODB_URI` 是否正确
- 确认 MongoDB Atlas 的 Network Access 允许所有 IP (0.0.0.0/0)
- 确认密码正确，没有特殊字符

### 2. 前端无法连接后端
- 检查 `VITE_API_URL` 是否正确（注意要包含 `/api` 后缀）
- 确认后端服务已成功部署并运行
- 检查浏览器控制台是否有 CORS 错误

### 3. AI 功能无法使用
- 检查 `BAISHAN_API_KEY` 是否正确
- 在 Render 日志中查看是否有 API 调用错误

### 4. 免费套餐限制
- Render 免费服务会在 15 分钟无请求后休眠
- 首次访问可能需要等待 30 秒唤醒服务
- MongoDB Atlas 免费套餐有 512MB 存储限制

---

## 更新部署

当你推送新代码到 GitHub 后，Render 会自动重新部署：

1. 代码推送到 `main` 分支
2. Render 自动检测到变更
3. 自动重新构建和部署
4. 约 3-5 分钟后更新完成

---

## 自定义域名（可选）

1. 在 Render 控制台点击你的服务
2. 点击 **"Settings"** → **"Custom Domains"**
3. 点击 **"Add Custom Domain"**
4. 按照指引配置 DNS 记录
5. Render 会自动提供 SSL 证书
