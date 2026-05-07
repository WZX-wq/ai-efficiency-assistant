import { Router, Request, Response } from 'express';
import {
  createSession,
  getSession,
  chat,
  deleteSession,
  setKnowledgeBase,
  getKnowledgeBase,
  getServiceConfig,
} from '../services/customerService';

const router = Router();

/**
 * POST /api/customer-service/session - 创建新的客服会话
 */
router.post('/session', (req: Request, res: Response): void => {
  try {
    const result = createSession();
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[CustomerService] 创建会话失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建会话失败',
    });
  }
});

/**
 * POST /api/customer-service/chat - 发送消息
 */
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少必填参数 sessionId',
      });
      return;
    }

    if (!message || typeof message !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少必填参数 message',
      });
      return;
    }

    if (message.length > 5000) {
      res.status(400).json({
        success: false,
        error: '消息长度不能超过 5000 个字符',
      });
      return;
    }

    const result = await chat(sessionId, message);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[CustomerService] 聊天处理失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '聊天处理失败，请稍后重试',
    });
  }
});

/**
 * GET /api/customer-service/session/:sessionId - 获取会话信息
 */
router.get('/session/:sessionId', (req: Request<{ sessionId: string }>, res: Response): void => {
  try {
    const sessionId = req.params.sessionId;
    const session = getSession(sessionId);

    if (!session) {
      res.status(404).json({
        success: false,
        error: '会话不存在或已过期',
      });
      return;
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error('[CustomerService] 获取会话失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取会话失败',
    });
  }
});

/**
 * DELETE /api/customer-service/session/:sessionId - 删除会话
 */
router.delete('/session/:sessionId', (req: Request<{ sessionId: string }>, res: Response): void => {
  try {
    const sessionId = req.params.sessionId;
    const deleted = deleteSession(sessionId);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: '会话不存在',
      });
      return;
    }

    res.json({
      success: true,
      data: { message: '会话已删除' },
    });
  } catch (error) {
    console.error('[CustomerService] 删除会话失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除会话失败',
    });
  }
});

/**
 * POST /api/customer-service/knowledge-base - 设置知识库
 */
router.post('/knowledge-base', (req: Request, res: Response): void => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items)) {
      res.status(400).json({
        success: false,
        error: '缺少必填参数 items，或 items 不是数组',
      });
      return;
    }

    for (const item of items) {
      if (!item.question || typeof item.question !== 'string') {
        res.status(400).json({
          success: false,
          error: '每个知识库条目必须包含 question 字段（字符串）',
        });
        return;
      }
      if (!item.answer || typeof item.answer !== 'string') {
        res.status(400).json({
          success: false,
          error: '每个知识库条目必须包含 answer 字段（字符串）',
        });
        return;
      }
    }

    setKnowledgeBase(items);

    res.json({
      success: true,
      data: { message: '知识库已更新', count: items.length },
    });
  } catch (error) {
    console.error('[CustomerService] 设置知识库失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '设置知识库失败',
    });
  }
});

/**
 * GET /api/customer-service/knowledge-base - 获取知识库
 */
router.get('/knowledge-base', (req: Request, res: Response): void => {
  try {
    const items = getKnowledgeBase();
    res.json({
      success: true,
      data: { items },
    });
  } catch (error) {
    console.error('[CustomerService] 获取知识库失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取知识库失败',
    });
  }
});

/**
 * GET /api/customer-service/config - 获取服务配置
 */
router.get('/config', (req: Request, res: Response): void => {
  try {
    const config = getServiceConfig();
    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('[CustomerService] 获取配置失败:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取配置失败',
    });
  }
});

export default router;
