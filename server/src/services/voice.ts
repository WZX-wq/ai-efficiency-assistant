import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import {
  TTSRequest,
  TTSResponse,
  STTRequest,
  STTResponse,
  VoiceInfo,
  TTSServiceType,
  STTServiceType,
} from '../types';

// 语音服务 API 配置
const BAISHAN_TTS_URL = 'https://api.baishan.com/v1/audio/speech';
const BAISHAN_STT_URL = 'https://api.baishan.com/v1/audio/transcriptions';
const BAISHAN_API_KEY = process.env.BAISHAN_API_KEY || '';

// 阿里云语音合成/识别配置
const ALIYUN_TTS_URL = process.env.ALIYUN_TTS_URL || '';
const ALIYUN_STT_URL = process.env.ALIYUN_STT_URL || '';
const ALIYUN_ACCESS_KEY = process.env.ALIYUN_ACCESS_KEY || '';
const ALIYUN_ACCESS_SECRET = process.env.ALIYUN_ACCESS_SECRET || '';

// 百度语音配置
const BAIDU_TTS_URL = 'https://tsn.baidu.com/text2audio';
const BAIDU_STT_URL = 'https://vop.baidu.com/server_api';
const BAIDU_API_KEY = process.env.BAIDU_API_KEY || '';
const BAIDU_SECRET_KEY = process.env.BAIDU_SECRET_KEY || '';

// 默认配置
const DEFAULT_TTS_MODEL = 'tts-1';
const DEFAULT_TTS_VOICE = 'alloy';
const DEFAULT_TTS_SPEED = 1.0;
const DEFAULT_STT_MODEL = 'whisper-1';

// 上传目录
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/audio';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

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
  body?: string | Buffer,
): Promise<{ statusCode: number; data: Buffer; headers: http.IncomingHttpHeaders }> {
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
        const data = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode || 200,
          data,
          headers: res.headers,
        });
      });
    });

    req.on('error', reject);

    // 设置超时
    req.setTimeout(60000, () => {
      req.destroy(new Error('请求超时'));
    });

    if (body) {
      req.write(body);
    }
    req.end();
  });
}

/**
 * 获取支持的语音列表
 */
