#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
PPT 制作指南与模板 - 调用白山智算 API 生成 10 个不同场景的 PPT 制作指南
输出 PDF 格式，包含封面、目录
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
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "PPT制作指南与模板.pdf")

# 10 个场景
SCENARIOS = [
    "年终总结",
    "商业计划书",
    "教学课件",
    "产品发布",
    "项目汇报",
    "营销方案",
    "培训材料",
    "竞品分析",
    "个人简历",
    "活动策划",
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
def build_scenario_prompt(scenario: str) -> str:
    """构建单个场景的 PPT 指南生成请求"""
    return f"""请为"{scenario}"场景生成一份详细的 PPT 制作指南。

要求内容包含以下 5 个部分：
1. 场景分析(scenario_analysis): 分析该场景 PPT 的受众、目的、核心诉求
2. 结构建议(structure): 推荐的 PPT 页面结构和内容安排（建议 10-15 页），每页说明标题和核心内容
3. 内容模板(content_template): 每页 PPT 的详细内容模板，包含标题、要点、建议配图说明
4. 设计技巧(design_tips): 配色方案、字体选择、排版建议、图表使用等设计方面的专业建议
5. AI 工具推荐(ai_tools): 推荐可用于辅助制作该场景 PPT 的 AI 工具，包含工具名称和使用方法

请严格按照以下 JSON 格式输出，不要输出任何其他内容：
{{
  "scenario_analysis": "场景分析详细内容（200字以上）",
  "structure": "页面结构建议（详细描述每页的标题和核心内容，300字以上）",
  "content_template": "内容模板（逐页详细说明，500字以上）",
  "design_tips": "设计技巧（配色、字体、排版等，300字以上）",
  "ai_tools": "AI 工具推荐及使用方法（200字以上）"
}}

请确保输出是合法的 JSON 格式。"""


def parse_json_response(raw: str, expected_type: type = dict) -> list | dict:
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

    # 3. 提取 JSON 对象
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

    match = re.search(r'\{.*\}', cleaned, re.DOTALL)
    if match:
        try:
            result = json.loads(match.group())
            if isinstance(result, expected_type):
                return result
        except json.JSONDecodeError:
            pass

    return {} if expected_type == dict else []


def generate_scenario_content(scenario: str) -> dict:
    """生成单个场景的 PPT 指南"""
    print(f"\n正在生成场景: {scenario}...")
    raw = call_api(build_scenario_prompt(scenario))
    if not raw:
        print(f"  警告: {scenario} 场景生成失败")
        return {}

    result = parse_json_response(raw, dict)
    if result:
        print(f"  成功获取 {scenario} 指南")
    else:
        print(f"  警告: {scenario} 场景解析失败")
    return result


def generate_all_content() -> dict:
    """生成所有场景的 PPT 指南"""
    all_content = {}
    total = 0
    for scenario in SCENARIOS:
        content = generate_scenario_content(scenario)
        if content:
            all_content[scenario] = content
            total += 1
        time.sleep(1)
    print(f"\n总计生成 {total} 个场景指南")
    return all_content


# ==================== PDF 生成 ====================
class PPTGuidePDF(FPDF):
    def __init__(self):
        super().__init__()
        self.add_font("NotoSans", "", FONT_REGULAR)
        self.add_font("NotoSans", "B", FONT_BOLD)
        self.set_auto_page_break(auto=True, margin=20)

    def header(self):
        if self.page_no() > 1:
            self.set_font("NotoSans", "", 8)
            self.set_text_color(150, 150, 150)
            self.cell(0, 8, "PPT 制作指南与模板", align="L")
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
        self.set_draw_color(155, 89, 182)
        self.set_line_width(1.5)
        self.line(30, self.get_y(), 180, self.get_y())
        self.ln(15)

        self.set_font("NotoSans", "B", 30)
        self.set_text_color(33, 37, 41)
        self.multi_cell(0, 16, "PPT 制作指南与模板", align="C")
        self.ln(8)

        self.set_font("NotoSans", "", 14)
        self.set_text_color(100, 100, 100)
        self.multi_cell(0, 10, "10 大场景 PPT 制作完全指南\n从场景分析到 AI 辅助，打造专业演示文稿", align="C")
        self.ln(15)

        self.set_draw_color(155, 89, 182)
        self.line(30, self.get_y(), 180, self.get_y())
        self.ln(30)

        self.set_font("NotoSans", "", 12)
        self.set_text_color(130, 130, 130)
        today = datetime.now().strftime("%Y 年 %m 月")
        self.cell(0, 10, today, align="C")
        self.ln(8)
        self.cell(0, 10, "由 AI 智能生成", align="C")

    def toc_page(self, scenarios: list):
        """目录页"""
        self.add_page()
        self.set_font("NotoSans", "B", 24)
        self.set_text_color(33, 37, 41)
        self.cell(0, 15, "目  录", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)

        for i, scenario in enumerate(scenarios):
            self.set_font("NotoSans", "B", 14)
            self.set_text_color(155, 89, 182)
            self.cell(0, 12, f"指南 {i+1}  {scenario}", new_x="LMARGIN", new_y="NEXT")
            self.set_font("NotoSans", "", 11)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, f"    场景分析 | 结构建议 | 内容模板 | 设计技巧 | AI 工具推荐", new_x="LMARGIN", new_y="NEXT")
            self.ln(3)

    def scenario_chapter(self, index: int, scenario: str, content: dict):
        """单个场景指南章节"""
        # 章节标题页
        self.add_page()
        self.ln(25)
        self.set_font("NotoSans", "B", 14)
        self.set_text_color(155, 89, 182)
        self.cell(0, 10, f"指南 {index}", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(3)
        self.set_font("NotoSans", "B", 26)
        self.set_text_color(33, 37, 41)
        self.cell(0, 15, scenario, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(8)
        self.set_draw_color(155, 89, 182)
        self.set_line_width(0.5)
        self.line(60, self.get_y(), 150, self.get_y())
        self.ln(15)

        # 5 个部分
        sections = [
            ("一、场景分析", "scenario_analysis"),
            ("二、结构建议", "structure"),
            ("三、内容模板", "content_template"),
            ("四、设计技巧", "design_tips"),
            ("五、AI 工具推荐", "ai_tools"),
        ]

        for section_title, key in sections:
            section_text = content.get(key, "")
            if not section_text:
                continue

            # 检查是否需要换页
            if self.get_y() > 220:
                self.add_page()

            self.ln(5)
            self.set_font("NotoSans", "B", 13)
            self.set_text_color(155, 89, 182)
            self.cell(0, 10, section_title, new_x="LMARGIN", new_y="NEXT")

            # 分隔线
            self.set_draw_color(155, 89, 182)
            self.set_line_width(0.3)
            self.line(15, self.get_y(), 195, self.get_y())
            self.ln(3)

            self.set_font("NotoSans", "", 10)
            self.set_text_color(50, 50, 50)
            self.multi_cell(0, 6, section_text)
            self.ln(3)


def build_pdf(all_content: dict):
    """构建 PDF"""
    pdf = PPTGuidePDF()

    # 封面
    pdf.cover_page()

    # 目录
    pdf.toc_page(SCENARIOS)

    # 各场景章节
    for i, scenario in enumerate(SCENARIOS):
        content = all_content.get(scenario, {})
        if not content:
            continue
        pdf.scenario_chapter(i + 1, scenario, content)

    # 保存
    pdf.output(OUTPUT_FILE)
    print(f"\nPDF 已保存: {OUTPUT_FILE}")


# ==================== 主函数 ====================
def main():
    print("=" * 60)
    print("  PPT 制作指南与模板 - 生成器")
    print("=" * 60)

    all_content = generate_all_content()

    if not all_content:
        print("\n错误: 未能生成任何内容，退出")
        sys.exit(1)

    print("\n正在生成 PDF...")
    build_pdf(all_content)
    print("完成!")


if __name__ == "__main__":
    main()
