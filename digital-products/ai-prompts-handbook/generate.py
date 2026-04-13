#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 提示词大全 - 调用白山智算 API 生成 200+ 条高质量 AI 提示词
输出 PDF 格式，包含封面、目录、分类章节
"""

import os
import sys
import json
import time
import requests
from datetime import datetime
from fpdf import FPDF

# ==================== 配置 ====================
API_URL = "https://api.edgefn.net/v1/chat/completions"
API_KEY = "sk-iUOFqYygnlMrSijAD92d0d9e92F846D0Ac32A376C5A4F1Dd"
MODEL = "DeepSeek-V3"

FONT_REGULAR = "/usr/share/fonts/opentype/noto-cjk-otf/NotoSansCJKsc-Regular.otf"
FONT_BOLD = "/usr/share/fonts/opentype/noto-cjk-otf/NotoSansCJKsc-Bold.otf"

OUTPUT_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "AI提示词大全.pdf")

# 10 个类别
CATEGORIES = [
    "写作", "编程", "营销", "教育", "设计",
    "翻译", "分析", "创意", "效率", "生活"
]


# ==================== API 调用 ====================
def call_api(prompt: str, max_retries: int = 3, timeout: int = 120) -> str:
    """调用白山智算 API，带重试机制"""
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    payload = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": 0.8,
        "max_tokens": 4096
    }

    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(API_URL, headers=headers, json=payload, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()
            content = data["choices"][0]["message"]["content"]
            return content
        except requests.exceptions.Timeout:
            print(f"  [超时] 第 {attempt}/{max_retries} 次重试...")
            time.sleep(2 ** attempt)
        except requests.exceptions.HTTPError as e:
            print(f"  [HTTP错误 {e.response.status_code}] 第 {attempt}/{max_retries} 次重试...")
            time.sleep(2 ** attempt)
        except (KeyError, IndexError, json.JSONDecodeError) as e:
            print(f"  [解析错误: {e}] 第 {attempt}/{max_retries} 次重试...")
            time.sleep(2 ** attempt)
        except Exception as e:
            print(f"  [未知错误: {e}] 第 {attempt}/{max_retries} 次重试...")
            time.sleep(2 ** attempt)

    print("  [失败] API 调用达到最大重试次数")
    return ""


# ==================== 内容生成 ====================
def build_category_prompt(category: str, count: int = 22) -> str:
    """构建单个类别的提示词生成请求"""
    return f"""请为"{category}"类别生成 {count} 条高质量 AI 提示词。

要求：
1. 每条提示词必须包含以下字段：标题、提示词内容、适用场景、预期效果
2. 提示词要具体、实用、可直接使用
3. 覆盖该类别的不同子场景

请严格按照以下 JSON 数组格式输出，不要输出任何其他内容：
[
  {{
    "title": "提示词标题",
    "prompt": "完整的提示词内容（可直接复制使用）",
    "scenario": "适用场景描述",
    "effect": "预期效果描述"
  }}
]

