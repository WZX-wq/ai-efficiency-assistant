import { Router, Request, Response } from 'express';
import { Types } from 'mongoose';
import mysql from 'mysql2/promise';
import { Client as PgClient } from 'pg';
import { MongoClient } from 'mongodb';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { DatabaseConnection, QueryHistory, SupportedDatabases, DatabaseType, IDatabaseConnectionDocument } from '../models/QueryHistory';
import { authenticateToken } from '../middleware/auth';

// 定义 DatabaseConnectionDocument 类型别名
type DatabaseConnectionDocument = IDatabaseConnectionDocument;

const router = Router();

// 所有路由都需要认证
router.use(authenticateToken);

// SQLite 连接缓存
const sqliteConnections: Map<string, Database> = new Map();

/**
 * 数据库连接请求接口
 */
interface DatabaseConnectionRequest {
  name: string;
  type: DatabaseType;
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  connectionString?: string;
  filePath?: string;
  ssl?: boolean;
  connectTimeout?: number;
}

/**
 * 数据库连接测试请求接口
 */
interface DatabaseTestRequest extends DatabaseConnectionRequest {}

/**
 * SQL 查询请求接口
 */
interface SQLQueryRequest {
  connectionId: string;
  query: string;
  queryName?: string;
}

/**
 * MongoDB 查询请求接口
 */
interface MongoQueryRequest {
  connectionId: string;
  collection: string;
  operation: 'find' | 'findOne' | 'insertOne' | 'insertMany' | 'updateOne' | 'updateMany' | 'deleteOne' | 'deleteMany' | 'aggregate';
  filter?: Record<string, unknown>;
  document?: unknown;
  documents?: unknown[];
  update?: Record<string, unknown>;
  pipeline?: unknown[];
  options?: Record<string, unknown>;
  queryName?: string;
}

/**
 * @swagger
 * /api/database/connections:
 *   post:
 *     summary: 创建数据库连接
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, type, database]
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [mysql, postgresql, mongodb, sqlite]
 *               host:
 *                 type: string
 *               port:
 *                 type: integer
 *               database:
 *                 type: string
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: 连接创建成功
 */
router.post('/connections', async (req: Request<{}, {}, DatabaseConnectionRequest>, res: Response): Promise<void> => {
  try {
    const connectionData = req.body;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    // 参数校验
    if (!connectionData.name || !connectionData.type || !connectionData.database) {
      res.status(400).json({
        success: false,
        error: 'name、type 和 database 是必填项',
      });
      return;
    }

    if (!SupportedDatabases.includes(connectionData.type)) {
      res.status(400).json({
        success: false,
        error: `type 必须是以下之一: ${SupportedDatabases.join(', ')}`,
      });
      return;
    }

    // 根据数据库类型验证必要参数
    if (connectionData.type === 'sqlite') {
      if (!connectionData.filePath) {
        res.status(400).json({
          success: false,
          error: 'SQLite 连接需要提供 filePath',
        });
        return;
      }
    } else if (connectionData.type === 'mongodb') {
      if (!connectionData.connectionString && (!connectionData.host || !connectionData.database)) {
        res.status(400).json({
          success: false,
          error: 'MongoDB 连接需要提供 connectionString 或 host + database',
        });
        return;
      }
    } else {
      // MySQL 和 PostgreSQL
      if (!connectionData.host || !connectionData.username) {
        res.status(400).json({
          success: false,
          error: `${connectionData.type} 连接需要提供 host 和 username`,
        });
        return;
      }
    }

    // 创建连接记录
    const connection = new DatabaseConnection({
      ...connectionData,
      userId: new Types.ObjectId(userId),
      isActive: true,
    });

    await connection.save();

    res.status(201).json({
      success: true,
      data: connection,
      message: '数据库连接创建成功',
    });
  } catch (error) {
    console.error('[Create Connection Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '创建数据库连接失败',
    });
  }
});

/**
 * @swagger
 * /api/database/connections:
 *   get:
 *     summary: 获取数据库连接列表
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 连接列表
 */
