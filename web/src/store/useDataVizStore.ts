import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// Types
// ============================================================

export type WidgetType = 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'metric' | 'table' | 'progress';
export type DateRange = '7d' | '30d' | '90d' | '1y';

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
  change?: number;
}

export interface WidgetConfig {
  showLegend: boolean;
  showGrid: boolean;
  showValues: boolean;
  colorScheme: string[];
  maxValue?: number;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  data: DataPoint[];
  config: WidgetConfig;
  position: { x: number; y: number; w: number; h: number };
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: Widget[];
  createdAt: number;
  updatedAt: number;
}

export interface DataVizStore {
  dashboards: Dashboard[];
  activeDashboardId: string | null;
  dateRange: DateRange;
  refreshInterval: number | null;

  // Actions
  createDashboard: (name: string, description?: string) => string;
  deleteDashboard: (id: string) => void;
  setActiveDashboard: (id: string) => void;
  addWidget: (dashboardId: string, widget: Omit<Widget, 'id'>) => void;
  removeWidget: (dashboardId: string, widgetId: string) => void;
  updateWidgetData: (dashboardId: string, widgetId: string, data: DataPoint[]) => void;
  setDateRange: (range: DateRange) => void;
  setRefreshInterval: (interval: number | null) => void;
}

// ============================================================
// Color Schemes
// ============================================================

