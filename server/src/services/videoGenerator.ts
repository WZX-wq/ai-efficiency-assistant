import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// ==================== 白山智算 API 配置 ====================
const API_BASE_URL = process.env.BAISHAN_API_URL || 'https://api.edgefn.net/v1/chat/completions';
const API_KEY = process.env.BAISHAN_API_KEY || '';
const MODEL = process.env.MODEL_VIDEO || 'DeepSeek-V3.2';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ==================== 支持的视频类型和时长 ====================
export const VIDEO_TYPES = [
  { id: 'short-video', name: '短视频', description: '抖音/快手风格短视频，节奏快、吸引眼球', platform: '抖音/快手' },
  { id: 'tutorial', name: '教程视频', description: '教学类视频，步骤清晰、讲解详细', platform: 'B站/YouTube' },
  { id: 'promotional', name: '宣传视频', description: '产品/品牌宣传，突出卖点', platform: '全平台' },
  { id: 'documentary', name: '纪录片', description: '纪实风格，叙事性强', platform: 'B站/YouTube' },
  { id: 'vlog', name: 'Vlog', description: '生活记录，轻松自然', platform: 'B站/小红书' },
] as const;

export const VIDEO_DURATIONS = [
  { id: '15s', label: '15秒', seconds: 15 },
  { id: '30s', label: '30秒', seconds: 30 },
  { id: '60s', label: '60秒', seconds: 60 },
  { id: '3min', label: '3分钟', seconds: 180 },
  { id: '5min', label: '5分钟', seconds: 300 },
  { id: '10min', label: '10分钟', seconds: 600 },
] as const;

export type VideoType = (typeof VIDEO_TYPES)[number]['id'];
export type VideoDuration = (typeof VIDEO_DURATIONS)[number]['id'];

// ==================== 请求和响应类型 ====================
export interface VideoScriptRequest {
  topic: string;
  type?: string;
  duration?: string;
  targetAudience?: string;
  tone?: string;
}

export interface VideoScene {
  sceneNumber: number;
  title: string;
  description: string;
  dialogue: string;
  narration: string;
  duration: string;
  visualDirection: string;
  audioDirection: string;
}

export interface VideoScriptResult {
  id: string;
  title: string;
  type: string;
  duration: string;
  scenes: VideoScene[];
}

export interface StoryboardFrame {
  frameNumber: number;
  scene: string;
  visualDescription: string;
  cameraAngle: string;
  duration: string;
  notes: string;
}

export interface StoryboardResult {
  frames: StoryboardFrame[];
}

// ==================== 核心函数 ====================

/**
 * 延迟指定毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 构建视频脚本生成的系统提示词
 */
function buildScriptSystemPrompt(type: string, duration: string): string {
  const typeInfo = VIDEO_TYPES.find((t) => t.id === type) || VIDEO_TYPES[0];
  const durationInfo = VIDEO_DURATIONS.find((d) => d.id === duration) || VIDEO_DURATIONS[2];

  return `你是一位专业的视频脚本编剧，拥有丰富的视频创作经验。请根据用户提供的主题，创作一个完整的视频脚本。

视频类型：${typeInfo.name}（${typeInfo.description}）
适用平台：${typeInfo.platform}
目标时长：${durationInfo.label}

请严格按照以下 JSON 格式输出，不要包含任何其他文字说明或 markdown 代码块标记：

{
  "title": "视频标题",
  "type": "${type}",
  "duration": "${duration}",
  "scenes": [
    {
      "sceneNumber": 1,
      "title": "场景标题",
      "description": "场景整体描述",
      "dialogue": "角色台词（如无对白则为空字符串）",
      "narration": "旁白/画外音（如无旁白则为空字符串）",
      "duration": "场景时长，如 '5s'、'15s'、'1min'",
      "visualDirection": "画面视觉指导，描述镜头、构图、场景布置",
      "audioDirection": "音频指导，描述背景音乐、音效、声音设计"
    }
  ]
}

创作要求：
1. 标题要吸引眼球，符合${typeInfo.name}的特点
2. 场景数量要合理，总时长约 ${durationInfo.label}
3. 每个场景的描述要具体、可执行
4. 对话要自然、有感染力
5. 旁白要有文学性、引导观众情绪
6. 视觉指导要详细，包括景别（远景/中景/近景/特写）、运镜方式等
7. 音频指导要包含背景音乐风格、关键音效
8. ${typeInfo.name}的特点：${typeInfo.description}
9. 确保内容积极向上，不包含违规内容
10. 直接输出 JSON，不要添加 \`\`\`json 或其他标记`;
}

