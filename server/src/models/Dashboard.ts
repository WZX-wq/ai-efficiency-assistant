import mongoose, { Schema, Model, Document } from 'mongoose';

// ==================== 类型定义 ====================

/** 图表类型 */
export type ChartType =
  | 'line'      // 折线图
  | 'bar'       // 柱状图
  | 'pie'       // 饼图
  | 'doughnut'  // 环形图
  | 'area'      // 面积图
  | 'scatter'   // 散点图
  | 'radar'     // 雷达图
  | 'gauge'     // 仪表盘
  | 'table'     // 表格
  | 'metric';   // 单指标

/** 数据源类型 */
export type DataSourceType =
  | 'system'      // 系统监控数据
  | 'api'         // API 数据
  | 'database'    // 数据库查询
  | 'websocket'   // WebSocket 实时数据
  | 'static';     // 静态数据

/** 刷新间隔 */
export type RefreshInterval =
  | 'off'       // 不刷新
  | '5s'        // 5秒
  | '10s'       // 10秒
  | '30s'       // 30秒
  | '1m'        // 1分钟
  | '5m'        // 5分钟
  | '15m'       // 15分钟
  | '1h';       // 1小时

/** 时间范围 */
export type TimeRange =
  | 'last5m'
  | 'last15m'
  | 'last30m'
  | 'last1h'
  | 'last3h'
  | 'last6h'
  | 'last12h'
  | 'last24h'
  | 'last7d'
  | 'last30d'
  | 'custom';

/** 图表位置 */
export interface ChartPosition {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** 图表配置 */
export interface ChartConfig {
  title: string;
  description?: string;
  type: ChartType;
  position: ChartPosition;
  dataSource: DataSourceConfig;
  options?: ChartOptions;
  refreshInterval?: RefreshInterval;
  timeRange?: TimeRange;
  customTimeRange?: {
    start: Date;
    end: Date;
  };
}

/** 数据源配置 */
export interface DataSourceConfig {
  type: DataSourceType;
  // 系统监控数据源
  systemMetric?: SystemMetricConfig;
  // API 数据源
  apiConfig?: ApiDataSourceConfig;
  // 数据库数据源
  databaseConfig?: DatabaseDataSourceConfig;
  // WebSocket 数据源
  websocketConfig?: WebSocketDataSourceConfig;
  // 静态数据
  staticData?: any;
}

/** 系统指标配置 */
export interface SystemMetricConfig {
  category: 'cpu' | 'memory' | 'disk' | 'network' | 'load' | 'process';
  metric: string;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count' | 'latest';
  filters?: Record<string, any>;
}

/** API 数据源配置 */
export interface ApiDataSourceConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  dataPath?: string; // 响应数据路径，如 "data.items"
  refreshInterval?: number;
}

/** 数据库数据源配置 */
export interface DatabaseDataSourceConfig {
  connectionId: string;
  query: string;
  parameters?: any[];
}

/** WebSocket 数据源配置 */
export interface WebSocketDataSourceConfig {
  url: string;
  eventName: string;
  message?: any;
}

/** 图表选项 */
export interface ChartOptions {
  // 通用选项
  colors?: string[];
  theme?: 'light' | 'dark';
  showLegend?: boolean;
  showTooltip?: boolean;
  animation?: boolean;

  // 坐标轴选项
  xAxis?: AxisConfig;
  yAxis?: AxisConfig;

  // 特定图表类型选项
  stacked?: boolean;      // 柱状图/面积图是否堆叠
  smooth?: boolean;       // 折线图是否平滑
  fill?: boolean;         // 是否填充
  showLabels?: boolean;   // 是否显示标签
  labelPosition?: 'inside' | 'outside' | 'center';

  // 阈值线
  thresholds?: ThresholdConfig[];

  // 格式化
  valueFormatter?: string;  // 数值格式化字符串
  dateFormatter?: string;   // 日期格式化字符串
}

/** 坐标轴配置 */
export interface AxisConfig {
  title?: string;
  min?: number;
  max?: number;
  type?: 'value' | 'category' | 'time' | 'log';
  formatter?: string;
}

