#!/bin/bash
# 一键生成所有数字产品 PDF
# 使用方法: bash generate_all.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_FILE="${SCRIPT_DIR}/generation.log"

echo "============================================================"
echo "  数字产品批量生成器"
echo "  开始时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "============================================================"
echo ""

# 记录日志
exec > >(tee -a "$LOG_FILE") 2>&1

FAILED=0
SUCCESS=0

# 产品 1: AI 提示词大全
echo ""
echo ">>> [1/4] 正在生成: AI 提示词大全..."
echo "------------------------------------------------------------"
if python3 "${SCRIPT_DIR}/ai-prompts-handbook/generate.py"; then
    echo ">>> [1/4] AI 提示词大全 - 生成成功!"
    SUCCESS=$((SUCCESS + 1))
else
    echo ">>> [1/4] AI 提示词大全 - 生成失败!"
    FAILED=$((FAILED + 1))
fi
echo ""

# 产品 2: 程序员面试宝典
echo ">>> [2/4] 正在生成: 程序员面试宝典..."
echo "------------------------------------------------------------"
if python3 "${SCRIPT_DIR}/programmer-interview-guide/generate.py"; then
    echo ">>> [2/4] 程序员面试宝典 - 生成成功!"
    SUCCESS=$((SUCCESS + 1))
else
    echo ">>> [2/4] 程序员面试宝典 - 生成失败!"
    FAILED=$((FAILED + 1))
fi
echo ""

# 产品 3: AI 效率工具使用教程
echo ">>> [3/4] 正在生成: AI 效率工具使用教程..."
echo "------------------------------------------------------------"
if python3 "${SCRIPT_DIR}/ai-tools-guide/generate.py"; then
    echo ">>> [3/4] AI 效率工具使用教程 - 生成成功!"
    SUCCESS=$((SUCCESS + 1))
else
    echo ">>> [3/4] AI 效率工具使用教程 - 生成失败!"
    FAILED=$((FAILED + 1))
fi
echo ""

# 产品 4: PPT 制作指南与模板
echo ">>> [4/4] 正在生成: PPT 制作指南与模板..."
echo "------------------------------------------------------------"
if python3 "${SCRIPT_DIR}/ppt-templates-guide/generate.py"; then
    echo ">>> [4/4] PPT 制作指南与模板 - 生成成功!"
    SUCCESS=$((SUCCESS + 1))
else
    echo ">>> [4/4] PPT 制作指南与模板 - 生成失败!"
    FAILED=$((FAILED + 1))
fi
echo ""

# 汇总
echo "============================================================"
echo "  生成完成!"
echo "  结束时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo "  成功: ${SUCCESS} / 失败: ${FAILED}"
echo "============================================================"
echo ""

# 列出生成的文件
echo "生成的 PDF 文件:"
find "${SCRIPT_DIR}" -name "*.pdf" -type f 2>/dev/null | while read -r f; do
    size=$(du -h "$f" | cut -f1)
    echo "  [${size}] ${f}"
done
echo ""
echo "详细日志: ${LOG_FILE}"
