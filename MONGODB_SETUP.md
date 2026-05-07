# MongoDB Atlas 免费数据库设置指南

## 步骤 1：注册 MongoDB Atlas

1. 访问 https://www.mongodb.com/cloud/atlas/register
2. 使用 Google 账号或邮箱注册
3. 选择 **"Shared Cluster"**（免费套餐）

## 步骤 2：创建免费集群

1. 点击 **"Create a New Cluster"**
2. 选择 **M0 Sandbox**（永久免费）
3. 选择区域：推荐 **Singapore (ap-southeast-1)** 或离你最近的区域
4. 点击 **"Create Cluster"**

## 步骤 3：配置数据库访问

### 创建数据库用户
1. 点击左侧菜单 **"Database Access"**
2. 点击 **"Add New Database User"**
3. 选择 **"Password"** 认证方式
4. 设置用户名：`ai-assistant-user`
5. 设置密码：（记住这个密码，后面需要用到）
6. 权限选择 **"Read and write to any database"**
7. 点击 **"Add User"**

### 配置网络访问
1. 点击左侧菜单 **"Network Access"**
2. 点击 **"Add IP Address"**
3. 选择 **"Allow Access from Anywhere"**（0.0.0.0/0）
   - 或者只添加 Render 的 IP 地址
4. 点击 **"Confirm"**

## 步骤 4：获取连接字符串

1. 返回 **"Database"** 页面
2. 点击 **"Connect"** 按钮
3. 选择 **"Connect your application"**
4. 选择驱动：**Node.js**
5. 版本：**4.1 or later**
6. 复制连接字符串，格式如下：

```
mongodb+srv://ai-assistant-user:<password>@cluster0.xxxxx.mongodb.net/ai-efficiency-assistant?retryWrites=true&w=majority
```

7. 将 `<password>` 替换为你设置的实际密码

## 步骤 5：在 Render 中设置环境变量

将完整的连接字符串添加到 Render 的环境变量中：

**变量名**：`MONGODB_URI`
**变量值**：`mongodb+srv://ai-assistant-user:你的密码@cluster0.xxxxx.mongodb.net/ai-efficiency-assistant?retryWrites=true&w=majority`

---

## 免费套餐限制

- **存储**：512 MB
- **连接数**：最大 500 并发连接
- **性能**：共享资源，适合开发和小型项目
- **永久免费**：只要定期登录使用就不会被删除

## 注意事项

1. 密码不要包含特殊字符 `@`、`/`、`:` 等，避免 URL 编码问题
2. 建议开启双因素认证保护你的 Atlas 账号
3. 生产环境建议升级到付费套餐以获得更好性能
