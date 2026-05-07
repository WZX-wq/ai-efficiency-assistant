import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  TTSRequest,
  STTRequest,
  VoiceCloneRequest,
} from '../types';
import {
  textToSpeech,
  speechToText,
  getSupportedVoices,
  getSupportedAudioFormats,
  validateTTSRequest,
  validateSTTRequest,
  deleteLocalAudio,
  getVoiceServiceStatus,
} from '../services/voice';

const router = Router();

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = './uploads/audio/temp';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

// 文件过滤
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/wave',
    'audio/ogg',
    'audio/opus',
    'audio/aac',
    'audio/flac',
    'audio/x-m4a',
    'audio/m4a',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('不支持的音频格式'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024, // 25MB 限制
  },
});

/**
 * @swagger
 * /api/voice/tts:
 *   post:
 *     summary: 文本转语音
 *     description: 将文本转换为语音文件
 *     tags: [语音]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *               voice:
 *                 type: string
 *               model:
 *                 type: string
 *               speed:
 *                 type: number
 *               responseFormat:
 *                 type: string
 *     responses:
 *       200:
 *         description: 语音合成成功
 */
router.post(
  '/tts',
  async (req: Request<{}, {}, TTSRequest>, res: Response): Promise<void> => {
    try {
      const {
        text,
        voice,
        model,
        speed,
        responseFormat,
      } = req.body;

      // 参数校验
      const validation = validateTTSRequest({
        text,
        voice,
        model,
        speed,
        responseFormat,
      });

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error,
        });
        return;
      }

      // 调用语音合成服务
      const result = await textToSpeech({
        text: text.trim(),
        voice,
        model,
        speed,
        responseFormat,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[TTS Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '语音合成失败，请稍后重试',
      });
    }
  },
);

/**
 * @swagger
 * /api/voice/tts/stream:
 *   post:
 *     summary: 流式文本转语音
 *     description: 通过 SSE 实时返回语音合成进度
 *     tags: [语音]
 *     responses:
 *       200:
 *         description: SSE 流式响应
 */
router.post(
  '/tts/stream',
  async (req: Request<{}, {}, TTSRequest>, res: Response): Promise<void> => {
    try {
      const {
        text,
        voice,
        model,
        speed,
        responseFormat,
      } = req.body;

      // 参数校验
      const validation = validateTTSRequest({
        text,
        voice,
        model,
        speed,
        responseFormat,
      });

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error,
        });
        return;
      }

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // 发送开始事件
      res.write(
        `data: ${JSON.stringify({
          type: 'start',
          message: '开始语音合成...',
          timestamp: Date.now(),
        })}\n\n`,
      );

      try {
        // 调用语音合成服务
        const result = await textToSpeech({
          text: text.trim(),
          voice,
          model,
          speed,
          responseFormat,
        });

        // 发送进度事件
        res.write(
          `data: ${JSON.stringify({
            type: 'progress',
            message: '语音合成完成',
            progress: 100,
            timestamp: Date.now(),
          })}\n\n`,
        );

        // 发送完成事件
        res.write(
          `data: ${JSON.stringify({
            type: 'complete',
            data: result,
            timestamp: Date.now(),
          })}\n\n`,
        );

        res.write('data: [DONE]\n\n');
        res.end();
      } catch (ttsError) {
        console.error('[TTS Stream Error]', ttsError);
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: ttsError instanceof Error ? ttsError.message : '语音合成失败',
            timestamp: Date.now(),
          })}\n\n`,
        );
        res.end();
      }
    } catch (error) {
      console.error('[TTS Stream Error]', error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '语音合成失败，请稍后重试',
        });
      } else {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: '服务内部错误',
            timestamp: Date.now(),
          })}\n\n`,
        );
        res.end();
      }
    }
  },
);

/**
 * @swagger
 * /api/voice/stt:
 *   post:
 *     summary: 语音转文本
 *     description: 接收 base64 编码的音频数据，返回识别文本
 *     tags: [语音]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               audioData:
 *                 type: string
 *                 format: base64
 *               audioUrl:
 *                 type: string
 *               model:
 *                 type: string
 *               language:
 *                 type: string
 *     responses:
 *       200:
 *         description: 语音识别成功
 */
