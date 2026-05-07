# AI 效率助手 - 部署指南

## 目录

- [环境要求](#环境要求)
- [本地开发部署](#本地开发部署)
- [Docker 生产部署](#docker-生产部署)
- [Nginx 反向代理配置](#nginx-反向代理配置)
- [SSL 证书配置](#ssl-证书配置)
- [云服务器部署指南](#云服务器部署指南)
- [环境变量说明](#环境变量说明)
- [常见问题排查](#常见问题排查)
- [性能优化建议](#性能优化建议)
- [安全加固建议](#安全加固建议)

---

## 环境要求

### 必需环境

| 组件 | 最低版本 | 推荐版本 | 说明 |
|------|---------|---------|------|
| Node.js | 20.x | 20.x LTS | 运行时环境 |
| npm | 10.x | 10.x | 包管理器 |
| MongoDB | 7.0 | 7.0+ | 数据库 |
| Git | 2.x | 2.x | 版本控制 |

### 可选环境

| 组件 | 说明 |
|------|------|
| Docker | 24.x+ (容器化部署) |
| Docker Compose | 2.x (容器编排) |
| Nginx | 1.24+ (反向代理) |
| PM2 | 5.x (进程管理) |
| Redis | 7.x (缓存/会话存储) |

### 系统要求

| 资源 | 最低配置 | 推荐配置 |
|------|---------|---------|
| CPU | 2 核 | 4 核+ |
| 内存 | 2 GB | 4 GB+ |
| 磁盘 | 20 GB | 50 GB+ |
| 带宽 | 1 Mbps | 5 Mbps+ |

---

## 本地开发部署

### 1. 克隆项目

```bash
git clone <repository-url>
cd ai-efficiency-assistant
```

### 2. 安装依赖

```bash
# 安装服务端依赖
cd server
npm install

# 安装客户端依赖（如需要）
cd ../client
npm install
```

### 3. 配置环境变量

```bash
cd server
cp .env.example .env
```

编辑 `.env` 文件（参见[环境变量说明](#环境变量说明)）：

```env
# 服务配置
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/ai-assistant

# JWT 密钥
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# AI 服务（按需配置）
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1

# 文件上传
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# 日志
LOG_LEVEL=debug
```

### 4. 启动 MongoDB

```bash
# 使用系统服务
sudo systemctl start mongod

# 或使用 Docker
docker run -d --name mongodb \
  -p 27017:27017 \
  -v mongodb_data:/data/db \
  mongo:7.0
```

### 5. 启动开发服务器

```bash
cd server
npm run dev
```

服务器将在 `http://localhost:3001` 启动。

### 6. 访问 API 文档

开发环境下访问 Swagger 文档：

```
http://localhost:3001/api-docs
```

### 7. 运行测试

```bash
# 确保服务器已启动
npm run test
```

---

## Docker 生产部署

### 1. Dockerfile

在项目根目录创建 `Dockerfile`：

```dockerfile
# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

COPY server/package*.json ./
RUN npm ci

COPY server/ ./
RUN npm run build

# 生产阶段
FROM node:20-alpine AS production

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/uploads ./uploads

EXPOSE 3001

ENV NODE_ENV=production

CMD ["node", "dist/index.js"]
```

### 2. docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ai-assistant-server
    restart: unless-stopped
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MONGODB_URI=mongodb://mongodb:27017/ai-assistant
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - app-network

  mongodb:
    image: mongo:7.0
    container_name: ai-assistant-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db
      - mongodb_config:/data/configdb
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=${MONGO_ROOT_PASSWORD}
    healthcheck:
      test: echo 'db.runCommand("ping").ok' | mongosh --quiet
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    container_name: ai-assistant-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - app-network

volumes:
  mongodb_data:
  mongodb_config:
  redis_data:

networks:
  app-network:
    driver: bridge
```

### 3. .env.docker（生产环境变量）

```env
JWT_SECRET=your-production-jwt-secret-min-32-chars
JWT_REFRESH_SECRET=your-production-refresh-secret-min-32-chars
MONGO_ROOT_PASSWORD=your-mongodb-root-password
OPENAI_API_KEY=sk-your-production-openai-key
```

### 4. 部署命令

```bash
# 构建并启动
docker-compose up -d --build

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down

# 重启服务
docker-compose restart app

# 查看服务状态
docker-compose ps
```

### 5. Docker 常用管理命令

```bash
# 进入容器
docker exec -it ai-assistant-server sh

# 查看资源使用
docker stats

# 清理无用镜像
docker system prune -a

# 备份 MongoDB
docker exec ai-assistant-mongodb mongodump \
  --username admin --password ${MONGO_ROOT_PASSWORD} \
  --db ai-assistant --out /backup
docker cp ai-assistant-mongodb:/backup ./backup
```

---

## Nginx 反向代理配置

### 1. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install nginx

# CentOS/RHEL
sudo yum install nginx
```

### 2. 配置文件

创建 `/etc/nginx/sites-available/ai-assistant`：

```nginx
upstream ai_assistant_backend {
    server 127.0.0.1:3001;
    keepalive 64;
}

server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL 证书配置（参见 SSL 证书配置章节）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;

    # 安全头
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip 压缩
    gzip on;
    gzip_types text/plain application/json application/javascript text/css;
    gzip_min_length 1024;

    # 请求体大小限制（文件上传）
    client_max_body_size 50M;

    # API 代理
    location /api/ {
        proxy_pass http://ai_assistant_backend;
        proxy_http_version 1.1;

        # 代理头
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;

        # 缓冲配置
        proxy_buffering off;
        proxy_buffer_size 4k;
    }

    # 文件上传代理（更大的超时）
    location /api/files/upload {
        proxy_pass http://ai_assistant_backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;
    }

    # 静态文件
    location /uploads/ {
        alias /path/to/ai-efficiency-assistant/server/uploads/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # 健康检查（不记录日志）
    location /api/health {
        proxy_pass http://ai_assistant_backend;
        access_log off;
    }
}
```

### 3. 启用配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/ai-assistant /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

---

## SSL 证书配置

### 使用 Let's Encrypt（免费）

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取证书（自动配置 Nginx）
sudo certbot --nginx -d your-domain.com

# 仅获取证书（手动配置）
sudo certbot certonly --nginx -d your-domain.com

# 测试自动续期
sudo certbot renew --dry-run
```

### 自动续期

Certbot 会自动创建定时任务。检查：

```bash
sudo systemctl status certbot.timer
```

手动续期：

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### 使用自签名证书（开发环境）

```bash
# 生成自签名证书
sudo openssl req -x509 -nodes -days 365 \
  -newkey rsa:2048 \
  -keyout /etc/ssl/private/ai-assistant.key \
  -out /etc/ssl/certs/ai-assistant.crt
```

---

## 云服务器部署指南

### 阿里云 ECS 部署

#### 1. 购买 ECS 实例

- 推荐配置：2核4GB（ecs.c7.large）
- 系统：Ubuntu 22.04 LTS
- 存储：40GB ESSD

#### 2. 安全组配置

开放端口：
- 22 (SSH)
- 80 (HTTP)
- 443 (HTTPS)
- 3001 (API，可选，建议通过 Nginx 代理)

#### 3. 部署步骤

```bash
# SSH 登录
ssh root@your-server-ip

# 更新系统
apt update && apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com | sh

# 安装 Nginx
apt install nginx -y

# 安装 Certbot
apt install certbot python3-certbot-nginx -y

# 克隆项目
git clone <repository-url> /opt/ai-efficiency-assistant
cd /opt/ai-efficiency-assistant

# 配置环境变量
cp server/.env.example server/.env
vim server/.env

# 使用 Docker Compose 部署
docker-compose up -d --build

# 配置 Nginx（参见 Nginx 配置章节）
# 配置 SSL 证书
sudo certbot --nginx -d your-domain.com
```

#### 4. 阿里云 OSS（可选，文件存储）

如需使用阿里云 OSS 存储上传文件：

```env
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_BUCKET=your-bucket-name
OSS_REGION=oss-cn-hangzhou
OSS_ENDPOINT=https://oss-cn-hangzhou.aliyuncs.com
```

### 腾讯云 CVM 部署

#### 1. 购买 CVM 实例

- 推荐配置：2核4GB（S5.MEDIUM4）
- 系统：Ubuntu 22.04 LTS
- 存储：50GB SSD

#### 2. 安全组配置

与阿里云类似，开放 22、80、443 端口。

#### 3. 部署步骤

部署步骤与阿里云基本一致。腾讯云可使用 COS（对象存储）替代本地文件存储。

### AWS EC2 部署

#### 1. 创建 EC2 实例

- 推荐实例类型：t3.medium
- AMI：Ubuntu 22.04 LTS
- 存储：20GB gp3

#### 2. 安全组（Security Group）

入站规则：
- SSH (22) - 限制来源 IP
- HTTP (80) - 0.0.0.0/0
- HTTPS (443) - 0.0.0.0/0

#### 3. 使用 Elastic Load Balancer（可选）

对于生产环境，建议使用 ALB：

```bash
# 安装 AWS CLI
apt install awscli -y
aws configure
```

#### 4. 使用 RDS for MongoDB（可选）

```bash
# 创建 MongoDB 实例后，更新连接字符串
MONGODB_URI=mongodb://user:password@your-docdb-cluster.cluster-xxxxx.us-east-1.docdb.amazonaws.com:27017/?ssl=true&replicaSet=rs0
```

#### 5. 使用 S3 存储文件（可选）

```env
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
```

---

## 环境变量说明

### 核心配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `NODE_ENV` | 否 | `development` | 运行环境：development / production / test |
| `PORT` | 否 | `3001` | 服务端口 |
| `HOST` | 否 | `0.0.0.0` | 监听地址 |

### 数据库配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `MONGODB_URI` | 是 | `mongodb://localhost:27017/ai-assistant` | MongoDB 连接字符串 |

### JWT 认证配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `JWT_SECRET` | 是 | - | JWT 签名密钥（生产环境必须修改） |
| `JWT_REFRESH_SECRET` | 是 | - | 刷新令牌签名密钥 |
| `JWT_EXPIRES_IN` | 否 | `15m` | 访问令牌过期时间 |
| `JWT_REFRESH_EXPIRES_IN` | 否 | `7d` | 刷新令牌过期时间 |

### AI 服务配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `OPENAI_API_KEY` | 是* | - | OpenAI API 密钥 |
| `OPENAI_BASE_URL` | 否 | `https://api.openai.com/v1` | OpenAI API 基础 URL |
| `OPENAI_MODEL` | 否 | `gpt-4` | 默认模型 |
| `OPENAI_IMAGE_MODEL` | 否 | `dall-e-3` | 图片生成模型 |
| `OPENAI_TTS_MODEL` | 否 | `tts-1` | 语音合成模型 |
| `OPENAI_STT_MODEL` | 否 | `whisper-1` | 语音识别模型 |

> *AI 功能需要配置对应的 API 密钥才能使用

### 文件上传配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `UPLOAD_DIR` | 否 | `./uploads` | 上传文件存储目录 |
| `MAX_FILE_SIZE` | 否 | `10485760` | 最大文件大小（字节），默认 10MB |

### 日志配置

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `LOG_LEVEL` | 否 | `info` | 日志级别：error / warn / info / debug |
| `LOG_DIR` | 否 | `./logs` | 日志文件目录 |

### Redis 配置（可选）

| 变量名 | 必填 | 默认值 | 说明 |
|--------|------|--------|------|
| `REDIS_URL` | 否 | - | Redis 连接字符串 |
| `REDIS_HOST` | 否 | `localhost` | Redis 主机 |
| `REDIS_PORT` | 否 | `6379` | Redis 端口 |

### 云存储配置（可选）

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `OSS_ACCESS_KEY_ID` | 否 | 阿里云 OSS Access Key |
| `OSS_ACCESS_KEY_SECRET` | 否 | 阿里云 OSS Secret |
| `OSS_BUCKET` | 否 | OSS 存储桶名称 |
| `AWS_ACCESS_KEY_ID` | 否 | AWS Access Key |
| `AWS_SECRET_ACCESS_KEY` | 否 | AWS Secret Key |
| `S3_BUCKET` | 否 | S3 存储桶名称 |

---

## 常见问题排查

### 1. MongoDB 连接失败

**症状**：服务器启动时报 `MongoDB connection error`

**排查步骤**：

```bash
# 检查 MongoDB 是否运行
sudo systemctl status mongod

# 检查端口是否监听
netstat -tlnp | grep 27017

# 测试连接
mongosh "mongodb://localhost:27017/ai-assistant"

# 检查连接字符串
echo $MONGODB_URI
```

**解决方案**：
- 确保 MongoDB 服务已启动
- 检查防火墙是否放行 27017 端口
- 检查 `.env` 中的 `MONGODB_URI` 配置
- Docker 部署时确保网络配置正确

### 2. 端口被占用

**症状**：`Error: listen EADDRINUSE: address already in use :::3001`

```bash
# 查看占用端口的进程
lsof -i :3001

# 终止进程
kill -9 <PID>
```

### 3. JWT 令牌无效

**症状**：API 返回 `401 Unauthorized`

**排查步骤**：
- 确认 `JWT_SECRET` 和 `JWT_REFRESH_SECRET` 已正确配置
- 确认令牌未过期
- 检查请求头是否包含 `Authorization: Bearer <token>`

### 4. 文件上传失败

**症状**：上传文件时返回 413 或 500 错误

**排查步骤**：
- 检查 `MAX_FILE_SIZE` 配置
- 检查 Nginx 的 `client_max_body_size` 配置
- 确保 `uploads` 目录存在且有写权限

```bash
mkdir -p uploads
chmod 755 uploads
```

### 5. AI 服务调用失败

**症状**：AI 处理接口返回 500 错误

**排查步骤**：
- 检查 `OPENAI_API_KEY` 是否正确
- 检查网络是否能访问 OpenAI API
- 如使用代理，检查 `OPENAI_BASE_URL` 配置
- 检查 API 额度是否充足

### 6. 内存泄漏

**症状**：服务运行一段时间后变慢或崩溃

**排查步骤**：

```bash
# 使用 PM2 监控内存
pm2 monit

# 生成 heapdump
kill -USR2 <pid>

# 使用 Node.js 内置诊断
node --inspect dist/index.js
```

### 7. WebSocket 连接失败

**症状**：实时功能（协作、监控）不工作

**排查步骤**：
- 检查 Nginx 是否配置了 WebSocket 代理（Upgrade 头）
- 检查防火墙是否放行 WebSocket 连接
- 确认客户端使用 `ws://` 或 `wss://` 协议

---

## 性能优化建议

### 1. 数据库优化

```javascript
// MongoDB 索引建议（在 models 中添加）
// 用户集合
schema.index({ email: 1 }, { unique: true });
schema.index({ name: 'text', email: 'text' });

// 文件集合
schema.index({ userId: 1, createdAt: -1 });
schema.index({ category: 1, storageType: 1 });

// 监控数据
schema.index({ timestamp: -1 });
schema.index({ timestamp: -1 }).expireAfterSeconds(2592000); // 30天自动过期
```

### 2. 启用 Redis 缓存

```env
REDIS_URL=redis://localhost:6379
```

缓存策略：
- AI 处理结果缓存（相同输入）
- 用户会话缓存
- 监控数据缓存（短期）
- API 响应缓存

### 3. 使用 PM2 进程管理

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start dist/index.js --name ai-assistant -i max

# 配置文件 (ecosystem.config.js)
module.exports = {
  apps: [{
    name: 'ai-assistant',
    script: 'dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    merge_logs: true,
  }]
};

# 启动
pm2 start ecosystem.config.js --env production

# 监控
pm2 monit

# 保存配置
pm2 save
pm2 startup
```

### 4. 启用 Gzip 压缩

在 Nginx 中已配置。Node.js 端也可添加：

```typescript
import compression from 'compression';
app.use(compression());
```

### 5. 静态资源 CDN

将上传的文件和静态资源通过 CDN 分发：

```nginx
location /uploads/ {
    alias /path/to/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

### 6. 数据库连接池

```env
MONGODB_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
```

### 7. 限流配置调整

根据实际负载调整速率限制：

```typescript
// 高流量场景
app.use('/api/', rateLimit({ windowMs: 60 * 1000, maxRequests: 200 }));

// AI 接口（消耗资源较多）
app.use('/api/ai', rateLimit({ windowMs: 60 * 1000, maxRequests: 50 }));
```

---

## 安全加固建议

### 1. 环境变量安全

```bash
# 设置文件权限
chmod 600 .env

# 确认 .env 在 .gitignore 中
echo ".env" >> .gitignore
```

### 2. JWT 安全

- 生产环境使用至少 32 字符的随机密钥
- 设置合理的令牌过期时间
- 使用 HTTPS 传输令牌

```bash
# 生成随机密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. MongoDB 安全

```yaml
# docker-compose.yml 中启用认证
mongodb:
  environment:
    - MONGO_INITDB_ROOT_USERNAME=admin
    - MONGO_INITDB_ROOT_PASSWORD=your-strong-password
```

```javascript
// MongoDB 连接字符串包含认证信息
MONGODB_URI=mongodb://admin:password@localhost:27017/ai-assistant?authSource=admin
```

### 4. HTTP 安全头

确保 Nginx 配置中包含以下安全头：

```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
add_header Referrer-Policy strict-origin-when-cross-origin;
add_header Content-Security-Policy "default-src 'self'";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### 5. CORS 配置

生产环境限制允许的源：

```typescript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['https://your-domain.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

### 6. 依赖安全审计

```bash
# 检查已知漏洞
npm audit

# 自动修复
npm audit fix

# 查看依赖树
npm ls
```

### 7. 日志安全

- 不要在日志中记录敏感信息（密码、令牌、API 密钥）
- 设置合理的日志保留期限
- 使用日志轮转防止磁盘占满

### 8. 定期备份

```bash
# MongoDB 备份脚本
#!/bin/bash
BACKUP_DIR="/backup/mongodb"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

mongodump --uri="$MONGODB_URI" --out="$BACKUP_DIR/$DATE"

# 保留最近 7 天的备份
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \;

echo "Backup completed: $BACKUP_DIR/$DATE"
```

### 9. 防火墙配置

```bash
# UFW 配置
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 10. 入侵检测

- 配置 fail2ban 防止暴力破解
- 监控异常 API 调用频率
- 设置告警通知

```bash
# 安装 fail2ban
sudo apt install fail2ban

# 配置 Nginx 保护
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
```

---

## 附录

### 常用命令速查

```bash
# 开发
npm run dev          # 启动开发服务器
npm run build        # 编译 TypeScript
npm run test         # 运行测试

# Docker
docker-compose up -d          # 启动服务
docker-compose logs -f        # 查看日志
docker-compose restart app    # 重启应用
docker-compose down           # 停止服务

# Nginx
sudo nginx -t                 # 测试配置
sudo systemctl reload nginx   # 重载配置

# MongoDB
mongosh                       # 连接数据库
mongosh --eval "db.stats()"   # 查看数据库状态

# PM2
pm2 list                      # 查看进程
pm2 logs                      # 查看日志
pm2 monit                     # 实时监控
pm2 restart all               # 重启所有进程
```

### 目录结构

```
ai-efficiency-assistant/
├── server/
│   ├── src/
│   │   ├── config/           # 配置（含 swagger.ts）
│   │   ├── middleware/        # 中间件
│   │   ├── models/           # 数据模型
│   │   ├── routes/           # 路由（含 JSDoc 注释）
│   │   ├── services/         # 业务服务
│   │   ├── types/            # TypeScript 类型
│   │   └── index.ts          # 入口文件
│   ├── tests/                # 测试文件
│   ├── uploads/              # 上传文件
│   ├── logs/                 # 日志文件
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── tsconfig.json
│   └── package.json
├── client/                   # 前端（如需要）
├── DEPLOY.md                 # 本文档
└── README.md
```
