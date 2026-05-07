import mongoose, { Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument, IUserSettings, UserRole } from '../types/user';

// 用户设置子模式
const UserSettingsSchema: Schema<IUserSettings> = new Schema({
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'auto'
  },
  language: {
    type: String,
    default: 'zh-CN'
  },
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    desktop: { type: Boolean, default: true }
  },
  privacy: {
    showProfile: { type: Boolean, default: true },
    showActivity: { type: Boolean, default: true }
  }
}, { _id: false });

// 用户模式
const UserSchema: Schema<IUserDocument> = new Schema({
  email: {
    type: String,
    required: [true, '邮箱地址是必填项'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      '请输入有效的邮箱地址'
    ]
  },
  password: {
    type: String,
    required: [true, '密码是必填项'],
    minlength: [6, '密码长度至少为6位'],
    select: false // 默认查询不返回密码字段
  },
  name: {
    type: String,
    required: [true, '用户名是必填项'],
    trim: true,
    minlength: [2, '用户名长度至少为2位'],
    maxlength: [50, '用户名长度不能超过50位']
  },
  avatar: {
    type: String,
    default: null
  },
  role: {
    type: String,
    enum: Object.values(UserRole),
    default: UserRole.USER
  },
  settings: {
    type: UserSettingsSchema,
    default: () => ({})
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLoginAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true, // 自动添加 createdAt 和 updatedAt
  toJSON: {
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      delete ret.password;
      return ret;
    }
  }
});

// 索引
UserSchema.index({ email: 1 });
UserSchema.index({ role: 1 });
UserSchema.index({ createdAt: -1 });

// 密码加密中间件
UserSchema.pre<IUserDocument>('save', async function(next) {
  // 只有在密码被修改时才进行加密
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// 比较密码方法
UserSchema.methods.comparePassword = async function(
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('密码比较失败');
  }
};

// 更新最后登录时间
UserSchema.methods.updateLastLogin = async function(): Promise<void> {
  this.lastLoginAt = new Date();
  await this.save();
};

// 静态方法：根据邮箱查找用户（包含密码字段）
UserSchema.statics.findByEmailWithPassword = async function(
  email: string
): Promise<IUserDocument | null> {
  return this.findOne({ email }).select('+password');
};

// 创建并导出用户模型
const User: Model<IUserDocument> = mongoose.model<IUserDocument>('User', UserSchema);

export default User;
