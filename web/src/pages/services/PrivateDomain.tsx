import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../i18n';
import {
  usePrivateDomainStore,
  type PrivateCustomer,
  type CustomerGroup,
  type ContentItem,
  type Campaign,
  type CustomerStatus,
  type CustomerSource,
  type ContentType,
  type CampaignType,
  type CampaignStatus,
} from '../../store/usePrivateDomainStore';
import {
  Users,
  UserPlus,
  Crown,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  Search,
  Plus,
  Edit2,
  Trash2,
  ChevronRight,
  X,
  Check,
  Copy,
  Download,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  LineChart,
  Target,
  Send,
  Sparkles,
  AlertTriangle,
  Image as ImageIcon,
  Video,
  Link as LinkIcon,
  FileText,
  Layout,
  Play,
  Pause,
  RotateCcw,
  Eye,
  Phone,
  MessageCircle,
  Percent,
  FolderOpen,
  Settings,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
} from 'lucide-react';

// ============================================================
// Types
// ============================================================

type TabType = 'dashboard' | 'customers' | 'groups' | 'content' | 'campaigns';

interface FilterState {
  status: CustomerStatus | 'all';
  source: CustomerSource | 'all';
  tags: string[];
  dateRange: { start: string; end: string };
}

// ============================================================
// Helper Components
// ============================================================

const StatusBadge: React.FC<{ status: CustomerStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const config: Record<CustomerStatus, { color: string; bg: string; icon: React.ReactNode }> = {
    lead: { color: 'text-gray-700', bg: 'bg-gray-100', icon: <Circle className="w-3 h-3" /> },
    prospect: { color: 'text-blue-700', bg: 'bg-blue-100', icon: <TrendingUp className="w-3 h-3" /> },
    customer: { color: 'text-green-700', bg: 'bg-green-100', icon: <CheckCircle2 className="w-3 h-3" /> },
    vip: { color: 'text-amber-700', bg: 'bg-amber-100', icon: <Crown className="w-3 h-3" /> },
    churned: { color: 'text-red-700', bg: 'bg-red-100', icon: <TrendingDown className="w-3 h-3" /> },
  };
  const { color, bg, icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${bg} ${color}`}>
      {icon}
      {t(`privateDomain.customerStatus.${status}`)}
    </span>
  );
};

const SourceBadge: React.FC<{ source: CustomerSource }> = ({ source }) => {
  const { t } = useTranslation();
  const config: Record<CustomerSource, { color: string; bg: string }> = {
    offline: { color: 'text-purple-700', bg: 'bg-purple-100' },
    online: { color: 'text-cyan-700', bg: 'bg-cyan-100' },
    referral: { color: 'text-emerald-700', bg: 'bg-emerald-100' },
    ads: { color: 'text-orange-700', bg: 'bg-orange-100' },
  };
  const { color, bg } = config[source];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${bg} ${color}`}>
      {t(`privateDomain.sources.${source}`)}
    </span>
  );
};

const CampaignTypeBadge: React.FC<{ type: CampaignType }> = ({ type }) => {
  const { t } = useTranslation();
  const config: Record<CampaignType, { color: string; bg: string; icon: React.ReactNode }> = {
    welcome: { color: 'text-emerald-700', bg: 'bg-emerald-100', icon: <UserPlus className="w-3 h-3" /> },
    promotion: { color: 'text-rose-700', bg: 'bg-rose-100', icon: <Percent className="w-3 h-3" /> },
    reactivation: { color: 'text-amber-700', bg: 'bg-amber-100', icon: <RotateCcw className="w-3 h-3" /> },
    birthday: { color: 'text-pink-700', bg: 'bg-pink-100', icon: <Crown className="w-3 h-3" /> },
    custom: { color: 'text-slate-700', bg: 'bg-slate-100', icon: <Settings className="w-3 h-3" /> },
  };
  const { color, bg, icon } = config[type];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${color}`}>
      {icon}
      {t(`privateDomain.campaignType.${type}`)}
    </span>
  );
};

const CampaignStatusBadge: React.FC<{ status: CampaignStatus }> = ({ status }) => {
  const { t } = useTranslation();
  const config: Record<CampaignStatus, { color: string; bg: string; icon: React.ReactNode }> = {
    draft: { color: 'text-gray-700', bg: 'bg-gray-100', icon: <FileText className="w-3 h-3" /> },
    running: { color: 'text-blue-700', bg: 'bg-blue-100', icon: <Play className="w-3 h-3" /> },
    paused: { color: 'text-amber-700', bg: 'bg-amber-100', icon: <Pause className="w-3 h-3" /> },
    completed: { color: 'text-green-700', bg: 'bg-green-100', icon: <CheckCircle2 className="w-3 h-3" /> },
  };
  const { color, bg, icon } = config[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${bg} ${color}`}>
      {icon}
      {t(`privateDomain.campaignStatus.${status}`)}
    </span>
  );
};

