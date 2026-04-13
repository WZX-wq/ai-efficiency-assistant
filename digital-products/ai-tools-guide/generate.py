#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 效率工具使用教程 - 调用白山智算 API 生成 30+ 个 AI 工具的使用教程
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
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "AI效率工具使用教程.pdf")

# 6 个工具类别
TOOL_CATEGORIES = [
    {"name": "AI 写作工具", "count": 6},
    {"name": "AI 编程工具", "count": 6},
    {"name": "AI 设计工具", "count": 5},
    {"name": "AI 视频工具", "count": 5},
    {"name": "AI 音频工具", "count": 5},
    {"name": "AI 办公工具", "count": 5},
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
        "temperature": 0.7,
        "max_tokens": 4096
    }

    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(API_URL, headers=headers, json=payload, timeout=timeout)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]
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
def build_category_prompt(category: str, count: int) -> str:
    """构建单个类别的工具教程生成请求"""
    return f"""请为"{category}"类别推荐 {count} 个真实存在的 AI 工具，并为每个工具生成详细使用教程。

要求：
1. 每个工具必须包含：工具名称(name)、官网(website)、功能介绍(introduction)、使用步骤(steps, 为字符串数组格式的步骤列表)、实用技巧(tips)
2. 工具必须是真实存在且知名的（如 ChatGPT、Claude、Midjourney、GitHub Copilot 等）
3. 使用步骤要具体、可操作
4. 实用技巧要实用、有针对性

请严格按照以下 JSON 数组格式输出，不要输出任何其他内容：
[
  {{
    "name": "工具名称",
    "website": "官方网站URL",
    "introduction": "工具功能介绍（2-3句话）",
    "steps": "步骤1：xxx\\n步骤2：xxx\\n步骤3：xxx\\n步骤4：xxx\\n步骤5：xxx",
    "tips": "实用技巧1\\n实用技巧2\\n实用技巧3"
  }}
]

请确保输出是合法的 JSON 格式，包含恰好 {count} 个工具。"""


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

    # 5. 逐条提取（针对数组）
    if expected_type == list:
        objects = re.findall(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', text)
        if objects:
            valid_items = []
            for obj_str in objects:
                try:
                    obj = json.loads(obj_str)
                    if isinstance(obj, dict) and "name" in obj:
                        valid_items.append(obj)
                except json.JSONDecodeError:
                    continue
            if valid_items:
                return valid_items

    return [] if expected_type == list else {}


def generate_category_content(category: str, count: int) -> list:
    """生成单个类别的工具教程"""
    print(f"\n正在生成类别: {category} ({count} 个工具)...")
    raw = call_api(build_category_prompt(category, count))
    if not raw:
        print(f"  警告: {category} 类别生成失败")
        return []

    items = parse_json_response(raw, list)
    if items:
        print(f"  成功获取 {len(items)} 个工具")
    else:
        print(f"  警告: {category} 类别解析失败")
    return items


def generate_all_content() -> dict:
    """生成所有类别的工具教程"""
    all_content = {}
    total = 0
    for cat_info in TOOL_CATEGORIES:
        items = generate_category_content(cat_info["name"], cat_info["count"])
        all_content[cat_info["name"]] = items
        total += len(items)
        time.sleep(1)
    print(f"\n总计生成 {total} 个工具教程")
    return all_content


# ==================== PDF 生成 ====================
class ToolsPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("NotoSans", "", FONT_REGULAR)
        self.add_font("NotoSans", "B", FONT_BOLD)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() > 1:
            self.set_font("NotoSans", "", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 8, "AI 效率工具使用教程", align="L")
            self.cell(0, 8, f"第 {self.page_no()} 页", align="R", new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(200, 200, 200)
            self.line(10, 15, 200, 15)
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("NotoSans", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"- {self.page_no()} -", align="C")

    def cover_page(self, total_count: int):
        """封面页"""
        self.add_page()
        self.ln(50)
        self.set_draw_color(46, 204, 113)
        self.set_line_width(1.5)
        self.line(30, self.get_y(), 180, self.get_y())
        self.ln(15)

        self.set_font("NotoSans", "B", 30)
        self.set_text_color(33, 37, 41)
        self.multi_cell(0, 16, "AI 效率工具使用教程", align="C")
        self.ln(8)

        self.set_font("NotoSans", "", 14)
        self.set_text_color(100, 100, 100)
        self.multi_cell(0, 10, f"精选 {total_count}+ 个 AI 效率工具的详细使用指南\n覆盖写作、编程、设计、视频、音频、办公六大领域", align="C")
        self.ln(15)

        self.set_draw_color(46, 204, 113)
        self.line(30, self.get_y(), 180, self.get_y())
        self.ln(30)

        self.set_font("NotoSans", "", 12)
        self.set_text_color(130, 130, 130)
        today = datetime.now().strftime("%Y 年 %m 月")
        self.cell(0, 10, today, align="C")
        self.ln(8)
        self.cell(0, 10, "由 AI 智能生成", align="C")

    def toc_page(self, all_content: dict):
        """目录页"""
        self.add_page()
        self.set_font("NotoSans", "B", 24)
        self.set_text_color(33, 37, 41)
        self.cell(0, 15, "目  录", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)

        for i, cat_info in enumerate(TOOL_CATEGORIES):
            name = cat_info["name"]
            count = len(all_content.get(name, []))
            self.set_font("NotoSans", "B", 14)
            self.set_text_color(46, 204, 113)
            self.cell(0, 12, f"第{i+1}章  {name}", new_x="LMARGIN", new_y="NEXT")
            self.set_font("NotoSans", "", 11)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, f"    包含 {count} 个工具教程", new_x="LMARGIN", new_y="NEXT")
            self.ln(3)

    def chapter_title(self, chapter_num: int, title: str):
        """章节标题页"""
        self.add_page()
        self.ln(30)
        self.set_font("NotoSans", "B", 28)
        self.set_text_color(46, 204, 113)
        self.cell(0, 15, f"第{chapter_num}章", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)
        self.set_font("NotoSans", "B", 24)
        self.set_text_color(33, 37, 41)
        self.cell(0, 15, title, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)
        self.set_draw_color(46, 204, 113)
        self.set_line_width(0.5)
        self.line(60, self.get_y(), 150, self.get_y())

    def tool_item(self, index: int, item: dict):
        """单个工具教程"""
        if self.get_y() > 200:
            self.add_page()

        self.ln(5)

        # 工具名称
        self.set_font("NotoSans", "B", 14)
        self.set_text_color(33, 37, 41)
        name = item.get("name", f"工具 #{index}")
        self.cell(0, 10, f"{index}. {name}", new_x="LMARGIN", new_y="NEXT")

        # 官网
        website = item.get("website", "")
        if website:
            self.set_font("NotoSans", "", 10)
            self.set_text_color(41, 128, 185)
            self.cell(0, 7, f"  官网: {website}", new_x="LMARGIN", new_y="NEXT")

        # 功能介绍
        self.set_font("NotoSans", "B", 10)
        self.set_text_color(46, 204, 113)
        self.cell(0, 8, "  功能介绍:", new_x="LMARGIN", new_y="NEXT")
        self.set_font("NotoSans", "", 9)
        self.set_text_color(50, 50, 50)
        intro = item.get("introduction", "")
        self.set_x(15)
        self.multi_cell(180, 5.5, intro)
        self.ln(2)

        # 使用步骤
        self.set_font("NotoSans", "B", 10)
        self.set_text_color(46, 204, 113)
        self.cell(0, 8, "  使用步骤:", new_x="LMARGIN", new_y="NEXT")
        self.set_font("NotoSans", "", 9)
        self.set_text_color(50, 50, 50)
        steps = item.get("steps", "")
        if steps:
            for step_line in steps.split("\n"):
                step_line = step_line.strip()
                if step_line:
                    self.set_fill_color(240, 255, 240)
                    self.set_x(15)
                    self.multi_cell(180, 5.5, step_line, fill=True)
        self.ln(2)

        # 实用技巧
        self.set_font("NotoSans", "B", 10)
        self.set_text_color(46, 204, 113)
        self.cell(0, 8, "  实用技巧:", new_x="LMARGIN", new_y="NEXT")
        self.set_font("NotoSans", "", 9)
        self.set_text_color(80, 80, 80)
        tips = item.get("tips", "")
        if tips:
            for tip_line in tips.split("\n"):
                tip_line = tip_line.strip()
                if tip_line:
                    self.set_x(15)
                    self.multi_cell(180, 5.5, f"- {tip_line}")

        # 分隔线
        self.ln(3)
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.3)
        self.line(15, self.get_y(), 195, self.get_y())


def build_pdf(all_content: dict):
    """构建 PDF"""
    pdf = ToolsPDF()

    total_count = sum(len(v) for v in all_content.values())

    # 封面
    pdf.cover_page(total_count)

    # 目录
    pdf.toc_page(all_content)

    # 各章节
    for i, cat_info in enumerate(TOOL_CATEGORIES):
        name = cat_info["name"]
        items = all_content.get(name, [])
        if not items:
            continue

        pdf.chapter_title(i + 1, name)

        for j, item in enumerate(items, 1):
            pdf.tool_item(j, item)

    # 保存
    pdf.output(OUTPUT_FILE)
    print(f"\nPDF 已保存: {OUTPUT_FILE}")


# ==================== 主函数 ====================
def main():
    print("=" * 60)
    print("  AI 效率工具使用教程 - 生成器")
    print("=" * 60)

    all_content = generate_all_content()

    if not any(all_content.values()):
        print("\n错误: 未能生成任何内容，退出")
        sys.exit(1)

    print("\n正在生成 PDF...")
    build_pdf(all_content)
    print("完成!")


if __name__ == "__main__":
    main()
