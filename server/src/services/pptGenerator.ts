import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// ==================== 白山智算 API 配置 ====================
const API_BASE_URL = process.env.BAISHAN_API_URL || 'https://api.edgefn.net/v1/chat/completions';
const API_KEY = process.env.BAISHAN_API_KEY || '';
const MODEL = process.env.MODEL_PPT || 'DeepSeek-V3.2';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ==================== 支持的主题和页数 ====================
export const PPT_THEMES = [
  { id: 'business', name: '商务主题', description: '专业商务风格，适合企业汇报', colors: ['#1a365d', '#2b6cb0', '#4299e1', '#ebf8ff'] },
  { id: 'education', name: '教育主题', description: '清新教育风格，适合教学课件', colors: ['#276749', '#38a169', '#68d391', '#f0fff4'] },
  { id: 'creative', name: '创意主题', description: '活泼创意风格，适合创意提案', colors: ['#9b2c2c', '#e53e3e', '#fc8181', '#fff5f5'] },
  { id: 'minimal', name: '极简主题', description: '简约极简风格，突出内容', colors: ['#2d3748', '#4a5568', '#a0aec0', '#f7fafc'] },
  { id: 'dark', name: '暗色主题', description: '暗色科技风格，适合技术演示', colors: ['#1a202c', '#2d3748', '#4fd1c5', '#0d1117'] },
  { id: 'gradient', name: '渐变主题', description: '渐变色彩风格，现代感强', colors: ['#667eea', '#764ba2', '#f093fb', '#4facfe'] },
] as const;

export const PPT_SLIDE_COUNTS = [5, 8, 10, 15, 20] as const;

export type PptTheme = (typeof PPT_THEMES)[number]['id'];
export type PptSlideCount = (typeof PPT_SLIDE_COUNTS)[number];

// ==================== 请求和响应类型 ====================
export interface PptGenerateRequest {
  topic: string;
  slideCount?: number;
  theme?: string;
  language?: string;
}

export interface PptSlide {
  slideNumber: number;
  title: string;
  content: string[];
  speakerNotes: string;
  layout: string;
}

export interface PptResult {
  id: string;
  title: string;
  theme: string;
  slides: PptSlide[];
}

export interface PptExportRequest {
  pptData: PptResult;
}

export interface PptExportResult {
  downloadUrl: string;
}

// ==================== 核心函数 ====================

/**
 * 延迟指定毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 构建 PPT 内容生成的系统提示词
 */
function buildPptSystemPrompt(theme: string, slideCount: number, language: string): string {
  const themeInfo = PPT_THEMES.find((t) => t.id === theme) || PPT_THEMES[0];
  const langInstruction = language === 'en'
    ? '请使用英文生成所有内容。'
    : '请使用中文生成所有内容。';

  return `你是一位专业的 PPT 内容策划师和演示文稿设计师。请根据用户提供的主题，生成完整的 PPT 内容结构。

主题风格：${themeInfo.name}（${themeInfo.description}）
配色方案：${themeInfo.colors.join(', ')}
幻灯片数量：${slideCount} 页（包含封面页和结束页）
${langInstruction}

请严格按照以下 JSON 格式输出，不要包含任何其他文字说明或 markdown 代码块标记：

{
  "title": "PPT 主标题",
  "theme": "${theme}",
  "slides": [
    {
      "slideNumber": 1,
      "title": "幻灯片标题",
      "content": ["要点1", "要点2", "要点3"],
      "speakerNotes": "演讲者备注，用于辅助演讲",
      "layout": "布局类型：cover/title-content/two-column/three-column/image-text/full-image/quote/data-chart/summary/ending"
    }
  ]
}

创作要求：
1. 第 1 页必须是封面页（layout: "cover"），包含主标题和副标题
2. 最后一页必须是结束页（layout: "ending"），包含感谢语或总结
3. 中间页面根据内容选择合适的布局
4. 每页的 content 数组包含 3-6 个要点
5. speakerNotes 要详细，帮助演讲者展开讲解
6. 内容要有逻辑性、层次分明
7. 标题要简洁有力，内容要点要精炼
8. 确保总共 ${slideCount} 页幻灯片
9. 直接输出 JSON，不要添加 \`\`\`json 或其他标记`;
}