export function getSupportedVoices(): VoiceInfo[] {
  return [
    // 中文语音
    { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', gender: 'female', language: 'zh-CN', description: '活泼温暖的女声' },
    { id: 'zh-CN-YunxiNeural', name: '云希', gender: 'male', language: 'zh-CN', description: '年轻有活力的男声' },
    { id: 'zh-CN-YunjianNeural', name: '云健', gender: 'male', language: 'zh-CN', description: '成熟稳重的男声' },
    { id: 'zh-CN-XiaoyiNeural', name: '晓伊', gender: 'female', language: 'zh-CN', description: '温柔甜美的女声' },
    { id: 'zh-TW-HsiaoChenNeural', name: '晓臻', gender: 'female', language: 'zh-TW', description: '台湾女声' },
    { id: 'zh-HK-HiuMaanNeural', name: '晓曼', gender: 'female', language: 'zh-HK', description: '粤语女声' },
    // 英文语音
    { id: 'alloy', name: 'Alloy', gender: 'neutral', language: 'en', description: '中性声音' },
    { id: 'echo', name: 'Echo', gender: 'male', language: 'en', description: '男声' },
    { id: 'fable', name: 'Fable', gender: 'male', language: 'en', description: '英式男声' },
    { id: 'onyx', name: 'Onyx', gender: 'male', language: 'en', description: '深沉男声' },
    { id: 'nova', name: 'Nova', gender: 'female', language: 'en', description: '女声' },
    { id: 'shimmer', name: 'Shimmer', gender: 'female', language: 'en', description: '清亮女声' },
    // 日语语音
    { id: 'ja-JP-NanamiNeural', name: '七海', gender: 'female', language: 'ja-JP', description: '日语女声' },
    { id: 'ja-JP-KeitaNeural', name: '圭太', gender: 'male', language: 'ja-JP', description: '日语男声' },
    // 韩语语音
    { id: 'ko-KR-SunHiNeural', name: '善熙', gender: 'female', language: 'ko-KR', description: '韩语女声' },
    { id: 'ko-KR-InJoonNeural', name: '仁俊', gender: 'male', language: 'ko-KR', description: '韩语男声' },
  ];
}

/**
 * 获取支持的音频格式
 */
export function getSupportedAudioFormats(): string[] {
  return ['mp3', 'opus', 'aac', 'flac', 'wav', 'pcm'];
}

/**
 * 验证 TTS 请求参数
 */
export function validateTTSRequest(request: TTSRequest): {
  valid: boolean;
  error?: string;
} {
  if (!request.text || typeof request.text !== 'string') {
    return { valid: false, error: '文本内容不能为空' };
  }

  if (request.text.trim().length === 0) {
    return { valid: false, error: '文本内容不能为空' };
  }

  if (request.text.length > 5000) {
    return { valid: false, error: '文本长度不能超过 5000 个字符' };
  }

  if (request.speed !== undefined) {
    if (typeof request.speed !== 'number' || request.speed < 0.25 || request.speed > 4.0) {
      return { valid: false, error: '语速 speed 必须在 0.25 到 4.0 之间' };
    }
  }

  const supportedFormats = getSupportedAudioFormats();
  if (request.responseFormat && !supportedFormats.includes(request.responseFormat)) {
    return {
      valid: false,
      error: `不支持的音频格式，支持的格式: ${supportedFormats.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * 验证 STT 请求参数
 */
export function validateSTTRequest(request: STTRequest): {
  valid: boolean;
  error?: string;
} {
  if (!request.audioData && !request.audioUrl) {
    return { valid: false, error: '必须提供 audioData 或 audioUrl' };
  }

  const supportedFormats = getSupportedAudioFormats();
  if (request.format && !supportedFormats.includes(request.format)) {
    return {
      valid: false,
      error: `不支持的音频格式，支持的格式: ${supportedFormats.join(', ')}`,
    };
  }

  return { valid: true };
}

/**
 * 调用白山智算 TTS API
 */
async function callBaishanTTS(request: TTSRequest): Promise<Buffer> {
  const requestBody = {
    model: request.model || DEFAULT_TTS_MODEL,
    input: request.text,
    voice: request.voice || DEFAULT_TTS_VOICE,
    speed: request.speed || DEFAULT_TTS_SPEED,
    response_format: request.responseFormat || 'mp3',
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
      const response = await httpRequest(BAISHAN_TTS_URL, {
        method: 'POST',
        headers,
      }, bodyStr);

      if (response.statusCode === 200) {
        return response.data;
      }

      // 4xx 错误不重试
      if (response.statusCode >= 400 && response.statusCode < 500) {
        const errorData = response.data.toString('utf-8');
        throw new Error(`白山智算 TTS API 错误 (${response.statusCode}): ${errorData}`);
      }

      // 5xx 错误重试
      lastError = new Error(
        `白山智算 TTS API 服务器错误 (${response.statusCode})`,
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
    `白山智算 TTS API 调用失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
  );
}

/**
 * 调用百度 TTS API
 */
async function callBaiduTTS(request: TTSRequest): Promise<Buffer> {
  // 首先获取 access token
  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;

  const tokenResponse = await httpRequest(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (tokenResponse.statusCode !== 200) {
    throw new Error('获取百度 access token 失败');
  }

  const tokenData = JSON.parse(tokenResponse.data.toString('utf-8'));
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error('百度 API 返回的 access token 为空');
  }

  // 调用 TTS API
  const ttsUrl = `${BAIDU_TTS_URL}?tok=${accessToken}`;

  // 百度语音映射
  const voiceMap: Record<string, number> = {
    'zh-CN-XiaoxiaoNeural': 0, // 度小美
    'zh-CN-YunxiNeural': 1,    // 度小宇
    'zh-CN-YunjianNeural': 3,  // 度逍遥
    'zh-CN-XiaoyiNeural': 4,   // 度丫丫
  };

  const requestBody = new URLSearchParams({
    tex: encodeURIComponent(request.text),
    tok: accessToken,
    cuid: uuidv4(),
    ctp: '1',
    lan: 'zh',
    spd: String(Math.round((request.speed || 1.0) * 5)), // 百度语速范围 0-15
    pit: '5',
    vol: '5',
    per: String(voiceMap[request.voice || ''] || 0),
    aue: request.responseFormat === 'mp3' ? '3' : '6', // 3: mp3, 6: wav
  });

  const response = await httpRequest(ttsUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  }, requestBody.toString());

  if (response.statusCode === 200) {
    // 检查返回的是否是错误信息（JSON格式）
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/json')) {
      const errorData = JSON.parse(response.data.toString('utf-8'));
      throw new Error(`百度 TTS API 错误: ${errorData.err_msg || '未知错误'}`);
    }
    return response.data;
  }

  throw new Error(`百度 TTS API 错误 (${response.statusCode})`);
}

/**
 * 调用阿里云 TTS API
 */
async function callAliyunTTS(request: TTSRequest): Promise<Buffer> {
  if (!ALIYUN_ACCESS_KEY || !ALIYUN_ACCESS_SECRET) {
    throw new Error('阿里云语音服务未配置');
  }

  // 阿里云语音合成实现
  // 这里需要根据阿里云实际的 API 文档实现
  // 目前返回错误，提示使用其他服务
  throw new Error('阿里云 TTS 服务暂未实现，请使用其他服务');
}