router.get('/connections', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const connections = await DatabaseConnection.findByUser(userId);

    res.json({
      success: true,
      data: connections,
    });
  } catch (error) {
    console.error('[Get Connections Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取数据库连接失败',
    });
  }
});

/**
 * @swagger
 * /api/database/connections/{id}:
 *   get:
 *     summary: 获取单个数据库连接
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 连接详情
 */
router.get('/connections/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const connection = await DatabaseConnection.findById(id);

    if (!connection) {
      res.status(404).json({
        success: false,
        error: '数据库连接不存在',
      });
      return;
    }

    // 检查权限
    if (connection.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权访问此数据库连接',
      });
      return;
    }

    res.json({
      success: true,
      data: connection,
    });
  } catch (error) {
    console.error('[Get Connection Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取数据库连接失败',
    });
  }
});

/**
 * @swagger
 * /api/database/connections/{id}:
 *   put:
 *     summary: 更新数据库连接
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/connections/:id', async (req: Request<{ id: string }, {}, Partial<DatabaseConnectionRequest>>, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const connection = await DatabaseConnection.findById(id);

    if (!connection) {
      res.status(404).json({
        success: false,
        error: '数据库连接不存在',
      });
      return;
    }

    // 检查权限
    if (connection.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权修改此数据库连接',
      });
      return;
    }

    // 验证类型
    if (updates.type && !SupportedDatabases.includes(updates.type)) {
      res.status(400).json({
        success: false,
        error: `type 必须是以下之一: ${SupportedDatabases.join(', ')}`,
      });
      return;
    }

    // 更新字段
    Object.assign(connection, updates);
    await connection.save();

    res.json({
      success: true,
      data: connection,
      message: '数据库连接更新成功',
    });
  } catch (error) {
    console.error('[Update Connection Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '更新数据库连接失败',
    });
  }
});

/**
 * @swagger
 * /api/database/connections/{id}:
 *   delete:
 *     summary: 删除数据库连接
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/connections/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const connection = await DatabaseConnection.findById(id);

    if (!connection) {
      res.status(404).json({
        success: false,
        error: '数据库连接不存在',
      });
      return;
    }

    // 检查权限
    if (connection.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权删除此数据库连接',
      });
      return;
    }

    // 关闭 SQLite 连接（如果存在）
    if (connection.type === 'sqlite' && sqliteConnections.has(id as string)) {
      const db = sqliteConnections.get(id as string);
      if (db) {
        await db.close();
      }
      sqliteConnections.delete(id as string);
    }

    await DatabaseConnection.findByIdAndDelete(id as string);

    res.json({
      success: true,
      message: '数据库连接删除成功',
    });
  } catch (error) {
    console.error('[Delete Connection Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除数据库连接失败',
    });
  }
});

/**
 * @swagger
 * /api/database/connections/{id}/test:
 *   post:
 *     summary: 测试数据库连接
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 连接测试结果
 */
router.post('/connections/:id/test', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const connection = await DatabaseConnection.findById(id).select('+password');

    if (!connection) {
      res.status(404).json({
        success: false,
        error: '数据库连接不存在',
      });
      return;
    }

    // 检查权限
    if (connection.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权测试此数据库连接',
      });
      return;
    }

    const startTime = Date.now();
    const result = await testConnection(connection);
    const latency = Date.now() - startTime;

    if (result.success) {
      // 更新最后连接时间
      connection.lastConnectedAt = new Date();
      await connection.save();
    }

    res.json({
      success: result.success,
      data: {
        connected: result.success,
        latency,
        message: result.message,
        version: result.version,
      },
    });
  } catch (error) {
    console.error('[Test Connection Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '测试数据库连接失败',
    });
  }
});

/**
 * @swagger
 * /api/database/connections/test:
 *   post:
 *     summary: 测试新数据库连接（不保存）
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 连接测试结果
 */
