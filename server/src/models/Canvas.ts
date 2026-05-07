import mongoose, { Schema, Model, Document } from 'mongoose';

// ==================== 画布元素类型 ====================

/** 元素类型 */
export type CanvasElementType = 
  | 'rectangle' 
  | 'circle' 
  | 'ellipse' 
  | 'line' 
  | 'arrow' 
  | 'text' 
  | 'note' 
  | 'image' 
  | 'sticky' 
  | 'shape' 
  | 'freehand'
  | 'connector'
  | 'frame'
  | 'group';

/** 元素样式 */
export interface IElementStyle {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: 'normal' | 'bold' | 'lighter';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  textDecoration?: 'none' | 'underline' | 'line-through';
  backgroundColor?: string;
  borderRadius?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };
}

/** 点坐标 */
export interface IPoint {
  x: number;
  y: number;
}

/** 画布元素 */
export interface ICanvasElement {
  id: string;
  type: CanvasElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  style?: IElementStyle;
  content?: string;
  src?: string; // 图片URL
  points?: IPoint[]; // 自由绘制或线条的点
  children?: string[]; // 子元素ID（用于group）
  parentId?: string; // 父元素ID
  locked?: boolean;
  visible?: boolean;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

/** 画布协作用户 */
export interface ICollaborator {
  userId: string;
  userName: string;
  userAvatar?: string;
  color: string;
  cursor?: {
    x: number;
    y: number;
  };
  lastActive: Date;
  permissions: 'view' | 'comment' | 'edit' | 'admin';
}

/** 画布权限设置 */
export interface IPermissionSettings {
  visibility: 'private' | 'team' | 'public';
  defaultRole: 'viewer' | 'commenter' | 'editor';
  allowExport: boolean;
  allowDuplicate: boolean;
  allowComments: boolean;
}

/** 画布版本历史 */
export interface ICanvasVersion {
  id: string;
  name: string;
  elements: ICanvasElement[];
  createdAt: Date;
  createdBy: string;
  description?: string;
}

/** 画布评论 */
export interface ICanvasComment {
  id: string;
  elementId?: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  position?: IPoint;
  replies?: ICanvasComment[];
  resolved?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// ==================== Mongoose 文档接口 ====================

export interface ICanvasDocument extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  ownerId: string;
  elements: ICanvasElement[];
  collaborators: ICollaborator[];
  permissions: IPermissionSettings;
  versions: ICanvasVersion[];
  comments: ICanvasComment[];
  thumbnail?: string;
  tags: string[];
  isArchived: boolean;
  isTemplate: boolean;
  templateCategory?: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  gridSettings?: {
    enabled: boolean;
    size: number;
    color: string;
    snapToGrid: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
  // 实例方法
  addCollaborator(collaborator: Omit<ICollaborator, 'lastActive'>): Promise<void>;
  removeCollaborator(userId: string): Promise<void>;
  addElement(element: ICanvasElement): Promise<void>;
  updateElement(elementId: string, updates: Partial<ICanvasElement>): Promise<boolean>;
  removeElement(elementId: string): Promise<boolean>;
  createVersion(versionData: Omit<ICanvasVersion, 'id' | 'createdAt' | 'elements'>): Promise<string>;
  restoreVersion(versionId: string): Promise<boolean>;
  addComment(comment: Omit<ICanvasComment, 'id' | 'createdAt'>): Promise<string>;
  hasPermission(userId: string, requiredPermission: 'view' | 'comment' | 'edit' | 'admin'): boolean;
}

// ==================== Schema 定义 ====================

const ElementStyleSchema: Schema<IElementStyle> = new Schema({
  fill: String,
  stroke: String,
  strokeWidth: Number,
  strokeStyle: { type: String, enum: ['solid', 'dashed', 'dotted'] },
  opacity: Number,
  fontSize: Number,
  fontFamily: String,
  fontWeight: { type: String, enum: ['normal', 'bold', 'lighter'] },
  fontStyle: { type: String, enum: ['normal', 'italic'] },
  textAlign: { type: String, enum: ['left', 'center', 'right'] },
  textDecoration: { type: String, enum: ['none', 'underline', 'line-through'] },
  backgroundColor: String,
  borderRadius: Number,
  shadow: {
    color: String,
    blur: Number,
    offsetX: Number,
    offsetY: Number
  }
}, { _id: false });

const PointSchema: Schema<IPoint> = new Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true }
}, { _id: false });

