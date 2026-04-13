#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI 数字化代运营服务报价单 PDF 生成脚本
使用 fpdf2 生成专业美观的中文报价单
"""

import os
from fpdf import FPDF

# 字体路径
FONT_DIR = "/usr/share/fonts/opentype/noto"
FONT_REGULAR = os.path.join(FONT_DIR, "NotoSansCJK-Regular.ttc")
FONT_BOLD = os.path.join(FONT_DIR, "NotoSansCJK-Bold.ttc")
FONT_MEDIUM = os.path.join(FONT_DIR, "NotoSansCJK-Medium.ttc")

# 颜色定义
PRIMARY = (37, 99, 235)       # #2563EB - 主色蓝
PRIMARY_DARK = (29, 78, 216)  # #1D4ED8
PRIMARY_LIGHT = (219, 234, 254) # #DBEAFE
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
GRAY_900 = (17, 24, 39)
GRAY_700 = (55, 65, 81)
GRAY_600 = (75, 85, 99)
GRAY_500 = (107, 114, 128)
GRAY_400 = (156, 163, 175)
GRAY_300 = (209, 213, 219)
GRAY_200 = (229, 231, 235)
GRAY_100 = (243, 244, 246)
GRAY_50 = (249, 250, 251)
ACCENT_GREEN = (16, 185, 129)
ACCENT_AMBER = (245, 158, 11)
ACCENT_PURPLE = (139, 92, 246)


class ServiceQuotePDF(FPDF):
    """AI 代运营服务报价单 PDF"""

    def __init__(self):
        super().__init__()
        # 注册中文字体
        self.add_font("noto", "", FONT_REGULAR)
        self.add_font("noto", "B", FONT_BOLD)
        self.add_font("noto", "I", FONT_MEDIUM)
        self.set_auto_page_break(auto=True, margin=25)

    def _draw_rounded_rect(self, x, y, w, h, r, style="D", fill_color=None, draw_color=None):
        """绘制圆角矩形"""
        if fill_color:
            self.set_fill_color(*fill_color)
        if draw_color:
            self.set_draw_color(*draw_color)
        else:
            self.set_draw_color(*GRAY_300)
        self.rect(x, y, w, h, style)

    def _draw_circle(self, x, y, r, fill_color=None):
        """绘制圆形"""
        if fill_color:
            self.set_fill_color(*fill_color)
        # 用椭圆近似
        self.ellipse(x - r, y - r, r * 2, r * 2, "F")

    def _draw_gradient_bg(self, y_start, h, color_top, color_bottom):
        """绘制渐变背景（用多个矩形模拟）"""
        steps = 50
        step_h = h / steps
        for i in range(steps):
            ratio = i / steps
            r = int(color_top[0] + (color_bottom[0] - color_top[0]) * ratio)
            g = int(color_top[1] + (color_bottom[1] - color_top[1]) * ratio)
            b = int(color_top[2] + (color_bottom[2] - color_top[2]) * ratio)
            self.set_fill_color(r, g, b)
            self.rect(0, y_start + i * step_h, 210, step_h + 0.5, "F")

    def _section_title(self, title, subtitle=None):
        """绘制章节标题"""
        self.ln(8)
        # 左侧装饰线
        self.set_fill_color(*PRIMARY)
        self.rect(self.l_margin, self.get_y(), 4, 18, "F")
        self.set_x(self.l_margin + 10)
        self.set_font("noto", "B", 18)
        self.set_text_color(*GRAY_900)
        self.cell(0, 18, title, new_x="LMARGIN", new_y="NEXT")
        if subtitle:
            self.set_x(self.l_margin + 10)
            self.set_font("noto", "", 10)
            self.set_text_color(*GRAY_500)
            self.cell(0, 6, subtitle, new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

    def cover_page(self):
        """封面页"""
        self.add_page()

        # 渐变背景
        self._draw_gradient_bg(0, 297, (30, 64, 175), (37, 99, 235))

        # 装饰圆形
        self.set_fill_color(255, 255, 255)
        self.set_draw_color(255, 255, 255)
        # 大圆
        self.ellipse(-30, -30, 120, 120, "F")
        # 半透明装饰圆用浅色模拟
        self.set_fill_color(50, 110, 240)
        self.ellipse(140, 180, 100, 100, "F")
        self.set_fill_color(45, 105, 237)
        self.ellipse(160, 20, 80, 80, "F")

        # 顶部 Logo 区域
        self.set_y(50)
        self.set_font("noto", "B", 14)
        self.set_text_color(*WHITE)
        self.cell(0, 10, "AI 效率助手", align="C", new_x="LMARGIN", new_y="NEXT")

        # 分隔线
        self.ln(5)
        self.set_draw_color(255, 255, 255)
        self.set_line_width(0.5)
        line_w = 40
        self.line(105 - line_w / 2, self.get_y(), 105 + line_w / 2, self.get_y())

        # 主标题
        self.ln(30)
        self.set_font("noto", "B", 32)
        self.set_text_color(*WHITE)
        self.cell(0, 16, "AI 数字化代运营", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 16, "服务方案", align="C", new_x="LMARGIN", new_y="NEXT")

        # 副标题
        self.ln(10)
        self.set_font("noto", "", 16)
        self.set_text_color(200, 220, 255)
        self.cell(0, 10, "让 AI 赋能您的生意", align="C", new_x="LMARGIN", new_y="NEXT")

        # 日期
        self.ln(15)
        self.set_font("noto", "", 12)
        self.set_text_color(180, 200, 240)
        self.cell(0, 8, "2026 年 4 月", align="C", new_x="LMARGIN", new_y="NEXT")

        # 底部信息
        self.set_y(260)
        self.set_font("noto", "", 9)
        self.set_text_color(160, 190, 230)
        self.cell(0, 6, "专业  |  高效  |  数据驱动", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 6, "www.ai-efficiency-assistant.com", align="C", new_x="LMARGIN", new_y="NEXT")

    def company_intro_page(self):
        """公司介绍页"""
        self.add_page()

        # 页面标题
        self.set_y(25)
        self._section_title("关于我们", "About Us")

        # 公司名
        self.set_font("noto", "B", 16)
        self.set_text_color(*GRAY_900)
        self.cell(0, 12, "AI 效率助手团队", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)

        # 介绍内容
        intro_text = (
            "AI 效率助手团队专注于用 AI 工具帮助中小商家实现数字化转型。"
            "我们拥有一支经验丰富的技术团队和运营团队，深谙本地生活服务行业的痛点与需求。"
            "通过自主研发的 AI 工具链和成熟的运营方法论，我们帮助商家在短视频、团购、"
            "私域运营等多个维度实现降本增效。"
        )
        self.set_font("noto", "", 10.5)
        self.set_text_color(*GRAY_700)
        self.multi_cell(0, 7, intro_text)
        self.ln(4)

        intro_text2 = (
            '我们的核心理念是"AI + 运营"双轮驱动：既用先进的人工智能技术提升内容生产效率，'
            "又以专业的运营策略确保每一分投入都能产生可量化的回报。"
            "无论是刚起步的小店，还是寻求突破的连锁品牌，我们都能提供量身定制的解决方案。"
        )
        self.multi_cell(0, 7, intro_text2)
        self.ln(8)

        # 核心优势 - 4 个卡片
        self._section_title("核心优势")

        advantages = [
            ("AI 技术驱动", "自研 AI 工具链，内容生产效率提升 10 倍以上", PRIMARY),
            ("数据驱动决策", "实时数据监控与分析，精准优化运营策略", ACCENT_GREEN),
            ("专业运营团队", "深耕本地生活服务，拥有丰富的实战经验", ACCENT_AMBER),
            ("灵活定制方案", "根据商家需求量身定制，按需选择服务内容", ACCENT_PURPLE),
        ]

        card_w = (170 - 15) / 2
        start_x = self.l_margin
        start_y = self.get_y()

        for i, (title, desc, color) in enumerate(advantages):
            col = i % 2
            row = i // 2
            x = start_x + col * (card_w + 15)
            y = start_y + row * 35

            # 卡片背景
            self.set_fill_color(*GRAY_50)
            self.rect(x, y, card_w, 30, "F")

            # 左侧色条
            self.set_fill_color(*color)
            self.rect(x, y, 3, 30, "F")

            # 标题
            self.set_xy(x + 8, y + 4)
            self.set_font("noto", "B", 11)
            self.set_text_color(*GRAY_900)
            self.cell(card_w - 12, 8, title)

            # 描述
            self.set_xy(x + 8, y + 14)
            self.set_font("noto", "", 8.5)
            self.set_text_color(*GRAY_600)
            self.multi_cell(card_w - 12, 5, desc)

        self.set_y(start_y + 80)

    def services_page(self):
        """服务内容页"""
        self.add_page()

        self.set_y(25)
        self._section_title("服务内容", "Our Services")

        services = [
            {
                "title": "短视频制作",
                "desc": "AI 辅助脚本创作、智能剪辑、批量产出高质量短视频内容，覆盖抖音、快手、小红书等主流平台",
                "icon": "01",
                "color": PRIMARY,
            },
            {
                "title": "团购运营",
                "desc": "团购商品上架优化、价格策略制定、活动策划执行，提升团购转化率和客单价",
                "icon": "02",
                "color": ACCENT_GREEN,
            },
            {
                "title": "私域搭建",
                "desc": "企业微信/社群搭建、用户分层运营、自动化营销工具配置，构建商家私域流量池",
                "icon": "03",
                "color": ACCENT_AMBER,
            },
            {
                "title": "AI 客服",
                "desc": "基于大语言模型的智能客服系统，7x24 小时自动回复，提升客户满意度与复购率",
                "icon": "04",
                "color": ACCENT_PURPLE,
            },
            {
                "title": "数据分析",
                "desc": "多维度数据看板、竞品分析、用户画像构建，用数据指导运营决策",
                "icon": "05",
                "color": (239, 68, 68),
            },
        ]

        for svc in services:
            y_start = self.get_y()

            # 序号圆圈
            self.set_fill_color(*svc["color"])
            cx = self.l_margin + 8
            cy = y_start + 8
            self.ellipse(cx - 8, cy - 8, 16, 16, "F")
            self.set_xy(cx - 8, cy - 5)
            self.set_font("noto", "B", 9)
            self.set_text_color(*WHITE)
            self.cell(16, 10, svc["icon"], align="C")

            # 标题
            self.set_xy(self.l_margin + 22, y_start + 2)
            self.set_font("noto", "B", 12)
            self.set_text_color(*GRAY_900)
            self.cell(0, 8, svc["title"])

            # 描述
            self.set_xy(self.l_margin + 22, y_start + 12)
            self.set_font("noto", "", 9)
            self.set_text_color(*GRAY_600)
            self.multi_cell(155, 5.5, svc["desc"])

            # 分隔线
            self.set_draw_color(*GRAY_200)
            self.set_line_width(0.3)
            line_y = self.get_y() + 4
            self.line(self.l_margin, line_y, 195, line_y)
            self.ln(8)

    def pricing_page(self):
        """套餐定价页"""
        self.add_page()

        self.set_y(25)
        self._section_title("服务套餐", "Service Packages")

        plans = [
            {
                "name": "基础版",
                "price": "2,000",
                "period": "元/月",
                "tag": "入门首选",
                "tag_color": GRAY_500,
                "features": [
                    "短视频制作 10 条/月",
                    "团购基础维护",
                    "基础数据报表",
                    "工作日在线客服",
                ],
                "highlighted": False,
            },
            {
                "name": "标准版",
                "price": "5,000",
                "period": "元/月",
                "tag": "最受欢迎",
                "tag_color": ACCENT_AMBER,
                "features": [
                    "短视频制作 20 条/月",
                    "团购优化运营",
                    "私域流量搭建",
                    "AI 智能客服",
                    "数据分析报告",
                    "7x12 小时客服支持",
                ],
                "highlighted": True,
            },
            {
                "name": "高级版",
                "price": "10,000",
                "period": "元/月",
                "tag": "全能旗舰",
                "tag_color": PRIMARY,
                "features": [
                    "短视频制作 40 条/月",
                    "团购深度运营",
                    "私域体系搭建",
                    "AI 智能客服",
                    "深度数据分析",
                    "直播操盘服务",
                    "全域运营策略",
                    "专属运营顾问",
                    "7x24 小时 VIP 支持",
                ],
                "highlighted": False,
            },
        ]

        card_w = (170 - 12) / 3
        start_x = self.l_margin
        start_y = self.get_y()

        for i, plan in enumerate(plans):
            x = start_x + i * (card_w + 6)
            y = start_y

            if plan["highlighted"]:
                # 高亮卡片 - 蓝色背景
                self.set_fill_color(*PRIMARY)
                self.rect(x, y, card_w, 140, "F")
                text_color = WHITE
                feature_color = (200, 220, 255)
                check_color = (150, 200, 255)
            else:
                # 普通卡片 - 白色背景带边框
                self.set_fill_color(*WHITE)
                self.set_draw_color(*GRAY_300)
                self.rect(x, y, card_w, 140, "DF")
                text_color = GRAY_900
                feature_color = GRAY_600
                check_color = ACCENT_GREEN

            # 标签
            tag_y = y + 6
            self.set_fill_color(*plan["tag_color"])
            tag_w = self.get_string_width(plan["tag"]) + 10
            tag_x = x + (card_w - tag_w) / 2
            self.rect(tag_x, tag_y, tag_w, 6, "F")
            self.set_xy(tag_x, tag_y)
            self.set_font("noto", "B", 7)
            self.set_text_color(*WHITE)
            self.cell(tag_w, 6, plan["tag"], align="C")

            # 套餐名
            self.set_xy(x, y + 16)
            self.set_font("noto", "B", 14)
            self.set_text_color(*text_color)
            self.cell(card_w, 10, plan["name"], align="C")

            # 价格
            self.set_xy(x, y + 28)
            self.set_font("noto", "B", 22)
            self.set_text_color(*text_color)
            self.cell(card_w, 12, f"{plan['price']}", align="C")

            self.set_xy(x, y + 40)
            self.set_font("noto", "", 9)
            self.set_text_color(*feature_color)
            self.cell(card_w, 6, plan["period"], align="C")

            # 分隔线
            self.set_draw_color(*GRAY_300 if not plan["highlighted"] else (100, 150, 220))
            self.set_line_width(0.3)
            self.line(x + 10, y + 50, x + card_w - 10, y + 50)

            # 功能列表
            fy = y + 55
            for feat in plan["features"]:
                self.set_xy(x + 10, fy)
                self.set_font("noto", "", 7.5)
                self.set_text_color(*check_color)
                self.cell(5, 5, "v")
                self.set_text_color(*feature_color)
                self.cell(card_w - 20, 5, feat)
                fy += 8

        self.set_y(start_y + 150)

        # 补充说明
        self.set_font("noto", "", 9)
        self.set_text_color(*GRAY_500)
        note = "* 以上价格均为标准报价，具体费用根据商家实际需求可能有所调整。所有套餐均支持按季度/年度付费，年付享 85 折优惠。"
        self.multi_cell(0, 5, note)

    def case_study_page(self):
        """成功案例页"""
        self.add_page()

        self.set_y(25)
        self._section_title("成功案例", "Case Study")

        # 案例标题
        self.set_font("noto", "B", 14)
        self.set_text_color(*GRAY_900)
        self.cell(0, 10, "AI 效率助手 - 开源项目", new_x="LMARGIN", new_y="NEXT")
        self.ln(2)

        # 案例描述
        case_desc = (
            "AI 效率助手是一款开源的 AI 内容创作工具，提供智能改写、一键扩写、多语言翻译、"
            "内容总结等核心功能。项目在 GitHub 上获得 200+ Star，Web 端日活跃用户超过 1000 人，"
            "获得了开发者和内容创作者的广泛好评。"
        )
        self.set_font("noto", "", 10)
        self.set_text_color(*GRAY_700)
        self.multi_cell(0, 6.5, case_desc)
        self.ln(6)

        # 数据指标卡片
        metrics = [
            ("200+", "GitHub Star", PRIMARY),
            ("1000+", "Web 端日活", ACCENT_GREEN),
            ("50K+", "累计用户", ACCENT_AMBER),
            ("4.9/5", "用户评分", ACCENT_PURPLE),
        ]

        card_w = (170 - 18) / 4
        start_x = self.l_margin
        start_y = self.get_y()

        for i, (value, label, color) in enumerate(metrics):
            x = start_x + i * (card_w + 6)
            y = start_y

            # 卡片背景
            self.set_fill_color(*GRAY_50)
            self.rect(x, y, card_w, 35, "F")

            # 顶部色条
            self.set_fill_color(*color)
            self.rect(x, y, card_w, 3, "F")

            # 数值
            self.set_xy(x, y + 8)
            self.set_font("noto", "B", 16)
            self.set_text_color(*color)
            self.cell(card_w, 10, value, align="C")

            # 标签
            self.set_xy(x, y + 20)
            self.set_font("noto", "", 8)
            self.set_text_color(*GRAY_600)
            self.cell(card_w, 6, label, align="C")

        self.set_y(start_y + 48)

        # 项目亮点
        self.ln(8)
        self._section_title("项目亮点")

        highlights = [
            "完全开源，代码质量高，架构清晰，便于二次开发",
            "支持 Chrome 插件和 Web 端双平台使用",
            "集成多种 AI 模型，支持自定义 API 接入",
            "用户友好的界面设计，操作简单直观",
            "活跃的社区生态，持续迭代更新",
        ]

        for hl in highlights:
            self.set_font("noto", "", 9.5)
            self.set_text_color(*ACCENT_GREEN)
            bullet_x = self.l_margin
            self.set_x(bullet_x)
            self.cell(6, 6, "+")
            self.set_text_color(*GRAY_700)
            self.multi_cell(155, 6, hl)
            self.ln(1)

    def process_page(self):
        """服务流程页"""
        self.add_page()

        self.set_y(25)
        self._section_title("服务流程", "Service Process")

        steps = [
            {
                "step": "01",
                "title": "需求沟通",
                "desc": "深入了解您的业务模式、目标用户和当前痛点，明确运营目标和预期效果",
                "color": PRIMARY,
            },
            {
                "step": "02",
                "title": "方案制定",
                "desc": "根据需求量身定制运营方案，包含内容策略、投放计划、数据指标等详细规划",
                "color": ACCENT_GREEN,
            },
            {
                "step": "03",
                "title": "执行交付",
                "desc": "专业团队按计划执行，定期产出内容、优化运营，确保各项指标稳步提升",
                "color": ACCENT_AMBER,
            },
            {
                "step": "04",
                "title": "数据复盘",
                "desc": "定期进行数据分析与复盘，总结经验教训，持续优化运营策略和执行方案",
                "color": ACCENT_PURPLE,
            },
        ]

        for i, step in enumerate(steps):
            y_start = self.get_y()

            # 步骤编号背景
            self.set_fill_color(*step["color"])
            self.rect(self.l_margin, y_start, 40, 40, "F")

            # 步骤编号
            self.set_xy(self.l_margin, y_start + 5)
            self.set_font("noto", "B", 18)
            self.set_text_color(*WHITE)
            self.cell(40, 14, step["step"], align="C")

            self.set_xy(self.l_margin, y_start + 20)
            self.set_font("noto", "B", 10)
            self.cell(40, 8, step["title"], align="C")

            # 描述
            self.set_xy(self.l_margin + 48, y_start + 5)
            self.set_font("noto", "", 10)
            self.set_text_color(*GRAY_700)
            self.multi_cell(120, 6.5, step["desc"])

            # 连接箭头（非最后一步）
            if i < len(steps) - 1:
                arrow_y = y_start + 44
                self.set_fill_color(*GRAY_300)
                # 箭头三角
                cx = self.l_margin + 20
                self.set_draw_color(*GRAY_300)
                self.set_line_width(0.5)
                self.line(cx, arrow_y, cx, arrow_y + 6)
                # 箭头头部
                self.ellipse(cx - 2, arrow_y + 5, 4, 4, "F")

            self.set_y(y_start + 52)

    def contact_page(self):
        """联系方式页"""
        self.add_page()

        self.set_y(25)
        self._section_title("联系我们", "Contact Us")

        self.ln(5)

        # 联系信息卡片
        contacts = [
            {
                "label": "微信",
                "value": "AI-Efficiency-Asst",
                "icon": "WeChat",
                "color": (7, 193, 96),
            },
            {
                "label": "电话",
                "value": "400-888-0000",
                "icon": "Phone",
                "color": PRIMARY,
            },
            {
                "label": "邮箱",
                "value": "contact@ai-efficiency.com",
                "icon": "Email",
                "color": ACCENT_AMBER,
            },
            {
                "label": "地址",
                "value": "中国 · 白山",
                "icon": "Location",
                "color": ACCENT_PURPLE,
            },
        ]

        for contact in contacts:
            y_start = self.get_y()

            # 图标背景
            self.set_fill_color(*contact["color"])
            self.rect(self.l_margin, y_start, 12, 12, "F")
            self.set_xy(self.l_margin, y_start + 1)
            self.set_font("noto", "B", 7)
            self.set_text_color(*WHITE)
            self.cell(12, 10, contact["icon"][0], align="C")

            # 标签
            self.set_xy(self.l_margin + 18, y_start)
            self.set_font("noto", "B", 11)
            self.set_text_color(*GRAY_900)
            self.cell(30, 7, contact["label"])

            # 值
            self.set_xy(self.l_margin + 18, y_start + 8)
            self.set_font("noto", "", 10)
            self.set_text_color(*GRAY_600)
            self.cell(0, 7, contact["value"])

            self.ln(18)

        self.ln(10)

        # CTA 区域
        cta_y = self.get_y()
        self._draw_gradient_bg(cta_y, 50, PRIMARY_DARK, PRIMARY)

        self.set_y(cta_y + 12)
        self.set_font("noto", "B", 16)
        self.set_text_color(*WHITE)
        self.cell(0, 10, "期待与您合作", align="C", new_x="LMARGIN", new_y="NEXT")

        self.set_font("noto", "", 10)
        self.set_text_color(200, 220, 255)
        self.cell(0, 7, "扫码添加微信，获取免费运营诊断方案", align="C", new_x="LMARGIN", new_y="NEXT")

        self.set_y(cta_y + 55)

        # 页脚声明
        self.ln(10)
        self.set_font("noto", "", 8)
        self.set_text_color(*GRAY_400)
        self.multi_cell(0, 5, (
            "免责声明：本报价单仅供参考，最终价格以双方签订的正式合同为准。"
            "AI 效率助手保留对本报价单内容的最终解释权。"
            "本报价单有效期为 30 天，自出具之日起计算。"
        ))

    def page_footer(self):
        """页脚"""
        if self.page_no() > 1:
            self.set_y(-15)
            self.set_font("noto", "", 8)
            self.set_text_color(*GRAY_400)
            self.set_draw_color(*GRAY_200)
            self.set_line_width(0.3)
            self.line(self.l_margin, self.get_y() - 2, 195, self.get_y() - 2)
            self.cell(0, 10, f"AI 数字化代运营服务方案  |  第 {self.page_no() - 1} 页", align="C")

    def generate(self, output_path):
        """生成完整 PDF"""
        # 封面
        self.cover_page()

        # 公司介绍
        self.company_intro_page()
        self.page_footer()

        # 服务内容
        self.services_page()
        self.page_footer()

        # 套餐定价
        self.pricing_page()
        self.page_footer()

        # 成功案例
        self.case_study_page()
        self.page_footer()

        # 服务流程
        self.process_page()
        self.page_footer()

        # 联系方式
        self.contact_page()
        self.page_footer()

        self.output(output_path)
        print(f"PDF 报价单已生成: {output_path}")


if __name__ == "__main__":
    output_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, "AI代运营服务报价单.pdf")
    pdf = ServiceQuotePDF()
    pdf.generate(output_path)
