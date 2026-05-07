import mongoose, { Schema, Model } from 'mongoose';

/**
 * 支持的数据库类型
 */
export const SupportedDatabases = ['mysql', 'postgresql', 'mongodb', 'sqlite'] as const;

export type DatabaseType = (typeof SupportedDatabases)[number];

/**
 * 数据库连接配置接口
 */
export interface IDatabaseConnection {
  /** 连接名称 */
  name: string;
  /** 数据库类型 */
  type: DatabaseType;
  /** 主机地址 */
  host?: string;
  /** 端口号 */
  port?: number;
  /** 数据库名称 */
  database: string;
  /** 用户名 */
  username?: string;
  /** 密码（加密存储） */
  password?: string;
  /** 连接字符串（用于MongoDB） */
  connectionString?: string;
  /** 文件路径（用于SQLite） */
  filePath?: string;
  /** 是否使用SSL */
  ssl?: boolean;
  /** 连接超时时间（毫秒） */
  connectTimeout?: number;
}

/**
 * 查询历史文档接口
 */
export interface IQueryHistoryDocument extends mongoose.Document {
  /** 查询名称/描述 */
  name: string;
  /** 数据库类型 */
  databaseType: DatabaseType;
  /** 数据库连接ID */
  connectionId: mongoose.Types.ObjectId;
  /** 执行的查询语句 */
  query: string;
  /** 查询类型: select, insert, update, delete, create, other */
  queryType: 'select' | 'insert' | 'update' | 'delete' | 'create' | 'other';
  /** 执行结果状态 */
  status: 'success' | 'error';
  /** 执行结果消息 */
  resultMessage?: string;
  /** 影响的行数 */
  affectedRows?: number;
  /** 执行时长（毫秒） */
  executionTime: number;
  /** 所属用户ID */
  userId: mongoose.Types.ObjectId;
  /** 是否收藏 */
  isFavorite: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 数据库连接文档接口
 */
export interface IDatabaseConnectionDocument extends mongoose.Document {
  /** 连接名称 */
  name: string;
  /** 数据库类型 */
  type: DatabaseType;
  /** 主机地址 */
  host?: string;
  /** 端口号 */
  port?: number;
  /** 数据库名称 */
  database: string;
  /** 用户名 */
  username?: string;
  /** 密码（加密存储） */
  password?: string;
  /** 连接字符串（用于MongoDB） */
  connectionString?: string;
  /** 文件路径（用于SQLite） */
  filePath?: string;
  /** 是否使用SSL */
  ssl: boolean;
  /** 连接超时时间（毫秒） */
  connectTimeout: number;
  /** 所属用户ID */
  userId: mongoose.Types.ObjectId;
  /** 是否活跃 */
  isActive: boolean;
  /** 最后连接时间 */
  lastConnectedAt?: Date;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 查询历史模型接口
 */
interface IQueryHistoryModel extends Model<IQueryHistoryDocument> {
  findByUser(userId: string, options?: { page?: number; limit?: number; databaseType?: string }): Promise<IQueryHistoryDocument[]>;
  findFavorites(userId: string): Promise<IQueryHistoryDocument[]>;
  getRecentQueries(userId: string, limit?: number): Promise<IQueryHistoryDocument[]>;
  getStatistics(userId: string): Promise<{ total: number; success: number; error: number; byType: Record<string, number> }>;
}

/**
 * 数据库连接模型接口
 */
interface IDatabaseConnectionModel extends Model<IDatabaseConnectionDocument> {
  findByUser(userId: string): Promise<IDatabaseConnectionDocument[]>;
  findActiveByUser(userId: string): Promise<IDatabaseConnectionDocument[]>;
}

// ==================== 查询历史模式 ====================

const QueryHistorySchema: Schema<IQueryHistoryDocument> = new Schema(
  {
    name: {
      type: String,
      required: [true, '查询名称是必填项'],
      trim: true,
      maxlength: [200, '查询名称长度不能超过200个字符'],
    },
    databaseType: {
      type: String,
      required: [true, '数据库类型是必填项'],
      enum: {
        values: SupportedDatabases,
        message: '不支持的数据库类型',
      },
    },
    connectionId: {
      type: Schema.Types.ObjectId,
      ref: 'DatabaseConnection',
      required: [true, '连接ID是必填项'],
      index: true,
    },
    query: {
      type: String,
      required: [true, '查询语句是必填项'],
      maxlength: [50000, '查询语句长度不能超过50000个字符'],
    },
    queryType: {
      type: String,
      required: [true, '查询类型是必填项'],
      enum: ['select', 'insert', 'update', 'delete', 'create', 'other'],
      default: 'other',
    },
    status: {
      type: String,
      required: [true, '执行状态是必填项'],
      enum: ['success', 'error'],
      index: true,
    },
    resultMessage: {
      type: String,
      maxlength: [2000, '结果消息长度不能超过2000个字符'],
      default: null,
    },
    affectedRows: {
      type: Number,
      min: 0,
      default: null,
    },
    executionTime: {
      type: Number,
      required: [true, '执行时长是必填项'],
      min: 0,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户ID是必填项'],
      index: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// 索引
QueryHistorySchema.index({ userId: 1, createdAt: -1 });
QueryHistorySchema.index({ userId: 1, databaseType: 1 });
QueryHistorySchema.index({ userId: 1, isFavorite: 1 });
QueryHistorySchema.index({ connectionId: 1, createdAt: -1 });

// 静态方法：查找用户的查询历史
QueryHistorySchema.statics.findByUser = async function (
  userId: string,
  options: { page?: number; limit?: number; databaseType?: string } = {}
): Promise<IQueryHistoryDocument[]> {
  const { page = 1, limit = 20, databaseType } = options;
  const query: Record<string, unknown> = { userId };

  if (databaseType) {
    query.databaseType = databaseType;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();
};

// 静态方法：查找收藏的查询
QueryHistorySchema.statics.findFavorites = async function (userId: string): Promise<IQueryHistoryDocument[]> {
  return this.find({ userId, isFavorite: true })
    .sort({ createdAt: -1 })
    .exec();
};

// 静态方法：获取最近的查询
QueryHistorySchema.statics.getRecentQueries = async function (
  userId: string,
  limit: number = 10
): Promise<IQueryHistoryDocument[]> {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .exec();
};

// 静态方法：获取统计信息
QueryHistorySchema.statics.getStatistics = async function (
  userId: string
): Promise<{ total: number; success: number; error: number; byType: Record<string, number> }> {
  const stats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        success: { $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] } },
        error: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
      },
    },
  ]);

