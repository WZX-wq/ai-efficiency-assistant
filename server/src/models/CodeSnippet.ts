import mongoose, { Schema, Model } from 'mongoose';

/**
 * 支持的编程语言
 */
export const SupportedLanguages = [
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'c',
  'csharp',
  'go',
  'rust',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'sql',
  'html',
  'css',
] as const;

export type ProgrammingLanguage = (typeof SupportedLanguages)[number];

/**
 * 代码片段文档接口
 */
export interface ICodeSnippetDocument extends mongoose.Document {
  /** 代码片段标题 */
  title: string;
  /** 代码内容 */
  code: string;
  /** 编程语言 */
  language: ProgrammingLanguage;
  /** 代码描述 */
  description?: string;
  /** 标签 */
  tags: string[];
  /** 所属用户ID */
  userId: mongoose.Types.ObjectId;
  /** 是否公开 */
  isPublic: boolean;
  /** 使用次数 */
  usageCount: number;
  /** 收藏次数 */
  favoriteCount: number;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
}

/**
 * 代码片段模型接口
 */
interface ICodeSnippetModel extends Model<ICodeSnippetDocument> {
  findByUser(userId: string, options?: { page?: number; limit?: number; language?: string }): Promise<ICodeSnippetDocument[]>;
  findPublic(options?: { page?: number; limit?: number; language?: string; search?: string }): Promise<ICodeSnippetDocument[]>;
  searchByTags(tags: string[], options?: { page?: number; limit?: number }): Promise<ICodeSnippetDocument[]>;
  incrementUsage(id: string): Promise<void>;
}

/**
 * 代码片段模式
 */
const CodeSnippetSchema: Schema<ICodeSnippetDocument> = new Schema(
  {
    title: {
      type: String,
      required: [true, '代码片段标题是必填项'],
      trim: true,
      maxlength: [200, '标题长度不能超过200个字符'],
    },
    code: {
      type: String,
      required: [true, '代码内容是必填项'],
      maxlength: [100000, '代码长度不能超过100000个字符'],
    },
    language: {
      type: String,
      required: [true, '编程语言是必填项'],
      enum: {
        values: SupportedLanguages,
        message: '不支持的编程语言',
      },
    },
    description: {
      type: String,
      maxlength: [2000, '描述长度不能超过2000个字符'],
      default: null,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function (tags: string[]) {
          return tags.length <= 20 && tags.every((tag) => tag.length <= 50);
        },
        message: '标签数量不能超过20个，每个标签长度不能超过50个字符',
      },
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '用户ID是必填项'],
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    favoriteCount: {
      type: Number,
      default: 0,
      min: 0,
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
CodeSnippetSchema.index({ userId: 1, createdAt: -1 });
CodeSnippetSchema.index({ language: 1 });
CodeSnippetSchema.index({ tags: 1 });
CodeSnippetSchema.index({ isPublic: 1, createdAt: -1 });
CodeSnippetSchema.index({ title: 'text', description: 'text', code: 'text' });

// 静态方法：查找用户的代码片段
CodeSnippetSchema.statics.findByUser = async function (
  userId: string,
  options: { page?: number; limit?: number; language?: string } = {}
): Promise<ICodeSnippetDocument[]> {
  const { page = 1, limit = 20, language } = options;
  const query: Record<string, unknown> = { userId };
  
  if (language) {
    query.language = language;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();
};

// 静态方法：查找公开的代码片段
CodeSnippetSchema.statics.findPublic = async function (
  options: { page?: number; limit?: number; language?: string; search?: string } = {}
): Promise<ICodeSnippetDocument[]> {
  const { page = 1, limit = 20, language, search } = options;
  const query: Record<string, unknown> = { isPublic: true };

  if (language) {
    query.language = language;
  }

  if (search) {
    query.$text = { $search: search };
  }

  return this.find(query)
    .sort({ favoriteCount: -1, usageCount: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();
};

// 静态方法：按标签搜索
CodeSnippetSchema.statics.searchByTags = async function (
  tags: string[],
  options: { page?: number; limit?: number } = {}
): Promise<ICodeSnippetDocument[]> {
  const { page = 1, limit = 20 } = options;

  return this.find({
    tags: { $in: tags },
    isPublic: true,
  })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .exec();
};

// 静态方法：增加使用次数
CodeSnippetSchema.statics.incrementUsage = async function (id: string): Promise<void> {
  await this.findByIdAndUpdate(id, { $inc: { usageCount: 1 } });
};

// 创建并导出代码片段模型
const CodeSnippet: ICodeSnippetModel = mongoose.model<ICodeSnippetDocument, ICodeSnippetModel>(
  'CodeSnippet',
  CodeSnippetSchema
);

export default CodeSnippet;
