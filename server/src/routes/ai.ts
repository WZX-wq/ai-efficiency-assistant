import { Router, Request, Response } from 'express';
import { AIProcessRequest, AIChatRequest } from '../types';
import { processText, callDeepSeek } from '../services/deepseek';

const router = Router();

/**
 * POST /api/ai/process - 统一的 AI 处理接口
 * 支持 rewrite（改写）、expand（扩写）、translate（翻译）、summarize（摘要）
 */
router.post(
  '/process',
  async (req: Request<{}, {}, AIProcessRequest>, res: Response): Promise<void> => {
    try {
      const { text, action, targetLang } = req.body;

      // 参数校验
      if (!text || typeof text !== 'string') {
        res.status(400).json({
          success: false,
          error: '缺少必填参数 text，或 text 不是字符串',
        });
        return;
      }

      const validActions = ['rewrite', 'expand', 'translate', 'summarize'];
      if (!action || !validActions.includes(action)) {
        res.status(400).json({
          success: false,
          error: `action 必须是以下之一: ${validActions.join(', ')}`,
        });
        return;
      }

      if (action === 'translate' && !targetLang) {
        res.status(400).json({
          success: false,
          error: '翻译操作需要提供 targetLang 参数',
        });
        return;
      }

      if (text.length > 50000) {
        res.status(400).json({
          success: false,
          error: '文本长度不能超过 50000 个字符',
        });
        return;
      }

      const result = await processText(text, action, targetLang);

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error('[AI Process Error]', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'AI 处理失败，请稍后重试',
      });
    }
  },
);

/**
 * POST /api/ai/chat - 流式对话接口（SSE）
 * 接收 messages 数组，通过 Server-Sent Events 流式返回 AI 回复
 */
router.post(
  '/chat',
  async (req: Request<{}, {}, AIChatRequest>, res: Response): Promise<void> => {
    try {
      const { messages } = req.body;

      // 参数校验
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({
          success: false,
          error: '缺少必填参数 messages，或 messages 不是非空数组',
        });
        return;
      }

      for (const msg of messages) {
        if (!msg.role || !msg.content) {
          res.status(400).json({
            success: false,
            error: '每条消息必须包含 role 和 content 字段',
          });
          return;
        }
        if (!['system', 'user', 'assistant'].includes(msg.role)) {
          res.status(400).json({
            success: false,
            error: 'role 必须是 system、user 或 assistant',
          });
          return;
        }
      }

      // 设置 SSE 响应头
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // 禁用 Nginx 缓冲
      res.flushHeaders();

      const generator = await callDeepSeek(messages, true);

      try {
        for await (const chunk of generator) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            res.write(`data: ${JSON.stringify({ content })}\n\n`);
          }

          // 检查客户端是否已断开连接
          if (res.writableEnded) {
            break;
          }
        }
      } catch (streamError) {
        console.error('[AI Chat Stream Error]', streamError);
        res.write(
          `data: ${JSON.stringify({ error: '流式响应中断，请重试' })}\n\n`,
        );
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      console.error('[AI Chat Error]', error);

      // 如果响应头尚未发送，返回 JSON 错误
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : '对话处理失败，请稍后重试',
        });
      } else {
        res.write(
          `data: ${JSON.stringify({ error: '服务内部错误' })}\n\n`,
        );
        res.end();
      }
    }
  },
);

export default router;
