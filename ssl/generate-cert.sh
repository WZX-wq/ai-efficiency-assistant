#!/bin/bash

# ============================================
# SSL 自签名证书生成脚本（仅用于开发/测试）
# ============================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SSL_DIR="${SCRIPT_DIR}/../ssl"

mkdir -p "$SSL_DIR"

echo "正在生成 SSL 自签名证书..."

openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout "${SSL_DIR}/key.pem" \
  -out "${SSL_DIR}/cert.pem" \
  -subj "/C=CN/ST=Beijing/L=Beijing/O=AI Assistant/CN=localhost"

echo ""
echo "SSL 证书已生成："
echo "  证书文件: ${SSL_DIR}/cert.pem"
echo "  密钥文件: ${SSL_DIR}/key.pem"
echo ""
echo "注意: 此证书为自签名证书，仅用于开发和测试环境。"
echo "      生产环境请使用正式的 SSL 证书（如 Let's Encrypt）。"