const CanvasElementSchema: Schema<ICanvasElement> = new Schema({
  id: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: [
      'rectangle', 'circle', 'ellipse', 'line', 'arrow', 'text', 
      'note', 'image', 'sticky', 'shape', 'freehand', 
      'connector', 'frame', 'group'
    ]
  },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
  rotation: { type: Number, default: 0 },
  style: ElementStyleSchema,
  content: String,
  src: String,
  points: [PointSchema],
  children: [String],
  parentId: String,
  locked: { type: Boolean, default: false },
  visible: { type: Boolean, default: true },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: String
}, { _id: false });

const CollaboratorSchema: Schema<ICollaborator> = new Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: String,
  color: { type: String, required: true },
  cursor: {
    x: Number,
    y: Number
  },
  lastActive: { type: Date, default: Date.now },
  permissions: {
    type: String,
    enum: ['view', 'comment', 'edit', 'admin'],
    default: 'view'
  }
}, { _id: false });

const PermissionSettingsSchema: Schema<IPermissionSettings> = new Schema({
  visibility: {
    type: String,
    enum: ['private', 'team', 'public'],
    default: 'private'
  },
  defaultRole: {
    type: String,
    enum: ['viewer', 'commenter', 'editor'],
    default: 'viewer'
  },
  allowExport: { type: Boolean, default: true },
  allowDuplicate: { type: Boolean, default: true },
  allowComments: { type: Boolean, default: true }
}, { _id: false });

const CanvasVersionSchema: Schema<ICanvasVersion> = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  elements: [CanvasElementSchema],
  createdAt: { type: Date, default: Date.now },
  createdBy: { type: String, required: true },
  description: String
}, { _id: false });

const CanvasCommentSchema: Schema<ICanvasComment> = new Schema({
  id: { type: String, required: true },
  elementId: String,
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: String,
  content: { type: String, required: true },
  position: PointSchema,
  replies: [{
    id: String,
    userId: String,
    userName: String,
    userAvatar: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
  }],
  resolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date
}, { _id: false });

