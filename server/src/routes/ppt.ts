import { Router, Request, Response } from 'express';
import {
  generatePptContent,
  exportPpt,
  getPptConfig,
  PptGenerateRequest,
  PptResult,
} from '../services/pptGenerator';

const router = Router();

/**
 * POST /api/ppt/generate - 生成 PPT 内容
 * Body: { topic: string, slideCount?: number, theme?: string, language?: string }
 * Returns: { success: true, data: { id, title, theme, slides } }
 */
router.post(
  '/generate',
  async (req: Request<{}, {}, PptGenerateRequest>, res: Response): Promise<void> => {
    try {
      const { topic, slideCount, theme, language } = req.body;

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

      if (slideCount !== undefined && (typeof slideCount !== 'number' || slideCount < 1 || slideCount > 20)) {
        res.status(400).json({
          success: false,
          error: 'slideCount 必须是 1-20 之间的数字',
        });
        return;
      }

      const result = await generatePptContent({
        topic,
        slideCount,
        theme,
        language,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[PPT Generate Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'PPT 内容生成失败，请稍后重试',
      });
    }
  },
);

/**
 * POST /api/ppt/export - 导出 PPT 为可下载格式
 * Body: { pptData: object }
 * Returns: { success: true, data: { downloadUrl } }
 */
router.post(
  '/export',
  async (req: Request<{}, {}, { pptData: PptResult }>, res: Response): Promise<void> => {
    try {
      const { pptData } = req.body;

      // 参数校验
      if (!pptData || typeof pptData !== 'object') {
        res.status(400).json({
          success: false,
          error: '缺少必填参数 pptData，或 pptData 不是对象',
        });
        return;
      }

      if (!pptData.title || !pptData.slides || !Array.isArray(pptData.slides)) {
        res.status(400).json({
          success: false,
          error: 'pptData 必须包含 title 和 slides 字段',
        });
        return;
      }

      const result = exportPpt(pptData);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('[PPT Export Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'PPT 导出失败，请稍后重试',
      });
    }
  },
);

/**
 * GET /api/ppt/config - 获取 PPT 服务配置
 * Returns: { success: true, data: { themes, slideCounts, model, maxTokens, temperature } }
 */
router.get('/config', (_req: Request, res: Response): void => {
  const config = getPptConfig();
  res.json({
    success: true,
    data: config,
  });
});

export default router;
