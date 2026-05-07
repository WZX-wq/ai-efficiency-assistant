import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// ==================== 白山智算 API 配置 ====================
const API_BASE_URL = process.env.BAISHAN_API_URL || 'https://api.edgefn.net/v1/chat/completions';
const API_KEY = process.env.BAISHAN_API_KEY || '';
const MODEL = process.env.MODEL_PAINTING || 'DeepSeek-V3.2';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ==================== 支持的风格和尺寸 ====================
export const PAINTING_STYLES = [
  { id: 'realistic', name: '写实风格', description: '逼真的写实风格，注重光影和细节' },
  { id: 'anime', name: '动漫风格', description: '日系动漫风格，色彩鲜明' },
  { id: 'abstract', name: '抽象风格', description: '抽象艺术，强调形式和色彩' },
  { id: 'minimalist', name: '极简风格', description: '极简主义，少即是多' },
  { id: 'watercolor', name: '水彩风格', description: '水彩画风格，柔和通透' },
  { id: 'oil-painting', name: '油画风格', description: '油画风格，厚重质感' },
  { id: 'pixel-art', name: '像素风格', description: '像素艺术，复古游戏风格' },
  { id: 'sketch', name: '素描风格', description: '铅笔素描，黑白线条' },
] as const;

export const PAINTING_SIZES = [
  { id: '256x256', width: 256, height: 256, label: '256x256 (小)' },
  { id: '512x512', width: 512, height: 512, label: '512x512 (中)' },
  { id: '1024x1024', width: 1024, height: 1024, label: '1024x1024 (大)' },
  { id: '1024x1792', width: 1024, height: 1792, label: '1024x1792 (竖版)' },
  { id: '1792x1024', width: 1792, height: 1024, label: '1792x1024 (横版)' },
] as const;

export type PaintingStyle = (typeof PAINTING_STYLES)[number]['id'];
export type PaintingSize = (typeof PAINTING_SIZES)[number]['id'];

export interface PaintingRequest {
  prompt: string;
  style?: string;
  size?: string;
  negativePrompt?: string;
}

export interface PaintingResult {
  id: string;
  svg: string;
  style: string;
  size: string;
  prompt: string;
  revisedPrompt: string;
}

/**
 * 延迟指定毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 构建绘画系统提示词
 */
function buildPaintingSystemPrompt(style: string, size: string): string {
  const sizeInfo = PAINTING_SIZES.find((s) => s.id === size) || PAINTING_SIZES[1];
  const styleInfo = PAINTING_STYLES.find((s) => s.id === style);

  const styleInstruction = styleInfo
    ? `请使用${styleInfo.name}（${styleInfo.description}）来创作。`
    : '请使用写实风格来创作。';

  return `你是一位世界级的 SVG 艺术大师。你的任务是根据用户的文字描述，创建精美的 SVG 矢量图艺术作品。

${styleInstruction}

画布尺寸要求：${sizeInfo.width}x${sizeInfo.height} 像素。请在 SVG 的 viewBox 中使用 "0 0 ${sizeInfo.width} ${sizeInfo.height}"。

创作要求：
1. 只输出纯 SVG 代码，不要包含任何 markdown 代码块标记（不要 \`\`\`svg 或 \`\`\`）
2. 不要添加任何文字说明、解释或注释
3. SVG 必须是完整的、自包含的，包含所有必要的样式定义
4. 充分利用 SVG 的能力：渐变、滤镜、路径、形状、文字、动画等
5. 色彩搭配要和谐美观，构图要有层次感
6. 确保所有路径和形状语法正确，可以被浏览器正常渲染
7. 使用内联样式或 <style> 标签定义样式
8. 对于写实风格，使用丰富的渐变和阴影模拟真实感
9. 对于动漫风格，使用鲜明的色彩和简洁的线条
10. 对于抽象风格，大胆使用几何形状和色彩对比
11. 对于极简风格，使用最少的元素传达核心概念
12. 对于水彩风格，使用透明度和柔和的渐变
13. 对于油画风格，使用厚重的色彩叠加效果
14. 对于像素风格，使用矩形网格模拟像素点
15. 对于素描风格，使用灰色调的线条和阴影

请直接输出 SVG 代码，以 <svg 开头，以 </svg> 结尾。`;
}

/**
 * 通过 curl 调用白山智算 API 生成 SVG
 */
async function generateSVGWithRetry(
  prompt: string,
  style: string,
  size: string,
  negativePrompt?: string,
): Promise<string> {
  const systemPrompt = buildPaintingSystemPrompt(style, size);

  let userPrompt = `请根据以下描述创作一幅 SVG 艺术：\n\n${prompt}`;
  if (negativePrompt) {
    userPrompt += `\n\n请避免以下元素：${negativePrompt}`;
  }

  const requestBody: Record<string, unknown> = {
    model: MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    temperature: 0.8,
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

      const content = parsed.choices?.[0]?.message?.content || '';
      return extractSVG(content);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw new Error(
    `AI 绘画生成失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
  );
}

/**
 * 从 LLM 响应中提取 SVG 代码
 */
function extractSVG(content: string): string {
  // 尝试提取 <svg>...</svg> 内容
  const svgMatch = content.match(/<svg[\s\S]*?<\/svg>/i);
  if (svgMatch) {
    return svgMatch[0];
  }

  // 如果没有找到 SVG 标签，尝试清理 markdown 代码块
  const codeBlockMatch = content.match(/```(?:svg|html)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    const innerSvgMatch = inner.match(/<svg[\s\S]*?<\/svg>/i);
    if (innerSvgMatch) {
      return innerSvgMatch[0];
    }
    // 如果代码块内容本身就是 SVG（以 <svg 开头）
    if (inner.startsWith('<svg')) {
      return inner;
    }
  }

  // 如果内容直接以 <svg 开头
  const trimmed = content.trim();
  if (trimmed.startsWith('<svg')) {
    const endIdx = trimmed.lastIndexOf('</svg>');
    if (endIdx !== -1) {
      return trimmed.substring(0, endIdx + 6);
    }
  }

  throw new Error('无法从 AI 响应中提取有效的 SVG 代码');
}

/**
 * 生成 AI 绘画（SVG）
 */
export async function generatePainting(request: PaintingRequest): Promise<PaintingResult> {
  const { prompt, style = 'realistic', size = '1024x1024', negativePrompt } = request;

  // 参数校验
  if (!prompt || typeof prompt !== 'string') {
    throw new Error('缺少必填参数 prompt');
  }

  const validStyle = PAINTING_STYLES.some((s) => s.id === style) ? style : 'realistic';
  const validSize = PAINTING_SIZES.some((s) => s.id === size) ? size : '1024x1024';

  const svg = await generateSVGWithRetry(prompt, validStyle, validSize, negativePrompt);

  // 生成优化后的提示词描述
  const styleInfo = PAINTING_STYLES.find((s) => s.id === validStyle);
  const revisedPrompt = `${styleInfo?.name || '写实'}风格 - ${prompt}`;

  return {
    id: uuidv4(),
    svg,
    style: validStyle,
    size: validSize,
    prompt,
    revisedPrompt,
  };
}

/**
 * 获取绘画服务配置
 */
export function getPaintingConfig() {
  return {
    styles: PAINTING_STYLES,
    sizes: PAINTING_SIZES,
    model: MODEL,
    maxTokens: 8192,
    temperature: 0.8,
  };
}
