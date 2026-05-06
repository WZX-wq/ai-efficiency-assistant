import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// Types
// ============================================================

export type CustomerSource = 'offline' | 'online' | 'referral' | 'ads';
export type CustomerStatus = 'lead' | 'prospect' | 'customer' | 'vip' | 'churned';
export type ContentType = 'text' | 'image' | 'video' | 'link' | 'poster';
export type CampaignType = 'welcome' | 'promotion' | 'reactivation' | 'birthday' | 'custom';
export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed';

export interface PrivateCustomer {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  wechatId: string;
  tags: string[];
  source: CustomerSource;
  status: CustomerStatus;
  joinDate: string;
  lastContactDate: string;
  totalSpent: number;
  orderCount: number;
  notes: string;
  groupIds: string[];
  churnRisk?: number; // 0-100, AI predicted
  bestContactTime?: string; // AI recommended
}

export interface CustomerGroup {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  tags: string[];
  createdAt: string;
}

export interface ContentItem {
  id: string;
  type: ContentType;
  title: string;
  content: string;
  tags: string[];
  usageCount: number;
  createdAt: string;
}

export interface CampaignStats {
  sent: number;
  opened: number;
  clicked: number;
  converted: number;
}

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  targetGroups: string[];
  content: string;
  schedule?: string;
  stats: CampaignStats;
  createdAt: string;
}

export interface PrivateDomainStats {
  totalCustomers: number;
  newThisMonth: number;
  activeCustomers: number;
  conversionRate: number;
  totalRevenue: number;
}

export interface PrivateDomainStore {
  customers: PrivateCustomer[];
  groups: CustomerGroup[];
  contentLibrary: ContentItem[];
  campaigns: Campaign[];
  stats: PrivateDomainStats;

  // Customer CRUD
  addCustomer: (customer: Omit<PrivateCustomer, 'id'>) => void;
  updateCustomer: (id: string, updates: Partial<PrivateCustomer>) => void;
  deleteCustomer: (id: string) => void;
  bulkUpdateCustomers: (ids: string[], updates: Partial<PrivateCustomer>) => void;
  bulkDeleteCustomers: (ids: string[]) => void;

  // Group CRUD
  addGroup: (group: Omit<CustomerGroup, 'id' | 'memberCount' | 'createdAt'>) => void;
  updateGroup: (id: string, updates: Partial<CustomerGroup>) => void;
  deleteGroup: (id: string) => void;
  addCustomerToGroup: (customerId: string, groupId: string) => void;
  removeCustomerFromGroup: (customerId: string, groupId: string) => void;

  // Content Library CRUD
  addContent: (content: Omit<ContentItem, 'id' | 'usageCount' | 'createdAt'>) => void;
  updateContent: (id: string, updates: Partial<ContentItem>) => void;
  deleteContent: (id: string) => void;
  incrementContentUsage: (id: string) => void;

  // Campaign CRUD
  addCampaign: (campaign: Omit<Campaign, 'id' | 'createdAt' | 'stats'>) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  updateCampaignStats: (id: string, stats: Partial<CampaignStats>) => void;

  // Stats
  updateStats: () => void;

  // AI Features
  generateContent: (prompt: string, type: ContentType) => Promise<string>;
  suggestTags: (customerId: string) => string[];
  predictChurnRisk: (customerId: string) => number;
  recommendContactTime: (customerId: string) => string;

  // Getters
  getCustomersByGroup: (groupId: string) => PrivateCustomer[];
  getCustomersByStatus: (status: CustomerStatus) => PrivateCustomer[];
  getActiveCampaigns: () => Campaign[];
  getRecentCustomers: (limit?: number) => PrivateCustomer[];
}

// ============================================================
// Helpers
// ============================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function getRandomDate(start: Date, end: Date): string {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return date.toISOString().split('T')[0];
}

function getRandomAvatar(): string {
  const avatars = [
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Zack',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Bella',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Molly',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Oliver',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophie',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Jack',
    'https://api.dicebear.com/7.x/avataaars/svg?seed=Luna',
  ];
  return avatars[Math.floor(Math.random() * avatars.length)];
}

// ============================================================
// Mock Data Generators
// ============================================================