router.post('/connections/test', async (req: Request<{}, {}, DatabaseTestRequest>, res: Response): Promise<void> => {
  try {
    const connectionData = req.body;

    const startTime = Date.now();
    const result = await testConnection(connectionData as unknown as DatabaseConnectionDocument);
    const latency = Date.now() - startTime;

    res.json({
      success: result.success,
      data: {
        connected: result.success,
        latency,
        message: result.message,
        version: result.version,
      },
    });
  } catch (error) {
    console.error('[Test New Connection Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '测试数据库连接失败',
    });
  }
});

/**
 * @swagger
 * /api/database/query/sql:
 *   post:
 *     summary: 执行 SQL 查询
 *     description: 支持 MySQL/PostgreSQL/SQLite
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [connectionId, query]
 *             properties:
 *               connectionId:
 *                 type: string
 *               query:
 *                 type: string
 *     responses:
 *       200:
 *         description: 查询结果
 */
router.post('/query/sql', async (req: Request<{}, {}, SQLQueryRequest>, res: Response): Promise<void> => {
  try {
    const { connectionId, query, queryName } = req.body;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    // 参数校验
    if (!connectionId || !query) {
      res.status(400).json({
        success: false,
        error: 'connectionId 和 query 是必填项',
      });
      return;
    }

    // 获取连接信息
    const connection = await DatabaseConnection.findById(connectionId).select('+password');

    if (!connection) {
      res.status(404).json({
        success: false,
        error: '数据库连接不存在',
      });
      return;
    }

    // 检查权限
    if (connection.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权使用此数据库连接',
      });
      return;
    }

    // 安全检查：限制危险操作
    const upperQuery = query.trim().toUpperCase();
    const dangerousKeywords = ['DROP DATABASE', 'DROP TABLE', 'TRUNCATE TABLE', 'DELETE FROM'];
    const isDangerous = dangerousKeywords.some((kw) => upperQuery.startsWith(kw));

    if (isDangerous) {
      res.status(403).json({
        success: false,
        error: '该操作被禁止，请联系管理员',
      });
      return;
    }

    // 执行查询
    const startTime = Date.now();
    let result: { success: boolean; data?: unknown; error?: string; affectedRows?: number };

    try {
      switch (connection.type) {
        case 'mysql':
          result = await executeMySQLQuery(connection, query);
          break;
        case 'postgresql':
          result = await executePgQuery(connection, query);
          break;
        case 'sqlite':
          result = await executeSQLiteQuery(connection, connectionId, query);
          break;
        default:
          res.status(400).json({
            success: false,
            error: `不支持的数据库类型: ${connection.type}，请使用 /query/mongo 接口`,
          });
          return;
      }
    } catch (execError) {
      result = {
        success: false,
        error: execError instanceof Error ? execError.message : String(execError),
      };
    }

    const executionTime = Date.now() - startTime;

    // 保存查询历史
    const queryType = getQueryType(query);
    await new QueryHistory({
      name: queryName || query.substring(0, 100),
      databaseType: connection.type,
      connectionId: new Types.ObjectId(connectionId),
      query: query.substring(0, 5000), // 限制长度
      queryType,
      status: result.success ? 'success' : 'error',
      resultMessage: result.error || `查询成功，${result.affectedRows !== undefined ? `影响 ${result.affectedRows} 行` : `返回 ${Array.isArray(result.data) ? result.data.length : 0} 条记录`}`,
      affectedRows: result.affectedRows,
      executionTime,
      userId: new Types.ObjectId(userId),
    }).save();

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        meta: {
          executionTime,
          affectedRows: result.affectedRows,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        meta: {
          executionTime,
        },
      });
    }
  } catch (error) {
    console.error('[SQL Query Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '执行查询失败',
    });
  }
});

/**
 * @swagger
 * /api/database/query/mongo:
 *   post:
 *     summary: 执行 MongoDB 查询
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [connectionId, collection, operation]
 *             properties:
 *               connectionId:
 *                 type: string
 *               collection:
 *                 type: string
 *               operation:
 *                 type: string
 *                 enum: [find, findOne, insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany, aggregate]
 *     responses:
 *       200:
 *         description: 查询结果
 */
