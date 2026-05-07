import { Router, Request, Response } from 'express';
import {
  ImageGenerationRequest,
  ImageVariationRequest,
  ImageEditRequest,
} from '../types';
import {
  generateImage,
  validatePrompt,
  getSupportedSizes,
  getSupportedStyles,
  getSupportedQualities,
  deleteLocalImage,
} from '../services/imageGen';

const router = Router();

/**
 * @swagger
 * /api/image/generate:
 *   post:
 *     summary: 文生图
 *     description: 根据文本提示生成图片
 *     tags: [图片]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: 一只可爱的猫咪在草地上玩耍
 *               negativePrompt:
 *                 type: string
 *                 description: 反向提示词
 *               n:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 4
 *                 default: 1
 *               size:
 *                 type: string
 *                 enum: ['1024x1024', '1024x1792', '1792x1024', '512x512', '256x256']
 *               quality:
 *                 type: string
 *                 enum: [standard, hd]
 *               style:
 *                 type: string
 *                 enum: [natural, vivid]
 *               model:
 *                 type: string
 *                 description: 图片生成模型
 *     responses:
 *       200:
 *         description: 图片生成成功
 *       400:
 *         description: 参数错误
 *       500:
 *         description: 图片生成失败
 */
router.post(
  '/generate',
  async (req: Request<{}, {}, ImageGenerationRequest>, res: Response): Promise<void> => {
    try {
      const {
        prompt,
        negativePrompt,
        n,
        size,
        quality,
        style,
        model,
      } = req.body;

      // 参数校验
      const validation = validatePrompt(prompt);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error,
        });
        return;
      }

      // 验证图片数量
      const imageCount = n || 1;
      if (imageCount < 1 || imageCount > 4) {
        res.status(400).json({
          success: false,
          error: '图片数量 n 必须在 1-4 之间',
        });
        return;
      }

      // 验证尺寸
      const supportedSizes = getSupportedSizes();
      if (size && !supportedSizes.includes(size)) {
        res.status(400).json({
          success: false,
          error: `不支持的图片尺寸，支持的尺寸: ${supportedSizes.join(', ')}`,
        });
        return;
      }

      // 验证风格
      const supportedStyles = getSupportedStyles();
      if (style && !supportedStyles.includes(style)) {
        res.status(400).json({
          success: false,
          error: `不支持的图片风格，支持的风格: ${supportedStyles.join(', ')}`,
        });
        return;
      }

      // 验证质量
      const supportedQualities = getSupportedQualities();
      if (quality && !supportedQualities.includes(quality)) {
        res.status(400).json({
          success: false,
          error: `不支持的图片质量，支持的质量: ${supportedQualities.join(', ')}`,
        });
        return;
      }

      // 调用图片生成服务
      const result = await generateImage({
        prompt: prompt.trim(),
        negativePrompt,
        n: imageCount,
        size,
        quality,
        style,
        model,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[Image Generate Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '图片生成失败，请稍后重试',
      });
    }
  },
);

/**
 * @swagger
 * /api/image/generate/stream:
 *   post:
 *     summary: 流式文生图
 *     description: 通过 SSE 实时返回图片生成进度和结果
 *     tags: [图片]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [prompt]
 *             properties:
 *               prompt:
 *                 type: string
 *                 example: 一只可爱的猫咪在草地上玩耍
 *               negativePrompt:
 *                 type: string
 *               n:
 *                 type: integer
 *               size:
 *                 type: string
 *               quality:
 *                 type: string
 *               style:
 *                 type: string
 *     responses:
 *       200:
 *         description: SSE 流式响应
 *       400:
 *         description: 参数错误
 */