const mockCustomerNames = [
  '张伟', '李娜', '王芳', '刘洋', '陈静', '杨帆', '赵敏', '黄磊', '周杰', '吴倩',
  '徐鹏', '孙丽', '马超', '朱婷', '胡军', '郭明', '林晨', '何欣', '高明', '罗薇',
  '郑浩', '梁雨', '谢峰', '宋佳', '唐宁'
];

const mockTags = ['高价值', '新客户', '活跃用户', 'VIP', '需要跟进', '潜在流失', '节日营销', '团购意向', '复购率高', '价格敏感'];

const mockNotes = [
  '对新产品很感兴趣，需要定期跟进',
  '老客户，复购率高，可推荐高端产品',
  '价格敏感，喜欢优惠活动',
  '工作繁忙，建议晚上联系',
  '注重品质，对服务要求高',
  '社交活跃，可邀请参与裂变活动',
  '近期购买频次下降，需激活',
  '高净值客户，提供专属服务',
];

function generateMockCustomers(count: number): PrivateCustomer[] {
  const customers: PrivateCustomer[] = [];
  const sources: CustomerSource[] = ['offline', 'online', 'referral', 'ads'];
  const statuses: CustomerStatus[] = ['lead', 'prospect', 'customer', 'vip', 'churned'];
  const statusWeights = [0.2, 0.25, 0.3, 0.15, 0.1];

  for (let i = 0; i < count; i++) {
    const random = Math.random();
    let status: CustomerStatus = 'lead';
    let cumulative = 0;
    for (let j = 0; j < statuses.length; j++) {
      cumulative += statusWeights[j];
      if (random <= cumulative) {
        status = statuses[j];
        break;
      }
    }

    const joinDate = getRandomDate(new Date(2023, 0, 1), new Date());
    const lastContactDate = getRandomDate(new Date(joinDate), new Date());
    const orderCount = status === 'lead' ? 0 : Math.floor(Math.random() * 20) + 1;
    const totalSpent = orderCount * (Math.random() * 500 + 100);

    customers.push({
      id: generateId('cust'),
      name: mockCustomerNames[i % mockCustomerNames.length],
      avatar: getRandomAvatar(),
      phone: `1${Math.floor(Math.random() * 9 + 3)}${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`,
      wechatId: `wx_${Math.random().toString(36).substring(2, 10)}`,
      tags: [mockTags[Math.floor(Math.random() * mockTags.length)]],
      source: sources[Math.floor(Math.random() * sources.length)],
      status,
      joinDate,
      lastContactDate,
      totalSpent: Math.round(totalSpent * 100) / 100,
      orderCount,
      notes: mockNotes[Math.floor(Math.random() * mockNotes.length)],
      groupIds: [],
      churnRisk: Math.floor(Math.random() * 100),
      bestContactTime: ['09:00-12:00', '14:00-18:00', '19:00-21:00'][Math.floor(Math.random() * 3)],
    });
  }
  return customers;
}

function generateMockGroups(): CustomerGroup[] {
  return [
    {
      id: generateId('grp'),
      name: 'VIP客户群',
      description: '高价值客户专属群，提供优先服务和专属优惠',
      memberCount: 0,
      tags: ['高价值', 'VIP'],
      createdAt: '2024-01-15',
    },
    {
      id: generateId('grp'),
      name: '新客欢迎群',
      description: '新加入客户的欢迎和引导群',
      memberCount: 0,
      tags: ['新客户', '引导'],
      createdAt: '2024-02-01',
    },
    {
      id: generateId('grp'),
      name: '团购优惠群',
      description: '团购活动和优惠信息发布群',
      memberCount: 0,
      tags: ['团购', '优惠'],
      createdAt: '2024-02-20',
    },
    {
      id: generateId('grp'),
      name: '产品体验官',
      description: '产品体验和反馈核心用户群',
      memberCount: 0,
      tags: ['体验', '反馈'],
      createdAt: '2024-03-10',
    },
    {
      id: generateId('grp'),
      name: '节日营销群',
      description: '节日活动和促销信息发布群',
      memberCount: 0,
      tags: ['节日', '营销'],
      createdAt: '2024-03-15',
    },
  ];
}