/**
 * 通过 curl 调用白山智算 API
 */
async function callAPIWithRetry(
  messages: Array<{ role: string; content: string }>,
): Promise<string> {
  const requestBody: Record<string, unknown> = {
    model: MODEL,
    messages,
    stream: false,
    temperature: 0.7,
    max_tokens: 8192,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const bodyStr = JSON.stringify(requestBody);
      const escapedBody = bodyStr.replace(/'/g, "'\\''");

      const command = `curl -s --max-time 120 -X POST '${API_BASE_URL}' \
        -H 'Content-Type: application/json' \
        -H 'Authorization: Bearer ${API_KEY}' \
        -d '${escapedBody}'`;

      const responseData = execSync(command, {
        encoding: 'utf-8',
        timeout: 125000,
        maxBuffer: 10 * 1024 * 1024,
      });

      const parsed = JSON.parse(responseData);

      if (parsed.error) {
        throw new Error(
          `白山智算 API 错误: ${parsed.error.message || JSON.stringify(parsed.error)}`,
        );
      }

      return parsed.choices?.[0]?.message?.content || '';
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw new Error(
    `PPT 内容生成失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
  );
}

/**
 * 从 LLM 响应中提取 JSON
 */
function extractJSON(content: string): string {
  // 尝试提取 JSON 代码块
  const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 尝试直接找到 JSON 对象
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0];
  }

  return content.trim();
}

/**
 * 生成 PPT 内容
 */
export async function generatePptContent(request: PptGenerateRequest): Promise<PptResult> {
  const {
    topic,
    slideCount = 10,
    theme = 'business',
    language = 'zh',
  } = request;

  if (!topic || typeof topic !== 'string') {
    throw new Error('缺少必填参数 topic');
  }

  const validTheme = PPT_THEMES.some((t) => t.id === theme) ? theme : 'business';
  const validSlideCount = PPT_SLIDE_COUNTS.includes(slideCount as PptSlideCount)
    ? slideCount
    : 10;

  const systemPrompt = buildPptSystemPrompt(validTheme, validSlideCount, language);

  const content = await callAPIWithRetry([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请为主题"${topic}"生成一份 ${validSlideCount} 页的 PPT 内容。` },
  ]);

  const jsonStr = extractJSON(content);
  const parsed = JSON.parse(jsonStr);

  return {
    id: uuidv4(),
    title: parsed.title || topic,
    theme: parsed.theme || validTheme,
    slides: (parsed.slides || []).map((slide: Record<string, unknown>, index: number) => ({
      slideNumber: (slide.slideNumber as number) || index + 1,
      title: (slide.title as string) || `幻灯片 ${index + 1}`,
      content: Array.isArray(slide.content) ? slide.content.map(String) : [],
      speakerNotes: (slide.speakerNotes as string) || '',
      layout: (slide.layout as string) || 'title-content',
    })),
  };
}

/**
 * 导出 PPT 为可下载格式
 * 将 PPT 数据编码为 base64 Data URL，前端可直接下载
 */
export function exportPpt(pptData: PptResult): PptExportResult {
  // 将 PPT 数据序列化为 JSON 字符串，然后编码为 base64
  const jsonString = JSON.stringify(pptData, null, 2);
  const base64 = Buffer.from(jsonString).toString('base64');
  const downloadUrl = `data:application/json;base64,${base64}`;

  return {
    downloadUrl,
  };
}

/**
 * 获取 PPT 服务配置
 */
export function getPptConfig() {
  return {
    themes: PPT_THEMES,
    slideCounts: PPT_SLIDE_COUNTS,
    model: MODEL,
    maxTokens: 8192,
    temperature: 0.7,
  };
}
