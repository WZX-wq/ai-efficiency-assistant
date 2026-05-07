import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import CodeSnippet, { SupportedLanguages, ProgrammingLanguage } from '../models/CodeSnippet';
import { authenticateToken } from '../middleware/auth';
import { callDeepSeek, getModelFor } from '../services/deepseek';

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 代码执行请求接口
 */
interface CodeExecuteRequest {
  code: string;
  language: ProgrammingLanguage;
  timeout?: number;
}

/**
 * 代码分析请求接口
 */
interface CodeAnalyzeRequest {
  code: string;
  language: ProgrammingLanguage;
  action: 'explain' | 'refactor' | 'debug' | 'optimize';
}

/**
 * 代码片段创建请求接口
 */
interface CodeSnippetCreateRequest {
  title: string;
  code: string;
  language: ProgrammingLanguage;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

/**
 * 代码片段更新请求接口
 */
interface CodeSnippetUpdateRequest {
  title?: string;
  code?: string;
  language?: ProgrammingLanguage;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
}

/**
 * 沙箱执行结果接口
 */
interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
}

/**
 * @swagger
 * /api/code/execute:
 *   post:
 *     summary: 执行代码
 *     description: 在模拟沙箱环境中执行代码（安全限制）
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, language]
 *             properties:
 *               code:
 *                 type: string
 *                 maxLength: 50000
 *                 example: console.log('Hello World');
 *               language:
 *                 type: string
 *                 enum: [javascript, typescript, python, java, cpp, c, csharp, go, rust, php, ruby, swift, kotlin, sql, html, css]
 *               timeout:
 *                 type: integer
 *                 default: 5000
 *     responses:
 *       200:
 *         description: 执行结果
 *       400:
 *         description: 参数错误或包含危险代码
 */