const CanvasSchema: Schema<ICanvasDocument> = new Schema({
  title: {
    type: String,
    required: [true, '画布标题是必填项'],
    trim: true,
    maxlength: [200, '标题长度不能超过200个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [2000, '描述长度不能超过2000个字符']
  },
  ownerId: {
    type: String,
    required: [true, '所有者ID是必填项'],
    index: true
  },
  elements: {
    type: [CanvasElementSchema],
    default: []
  },
  collaborators: {
    type: [CollaboratorSchema],
    default: []
  },
  permissions: {
    type: PermissionSettingsSchema,
    default: () => ({
      visibility: 'private',
      defaultRole: 'viewer',
      allowExport: true,
      allowDuplicate: true,
      allowComments: true
    })
  },
  versions: {
    type: [CanvasVersionSchema],
    default: []
  },
  comments: {
    type: [CanvasCommentSchema],
    default: []
  },
  thumbnail: String,
  tags: {
    type: [String],
    default: []
  },
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  },
  isTemplate: {
    type: Boolean,
    default: false,
    index: true
  },
  templateCategory: String,
  canvasWidth: {
    type: Number,
    default: 1920
  },
  canvasHeight: {
    type: Number,
    default: 1080
  },
  backgroundColor: {
    type: String,
    default: '#ffffff'
  },
  gridSettings: {
    enabled: { type: Boolean, default: false },
    size: { type: Number, default: 20 },
    color: { type: String, default: '#e0e0e0' },
    snapToGrid: { type: Boolean, default: false }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (_doc, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// ==================== 索引 ====================

CanvasSchema.index({ ownerId: 1, createdAt: -1 });
CanvasSchema.index({ ownerId: 1, isArchived: 1 });
CanvasSchema.index({ 'collaborators.userId': 1 });
CanvasSchema.index({ tags: 1 });
CanvasSchema.index({ isTemplate: 1, templateCategory: 1 });
CanvasSchema.index({ title: 'text', description: 'text' });

// ==================== 静态方法 ====================

interface ICanvasModel extends Model<ICanvasDocument> {
  findByOwner(ownerId: string, options?: { 
    includeArchived?: boolean; 
    limit?: number; 
    skip?: number;
  }): Promise<ICanvasDocument[]>;
  
  findByCollaborator(userId: string, options?: {
    limit?: number;
    skip?: number;
  }): Promise<ICanvasDocument[]>;
  
  findTemplates(category?: string): Promise<ICanvasDocument[]>;
}

CanvasSchema.statics.findByOwner = async function(
  ownerId: string,
  options: { includeArchived?: boolean; limit?: number; skip?: number } = {}
): Promise<ICanvasDocument[]> {
  const query: any = { ownerId };
  if (!options.includeArchived) {
    query.isArchived = false;
  }
  
  return this.find(query)
    .sort({ updatedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .exec();
};

CanvasSchema.statics.findByCollaborator = async function(
  userId: string,
  options: { limit?: number; skip?: number } = {}
): Promise<ICanvasDocument[]> {
  return this.find({
    'collaborators.userId': userId,
    isArchived: false
  })
    .sort({ updatedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .exec();
};

CanvasSchema.statics.findTemplates = async function(
  category?: string
): Promise<ICanvasDocument[]> {
  const query: any = { isTemplate: true };
  if (category) {
    query.templateCategory = category;
  }
  
  return this.find(query)
    .sort({ createdAt: -1 })
    .exec();
};

// ==================== 实例方法 ====================

CanvasSchema.methods.addCollaborator = async function(
  this: ICanvasDocument,
  collaborator: Omit<ICollaborator, 'lastActive'>
): Promise<void> {
  const existingIndex = this.collaborators.findIndex(c => c.userId === collaborator.userId);
  if (existingIndex >= 0) {
    this.collaborators[existingIndex] = {
      ...this.collaborators[existingIndex],
      ...collaborator,
      lastActive: new Date()
    };
  } else {
    this.collaborators.push({
      ...collaborator,
      lastActive: new Date()
    });
  }
  await this.save();
};

CanvasSchema.methods.removeCollaborator = async function(
  this: ICanvasDocument,
  userId: string
): Promise<void> {
  this.collaborators = this.collaborators.filter(c => c.userId !== userId);
  await this.save();
};

CanvasSchema.methods.addElement = async function(
  this: ICanvasDocument,
  element: ICanvasElement
): Promise<void> {
  this.elements.push({
    ...element,
    createdAt: new Date(),
    updatedAt: new Date()
  });
  await this.save();
};

CanvasSchema.methods.updateElement = async function(
  this: ICanvasDocument,
  elementId: string,
  updates: Partial<ICanvasElement>
): Promise<boolean> {
  const elementIndex = this.elements.findIndex(e => e.id === elementId);
  if (elementIndex === -1) return false;
  
  this.elements[elementIndex] = {
    ...this.elements[elementIndex],
    ...updates,
    updatedAt: new Date()
  };
  await this.save();
  return true;
};

CanvasSchema.methods.removeElement = async function(
  this: ICanvasDocument,
  elementId: string
): Promise<boolean> {
  const initialLength = this.elements.length;
  this.elements = this.elements.filter(e => e.id !== elementId);
  
  if (this.elements.length === initialLength) return false;
  await this.save();
  return true;
};

CanvasSchema.methods.createVersion = async function(
  this: ICanvasDocument,
  versionData: Omit<ICanvasVersion, 'id' | 'createdAt' | 'elements'>
): Promise<string> {
  const versionId = new mongoose.Types.ObjectId().toString();
  this.versions.push({
    id: versionId,
    ...versionData,
    elements: JSON.parse(JSON.stringify(this.elements)),
    createdAt: new Date()
  });
  await this.save();
  return versionId;
};

CanvasSchema.methods.restoreVersion = async function(
  this: ICanvasDocument,
  versionId: string
): Promise<boolean> {
  const version = this.versions.find(v => v.id === versionId);
  if (!version) return false;
  
  this.elements = JSON.parse(JSON.stringify(version.elements));
  await this.save();
  return true;
};

CanvasSchema.methods.addComment = async function(
  this: ICanvasDocument,
  comment: Omit<ICanvasComment, 'id' | 'createdAt'>
): Promise<string> {
  const commentId = new mongoose.Types.ObjectId().toString();
  this.comments.push({
    id: commentId,
    ...comment,
    createdAt: new Date()
  });
  await this.save();
  return commentId;
};

CanvasSchema.methods.hasPermission = function(
  this: ICanvasDocument,
  userId: string,
  requiredPermission: 'view' | 'comment' | 'edit' | 'admin'
): boolean {
  // 所有者拥有所有权限
  if (this.ownerId === userId) return true;
  
  const collaborator = this.collaborators.find(c => c.userId === userId);
  const permissionLevels: Record<string, number> = { view: 0, comment: 1, edit: 2, admin: 3 };
  
  if (!collaborator) {
    // 检查公开访问权限
    if (this.permissions.visibility === 'public') {
      return permissionLevels[this.permissions.defaultRole] >= permissionLevels[requiredPermission];
    }
    return false;
  }
  
  return permissionLevels[collaborator.permissions] >= permissionLevels[requiredPermission];
};

// 创建并导出模型
const Canvas: ICanvasModel = mongoose.model<ICanvasDocument, ICanvasModel>('Canvas', CanvasSchema);

export default Canvas;
export { CanvasSchema };
