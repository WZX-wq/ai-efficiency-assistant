#!/bin/bash

# ============================================
# AI效率助手 - 生产环境部署脚本
# ============================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印带颜色的信息
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "AI效率助手 - 生产环境部署脚本"
    echo ""
    echo "用法: $0 [命令]"
    echo ""
    echo "命令:"
    echo "  start     构建并启动所有服务（默认）"
    echo "  stop      停止所有服务"
    echo "  restart   重启所有服务"
    echo "  status    查看服务状态"
    echo "  logs      查看服务日志"
    echo "  clean     清理所有容器和数据卷"
    echo "  help      显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0              # 构建并启动"
    echo "  $0 status       # 查看状态"
    echo "  $0 logs         # 查看日志"
}

# 检查前置依赖
check_prerequisites() {
    info "检查前置依赖..."

    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        error "未检测到 Docker，请先安装 Docker"
        echo "  安装指南: https://docs.docker.com/get-docker/"
        exit 1
    fi
    info "Docker: $(docker --version)"

    # 检查 Docker Compose
    if ! docker compose version &> /dev/null && ! command -v docker-compose &> /dev/null; then
        error "未检测到 Docker Compose，请先安装 Docker Compose"
        echo "  安装指南: https://docs.docker.com/compose/install/"
        exit 1
    fi

    # 确定使用哪个 compose 命令
    if docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        COMPOSE_CMD="docker-compose"
    fi
    info "Docker Compose: $($COMPOSE_CMD version)"
}

# 初始化环境配置
init_env() {
    if [ ! -f .env.production ]; then
        warn "未找到 .env.production 文件，正在从模板创建..."
        if [ -f .env.production ]; then
            cp .env.production .env.production
        fi
        warn "请编辑 .env.production 文件，填写实际的配置值后再启动服务"
        echo ""
        echo "  重要配置项："
        echo "  - JWT_SECRET: JWT 密钥（必须修改）"
        echo "  - MONGODB_URI: 数据库连接地址"
        echo "  - DEEPSEEK_API_KEY: DeepSeek API 密钥"
        echo "  - ADMIN_PASSWORD: 管理员密码（必须修改）"
        echo ""
        exit 1
    fi
}

# 启动服务
start_services() {
    check_prerequisites
    init_env

    # 检查 SSL 证书
    if [ ! -f ssl/cert.pem ] || [ ! -f ssl/key.pem ]; then
        warn "未找到 SSL 证书文件"
        echo "  请运行以下命令生成开发用自签名证书："
        echo "  bash ssl/generate-cert.sh"
        echo ""
        echo "  生产环境请使用正式的 SSL 证书，并放置到 ssl/ 目录下"
        exit 1
    fi

    info "构建并启动所有服务..."
    $COMPOSE_CMD up -d --build

    echo ""
    info "部署完成！"
    echo ""
    echo "  服务访问地址："
    echo "  - 前端页面: https://your-domain.com"
    echo "  - API 接口: https://your-domain.com/api/"
    echo "  - 后端直连: http://localhost:3001"
    echo ""
    echo "  查看服务状态: $0 status"
    echo "  查看服务日志: $0 logs"
}

# 停止服务
stop_services() {
    check_prerequisites
    info "停止所有服务..."
    $COMPOSE_CMD down
    info "服务已停止"
}

# 重启服务
restart_services() {
    check_prerequisites
    info "重启所有服务..."
    $COMPOSE_CMD restart
    info "服务已重启"
}

# 查看状态
show_status() {
    check_prerequisites
    $COMPOSE_CMD ps
}

# 查看日志
show_logs() {
    check_prerequisites
    $COMPOSE_CMD logs -f --tail=100
}

# 清理
clean_all() {
    check_prerequisites
    warn "此操作将删除所有容器、镜像和数据卷！"
    read -p "确认继续？(y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        info "已取消"
        exit 0
    fi
    $COMPOSE_CMD down -v --rmi all
    info "清理完成"
}

# 主入口
case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs
        ;;
    clean)
        clean_all
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        error "未知命令: $1"
        show_help
        exit 1
        ;;
esac
