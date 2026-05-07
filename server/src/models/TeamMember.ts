import mongoose, { Schema, Model, Types } from 'mongoose';

// 成员状态
export enum MemberStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  REJECTED = 'rejected'
}

// 成员权限
export enum MemberPermission {
  VIEW = 'view',
  EDIT = 'edit',
  ADMIN = 'admin',
  OWNER = 'owner'
}

// 邀请状态
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled'
}

// 团队成员文档接口
export interface ITeamMemberDocument extends mongoose.Document {
  team: Types.ObjectId;
  user: Types.ObjectId;
  role: MemberPermission;
  status: MemberStatus;
  invitedBy?: Types.ObjectId;
  joinedAt?: Date;
  lastActiveAt?: Date;
  permissions: {
    canCreateProject: boolean;
    canDeleteProject: boolean;
    canInviteMember: boolean;
    canRemoveMember: boolean;
    canManageSettings: boolean;
    canAccessAllFiles: boolean;
  };
  notificationSettings: {
    emailOnMention: boolean;
    emailOnInvite: boolean;
    emailOnProjectUpdate: boolean;
    pushOnMention: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

// 团队成员模型接口
export interface ITeamMemberModel extends Model<ITeamMemberDocument> {
  findByTeam(teamId: string): Promise<ITeamMemberDocument[]>;
  findByUser(userId: string): Promise<ITeamMemberDocument[]>;
  findByTeamAndUser(teamId: string, userId: string): Promise<ITeamMemberDocument | null>;
  isMember(teamId: string, userId: string): Promise<boolean>;
  hasPermission(teamId: string, userId: string, permission: keyof ITeamMemberDocument['permissions']): Promise<boolean>;
}

// 权限配置子模式
const PermissionsSchema = new Schema({
  canCreateProject: { type: Boolean, default: false },
  canDeleteProject: { type: Boolean, default: false },
  canInviteMember: { type: Boolean, default: false },
  canRemoveMember: { type: Boolean, default: false },
  canManageSettings: { type: Boolean, default: false },
  canAccessAllFiles: { type: Boolean, default: false }
}, { _id: false });

// 通知设置子模式
const NotificationSettingsSchema = new Schema({
  emailOnMention: { type: Boolean, default: true },
  emailOnInvite: { type: Boolean, default: true },
  emailOnProjectUpdate: { type: Boolean, default: true },
  pushOnMention: { type: Boolean, default: true }
}, { _id: false });

// 团队成员模式
const TeamMemberSchema: Schema<ITeamMemberDocument> = new Schema({
  team: {
    type: Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, '团队ID是必填项'],
    index: true
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '用户ID是必填项'],
    index: true
  },
  role: {
    type: String,
    enum: Object.values(MemberPermission),
    default: MemberPermission.VIEW
  },
  status: {
    type: String,
    enum: Object.values(MemberStatus),
    default: MemberStatus.PENDING
  },
  invitedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  joinedAt: {
    type: Date,
    default: null
  },
  lastActiveAt: {
    type: Date,
    default: null
  },
  permissions: {
    type: PermissionsSchema,
    default: function() {
      // 根据角色设置默认权限
      const role = (this as any).role || MemberPermission.VIEW;
      return getDefaultPermissions(role);
    }
  },
  notificationSettings: {
    type: NotificationSettingsSchema,
    default: () => ({
      emailOnMention: true,
      emailOnInvite: true,
      emailOnProjectUpdate: true,
      pushOnMention: true
    })
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

// 获取默认权限配置
function getDefaultPermissions(role: MemberPermission) {
  const permissions = {
    canCreateProject: false,
    canDeleteProject: false,
    canInviteMember: false,
    canRemoveMember: false,
    canManageSettings: false,
    canAccessAllFiles: false
  };

  switch (role) {
    case MemberPermission.OWNER:
      return {
        canCreateProject: true,
        canDeleteProject: true,
        canInviteMember: true,
        canRemoveMember: true,
        canManageSettings: true,
        canAccessAllFiles: true
      };
    case MemberPermission.ADMIN:
      return {
        canCreateProject: true,
        canDeleteProject: true,
        canInviteMember: true,
        canRemoveMember: true,
        canManageSettings: true,
        canAccessAllFiles: true
      };
    case MemberPermission.EDIT:
      return {
        canCreateProject: true,
        canDeleteProject: false,
        canInviteMember: false,
        canRemoveMember: false,
        canManageSettings: false,
        canAccessAllFiles: true
      };
    case MemberPermission.VIEW:
    default:
      return permissions;
  }
}

// 复合索引：确保一个用户在一个团队中只有一个成员记录
TeamMemberSchema.index({ team: 1, user: 1 }, { unique: true });
TeamMemberSchema.index({ status: 1 });
TeamMemberSchema.index({ role: 1 });
TeamMemberSchema.index({ joinedAt: -1 });

// 静态方法：查找团队的所有成员
TeamMemberSchema.statics.findByTeam = async function(
  teamId: string
): Promise<ITeamMemberDocument[]> {
  return this.find({ team: teamId })
    .populate('user', 'name email avatar')
    .populate('invitedBy', 'name email')
    .sort({ role: 1, joinedAt: -1 });
};

// 静态方法：查找用户的所有团队 membership
TeamMemberSchema.statics.findByUser = async function(
  userId: string
): Promise<ITeamMemberDocument[]> {
  return this.find({ user: userId })
    .populate('team', 'name description avatar owner')
    .sort({ joinedAt: -1 });
};

// 静态方法：查找特定团队和用户的成员记录
TeamMemberSchema.statics.findByTeamAndUser = async function(
  teamId: string,
  userId: string
): Promise<ITeamMemberDocument | null> {
  return this.findOne({ team: teamId, user: userId });
};

// 静态方法：检查用户是否是团队成员
TeamMemberSchema.statics.isMember = async function(
  teamId: string,
  userId: string
): Promise<boolean> {
  const member = await this.findOne({
    team: teamId,
    user: userId,
    status: MemberStatus.ACTIVE
  });
  return !!member;
};

// 静态方法：检查用户是否有特定权限
TeamMemberSchema.statics.hasPermission = async function(
  teamId: string,
  userId: string,
  permission: keyof ITeamMemberDocument['permissions']
): Promise<boolean> {
  const member = await this.findOne({
    team: teamId,
    user: userId,
    status: MemberStatus.ACTIVE
  });

  if (!member) return false;
  if (member.role === MemberPermission.OWNER) return true;

  return member.permissions[permission] === true;
};

// 实例方法：接受邀请
TeamMemberSchema.methods.acceptInvitation = async function(): Promise<void> {
  this.status = MemberStatus.ACTIVE;
  this.joinedAt = new Date();
  await this.save();
};

// 实例方法：更新最后活动时间
TeamMemberSchema.methods.updateLastActive = async function(): Promise<void> {
  this.lastActiveAt = new Date();
  await this.save();
};

// 实例方法：更新角色和权限
TeamMemberSchema.methods.updateRole = async function(
  role: MemberPermission
): Promise<void> {
  this.role = role;
  this.permissions = getDefaultPermissions(role);
  await this.save();
};

// 实例方法：检查是否有特定权限
TeamMemberSchema.methods.hasPermission = function(
  permission: keyof ITeamMemberDocument['permissions']
): boolean {
  if (this.role === MemberPermission.OWNER) return true;
  return this.permissions[permission] === true;
};

// 创建并导出团队成员模型
const TeamMember: ITeamMemberModel = mongoose.model<ITeamMemberDocument, ITeamMemberModel>('TeamMember', TeamMemberSchema);

export default TeamMember;