router.post('/query/mongo', async (req: Request<{}, {}, MongoQueryRequest>, res: Response): Promise<void> => {
  try {
    const { connectionId, collection, operation, filter, document, documents, update, pipeline, options, queryName } = req.body;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    // 参数校验
    if (!connectionId || !collection || !operation) {
      res.status(400).json({
        success: false,
        error: 'connectionId、collection 和 operation 是必填项',
      });
      return;
    }

    // 获取连接信息
    const connection = await DatabaseConnection.findById(connectionId).select('+password');

    if (!connection) {
      res.status(404).json({
        success: false,
        error: '数据库连接不存在',
      });
      return;
    }

    // 检查权限
    if (connection.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权使用此数据库连接',
      });
      return;
    }

    if (connection.type !== 'mongodb') {
      res.status(400).json({
        success: false,
        error: '此接口仅支持 MongoDB，请使用 /query/sql 接口',
      });
      return;
    }

    // 执行查询
    const startTime = Date.now();
    let result: { success: boolean; data?: unknown; error?: string };

    try {
      result = await executeMongoQuery(connection, collection, operation, {
        filter,
        document,
        documents,
        update,
        pipeline,
        options,
      });
    } catch (execError) {
      result = {
        success: false,
        error: execError instanceof Error ? execError.message : String(execError),
      };
    }

    const executionTime = Date.now() - startTime;

    // 保存查询历史
    await new QueryHistory({
      name: queryName || `${operation} ${collection}`,
      databaseType: 'mongodb',
      connectionId: new Types.ObjectId(connectionId),
      query: JSON.stringify({ collection, operation, filter, document, update, pipeline }),
      queryType: getMongoQueryType(operation),
      status: result.success ? 'success' : 'error',
      resultMessage: result.error || '查询成功',
      executionTime,
      userId: new Types.ObjectId(userId),
    }).save();

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        meta: {
          executionTime,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
        meta: {
          executionTime,
        },
      });
    }
  } catch (error) {
    console.error('[Mongo Query Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '执行查询失败',
    });
  }
});

/**
 * @swagger
 * /api/database/connections/{id}/schema:
 *   get:
 *     summary: 获取数据库表结构
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 表结构
 */
router.get('/connections/:id/schema', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const connection = await DatabaseConnection.findById(id).select('+password');

    if (!connection) {
      res.status(404).json({
        success: false,
        error: '数据库连接不存在',
      });
      return;
    }

    // 检查权限
    if (connection.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权访问此数据库连接',
      });
      return;
    }

    let schema: unknown;

    switch (connection.type) {
      case 'mysql':
        schema = await getMySQLSchema(connection);
        break;
      case 'postgresql':
        schema = await getPgSchema(connection);
        break;
      case 'sqlite':
        schema = await getSQLiteSchema(connection, id as string);
        break;
      case 'mongodb':
        schema = await getMongoSchema(connection);
        break;
      default:
        res.status(400).json({
          success: false,
          error: `不支持的数据库类型: ${connection.type}`,
        });
        return;
    }

    res.json({
      success: true,
      data: schema,
    });
  } catch (error) {
    console.error('[Get Schema Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取表结构失败',
    });
  }
});

/**
 * @swagger
 * /api/database/connections/{id}/tables/{table}/data:
 *   get:
 *     summary: 获取表数据
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 表数据
 */
