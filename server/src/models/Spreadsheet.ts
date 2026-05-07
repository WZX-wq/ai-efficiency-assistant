import mongoose, { Schema, Model, Document } from 'mongoose';

// ==================== 单元格类型 ====================

/** 单元格数据类型 */
export type CellDataType = 'string' | 'number' | 'boolean' | 'date' | 'formula' | 'error' | 'empty';

/** 单元格格式 */
export interface ICellFormat {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  fontColor?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  numberFormat?: string; // 如 "#,##0.00", "yyyy-mm-dd"
  textWrap?: boolean;
  borderTop?: IBorderStyle;
  borderRight?: IBorderStyle;
  borderBottom?: IBorderStyle;
  borderLeft?: IBorderStyle;
}

/** 边框样式 */
export interface IBorderStyle {
  style: 'thin' | 'medium' | 'thick' | 'dashed' | 'dotted';
  color: string;
}

/** 单元格数据 */
export interface ICellData {
  row: number;
  col: number;
  value: string | number | boolean | null;
  type: CellDataType;
  formula?: string; // 公式表达式
  computedValue?: string | number | boolean | null; // 计算后的值
  format?: ICellFormat;
  metadata?: Record<string, any>;
  comment?: string;
  merged?: boolean;
  mergeRange?: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  };
  validation?: ICellValidation;
}

/** 单元格验证规则 */
export interface ICellValidation {
  type: 'text' | 'number' | 'list' | 'date' | 'custom';
  required?: boolean;
  min?: number;
  max?: number;
  list?: string[];
  pattern?: string;
  customFormula?: string;
  errorMessage?: string;
}

/** 列定义 */
export interface IColumnDefinition {
  index: number;
  width: number;
  hidden?: boolean;
  frozen?: boolean;
  header?: string;
}

/** 行定义 */
export interface IRowDefinition {
  index: number;
  height: number;
  hidden?: boolean;
  frozen?: boolean;
}

/** 工作表 */
export interface IWorksheet {
  id: string;
  name: string;
  index: number;
  cells: ICellData[];
  columns: IColumnDefinition[];
  rows: IRowDefinition[];
  defaultColumnWidth: number;
  defaultRowHeight: number;
  frozenRows: number;
  frozenColumns: number;
  hidden?: boolean;
  tabColor?: string;
  showGridLines?: boolean;
  protected?: boolean;
  protectionPassword?: string;
}

/** 命名范围 */
export interface INamedRange {
  name: string;
  sheetId: string;
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

/** 条件格式 */
export interface IConditionalFormat {
  id: string;
  sheetId: string;
  range: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  };
  rules: IConditionalFormatRule[];
}

/** 条件格式规则 */
export interface IConditionalFormatRule {
  type: 'cellValue' | 'formula' | 'colorScale' | 'dataBar' | 'iconSet';
  operator?: 'equal' | 'notEqual' | 'greaterThan' | 'lessThan' | 'between' | 'contains';
  value?: string | number;
  value2?: string | number;
  formula?: string;
  style?: Partial<ICellFormat>;
  colorScale?: {
    minColor: string;
    maxColor: string;
    midpointColor?: string;
  };
}

/** 图表 */
export interface IChart {
  id: string;
  sheetId: string;
  name: string;
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'area' | 'doughnut' | 'radar';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  dataRange: {
    sheetId: string;
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  };
  options?: {
    title?: string;
    legend?: boolean;
    dataLabels?: boolean;
    xAxisTitle?: string;
    yAxisTitle?: string;
    colors?: string[];
  };
}

/** 筛选器 */
export interface IFilter {
  sheetId: string;
  range: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  };
  criteria: {
    col: number;
    operator: 'equal' | 'notEqual' | 'contains' | 'notContains' | 'startsWith' | 'endsWith' | 'empty' | 'notEmpty';
    value?: string;
    values?: string[];
  }[];
}

/** 排序规则 */
export interface ISortRange {
  sheetId: string;
  range: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  };
  sortSpecs: {
    col: number;
    ascending: boolean;
  }[];
}

// ==================== Mongoose 文档接口 ====================