router.post(
  '/generate/stream',
  async (req: Request<{}, {}, ImageGenerationRequest>, res: Response): Promise<void> => {
    try {
      const {
        prompt,
        negativePrompt,
        n,
        size,
        quality,
        style,
        model,
      } = req.body;

      // 参数校验
      const validation = validatePrompt(prompt);
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
          message: '开始生成图片...',
          timestamp: Date.now(),
        })}\n\n`,
      );

      try {
        // 调用图片生成服务
        const result = await generateImage({
          prompt: prompt.trim(),
          negativePrompt,
          n: n || 1,
          size,
          quality,
          style,
          model,
        });

        // 发送进度事件
        res.write(
          `data: ${JSON.stringify({
            type: 'progress',
            message: '图片生成完成',
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
      } catch (genError) {
        console.error('[Image Generate Stream Error]', genError);
        res.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: genError instanceof Error ? genError.message : '图片生成失败',
            timestamp: Date.now(),
          })}\n\n`,
        );
        res.end();
      }
    } catch (error) {
      console.error('[Image Generate Stream Error]', error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '图片生成失败，请稍后重试',
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
 * /api/image/variation:
 *   post:
 *     summary: 图片变体生成
 *     description: 根据已有图片生成变体（开发中）
 *     tags: [图片]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageUrl]
 *             properties:
 *               imageUrl:
 *                 type: string
 *               n:
 *                 type: integer
 *               size:
 *                 type: string
 *     responses:
 *       200:
 *         description: 变体生成成功
 */
router.post(
  '/variation',
  async (req: Request<{}, {}, ImageVariationRequest>, res: Response): Promise<void> => {
    try {
      const { imageUrl, n, size } = req.body;

      // 参数校验
      if (!imageUrl || typeof imageUrl !== 'string') {
        res.status(400).json({
          success: false,
          error: '缺少必填参数 imageUrl',
        });
        return;
      }

      // 验证图片数量
      const imageCount = n || 1;
      if (imageCount < 1 || imageCount > 4) {
        res.status(400).json({
          success: false,
          error: '图片数量 n 必须在 1-4 之间',
        });
        return;
      }

      // 验证尺寸
      const supportedSizes = getSupportedSizes();
      if (size && !supportedSizes.includes(size)) {
        res.status(400).json({
          success: false,
          error: `不支持的图片尺寸，支持的尺寸: ${supportedSizes.join(', ')}`,
        });
        return;
      }

      // TODO: 实现图片变体生成逻辑
      // 目前返回占位响应
      res.json({
        success: true,
        message: '图片变体生成功能开发中',
        data: {
          originalImage: imageUrl,
          variations: [],
        },
      });
    } catch (error) {
      console.error('[Image Variation Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '图片变体生成失败，请稍后重试',
      });
    }
  },
);

/**
 * @swagger
 * /api/image/edit:
 *   post:
 *     summary: 图片编辑
 *     description: 根据提示词编辑已有图片（开发中）
 *     tags: [图片]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [imageUrl, prompt]
 *             properties:
 *               imageUrl:
 *                 type: string
 *               prompt:
 *                 type: string
 *               mask:
 *                 type: string
 *               n:
 *                 type: integer
 *     responses:
 *       200:
 *         description: 图片编辑成功
 */
router.post(
  '/edit',
  async (req: Request<{}, {}, ImageEditRequest>, res: Response): Promise<void> => {
    try {
      const { imageUrl, prompt, mask, n, size } = req.body;

      // 参数校验
      if (!imageUrl || typeof imageUrl !== 'string') {
        res.status(400).json({
          success: false,
          error: '缺少必填参数 imageUrl',
        });
        return;
      }

      const validation = validatePrompt(prompt);
      if (!validation.valid) {
        res.status(400).json({
          success: false,
          error: validation.error,
        });
        return;
      }

      // 验证图片数量
      const imageCount = n || 1;
      if (imageCount < 1 || imageCount > 4) {
        res.status(400).json({
          success: false,
          error: '图片数量 n 必须在 1-4 之间',
        });
        return;
      }

      // 验证尺寸
      const supportedSizes = getSupportedSizes();
      if (size && !supportedSizes.includes(size)) {
        res.status(400).json({
          success: false,
          error: `不支持的图片尺寸，支持的尺寸: ${supportedSizes.join(', ')}`,
        });
        return;
      }

      // TODO: 实现图片编辑逻辑
      // 目前返回占位响应
      res.json({
        success: true,
        message: '图片编辑功能开发中',
        data: {
          originalImage: imageUrl,
          mask: mask || null,
          editedImages: [],
        },
      });
    } catch (error) {
      console.error('[Image Edit Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '图片编辑失败，请稍后重试',
      });
    }
  },
);

/**
 * @swagger
 * /api/image/sizes:
 *   get:
 *     summary: 获取支持的图片尺寸
 *     tags: [图片]
 *     responses:
 *       200:
 *         description: 返回支持的尺寸列表
 */
router.get('/sizes', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: getSupportedSizes(),
  });
});

/**
 * @swagger
 * /api/image/styles:
 *   get:
 *     summary: 获取支持的图片风格
 *     tags: [图片]
 *     responses:
 *       200:
 *         description: 返回支持的风格列表
 */
router.get('/styles', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: getSupportedStyles(),
  });
});

/**
 * @swagger
 * /api/image/qualities:
 *   get:
 *     summary: 获取支持的图片质量
 *     tags: [图片]
 *     responses:
 *       200:
 *         description: 返回支持的质量列表
 */
router.get('/qualities', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: getSupportedQualities(),
  });
});

/**
 * @swagger
 * /api/image/{filename}:
 *   delete:
 *     summary: 删除本地图片
 *     tags: [图片]
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *       404:
 *         description: 图片不存在
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

    const deleted = await deleteLocalImage(filename);

    if (deleted) {
      res.json({
        success: true,
        message: '图片删除成功',
      });
    } else {
      res.status(404).json({
        success: false,
        error: '图片不存在',
      });
    }
  } catch (error) {
    console.error('[Image Delete Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除图片失败，请稍后重试',
    });
  }
});

/**
 * @swagger
 * /api/image/status:
 *   get:
 *     summary: 获取图片生成服务状态
 *     tags: [图片]
 *     responses:
 *       200:
 *         description: 返回服务状态信息
 */
router.get('/status', (req: Request, res: Response) => {
  const baishanKeyConfigured = !!process.env.BAISHAN_API_KEY;
  const backupKeyConfigured = !!(
    process.env.BACKUP_IMAGE_API_KEY && process.env.BACKUP_IMAGE_API_URL
  );

  res.json({
    success: true,
    data: {
      status: baishanKeyConfigured || backupKeyConfigured ? 'available' : 'unavailable',
      providers: {
        baishan: {
          configured: baishanKeyConfigured,
          name: '白山智算',
        },
        backup: {
          configured: backupKeyConfigured,
          name: '备用 API',
        },
      },
      supportedFeatures: {
        textToImage: true,
        imageVariation: false, // 开发中
        imageEdit: false, // 开发中
      },
    },
  });
});

export default router;