router.get('/connections/:id/tables/:table/data', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, table } = req.params;
    const userId = (req as unknown as { user: { userId: string } }).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 1000);

    const connection = await DatabaseConnection.findById(id).select('+password');

    if (!connection) {
      res.status(404).json({
        success: false,
        error: '数据库连接不存在',
      });
      return;
    }

    // 检查权限
    if (connection.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权访问此数据库连接',
      });
      return;
    }

    let data: { rows: unknown[]; total: number };

    switch (connection.type) {
      case 'mysql':
        data = await getMySQLTableData(connection, table as string, page, limit);
        break;
      case 'postgresql':
        data = await getPgTableData(connection, table as string, page, limit);
        break;
      case 'sqlite':
        data = await getSQLiteTableData(connection, id as string, table as string, page, limit);
        break;
      case 'mongodb':
        data = await getMongoCollectionData(connection, table as string, page, limit);
        break;
      default:
        res.status(400).json({
          success: false,
          error: `不支持的数据库类型: ${connection.type}`,
        });
        return;
    }

    res.json({
      success: true,
      data: {
        rows: data.rows,
        pagination: {
          page,
          limit,
          total: data.total,
          totalPages: Math.ceil(data.total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[Get Table Data Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取表数据失败',
    });
  }
});

/**
 * @swagger
 * /api/database/history:
 *   get:
 *     summary: 获取查询历史
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 查询历史列表
 */
router.get('/history', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as unknown as { user: { userId: string } }).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const databaseType = req.query.databaseType as string | undefined;

    const history = await QueryHistory.findByUser(userId, { page, limit, databaseType });
    const total = await QueryHistory.countDocuments({
      userId: new Types.ObjectId(userId),
      ...(databaseType && { databaseType }),
    });

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('[Get History Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取查询历史失败',
    });
  }
});

/**
 * @swagger
 * /api/database/history/favorites:
 *   get:
 *     summary: 获取收藏的查询
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 收藏查询列表
 */
router.get('/history/favorites', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const favorites = await QueryHistory.findFavorites(userId);

    res.json({
      success: true,
      data: favorites,
    });
  } catch (error) {
    console.error('[Get Favorites Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取收藏查询失败',
    });
  }
});

/**
 * @swagger
 * /api/database/history/{id}/favorite:
 *   post:
 *     summary: 收藏/取消收藏查询
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 操作成功
 */
router.post('/history/:id/favorite', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isFavorite } = req.body as { isFavorite: boolean };
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const history = await QueryHistory.findById(id);

    if (!history) {
      res.status(404).json({
        success: false,
        error: '查询历史不存在',
      });
      return;
    }

    // 检查权限
    if (history.userId.toString() !== userId) {
      res.status(403).json({
        success: false,
        error: '无权修改此查询历史',
      });
      return;
    }

    history.isFavorite = isFavorite;
    await history.save();

    res.json({
      success: true,
      message: isFavorite ? '收藏成功' : '取消收藏成功',
    });
  } catch (error) {
    console.error('[Favorite History Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '操作失败',
    });
  }
});

/**
 * @swagger
 * /api/database/history/statistics:
 *   get:
 *     summary: 获取查询统计
 *     tags: [数据库]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 统计信息
 */
router.get('/history/statistics', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as unknown as { user: { userId: string } }).user.userId;

    const stats = await QueryHistory.getStatistics(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('[Get Statistics Error]', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '获取统计信息失败',
    });
  }
});

// ==================== 辅助函数 ====================

/**
 * 测试数据库连接
 */
async function testConnection(
  connection: DatabaseConnectionDocument
): Promise<{ success: boolean; message: string; version?: string }> {
  try {
    switch (connection.type) {
      case 'mysql': {
        const conn = await mysql.createConnection({
          host: connection.host,
          port: connection.port || 3306,
          user: connection.username,
          password: connection.password,
          database: connection.database,
          connectTimeout: connection.connectTimeout || 10000,
          ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
        });
        const [rows] = await conn.execute('SELECT VERSION() as version');
        await conn.end();
        return {
          success: true,
          message: 'MySQL 连接成功',
          version: (rows as Array<{ version: string }>)[0]?.version,
        };
      }

      case 'postgresql': {
        const client = new PgClient({
          host: connection.host,
          port: connection.port || 5432,
          user: connection.username,
          password: connection.password,
          database: connection.database,
          ssl: connection.ssl ? { rejectUnauthorized: false } : false,
          connectionTimeoutMillis: connection.connectTimeout || 10000,
        });
        await client.connect();
        const result = await client.query('SELECT version()');
        await client.end();
        return {
          success: true,
          message: 'PostgreSQL 连接成功',
          version: result.rows[0]?.version?.split(' ')[1],
        };
      }

      case 'mongodb': {
        const uri = connection.connectionString ||
          `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port || 27017}/${connection.database}`;
        const client = new MongoClient(uri, {
          serverSelectionTimeoutMS: connection.connectTimeout || 10000,
        });
        await client.connect();
        const admin = client.db().admin();
        const info = await admin.serverInfo();
        await client.close();
        return {
          success: true,
          message: 'MongoDB 连接成功',
          version: info.version,
        };
      }

      case 'sqlite': {
        const db = await open({
          filename: connection.filePath!,
          driver: sqlite3.Database,
        });
        await db.get('SELECT sqlite_version() as version');
        await db.close();
        return {
          success: true,
          message: 'SQLite 连接成功',
          version: '3.x',
        };
      }

      default:
        return { success: false, message: '不支持的数据库类型' };
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '连接失败',
    };
  }
}