/**
 * 文本转语音
 * 支持多种服务提供商，按优先级尝试
 */
export async function textToSpeech(request: TTSRequest): Promise<TTSResponse> {
  const generationId = uuidv4();
  const timestamp = Date.now();

  try {
    let audioBuffer: Buffer;
    let usedService: TTSServiceType = 'baishan';

    // 按优先级尝试不同的服务
    const errors: string[] = [];

    // 1. 尝试白山智算
    try {
      audioBuffer = await callBaishanTTS(request);
      usedService = 'baishan';
    } catch (baishanError) {
      errors.push(`白山智算: ${baishanError instanceof Error ? baishanError.message : '未知错误'}`);
      console.warn('[TTS] 白山智算失败，尝试百度:', baishanError);

      // 2. 尝试百度
      try {
        audioBuffer = await callBaiduTTS(request);
        usedService = 'baidu';
      } catch (baiduError) {
        errors.push(`百度: ${baiduError instanceof Error ? baiduError.message : '未知错误'}`);
        console.warn('[TTS] 百度失败，尝试阿里云:', baiduError);

        // 3. 尝试阿里云
        try {
          audioBuffer = await callAliyunTTS(request);
          usedService = 'aliyun';
        } catch (aliyunError) {
          errors.push(`阿里云: ${aliyunError instanceof Error ? aliyunError.message : '未知错误'}`);
          throw new Error(`所有 TTS 服务均失败: ${errors.join('; ')}`);
        }
      }
    }

    // 保存音频文件到本地
    const format = request.responseFormat || 'mp3';
    const filename = `${generationId}.${format}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    fs.writeFileSync(filePath, audioBuffer);

    return {
      id: generationId,
      audioUrl: `/uploads/audio/${filename}`,
      localPath: filePath,
      filename,
      format,
      duration: 0, // 可以通过音频分析获取实际时长
      size: audioBuffer.length,
      service: usedService,
      created: timestamp,
    };
  } catch (error) {
    console.error('[TTS] 语音合成失败:', error);
    throw error;
  }
}

/**
 * 调用白山智算 STT API
 */
async function callBaishanSTT(request: STTRequest): Promise<string> {
  const boundary = `----FormBoundary${uuidv4()}`;

  // 准备音频数据
  let audioBuffer: Buffer;
  if (request.audioData) {
    audioBuffer = Buffer.from(request.audioData, 'base64');
  } else if (request.audioUrl) {
    // 下载音频文件
    const url = new URL(request.audioUrl);
    const lib = url.protocol === 'https:' ? https : http;

    audioBuffer = await new Promise((resolve, reject) => {
      const req = lib.get(request.audioUrl!, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', reject);
      req.setTimeout(30000, () => req.destroy(new Error('下载超时')));
    });
  } else {
    throw new Error('没有提供音频数据');
  }

  // 构建 multipart/form-data
  const formDataParts: Buffer[] = [];

  // model 字段
  formDataParts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${request.model || DEFAULT_STT_MODEL}\r\n`,
    ),
  );

  // language 字段
  if (request.language) {
    formDataParts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\n${request.language}\r\n`,
      ),
    );
  }

  // prompt 字段
  if (request.prompt) {
    formDataParts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n${request.prompt}\r\n`,
      ),
    );
  }

  // response_format 字段
  formDataParts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n`,
    ),
  );

  // file 字段
  const format = request.format || 'mp3';
  formDataParts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.${format}"\r\nContent-Type: audio/${format}\r\n\r\n`,
    ),
  );
  formDataParts.push(audioBuffer);
  formDataParts.push(Buffer.from(`\r\n--${boundary}--\r\n`));

  const body = Buffer.concat(formDataParts);

  const headers: Record<string, string> = {
    'Content-Type': `multipart/form-data; boundary=${boundary}`,
    Authorization: `Bearer ${BAISHAN_API_KEY}`,
    'Content-Length': body.length.toString(),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const response = await httpRequest(BAISHAN_STT_URL, {
        method: 'POST',
        headers,
      }, body);

      if (response.statusCode === 200) {
        const data = JSON.parse(response.data.toString('utf-8'));
        return data.text || '';
      }

      // 4xx 错误不重试
      if (response.statusCode >= 400 && response.statusCode < 500) {
        const errorData = response.data.toString('utf-8');
        throw new Error(`白山智算 STT API 错误 (${response.statusCode}): ${errorData}`);
      }

      // 5xx 错误重试
      lastError = new Error(
        `白山智算 STT API 服务器错误 (${response.statusCode})`,
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
    `白山智算 STT API 调用失败，已重试 ${MAX_RETRIES} 次: ${lastError?.message}`,
  );
}