请确保输出是合法的 JSON 格式，包含恰好 {count} 条提示词。"""


def parse_json_response(raw: str, expected_type: type = list) -> list | dict:
    """增强的 JSON 解析，带多种容错策略"""
    import re

    text = raw.strip()

    # 1. 去除 markdown 代码块包裹
    if text.startswith("```"):
        lines = text.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        text = "\n".join(lines).strip()

    # 2. 直接解析
    try:
        result = json.loads(text)
        if isinstance(result, expected_type):
            return result
    except json.JSONDecodeError:
        pass

    # 3. 提取 JSON 数组/对象
    if expected_type == list:
        match = re.search(r'\[.*\]', text, re.DOTALL)
    else:
        match = re.search(r'\{.*\}', text, re.DOTALL)

    if match:
        try:
            result = json.loads(match.group())
            if isinstance(result, expected_type):
                return result
        except json.JSONDecodeError:
            pass

    # 4. 修复常见问题：控制字符、尾部逗号等
    cleaned = re.sub(r'[\x00-\x1f\x7f]', ' ', text)
    cleaned = re.sub(r',\s*([}\]])', r'\1', cleaned)

    if expected_type == list:
        match = re.search(r'\[.*\]', cleaned, re.DOTALL)
    else:
        match = re.search(r'\{.*\}', cleaned, re.DOTALL)

    if match:
        try:
            result = json.loads(match.group())
            if isinstance(result, expected_type):
                return result
        except json.JSONDecodeError:
            pass

    # 5. 逐条提取（针对数组）：尝试找到所有 {...} 块
    if expected_type == list:
        objects = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text)
        if objects:
            valid_items = []
            for obj_str in objects:
                try:
                    obj = json.loads(obj_str)
                    if isinstance(obj, dict) and "title" in obj:
                        valid_items.append(obj)
                except json.JSONDecodeError:
                    continue
            if valid_items:
                return valid_items

    return [] if expected_type == list else {}


def generate_category_content(category: str, count: int = 22) -> list:
    """生成单个类别的提示词"""
    print(f"\n正在生成类别: {category} ({count} 条)...")
    raw = call_api(build_category_prompt(category, count))
    if not raw:
        print(f"  警告: {category} 类别生成失败，使用空列表")
        return []

    items = parse_json_response(raw, list)
    if items:
        print(f"  成功获取 {len(items)} 条提示词")
    else:
        print(f"  警告: {category} 类别解析失败")
    return items


def generate_all_content() -> dict:
    """生成所有类别的提示词"""
    all_content = {}
    total = 0
    for cat in CATEGORIES:
        items = generate_category_content(cat)
        all_content[cat] = items
        total += len(items)
        time.sleep(1)  # 避免请求过快
    print(f"\n总计生成 {total} 条提示词")
    return all_content


# ==================== PDF 生成 ====================
class PromptsPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("NotoSans", "", FONT_REGULAR)
        self.add_font("NotoSans", "B", FONT_BOLD)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() > 1:
            self.set_font("NotoSans", "", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 8, "AI 提示词大全", align="L")
            self.cell(0, 8, f"第 {self.page_no()} 页", align="R", new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(200, 200, 200)
            self.line(10, 15, 200, 15)
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("NotoSans", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"- {self.page_no()} -", align="C")

    def cover_page(self, title: str, subtitle: str):
        """封面页"""
        self.add_page()
        self.ln(60)
        # 装饰线
        self.set_draw_color(41, 128, 185)
        self.set_line_width(1)
        self.line(30, self.get_y(), 180, self.get_y())
        self.ln(15)

        self.set_font("NotoSans", "B", 32)
        self.set_text_color(33, 37, 41)
        self.multi_cell(0, 16, title, align="C")
        self.ln(10)

        self.set_font("NotoSans", "", 16)
        self.set_text_color(100, 100, 100)
        self.multi_cell(0, 10, subtitle, align="C")
        self.ln(15)

        # 装饰线
        self.set_draw_color(41, 128, 185)
        self.line(30, self.get_y(), 180, self.get_y())
        self.ln(30)

        self.set_font("NotoSans", "", 12)
        self.set_text_color(130, 130, 130)
        today = datetime.now().strftime("%Y 年 %m 月")
        self.cell(0, 10, today, align="C")
        self.ln(8)
        self.cell(0, 10, "由 AI 智能生成", align="C")

    def toc_page(self, categories: list, counts: dict):
        """目录页"""
        self.add_page()
        self.set_font("NotoSans", "B", 24)
        self.set_text_color(33, 37, 41)
        self.cell(0, 15, "目  录", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)

        for i, cat in enumerate(categories):
            count = counts.get(cat, 0)
            self.set_font("NotoSans", "B", 14)
            self.set_text_color(41, 128, 185)
            self.cell(0, 12, f"第{i+1}章  {cat}", new_x="LMARGIN", new_y="NEXT")
            self.set_font("NotoSans", "", 11)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, f"    包含 {count} 条精选提示词", new_x="LMARGIN", new_y="NEXT")
            self.ln(3)

    def chapter_title(self, chapter_num: int, title: str):
        """章节标题页"""
        self.add_page()
        self.ln(30)
        self.set_font("NotoSans", "B", 28)
        self.set_text_color(41, 128, 185)
        self.cell(0, 15, f"第{chapter_num}章", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)
        self.set_font("NotoSans", "B", 24)
        self.set_text_color(33, 37, 41)
        self.cell(0, 15, title, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)
        self.set_draw_color(41, 128, 185)
        self.set_line_width(0.5)
        self.line(60, self.get_y(), 150, self.get_y())

    def prompt_item(self, index: int, item: dict):
        """单条提示词"""
        # 检查是否需要换页
        if self.get_y() > 240:
            self.add_page()

        self.ln(3)

        # 标题
        self.set_font("NotoSans", "B", 12)
        self.set_text_color(41, 128, 185)
        title = item.get("title", f"提示词 #{index}")
        self.cell(0, 8, f"{index}. {title}", new_x="LMARGIN", new_y="NEXT")

        # 提示词内容
        self.set_font("NotoSans", "", 10)
        self.set_text_color(50, 50, 50)
        prompt_text = item.get("prompt", "")
        # 用背景色突出提示词
        self.set_fill_color(240, 248, 255)
        self.multi_cell(0, 6, f"  {prompt_text}", fill=True)
        self.ln(2)

        # 适用场景
        self.set_font("NotoSans", "", 9)
        self.set_text_color(80, 80, 80)
        scenario = item.get("scenario", "")
        self.cell(0, 6, f"  适用场景: {scenario}", new_x="LMARGIN", new_y="NEXT")

        # 预期效果
        effect = item.get("effect", "")
        self.cell(0, 6, f"  预期效果: {effect}", new_x="LMARGIN", new_y="NEXT")

        # 分隔线
        self.set_draw_color(220, 220, 220)
        self.line(15, self.get_y() + 2, 195, self.get_y() + 2)


def build_pdf(all_content: dict):
    """构建 PDF"""
    pdf = PromptsPDF()

    # 封面
    total_count = sum(len(v) for v in all_content.values())
    pdf.cover_page(
        "AI 提示词大全",
        f"精选 {total_count}+ 条高质量 AI 提示词\n覆盖 10 大核心应用场景"
    )

    # 目录
    counts = {cat: len(items) for cat, items in all_content.items()}
    pdf.toc_page(CATEGORIES, counts)

    # 各章节
    for i, cat in enumerate(CATEGORIES):
        items = all_content.get(cat, [])
        if not items:
            continue

        pdf.chapter_title(i + 1, cat)

        for j, item in enumerate(items, 1):
            pdf.prompt_item(j, item)

    # 保存
    pdf.output(OUTPUT_FILE)
    print(f"\nPDF 已保存: {OUTPUT_FILE}")


# ==================== 主函数 ====================
def main():
    print("=" * 60)
    print("  AI 提示词大全 - 生成器")
    print("=" * 60)

    # 生成内容
    all_content = generate_all_content()

    if not any(all_content.values()):
        print("\n错误: 未能生成任何内容，退出")
        sys.exit(1)

    # 生成 PDF
    print("\n正在生成 PDF...")
    build_pdf(all_content)
    print("完成!")


if __name__ == "__main__":
    main()