  const byTypeStats = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$queryType',
        count: { $sum: 1 },
      },
    },
  ]);

  const byType: Record<string, number> = {};
  byTypeStats.forEach((item) => {
    byType[item._id] = item.count;
  });

  const result = stats[0] || { total: 0, success: 0, error: 0 };
  return {
    total: result.total,
    success: result.success,
    error: result.error,
    byType,
  };
};

// ==================== 数据库连接模式 ====================

const DatabaseConnectionSchema: Schema<IDatabaseConnectionDocument> = new Schema(
  {
    name: {
      type: String,
      required: [true, '连接名称是必填项'],
      trim: true,
      maxlength: [100, '连接名称长度不能超过100个字符'],
    },
    type: {
      type: String,
      required: [true, '数据库类型是必填项'],
      enum: {
        values: SupportedDatabases,
        message: '不支持的数据库类型',
      },
    },
    host: {
      type: String,
      maxlength: [500, '主机地址长度不能超过500个字符'],
      default: null,
    },
    port: {
      type: Number,
      min: 1,
      max: 65535,
      default: null,
    },
    database: {
      type: String,
      required: [true, '数据库名称是必填项'],
      maxlength: [100, '数据库名称长度不能超过100个字符'],
    },
    username: {
      type: String,
      maxlength: [100, '用户名长度不能超过100个字符'],
      default: null,
    },
    password: {
      type: String,
      maxlength: [500, '密码长度不能超过500个字符'],
      default: null,
      select: false, // 默认不返回密码
    },
    connectionString: {
      type: String,
      maxlength: [1000, '连接字符串长度不能超过1000个字符'],
      default: null,
    },
    filePath: {
      type: String,
      maxlength: [500, '文件路径长度不能超过500个字符'],
      default: null,
    },
    ssl: {
      type: Boolean,
      default: false,
    },
    connectTimeout: {
      type: Number,
      default: 30000,
      min: 1000,
      max: 300000,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户ID是必填项'],
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastConnectedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        delete ret.password; // 确保不返回密码
        return ret;
      },
    },
  }
);

// 索引
DatabaseConnectionSchema.index({ userId: 1, createdAt: -1 });
DatabaseConnectionSchema.index({ userId: 1, type: 1 });
DatabaseConnectionSchema.index({ userId: 1, isActive: 1 });

// 静态方法：查找用户的数据库连接
DatabaseConnectionSchema.statics.findByUser = async function (
  userId: string
): Promise<IDatabaseConnectionDocument[]> {
  return this.find({ userId }).sort({ createdAt: -1 }).exec();
};

// 静态方法：查找用户活跃的数据库连接
DatabaseConnectionSchema.statics.findActiveByUser = async function (
  userId: string
): Promise<IDatabaseConnectionDocument[]> {
  return this.find({ userId, isActive: true }).sort({ lastConnectedAt: -1 }).exec();
};

// 创建并导出模型
const QueryHistory: IQueryHistoryModel = mongoose.model<IQueryHistoryDocument, IQueryHistoryModel>(
  'QueryHistory',
  QueryHistorySchema
);

const DatabaseConnection: IDatabaseConnectionModel = mongoose.model<
  IDatabaseConnectionDocument,
  IDatabaseConnectionModel
>('DatabaseConnection', DatabaseConnectionSchema);

export { QueryHistory, DatabaseConnection };
export default QueryHistory;