/**
 * 调用百度 STT API
 */
async function callBaiduSTT(request: STTRequest): Promise<string> {
  // 首先获取 access token
  const tokenUrl = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_API_KEY}&client_secret=${BAIDU_SECRET_KEY}`;

  const tokenResponse = await httpRequest(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (tokenResponse.statusCode !== 200) {
    throw new Error('获取百度 access token 失败');
  }

  const tokenData = JSON.parse(tokenResponse.data.toString('utf-8'));
  const accessToken = tokenData.access_token;

  if (!accessToken) {
    throw new Error('百度 API 返回的 access token 为空');
  }

  // 准备音频数据
  let audioBuffer: Buffer;
  if (request.audioData) {
    audioBuffer = Buffer.from(request.audioData, 'base64');
  } else if (request.audioUrl) {
    const url = new URL(request.audioUrl);
    const lib = url.protocol === 'https:' ? https : http;

    audioBuffer = await new Promise((resolve, reject) => {
      const req = lib.get(request.audioUrl!, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', reject);
      req.setTimeout(30000, () => req.destroy(new Error('下载超时')));
    });
  } else {
    throw new Error('没有提供音频数据');
  }

  // 调用 STT API
  const sttUrl = `${BAIDU_STT_URL}?dev_pid=1537&cuid=${uuidv4()}&token=${accessToken}`;

  const response = await httpRequest(sttUrl, {
    method: 'POST',
    headers: {
      'Content-Type': `audio/${request.format || 'wav'}; rate=16000`,
    },
  }, audioBuffer);

  if (response.statusCode === 200) {
    const data = JSON.parse(response.data.toString('utf-8'));
    if (data.err_no !== 0) {
      throw new Error(`百度 STT API 错误: ${data.err_msg}`);
    }
    return data.result?.[0] || '';
  }

  throw new Error(`百度 STT API 错误 (${response.statusCode})`);
}

/**
 * 语音转文本
 * 支持多种服务提供商，按优先级尝试
 */
export async function speechToText(request: STTRequest): Promise<STTResponse> {
  const timestamp = Date.now();

  try {
    let text: string;
    let usedService: STTServiceType = 'baishan';

    // 按优先级尝试不同的服务
    const errors: string[] = [];

    // 1. 尝试白山智算
    try {
      text = await callBaishanSTT(request);
      usedService = 'baishan';
    } catch (baishanError) {
      errors.push(`白山智算: ${baishanError instanceof Error ? baishanError.message : '未知错误'}`);
      console.warn('[STT] 白山智算失败，尝试百度:', baishanError);

      // 2. 尝试百度
      try {
        text = await callBaiduSTT(request);
        usedService = 'baidu';
      } catch (baiduError) {
        errors.push(`百度: ${baiduError instanceof Error ? baiduError.message : '未知错误'}`);
        throw new Error(`所有 STT 服务均失败: ${errors.join('; ')}`);
      }
    }

    return {
      text,
      language: request.language || 'zh',
      confidence: 0, // 某些 API 可能不提供置信度
      service: usedService,
      created: timestamp,
    };
  } catch (error) {
    console.error('[STT] 语音识别失败:', error);
    throw error;
  }
}

/**
 * 删除本地音频文件
 */
export async function deleteLocalAudio(filename: string): Promise<boolean> {
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Voice] 删除音频文件失败:', error);
    return false;
  }
}

/**
 * 获取本地音频文件路径
 */
export function getLocalAudioPath(filename: string): string | null {
  const filePath = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(filePath)) {
    return filePath;
  }
  return null;
}

/**
 * 检查语音服务配置状态
 */
export function getVoiceServiceStatus(): {
  tts: { available: boolean; providers: string[] };
  stt: { available: boolean; providers: string[] };
} {
  const ttsProviders: string[] = [];
  const sttProviders: string[] = [];

  if (BAISHAN_API_KEY) {
    ttsProviders.push('baishan');
    sttProviders.push('baishan');
  }

  if (BAIDU_API_KEY && BAIDU_SECRET_KEY) {
    ttsProviders.push('baidu');
    sttProviders.push('baidu');
  }

  if (ALIYUN_ACCESS_KEY && ALIYUN_ACCESS_SECRET) {
    ttsProviders.push('aliyun');
    sttProviders.push('aliyun');
  }

  return {
    tts: {
      available: ttsProviders.length > 0,
      providers: ttsProviders,
    },
    stt: {
      available: sttProviders.length > 0,
      providers: sttProviders,
    },
  };
}