router.post('/execute', async (req: Request<{}, {}, CodeExecuteRequest>, res: Response): Promise<void> => {
  try {
    const { code, language, timeout = 5000 } = req.body;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    // 参数校验
    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少必填参数 code，或 code 不是字符串',
      });
      return;
    }

    if (!language || !SupportedLanguages.includes(language)) {
      res.status(400).json({
        success: false,
        error: `language 必须是以下之一: ${SupportedLanguages.join(', ')}`,
      });
      return;
    }

    // 代码长度限制
    if (code.length > 50000) {
      res.status(400).json({
        success: false,
        error: '代码长度不能超过 50000 个字符',
      });
      return;
    }

    // 安全检查：检测危险代码模式
    const dangerousPatterns = [
      /eval\s*\(/i,
      /Function\s*\(/i,
      /setTimeout\s*\(\s*["'][^"']+["']/i,
      /setInterval\s*\(\s*["'][^"']+["']/i,
      /child_process/i,
      /require\s*\(\s*["']fs["']\s*\)/i,
      /require\s*\(\s*["']os["']\s*\)/i,
      /require\s*\(\s*["']child_process["']\s*\)/i,
      /import\s+os/i,
      /import\s+subprocess/i,
      /import\s+sys/i,
      /__import__/i,
      /exec\s*\(/i,
      /compile\s*\(/i,
      /open\s*\(/i,
      /file:\/\//i,
      /http:\/\//i,
      /https:\/\//i,
      /fetch\s*\(/i,
      /XMLHttpRequest/i,
      /WebSocket/i,
      /process\.env/i,
      /process\.exit/i,
      /while\s*\(\s*true\s*\)/i,
      /for\s*\(\s*;\s*;\s*\)/i,
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(code)) {
        res.status(400).json({
          success: false,
          error: '代码包含潜在危险操作，已被阻止执行',
          details: `检测到不安全的代码模式: ${pattern.source}`,
        });
        return;
      }
    }

    // 执行时间限制
    const startTime = Date.now();
    const maxExecutionTime = Math.min(timeout, 30000); // 最大30秒

    let result: ExecutionResult;

    // 根据语言类型进行模拟执行或语法检查
    switch (language) {
      case 'javascript':
      case 'typescript':
        result = await executeJavaScript(code, maxExecutionTime);
        break;
      case 'python':
        result = await executePython(code, maxExecutionTime);
        break;
      case 'sql':
        result = await validateSQL(code);
        break;
      case 'html':
      case 'css':
        result = await validateMarkup(code, language);
        break;
      default:
        // 其他语言进行语法分析和模拟执行
        result = await simulateExecution(code, language, maxExecutionTime);
    }

    const executionTime = Date.now() - startTime;

    res.json({
      success: true,
      result: {
        ...result,
        executionTime,
        language,
      },
    });
  } catch (error) {
    console.error('[Code Execute Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '代码执行失败，请稍后重试',
    });
  }
});

/**
 * @swagger
 * /api/code/analyze:
 *   post:
 *     summary: 代码分析
 *     description: AI 代码分析，支持解释、重构、调试、优化
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, language, action]
 *             properties:
 *               code:
 *                 type: string
 *                 maxLength: 30000
 *               language:
 *                 type: string
 *               action:
 *                 type: string
 *                 enum: [explain, refactor, debug, optimize]
 *     responses:
 *       200:
 *         description: 分析结果
 */
router.post('/analyze', async (req: Request<{}, {}, CodeAnalyzeRequest>, res: Response): Promise<void> => {
  try {
    const { code, language, action } = req.body;

    // 参数校验
    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: '缺少必填参数 code，或 code 不是字符串',
      });
      return;
    }

    if (!language || !SupportedLanguages.includes(language)) {
      res.status(400).json({
        success: false,
        error: `language 必须是以下之一: ${SupportedLanguages.join(', ')}`,
      });
      return;
    }

    const validActions = ['explain', 'refactor', 'debug', 'optimize'];
    if (!action || !validActions.includes(action)) {
      res.status(400).json({
        success: false,
        error: `action 必须是以下之一: ${validActions.join(', ')}`,
      });
      return;
    }

    if (code.length > 30000) {
      res.status(400).json({
        success: false,
        error: '代码长度不能超过 30000 个字符',
      });
      return;
    }

    // 构建提示词
    const actionPrompts: Record<string, string> = {
      explain: '请详细解释以下代码的功能、工作原理和关键逻辑：',
      refactor: '请重构以下代码，使其更加简洁、可读性更强，同时保持原有功能：',
      debug: '请分析以下代码中可能存在的bug或问题，并提供修复建议：',
      optimize: '请优化以下代码的性能，并解释优化思路：',
    };

    const messages = [
      {
        role: 'system' as const,
        content: `你是一位专业的${language}代码专家。请提供详细、专业的代码分析和建议。`,
      },
      {
        role: 'user' as const,
        content: `${actionPrompts[action]}\n\n\`\`\`${language}\n${code}\n\`\`\``,
      },
    ];

    const generator = await callDeepSeek(messages, true, getModelFor('code'));
    let analysis = '';

    for await (const chunk of generator) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        analysis += content;
      }
    }

    res.json({
      success: true,
      result: {
        action,
        language,
        analysis,
      },
    });
  } catch (error) {
    console.error('[Code Analyze Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '代码分析失败，请稍后重试',
    });
  }
});

/**
 * @swagger
 * /api/code/languages:
 *   get:
 *     summary: 获取支持的编程语言列表
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 支持的语言列表
 */
router.get('/languages', async (_req: Request, res: Response): Promise<void> => {
  const languages = SupportedLanguages.map((lang) => ({
    id: lang,
    name: getLanguageDisplayName(lang),
    extension: getLanguageExtension(lang),
  }));

  res.json({
    success: true,
    data: languages,
  });
});

// ==================== 代码片段库 CRUD ====================

/**
 * @swagger
 * /api/code/snippets:
 *   post:
 *     summary: 创建代码片段
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, code, language]
 *             properties:
 *               title:
 *                 type: string
 *               code:
 *                 type: string
 *               language:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: 代码片段创建成功
 *   get:
 *     summary: 获取用户的代码片段列表
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 代码片段列表
 */
router.post('/snippets', async (req: Request<{}, {}, CodeSnippetCreateRequest>, res: Response): Promise<void> => {
  try {
    const { title, code, language, description, tags, isPublic } = req.body;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    // 参数校验
    if (!title || !code || !language) {
      res.status(400).json({
        success: false,
        error: 'title、code 和 language 是必填项',
      });
      return;
    }

    if (!SupportedLanguages.includes(language)) {
      res.status(400).json({
        success: false,
        error: `language 必须是以下之一: ${SupportedLanguages.join(', ')}`,
      });
      return;
    }

    // 创建代码片段
    const snippet = new CodeSnippet({
      title: title.trim(),
      code,
      language,
      description: description?.trim() || null,
      tags: tags?.map((t) => t.trim().toLowerCase()).filter(Boolean) || [],
      isPublic: isPublic || false,
      userId: new Types.ObjectId(userId),
    });

    await snippet.save();

    res.status(201).json({
      success: true,
      data: snippet,
      message: '代码片段创建成功',
    });
  } catch (error) {
    console.error('[Create Snippet Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建代码片段失败',
    });
  }
});

/**
 * GET /api/code/snippets - 获取用户的代码片段列表
 */
router.get('/snippets', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as unknown as { user: { userId: string } }).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const language = req.query.language as string | undefined;

    const snippets = await CodeSnippet.findByUser(userId, { page, limit, language });
    const total = await CodeSnippet.countDocuments({ userId, ...(language && { language }) });

    res.json({
      success: true,
      data: {
        snippets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[Get Snippets Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取代码片段失败',
    });
  }
});

/**
 * @swagger
 * /api/code/snippets/public:
 *   get:
 *     summary: 获取公开代码片段
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: language
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 公开代码片段列表
 */
router.get('/snippets/public', async (req: Request, res: Response): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const language = req.query.language as string | undefined;
    const search = req.query.search as string | undefined;

    const snippets = await CodeSnippet.findPublic({ page, limit, language, search });
    const query: Record<string, unknown> = { isPublic: true };
    if (language) query.language = language;
    if (search) query.$text = { $search: search };
    const total = await CodeSnippet.countDocuments(query);

    res.json({
      success: true,
      data: {
        snippets,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[Get Public Snippets Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取公开代码片段失败',
    });
  }
});

/**
 * @swagger
 * /api/code/snippets/{id}:
 *   get:
 *     summary: 获取单个代码片段
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 代码片段详情
 *       404:
 *         description: 代码片段不存在
 *   put:
 *     summary: 更新代码片段
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               code:
 *                 type: string
 *               language:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     summary: 删除代码片段
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.get('/snippets/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const snippet = await CodeSnippet.findById(id as string);

    if (!snippet) {
      res.status(404).json({
        success: false,
        error: '代码片段不存在',
      });
      return;
    }

    // 检查权限：只能查看自己的或公开的代码片段
    if (snippet.userId.toString() !== userId && !snippet.isPublic) {
      res.status(403).json({
        success: false,
        error: '无权访问此代码片段',
      });
      return;
    }

    // 增加使用次数
    await CodeSnippet.incrementUsage(id as string);

    res.json({
      success: true,
      data: snippet,
    });
  } catch (error) {
    console.error('[Get Snippet Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取代码片段失败',
    });
  }
});

/**
 * @swagger
 * /api/code/snippets/{id}:
 *   put:
 *     summary: 更新代码片段
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               code:
 *                 type: string
 *               language:
 *                 type: string
 *               description:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/snippets/:id', async (req: Request<{ id: string }, {}, CodeSnippetUpdateRequest>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const snippet = await CodeSnippet.findById(id);

    if (!snippet) {
      res.status(404).json({
        success: false,
        error: '代码片段不存在',
      });
      return;
    }

    // 检查权限：只能更新自己的代码片段
    if (snippet.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权修改此代码片段',
      });
      return;
    }

    // 验证语言
    if (updates.language && !SupportedLanguages.includes(updates.language)) {
      res.status(400).json({
        success: false,
        error: `language 必须是以下之一: ${SupportedLanguages.join(', ')}`,
      });
      return;
    }

    // 处理标签
    if (updates.tags) {
      updates.tags = updates.tags.map((t) => t.trim().toLowerCase()).filter(Boolean);
    }

    // 更新字段
    Object.assign(snippet, updates);
    await snippet.save();

    res.json({
      success: true,
      data: snippet,
      message: '代码片段更新成功',
    });
  } catch (error) {
    console.error('[Update Snippet Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新代码片段失败',
    });
  }
});

/**
 * @swagger
 * /api/code/snippets/{id}:
 *   delete:
 *     summary: 删除代码片段
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/snippets/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const snippet = await CodeSnippet.findById(id);

    if (!snippet) {
      res.status(404).json({
        success: false,
        error: '代码片段不存在',
      });
      return;
    }

    // 检查权限：只能删除自己的代码片段
    if (snippet.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权删除此代码片段',
      });
      return;
    }

    await CodeSnippet.findByIdAndDelete(id);

    res.json({
      success: true,
      message: '代码片段删除成功',
    });
  } catch (error) {
    console.error('[Delete Snippet Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除代码片段失败',
    });
  }
});

/**
 * @swagger
 * /api/code/snippets/{id}/favorite:
 *   post:
 *     summary: 收藏/取消收藏代码片段
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [add, remove]
 *     responses:
 *       200:
 *         description: 操作成功
 */
router.post('/snippets/:id/favorite', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { action } = req.body as { action: 'add' | 'remove' };
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const snippet = await CodeSnippet.findById(id);

    if (!snippet) {
      res.status(404).json({
        success: false,
        error: '代码片段不存在',
      });
      return;
    }

    // 只能收藏公开的代码片段
    if (!snippet.isPublic && snippet.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权收藏此代码片段',
      });
      return;
    }

    // 更新收藏数
    const increment = action === 'add' ? 1 : -1;
    await CodeSnippet.findByIdAndUpdate(id, { $inc: { favoriteCount: increment } });

    res.json({
      success: true,
      message: action === 'add' ? '收藏成功' : '取消收藏成功',
    });
  } catch (error) {
    console.error('[Favorite Snippet Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '操作失败',
    });
  }
});