router.post(
  '/stt',
  async (req: Request<{}, {}, STTRequest>, res: Response): Promise<void> => {
    try {
      const {
        audioData,
        audioUrl,
        model,
        language,
        prompt,
        format,
      } = req.body;

      // 参数校验
      const validation = validateSTTRequest({
        audioData,
        audioUrl,
        model,
        language,
        prompt,
        format,
      });

      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error,
        });
        return;
      }

      // 调用语音识别服务
      const result = await speechToText({
        audioData,
        audioUrl,
        model,
        language,
        prompt,
        format,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[STT Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '语音识别失败，请稍后重试',
      });
    }
  },
);

/**
 * @swagger
 * /api/voice/stt/upload:
 *   post:
 *     summary: 语音转文本（文件上传）
 *     description: 上传音频文件进行语音识别
 *     tags: [语音]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [audio]
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: 语音识别成功
 */
router.post(
  '/stt/upload',
  upload.single('audio'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: '请上传音频文件',
        });
        return;
      }

      const {
        model,
        language,
        prompt,
      } = req.body;

      // 读取上传的文件
      const audioBuffer = fs.readFileSync(req.file.path);
      const audioData = audioBuffer.toString('base64');

      // 获取文件格式
      const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
      const formatMap: Record<string, string> = {
        mp3: 'mp3',
        wav: 'wav',
        ogg: 'ogg',
        opus: 'opus',
        aac: 'aac',
        flac: 'flac',
        m4a: 'm4a',
      };
      const format = formatMap[ext] || 'mp3';

      // 调用语音识别服务
      const result = await speechToText({
        audioData,
        model,
        language,
        prompt,
        format,
      });

      // 删除临时文件
      fs.unlinkSync(req.file.path);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[STT Upload Error]', error);

      // 清理临时文件
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '语音识别失败，请稍后重试',
      });
    }
  },
);

/**
 * @swagger
 * /api/voice/stt/stream:
 *   post:
 *     summary: 流式语音转文本
 *     description: 通过 SSE 实时返回语音识别进度
 *     tags: [语音]
 *     responses:
 *       200:
 *         description: SSE 流式响应
 */
