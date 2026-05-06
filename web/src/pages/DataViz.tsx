import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import {
  useDataVizStore,
  COLOR_SCHEMES,
  type Widget,
  type WidgetType,
  type DataPoint,
  type DateRange,
} from '../store/useDataVizStore';

// ============================================================
// Utility helpers
// ============================================================

function formatNumber(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
}

function formatCurrency(n: number): string {
  if (n >= 10000) return '¥' + (n / 10000).toFixed(1) + '万';
  return '¥' + n.toLocaleString();
}

function generateSparklineData(value: number, points = 12): number[] {
  const base = value / (1 + (Math.random() * 0.3 - 0.1));
  return Array.from({ length: points }, (_, i) =>
    base + (value - base) * (i / (points - 1)) + (Math.random() - 0.5) * base * 0.15
  );
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================
// Widget type icon map
// ============================================================

const WIDGET_TYPE_ICONS: Record<WidgetType, JSX.Element> = {
  bar: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="6" width="4" height="15" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  ),
  line: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3,18 8,12 13,15 21,6" />
      <circle cx="3" cy="18" r="1.5" fill="currentColor" />
      <circle cx="8" cy="12" r="1.5" fill="currentColor" />
      <circle cx="13" cy="15" r="1.5" fill="currentColor" />
      <circle cx="21" cy="6" r="1.5" fill="currentColor" />
    </svg>
  ),
  pie: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2a10 10 0 1 0 10 10H12V2z" />
      <path d="M12 2a10 10 0 0 1 7.07 2.93L12 12V2z" opacity="0.6" />
      <path d="M19.07 4.93A10 10 0 0 1 22 12H12V2a10 10 0 0 1 7.07 2.93z" opacity="0.3" />
    </svg>
  ),
  donut: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="3">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  ),
  area: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" opacity="0.3">
      <path d="M3 20 L8 12 L13 16 L21 6 L21 20 Z" />
      <path d="M3 20 L8 12 L13 16 L21 6" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  ),
  metric: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      <text x="4" y="18" fontSize="16" fontWeight="bold" fill="currentColor" stroke="none">42</text>
      <polyline points="16,16 18,12 20,14 22,8" strokeWidth="1.5" />
    </svg>
  ),
  table: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  ),
  progress: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="4" rx="2" />
      <rect x="3" y="4" width="12" height="4" rx="2" fill="currentColor" />
      <rect x="3" y="12" width="18" height="4" rx="2" />
      <rect x="3" y="12" width="8" height="4" rx="2" fill="currentColor" />
      <rect x="3" y="20" width="18" height="0" rx="2" />
    </svg>
  ),
};

// ============================================================
// Bar Chart Widget (Pure CSS)
// ============================================================

