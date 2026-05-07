import mongoose, { Schema, Document } from 'mongoose';

/**
 * 文件存储类型枚举
 */
export type StorageType = 'local' | 'cloud' | 'mock-cloud';

/**
 * 文件类型分类枚举
 */
export type FileCategory = 'image' | 'document' | 'video' | 'audio' | 'archive' | 'other';

/**
 * 文件文档接口（包含实例方法）
 */
export interface IFile extends Document {
  /** 原始文件名 */
  originalName: string;
  /** 存储文件名（唯一） */
  storedName: string;
  /** 文件路径（本地路径或云存储URL） */
  path: string;
  /** 文件大小（字节） */
  size: number;
  /** MIME 类型 */
  mimetype: string;
  /** 文件类型分类 */
  category: FileCategory;
  /** 存储类型 */
  storageType: StorageType;
  /** 上传者用户ID */
  userId?: string;
  /** 文件描述 */
  description?: string;
  /** 标签数组 */
  tags?: string[];
  /** 下载次数 */
  downloadCount: number;
  /** 是否公开访问 */
  isPublic: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 更新时间 */
  updatedAt: Date;
  /** 过期时间（可选） */
  expiresAt?: Date;

  // 实例方法
  formatSize(): string;
  isExpired(): boolean;
  incrementDownloadCount(): Promise<void>;
}

/**
 * 文件元数据模型 Schema
 */
const FileSchema: Schema<IFile> = new Schema(
  {
    originalName: {
      type: String,
      required: [true, '原始文件名不能为空'],
      trim: true,
      maxlength: [255, '文件名不能超过255个字符'],
    },
    storedName: {
      type: String,
      required: [true, '存储文件名不能为空'],
      unique: true,
      index: true,
    },
    path: {
      type: String,
      required: [true, '文件路径不能为空'],
    },
    size: {
      type: Number,
      required: [true, '文件大小不能为空'],
      min: [0, '文件大小不能为负数'],
    },
    mimetype: {
      type: String,
      required: [true, 'MIME类型不能为空'],
      index: true,
    },
    category: {
      type: String,
      enum: ['image', 'document', 'video', 'audio', 'archive', 'other'],
      default: 'other',
      index: true,
    },
    storageType: {
      type: String,
      enum: ['local', 'cloud', 'mock-cloud'],
      default: 'local',
      index: true,
    },
    userId: {
      type: String,
      index: true,
      sparse: true,
    },
    description: {
      type: String,
      maxlength: [500, '描述不能超过500个字符'],
      trim: true,
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [50, '标签不能超过50个字符'],
    }],
    downloadCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    isPublic: {
      type: Boolean,
      default: false,
      index: true,
    },
    expiresAt: {
      type: Date,
      index: true,
      sparse: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// 复合索引：用户ID + 创建时间（用于查询用户的文件列表）
FileSchema.index({ userId: 1, createdAt: -1 });

// 复合索引：分类 + 创建时间（用于按类型浏览文件）
FileSchema.index({ category: 1, createdAt: -1 });

// 文本索引：文件名和描述（用于搜索）
FileSchema.index({ originalName: 'text', description: 'text', tags: 'text' });

/**
 * 根据 MIME 类型获取文件分类
 */
FileSchema.statics.getCategoryFromMimetype = function (mimetype: string): FileCategory {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (
    mimetype === 'application/pdf' ||
    mimetype.includes('document') ||
    mimetype.includes('text/') ||
    mimetype === 'application/msword' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/vnd.ms-excel' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimetype === 'application/vnd.ms-powerpoint' ||
    mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ) {
    return 'document';
  }
  if (
    mimetype === 'application/zip' ||
    mimetype === 'application/x-rar-compressed' ||
    mimetype === 'application/x-7z-compressed' ||
    mimetype === 'application/gzip' ||
    mimetype === 'application/x-tar'
  ) {
    return 'archive';
  }
  return 'other';
};

/**
 * 格式化文件大小为人类可读格式
 */
FileSchema.methods.formatSize = function (): string {
  const bytes = this.size;
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

/**
 * 检查文件是否过期
 */
FileSchema.methods.isExpired = function (): boolean {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
};

/**
 * 增加下载计数
 */
FileSchema.methods.incrementDownloadCount = async function (): Promise<void> {
  this.downloadCount += 1;
  await this.save();
};

// 静态方法类型定义
interface IFileModel extends mongoose.Model<IFile> {
  getCategoryFromMimetype(mimetype: string): FileCategory;
}

// 创建模型
const FileModel = mongoose.model<IFile, IFileModel>('File', FileSchema);

export default FileModel;
