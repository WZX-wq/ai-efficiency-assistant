import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  RefreshCw,
  AlertTriangle,
  Bell,
  Server,
  Terminal,
  X,
  CheckCircle,
  Play,
  Square,
  RotateCcw,
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap,
  Shield,
  Globe,
  Database,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import useSystemMonitorStore, {
  Process,
  Alert,
  TimeRange,
} from '../store/useSystemMonitorStore';

// ========== Utility Functions ==========

const formatBytes = (gb: number): string => `${gb.toFixed(1)} GB`;

const formatSpeed = (mbps: number): string => `${mbps.toFixed(1)} MB/s`;

const getSeverityColor = (severity: Alert['severity']): string => {
  switch (severity) {
    case 'critical':
      return 'text-red-500 bg-red-500/10 border-red-500/30';
    case 'warning':
      return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
    default:
      return 'text-blue-500 bg-blue-500/10 border-blue-500/30';
  }
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'running':
      return 'text-emerald-400 bg-emerald-400/10';
    case 'stopped':
      return 'text-slate-400 bg-slate-400/10';
    case 'error':
      return 'text-red-400 bg-red-400/10';
    default:
      return 'text-slate-400 bg-slate-400/10';
  }
};

const getUsageColor = (usage: number): string => {
  if (usage >= 80) return 'text-red-400';
  if (usage >= 60) return 'text-amber-400';
  return 'text-emerald-400';
};

// ========== Chart Components ==========