export interface ISpreadsheetDocument extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  ownerId: string;
  worksheets: IWorksheet[];
  namedRanges: INamedRange[];
  conditionalFormats: IConditionalFormat[];
  charts: IChart[];
  filters: IFilter[];
  sortRanges: ISortRange[];
  collaborators: {
    userId: string;
    userName: string;
    userAvatar?: string;
    permissions: 'view' | 'comment' | 'edit' | 'admin';
    lastActive?: Date;
  }[];
  permissions: {
    visibility: 'private' | 'team' | 'public';
    defaultRole: 'viewer' | 'commenter' | 'editor';
    allowExport: boolean;
    allowDuplicate: boolean;
  };
  tags: string[];
  isArchived: boolean;
  isTemplate: boolean;
  templateCategory?: string;
  settings: {
    locale: string;
    timezone: string;
    currency: string;
    calculationMode: 'auto' | 'manual';
    showFormulas: boolean;
    showGridLines: boolean;
    zoom: number;
  };
  createdAt: Date;
  updatedAt: Date;
  // 实例方法
  getWorksheet(sheetId: string): IWorksheet | undefined;
  addWorksheet(name: string, options?: Partial<IWorksheet>): Promise<IWorksheet>;
  removeWorksheet(sheetId: string): Promise<boolean>;
  getCell(sheetId: string, row: number, col: number): ICellData | undefined;
  setCell(sheetId: string, cellData: ICellData): Promise<ICellData>;
  setCells(sheetId: string, cells: ICellData[]): Promise<ICellData[]>;
  clearCell(sheetId: string, row: number, col: number): Promise<boolean>;
  clearRange(sheetId: string, startRow: number, startCol: number, endRow: number, endCol: number): Promise<number>;
  addCollaborator(collaborator: Omit<ISpreadsheetDocument['collaborators'][0], 'lastActive'>): Promise<void>;
  removeCollaborator(userId: string): Promise<void>;
  hasPermission(userId: string, requiredPermission: 'view' | 'comment' | 'edit' | 'admin'): boolean;
  duplicate(newOwnerId: string, newTitle?: string): Promise<ISpreadsheetDocument>;
}

// ==================== Schema 定义 ====================

const CellFormatSchema: Schema<ICellFormat> = new Schema({
  bold: Boolean,
  italic: Boolean,
  underline: Boolean,
  strikethrough: Boolean,
  fontSize: Number,
  fontFamily: String,
  fontColor: String,
  backgroundColor: String,
  textAlign: { type: String, enum: ['left', 'center', 'right', 'justify'] },
  verticalAlign: { type: String, enum: ['top', 'middle', 'bottom'] },
  numberFormat: String,
  textWrap: Boolean,
  borderTop: {
    style: { type: String, enum: ['thin', 'medium', 'thick', 'dashed', 'dotted'] },
    color: String
  },
  borderRight: {
    style: { type: String, enum: ['thin', 'medium', 'thick', 'dashed', 'dotted'] },
    color: String
  },
  borderBottom: {
    style: { type: String, enum: ['thin', 'medium', 'thick', 'dashed', 'dotted'] },
    color: String
  },
  borderLeft: {
    style: { type: String, enum: ['thin', 'medium', 'thick', 'dashed', 'dotted'] },
    color: String
  }
}, { _id: false });

const CellValidationSchema: Schema<ICellValidation> = new Schema({
  type: { type: String, enum: ['text', 'number', 'list', 'date', 'custom'], required: true },
  required: Boolean,
  min: Number,
  max: Number,
  list: [String],
  pattern: String,
  customFormula: String,
  errorMessage: String
}, { _id: false });

const CellDataSchema: Schema<ICellData> = new Schema({
  row: { type: Number, required: true },
  col: { type: Number, required: true },
  value: Schema.Types.Mixed,
  type: {
    type: String,
    enum: ['string', 'number', 'boolean', 'date', 'formula', 'error', 'empty'],
    required: true
  },
  formula: String,
  computedValue: Schema.Types.Mixed,
  format: CellFormatSchema,
  metadata: { type: Schema.Types.Mixed, default: {} },
  comment: String,
  merged: { type: Boolean, default: false },
  mergeRange: {
    startRow: Number,
    startCol: Number,
    endRow: Number,
    endCol: Number
  },
  validation: CellValidationSchema
}, { _id: false });

const ColumnDefinitionSchema: Schema<IColumnDefinition> = new Schema({
  index: { type: Number, required: true },
  width: { type: Number, default: 100 },
  hidden: { type: Boolean, default: false },
  frozen: { type: Boolean, default: false },
  header: String
}, { _id: false });

const RowDefinitionSchema: Schema<IRowDefinition> = new Schema({
  index: { type: Number, required: true },
  height: { type: Number, default: 24 },
  hidden: { type: Boolean, default: false },
  frozen: { type: Boolean, default: false }
}, { _id: false });