function generateMockContent(): ContentItem[] {
  return [
    {
      id: generateId('content'),
      type: 'text',
      title: '欢迎新客话术',
      content: '您好！欢迎加入我们的大家庭！我是您的专属顾问，有任何问题随时联系我。首次下单可享受新人专属9折优惠哦！',
      tags: ['欢迎', '新客'],
      usageCount: 156,
      createdAt: '2024-01-10',
    },
    {
      id: generateId('content'),
      type: 'text',
      title: '节日祝福模板',
      content: '亲爱的客户，节日快乐！感谢您一直以来的支持与信任。特别为您准备了节日专属礼包，快来领取吧！',
      tags: ['节日', '祝福'],
      usageCount: 89,
      createdAt: '2024-01-20',
    },
    {
      id: generateId('content'),
      type: 'poster',
      title: '限时折扣海报',
      content: 'https://example.com/images/discount-poster.jpg',
      tags: ['促销', '海报'],
      usageCount: 234,
      createdAt: '2024-02-05',
    },
    {
      id: generateId('content'),
      type: 'text',
      title: '复购提醒话术',
      content: '您好！注意到您之前购买的产品快用完了，现在复购可享受老客专属85折优惠，还包邮哦！',
      tags: ['复购', '提醒'],
      usageCount: 178,
      createdAt: '2024-02-15',
    },
    {
      id: generateId('content'),
      type: 'link',
      title: '新品预售页面',
      content: 'https://example.com/new-product-presale',
      tags: ['新品', '预售'],
      usageCount: 67,
      createdAt: '2024-02-28',
    },
    {
      id: generateId('content'),
      type: 'video',
      title: '产品使用教程',
      content: 'https://example.com/videos/tutorial.mp4',
      tags: ['教程', '视频'],
      usageCount: 312,
      createdAt: '2024-03-05',
    },
    {
      id: generateId('content'),
      type: 'text',
      title: '流失客户挽回',
      content: '好久不见！我们很想您。为您准备了专属回归礼包，包含价值100元的优惠券，期待您的归来！',
      tags: ['挽回', '流失'],
      usageCount: 45,
      createdAt: '2024-03-12',
    },
    {
      id: generateId('content'),
      type: 'image',
      title: '产品实拍图集',
      content: 'https://example.com/images/product-gallery.jpg',
      tags: ['产品', '图片'],
      usageCount: 198,
      createdAt: '2024-03-18',
    },
    {
      id: generateId('content'),
      type: 'text',
      title: 'VIP专属服务',
      content: '尊敬的VIP客户，您的专属顾问已为您准备好本月特权：免费升级服务、优先发货、专属折扣等，详情请查看会员中心。',
      tags: ['VIP', '特权'],
      usageCount: 76,
      createdAt: '2024-03-20',
    },
    {
      id: generateId('content'),
      type: 'poster',
      title: '会员日海报',
      content: 'https://example.com/images/member-day.jpg',
      tags: ['会员日', '海报'],
      usageCount: 145,
      createdAt: '2024-03-25',
    },
  ];
}

function generateMockCampaigns(): Campaign[] {
  return [
    {
      id: generateId('camp'),
      name: '新客欢迎系列活动',
      type: 'welcome',
      status: 'running',
      targetGroups: [],
      content: '欢迎新客话术',
      stats: { sent: 156, opened: 134, clicked: 89, converted: 45 },
      createdAt: '2024-01-15',
    },
    {
      id: generateId('camp'),
      name: '春季大促活动',
      type: 'promotion',
      status: 'completed',
      targetGroups: [],
      content: '限时折扣海报',
      schedule: '2024-03-01',
      stats: { sent: 523, opened: 412, clicked: 267, converted: 156 },
      createdAt: '2024-02-20',
    },
    {
      id: generateId('camp'),
      name: '流失客户唤醒计划',
      type: 'reactivation',
      status: 'paused',
      targetGroups: [],
      content: '流失客户挽回',
      stats: { sent: 89, opened: 45, clicked: 23, converted: 12 },
      createdAt: '2024-03-10',
    },
  ];
}

// ============================================================
// Store
// ============================================================