const LineChart: React.FC<{
  data: number[];
  color?: string;
  fill?: boolean;
}> = ({ data, color = '#10b981', fill = false }) => {
  const max = Math.max(...data, 100);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const pathD = `M 0,${100 - ((data[0] - min) / range) * 100} L ${points}`;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      {fill && (
        <path
          d={`${pathD} L 100,100 L 0,100 Z`}
          fill={`url(#gradient-${color.replace('#', '')})`}
        />
      )}
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

const DualLineChart: React.FC<{
  upData: number[];
  downData: number[];
}> = ({ upData, downData }) => {
  const allData = [...upData, ...downData];
  const max = Math.max(...allData, 10);
  const min = 0;
  const range = max - min || 1;

  const upPoints = upData.map((value, index) => {
    const x = (index / (upData.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const downPoints = downData.map((value, index) => {
    const x = (index / (downData.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <polyline
        points={upPoints}
        fill="none"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <polyline
        points={downPoints}
        fill="none"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

const GaugeChart: React.FC<{ value: number; size?: number }> = ({ value, size = 80 }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference * 0.75;
  const color = value >= 80 ? '#ef4444' : value >= 60 ? '#f59e0b' : '#10b981';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1e293b"
        strokeWidth="6"
        strokeDasharray={`${circumference * 0.75} ${circumference}`}
        strokeDashoffset={-circumference * 0.125}
        transform={`rotate(135 ${size / 2} ${size / 2})`}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={`${circumference * 0.75} ${circumference}`}
        strokeDashoffset={-circumference * 0.125}
        strokeLinecap="round"
        transform={`rotate(135 ${size / 2} ${size / 2})`}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text
        x={size / 2}
        y={size / 2 + 5}
        textAnchor="middle"
        fill={color}
        fontSize="16"
        fontWeight="bold"
      >
        {Math.round(value)}%
      </text>
    </svg>
  );
};

const DonutChart: React.FC<{ value: number; size?: number }> = ({ value, size = 80 }) => {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  const color = value >= 80 ? '#ef4444' : value >= 60 ? '#f59e0b' : '#10b981';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1e293b"
        strokeWidth="8"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
      <text
        x={size / 2}
        y={size / 2 + 5}
        textAnchor="middle"
        fill={color}
        fontSize="14"
        fontWeight="bold"
      >
        {Math.round(value)}%
      </text>
    </svg>
  );
};

const BarChart: React.FC<{ value: number; max?: number }> = ({ value, max = 100 }) => {
  const percentage = Math.min(100, (value / max) * 100);
  const color = percentage >= 80 ? 'bg-red-500' : percentage >= 60 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="w-full h-3 bg-slate-700/50 rounded-full overflow-hidden">
      <motion.div
        className={`h-full ${color} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      />
    </div>
  );
};

// ========== Sub-Components ==========

const MetricCard: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, children, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5 ${className}`}
  >
    <div className="flex items-center gap-2 mb-4">
      <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-600/20 text-emerald-400">
        {icon}
      </div>
      <h3 className="text-slate-300 font-medium">{title}</h3>
    </div>
    {children}
  </motion.div>
);

const ProcessTable: React.FC = () => {
  const { t } = useTranslation();
  const { metrics, killProcess } = useSystemMonitorStore();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof Process>('cpu');
  const [sortDesc, setSortDesc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filteredProcesses = useMemo(() => {
    return metrics.processes.filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.user.toLowerCase().includes(search.toLowerCase()) ||
        p.pid.toString().includes(search)
    );
  }, [metrics.processes, search]);

  const sortedProcesses = useMemo(() => {
    return [...filteredProcesses].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDesc ? bVal - aVal : aVal - bVal;
      }
      return sortDesc
        ? String(bVal).localeCompare(String(aVal))
        : String(aVal).localeCompare(String(bVal));
    });
  }, [filteredProcesses, sortKey, sortDesc]);

  const paginatedProcesses = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedProcesses.slice(start, start + pageSize);
  }, [sortedProcesses, page]);

  const totalPages = Math.ceil(sortedProcesses.length / pageSize);

  const handleSort = (key: keyof Process) => {
    if (sortKey === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h3 className="text-slate-200 font-medium flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          {t('systemMonitor.processes')}
        </h3>
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-900/50">
            <tr>
              {[
                { key: 'pid', label: t('systemMonitor.pid') },
                { key: 'name', label: t('systemMonitor.processName') },
                { key: 'cpu', label: 'CPU %' },
                { key: 'memory', label: t('systemMonitor.memory') },
                { key: 'status', label: t('systemMonitor.status') },
                { key: 'user', label: t('systemMonitor.user') },
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as keyof Process)}
                  className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortKey === key && (
                      <span className="text-emerald-400">{sortDesc ? '↓' : '↑'}</span>
                    )}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                {t('common.action')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {paginatedProcesses.map((process) => (
              <motion.tr
                key={process.pid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="hover:bg-slate-700/20 transition-colors"
              >
                <td className="px-4 py-3 text-sm text-slate-400">{process.pid}</td>
                <td className="px-4 py-3 text-sm text-slate-200 font-medium">{process.name}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={getUsageColor(process.cpu)}>{process.cpu.toFixed(1)}%</span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-300">{process.memory.toFixed(0)} MB</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                      process.status
                    )}`}
                  >
                    {process.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-slate-400">{process.user}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => killProcess(process.pid)}
                    className="text-xs px-3 py-1.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    {t('systemMonitor.killProcess')}
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-700/50 flex items-center justify-between">
        <span className="text-sm text-slate-400">
          {filteredProcesses.length} {t('common.total')}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-300">
            {page} / {totalPages || 1}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-1.5 rounded-lg bg-slate-700/50 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const ServicesGrid: React.FC = () => {
  const { t } = useTranslation();
  const { metrics, toggleService, restartService } = useSystemMonitorStore();
  const [viewingLogs, setViewingLogs] = useState<string | null>(null);

  const mockLogs = [
    '[2024-01-15 10:23:45] Service started successfully',
    '[2024-01-15 10:23:46] Loading configuration...',
    '[2024-01-15 10:23:47] Connected to database',
    '[2024-01-15 10:24:12] Health check passed',
    '[2024-01-15 10:25:01] Processing request batch #1234',
    '[2024-01-15 10:25:30] Request completed in 45ms',
    '[2024-01-15 10:26:15] Health check passed',
  ];

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-slate-200 font-medium flex items-center gap-2">
          <Server className="w-5 h-5 text-emerald-400" />
          {t('systemMonitor.services')}
        </h3>
      </div>

      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {metrics.services.map((service) => (
          <motion.div
            key={service.name}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4 hover:border-slate-600/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-slate-200 font-medium capitalize">{service.name}</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      service.status === 'running'
                        ? 'bg-emerald-400'
                        : service.status === 'error'
                        ? 'bg-red-400'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-xs text-slate-400">{service.uptime}</span>
                </div>
              </div>
              <span
                className={`text-xs px-2 py-1 rounded ${getStatusColor(service.status)}`}
              >
                {service.status}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleService(service.name)}
                className={`flex-1 py-1.5 px-3 rounded text-xs font-medium transition-colors ${
                  service.status === 'running'
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                }`}
              >
                {service.status === 'running' ? (
                  <span className="flex items-center justify-center gap-1">
                    <Square className="w-3 h-3" /> {t('systemMonitor.stop')}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1">
                    <Play className="w-3 h-3" /> {t('systemMonitor.start')}
                  </span>
                )}
              </button>
              <button
                onClick={() => restartService(service.name)}
                className="p-1.5 rounded bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                title={t('systemMonitor.restart')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewingLogs(service.name)}
                className="p-1.5 rounded bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
                title={t('systemMonitor.viewLogs')}
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {viewingLogs && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setViewingLogs(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h4 className="text-slate-200 font-medium">
                  {viewingLogs} - {t('systemMonitor.viewLogs')}
                </h4>
                <button
                  onClick={() => setViewingLogs(null)}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 bg-slate-950 font-mono text-sm overflow-auto max-h-[60vh]">
                {mockLogs.map((log, i) => (
                  <div key={i} className="text-slate-400 py-0.5">
                    <span className="text-emerald-500">{log.split(']')[0]}]</span>
                    <span className="text-slate-300">{log.split(']').slice(1).join(']')}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AlertsPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const { alerts, acknowledgeAlert, clearAlerts } = useSystemMonitorStore();

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700 z-50 flex flex-col"
          >
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Bell className="w-5 h-5 text-emerald-400" />
                  {unacknowledgedCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-medium">
                      {unacknowledgedCount}
                    </span>
                  )}
                </div>
                <h3 className="text-slate-200 font-medium">{t('systemMonitor.alerts')}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearAlerts}
                  className="text-xs px-3 py-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {t('systemMonitor.clearAlerts')}
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>{t('systemMonitor.noAlerts')}</p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} ${
                      alert.acknowledged ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium capitalize">{alert.type}</span>
                      </div>
                      <span className="text-xs opacity-70">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm mb-3 opacity-90">{alert.message}</p>
                    {!alert.acknowledged && (
                      <button
                        onClick={() => acknowledgeAlert(alert.id)}
                        className="text-xs px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        {t('systemMonitor.acknowledge')}
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ========== Main Component ==========

const SystemMonitor: React.FC = () => {
  const { t } = useTranslation();
  const {
    metrics,
    alerts,
    timeRange,
    isSimulating,
    systemInfo,
    setTimeRange,
    refreshMetrics,
    startSimulation,
    stopSimulation,
  } = useSystemMonitorStore();

  const [alertsOpen, setAlertsOpen] = useState(false);

  useEffect(() => {
    startSimulation();
    return () => {
      stopSimulation();
    };
  }, [startSimulation, stopSimulation]);

  const timeRanges: { value: TimeRange; label: string }[] = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '24h', label: '24h' },
  ];

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/20">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{t('systemMonitor.title')}</h1>
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  {t('systemMonitor.realtime')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Time Range Selector */}
              <div className="flex items-center bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
                {timeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => setTimeRange(range.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                      timeRange === range.value
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                onClick={refreshMetrics}
                className="p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all"
              >
                <RefreshCw className={`w-5 h-5 ${isSimulating ? 'animate-spin' : ''}`} />
              </button>

              {/* Alerts Button */}
              <button
                onClick={() => setAlertsOpen(true)}
                className="relative p-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-all"
              >
                <Bell className="w-5 h-5" />
                {unacknowledgedAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white font-medium">
                    {unacknowledgedAlerts}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Overview Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU Card */}
          <MetricCard title={t('systemMonitor.cpu')} icon={<Cpu className="w-5 h-5" />}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white">{metrics.cpu.usage.toFixed(1)}%</div>
                <div className="text-xs text-slate-400">
                  {metrics.cpu.cores} {t('systemMonitor.cores')} · {metrics.cpu.temperature}°C
                </div>
              </div>
              <GaugeChart value={metrics.cpu.usage} size={80} />
            </div>
          </MetricCard>

          {/* Memory Card */}
          <MetricCard title={t('systemMonitor.memory')} icon={<MemoryStick className="w-5 h-5" />}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {metrics.memory.usagePercent.toFixed(0)}%
                </span>
                <span className="text-xs text-slate-400">
                  {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                </span>
              </div>
              <BarChart value={metrics.memory.usagePercent} />
              <div className="flex justify-between text-xs text-slate-500">
                <span>{t('systemMonitor.used')}: {formatBytes(metrics.memory.used)}</span>
                <span>{t('systemMonitor.free')}: {formatBytes(metrics.memory.free)}</span>
              </div>
            </div>
          </MetricCard>

          {/* Disk Card */}
          <MetricCard title={t('systemMonitor.disk')} icon={<HardDrive className="w-5 h-5" />}>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-white">
                  {metrics.disk.usagePercent.toFixed(0)}%
                </div>
                <div className="text-xs text-slate-400">
                  {formatBytes(metrics.disk.used)} / {formatBytes(metrics.disk.total)}
                </div>
              </div>
              <DonutChart value={metrics.disk.usagePercent} size={80} />
            </div>
          </MetricCard>

          {/* Network Card */}
          <MetricCard title={t('systemMonitor.network')} icon={<Network className="w-5 h-5" />}>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-sm text-slate-300">{t('systemMonitor.download')}</span>
                  <span className="text-emerald-400 font-medium">
                    {formatSpeed(metrics.network.download)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-sm text-slate-300">{t('systemMonitor.upload')}</span>
                  <span className="text-amber-400 font-medium">
                    {formatSpeed(metrics.network.upload)}
                  </span>
                </div>
              </div>
              <div className="h-12">
                <DualLineChart
                  upData={metrics.network.history.up.slice(-20)}
                  downData={metrics.network.history.down.slice(-20)}
                />
              </div>
              <div className="text-xs text-slate-500 text-right">
                {t('systemMonitor.latency')}: {metrics.network.latency.toFixed(0)}ms
              </div>
            </div>
          </MetricCard>
        </section>

        {/* Charts Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* CPU History */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-300 font-medium flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                {t('systemMonitor.cpu')} {t('systemMonitor.history')}
              </h3>
              <span className="text-xs text-slate-500">{t('systemMonitor.realtime')}</span>
            </div>
            <div className="h-40">
              <LineChart data={metrics.cpu.history} color="#10b981" />
            </div>
          </div>

          {/* Memory History */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-300 font-medium flex items-center gap-2">
                <MemoryStick className="w-4 h-4 text-blue-400" />
                {t('systemMonitor.memory')} {t('systemMonitor.history')}
              </h3>
              <span className="text-xs text-slate-500">{t('systemMonitor.realtime')}</span>
            </div>
            <div className="h-40">
              <LineChart data={metrics.memory.history} color="#3b82f6" fill />
            </div>
          </div>

          {/* Network History */}
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-slate-300 font-medium flex items-center gap-2">
                <Network className="w-4 h-4 text-purple-400" />
                {t('systemMonitor.network')} {t('systemMonitor.history')}
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> {t('systemMonitor.download')}
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> {t('systemMonitor.upload')}
                </span>
              </div>
            </div>
            <div className="h-40">
              <DualLineChart
                upData={metrics.network.history.up}
                downData={metrics.network.history.down}
              />
            </div>
          </div>
        </section>

        {/* Processes & Services */}
        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <ProcessTable />
          <ServicesGrid />
        </section>

        {/* Disk Partitions */}
        <section className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-700/50">
            <h3 className="text-slate-200 font-medium flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-400" />
              {t('systemMonitor.partitions')}
            </h3>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {metrics.disk.partitions.map((partition) => (
              <div
                key={partition.name}
                className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-200 font-medium">{partition.name}</span>
                  <span className="text-xs text-slate-400">{partition.mount}</span>
                </div>
                <BarChart value={partition.usagePercent} />
                <div className="mt-2 flex justify-between text-xs text-slate-500">
                  <span>{partition.usagePercent.toFixed(0)}% {t('systemMonitor.usage')}</span>
                  <span>{formatBytes(partition.free)} {t('systemMonitor.free')}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* System Info Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50 mt-8">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-500">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>{t('systemMonitor.hostname')}: {systemInfo.hostname}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>{t('systemMonitor.osVersion')}: {systemInfo.osVersion}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span>{t('systemMonitor.kernel')}: {systemInfo.kernel}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{t('systemMonitor.uptime')}: {systemInfo.uptime}</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Alerts Panel */}
      <AlertsPanel isOpen={alertsOpen} onClose={() => setAlertsOpen(false)} />
    </div>
  );
};

export default SystemMonitor;
