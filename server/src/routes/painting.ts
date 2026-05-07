import { Router, Request, Response } from 'express';
import {
  generatePainting,
  getPaintingConfig,
  PAINTING_STYLES,
  PaintingRequest,
} from '../services/aiPainter';

const router = Router();

/**
 * POST /api/painting/generate - 生成 SVG 艺术作品
 * Body: { prompt: string, style?: string, size?: string, negativePrompt?: string }
 * Returns: { success: true, data: { id, svg, style, size, prompt, revisedPrompt } }
 */
router.post(
  '/generate',
  async (req: Request<{}, {}, PaintingRequest>, res: Response): Promise<void> => {
    try {
      const { prompt, style, size, negativePrompt } = req.body;

      // 参数校验
      if (!prompt || typeof prompt !== 'string') {
        res.status(400).json({
          success: false,
          error: '缺少必填参数 prompt，或 prompt 不是字符串',
        });
        return;
      }

      if (prompt.length > 2000) {
        res.status(400).json({
          success: false,
          error: '提示词长度不能超过 2000 个字符',
        });
        return;
      }

      if (style && !PAINTING_STYLES.some((s) => s.id === style)) {
        res.status(400).json({
          success: false,
          error: `不支持的风格: ${style}，可选值: ${PAINTING_STYLES.map((s) => s.id).join(', ')}`,
        });
        return;
      }

      const result = await generatePainting({ prompt, style, size, negativePrompt });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[Painting Generate Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'AI 绘画生成失败，请稍后重试',
      });
    }
  },
);

/**
 * POST /api/painting/styles - 获取可用的绘画风格
 * Returns: { success: true, data: { styles } }
 */
router.post('/styles', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    data: {
      styles: PAINTING_STYLES,
    },
  });
});

/**
 * GET /api/painting/config - 获取绘画服务配置
 * Returns: { success: true, data: { styles, sizes, model, maxTokens, temperature } }
 */
router.get('/config', (_req: Request, res: Response): void => {
  const config = getPaintingConfig();
  res.json({
    success: true,
    data: config,
  });
});

export default router;