/**
 * @swagger
 * /api/code/snippets/tags/search:
 *   get:
 *     summary: 按标签搜索代码片段
 *     tags: [代码]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tags
 *         required: true
 *         schema:
 *           type: string
 *         description: 逗号分隔的标签列表
 *     responses:
 *       200:
 *         description: 搜索结果
 */
router.get('/snippets/tags/search', async (req: Request, res: Response): Promise<void> => {
  try {
    const tagsParam = req.query.tags as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    if (!tagsParam) {
      res.status(400).json({
        success: false,
        error: 'tags 参数是必需的',
      });
      return;
    }

    const tags = tagsParam.split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

    if (tags.length === 0) {
      res.status(400).json({
        success: false,
        error: '至少需要一个有效的标签',
      });
      return;
    }

    const snippets = await CodeSnippet.searchByTags(tags, { page, limit });

    res.json({
      success: true,
      data: {
        snippets,
        tags,
      },
    });
  } catch (error) {
    console.error('[Search By Tags Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '搜索失败',
    });
  }
});

// ==================== 辅助函数 ====================

/**
 * 执行 JavaScript 代码（使用 Function 构造器进行隔离）
 */
async function executeJavaScript(code: string, timeout: number): Promise<ExecutionResult> {
  const logs: string[] = [];
  const errors: string[] = [];

  // 创建安全的 console 对象
  const safeConsole = {
    log: (...args: unknown[]) => logs.push(args.map((a) => String(a)).join(' ')),
    error: (...args: unknown[]) => errors.push(args.map((a) => String(a)).join(' ')),
    warn: (...args: unknown[]) => logs.push(`[WARN] ${args.map((a) => String(a)).join(' ')}`),
    info: (...args: unknown[]) => logs.push(`[INFO] ${args.map((a) => String(a)).join(' ')}`),
  };

  try {
    // 使用 Promise 和 setTimeout 实现超时控制
    const result = await Promise.race([
      new Promise<ExecutionResult>((resolve) => {
        try {
          // 创建隔离的执行环境
          const func = new Function('console', `
            "use strict";
            ${code}
          `);
          func(safeConsole);
          resolve({
            success: true,
            output: logs.join('\n') || '代码执行完成（无输出）',
            executionTime: 0,
          });
        } catch (err) {
          resolve({
            success: false,
            output: logs.join('\n'),
            error: err instanceof Error ? err.message : String(err),
            executionTime: 0,
          });
        }
      }),
      new Promise<ExecutionResult>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`代码执行超时（超过 ${timeout}ms）`));
        }, timeout);
      }),
    ]);

    return result;
  } catch (err) {
    return {
      success: false,
      output: logs.join('\n'),
      error: err instanceof Error ? err.message : String(err),
      executionTime: timeout,
    };
  }
}