const ContentTypeIcon: React.FC<{ type: ContentType; className?: string }> = ({ type, className = 'w-4 h-4' }) => {
  switch (type) {
    case 'text': return <FileText className={className} />;
    case 'image': return <ImageIcon className={className} />;
    case 'video': return <Video className={className} />;
    case 'link': return <LinkIcon className={className} />;
    case 'poster': return <Layout className={className} />;
    default: return <FileText className={className} />;
  }
};

const ChurnRiskIndicator: React.FC<{ risk: number }> = ({ risk }) => {
  let color = 'bg-green-500';
  let textColor = 'text-green-700';
  if (risk > 30) { color = 'bg-yellow-500'; textColor = 'text-yellow-700'; }
  if (risk > 60) { color = 'bg-orange-500'; textColor = 'text-orange-700'; }
  if (risk > 80) { color = 'bg-red-500'; textColor = 'text-red-700'; }
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${risk}%` }} />
      </div>
      <span className={`text-xs font-medium ${textColor}`}>{risk}%</span>
      {risk > 60 && <AlertTriangle className="w-3 h-3 text-red-500" />}
    </div>
  );
};

// ============================================================
// Dashboard Tab Component
// ============================================================

const DashboardTab: React.FC = () => {
  const { t } = useTranslation();
  const { customers, stats, campaigns, getRecentCustomers } = usePrivateDomainStore();
  const recentCustomers = useMemo(() => getRecentCustomers(5), [getRecentCustomers]);
  const activeCampaigns = useMemo(() => campaigns.filter(c => c.status === 'running'), [campaigns]);

  // Calculate chart data
  const statusData = useMemo(() => {
    const data: Record<CustomerStatus, number> = { lead: 0, prospect: 0, customer: 0, vip: 0, churned: 0 };
    customers.forEach(c => data[c.status]++);
    return data;
  }, [customers]);

  const sourceData = useMemo(() => {
    const data: Record<CustomerSource, number> = { offline: 0, online: 0, referral: 0, ads: 0 };
    customers.forEach(c => data[c.source]++);
    return data;
  }, [customers]);

  const growthData = useMemo(() => {
    const months: { month: string; count: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthStr = d.toLocaleDateString('zh-CN', { month: 'short' });
      const count = customers.filter(c => {
        const joinDate = new Date(c.joinDate);
        return joinDate.getMonth() === d.getMonth() && joinDate.getFullYear() === d.getFullYear();
      }).length;
      months.push({ month: monthStr, count });
    }
    return months;
  }, [customers]);

  const maxGrowth = Math.max(...growthData.map(d => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('privateDomain.stats.totalCustomers')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.totalCustomers}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('privateDomain.stats.newThisMonth')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.newThisMonth}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('privateDomain.stats.activeRate')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                {stats.totalCustomers > 0 ? Math.round((stats.activeCustomers / stats.totalCustomers) * 100) : 0}%
              </p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('privateDomain.stats.conversionRate')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stats.conversionRate}%</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('privateDomain.stats.totalRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">¥{stats.totalRevenue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-rose-500 to-pink-600 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer Growth Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 mb-4">
            <LineChart className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('privateDomain.customerGrowth')}</h3>
          </div>
          <div className="h-48 flex items-end gap-2">
            {growthData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full bg-gradient-to-t from-purple-500 to-fuchsia-400 rounded-t-md transition-all duration-500"
                  style={{ height: `${(d.count / maxGrowth) * 100}%`, minHeight: d.count > 0 ? '4px' : '0' }}
                />
                <span className="text-xs text-gray-500">{d.month}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('privateDomain.statusDistribution')}</h3>
          </div>
          <div className="space-y-3">
            {Object.entries(statusData).map(([status, count]) => {
              const percentage = stats.totalCustomers > 0 ? (count / stats.totalCustomers) * 100 : 0;
              return (
                <div key={status} className="flex items-center gap-3">
                  <StatusBadge status={status as CustomerStatus} />
                  <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Source Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('privateDomain.sourceBreakdown')}</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(sourceData).map(([source, count]) => (
              <div key={source} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <SourceBadge source={source as CustomerSource} />
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{count}</p>
                <p className="text-xs text-gray-500">
                  {stats.totalCustomers > 0 ? Math.round((count / stats.totalCustomers) * 100) : 0}%
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Recent Activity & Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">{t('privateDomain.recentActivity')}</h3>
            </div>
          </div>
          <div className="space-y-4">
            {recentCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <img src={customer.avatar} alt={customer.name} className="w-10 h-10 rounded-full" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">{customer.name}</p>
                  <p className="text-xs text-gray-500">{t('privateDomain.joinDate')}: {customer.joinDate}</p>
                </div>
                <StatusBadge status={customer.status} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Customer Pipeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{t('privateDomain.pipeline')}</h3>
          </div>
          <div className="space-y-4">
            {(['lead', 'prospect', 'customer', 'vip', 'churned'] as CustomerStatus[]).map((status, index, arr) => (
              <div key={status} className="relative">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center text-white font-bold">
                    {statusData[status]}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-white">{t(`privateDomain.customerStatus.${status}`)}</p>
                    <p className="text-xs text-gray-500">
                      {index < arr.length - 1 && statusData[status] > 0
                        ? `${Math.round((statusData[arr[index + 1]] / statusData[status]) * 100)}% 转化率`
                        : status === 'churned' ? '需重点关注' : '维护中'}
                    </p>
                  </div>
                  {index < arr.length - 1 && (
                    <ArrowRight className="w-5 h-5 text-gray-300" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Active Campaigns */}
      {activeCampaigns.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
        >
          <div className="flex items-center gap-2 mb-4">
            <Send className="w-5 h-5 text-purple-500" />
            <h3 className="font-semibold text-gray-900 dark:text-white">进行中活动</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeCampaigns.map(campaign => (
              <div key={campaign.id} className="p-4 border border-gray-100 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <CampaignTypeBadge type={campaign.type} />
                  <CampaignStatusBadge status={campaign.status} />
                </div>
                <p className="font-medium text-gray-900 dark:text-white">{campaign.name}</p>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-gray-500">{t('privateDomain.sent')}</p>
                    <p className="font-semibold">{campaign.stats.sent}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('privateDomain.openRate')}</p>
                    <p className="font-semibold">
                      {campaign.stats.sent > 0 ? Math.round((campaign.stats.opened / campaign.stats.sent) * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ============================================================
// Customers Tab Component
// ============================================================

const CustomersTab: React.FC = () => {
  const { t } = useTranslation();
  const { customers, groups, addCustomer, updateCustomer, deleteCustomer, bulkDeleteCustomers, addCustomerToGroup, removeCustomerFromGroup } = usePrivateDomainStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    status: 'all',
    source: 'all',
    tags: [],
    dateRange: { start: '', end: '' },
  });
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<PrivateCustomer | null>(null);
  const [viewingCustomer, setViewingCustomer] = useState<PrivateCustomer | null>(null);

  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const matchesSearch = customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.phone.includes(searchQuery) ||
        customer.wechatId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filters.status === 'all' || customer.status === filters.status;
      const matchesSource = filters.source === 'all' || customer.source === filters.source;
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [customers, searchQuery, filters]);

  const handleSelectAll = () => {
    if (selectedCustomers.length === filteredCustomers.length) {
      setSelectedCustomers([]);
    } else {
      setSelectedCustomers(filteredCustomers.map(c => c.id));
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t('privateDomain.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        
        <select
          value={filters.status}
          onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as CustomerStatus | 'all' }))}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">{t('privateDomain.filter')} - {t('privateDomain.customerStatus.lead')}</option>
          {(['lead', 'prospect', 'customer', 'vip', 'churned'] as CustomerStatus[]).map(s => (
            <option key={s} value={s}>{t(`privateDomain.customerStatus.${s}`)}</option>
          ))}
        </select>

        <select
          value={filters.source}
          onChange={(e) => setFilters(f => ({ ...f, source: e.target.value as CustomerSource | 'all' }))}
          className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="all">{t('privateDomain.filter')} - {t('privateDomain.sources.offline')}</option>
          {(['offline', 'online', 'referral', 'ads'] as CustomerSource[]).map(s => (
            <option key={s} value={s}>{t(`privateDomain.sources.${s}`)}</option>
          ))}
        </select>

        {selectedCustomers.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{selectedCustomers.length} {t('privateDomain.selectAll')}</span>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors"
            >
              {t('privateDomain.addTag')}
            </button>
            <button
              onClick={() => { bulkDeleteCustomers(selectedCustomers); setSelectedCustomers([]); }}
              className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t('privateDomain.addCustomer')}
          </button>
          <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedCustomers.length === filteredCustomers.length && filteredCustomers.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('privateDomain.customerStatus.customer')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('privateDomain.phone')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('privateDomain.customerStatus.lead')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('privateDomain.tags')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('privateDomain.joinDate')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('privateDomain.lastContact')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('privateDomain.totalSpent')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{t('privateDomain.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.includes(customer.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCustomers([...selectedCustomers, customer.id]);
                        } else {
                          setSelectedCustomers(selectedCustomers.filter(id => id !== customer.id));
                        }
                      }}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <img src={customer.avatar} alt={customer.name} className="w-8 h-8 rounded-full" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                        <p className="text-xs text-gray-500">{customer.wechatId}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{customer.phone}</td>
                  <td className="px-4 py-3"><StatusBadge status={customer.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {customer.tags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">{tag}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{customer.joinDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{customer.lastContactDate}</td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">¥{customer.totalSpent.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setViewingCustomer(customer)}
                        className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingCustomer(customer)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteCustomer(customer.id)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredCustomers.length === 0 && (
          <div className="py-12 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('privateDomain.noCustomers')}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingCustomer) && (
          <CustomerModal
            customer={editingCustomer}
            onClose={() => { setShowAddModal(false); setEditingCustomer(null); }}
            onSave={(data) => {
              if (editingCustomer) {
                updateCustomer(editingCustomer.id, data);
              } else {
                addCustomer(data as Omit<PrivateCustomer, 'id'>);
              }
              setShowAddModal(false);
              setEditingCustomer(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* View Detail Panel */}
      <AnimatePresence>
        {viewingCustomer && (
          <CustomerDetailPanel
            customer={viewingCustomer}
            groups={groups}
            onClose={() => setViewingCustomer(null)}
            onAddToGroup={(groupId) => addCustomerToGroup(viewingCustomer.id, groupId)}
            onRemoveFromGroup={(groupId) => removeCustomerFromGroup(viewingCustomer.id, groupId)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// Customer Modal Component
// ============================================================

const CustomerModal: React.FC<{
  customer: PrivateCustomer | null;
  onClose: () => void;
  onSave: (data: Partial<PrivateCustomer>) => void;
}> = ({ customer, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<PrivateCustomer>>({
    name: customer?.name || '',
    phone: customer?.phone || '',
    wechatId: customer?.wechatId || '',
    status: customer?.status || 'lead',
    source: customer?.source || 'online',
    tags: customer?.tags || [],
    notes: customer?.notes || '',
    avatar: customer?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
    joinDate: customer?.joinDate || new Date().toISOString().split('T')[0],
    lastContactDate: customer?.lastContactDate || new Date().toISOString().split('T')[0],
    totalSpent: customer?.totalSpent || 0,
    orderCount: customer?.orderCount || 0,
    groupIds: customer?.groupIds || [],
  });
  const [newTag, setNewTag] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {customer ? t('privateDomain.editCustomer') : t('privateDomain.addCustomer')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex justify-center">
            <img src={formData.avatar} alt="" className="w-20 h-20 rounded-full" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.customerStatus.customer')} {t('privateDomain.customerStatus.lead')}</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.phone')}</label>
              <input
                type="text"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.wechatId')}</label>
            <input
              type="text"
              value={formData.wechatId}
              onChange={e => setFormData({ ...formData, wechatId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.customerStatus.lead')}</label>
              <select
                value={formData.status}
                onChange={e => setFormData({ ...formData, status: e.target.value as CustomerStatus })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {(['lead', 'prospect', 'customer', 'vip', 'churned'] as CustomerStatus[]).map(s => (
                  <option key={s} value={s}>{t(`privateDomain.customerStatus.${s}`)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.sources.offline')}</label>
              <select
                value={formData.source}
                onChange={e => setFormData({ ...formData, source: e.target.value as CustomerSource })}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {(['offline', 'online', 'referral', 'ads'] as CustomerSource[]).map(s => (
                  <option key={s} value={s}>{t(`privateDomain.sources.${s}`)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.tags')}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                  {tag}
                  <button onClick={() => setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter' && newTag) {
                    setFormData({ ...formData, tags: [...(formData.tags || []), newTag] });
                    setNewTag('');
                  }
                }}
                placeholder="添加标签"
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => {
                  if (newTag) {
                    setFormData({ ...formData, tags: [...(formData.tags || []), newTag] });
                    setNewTag('');
                  }
                }}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.notes')}</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-lg"
          >
            {t('common.save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================
// Customer Detail Panel Component
// ============================================================

const CustomerDetailPanel: React.FC<{
  customer: PrivateCustomer;
  groups: CustomerGroup[];
  onClose: () => void;
  onAddToGroup: (groupId: string) => void;
  onRemoveFromGroup: (groupId: string) => void;
}> = ({ customer, groups, onClose, onAddToGroup, onRemoveFromGroup }) => {
  const { t } = useTranslation();
  const { predictChurnRisk, recommendContactTime } = usePrivateDomainStore();
  const churnRisk = predictChurnRisk(customer.id);
  const bestTime = recommendContactTime(customer.id);

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
    >
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('privateDomain.customerDetail')}</h2>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Profile Header */}
        <div className="text-center">
          <img src={customer.avatar} alt={customer.name} className="w-24 h-24 rounded-full mx-auto mb-3" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{customer.name}</h3>
          <p className="text-gray-500">{customer.wechatId}</p>
          <div className="flex justify-center gap-2 mt-3">
            <StatusBadge status={customer.status} />
            <SourceBadge source={customer.source} />
          </div>
        </div>

        {/* AI Insights */}
        <div className="p-4 bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/20 dark:to-fuchsia-900/20 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h4 className="font-medium text-gray-900 dark:text-white">AI 洞察</h4>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('privateDomain.churnRisk')}</p>
              <ChurnRiskIndicator risk={churnRisk} />
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">{t('privateDomain.bestContactTime')}</p>
              <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-500" />
                {bestTime}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">{t('privateDomain.customerStatus.lead')}</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Phone className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white">{customer.phone}</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <MessageCircle className="w-4 h-4 text-gray-400" />
              <span className="text-gray-900 dark:text-white">{customer.wechatId}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-sm text-gray-500">{t('privateDomain.totalSpent')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">¥{customer.totalSpent.toLocaleString()}</p>
          </div>
          <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <p className="text-sm text-gray-500">{t('privateDomain.orderCount')}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{customer.orderCount}</p>
          </div>
        </div>

        {/* Groups */}
        <div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">{t('privateDomain.groups')}</h4>
          <div className="space-y-2">
            {groups.map(group => {
              const isMember = customer.groupIds.includes(group.id);
              return (
                <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{group.name}</p>
                    <p className="text-xs text-gray-500">{group.memberCount} {t('privateDomain.memberCount')}</p>
                  </div>
                  <button
                    onClick={() => isMember ? onRemoveFromGroup(group.id) : onAddToGroup(group.id)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      isMember
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                    }`}
                  >
                    {isMember ? '移除' : '添加'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes */}
        {customer.notes && (
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t('privateDomain.notes')}</h4>
            <p className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-gray-600 dark:text-gray-400 text-sm">
              {customer.notes}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================
// Groups Tab Component
// ============================================================

const GroupsTab: React.FC = () => {
  const { t } = useTranslation();
  const { groups, addGroup, updateGroup, deleteGroup, getCustomersByGroup } = usePrivateDomainStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CustomerGroup | null>(null);
  const [viewingGroup, setViewingGroup] = useState<CustomerGroup | null>(null);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('privateDomain.groups')}</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t('privateDomain.addGroup')}
        </button>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((group, index) => (
          <motion.div
            key={group.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditingGroup(group)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteGroup(group.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{group.name}</h3>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{group.description}</p>
            
            <div className="flex flex-wrap gap-1 mb-4">
              {group.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded">
                  {tag}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{group.memberCount} {t('privateDomain.memberCount')}</span>
              </div>
              <button
                onClick={() => setViewingGroup(group)}
                className="text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
              >
                {t('privateDomain.viewMembers')}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="py-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('privateDomain.noGroups')}</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingGroup) && (
          <GroupModal
            group={editingGroup}
            onClose={() => { setShowAddModal(false); setEditingGroup(null); }}
            onSave={(data) => {
              if (editingGroup) {
                updateGroup(editingGroup.id, data);
              } else {
                addGroup(data as Omit<CustomerGroup, 'id' | 'memberCount' | 'createdAt'>);
              }
              setShowAddModal(false);
              setEditingGroup(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* View Members Panel */}
      <AnimatePresence>
        {viewingGroup && (
          <GroupMembersPanel
            group={viewingGroup}
            members={getCustomersByGroup(viewingGroup.id)}
            onClose={() => setViewingGroup(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// Group Modal Component
// ============================================================

const GroupModal: React.FC<{
  group: CustomerGroup | null;
  onClose: () => void;
  onSave: (data: Partial<CustomerGroup>) => void;
}> = ({ group, onClose, onSave }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<CustomerGroup>>({
    name: group?.name || '',
    description: group?.description || '',
    tags: group?.tags || [],
  });
  const [newTag, setNewTag] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {group ? t('privateDomain.editGroup') : t('privateDomain.addGroup')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.groupName')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('common.description')}</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.tags')}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                  {tag}
                  <button onClick={() => setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter' && newTag) {
                    setFormData({ ...formData, tags: [...(formData.tags || []), newTag] });
                    setNewTag('');
                  }
                }}
                placeholder="添加标签"
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => {
                  if (newTag) {
                    setFormData({ ...formData, tags: [...(formData.tags || []), newTag] });
                    setNewTag('');
                  }
                }}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-lg"
          >
            {t('common.save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================
// Group Members Panel Component
// ============================================================

const GroupMembersPanel: React.FC<{
  group: CustomerGroup;
  members: PrivateCustomer[];
  onClose: () => void;
}> = ({ group, members, onClose }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-800 shadow-2xl z-50 overflow-y-auto"
    >
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h2>
          <p className="text-sm text-gray-500">{members.length} {t('privateDomain.memberCount')}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {members.map(member => (
          <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <img src={member.avatar} alt={member.name} className="w-10 h-10 rounded-full" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 dark:text-white truncate">{member.name}</p>
              <p className="text-xs text-gray-500">{member.phone}</p>
            </div>
            <StatusBadge status={member.status} />
          </div>
        ))}
        {members.length === 0 && (
          <div className="py-8 text-center">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">{t('privateDomain.noCustomers')}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================
// Content Library Tab Component
// ============================================================

const ContentLibraryTab: React.FC = () => {
  const { t } = useTranslation();
  const { contentLibrary, addContent, updateContent, deleteContent, generateContent } = usePrivateDomainStore();
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const filteredContent = useMemo(() => {
    if (filterType === 'all') return contentLibrary;
    return contentLibrary.filter(c => c.type === filterType);
  }, [contentLibrary, filterType]);

  const handleAIGenerate = async (prompt: string, type: ContentType) => {
    setIsGenerating(true);
    try {
      const generated = await generateContent(prompt, type);
      return generated;
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filterType === 'all' ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {t('common.all')}
          </button>
          {(['text', 'image', 'video', 'link', 'poster'] as ContentType[]).map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filterType === type ? 'bg-white dark:bg-gray-600 shadow-sm' : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              {t(`privateDomain.contentType.${type}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            {t('privateDomain.addContent')}
          </button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredContent.map((content, index) => (
          <motion.div
            key={content.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow"
          >
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-lg flex items-center justify-center">
                  <ContentTypeIcon type={content.type} className="w-5 h-5 text-white" />
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setEditingContent(content)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteContent(content.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-1">{content.title}</h3>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-3">
                {content.type === 'text' ? (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">{content.content}</p>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-purple-600">
                    <LinkIcon className="w-4 h-4" />
                    <span className="truncate">{content.content}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {content.tags.map(tag => (
                  <span key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Copy className="w-4 h-4" />
                  <span>{content.usageCount} {t('privateDomain.usageCount')}</span>
                </div>
                <span>{content.createdAt}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredContent.length === 0 && (
        <div className="py-12 text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('privateDomain.noContent')}</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingContent) && (
          <ContentModal
            content={editingContent}
            onClose={() => { setShowAddModal(false); setEditingContent(null); }}
            onSave={(data) => {
              if (editingContent) {
                updateContent(editingContent.id, data);
              } else {
                addContent(data as Omit<ContentItem, 'id' | 'usageCount' | 'createdAt'>);
              }
              setShowAddModal(false);
              setEditingContent(null);
            }}
            onAIGenerate={handleAIGenerate}
            isGenerating={isGenerating}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// Content Modal Component
// ============================================================

const ContentModal: React.FC<{
  content: ContentItem | null;
  onClose: () => void;
  onSave: (data: Partial<ContentItem>) => void;
  onAIGenerate: (prompt: string, type: ContentType) => Promise<string>;
  isGenerating: boolean;
}> = ({ content, onClose, onSave, onAIGenerate, isGenerating }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<Partial<ContentItem>>({
    title: content?.title || '',
    type: content?.type || 'text',
    content: content?.content || '',
    tags: content?.tags || [],
  });
  const [newTag, setNewTag] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const handleGenerate = async () => {
    if (!aiPrompt) return;
    const generated = await onAIGenerate(aiPrompt, formData.type as ContentType);
    setFormData({ ...formData, content: generated });
    setShowAIGenerator(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {content ? t('privateDomain.editContent') : t('privateDomain.addContent')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('knowledge.title')}</label>
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.contentType.text')}</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as ContentType })}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              {(['text', 'image', 'video', 'link', 'poster'] as ContentType[]).map(type => (
                <option key={type} value={type}>{t(`privateDomain.contentType.${type}`)}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('knowledge.content')}</label>
              {!content && (
                <button
                  onClick={() => setShowAIGenerator(!showAIGenerator)}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('privateDomain.aiGenerateContent')}
                </button>
              )}
            </div>
            
            {showAIGenerator && (
              <div className="mb-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                    placeholder="输入内容描述..."
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !aiPrompt}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
                  >
                    {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
              rows={5}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.tags')}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags?.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                  {tag}
                  <button onClick={() => setFormData({ ...formData, tags: formData.tags?.filter(t => t !== tag) })}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyPress={e => {
                  if (e.key === 'Enter' && newTag) {
                    setFormData({ ...formData, tags: [...(formData.tags || []), newTag] });
                    setNewTag('');
                  }
                }}
                placeholder="添加标签"
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => {
                  if (newTag) {
                    setFormData({ ...formData, tags: [...(formData.tags || []), newTag] });
                    setNewTag('');
                  }
                }}
                className="px-3 py-2 bg-purple-100 text-purple-700 rounded-lg"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onSave(formData)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-lg"
          >
            {t('common.save')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================
// Campaigns Tab Component
// ============================================================

const CampaignsTab: React.FC = () => {
  const { t } = useTranslation();
  const { campaigns, groups, addCampaign, updateCampaign, deleteCampaign } = usePrivateDomainStore();
  const [showWizard, setShowWizard] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('privateDomain.campaigns')}</h2>
        <button
          onClick={() => setShowWizard(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          {t('privateDomain.addCampaign')}
        </button>
      </div>

      {/* Campaigns List */}
      <div className="space-y-4">
        {campaigns.map((campaign, index) => (
          <motion.div
            key={campaign.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <CampaignTypeBadge type={campaign.type} />
                    <CampaignStatusBadge status={campaign.status} />
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => setEditingCampaign(campaign)}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => deleteCampaign(campaign.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{t('privateDomain.sent')}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.stats.sent}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{t('privateDomain.opened')}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.stats.opened}</p>
                <p className="text-xs text-green-600">
                  {campaign.stats.sent > 0 ? Math.round((campaign.stats.opened / campaign.stats.sent) * 100) : 0}% {t('privateDomain.openRate')}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{t('privateDomain.clicked')}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.stats.clicked}</p>
                <p className="text-xs text-blue-600">
                  {campaign.stats.opened > 0 ? Math.round((campaign.stats.clicked / campaign.stats.opened) * 100) : 0}% {t('privateDomain.clickRate')}
                </p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-xs text-gray-500">{t('privateDomain.converted')}</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.stats.converted}</p>
                <p className="text-xs text-purple-600">
                  {campaign.stats.clicked > 0 ? Math.round((campaign.stats.converted / campaign.stats.clicked) * 100) : 0}% {t('privateDomain.conversionRate')}
                </p>
              </div>
            </div>

            {campaign.schedule && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Calendar className="w-4 h-4" />
                <span>{t('privateDomain.schedule')}: {campaign.schedule}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {campaigns.length === 0 && (
        <div className="py-12 text-center">
          <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">{t('privateDomain.noCampaigns')}</p>
        </div>
      )}

      {/* Campaign Wizard */}
      <AnimatePresence>
        {(showWizard || editingCampaign) && (
          <CampaignWizard
            campaign={editingCampaign}
            groups={groups}
            onClose={() => { setShowWizard(false); setEditingCampaign(null); }}
            onSave={(data) => {
              if (editingCampaign) {
                updateCampaign(editingCampaign.id, data);
              } else {
                addCampaign(data as Omit<Campaign, 'id' | 'createdAt' | 'stats'>);
              }
              setShowWizard(false);
              setEditingCampaign(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ============================================================
// Campaign Wizard Component
// ============================================================

const CampaignWizard: React.FC<{
  campaign: Campaign | null;
  groups: CustomerGroup[];
  onClose: () => void;
  onSave: (data: Partial<Campaign>) => void;
}> = ({ campaign, groups, onClose, onSave }) => {
  const { t } = useTranslation();
  const { contentLibrary, generateContent } = usePrivateDomainStore();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<Partial<Campaign>>({
    name: campaign?.name || '',
    type: campaign?.type || 'welcome',
    targetGroups: campaign?.targetGroups || [],
    content: campaign?.content || '',
    schedule: campaign?.schedule || '',
    status: campaign?.status || 'draft',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  const steps = [
    t('privateDomain.campaignWizard.step1'),
    t('privateDomain.campaignWizard.step2'),
    t('privateDomain.campaignWizard.step3'),
    t('privateDomain.campaignWizard.step4'),
  ];

  const handleAIGenerate = async () => {
    if (!aiPrompt) return;
    setIsGenerating(true);
    try {
      const generated = await generateContent(aiPrompt, 'text');
      setFormData({ ...formData, content: generated });
    } finally {
      setIsGenerating(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return formData.name && formData.type;
      case 2: return formData.targetGroups && formData.targetGroups.length > 0;
      case 3: return formData.content;
      default: return true;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {campaign ? t('privateDomain.editCampaign') : t('privateDomain.addCampaign')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  i + 1 === step ? 'bg-purple-600 text-white' :
                  i + 1 < step ? 'bg-green-500 text-white' :
                  'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {i + 1 < step ? <Check className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`ml-2 text-sm ${i + 1 === step ? 'text-purple-600 font-medium' : 'text-gray-500'}`}>
                  {s}
                </span>
                {i < steps.length - 1 && (
                  <div className={`w-12 h-0.5 mx-2 ${i + 1 < step ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.campaignName')}</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('privateDomain.selectCampaignType')}</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {(['welcome', 'promotion', 'reactivation', 'birthday', 'custom'] as CampaignType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setFormData({ ...formData, type })}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        formData.type === type
                          ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                      }`}
                    >
                      <CampaignTypeBadge type={type} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('privateDomain.selectGroups')}</label>
              <div className="space-y-2">
                {groups.map(group => (
                  <label key={group.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <input
                      type="checkbox"
                      checked={formData.targetGroups?.includes(group.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setFormData({ ...formData, targetGroups: [...(formData.targetGroups || []), group.id] });
                        } else {
                          setFormData({ ...formData, targetGroups: formData.targetGroups?.filter(id => id !== group.id) });
                        }
                      }}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{group.name}</p>
                      <p className="text-xs text-gray-500">{group.memberCount} {t('privateDomain.memberCount')}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('privateDomain.composeMessage')}</label>
                <button
                  onClick={() => setIsGenerating(!isGenerating)}
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  <Sparkles className="w-4 h-4" />
                  {t('privateDomain.aiAssist')}
                </button>
              </div>

              {isGenerating && (
                <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      placeholder="描述你想要的内容..."
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={handleAIGenerate}
                      disabled={!aiPrompt}
                      className="px-3 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-1"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm text-gray-500">{t('privateDomain.contentLibrary')}</p>
                <div className="flex flex-wrap gap-2">
                  {contentLibrary.filter(c => c.type === 'text').map(content => (
                    <button
                      key={content.id}
                      onClick={() => setFormData({ ...formData, content: content.content })}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-700 transition-colors"
                    >
                      {content.title}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={formData.content}
                onChange={e => setFormData({ ...formData, content: e.target.value })}
                rows={6}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('privateDomain.send')}</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!formData.schedule}
                      onChange={() => setFormData({ ...formData, schedule: undefined })}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span>{t('privateDomain.sendNow')}</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      checked={!!formData.schedule}
                      onChange={() => setFormData({ ...formData, schedule: new Date().toISOString().split('T')[0] })}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span>{t('privateDomain.schedule')}</span>
                  </label>
                </div>
              </div>

              {formData.schedule && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('privateDomain.schedule')}</label>
                  <input
                    type="date"
                    value={formData.schedule}
                    onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">{t('privateDomain.preview')}</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="text-gray-500">{t('privateDomain.campaignName')}:</span> {formData.name}</p>
                  <p><span className="text-gray-500">{t('privateDomain.campaignType.welcome')}:</span> {formData.type && t(`privateDomain.campaignType.${formData.type}`)}</p>
                  <p><span className="text-gray-500">{t('privateDomain.targetGroups')}:</span> {formData.targetGroups?.length} {t('privateDomain.groups')}</p>
                  <p><span className="text-gray-500">{t('knowledge.content')}:</span> {formData.content?.substring(0, 50)}...</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            {t('common.previous')}
          </button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
              {t('common.cancel')}
            </button>
            {step < 4 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg disabled:opacity-50"
              >
                {t('common.next')}
              </button>
            ) : (
              <button
                onClick={() => onSave(formData)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-lg"
              >
                {formData.status === 'draft' ? t('privateDomain.saveAsDraft') : t('privateDomain.send')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================
// Main Component
// ============================================================

const PrivateDomain: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const { updateStats } = usePrivateDomainStore();

  useEffect(() => {
    updateStats();
  }, [updateStats]);

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t('privateDomain.dashboard'), icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'customers', label: t('privateDomain.customers'), icon: <Users className="w-4 h-4" /> },
    { id: 'groups', label: t('privateDomain.groups'), icon: <FolderOpen className="w-4 h-4" /> },
    { id: 'content', label: t('privateDomain.contentLibrary'), icon: <FileText className="w-4 h-4" /> },
    { id: 'campaigns', label: t('privateDomain.campaigns'), icon: <Send className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t('privateDomain.title')}</h1>
                <p className="text-xs text-gray-500">Private Domain Operations</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <HelpCircle className="w-5 h-5" />
              </button>
              <button className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-1 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && <DashboardTab />}
            {activeTab === 'customers' && <CustomersTab />}
            {activeTab === 'groups' && <GroupsTab />}
            {activeTab === 'content' && <ContentLibraryTab />}
            {activeTab === 'campaigns' && <CampaignsTab />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};

export default PrivateDomain;