router.post(
  '/stt/stream',
  upload.single('audio'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      // 发送开始事件
      res.write(
        `data: ${JSON.stringify({
          type: 'start',
          message: '开始语音识别...',
          timestamp: Date.now(),
        })}\n\n`,
      );

      let audioData: string;
      let format: string;

      // 处理音频数据
      if (req.file) {
        // 从上传文件读取
        const audioBuffer = fs.readFileSync(req.file.path);
        audioData = audioBuffer.toString('base64');

        const ext = path.extname(req.file.originalname).toLowerCase().replace('.', '');
        const formatMap: Record<string, string> = {
          mp3: 'mp3',
          wav: 'wav',
          ogg: 'ogg',
          opus: 'opus',
          aac: 'aac',
          flac: 'flac',
          m4a: 'm4a',
        };
        format = formatMap[ext] || 'mp3';
      } else if (req.body.audioData) {
        // 从请求体读取 base64 数据
        audioData = req.body.audioData;
        format = req.body.format || 'mp3';
      } else {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: '请提供音频数据或上传音频文件',
            timestamp: Date.now(),
          })}\n\n`,
        );
        res.end();
        return;
      }

      const { model, language, prompt } = req.body;

      try {
        // 发送进度事件
        res.write(
          `data: ${JSON.stringify({
            type: 'progress',
            message: '正在处理音频...',
            progress: 50,
            timestamp: Date.now(),
          })}\n\n`,
        );

        // 调用语音识别服务
        const result = await speechToText({
          audioData,
          model,
          language,
          prompt,
          format,
        });

        // 发送完成事件
        res.write(
          `data: ${JSON.stringify({
            type: 'complete',
            data: result,
            timestamp: Date.now(),
          })}\n\n`,
        );

        res.write('data: [DONE]\n\n');
        res.end();
      } catch (sttError) {
        console.error('[STT Stream Error]', sttError);
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: sttError instanceof Error ? sttError.message : '语音识别失败',
            timestamp: Date.now(),
          })}\n\n`,
        );
        res.end();
      }

      // 清理临时文件
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
    } catch (error) {
      console.error('[STT Stream Error]', error);

      // 清理临时文件
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '语音识别失败，请稍后重试',
        });
      } else {
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: '服务内部错误',
            timestamp: Date.now(),
          })}\n\n`,
        );
        res.end();
      }
    }
  },
);

/**
 * @swagger
 * /api/voice/voices:
 *   get:
 *     summary: 获取支持的语音列表
 *     tags: [语音]
 *     parameters:
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 支持的语音列表
 */
router.get('/voices', (req: Request, res: Response) => {
  const { language } = req.query;
  let voices = getSupportedVoices();

  // 如果指定了语言，进行过滤
  if (language && typeof language === 'string') {
    voices = voices.filter((v) => v.language.toLowerCase().startsWith(language.toLowerCase()));
  }

  res.json({
    success: true,
    data: voices,
  });
});

/**
 * @swagger
 * /api/voice/formats:
 *   get:
 *     summary: 获取支持的音频格式
 *     tags: [语音]
 *     responses:
 *       200:
 *         description: 支持的音频格式列表
 */
router.get('/formats', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: getSupportedAudioFormats(),
  });
});

/**
 * @swagger
 * /api/voice/clone:
 *   post:
 *     summary: 声音克隆
 *     description: 根据样本音频克隆声音（开发中）
 *     tags: [语音]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [sample, text]
 *             properties:
 *               sample:
 *                 type: string
 *                 format: binary
 *               text:
 *                 type: string
 *               voiceName:
 *                 type: string
 *     responses:
 *       200:
 *         description: 声音克隆结果
 */
router.post(
  '/clone',
  upload.single('sample'),
  async (req: Request<{}, {}, VoiceCloneRequest>, res: Response): Promise<void> => {
    try {
      const { text, voiceName } = req.body;

      // 参数校验
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: '请上传样本音频文件',
        });
        return;
      }

      if (!text || typeof text !== 'string') {
        res.status(400).json({
          success: false,
          error: '请提供要合成的文本内容',
        });
        return;
      }

      // TODO: 实现声音克隆逻辑
      // 目前返回占位响应
      res.json({
        success: true,
        message: '声音克隆功能开发中',
        data: {
          sampleFile: req.file.filename,
          text,
          voiceName: voiceName || 'cloned_voice',
        },
      });

      // 清理临时文件（如果需要保留样本则不移除）
      // fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error('[Voice Clone Error]', error);

      // 清理临时文件
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '声音克隆失败，请稍后重试',
      });
    }
  },
);

/**
 * @swagger
 * /api/voice/{filename}:
 *   delete:
 *     summary: 删除本地音频文件
 *     tags: [语音]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/:filename', async (req: Request, res: Response): Promise<void> => {
  try {
    const { filename } = req.params;

    if (!filename || typeof filename !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少文件名参数',
      });
      return;
    }

    // 安全检查：防止路径遍历攻击
    if (filename.includes('..') || filename.includes('/')) {
      res.status(400).json({
        success: false,
        error: '无效的文件名',
      });
      return;
    }

    const deleted = await deleteLocalAudio(filename);

    if (deleted) {
      res.json({
        success: true,
        message: '音频文件删除成功',
      });
    } else {
      res.status(404).json({
        success: false,
        error: '音频文件不存在',
      });
    }
  } catch (error) {
    console.error('[Voice Delete Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除音频文件失败，请稍后重试',
    });
  }
});

/**
 * @swagger
 * /api/voice/status:
 *   get:
 *     summary: 获取语音服务状态
 *     tags: [语音]
 *     responses:
 *       200:
 *         description: 语音服务状态信息
 */
router.get('/status', (req: Request, res: Response) => {
  const status = getVoiceServiceStatus();

  res.json({
    success: true,
    data: {
      ...status,
      supportedFeatures: {
        tts: status.tts.available,
        stt: status.stt.available,
        voiceClone: false, // 开发中
      },
    },
  });
});

export default router;