export const usePrivateDomainStore = create<PrivateDomainStore>()(
  persist(
    (set, get) => ({
      customers: generateMockCustomers(18),
      groups: generateMockGroups(),
      contentLibrary: generateMockContent(),
      campaigns: generateMockCampaigns(),
      stats: {
        totalCustomers: 0,
        newThisMonth: 0,
        activeCustomers: 0,
        conversionRate: 0,
        totalRevenue: 0,
      },

      // ---- Customer CRUD ----

      addCustomer: (customer) => {
        const newCustomer: PrivateCustomer = {
          ...customer,
          id: generateId('cust'),
        };
        set((s) => ({ customers: [...s.customers, newCustomer] }));
        get().updateStats();
      },

      updateCustomer: (id, updates) => {
        set((s) => ({
          customers: s.customers.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
        get().updateStats();
      },

      deleteCustomer: (id) => {
        set((s) => ({
          customers: s.customers.filter((c) => c.id !== id),
        }));
        get().updateStats();
      },

      bulkUpdateCustomers: (ids, updates) => {
        set((s) => ({
          customers: s.customers.map((c) =>
            ids.includes(c.id) ? { ...c, ...updates } : c
          ),
        }));
        get().updateStats();
      },

      bulkDeleteCustomers: (ids) => {
        set((s) => ({
          customers: s.customers.filter((c) => !ids.includes(c.id)),
        }));
        get().updateStats();
      },

      // ---- Group CRUD ----

      addGroup: (group) => {
        const newGroup: CustomerGroup = {
          ...group,
          id: generateId('grp'),
          memberCount: 0,
          createdAt: new Date().toISOString().split('T')[0],
        };
        set((s) => ({ groups: [...s.groups, newGroup] }));
      },

      updateGroup: (id, updates) => {
        set((s) => ({
          groups: s.groups.map((g) =>
            g.id === id ? { ...g, ...updates } : g
          ),
        }));
      },

      deleteGroup: (id) => {
        set((s) => ({
          groups: s.groups.filter((g) => g.id !== id),
          customers: s.customers.map((c) => ({
            ...c,
            groupIds: c.groupIds.filter((gid) => gid !== id),
          })),
        }));
      },

      addCustomerToGroup: (customerId, groupId) => {
        set((s) => ({
          customers: s.customers.map((c) =>
            c.id === customerId && !c.groupIds.includes(groupId)
              ? { ...c, groupIds: [...c.groupIds, groupId] }
              : c
          ),
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, memberCount: g.memberCount + 1 }
              : g
          ),
        }));
      },

      removeCustomerFromGroup: (customerId, groupId) => {
        set((s) => ({
          customers: s.customers.map((c) =>
            c.id === customerId
              ? { ...c, groupIds: c.groupIds.filter((gid) => gid !== groupId) }
              : c
          ),
          groups: s.groups.map((g) =>
            g.id === groupId
              ? { ...g, memberCount: Math.max(0, g.memberCount - 1) }
              : g
          ),
        }));
      },

      // ---- Content Library CRUD ----

      addContent: (content) => {
        const newContent: ContentItem = {
          ...content,
          id: generateId('content'),
          usageCount: 0,
          createdAt: new Date().toISOString().split('T')[0],
        };
        set((s) => ({ contentLibrary: [...s.contentLibrary, newContent] }));
      },

      updateContent: (id, updates) => {
        set((s) => ({
          contentLibrary: s.contentLibrary.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteContent: (id) => {
        set((s) => ({
          contentLibrary: s.contentLibrary.filter((c) => c.id !== id),
        }));
      },

      incrementContentUsage: (id) => {
        set((s) => ({
          contentLibrary: s.contentLibrary.map((c) =>
            c.id === id ? { ...c, usageCount: c.usageCount + 1 } : c
          ),
        }));
      },

      // ---- Campaign CRUD ----

      addCampaign: (campaign) => {
        const newCampaign: Campaign = {
          ...campaign,
          id: generateId('camp'),
          stats: { sent: 0, opened: 0, clicked: 0, converted: 0 },
          createdAt: new Date().toISOString().split('T')[0],
        };
        set((s) => ({ campaigns: [...s.campaigns, newCampaign] }));
      },

      updateCampaign: (id, updates) => {
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        }));
      },

      deleteCampaign: (id) => {
        set((s) => ({
          campaigns: s.campaigns.filter((c) => c.id !== id),
        }));
      },

      updateCampaignStats: (id, stats) => {
        set((s) => ({
          campaigns: s.campaigns.map((c) =>
            c.id === id ? { ...c, stats: { ...c.stats, ...stats } } : c
          ),
        }));
      },

      // ---- Stats ----

      updateStats: () => {
        const { customers } = get();
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        const totalCustomers = customers.length;
        const newThisMonth = customers.filter((c) => {
          const joinDate = new Date(c.joinDate);
          return joinDate.getMonth() === thisMonth && joinDate.getFullYear() === thisYear;
        }).length;
        const activeCustomers = customers.filter((c) => {
          const lastContact = new Date(c.lastContactDate);
          const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return lastContact >= thirtyDaysAgo;
        }).length;
        const convertedCustomers = customers.filter(
          (c) => c.status === 'customer' || c.status === 'vip'
        ).length;
        const conversionRate = totalCustomers > 0 ? (convertedCustomers / totalCustomers) * 100 : 0;
        const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);

        set({
          stats: {
            totalCustomers,
            newThisMonth,
            activeCustomers,
            conversionRate: Math.round(conversionRate * 100) / 100,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
          },
        });
      },

      // ---- AI Features ----

      generateContent: async (prompt: string, type: ContentType) => {
        // Simulate AI content generation
        await new Promise((resolve) => setTimeout(resolve, 1500));
        
        const templates: Record<ContentType, string[]> = {
          text: [
            `【限时优惠】亲爱的客户，${prompt}！现在下单立享8折优惠，数量有限，先到先得！`,
            `【新品上市】${prompt}，专为追求品质生活的您打造。立即体验，开启美好生活！`,
            `【专属福利】感谢您一直以来的支持！${prompt}，这是为您准备的专属惊喜。`,
          ],
          image: [
            'https://example.com/images/ai-generated-1.jpg',
            'https://example.com/images/ai-generated-2.jpg',
            'https://example.com/images/ai-generated-3.jpg',
          ],
          video: [
            'https://example.com/videos/ai-generated-1.mp4',
            'https://example.com/videos/ai-generated-2.mp4',
          ],
          link: [
            'https://example.com/promotion/special',
            'https://example.com/new-arrivals',
            'https://example.com/vip-exclusive',
          ],
          poster: [
            'https://example.com/posters/ai-poster-1.jpg',
            'https://example.com/posters/ai-poster-2.jpg',
            'https://example.com/posters/ai-poster-3.jpg',
          ],
        };

        const options = templates[type];
        return options[Math.floor(Math.random() * options.length)];
      },

      suggestTags: (customerId: string) => {
        const customer = get().customers.find((c) => c.id === customerId);
        if (!customer) return [];

        const suggestedTags: string[] = [];
        if (customer.totalSpent > 5000) suggestedTags.push('高价值');
        if (customer.orderCount > 10) suggestedTags.push('忠诚客户');
        if (customer.status === 'lead') suggestedTags.push('需跟进');
        if (new Date(customer.lastContactDate) < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) {
          suggestedTags.push('待激活');
        }

        return suggestedTags;
      },

      predictChurnRisk: (customerId: string) => {
        const customer = get().customers.find((c) => c.id === customerId);
        if (!customer) return 0;

        // Simple churn risk calculation
        let risk = 0;
        const daysSinceLastContact = Math.floor(
          (Date.now() - new Date(customer.lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysSinceLastContact > 60) risk += 40;
        else if (daysSinceLastContact > 30) risk += 20;
        
        if (customer.orderCount === 0) risk += 30;
        if (customer.status === 'churned') risk = 100;
        
        return Math.min(100, risk + Math.floor(Math.random() * 20));
      },

      recommendContactTime: (customerId: string) => {
        const customer = get().customers.find((c) => c.id === customerId);
        if (!customer) return '14:00-18:00';

        // Simple recommendation based on customer patterns
        const times = ['09:00-12:00', '14:00-18:00', '19:00-21:00'];
        return times[Math.floor(Math.random() * times.length)];
      },

      // ---- Getters ----

      getCustomersByGroup: (groupId: string) => {
        return get().customers.filter((c) => c.groupIds.includes(groupId));
      },

      getCustomersByStatus: (status: CustomerStatus) => {
        return get().customers.filter((c) => c.status === status);
      },

      getActiveCampaigns: () => {
        return get().campaigns.filter((c) => c.status === 'running');
      },

      getRecentCustomers: (limit = 5) => {
        return [...get().customers]
          .sort((a, b) => new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime())
          .slice(0, limit);
      },
    }),
    {
      name: 'ai-assistant-private-domain-store',
      partialize: (state) => ({
        customers: state.customers,
        groups: state.groups,
        contentLibrary: state.contentLibrary,
        campaigns: state.campaigns,
        stats: state.stats,
      }),
    }
  )
);

// Initialize stats on load
setTimeout(() => {
  usePrivateDomainStore.getState().updateStats();
}, 0);
