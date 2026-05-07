import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  ImageGenerationRequest,
  ImageGenerationResponse,
  ImageGenerationResult,
  ImageGenerationStatus,
} from '../types';

// 白山智算 API 配置
const BAISHAN_API_BASE_URL = 'https://api.baishan.com/v1/images/generations';
const BAISHAN_API_KEY = process.env.BAISHAN_API_KEY || '';

// 备用 API 配置 (DeepSeek 或其他)
const BACKUP_API_BASE_URL = process.env.BACKUP_IMAGE_API_URL || '';
const BACKUP_API_KEY = process.env.BACKUP_IMAGE_API_KEY || '';

// 默认配置
const DEFAULT_MODEL = 'sd-xl';
const DEFAULT_SIZE = '1024x1024';
const DEFAULT_QUALITY = 'standard';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

// 上传目录
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/images';

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/**
 * 延迟指定毫秒数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 发送 HTTP/HTTPS 请求的通用方法
 */
function httpRequest(
  urlStr: string,
  options: https.RequestOptions,
  body: string,
): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const lib = url.protocol === 'https:' ? https : http;

    const reqOptions: https.RequestOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method || 'POST',
      headers: options.headers || {},
    };

    const req = lib.request(reqOptions, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });
      res.on('end', () => {
        const data = Buffer.concat(chunks).toString('utf-8');
        resolve({ statusCode: res.statusCode || 200, data });
      });
    });

    req.on('error', reject);

    // 设置超时
    req.setTimeout(120000, () => {
      req.destroy(new Error('请求超时'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * 下载图片到本地
 */
async function downloadImage(
  imageUrl: string,
  filename: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = new URL(imageUrl);
    const lib = url.protocol === 'https:' ? https : http;

    const filePath = path.join(UPLOAD_DIR, filename);
    const fileStream = fs.createWriteStream(filePath);

    const req = lib.get(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        headers: {
          'User-Agent': 'AI-Efficiency-Assistant/1.0',
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`下载图片失败: HTTP ${res.statusCode}`));
          return;
        }

        res.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve(filePath);
        });

        fileStream.on('error', (err) => {
          fs.unlink(filePath, () => {});
          reject(err);
        });
      },
    );

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy(new Error('下载超时'));
    });
  });
}

/**
 * 调用白山智算 API 生成图片
 */
async function callBaishanAPI(
  request: ImageGenerationRequest,
): Promise<ImageGenerationResponse> {
  const requestBody = {
    model: request.model || DEFAULT_MODEL,
    prompt: request.prompt,
    negative_prompt: request.negativePrompt || '',
    n: request.n || 1,
    size: request.size || DEFAULT_SIZE,
    quality: request.quality || DEFAULT_QUALITY,
    style: request.style || 'vivid',
    response_format: 'url',
  };

  const bodyStr = JSON.stringify(requestBody);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${BAISHAN_API_KEY}`,
    'Content-Length': Buffer.byteLength(bodyStr).toString(),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await httpRequest(BAISHAN_API_BASE_URL, {
        method: 'POST',
        headers,
      }, bodyStr);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.data) as ImageGenerationResponse;
        return data;
      }

      // 4xx 错误不重试
      if (response.statusCode >= 400 && response.statusCode < 500) {
        const errorData = JSON.parse(response.data);
        throw new Error(
          `白山智算 API 错误 (${response.statusCode}): ${errorData.error?.message || response.data}`,
        );
      }

      // 5xx 错误重试
      lastError = new Error(
        `白山智算 API 服务器错误 (${response.statusCode}): ${response.data}`,
      );
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw new Error(
    `白山智算 API 调用失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
  );
}

/**
 * 调用备用 API 生成图片
 */