function BarChartWidget({ widget }: { widget: Widget }) {
  const maxVal = widget.config.maxValue ?? Math.max(...widget.data.map((d) => d.value), 1);
  const colors = widget.config.colorScheme.length > 0 ? widget.config.colorScheme : COLOR_SCHEMES.default;

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex-1 flex items-end gap-2 min-h-[120px]">
        {widget.data.map((d, i) => {
          const pct = (d.value / maxVal) * 100;
          const color = d.color || colors[i % colors.length];
          return (
            <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
              {widget.config.showValues && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  {formatNumber(d.value)}
                </span>
              )}
              <motion.div
                className="w-full rounded-t-md min-h-[4px]"
                style={{ background: `linear-gradient(to top, ${color}, ${color}dd)` }}
                initial={{ height: 0 }}
                animate={{ height: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: 'easeOut' }}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 text-center truncate w-full">
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
      {widget.config.showGrid && (
        <div className="relative h-0 border-t border-gray-200 dark:border-gray-700 mt-1">
          <span className="absolute -top-3 -left-1 text-[10px] text-gray-400">0</span>
          <span className="absolute -top-3 right-0 text-[10px] text-gray-400">{formatNumber(maxVal)}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Line Chart Widget (SVG)
// ============================================================

function LineChartWidget({ widget }: { widget: Widget }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const colors = widget.config.colorScheme.length > 0 ? widget.config.colorScheme : COLOR_SCHEMES.cool;
  const color = colors[0];

  const width = 300;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...widget.data.map((d) => d.value), 1);
  const minVal = Math.min(...widget.data.map((d) => d.value), 0);

  const points = widget.data.map((d, i) => ({
    x: padding.left + (widget.data.length > 1 ? (i / (widget.data.length - 1)) * chartW : chartW / 2),
    y: padding.top + chartH - ((d.value - minVal) / (maxVal - minVal || 1)) * chartH,
    label: d.label,
    value: d.value,
  }));

  const polylineStr = points.map((p) => `${p.x},${p.y}`).join(' ');

  // Grid lines
  const gridLines = widget.config.showGrid ? [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const y = padding.top + chartH * (1 - frac);
    const val = minVal + (maxVal - minVal) * frac;
    return (
      <g key={frac}>
        <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
        <text x={padding.left - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
          {formatNumber(val)}
        </text>
      </g>
    );
  }) : null;

  return (
    <div className="w-full h-full relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        onMouseLeave={() => setTooltip(null)}
      >
        {gridLines}
        {/* X axis labels */}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - 6} textAnchor="middle" fontSize="9" fill="#9ca3af">
            {p.label}
          </text>
        ))}
        {/* Line */}
        <motion.polyline
          points={polylineStr}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <motion.circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="white"
              stroke={color}
              strokeWidth="2"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setTooltip({ x: p.x, y: p.y, label: p.label, value: p.value })}
            />
          </g>
        ))}
      </svg>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded-lg px-2 py-1 pointer-events-none z-10 shadow-lg"
          style={{
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100 - 10}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-medium">{tooltip.label}</div>
          <div>{formatNumber(tooltip.value)}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Pie Chart Widget (SVG stroke-dasharray)
// ============================================================

function PieChartWidget({ widget }: { widget: Widget }) {
  const colors = widget.config.colorScheme.length > 0 ? widget.config.colorScheme : COLOR_SCHEMES.default;
  const total = widget.data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="w-full h-full flex flex-col items-center">
      <svg viewBox="0 0 160 160" className="w-full max-w-[200px]">
        {widget.data.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const color = d.color || colors[i % colors.length];
          const currentOffset = offset;
          offset += dash;
          return (
            <motion.circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="30"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            />
          );
        })}
      </svg>
      {widget.config.showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
          {widget.data.map((d, i) => {
            const color = d.color || colors[i % colors.length];
            return (
              <div key={d.label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span>{d.label}</span>
                <span className="font-medium">{((d.value / total) * 100).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Donut Chart Widget (SVG)
// ============================================================

function DonutChartWidget({ widget }: { widget: Widget }) {
  const { t } = useTranslation();
  const colors = widget.config.colorScheme.length > 0 ? widget.config.colorScheme : COLOR_SCHEMES.default;
  const total = widget.data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;

  return (
    <div className="w-full h-full flex flex-col items-center">
      <svg viewBox="0 0 160 160" className="w-full max-w-[200px]">
        {widget.data.map((d, i) => {
          const pct = d.value / total;
          const dash = pct * circumference;
          const gap = circumference - dash;
          const color = d.color || colors[i % colors.length];
          const currentOffset = offset;
          offset += dash;
          return (
            <motion.circle
              key={d.label}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth="24"
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              transform={`rotate(-90 ${cx} ${cy})`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            />
          );
        })}
        {/* Center text */}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="bold" fill="#374151" className="dark:fill-gray-200">
          {formatNumber(total)}
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="10" fill="#9ca3af">
          {t('dataViz.total')}
        </text>
      </svg>
      {widget.config.showLegend && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 justify-center">
          {widget.data.map((d, i) => {
            const color = d.color || colors[i % colors.length];
            return (
              <div key={d.label} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                <span>{d.label}</span>
                <span className="font-medium">{((d.value / total) * 100).toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Metric Card Widget
// ============================================================

function MetricCardWidget({ widget }: { widget: Widget }) {
  const { t } = useTranslation();
  const point = widget.data[0];
  if (!point) return null;

  const isPositive = (point.change ?? 0) >= 0;
  const sparkData = useMemo(() => generateSparklineData(point.value), [point.value]);
  const sparkMin = Math.min(...sparkData);
  const sparkMax = Math.max(...sparkData);
  const sparkRange = sparkMax - sparkMin || 1;

  const sparkPoints = sparkData
    .map((v, i) => `${(i / (sparkData.length - 1)) * 100},${100 - ((v - sparkMin) / sparkRange) * 80 - 10}`)
    .join(' ');

  const colors = widget.config.colorScheme.length > 0 ? widget.config.colorScheme : COLOR_SCHEMES.green;
  const sparkColor = colors[0];

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{widget.title}</p>
        <motion.p
          className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-purple-600 bg-clip-text text-transparent"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {formatCurrency(point.value)}
        </motion.p>
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-1">
          <span
            className={`inline-flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
              isPositive
                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}
          >
            {isPositive ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
            {Math.abs(point.change ?? 0).toFixed(1)}%
          </span>
          <span className="text-xs text-gray-400">{t('dataViz.comparedTo')}</span>
        </div>
        <svg viewBox="0 0 100 100" className="w-20 h-10">
          <motion.polyline
            points={sparkPoints}
            fill="none"
            stroke={sparkColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </svg>
      </div>
    </div>
  );
}

// ============================================================
// Progress Widget
// ============================================================

function ProgressWidget({ widget }: { widget: Widget }) {
  const colors = widget.config.colorScheme.length > 0 ? widget.config.colorScheme : COLOR_SCHEMES.default;

  return (
    <div className="w-full h-full flex flex-col justify-center gap-3">
      {widget.data.map((d, i) => {
        const color = d.color || colors[i % colors.length];
        return (
          <div key={d.label}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{d.label}</span>
              {widget.config.showValues && (
                <span className="text-xs font-bold" style={{ color }}>
                  {d.value}%
                </span>
              )}
            </div>
            <div className="w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${color}, ${color}aa)`,
                }}
                initial={{ width: 0 }}
                animate={{ width: `${d.value}%` }}
                transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
// Table Widget
// ============================================================

function TableWidget({ widget }: { widget: Widget }) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<'label' | 'value'>('value');
  const [sortAsc, setSortAsc] = useState(false);

  const sorted = useMemo(() => {
    return [...widget.data].sort((a, b) => {
      const mul = sortAsc ? 1 : -1;
      if (sortKey === 'label') return mul * a.label.localeCompare(b.label);
      return mul * (a.value - b.value);
    });
  }, [widget.data, sortKey, sortAsc]);

  const handleSort = (key: 'label' | 'value') => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  return (
    <div className="w-full h-full overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            <th
              className="text-left py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
              onClick={() => handleSort('label')}
            >
              {t('dataViz.label')}
              {sortKey === 'label' && <span className="ml-1">{sortAsc ? '\u2191' : '\u2193'}</span>}
            </th>
            <th
              className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 select-none"
              onClick={() => handleSort('value')}
            >
              {t('dataViz.value')}
              {sortKey === 'value' && <span className="ml-1">{sortAsc ? '\u2191' : '\u2193'}</span>}
            </th>
            {widget.data.some((d) => d.change !== undefined) && (
              <th className="text-right py-2 px-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t('dataViz.trend')}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((d, i) => (
            <motion.tr
              key={d.label}
              className={`border-b border-gray-100 dark:border-gray-800 ${
                i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'
              }`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
            >
              <td className="py-2 px-3 font-medium text-gray-700 dark:text-gray-300">{d.label}</td>
              <td className="py-2 px-3 text-right text-gray-600 dark:text-gray-400">{formatNumber(d.value)}</td>
              {d.change !== undefined && (
                <td className="py-2 px-3 text-right">
                  <span
                    className={`text-xs font-medium ${
                      d.change >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {d.change >= 0 ? '+' : ''}{d.change.toFixed(1)}%
                  </span>
                </td>
              )}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// Area Chart Widget (SVG with gradient fill)
// ============================================================

function AreaChartWidget({ widget }: { widget: Widget }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null);
  const colors = widget.config.colorScheme.length > 0 ? widget.config.colorScheme : COLOR_SCHEMES.warm;
  const color = colors[0];

  const width = 300;
  const height = 180;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const maxVal = Math.max(...widget.data.map((d) => d.value), 1);
  const minVal = Math.min(...widget.data.map((d) => d.value), 0);

  const points = widget.data.map((d, i) => ({
    x: padding.left + (widget.data.length > 1 ? (i / (widget.data.length - 1)) * chartW : chartW / 2),
    y: padding.top + chartH - ((d.value - minVal) / (maxVal - minVal || 1)) * chartH,
    label: d.label,
    value: d.value,
  }));

  const lineStr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const areaStr = `${lineStr} ${points[points.length - 1].x},${padding.top + chartH} ${points[0].x},${padding.top + chartH}`;

  const gridLines = widget.config.showGrid ? [0, 0.25, 0.5, 0.75, 1].map((frac) => {
    const y = padding.top + chartH * (1 - frac);
    const val = minVal + (maxVal - minVal) * frac;
    return (
      <g key={frac}>
        <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e5e7eb" strokeWidth="0.5" />
        <text x={padding.left - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#9ca3af">
          {formatNumber(val)}
        </text>
      </g>
    );
  }) : null;

  return (
    <div className="w-full h-full relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
        onMouseLeave={() => setTooltip(null)}
      >
        <defs>
          <linearGradient id={`areaGrad-${widget.id}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {gridLines}
        {points.map((p, i) => (
          <text key={i} x={p.x} y={height - 6} textAnchor="middle" fontSize="9" fill="#9ca3af">
            {p.label}
          </text>
        ))}
        {/* Area fill */}
        <motion.polygon
          points={areaStr}
          fill={`url(#areaGrad-${widget.id})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        />
        {/* Line */}
        <motion.polyline
          points={lineStr}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: 'easeInOut' }}
        />
        {/* Dots */}
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="3.5"
            fill="white"
            stroke={color}
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, label: p.label, value: p.value })}
          />
        ))}
      </svg>
      {tooltip && (
        <div
          className="absolute bg-gray-900 text-white text-xs rounded-lg px-2 py-1 pointer-events-none z-10 shadow-lg"
          style={{
            left: `${(tooltip.x / width) * 100}%`,
            top: `${(tooltip.y / height) * 100 - 10}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="font-medium">{tooltip.label}</div>
          <div>{formatNumber(tooltip.value)}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Widget Renderer
// ============================================================

function WidgetRenderer({ widget }: { widget: Widget }) {
  switch (widget.type) {
    case 'bar':
      return <BarChartWidget widget={widget} />;
    case 'line':
      return <LineChartWidget widget={widget} />;
    case 'pie':
      return <PieChartWidget widget={widget} />;
    case 'donut':
      return <DonutChartWidget widget={widget} />;
    case 'metric':
      return <MetricCardWidget widget={widget} />;
    case 'progress':
      return <ProgressWidget widget={widget} />;
    case 'table':
      return <TableWidget widget={widget} />;
    case 'area':
      return <AreaChartWidget widget={widget} />;
    default:
      return <div className="text-gray-400 text-sm">Unknown widget type</div>;
  }
}

// ============================================================
// Widget Card
// ============================================================

function WidgetCard({
  widget,
  onRemove,
  onFullscreen,
}: {
  widget: Widget;
  onRemove: () => void;
  onFullscreen: () => void;
}) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  return (
    <motion.div
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      layout
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{widget.title}</h3>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          <AnimatePresence>
            {showMenu && (
              <motion.div
                className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 z-20 min-w-[140px]"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.15 }}
              >
                <button
                  onClick={() => { onFullscreen(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  {t('dataViz.fullscreen')}
                </button>
                <button
                  onClick={() => { onRemove(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  {t('dataViz.deleteWidget')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {/* Body */}
      <div className="p-4 flex-1 min-h-[180px]">
        <WidgetRenderer widget={widget} />
      </div>
    </motion.div>
  );
}

// ============================================================
// Fullscreen Widget Modal
// ============================================================

function FullscreenWidgetModal({
  widget,
  onClose,
}: {
  widget: Widget;
  onClose: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{widget.title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-6 min-h-[400px]">
          <WidgetRenderer widget={widget} />
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Add Widget Modal
// ============================================================

function AddWidgetModal({
  onAdd,
  onClose,
}: {
  onAdd: (type: WidgetType, title: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<WidgetType | null>(null);
  const [title, setTitle] = useState('');

  const widgetTypes: WidgetType[] = ['bar', 'line', 'pie', 'donut', 'area', 'metric', 'progress', 'table'];

  const handleAdd = () => {
    if (selectedType && title.trim()) {
      onAdd(selectedType, title.trim());
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('dataViz.addWidget')}</h2>
        </div>
        <div className="p-6 space-y-4">
          {/* Widget type grid */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('dataViz.widgetType.bar')} / {t('dataViz.data')}
            </label>
            <div className="grid grid-cols-4 gap-3">
              {widgetTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                    selectedType === type
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {WIDGET_TYPE_ICONS[type]}
                  <span className="text-xs font-medium">{t(`dataViz.widgetType.${type}`)}</span>
                </button>
              ))}
            </div>
          </div>
          {/* Title input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('dataViz.widgetTitle')}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('dataViz.widgetTitle')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('dataViz.cancel')}
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedType || !title.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {t('dataViz.save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Header Stats Row
// ============================================================

function HeaderStats() {
  const { t } = useTranslation();

  const stats = [
    {
      label: t('dataViz.totalRevenue'),
      value: '¥136.4万',
      change: '+12.5%',
      positive: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
    },
    {
      label: t('dataViz.totalUsers'),
      value: '28,640',
      change: '+23.1%',
      positive: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      color: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
    },
    {
      label: t('dataViz.conversionRate'),
      value: '5.2%',
      change: '+0.8%',
      positive: true,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      color: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    },
    {
      label: t('dataViz.avgSession'),
      value: '4m 32s',
      change: '-0.5%',
      positive: false,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.label}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm hover:shadow-md transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: i * 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color}`}>
              {stat.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{stat.label}</p>
              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">{stat.value}</p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                stat.positive
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}
            >
              {stat.change}
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================
// New Dashboard Modal
// ============================================================

function NewDashboardModal({
  onCreate,
  onClose,
}: {
  onCreate: (name: string, desc: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100">{t('dataViz.newDashboard')}</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('dataViz.dashboardName')}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('dataViz.dashboardName')}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('dataViz.dashboardDesc')}
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder={t('dataViz.dashboardDesc')}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t('dataViz.cancel')}
          </button>
          <button
            onClick={() => { if (name.trim()) onCreate(name.trim(), desc.trim()); }}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {t('dataViz.save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Default mock data generators for new widgets
// ============================================================

function generateDefaultData(type: WidgetType): DataPoint[] {
  switch (type) {
    case 'bar':
      return [
        { label: 'A', value: 65 }, { label: 'B', value: 45 },
        { label: 'C', value: 80 }, { label: 'D', value: 55 },
        { label: 'E', value: 70 }, { label: 'F', value: 90 },
      ];
    case 'line':
      return [
        { label: 'Mon', value: 120 }, { label: 'Tue', value: 180 },
        { label: 'Wed', value: 150 }, { label: 'Thu', value: 210 },
        { label: 'Fri', value: 190 }, { label: 'Sat', value: 250 },
        { label: 'Sun', value: 220 },
      ];
    case 'pie':
    case 'donut':
      return [
        { label: 'Cat A', value: 35 }, { label: 'Cat B', value: 25 },
        { label: 'Cat C', value: 20 }, { label: 'Cat D', value: 12 },
        { label: 'Cat E', value: 8 },
      ];
    case 'area':
      return [
        { label: 'Jan', value: 30 }, { label: 'Feb', value: 45 },
        { label: 'Mar', value: 55 }, { label: 'Apr', value: 40 },
        { label: 'May', value: 65 }, { label: 'Jun', value: 75 },
      ];
    case 'metric':
      return [{ label: 'Metric', value: 10000, change: 15.3 }];
    case 'progress':
      return [
        { label: 'Task A', value: 75 }, { label: 'Task B', value: 60 },
        { label: 'Task C', value: 90 }, { label: 'Task D', value: 45 },
      ];
    case 'table':
      return [
        { label: 'Item 1', value: 1200, change: 10.5 },
        { label: 'Item 2', value: 980, change: -3.2 },
        { label: 'Item 3', value: 870, change: 7.8 },
        { label: 'Item 4', value: 650, change: -1.5 },
        { label: 'Item 5', value: 540, change: 12.1 },
      ];
    default:
      return [];
  }
}

// ============================================================
// Main DataViz Page
// ============================================================

export default function DataViz() {
  const { t } = useTranslation();
  const {
    dashboards,
    activeDashboardId,
    dateRange,
    createDashboard,
    deleteDashboard,
    setActiveDashboard,
    addWidget,
    removeWidget,
    setDateRange,
  } = useDataVizStore();

  const [showAddWidget, setShowAddWidget] = useState(false);
  const [showNewDashboard, setShowNewDashboard] = useState(false);
  const [fullscreenWidget, setFullscreenWidget] = useState<Widget | null>(null);
  const [showDashMenu, setShowDashMenu] = useState(false);
  const dashMenuRef = useRef<HTMLDivElement>(null);

  const activeDashboard = useMemo(
    () => dashboards.find((d) => d.id === activeDashboardId) ?? null,
    [dashboards, activeDashboardId]
  );

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dashMenuRef.current && !dashMenuRef.current.contains(e.target as Node)) {
        setShowDashMenu(false);
      }
    };
    if (showDashMenu) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showDashMenu]);

  const handleAddWidget = useCallback(
    (type: WidgetType, title: string) => {
      if (!activeDashboardId) return;
      addWidget(activeDashboardId, {
        type,
        title,
        data: generateDefaultData(type),
        config: {
          showLegend: type === 'pie' || type === 'donut',
          showGrid: type !== 'pie' && type !== 'donut' && type !== 'metric' && type !== 'progress',
          showValues: type === 'bar' || type === 'progress' || type === 'metric',
          colorScheme: COLOR_SCHEMES.default,
        },
        position: { x: 0, y: 0, w: 1, h: 1 },
      });
      setShowAddWidget(false);
    },
    [activeDashboardId, addWidget]
  );

  const handleCreateDashboard = useCallback(
    (name: string, desc: string) => {
      createDashboard(name, desc);
      setShowNewDashboard(false);
    },
    [createDashboard]
  );

  const handleExportCSV = useCallback(() => {
    if (!activeDashboard) return;
    let csv = '';
    activeDashboard.widgets.forEach((w) => {
      csv += `\n"${w.title}" (${w.type})\n`;
      if (w.type === 'table' || w.type === 'bar') {
        csv += `"${t('dataViz.label')}","${t('dataViz.value')}"\n`;
        w.data.forEach((d) => {
          csv += `"${d.label}",${d.value}\n`;
        });
      } else {
        w.data.forEach((d) => {
          csv += `"${d.label}",${d.value}\n`;
        });
      }
    });
    downloadCSV(csv, `${activeDashboard.name}_${new Date().toISOString().slice(0, 10)}.csv`);
  }, [activeDashboard, t]);

  const dateRanges: { key: DateRange; label: string }[] = [
    { key: '7d', label: t('dataViz.dateRange.7d') },
    { key: '30d', label: t('dataViz.dateRange.30d') },
    { key: '90d', label: t('dataViz.dateRange.90d') },
    { key: '1y', label: t('dataViz.dateRange.1y') },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-violet-500 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <motion.h1
                className="text-2xl sm:text-3xl font-bold"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {t('dataViz.title')}
              </motion.h1>
              <p className="text-violet-200 mt-1 text-sm">
                {activeDashboard?.description || ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Export */}
              <button
                onClick={handleExportCSV}
                disabled={!activeDashboard}
                className="px-3 py-2 text-sm font-medium bg-white/20 hover:bg-white/30 rounded-lg transition-colors backdrop-blur-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {t('dataViz.export')}
              </button>
              {/* New Dashboard */}
              <button
                onClick={() => setShowNewDashboard(true)}
                className="px-3 py-2 text-sm font-medium bg-white text-violet-600 hover:bg-violet-50 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t('dataViz.newDashboard')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Controls row */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Dashboard selector */}
          <div className="relative" ref={dashMenuRef}>
            <button
              onClick={() => setShowDashMenu(!showDashMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              {activeDashboard?.name || t('dataViz.noDashboards')}
              <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <AnimatePresence>
              {showDashMenu && (
                <motion.div
                  className="absolute left-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 z-20 min-w-[200px]"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                >
                  {dashboards.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => { setActiveDashboard(d.id); setShowDashMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between ${
                        d.id === activeDashboardId
                          ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className="truncate">{d.name}</span>
                      {d.id === activeDashboardId && (
                        <svg className="w-4 h-4 text-violet-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  ))}
                  {dashboards.length > 0 && (
                    <div className="border-t border-gray-100 dark:border-gray-700 mt-1 pt-1">
                      <button
                        onClick={() => {
                          if (activeDashboardId) {
                            if (window.confirm(t('dataViz.confirmDelete'))) {
                              deleteDashboard(activeDashboardId);
                            }
                          }
                          setShowDashMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        {t('dataViz.deleteDashboard')}
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Date range picker */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-sm">
            {dateRanges.map((dr) => (
              <button
                key={dr.key}
                onClick={() => setDateRange(dr.key)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                  dateRange === dr.key
                    ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {dr.label}
              </button>
            ))}
          </div>
        </div>

        {/* Header stats */}
        <HeaderStats />

        {/* Widget grid */}
        {activeDashboard && activeDashboard.widgets.length > 0 ? (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                {activeDashboard.name}
              </h2>
              <button
                onClick={() => setShowAddWidget(true)}
                className="px-3 py-1.5 text-sm font-medium text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t('dataViz.addWidget')}
              </button>
            </div>
            <motion.div
              className="grid gap-4"
              style={{
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              }}
            >
              {activeDashboard.widgets.map((widget, i) => (
                <motion.div
                  key={widget.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <WidgetCard
                    widget={widget}
                    onRemove={() => {
                      if (window.confirm(t('dataViz.confirmDelete'))) {
                        removeWidget(activeDashboard.id, widget.id);
                      }
                    }}
                    onFullscreen={() => setFullscreenWidget(widget)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </>
        ) : activeDashboard ? (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('common.noData')}</p>
            <button
              onClick={() => setShowAddWidget(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-sm"
            >
              {t('dataViz.addWidget')}
            </button>
          </motion.div>
        ) : (
          <motion.div
            className="text-center py-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <svg className="w-8 h-8 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-4">{t('dataViz.noDashboards')}</p>
            <button
              onClick={() => setShowNewDashboard(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg hover:from-violet-600 hover:to-purple-700 transition-all shadow-sm"
            >
              {t('dataViz.createFirst')}
            </button>
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddWidget && (
          <AddWidgetModal onAdd={handleAddWidget} onClose={() => setShowAddWidget(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showNewDashboard && (
          <NewDashboardModal onCreate={handleCreateDashboard} onClose={() => setShowNewDashboard(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {fullscreenWidget && (
          <FullscreenWidgetModal
            widget={fullscreenWidget}
            onClose={() => setFullscreenWidget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
