import mongoose from 'mongoose';

/** 用户角色 */
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest'
}

/** 用户设置 */
export interface IUserSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
  };
  privacy: {
    showProfile: boolean;
    showActivity: boolean;
  };
}

/** 用户文档接口 */
export interface IUserDocument extends mongoose.Document {
  email: string;
  password: string;
  name: string;
  avatar?: string;
  role: UserRole;
  settings: IUserSettings;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;

  // 实例方法
  comparePassword(candidatePassword: string): Promise<boolean>;
  updateLastLogin(): Promise<void>;
}

/** 用户模型接口 */
export interface IUserModel extends mongoose.Model<IUserDocument> {
  findByEmailWithPassword(email: string): Promise<IUserDocument | null>;
}