async function callBackupAPI(
  request: ImageGenerationRequest,
): Promise<ImageGenerationResponse> {
  if (!BACKUP_API_KEY || !BACKUP_API_BASE_URL) {
    throw new Error('备用 API 未配置');
  }

  const requestBody = {
    model: request.model || 'dall-e-3',
    prompt: request.prompt,
    n: request.n || 1,
    size: request.size || DEFAULT_SIZE,
    quality: request.quality || DEFAULT_QUALITY,
    style: request.style || 'vivid',
    response_format: 'url',
  };

  const bodyStr = JSON.stringify(requestBody);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${BACKUP_API_KEY}`,
    'Content-Length': Buffer.byteLength(bodyStr).toString(),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await httpRequest(BACKUP_API_BASE_URL, {
        method: 'POST',
        headers,
      }, bodyStr);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.data) as ImageGenerationResponse;
        return data;
      }

      lastError = new Error(
        `备用 API 错误 (${response.statusCode}): ${response.data}`,
      );
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < MAX_RETRIES - 1) {
        await delay(RETRY_DELAY_MS * (attempt + 1));
      }
    }
  }

  throw new Error(
    `备用 API 调用失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
  );
}

/**
 * 生成图片
 * 优先使用白山智算 API，失败时尝试备用 API
 */
export async function generateImage(
  request: ImageGenerationRequest,
): Promise<ImageGenerationResult> {
  const generationId = uuidv4();
  const timestamp = Date.now();

  try {
    // 尝试使用白山智算 API
    let response: ImageGenerationResponse;

    try {
      response = await callBaishanAPI(request);
    } catch (baishanError) {
      console.warn('[ImageGen] 白山智算 API 失败，尝试备用 API:', baishanError);
      response = await callBackupAPI(request);
    }

    // 下载生成的图片到本地
    const savedImages: Array<{
      url: string;
      localPath: string;
      filename: string;
    }> = [];

    for (let i = 0; i < response.data.length; i++) {
      const imageData = response.data[i];
      const filename = `${generationId}_${i}.png`;

      try {
        const localPath = await downloadImage(imageData.url, filename);
        savedImages.push({
          url: imageData.url,
          localPath,
          filename,
        });
      } catch (downloadError) {
        console.error('[ImageGen] 下载图片失败:', downloadError);
        // 即使下载失败，仍然保留原始 URL
        savedImages.push({
          url: imageData.url,
          localPath: '',
          filename,
        });
      }
    }

    return {
      id: generationId,
      status: 'success' as ImageGenerationStatus,
      images: savedImages.map((img) => ({
        url: img.url,
        localUrl: img.localPath ? `/uploads/images/${img.filename}` : '',
        revisedPrompt: response.data[0]?.revised_prompt || request.prompt,
      })),
      created: response.created || timestamp,
    };
  } catch (error) {
    console.error('[ImageGen] 生成图片失败:', error);
    throw error;
  }
}

/**
 * 验证提示词
 */
export function validatePrompt(prompt: string): {
  valid: boolean;
  error?: string;
} {
  if (!prompt || typeof prompt !== 'string') {
    return { valid: false, error: '提示词不能为空' };
  }

  if (prompt.trim().length === 0) {
    return { valid: false, error: '提示词不能为空' };
  }

  if (prompt.length > 4000) {
    return { valid: false, error: '提示词长度不能超过 4000 个字符' };
  }

  // 简单的安全检查 - 检查是否包含敏感词
  const sensitiveWords = ['暴力', '色情', '血腥', '恐怖', '歧视'];
  const lowerPrompt = prompt.toLowerCase();
  for (const word of sensitiveWords) {
    if (lowerPrompt.includes(word)) {
      return { valid: false, error: '提示词包含敏感内容，请修改后重试' };
    }
  }

  return { valid: true };
}

/**
 * 获取支持的图片尺寸
 */
export function getSupportedSizes(): string[] {
  return [
    '256x256',
    '512x512',
    '1024x1024',
    '1024x1792',
    '1792x1024',
    '1280x720',
    '1920x1080',
  ];
}

/**
 * 获取支持的图片风格
 */
export function getSupportedStyles(): string[] {
  return ['vivid', 'natural', 'anime', 'photographic', 'digital-art'];
}

/**
 * 获取支持的图片质量
 */
export function getSupportedQualities(): string[] {
  return ['standard', 'hd', 'ultra'];
}

/**
 * 删除本地生成的图片
 */
export async function deleteLocalImage(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[ImageGen] 删除图片失败:', error);
    return false;
  }
}

/**
 * 获取本地图片文件路径
 */
export function getLocalImagePath(filename: string): string | null {
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}