/** 阈值配置 */
export interface ThresholdConfig {
  value: number;
  color: string;
  label?: string;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
}

/** 仪表盘文档接口 */
export interface IDashboardDocument extends Document {
  id: string;
  name: string;
  description?: string;
  charts: ChartConfig[];
  layout: 'grid' | 'free';
  theme: 'light' | 'dark' | 'auto';
  refreshInterval: RefreshInterval;
  isPublic: boolean;
  isDefault: boolean;
  tags: string[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;

  // 方法
  addChart(chart: Omit<ChartConfig, 'position'> & Partial<ChartPosition>): ChartConfig;
  removeChart(chartIndex: number): boolean;
  updateChart(chartIndex: number, updates: Partial<ChartConfig>): ChartConfig | null;
  reorderCharts(newOrder: number[]): void;
}

/** 仪表盘模型接口 */
export interface IDashboardModel extends Model<IDashboardDocument> {
  findByUser(userId: string): Promise<IDashboardDocument[]>;
  findPublic(): Promise<IDashboardDocument[]>;
  findDefault(userId: string): Promise<IDashboardDocument | null>;
}

// ==================== Schema 定义 ====================

// 图表位置子模式
const ChartPositionSchema = new Schema<ChartPosition>({
  x: { type: Number, required: true, default: 0 },
  y: { type: Number, required: true, default: 0 },
  w: { type: Number, required: true, default: 6, min: 1, max: 12 },
  h: { type: Number, required: true, default: 4, min: 1, max: 20 }
}, { _id: false });

// 系统指标配置子模式
const SystemMetricConfigSchema = new Schema<SystemMetricConfig>({
  category: {
    type: String,
    enum: ['cpu', 'memory', 'disk', 'network', 'load', 'process'],
    required: true
  },
  metric: { type: String, required: true },
  aggregation: {
    type: String,
    enum: ['avg', 'sum', 'min', 'max', 'count', 'latest'],
    default: 'latest'
  },
  filters: { type: Schema.Types.Mixed, default: {} }
}, { _id: false });

// API 数据源配置子模式
const ApiDataSourceConfigSchema = new Schema<ApiDataSourceConfig>({
  url: { type: String, required: true },
  method: {
    type: String,
    enum: ['GET', 'POST', 'PUT', 'DELETE'],
    default: 'GET'
  },
  headers: { type: Schema.Types.Mixed, default: {} },
  body: { type: Schema.Types.Mixed, default: null },
  dataPath: { type: String, default: '' },
  refreshInterval: { type: Number, default: 0 }
}, { _id: false });

// 数据库数据源配置子模式
const DatabaseDataSourceConfigSchema = new Schema<DatabaseDataSourceConfig>({
  connectionId: { type: String, required: true },
  query: { type: String, required: true },
  parameters: { type: [Schema.Types.Mixed] as any, default: [] }
}, { _id: false });

// WebSocket 数据源配置子模式
const WebSocketDataSourceConfigSchema = new Schema<WebSocketDataSourceConfig>({
  url: { type: String, required: true },
  eventName: { type: String, required: true },
  message: { type: Schema.Types.Mixed, default: null }
}, { _id: false });

// 数据源配置子模式
const DataSourceConfigSchema = new Schema<DataSourceConfig>({
  type: {
    type: String,
    enum: ['system', 'api', 'database', 'websocket', 'static'],
    required: true
  },
  systemMetric: { type: SystemMetricConfigSchema, default: null },
  apiConfig: { type: ApiDataSourceConfigSchema, default: null },
  databaseConfig: { type: DatabaseDataSourceConfigSchema, default: null },
  websocketConfig: { type: WebSocketDataSourceConfigSchema, default: null },
  staticData: { type: Schema.Types.Mixed, default: null }
}, { _id: false });

// 坐标轴配置子模式
const AxisConfigSchema = new Schema<AxisConfig>({
  title: { type: String, default: '' },
  min: { type: Number, default: null },
  max: { type: Number, default: null },
  type: {
    type: String,
    enum: ['value', 'category', 'time', 'log'],
    default: 'value'
  },
  formatter: { type: String, default: '' }
}, { _id: false });

// 阈值配置子模式
const ThresholdConfigSchema = new Schema<ThresholdConfig>({
  value: { type: Number, required: true },
  color: { type: String, required: true },
  label: { type: String, default: '' },
  lineStyle: {
    type: String,
    enum: ['solid', 'dashed', 'dotted'],
    default: 'dashed'
  }
}, { _id: false });

// 图表选项子模式
const ChartOptionsSchema = new Schema<ChartOptions>({
  colors: { type: [String], default: [] },
  theme: {
    type: String,
    enum: ['light', 'dark'],
    default: 'light'
  },
  showLegend: { type: Boolean, default: true },
  showTooltip: { type: Boolean, default: true },
  animation: { type: Boolean, default: true },
  xAxis: { type: AxisConfigSchema, default: () => ({}) },
  yAxis: { type: AxisConfigSchema, default: () => ({}) },
  stacked: { type: Boolean, default: false },
  smooth: { type: Boolean, default: false },
  fill: { type: Boolean, default: false },
  showLabels: { type: Boolean, default: false },
  labelPosition: {
    type: String,
    enum: ['inside', 'outside', 'center'],
    default: 'outside'
  },
  thresholds: { type: [ThresholdConfigSchema], default: [] },
  valueFormatter: { type: String, default: '' },
  dateFormatter: { type: String, default: '' }
}, { _id: false });

// 图表配置子模式
const ChartConfigSchema = new Schema<ChartConfig>({
  title: {
    type: String,
    required: [true, '图表标题是必填项'],
    trim: true,
    maxlength: [100, '图表标题不能超过100个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '图表描述不能超过500个字符']
  },
  type: {
    type: String,
    enum: ['line', 'bar', 'pie', 'doughnut', 'area', 'scatter', 'radar', 'gauge', 'table', 'metric'],
    required: true
  },
  position: {
    type: ChartPositionSchema,
    required: true,
    default: () => ({ x: 0, y: 0, w: 6, h: 4 })
  },
  dataSource: {
    type: DataSourceConfigSchema,
    required: true
  },
  options: {
    type: ChartOptionsSchema,
    default: () => ({})
  },
  refreshInterval: {
    type: String,
    enum: ['off', '5s', '10s', '30s', '1m', '5m', '15m', '1h'],
    default: 'off'
  },
  timeRange: {
    type: String,
    enum: ['last5m', 'last15m', 'last30m', 'last1h', 'last3h', 'last6h', 'last12h', 'last24h', 'last7d', 'last30d', 'custom'],
    default: 'last1h'
  },
  customTimeRange: {
    start: { type: Date, default: null },
    end: { type: Date, default: null }
  }
}, { _id: false });

// 仪表盘主模式
const DashboardSchema = new Schema<IDashboardDocument, IDashboardModel>({
  name: {
    type: String,
    required: [true, '仪表盘名称是必填项'],
    trim: true,
    minlength: [1, '仪表盘名称至少1个字符'],
    maxlength: [100, '仪表盘名称不能超过100个字符']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, '仪表盘描述不能超过500个字符']
  },
  charts: {
    type: [ChartConfigSchema],
    default: []
  },
  layout: {
    type: String,
    enum: ['grid', 'free'],
    default: 'grid'
  },
  theme: {
    type: String,
    enum: ['light', 'dark', 'auto'],
    default: 'auto'
  },
  refreshInterval: {
    type: String,
    enum: ['off', '5s', '10s', '30s', '1m', '5m', '15m', '1h'],
    default: 'off'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: (tags: string[]) => tags.length <= 20,
      message: '标签数量不能超过20个'
    }
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
DashboardSchema.index({ createdBy: 1, name: 1 });
DashboardSchema.index({ isPublic: 1 });
DashboardSchema.index({ isDefault: 1 });
DashboardSchema.index({ tags: 1 });
DashboardSchema.index({ createdAt: -1 });

// ==================== 实例方法 ====================

/**
 * 添加图表
 */
DashboardSchema.methods.addChart = function(
  this: IDashboardDocument,
  chart: Omit<ChartConfig, 'position'> & Partial<ChartPosition>
): ChartConfig {
  // 自动计算位置
  const position: ChartPosition = {
    x: chart.x ?? 0,
    y: chart.y ?? this.charts.length * 4,
    w: chart.w ?? 6,
    h: chart.h ?? 4
  };

  const newChart: ChartConfig = {
    ...chart,
    position
  };

  this.charts.push(newChart);
  return newChart;
};

/**
 * 移除图表
 */
DashboardSchema.methods.removeChart = function(this: IDashboardDocument, chartIndex: number): boolean {
  if (chartIndex < 0 || chartIndex >= this.charts.length) {
    return false;
  }

  this.charts.splice(chartIndex, 1);
  return true;
};

/**
 * 更新图表
 */
DashboardSchema.methods.updateChart = function(
  this: IDashboardDocument,
  chartIndex: number,
  updates: Partial<ChartConfig>
): ChartConfig | null {
  if (chartIndex < 0 || chartIndex >= this.charts.length) {
    return null;
  }

  const chart = this.charts[chartIndex];

  // 更新允许修改的字段
  if (updates.title !== undefined) chart.title = updates.title;
  if (updates.description !== undefined) chart.description = updates.description;
  if (updates.type !== undefined) chart.type = updates.type;
  if (updates.position !== undefined) chart.position = { ...chart.position, ...updates.position };
  if (updates.dataSource !== undefined) chart.dataSource = { ...chart.dataSource, ...updates.dataSource };
  if (updates.options !== undefined) chart.options = { ...chart.options, ...updates.options };
  if (updates.refreshInterval !== undefined) chart.refreshInterval = updates.refreshInterval;
  if (updates.timeRange !== undefined) chart.timeRange = updates.timeRange;
  if (updates.customTimeRange !== undefined) chart.customTimeRange = updates.customTimeRange;

  this.charts[chartIndex] = chart;
  this.markModified('charts');

  return chart;
};

/**
 * 重新排序图表
 */
DashboardSchema.methods.reorderCharts = function(this: IDashboardDocument, newOrder: number[]): void {
  if (newOrder.length !== this.charts.length) {
    throw new Error('新顺序数组长度必须与图表数量一致');
  }

  const reordered: ChartConfig[] = [];
  for (const index of newOrder) {
    if (index < 0 || index >= this.charts.length) {
      throw new Error(`无效的图表索引: ${index}`);
    }
    reordered.push(this.charts[index]);
  }

  this.charts = reordered;
};

// ==================== 静态方法 ====================

/**
 * 根据用户查找仪表盘
 */
DashboardSchema.statics.findByUser = function(
  this: IDashboardModel,
  userId: string
): Promise<IDashboardDocument[]> {
  return this.find({
    $or: [
      { createdBy: userId },
      { isPublic: true }
    ]
  }).sort({ updatedAt: -1 });
};

/**
 * 查找公开仪表盘
 */
DashboardSchema.statics.findPublic = function(this: IDashboardModel): Promise<IDashboardDocument[]> {
  return this.find({ isPublic: true }).sort({ updatedAt: -1 });
};

/**
 * 查找用户的默认仪表盘
 */
DashboardSchema.statics.findDefault = function(
  this: IDashboardModel,
  userId: string
): Promise<IDashboardDocument | null> {
  return this.findOne({
    createdBy: userId,
    isDefault: true
  });
};

// ==================== 中间件 ====================

// 保存前验证
DashboardSchema.pre('save', function(this: IDashboardDocument, next) {
  // 确保只有一个默认仪表盘
  if (this.isDefault && this.isModified('isDefault')) {
    // 这里需要在保存后重置其他仪表盘的 isDefault
    // 由于 pre 钩子无法异步更新其他文档，需要在路由层处理
  }

  next();
});

// 创建并导出模型
const Dashboard: IDashboardModel = mongoose.model<IDashboardDocument, IDashboardModel>(
  'Dashboard',
  DashboardSchema
);

export default Dashboard;
