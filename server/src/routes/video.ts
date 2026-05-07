import { Router, Request, Response } from 'express';
import {
  generateVideoScript,
  generateStoryboard,
  getVideoConfig,
  VideoScriptRequest,
} from '../services/videoGenerator';

const router = Router();

/**
 * POST /api/video/generate-script - 生成视频脚本
 * Body: { topic: string, type?: string, duration?: string, targetAudience?: string, tone?: string }
 * Returns: { success: true, data: { id, title, type, duration, scenes } }
 */
router.post(
  '/generate-script',
  async (req: Request<{}, {}, VideoScriptRequest>, res: Response): Promise<void> => {
    try {
      const { topic, type, duration, targetAudience, tone } = req.body;

      // 参数校验
      if (!topic || typeof topic !== 'string') {
        res.status(400).json({
          success: false,
          error: '缺少必填参数 topic，或 topic 不是字符串',
        });
        return;
      }

      if (topic.length > 2000) {
        res.status(400).json({
          success: false,
          error: '主题长度不能超过 2000 个字符',
        });
        return;
      }

      const result = await generateVideoScript({
        topic,
        type,
        duration,
        targetAudience,
        tone,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[Video Script Generate Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '视频脚本生成失败，请稍后重试',
      });
    }
  },
);

/**
 * POST /api/video/generate-storyboard - 生成分镜
 * Body: { script: string }
 * Returns: { success: true, data: { frames } }
 */
router.post(
  '/generate-storyboard',
  async (req: Request<{}, {}, { script: string }>, res: Response): Promise<void> => {
    try {
      const { script } = req.body;

      // 参数校验
      if (!script || typeof script !== 'string') {
        res.status(400).json({
          success: false,
          error: '缺少必填参数 script，或 script 不是字符串',
        });
        return;
      }

      if (script.length > 50000) {
        res.status(400).json({
          success: false,
          error: '脚本内容长度不能超过 50000 个字符',
        });
        return;
      }

      const result = await generateStoryboard(script);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[Video Storyboard Generate Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '分镜生成失败，请稍后重试',
      });
    }
  },
);

/**
 * GET /api/video/config - 获取视频服务配置
 * Returns: { success: true, data: { types, durations, model, maxTokens, temperature } }
 */
router.get('/config', (_req: Request, res: Response): void => {
  const config = getVideoConfig();
  res.json({
    success: true,
    data: config,
  });
});

export default router;
