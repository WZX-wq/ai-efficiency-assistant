#!/bin/bash
# AI效率助手 - Render 一键部署脚本
# 使用方法: 在终端运行以下命令

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 AI效率助手 - Render 一键部署脚本${NC}"
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo -e "${YELLOW}使用方法:${NC}"
    echo "  bash deploy-to-render.sh <YOUR_RENDER_API_KEY>"
    echo ""
    echo -e "${YELLOW}示例:${NC}"
    echo "  bash deploy-to-render.sh rnd_xxxxxxxxxxxx"
    echo ""
    echo -e "${YELLOW}请到 https://dashboard.render.com/account/api-keys 获取 API Key${NC}"
    exit 1
fi

RENDER_API_KEY="$1"

echo -e "${GREEN}📡 验证 Render API Key...${NC}"
# 验证 API Key
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "https://api.render.com/v1/services" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" != "200" ]; then
    echo -e "${RED}❌ API Key 无效或已过期${NC}"
    exit 1
fi
echo -e "${GREEN}✅ API Key 验证成功！${NC}"
echo ""

# 配置
GITHUB_REPO="WZX-wq/ai-efficiency-assistant"
BAISHAN_API_KEY="sk-jOvwoQc8LmiyPDrZ4c3fB5Fd117f49FcA41f7f0aDa223dB1"
MONGODB_URI="mongodb+srv://wzx:1160012403wzx@cluster0.akucmla.mongodb.net/?appName=Cluster0"
JWT_SECRET=$(openssl rand -hex 32)

echo -e "${GREEN}📦 部署后端 API 服务...${NC}"

# 创建后端服务
BACKEND_RESPONSE=$(curl -s -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"service\": {
      \"name\": \"ai-efficiency-api\",
      \"region\": \"singapore\",
      \"runtime\": \"node\",
      \"repo\": \"$GITHUB_REPO\",
      \"branch\": \"main\",
      \"buildCommand\": \"cd server && npm install && npm run build\",
      \"startCommand\": \"cd server && npm start\",
      \"healthCheckPath\": \"/api/health\",
      \"plan\": \"free\",
      \"envVars\": {
        \"NODE_ENV\": \"production\",
        \"BAISHAN_API_KEY\": \"$BAISHAN_API_KEY\",
        \"MONGODB_URI\": \"$MONGODB_URI\",
        \"JWT_SECRET\": \"$JWT_SECRET\",
        \"MODEL_CHAT\": \"DeepSeek-V3.2\",
        \"MODEL_CODE\": \"Qwen3-Coder-480B-A35B-Instruct\",
        \"MODEL_REASONING\": \"DeepSeek-R1-0528\"
      }
    }
  }")

echo "$BACKEND_RESPONSE" | head -c 500
echo ""

if echo "$BACKEND_RESPONSE" | grep -q "id"; then
    echo -e "${GREEN}✅ 后端服务创建成功！${NC}"
else
    echo -e "${YELLOW}⚠️ 后端服务响应异常，请检查 Render Dashboard${NC}"
fi

echo ""
echo -e "${GREEN}📦 部署前端网站...${NC}"

# 创建前端静态网站
FRONTEND_RESPONSE=$(curl -s -X POST "https://api.render.com/v1/services" \
  -H "Authorization: Bearer $RENDER_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d "{
    \"service\": {
      \"name\": \"ai-efficiency-web\",
      \"region\": \"singapore\",
      \"runtime\": \"static\",
      \"repo\": \"$GITHUB_REPO\",
      \"branch\": \"main\",
      \"buildCommand\": \"cd web && npm install && npm run build\",
      \"publishPath\": \"web/dist\",
      \"plan\": \"free\",
      \"routes\": [
        {
          \"path\": \"/*\",
          \"destination\": \"/index.html\"
        }
      ],
      \"envVars\": {
        \"VITE_API_URL\": \"https://ai-efficiency-api.onrender.com/api\"
      }
    }
  }")

echo "$FRONTEND_RESPONSE" | head -c 500
echo ""

if echo "$FRONTEND_RESPONSE" | grep -q "id"; then
    echo -e "${GREEN}✅ 前端网站创建成功！${NC}"
else
    echo -e "${YELLOW}⚠️ 前端网站响应异常，请检查 Render Dashboard${NC}"
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}🎉 部署配置完成！${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "${YELLOW}请访问 https://dashboard.render.com 查看部署状态${NC}"
echo -e "${YELLOW}后端地址: https://ai-efficiency-api.onrender.com${NC}"
echo -e "${YELLOW}前端地址: https://ai-efficiency-web.onrender.com${NC}"
echo ""
echo -e "${YELLOW}部署可能需要 3-5 分钟，请耐心等待...${NC}"