const WorksheetSchema: Schema<IWorksheet> = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  index: { type: Number, required: true },
  cells: { type: [CellDataSchema], default: [] },
  columns: { type: [ColumnDefinitionSchema], default: [] },
  rows: { type: [RowDefinitionSchema], default: [] },
  defaultColumnWidth: { type: Number, default: 100 },
  defaultRowHeight: { type: Number, default: 24 },
  frozenRows: { type: Number, default: 0 },
  frozenColumns: { type: Number, default: 0 },
  hidden: { type: Boolean, default: false },
  tabColor: String,
  showGridLines: { type: Boolean, default: true },
  protected: { type: Boolean, default: false },
  protectionPassword: String
}, { _id: false });

const NamedRangeSchema: Schema<INamedRange> = new Schema({
  name: { type: String, required: true },
  sheetId: { type: String, required: true },
  startRow: { type: Number, required: true },
  startCol: { type: Number, required: true },
  endRow: { type: Number, required: true },
  endCol: { type: Number, required: true }
}, { _id: false });

const ConditionalFormatRuleSchema: Schema<IConditionalFormatRule> = new Schema({
  type: { type: String, enum: ['cellValue', 'formula', 'colorScale', 'dataBar', 'iconSet'], required: true },
  operator: { type: String, enum: ['equal', 'notEqual', 'greaterThan', 'lessThan', 'between', 'contains'] },
  value: Schema.Types.Mixed,
  value2: Schema.Types.Mixed,
  formula: String,
  style: { type: Schema.Types.Mixed },
  colorScale: {
    minColor: String,
    maxColor: String,
    midpointColor: String
  }
}, { _id: false });

const ConditionalFormatSchema: Schema<IConditionalFormat> = new Schema({
  id: { type: String, required: true },
  sheetId: { type: String, required: true },
  range: {
    startRow: { type: Number, required: true },
    startCol: { type: Number, required: true },
    endRow: { type: Number, required: true },
    endCol: { type: Number, required: true }
  },
  rules: { type: [ConditionalFormatRuleSchema], default: [] }
}, { _id: false });

const ChartSchema: Schema<IChart> = new Schema({
  id: { type: String, required: true },
  sheetId: { type: String, required: true },
  name: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['bar', 'line', 'pie', 'scatter', 'area', 'doughnut', 'radar'],
    required: true 
  },
  position: {
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true }
  },
  dataRange: {
    sheetId: { type: String, required: true },
    startRow: { type: Number, required: true },
    startCol: { type: Number, required: true },
    endRow: { type: Number, required: true },
    endCol: { type: Number, required: true }
  },
  options: {
    title: String,
    legend: Boolean,
    dataLabels: Boolean,
    xAxisTitle: String,
    yAxisTitle: String,
    colors: [String]
  }
}, { _id: false });

const FilterSchema: Schema<IFilter> = new Schema({
  sheetId: { type: String, required: true },
  range: {
    startRow: { type: Number, required: true },
    startCol: { type: Number, required: true },
    endRow: { type: Number, required: true },
    endCol: { type: Number, required: true }
  },
  criteria: [{
    col: { type: Number, required: true },
    operator: { 
      type: String, 
      enum: ['equal', 'notEqual', 'contains', 'notContains', 'startsWith', 'endsWith', 'empty', 'notEmpty'],
      required: true 
    },
    value: String,
    values: [String]
  }]
}, { _id: false });

const SortRangeSchema: Schema<ISortRange> = new Schema({
  sheetId: { type: String, required: true },
  range: {
    startRow: { type: Number, required: true },
    startCol: { type: Number, required: true },
    endRow: { type: Number, required: true },
    endCol: { type: Number, required: true }
  },
  sortSpecs: [{
    col: { type: Number, required: true },
    ascending: { type: Boolean, required: true }
  }]
}, { _id: false });

const CollaboratorSchema = new Schema({
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userAvatar: String,
  permissions: {
    type: String,
    enum: ['view', 'comment', 'edit', 'admin'],
    default: 'view'
  },
  lastActive: { type: Date, default: Date.now }
}, { _id: false });

