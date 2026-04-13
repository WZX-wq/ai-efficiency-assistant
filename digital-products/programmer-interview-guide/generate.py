#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
程序员面试宝典 - 调用白山智算 API 生成 100+ 道面试题和详细答案
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
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "程序员面试宝典.pdf")

# 5 个方向
DIRECTIONS = [
    {"name": "前端开发", "count": 22},
    {"name": "后端开发", "count": 22},
    {"name": "算法与数据结构", "count": 22},
    {"name": "系统设计", "count": 20},
    {"name": "AI/机器学习", "count": 20},
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
def build_direction_prompt(direction: str, count: int) -> str:
    """构建单个方向的面试题生成请求"""
    return f"""请为"{direction}"方向生成 {count} 道面试题和详细答案。

要求：
1. 每道题包含：题目(question)、难度(difficulty, 用★到★★★表示)、详细解析(analysis)、代码示例(code, 如适用则为字符串，不适用则为空字符串)
2. 难度分布：约 30% ★（基础），50% ★★（中级），20% ★★★（高级）
3. 答案要详细、准确、有深度
4. 代码示例使用适当语言，格式清晰

请严格按照以下 JSON 数组格式输出，不要输出任何其他内容：
[
  {{
    "question": "面试题题目",
    "difficulty": "★",
    "analysis": "详细解析内容，包含原理说明、步骤分析等",
    "code": "代码示例（如不适用则为空字符串）"
  }}
]

请确保输出是合法的 JSON 格式，包含恰好 {count} 道题目。"""


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
                    if isinstance(obj, dict) and "question" in obj:
                        valid_items.append(obj)
                except json.JSONDecodeError:
                    continue
            if valid_items:
                return valid_items

    return [] if expected_type == list else {}


def generate_direction_content(direction: str, count: int) -> list:
    """生成单个方向的面试题"""
    print(f"\n正在生成方向: {direction} ({count} 题)...")
    raw = call_api(build_direction_prompt(direction, count))
    if not raw:
        print(f"  警告: {direction} 方向生成失败")
        return []

    items = parse_json_response(raw, list)
    if items:
        print(f"  成功获取 {len(items)} 道题目")
    else:
        print(f"  警告: {direction} 方向解析失败")
    return items


def generate_all_content() -> dict:
    """生成所有方向的面试题"""
    all_content = {}
    total = 0
    for d in DIRECTIONS:
        items = generate_direction_content(d["name"], d["count"])
        all_content[d["name"]] = items
        total += len(items)
        time.sleep(1)
    print(f"\n总计生成 {total} 道面试题")
    return all_content


# ==================== PDF 生成 ====================
class InterviewPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("NotoSans", "", FONT_REGULAR)
        self.add_font("NotoSans", "B", FONT_BOLD)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() > 1:
            self.set_font("NotoSans", "", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 8, "程序员面试宝典", align="L")
            self.cell(0, 8, f"第 {self.page_no()} 页", align="R", new_x="LMARGIN", new_y="NEXT")
            self.set_draw_color(200, 200, 200)
            self.line(10, 15, 200, 15)
            self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("NotoSans", "", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"- {self.page_no()} -", align="C")

    def cover_page(self):
        """封面页"""
        self.add_page()
        self.ln(50)
        self.set_draw_color(231, 76, 60)
        self.set_line_width(1.5)
        self.line(30, self.get_y(), 180, self.get_y())
        self.ln(15)

        self.set_font("NotoSans", "B", 32)
        self.set_text_color(33, 37, 41)
        self.multi_cell(0, 16, "程序员面试宝典", align="C")
        self.ln(8)

        self.set_font("NotoSans", "", 14)
        self.set_text_color(100, 100, 100)
        self.multi_cell(0, 10, "100+ 道精选面试题与详细解析\n覆盖前端、后端、算法、系统设计、AI/ML 五大方向", align="C")
        self.ln(15)

        self.set_draw_color(231, 76, 60)
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

        for i, d in enumerate(DIRECTIONS):
            name = d["name"]
            count = len(all_content.get(name, []))
            self.set_font("NotoSans", "B", 14)
            self.set_text_color(231, 76, 60)
            self.cell(0, 12, f"第{i+1}部分  {name}", new_x="LMARGIN", new_y="NEXT")
            self.set_font("NotoSans", "", 11)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, f"    包含 {count} 道面试题", new_x="LMARGIN", new_y="NEXT")
            self.ln(3)

    def chapter_title(self, part_num: int, title: str):
        """章节标题页"""
        self.add_page()
        self.ln(30)
        self.set_font("NotoSans", "B", 28)
        self.set_text_color(231, 76, 60)
        self.cell(0, 15, f"第{part_num}部分", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)
        self.set_font("NotoSans", "B", 24)
        self.set_text_color(33, 37, 41)
        self.cell(0, 15, title, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)
        self.set_draw_color(231, 76, 60)
        self.set_line_width(0.5)
        self.line(60, self.get_y(), 150, self.get_y())

    def question_item(self, index: int, item: dict):
        """单道面试题"""
        if self.get_y() > 220:
            self.add_page()

        self.ln(5)

        # 题目和难度
        self.set_font("NotoSans", "B", 12)
        self.set_text_color(33, 37, 41)
        question = item.get("question", f"题目 #{index}")
        difficulty = item.get("difficulty", "★")
        self.cell(0, 8, f"Q{index}. {question}  [{difficulty}]", new_x="LMARGIN", new_y="NEXT")

        # 分隔线
        self.set_draw_color(231, 76, 60)
        self.set_line_width(0.3)
        self.line(15, self.get_y(), 195, self.get_y())
        self.ln(3)

        # 详细解析
        self.set_font("NotoSans", "B", 10)
        self.set_text_color(41, 128, 185)
        self.cell(0, 7, "解析:", new_x="LMARGIN", new_y="NEXT")

        self.set_font("NotoSans", "", 10)
        self.set_text_color(50, 50, 50)
        analysis = item.get("analysis", "")
        self.multi_cell(0, 6, analysis)
        self.ln(2)

        # 代码示例
        code = item.get("code", "")
        if code and code.strip():
            self.set_font("NotoSans", "B", 10)
            self.set_text_color(41, 128, 185)
            self.cell(0, 7, "代码示例:", new_x="LMARGIN", new_y="NEXT")

            self.set_font("NotoSans", "", 9)
            self.set_fill_color(245, 245, 245)
            self.set_text_color(60, 60, 60)
            self.multi_cell(0, 5.5, code, fill=True)
            self.ln(2)

        # 底部分隔线
        self.set_draw_color(220, 220, 220)
        self.set_line_width(0.2)
        self.line(15, self.get_y() + 2, 195, self.get_y() + 2)


def build_pdf(all_content: dict):
    """构建 PDF"""
    pdf = InterviewPDF()

    # 封面
    total_count = sum(len(v) for v in all_content.values())
    pdf.cover_page()

    # 目录
    pdf.toc_page(all_content)

    # 各章节
    for i, d in enumerate(DIRECTIONS):
        name = d["name"]
        items = all_content.get(name, [])
        if not items:
            continue

        pdf.chapter_title(i + 1, name)

        for j, item in enumerate(items, 1):
            pdf.question_item(j, item)

    # 保存
    pdf.output(OUTPUT_FILE)
    print(f"\nPDF 已保存: {OUTPUT_FILE}")


# ==================== 主函数 ====================
def main():
    print("=" * 60)
    print("  程序员面试宝典 - 生成器")
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