export const COLOR_SCHEMES = {
  default: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'],
  warm: ['#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7', '#6366f1'],
  cool: ['#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7'],
  green: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5', '#ecfdf5'],
};

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `dv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateMockDashboards(): Dashboard[] {
  const now = Date.now();

  // Dashboard 1: 运营概览 (6 widgets)
  const dashboard1: Dashboard = {
    id: 'dashboard_ops_overview',
    name: '运营概览',
    description: '核心运营指标总览，包含收入、用户、转化等关键数据',
    createdAt: now - 86400000 * 30,
    updatedAt: now,
    widgets: [
      // Widget 1: Bar chart - 月度收入
      {
        id: 'widget_ops_revenue_bar',
        type: 'bar',
        title: '月度收入趋势',
        data: [
          { label: '1月', value: 128000, color: '#6366f1' },
          { label: '2月', value: 145000, color: '#8b5cf6' },
          { label: '3月', value: 162000, color: '#a78bfa' },
          { label: '4月', value: 138000, color: '#c4b5fd' },
          { label: '5月', value: 175000, color: '#ddd6fe' },
          { label: '6月', value: 198000, color: '#6366f1' },
          { label: '7月', value: 215000, color: '#8b5cf6' },
          { label: '8月', value: 203000, color: '#a78bfa' },
        ],
        config: {
          showLegend: false,
          showGrid: true,
          showValues: true,
          colorScheme: COLOR_SCHEMES.default,
        },
        position: { x: 0, y: 0, w: 2, h: 1 },
      },
      // Widget 2: Line chart - 日活用户
      {
        id: 'widget_ops_dau_line',
        type: 'line',
        title: '日活用户 (DAU)',
        data: [
          { label: '周一', value: 12400 },
          { label: '周二', value: 13200 },
          { label: '周三', value: 14800 },
          { label: '周四', value: 13500 },
          { label: '周五', value: 15200 },
          { label: '周六', value: 18900 },
          { label: '周日', value: 17600 },
        ],
        config: {
          showLegend: false,
          showGrid: true,
          showValues: false,
          colorScheme: COLOR_SCHEMES.cool,
        },
        position: { x: 2, y: 0, w: 2, h: 1 },
      },
      // Widget 3: Donut chart - 流量来源
      {
        id: 'widget_ops_traffic_donut',
        type: 'donut',
        title: '流量来源分布',
        data: [
          { label: '自然搜索', value: 35, color: '#6366f1' },
          { label: '社交媒体', value: 25, color: '#8b5cf6' },
          { label: '直接访问', value: 20, color: '#a78bfa' },
          { label: '付费推广', value: 12, color: '#c4b5fd' },
          { label: '其他', value: 8, color: '#ddd6fe' },
        ],
        config: {
          showLegend: true,
          showGrid: false,
          showValues: false,
          colorScheme: COLOR_SCHEMES.default,
        },
        position: { x: 0, y: 1, w: 1, h: 1 },
      },
      // Widget 4: Metric card - 总收入
      {
        id: 'widget_ops_revenue_metric',
        type: 'metric',
        title: '总收入',
        data: [
          { label: '总收入', value: 1364000, change: 12.5 },
        ],
        config: {
          showLegend: false,
          showGrid: false,
          showValues: true,
          colorScheme: COLOR_SCHEMES.green,
        },
        position: { x: 1, y: 1, w: 1, h: 1 },
      },
      // Widget 5: Progress - 目标完成度
      {
        id: 'widget_ops_target_progress',
        type: 'progress',
        title: '季度目标完成度',
        data: [
          { label: '收入目标', value: 78, color: '#6366f1' },
          { label: '用户增长', value: 92, color: '#10b981' },
          { label: '留存率', value: 65, color: '#f59e0b' },
          { label: 'NPS评分', value: 85, color: '#06b6d4' },
        ],
        config: {
          showLegend: false,
          showGrid: false,
          showValues: true,
          colorScheme: COLOR_SCHEMES.default,
        },
        position: { x: 2, y: 1, w: 1, h: 1 },
      },
      // Widget 6: Area chart - 转化漏斗
      {
        id: 'widget_ops_conversion_area',
        type: 'area',
        title: '转化率趋势',
        data: [
          { label: '1月', value: 3.2 },
          { label: '2月', value: 3.5 },
          { label: '3月', value: 4.1 },
          { label: '4月', value: 3.8 },
          { label: '5月', value: 4.5 },
          { label: '6月', value: 4.9 },
          { label: '7月', value: 5.2 },
          { label: '8月', value: 5.0 },
        ],
        config: {
          showLegend: false,
          showGrid: true,
          showValues: false,
          colorScheme: COLOR_SCHEMES.warm,
        },
        position: { x: 3, y: 1, w: 1, h: 1 },
      },
    ],
  };

  // Dashboard 2: 用户分析 (5 widgets)
  const dashboard2: Dashboard = {
    id: 'dashboard_user_analysis',
    name: '用户分析',
    description: '用户行为与画像分析，了解用户特征与使用习惯',
    createdAt: now - 86400000 * 15,
    updatedAt: now,
    widgets: [
      // Widget 1: Pie chart - 用户设备分布
      {
        id: 'widget_user_device_pie',
        type: 'pie',
        title: '用户设备分布',
        data: [
          { label: 'iOS', value: 38, color: '#6366f1' },
          { label: 'Android', value: 42, color: '#10b981' },
          { label: '桌面端', value: 15, color: '#f59e0b' },
          { label: '平板', value: 5, color: '#ef4444' },
        ],
        config: {
          showLegend: true,
          showGrid: false,
          showValues: false,
          colorScheme: COLOR_SCHEMES.default,
        },
        position: { x: 0, y: 0, w: 1, h: 1 },
      },
      // Widget 2: Table - 活跃用户排行
      {
        id: 'widget_user_active_table',
        type: 'table',
        title: '活跃用户排行',
        data: [
          { label: '张明', value: 2850, change: 15.2 },
          { label: '李华', value: 2340, change: 8.7 },
          { label: '王芳', value: 2180, change: -3.1 },
          { label: '赵强', value: 1960, change: 22.4 },
          { label: '陈静', value: 1750, change: 5.6 },
          { label: '刘洋', value: 1620, change: -1.8 },
        ],
        config: {
          showLegend: false,
          showGrid: true,
          showValues: true,
          colorScheme: COLOR_SCHEMES.cool,
        },
        position: { x: 1, y: 0, w: 2, h: 1 },
      },
      // Widget 3: Metric - 新增用户
      {
        id: 'widget_user_new_metric',
        type: 'metric',
        title: '本月新增用户',
        data: [
          { label: '新增用户', value: 8640, change: 23.1 },
        ],
        config: {
          showLegend: false,
          showGrid: false,
          showValues: true,
          colorScheme: COLOR_SCHEMES.warm,
        },
        position: { x: 3, y: 0, w: 1, h: 1 },
      },
      // Widget 4: Bar chart - 用户留存率
      {
        id: 'widget_user_retention_bar',
        type: 'bar',
        title: '用户留存率',
        data: [
          { label: '次日留存', value: 68, color: '#6366f1' },
          { label: '3日留存', value: 52, color: '#8b5cf6' },
          { label: '7日留存', value: 41, color: '#a78bfa' },
          { label: '14日留存', value: 33, color: '#c4b5fd' },
          { label: '30日留存', value: 25, color: '#ddd6fe' },
        ],
        config: {
          showLegend: false,
          showGrid: true,
          showValues: true,
          colorScheme: COLOR_SCHEMES.default,
          maxValue: 100,
        },
        position: { x: 0, y: 1, w: 2, h: 1 },
      },
      // Widget 5: Line chart - 用户增长
      {
        id: 'widget_user_growth_line',
        type: 'line',
        title: '用户增长趋势',
        data: [
          { label: 'W1', value: 1200 },
          { label: 'W2', value: 1450 },
          { label: 'W3', value: 1680 },
          { label: 'W4', value: 1920 },
          { label: 'W5', value: 2100 },
          { label: 'W6', value: 2350 },
          { label: 'W7', value: 2580 },
          { label: 'W8', value: 2890 },
          { label: 'W9', value: 3120 },
          { label: 'W10', value: 3400 },
        ],
        config: {
          showLegend: false,
          showGrid: true,
          showValues: false,
          colorScheme: COLOR_SCHEMES.green,
        },
        position: { x: 2, y: 1, w: 2, h: 1 },
      },
    ],
  };

  return [dashboard1, dashboard2];
}

// ============================================================
// Store
// ============================================================

export const useDataVizStore = create<DataVizStore>()(
  persist(
    (set) => ({
      dashboards: generateMockDashboards(),
      activeDashboardId: 'dashboard_ops_overview',
      dateRange: '30d',
      refreshInterval: null,

      createDashboard: (name, description = '') => {
        const id = generateId();
        const now = Date.now();
        const newDashboard: Dashboard = {
          id,
          name,
          description,
          widgets: [],
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({
          dashboards: [...s.dashboards, newDashboard],
          activeDashboardId: id,
        }));
        return id;
      },

      deleteDashboard: (id) => {
        set((s) => {
          const remaining = s.dashboards.filter((d) => d.id !== id);
          return {
            dashboards: remaining,
            activeDashboardId:
              s.activeDashboardId === id
                ? remaining.length > 0
                  ? remaining[0].id
                  : null
                : s.activeDashboardId,
          };
        });
      },

      setActiveDashboard: (id) => {
        set({ activeDashboardId: id });
      },

      addWidget: (dashboardId, widget) => {
        const newWidget: Widget = {
          ...widget,
          id: generateId(),
        };
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === dashboardId
              ? { ...d, widgets: [...d.widgets, newWidget], updatedAt: Date.now() }
              : d
          ),
        }));
      },

      removeWidget: (dashboardId, widgetId) => {
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  widgets: d.widgets.filter((w) => w.id !== widgetId),
                  updatedAt: Date.now(),
                }
              : d
          ),
        }));
      },

      updateWidgetData: (dashboardId, widgetId, data) => {
        set((s) => ({
          dashboards: s.dashboards.map((d) =>
            d.id === dashboardId
              ? {
                  ...d,
                  widgets: d.widgets.map((w) =>
                    w.id === widgetId ? { ...w, data } : w
                  ),
                  updatedAt: Date.now(),
                }
              : d
          ),
        }));
      },

      setDateRange: (range) => {
        set({ dateRange: range });
      },

      setRefreshInterval: (interval) => {
        set({ refreshInterval: interval });
      },
    }),
    {
      name: 'ai-assistant-dataviz-store',
      partialize: (state) => ({
        dashboards: state.dashboards,
        activeDashboardId: state.activeDashboardId,
        dateRange: state.dateRange,
      }),
    }
  )
);