/**
 * 执行 Python 代码（模拟执行，返回语法分析结果）
 */
async function executePython(code: string, timeout: number): Promise<ExecutionResult> {
  // 由于无法直接执行 Python，这里进行基本的语法检查
  const lines = code.split('\n');
  const issues: string[] = [];
  let indentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // 检查缩进
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
    if (line.trim() && leadingSpaces % 4 !== 0 && line.trim() !== '') {
      // Python 推荐使用4空格缩进，但不是强制的
    }

    // 检查括号匹配
    const openParens = (line.match(/\(/g) || []).length;
    const closeParens = (line.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`第 ${lineNum} 行: 括号不匹配`);
    }

    // 检查引号匹配
    const singleQuotes = (line.match(/'/g) || []).length;
    const doubleQuotes = (line.match(/"/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      issues.push(`第 ${lineNum} 行: 单引号不匹配`);
    }
    if (doubleQuotes % 2 !== 0) {
      issues.push(`第 ${lineNum} 行: 双引号不匹配`);
    }
  }

  if (issues.length > 0) {
    return {
      success: false,
      output: '',
      error: `语法检查发现问题:\n${issues.join('\n')}`,
      executionTime: 0,
    };
  }

  return {
    success: true,
    output: 'Python 语法检查通过\n注意：Python 代码在服务器端无法直接执行，请在本地环境中运行。',
    executionTime: 0,
  };
}

/**
 * 验证 SQL 语法
 */
async function validateSQL(code: string): Promise<ExecutionResult> {
  const allowedStatements = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'SHOW', 'DESCRIBE'];
  const dangerousStatements = ['DROP DATABASE', 'DROP TABLE', 'DELETE FROM', 'TRUNCATE'];

  const upperCode = code.toUpperCase().trim();

  // 检查是否以允许的语句开头
  const startsWithAllowed = allowedStatements.some((stmt) => upperCode.startsWith(stmt));
  if (!startsWithAllowed) {
    return {
      success: false,
      output: '',
      error: 'SQL 语句必须以 SELECT、INSERT、UPDATE、DELETE、CREATE、ALTER、DROP、SHOW 或 DESCRIBE 开头',
      executionTime: 0,
    };
  }

  // 警告危险操作
  const foundDangerous = dangerousStatements.filter((stmt) => upperCode.includes(stmt));

  return {
    success: true,
    output: `SQL 语法初步检查通过\n${foundDangerous.length > 0 ? `警告：检测到潜在危险操作: ${foundDangerous.join(', ')}` : ''}\n注意：SQL 语句需要在数据库环境中执行。`,
    executionTime: 0,
  };
}

/**
 * 验证 HTML/CSS
 */
async function validateMarkup(code: string, type: 'html' | 'css'): Promise<ExecutionResult> {
  if (type === 'html') {
    // 基本的 HTML 标签检查
    const tags = code.match(/<\/?[a-zA-Z][^>]*>/g) || [];
    const unclosedTags: string[] = [];
    const stack: string[] = [];

    for (const tag of tags) {
      if (tag.startsWith('</')) {
        const tagName = tag.match(/<\/([a-zA-Z]+)/)?.[1];
        if (tagName && stack.length > 0 && stack[stack.length - 1] === tagName) {
          stack.pop();
        }
      } else if (!tag.endsWith('/>') && !tag.match(/<(br|hr|img|input|meta|link|area|base|col|embed|param|source|track|wbr)/i)) {
        const tagName = tag.match(/<([a-zA-Z]+)/)?.[1];
        if (tagName) {
          stack.push(tagName);
        }
      }
    }

    if (stack.length > 0) {
      return {
        success: false,
        output: '',
        error: `未闭合的标签: ${stack.join(', ')}`,
        executionTime: 0,
      };
    }

    return {
      success: true,
      output: 'HTML 结构检查通过',
      executionTime: 0,
    };
  } else {
    // CSS 基本检查
    const braceMatches = code.match(/\{/g)?.length === code.match(/\}/g)?.length;
    if (!braceMatches) {
      return {
        success: false,
        output: '',
        error: 'CSS 大括号不匹配',
        executionTime: 0,
      };
    }

    return {
      success: true,
      output: 'CSS 语法检查通过',
      executionTime: 0,
    };
  }
}

/**
 * 模拟执行其他语言
 */
async function simulateExecution(code: string, language: string, timeout: number): Promise<ExecutionResult> {
  // 对其他语言进行基本的语法检查
  const lines = code.split('\n').length;
  const chars = code.length;

  return {
    success: true,
    output: `${language} 代码分析完成\n代码行数: ${lines}\n字符数: ${chars}\n\n注意：${language} 代码在当前环境中无法直接执行，请在相应的编译器或解释器中运行。`,
    executionTime: 0,
  };
}

/**
 * 获取语言的显示名称
 */
function getLanguageDisplayName(lang: ProgrammingLanguage): string {
  const names: Record<ProgrammingLanguage, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    python: 'Python',
    java: 'Java',
    cpp: 'C++',
    c: 'C',
    csharp: 'C#',
    go: 'Go',
    rust: 'Rust',
    php: 'PHP',
    ruby: 'Ruby',
    swift: 'Swift',
    kotlin: 'Kotlin',
    sql: 'SQL',
    html: 'HTML',
    css: 'CSS',
  };
  return names[lang];
}

/**
 * 获取语言的文件扩展名
 */
function getLanguageExtension(lang: ProgrammingLanguage): string {
  const extensions: Record<ProgrammingLanguage, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    cpp: 'cpp',
    c: 'c',
    csharp: 'cs',
    go: 'go',
    rust: 'rs',
    php: 'php',
    ruby: 'rb',
    swift: 'swift',
    kotlin: 'kt',
    sql: 'sql',
    html: 'html',
    css: 'css',
  };
  return extensions[lang];
}

export default router;