const SpreadsheetSchema: Schema<ISpreadsheetDocument> = new Schema({
  title: {
    type: String,
    required: [true, '表格标题是必填项'],
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
  worksheets: {
    type: [WorksheetSchema],
    default: () => [{
      id: new mongoose.Types.ObjectId().toString(),
      name: 'Sheet1',
      index: 0,
      cells: [],
      columns: [],
      rows: [],
      defaultColumnWidth: 100,
      defaultRowHeight: 24,
      frozenRows: 0,
      frozenColumns: 0,
      showGridLines: true
    }]
  },
  namedRanges: {
    type: [NamedRangeSchema],
    default: []
  },
  conditionalFormats: {
    type: [ConditionalFormatSchema],
    default: []
  },
  charts: {
    type: [ChartSchema],
    default: []
  },
  filters: {
    type: [FilterSchema],
    default: []
  },
  sortRanges: {
    type: [SortRangeSchema],
    default: []
  },
  collaborators: {
    type: [CollaboratorSchema],
    default: []
  },
  permissions: {
    type: {
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
      allowDuplicate: { type: Boolean, default: true }
    },
    default: () => ({
      visibility: 'private',
      defaultRole: 'viewer',
      allowExport: true,
      allowDuplicate: true
    })
  },
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
  settings: {
    type: {
      locale: { type: String, default: 'zh-CN' },
      timezone: { type: String, default: 'Asia/Shanghai' },
      currency: { type: String, default: 'CNY' },
      calculationMode: { type: String, enum: ['auto', 'manual'], default: 'auto' },
      showFormulas: { type: Boolean, default: false },
      showGridLines: { type: Boolean, default: true },
      zoom: { type: Number, default: 100 }
    },
    default: () => ({
      locale: 'zh-CN',
      timezone: 'Asia/Shanghai',
      currency: 'CNY',
      calculationMode: 'auto',
      showFormulas: false,
      showGridLines: true,
      zoom: 100
    })
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

SpreadsheetSchema.index({ ownerId: 1, createdAt: -1 });
SpreadsheetSchema.index({ ownerId: 1, isArchived: 1 });
SpreadsheetSchema.index({ 'collaborators.userId': 1 });
SpreadsheetSchema.index({ tags: 1 });
SpreadsheetSchema.index({ isTemplate: 1, templateCategory: 1 });
SpreadsheetSchema.index({ title: 'text', description: 'text' });

// ==================== 静态方法 ====================

interface ISpreadsheetModel extends Model<ISpreadsheetDocument> {
  findByOwner(ownerId: string, options?: {
    includeArchived?: boolean;
    limit?: number;
    skip?: number;
  }): Promise<ISpreadsheetDocument[]>;

  findByCollaborator(userId: string, options?: {
    limit?: number;
    skip?: number;
  }): Promise<ISpreadsheetDocument[]>;

  findTemplates(category?: string): Promise<ISpreadsheetDocument[]>;
}

SpreadsheetSchema.statics.findByOwner = async function(
  ownerId: string,
  options: { includeArchived?: boolean; limit?: number; skip?: number } = {}
): Promise<ISpreadsheetDocument[]> {
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

SpreadsheetSchema.statics.findByCollaborator = async function(
  userId: string,
  options: { limit?: number; skip?: number } = {}
): Promise<ISpreadsheetDocument[]> {
  return this.find({
    'collaborators.userId': userId,
    isArchived: false
  })
    .sort({ updatedAt: -1 })
    .limit(options.limit || 50)
    .skip(options.skip || 0)
    .exec();
};

SpreadsheetSchema.statics.findTemplates = async function(
  category?: string
): Promise<ISpreadsheetDocument[]> {
  const query: any = { isTemplate: true };
  if (category) {
    query.templateCategory = category;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .exec();
};

// ==================== 实例方法 ====================

SpreadsheetSchema.methods.getWorksheet = function(
  this: ISpreadsheetDocument,
  sheetId: string
): IWorksheet | undefined {
  return this.worksheets.find(sheet => sheet.id === sheetId);
};

SpreadsheetSchema.methods.addWorksheet = async function(
  this: ISpreadsheetDocument,
  name: string,
  options?: Partial<IWorksheet>
): Promise<IWorksheet> {
  const maxIndex = Math.max(...this.worksheets.map(s => s.index), -1);
  const newSheet: IWorksheet = {
    id: new mongoose.Types.ObjectId().toString(),
    name: name || `Sheet${this.worksheets.length + 1}`,
    index: maxIndex + 1,
    cells: [],
    columns: [],
    rows: [],
    defaultColumnWidth: 100,
    defaultRowHeight: 24,
    frozenRows: 0,
    frozenColumns: 0,
    showGridLines: true,
    ...options
  };
  this.worksheets.push(newSheet);
  await this.save();
  return newSheet;
};

SpreadsheetSchema.methods.removeWorksheet = async function(
  this: ISpreadsheetDocument,
  sheetId: string
): Promise<boolean> {
  if (this.worksheets.length <= 1) {
    throw new Error('Cannot remove the last worksheet');
  }
  
  const initialLength = this.worksheets.length;
  this.worksheets = this.worksheets.filter(sheet => sheet.id !== sheetId);
  
  // Reindex remaining sheets
  this.worksheets.forEach((sheet, index) => {
    sheet.index = index;
  });
  
  if (this.worksheets.length === initialLength) return false;
  await this.save();
  return true;
};

SpreadsheetSchema.methods.getCell = function(
  this: ISpreadsheetDocument,
  sheetId: string,
  row: number,
  col: number
): ICellData | undefined {
  const sheet = this.getWorksheet(sheetId);
  if (!sheet) return undefined;
  return sheet.cells.find(cell => cell.row === row && cell.col === col);
};

SpreadsheetSchema.methods.setCell = async function(
  this: ISpreadsheetDocument,
  sheetId: string,
  cellData: ICellData
): Promise<ICellData> {
  const sheet = this.getWorksheet(sheetId);
  if (!sheet) throw new Error('Worksheet not found');
  
  const existingIndex = sheet.cells.findIndex(
    c => c.row === cellData.row && c.col === cellData.col
  );
  
  if (existingIndex >= 0) {
    sheet.cells[existingIndex] = { ...sheet.cells[existingIndex], ...cellData };
  } else {
    sheet.cells.push(cellData);
  }
  
  await this.save();
  return cellData;
};

SpreadsheetSchema.methods.setCells = async function(
  this: ISpreadsheetDocument,
  sheetId: string,
  cells: ICellData[]
): Promise<ICellData[]> {
  const sheet = this.getWorksheet(sheetId);
  if (!sheet) throw new Error('Worksheet not found');
  
  for (const cellData of cells) {
    const existingIndex = sheet.cells.findIndex(
      c => c.row === cellData.row && c.col === cellData.col
    );
    
    if (existingIndex >= 0) {
      sheet.cells[existingIndex] = { ...sheet.cells[existingIndex], ...cellData };
    } else {
      sheet.cells.push(cellData);
    }
  }
  
  await this.save();
  return cells;
};

SpreadsheetSchema.methods.clearCell = async function(
  this: ISpreadsheetDocument,
  sheetId: string,
  row: number,
  col: number
): Promise<boolean> {
  const sheet = this.getWorksheet(sheetId);
  if (!sheet) return false;
  
  const initialLength = sheet.cells.length;
  sheet.cells = sheet.cells.filter(c => !(c.row === row && c.col === col));
  
  if (sheet.cells.length === initialLength) return false;
  await this.save();
  return true;
};

SpreadsheetSchema.methods.clearRange = async function(
  this: ISpreadsheetDocument,
  sheetId: string,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
): Promise<number> {
  const sheet = this.getWorksheet(sheetId);
  if (!sheet) return 0;
  
  const initialLength = sheet.cells.length;
  sheet.cells = sheet.cells.filter(
    c => !(c.row >= startRow && c.row <= endRow && c.col >= startCol && c.col <= endCol)
  );
  
  const clearedCount = initialLength - sheet.cells.length;
  await this.save();
  return clearedCount;
};

SpreadsheetSchema.methods.addCollaborator = async function(
  this: ISpreadsheetDocument,
  collaborator: Omit<ISpreadsheetDocument['collaborators'][0], 'lastActive'>
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

SpreadsheetSchema.methods.removeCollaborator = async function(
  this: ISpreadsheetDocument,
  userId: string
): Promise<void> {
  this.collaborators = this.collaborators.filter(c => c.userId !== userId);
  await this.save();
};

SpreadsheetSchema.methods.hasPermission = function(
  this: ISpreadsheetDocument,
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

SpreadsheetSchema.methods.duplicate = async function(
  this: ISpreadsheetDocument,
  newOwnerId: string,
  newTitle?: string
): Promise<ISpreadsheetDocument> {
  const duplicateData = this.toObject();
  delete duplicateData._id;
  delete duplicateData.createdAt;
  delete duplicateData.updatedAt;
  
  duplicateData.title = newTitle || `${this.title} (副本)`;
  duplicateData.ownerId = newOwnerId;
  duplicateData.collaborators = [];
  duplicateData.isTemplate = false;
  duplicateData.templateCategory = undefined;
  
  // Generate new IDs for worksheets
  duplicateData.worksheets = duplicateData.worksheets.map((sheet: IWorksheet) => ({
    ...sheet,
    id: new mongoose.Types.ObjectId().toString()
  }));
  
  const newSpreadsheet = new (this.constructor as any)(duplicateData);
  await newSpreadsheet.save();
  return newSpreadsheet;
};

// 创建并导出模型
const Spreadsheet: ISpreadsheetModel = mongoose.model<ISpreadsheetDocument, ISpreadsheetModel>('Spreadsheet', SpreadsheetSchema);

export default Spreadsheet;
export { SpreadsheetSchema };
