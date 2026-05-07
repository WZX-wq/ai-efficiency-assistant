import mongoose, { Schema, Model, Types } from 'mongoose';

// 团队成员角色
export enum TeamMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

// 团队状态
export enum TeamStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

// 团队设置接口
export interface ITeamSettings {
  allowPublicProjects: boolean;
  allowGuestAccess: boolean;
  defaultProjectVisibility: 'public' | 'team' | 'private';
  maxProjectsPerMember: number;
  maxStoragePerMember: number; // MB
  requireApprovalForJoin: boolean;
}

// 团队文档接口
export interface ITeamDocument extends mongoose.Document {
  name: string;
  description: string;
  avatar?: string;
  owner: Types.ObjectId;
  status: TeamStatus;
  settings: ITeamSettings;
  memberCount: number;
  projectCount: number;
  storageUsed: number; // MB
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 团队模型接口
export interface ITeamModel extends Model<ITeamDocument> {
  findByMember(userId: string): Promise<ITeamDocument[]>;
  findByOwner(userId: string): Promise<ITeamDocument[]>;
}

// 团队设置子模式
const TeamSettingsSchema: Schema<ITeamSettings> = new Schema({
  allowPublicProjects: {
    type: Boolean,
    default: false
  },
  allowGuestAccess: {
    type: Boolean,
    default: false
  },
  defaultProjectVisibility: {
    type: String,
    enum: ['public', 'team', 'private'],
    default: 'team'
  },
  maxProjectsPerMember: {
    type: Number,
    default: 10
  },
  maxStoragePerMember: {
    type: Number,
    default: 1024 // 1GB
  },
  requireApprovalForJoin: {
    type: Boolean,
    default: true
  }
}, { _id: false });

// 团队模式
const TeamSchema: Schema<ITeamDocument> = new Schema({
  name: {
    type: String,
    required: [true, '团队名称是必填项'],
    trim: true,
    minlength: [2, '团队名称长度至少为2位'],
    maxlength: [100, '团队名称长度不能超过100位']
  },
  description: {
    type: String,
    default: '',
    maxlength: [500, '团队描述长度不能超过500位']
  },
  avatar: {
    type: String,
    default: null
  },
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '团队所有者是必填项'],
    index: true
  },
  status: {
    type: String,
    enum: Object.values(TeamStatus),
    default: TeamStatus.ACTIVE
  },
  settings: {
    type: TeamSettingsSchema,
    default: () => ({})
  },
  memberCount: {
    type: Number,
    default: 1
  },
  projectCount: {
    type: Number,
    default: 0
  },
  storageUsed: {
    type: Number,
    default: 0
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: function(tags: string[]) {
        return tags.length <= 10;
      },
      message: '标签数量不能超过10个'
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: Record<string, any>) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// 索引
TeamSchema.index({ name: 'text', description: 'text' });
TeamSchema.index({ owner: 1 });
TeamSchema.index({ status: 1 });
TeamSchema.index({ createdAt: -1 });
TeamSchema.index({ tags: 1 });

// 静态方法：查找用户所属的团队
TeamSchema.statics.findByMember = async function(
  userId: string
): Promise<ITeamDocument[]> {
  const TeamMember = mongoose.model('TeamMember');
  const memberships = await TeamMember.find({ user: userId }).select('team');
  const teamIds = memberships.map((m: any) => m.team);
  return this.find({ _id: { $in: teamIds }, status: TeamStatus.ACTIVE });
};

// 静态方法：查找用户拥有的团队
TeamSchema.statics.findByOwner = async function(
  userId: string
): Promise<ITeamDocument[]> {
  return this.find({ owner: userId, status: TeamStatus.ACTIVE });
};

// 实例方法：更新成员数量
TeamSchema.methods.updateMemberCount = async function(): Promise<void> {
  const TeamMember = mongoose.model('TeamMember');
  const count = await TeamMember.countDocuments({ team: this._id });
  this.memberCount = count;
  await this.save();
};

// 实例方法：检查用户是否是所有者
TeamSchema.methods.isOwner = function(userId: string): boolean {
  return this.owner.toString() === userId;
};

// 创建并导出团队模型
const Team: ITeamModel = mongoose.model<ITeamDocument, ITeamModel>('Team', TeamSchema);

export default Team;