/**
 * 构建分镜生成的系统提示词
 */
function buildStoryboardSystemPrompt(): string {
  return `你是一位专业的视频分镜师。请根据用户提供的视频脚本，为每个场景生成分镜描述。

请严格按照以下 JSON 格式输出，不要包含任何其他文字说明或 markdown 代码块标记：

{
  "frames": [
    {
      "frameNumber": 1,
      "scene": "对应场景编号和标题",
      "visualDescription": "详细的画面视觉描述，包括人物、场景、道具、光影等",
      "cameraAngle": "镜头角度和运镜方式，如 '特写/正面'、'中景/侧面跟拍'、'远景/航拍' 等",
      "duration": "该分镜时长",
      "notes": "拍摄/制作注意事项"
    }
  ]
}

创作要求：
1. 每个场景至少生成 2-3 个分镜
2. 分镜描述要具体、可视化，方便导演和摄影师理解
3. 镜头角度要多样化，避免单调
4. 注意场景之间的衔接和转场
5. 直接输出 JSON，不要添加 \`\`\`json 或其他标记`;
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
    `视频脚本生成失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
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
 * 生成视频脚本
 */
export async function generateVideoScript(request: VideoScriptRequest): Promise<VideoScriptResult> {
  const {
    topic,
    type = 'short-video',
    duration = '60s',
    targetAudience,
    tone,
  } = request;

  if (!topic || typeof topic !== 'string') {
    throw new Error('缺少必填参数 topic');
  }

  const validType = VIDEO_TYPES.some((t) => t.id === type) ? type : 'short-video';
  const validDuration = VIDEO_DURATIONS.some((d) => d.id === duration) ? duration : '60s';

  const systemPrompt = buildScriptSystemPrompt(validType, validDuration);

  let userPrompt = `请为主题"${topic}"创作一个${VIDEO_TYPES.find((t) => t.id === validType)?.name || '短视频'}脚本。`;
  if (targetAudience) {
    userPrompt += `\n目标受众：${targetAudience}`;
  }
  if (tone) {
    userPrompt += `\n整体基调：${tone}`;
  }

  const content = await callAPIWithRetry([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ]);

  const jsonStr = extractJSON(content);
  const parsed = JSON.parse(jsonStr);

  return {
    id: uuidv4(),
    title: parsed.title || topic,
    type: parsed.type || validType,
    duration: parsed.duration || validDuration,
    scenes: (parsed.scenes || []).map((scene: Record<string, unknown>, index: number) => ({
      sceneNumber: (scene.sceneNumber as number) || index + 1,
      title: (scene.title as string) || `场景 ${index + 1}`,
      description: (scene.description as string) || '',
      dialogue: (scene.dialogue as string) || '',
      narration: (scene.narration as string) || '',
      duration: (scene.duration as string) || '',
      visualDirection: (scene.visualDirection as string) || '',
      audioDirection: (scene.audioDirection as string) || '',
    })),
  };
}

/**
 * 生成分镜
 */
export async function generateStoryboard(script: string): Promise<StoryboardResult> {
  if (!script || typeof script !== 'string') {
    throw new Error('缺少必填参数 script');
  }

  const systemPrompt = buildStoryboardSystemPrompt();

  const content = await callAPIWithRetry([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `请根据以下视频脚本生成分镜：\n\n${script}` },
  ]);

  const jsonStr = extractJSON(content);
  const parsed = JSON.parse(jsonStr);

  return {
    frames: (parsed.frames || []).map((frame: Record<string, unknown>, index: number) => ({
      frameNumber: (frame.frameNumber as number) || index + 1,
      scene: (frame.scene as string) || '',
      visualDescription: (frame.visualDescription as string) || '',
      cameraAngle: (frame.cameraAngle as string) || '',
      duration: (frame.duration as string) || '',
      notes: (frame.notes as string) || '',
    })),
  };
}

/**
 * 获取视频服务配置
 */
export function getVideoConfig() {
  return {
    types: VIDEO_TYPES,
    durations: VIDEO_DURATIONS,
    model: MODEL,
    maxTokens: 8192,
    temperature: 0.7,
  };
}
