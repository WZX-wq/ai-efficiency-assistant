import { Router, Request, Response } from 'express';
import {
  analyzeData,
  generateReport,
  queryData,
  suggestCharts,
  getServiceConfig,
} from '../services/dataAnalysis';

const router = Router();

/**
 * POST /api/data-analysis/analyze - 分析数据
 */
router.post('/analyze', async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, format, question } = req.body;

    if (!data || typeof data !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少必填参数 data',
      });
      return;
    }

    if (!format || !['csv', 'json'].includes(format)) {
      res.status(400).json({
        success: false,
        error: 'format 必须是 csv 或 json',
      });
      return;
    }

    if (data.length > 500000) {
      res.status(400).json({
        success: false,
        error: '数据大小不能超过 500KB',
      });
      return;
    }

    const result = await analyzeData(data, format, question);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[DataAnalysis] 数据分析失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '数据分析失败，请稍后重试',
    });
  }
});

/**
 * POST /api/data-analysis/report - 生成报告
 */
router.post('/report', async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, format, reportType } = req.body;

    if (!data || typeof data !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少必填参数 data',
      });
      return;
    }

    if (!format || !['csv', 'json'].includes(format)) {
      res.status(400).json({
        success: false,
        error: 'format 必须是 csv 或 json',
      });
      return;
    }

    const validReportTypes = ['summary', 'detailed', 'executive'];
    if (!reportType || !validReportTypes.includes(reportType)) {
      res.status(400).json({
        success: false,
        error: `reportType 必须是以下之一: ${validReportTypes.join(', ')}`,
      });
      return;
    }

    if (data.length > 500000) {
      res.status(400).json({
        success: false,
        error: '数据大小不能超过 500KB',
      });
      return;
    }

    const report = await generateReport(data, format, reportType);

    res.json({
      success: true,
      data: { report },
    });
  } catch (error) {
    console.error('[DataAnalysis] 报告生成失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '报告生成失败，请稍后重试',
    });
  }
});

/**
 * POST /api/data-analysis/query - 自然语言查询
 */
router.post('/query', async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, format, question } = req.body;

    if (!data || typeof data !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少必填参数 data',
      });
      return;
    }

    if (!format || !['csv', 'json'].includes(format)) {
      res.status(400).json({
        success: false,
        error: 'format 必须是 csv 或 json',
      });
      return;
    }

    if (!question || typeof question !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少必填参数 question',
      });
      return;
    }

    if (data.length > 500000) {
      res.status(400).json({
        success: false,
        error: '数据大小不能超过 500KB',
      });
      return;
    }

    const answer = await queryData(data, format, question);

    res.json({
      success: true,
      data: { answer },
    });
  } catch (error) {
    console.error('[DataAnalysis] 数据查询失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '数据查询失败，请稍后重试',
    });
  }
});

/**
 * POST /api/data-analysis/charts - 推荐图表
 */
router.post('/charts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { data, format } = req.body;

    if (!data || typeof data !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少必填参数 data',
      });
      return;
    }

    if (!format || !['csv', 'json'].includes(format)) {
      res.status(400).json({
        success: false,
        error: 'format 必须是 csv 或 json',
      });
      return;
    }

    if (data.length > 500000) {
      res.status(400).json({
        success: false,
        error: '数据大小不能超过 500KB',
      });
      return;
    }

    const charts = await suggestCharts(data, format);

    res.json({
      success: true,
      data: { charts },
    });
  } catch (error) {
    console.error('[DataAnalysis] 图表推荐失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '图表推荐失败，请稍后重试',
    });
  }
});

/**
 * GET /api/data-analysis/config - 获取服务配置
 */
router.get('/config', (req: Request, res: Response): void => {
  try {
    const config = getServiceConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('[DataAnalysis] 获取配置失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取配置失败',
    });
  }
});

export default router;