/**
 * 执行 MySQL 查询
 */
async function executeMySQLQuery(
  connection: DatabaseConnectionDocument,
  query: string
): Promise<{ success: boolean; data?: unknown; error?: string; affectedRows?: number }> {
  const conn = await mysql.createConnection({
    host: connection.host,
    port: connection.port || 3306,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    connectTimeout: connection.connectTimeout || 30000,
    ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const [results] = await conn.execute(query);

    if (Array.isArray(results)) {
      return { success: true, data: results };
    } else {
      return {
        success: true,
        data: [],
        affectedRows: (results as mysql.ResultSetHeader).affectedRows,
      };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await conn.end();
  }
}

/**
 * 执行 PostgreSQL 查询
 */
async function executePgQuery(
  connection: DatabaseConnectionDocument,
  query: string
): Promise<{ success: boolean; data?: unknown; error?: string; affectedRows?: number }> {
  const client = new PgClient({
    host: connection.host,
    port: connection.port || 5432,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: connection.connectTimeout || 30000,
  });

  try {
    await client.connect();
    const result = await client.query(query);
    return {
      success: true,
      data: result.rows,
      affectedRows: result.rowCount || undefined,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await client.end();
  }
}

/**
 * 执行 SQLite 查询
 */
async function executeSQLiteQuery(
  connection: DatabaseConnectionDocument,
  connectionId: string,
  query: string
): Promise<{ success: boolean; data?: unknown; error?: string; affectedRows?: number }> {
  let db: Database | undefined;

  try {
    // 复用或创建连接
    if (sqliteConnections.has(connectionId)) {
      db = sqliteConnections.get(connectionId);
    } else {
      db = await open({
        filename: connection.filePath!,
        driver: sqlite3.Database,
      });
      sqliteConnections.set(connectionId, db);
    }

    // 判断是 SELECT 还是其他操作
    const isSelect = query.trim().toUpperCase().startsWith('SELECT');

    if (isSelect) {
      const rows = await db!.all(query);
      return { success: true, data: rows };
    } else {
      const result = await db!.run(query);
      return {
        success: true,
        data: [],
        affectedRows: result.changes,
      };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

/**
 * 执行 MongoDB 查询
 */
async function executeMongoQuery(
  connection: DatabaseConnectionDocument,
  collection: string,
  operation: string,
  params: {
    filter?: Record<string, unknown>;
    document?: unknown;
    documents?: unknown[];
    update?: Record<string, unknown>;
    pipeline?: unknown[];
    options?: Record<string, unknown>;
  }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
  const uri = connection.connectionString ||
    `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port || 27017}/${connection.database}`;

  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: connection.connectTimeout || 30000,
  });

  try {
    await client.connect();
    const db = client.db(connection.database);
    const coll = db.collection(collection);

    let result: any;

    switch (operation) {
      case 'find':
        result = await coll.find(params.filter || {}, params.options || {}).toArray();
        break;
      case 'findOne':
        result = await coll.findOne(params.filter || {}, params.options || {});
        break;
      case 'insertOne':
        result = await coll.insertOne(params.document as Record<string, unknown>);
        break;
      case 'insertMany':
        result = await coll.insertMany(params.documents as Record<string, unknown>[]);
        break;
      case 'updateOne':
        result = await coll.updateOne(params.filter || {}, params.update || {});
        break;
      case 'updateMany':
        result = await coll.updateMany(params.filter || {}, params.update || {});
        break;
      case 'deleteOne':
        result = await coll.deleteOne(params.filter || {});
        break;
      case 'deleteMany':
        result = await coll.deleteMany(params.filter || {});
        break;
      case 'aggregate':
        result = await coll.aggregate(params.pipeline as any || []).toArray();
        break;
      default:
        return { success: false, error: `不支持的操作: ${operation}` };
    }

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  } finally {
    await client.close();
  }
}

/**
 * 获取 MySQL 表结构
 */
async function getMySQLSchema(connection: DatabaseConnectionDocument): Promise<unknown> {
  const conn = await mysql.createConnection({
    host: connection.host,
    port: connection.port || 3306,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const [tables] = await conn.execute(
      'SELECT TABLE_NAME as name, TABLE_COMMENT as comment FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?',
      [connection.database]
    );

    const schema = [];
    for (const table of tables as Array<{ name: string; comment: string }>) {
      const [columns] = await conn.execute(
        'SELECT COLUMN_NAME as name, DATA_TYPE as type, IS_NULLABLE as nullable, COLUMN_DEFAULT as defaultValue, COLUMN_COMMENT as comment FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?',
        [connection.database, table.name]
      );
      schema.push({
        name: table.name,
        comment: table.comment,
        columns,
      });
    }

    return schema;
  } finally {
    await conn.end();
  }
}

/**
 * 获取 PostgreSQL 表结构
 */
async function getPgSchema(connection: DatabaseConnectionDocument): Promise<unknown> {
  const client = new PgClient({
    host: connection.host,
    port: connection.port || 5432,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();

    const tablesResult = await client.query(
      `SELECT table_name as name FROM information_schema.tables WHERE table_schema = 'public'`
    );

    const schema = [];
    for (const table of tablesResult.rows) {
      const columnsResult = await client.query(
        `SELECT column_name as name, data_type as type, is_nullable as nullable, column_default as defaultValue FROM information_schema.columns WHERE table_name = $1`,
        [table.name]
      );
      schema.push({
        name: table.name,
        columns: columnsResult.rows,
      });
    }

    return schema;
  } finally {
    await client.end();
  }
}

/**
 * 获取 SQLite 表结构
 */
async function getSQLiteSchema(connection: DatabaseConnectionDocument, connectionId: string): Promise<unknown> {
  let db: Database | undefined;

  if (sqliteConnections.has(connectionId)) {
    db = sqliteConnections.get(connectionId);
  } else {
    db = await open({
      filename: connection.filePath!,
      driver: sqlite3.Database,
    });
    sqliteConnections.set(connectionId, db);
  }

  const tables = await db!.all("SELECT name FROM sqlite_master WHERE type='table'");

  const schema = [];
  for (const table of tables) {
    const columns = await db!.all(`PRAGMA table_info(${table.name})`);
    schema.push({
      name: table.name,
      columns: columns.map((col: { name: string; type: string; notnull: number; dflt_value: unknown }) => ({
        name: col.name,
        type: col.type,
        nullable: col.notnull === 0 ? 'YES' : 'NO',
        defaultValue: col.dflt_value,
      })),
    });
  }

  return schema;
}

/**
 * 获取 MongoDB 集合结构
 */
async function getMongoSchema(connection: DatabaseConnectionDocument): Promise<unknown> {
  const uri = connection.connectionString ||
    `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port || 27017}/${connection.database}`;

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(connection.database);
    const collections = await db.listCollections().toArray();

    return collections.map((col) => ({
      name: col.name,
      type: col.type,
    }));
  } finally {
    await client.close();
  }
}

/**
 * 获取 MySQL 表数据
 */
async function getMySQLTableData(
  connection: DatabaseConnectionDocument,
  table: string,
  page: number,
  limit: number
): Promise<{ rows: unknown[]; total: number }> {
  const conn = await mysql.createConnection({
    host: connection.host,
    port: connection.port || 3306,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const offset = (page - 1) * limit;
    const [countResult] = await conn.execute(`SELECT COUNT(*) as total FROM \`${table}\``);
    const total = (countResult as Array<{ total: number }>)[0].total;

    const [rows] = await conn.execute(`SELECT * FROM \`${table}\` LIMIT ? OFFSET ?`, [limit, offset]);

    return { rows: rows as unknown[], total };
  } finally {
    await conn.end();
  }
}

/**
 * 获取 PostgreSQL 表数据
 */
async function getPgTableData(
  connection: DatabaseConnectionDocument,
  table: string,
  page: number,
  limit: number
): Promise<{ rows: unknown[]; total: number }> {
  const client = new PgClient({
    host: connection.host,
    port: connection.port || 5432,
    user: connection.username,
    password: connection.password,
    database: connection.database,
    ssl: connection.ssl ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    const offset = (page - 1) * limit;

    const countResult = await client.query(`SELECT COUNT(*) as total FROM "${table}"`);
    const total = parseInt(countResult.rows[0].total);

    const result = await client.query(`SELECT * FROM "${table}" LIMIT $1 OFFSET $2`, [limit, offset]);

    return { rows: result.rows, total };
  } finally {
    await client.end();
  }
}

/**
 * 获取 SQLite 表数据
 */
async function getSQLiteTableData(
  connection: DatabaseConnectionDocument,
  connectionId: string,
  table: string,
  page: number,
  limit: number
): Promise<{ rows: unknown[]; total: number }> {
  let db: Database | undefined;

  if (sqliteConnections.has(connectionId)) {
    db = sqliteConnections.get(connectionId);
  } else {
    db = await open({
      filename: connection.filePath!,
      driver: sqlite3.Database,
    });
    sqliteConnections.set(connectionId, db);
  }

  const offset = (page - 1) * limit;
  const countResult = await db!.get(`SELECT COUNT(*) as total FROM "${table}"`);
  const total = countResult?.total || 0;

  const rows = await db!.all(`SELECT * FROM "${table}" LIMIT ? OFFSET ?`, [limit, offset]);

  return { rows, total };
}

/**
 * 获取 MongoDB 集合数据
 */
async function getMongoCollectionData(
  connection: DatabaseConnectionDocument,
  collection: string,
  page: number,
  limit: number
): Promise<{ rows: unknown[]; total: number }> {
  const uri = connection.connectionString ||
    `mongodb://${connection.username}:${connection.password}@${connection.host}:${connection.port || 27017}/${connection.database}`;

  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(connection.database);
    const coll = db.collection(collection);

    const total = await coll.countDocuments();
    const rows = await coll.find({}).skip((page - 1) * limit).limit(limit).toArray();

    return { rows, total };
  } finally {
    await client.close();
  }
}

/**
 * 获取 SQL 查询类型
 */
function getQueryType(query: string): 'select' | 'insert' | 'update' | 'delete' | 'create' | 'other' {
  const upper = query.trim().toUpperCase();
  if (upper.startsWith('SELECT')) return 'select';
  if (upper.startsWith('INSERT')) return 'insert';
  if (upper.startsWith('UPDATE')) return 'update';
  if (upper.startsWith('DELETE')) return 'delete';
  if (upper.startsWith('CREATE')) return 'create';
  return 'other';
}

/**
 * 获取 MongoDB 查询类型
 */
function getMongoQueryType(operation: string): 'select' | 'insert' | 'update' | 'delete' | 'create' | 'other' {
  switch (operation) {
    case 'find':
    case 'findOne':
    case 'aggregate':
      return 'select';
    case 'insertOne':
    case 'insertMany':
      return 'insert';
    case 'updateOne':
    case 'updateMany':
      return 'update';
    case 'deleteOne':
    case 'deleteMany':
      return 'delete';
    default:
      return 'other';
  }
}

export default router;
