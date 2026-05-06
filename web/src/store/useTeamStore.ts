import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// Types
// ============================================================

export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  avatar: string;
  joinedAt: number;
  lastActive: number;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  avatar: string;
  members: TeamMember[];
  createdAt: number;
}

export interface SharedProject {
  id: string;
  name: string;
  teamId: string;
  type: string;
  createdAt: number;
  updatedAt: number;
  members: string[];
}

export type InvitationStatus = 'pending' | 'accepted' | 'rejected';

export interface Invitation {
  id: string;
  teamId: string;
  teamName: string;
  fromUser: string;
  role: MemberRole;
  status: InvitationStatus;
  createdAt: number;
}

export interface ActivityLogEntry {
  id: string;
  teamId: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: number;
}

export interface TeamStore {
  teams: Team[];
  sharedProjects: SharedProject[];
  invitations: Invitation[];
  activityLog: ActivityLogEntry[];

  // Team CRUD
  addTeam: (team: Omit<Team, 'id' | 'createdAt' | 'members'>) => void;
  updateTeam: (id: string, updates: Partial<Team>) => void;
  deleteTeam: (id: string) => void;

  // Member management
  addMember: (teamId: string, member: Omit<TeamMember, 'id' | 'joinedAt' | 'lastActive'>) => void;
  removeMember: (teamId: string, memberId: string) => void;
  changeMemberRole: (teamId: string, memberId: string, role: MemberRole) => void;

  // Shared projects CRUD
  addProject: (project: Omit<SharedProject, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<SharedProject>) => void;
  deleteProject: (id: string) => void;

  // Invitations
  acceptInvitation: (id: string) => void;
  rejectInvitation: (id: string) => void;

  // Activity log
  addActivityLog: (entry: Omit<ActivityLogEntry, 'id' | 'timestamp'>) => void;
}

// ============================================================
// Helpers
// ============================================================

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function daysAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function hoursAgo(hours: number): number {
  return Date.now() - hours * 60 * 60 * 1000;
}

// ============================================================
// Mock Data
// ============================================================

function createMockData(): {
  teams: Team[];
  sharedProjects: SharedProject[];
  invitations: Invitation[];
  activityLog: ActivityLogEntry[];
} {
  // Team 1
  const team1Members: TeamMember[] = [
    {
      id: 'm1',
      name: '张明',
      email: 'zhangming@example.com',
      role: 'owner',
      avatar: 'bg-blue-500',
      joinedAt: daysAgo(90),
      lastActive: hoursAgo(1),
    },
    {
      id: 'm2',
      name: '李雪',
      email: 'lixue@example.com',
      role: 'admin',
      avatar: 'bg-pink-500',
      joinedAt: daysAgo(60),
      lastActive: hoursAgo(3),
    },
    {
      id: 'm3',
      name: '王浩',
      email: 'wanghao@example.com',
      role: 'member',
      avatar: 'bg-emerald-500',
      joinedAt: daysAgo(45),
      lastActive: hoursAgo(6),
    },
    {
      id: 'm4',
      name: '赵琳',
      email: 'zhaolin@example.com',
      role: 'member',
      avatar: 'bg-amber-500',
      joinedAt: daysAgo(30),
      lastActive: daysAgo(1),
    },
    {
      id: 'm5',
      name: '陈伟',
      email: 'chenwei@example.com',
      role: 'viewer',
      avatar: 'bg-purple-500',
      joinedAt: daysAgo(15),
      lastActive: daysAgo(2),
    },
  ];

  const team1: Team = {
    id: 'team1',
    name: '内容创作组',
    description: '负责品牌内容策划、文案创作和社交媒体运营',
    avatar: 'bg-blue-500',
    members: team1Members,
    createdAt: daysAgo(90),
  };

  // Team 2
  const team2Members: TeamMember[] = [
    {
      id: 'm6',
      name: '刘洋',
      email: 'liuyang@example.com',
      role: 'owner',
      avatar: 'bg-indigo-500',
      joinedAt: daysAgo(60),
      lastActive: hoursAgo(2),
    },
    {
      id: 'm7',
      name: '孙芳',
      email: 'sunfang@example.com',
      role: 'admin',
      avatar: 'bg-rose-500',
      joinedAt: daysAgo(50),
      lastActive: hoursAgo(5),
    },
    {
      id: 'm8',
      name: '周杰',
      email: 'zhoujie@example.com',
      role: 'member',
      avatar: 'bg-teal-500',
      joinedAt: daysAgo(40),
      lastActive: daysAgo(1),
    },
  ];

  const team2: Team = {
    id: 'team2',
    name: '产品研发组',
    description: '负责产品功能设计、技术架构和开发迭代',
    avatar: 'bg-indigo-500',
    members: team2Members,
    createdAt: daysAgo(60),
  };

  // Shared Projects
  const sharedProjects: SharedProject[] = [
    {
      id: 'proj1',
      name: 'Q4 营销方案',
      teamId: 'team1',
      type: 'document',
      createdAt: daysAgo(20),
      updatedAt: hoursAgo(4),
      members: ['m1', 'm2', 'm3'],
    },
    {
      id: 'proj2',
      name: '品牌话术库',
      teamId: 'team1',
      type: 'knowledge',
      createdAt: daysAgo(45),
      updatedAt: daysAgo(1),
      members: ['m1', 'm2', 'm4', 'm5'],
    },
    {
      id: 'proj3',
      name: '产品需求文档 v2.0',
      teamId: 'team2',
      type: 'document',
      createdAt: daysAgo(30),
      updatedAt: hoursAgo(8),
      members: ['m6', 'm7', 'm8'],
    },
    {
      id: 'proj4',
      name: 'SEO 优化计划',
      teamId: 'team1',
      type: 'plan',
      createdAt: daysAgo(10),
      updatedAt: daysAgo(2),
      members: ['m1', 'm3'],
    },
  ];

  // Invitations
  const invitations: Invitation[] = [
    {
      id: 'inv1',
      teamId: 'team_ext1',
      teamName: '数据分析组',
      fromUser: '黄磊',
      role: 'member',
      status: 'pending',
      createdAt: daysAgo(2),
    },
    {
      id: 'inv2',
      teamId: 'team_ext2',
      teamName: '海外运营组',
      fromUser: '林婷',
      role: 'admin',
      status: 'pending',
      createdAt: daysAgo(5),
    },
    {
      id: 'inv3',
      teamId: 'team_ext3',
      teamName: '设计团队',
      fromUser: '吴昊',
      role: 'viewer',
      status: 'pending',
      createdAt: daysAgo(1),
    },
  ];

  // Activity Log
  const activityLog: ActivityLogEntry[] = [
    {
      id: 'act1',
      teamId: 'team1',
      userId: 'm1',
      userName: '张明',
      action: 'created',
      target: 'Q4 营销方案',
      timestamp: hoursAgo(4),
    },
    {
      id: 'act2',
      teamId: 'team1',
      userId: 'm2',
      userName: '李雪',
      action: 'edited',
      target: '品牌话术库',
      timestamp: hoursAgo(6),
    },
    {
      id: 'act3',
      teamId: 'team2',
      userId: 'm6',
      userName: '刘洋',
      action: 'shared',
      target: '产品需求文档 v2.0',
      timestamp: hoursAgo(8),
    },
    {
      id: 'act4',
      teamId: 'team1',
      userId: 'm3',
      userName: '王浩',
      action: 'commented',
      target: 'Q4 营销方案',
      timestamp: hoursAgo(10),
    },
    {
      id: 'act5',
      teamId: 'team2',
      userId: 'm7',
      userName: '孙芳',
      action: 'joined',
      target: '产品研发组',
      timestamp: daysAgo(1),
    },
    {
      id: 'act6',
      teamId: 'team1',
      userId: 'm4',
      userName: '赵琳',
      action: 'edited',
      target: 'SEO 优化计划',
      timestamp: daysAgo(2),
    },
    {
      id: 'act7',
      teamId: 'team1',
      userId: 'm5',
      userName: '陈伟',
      action: 'joined',
      target: '内容创作组',
      timestamp: daysAgo(15),
    },
    {
      id: 'act8',
      teamId: 'team2',
      userId: 'm8',
      userName: '周杰',
      action: 'created',
      target: '技术架构文档',
      timestamp: daysAgo(3),
    },
  ];

  return {
    teams: [team1, team2],
    sharedProjects,
    invitations,
    activityLog,
  };
}

// ============================================================
// Store
// ============================================================

const mockData = createMockData();

export const useTeamStore = create<TeamStore>()(
  persist(
    (set) => ({
      teams: mockData.teams,
      sharedProjects: mockData.sharedProjects,
      invitations: mockData.invitations,
      activityLog: mockData.activityLog,

      // ---- Team CRUD ----

      addTeam: (team) => {
        const newTeam: Team = {
          ...team,
          id: generateId('team'),
          createdAt: Date.now(),
          members: [],
        };
        set((s) => ({ teams: [...s.teams, newTeam] }));
      },

      updateTeam: (id, updates) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        }));
      },

      deleteTeam: (id) => {
        set((s) => ({
          teams: s.teams.filter((t) => t.id !== id),
          sharedProjects: s.sharedProjects.filter((p) => p.teamId !== id),
          activityLog: s.activityLog.filter((a) => a.teamId !== id),
        }));
      },

      // ---- Member Management ----

      addMember: (teamId, member) => {
        const now = Date.now();
        const newMember: TeamMember = {
          ...member,
          id: generateId('mem'),
          joinedAt: now,
          lastActive: now,
        };
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, members: [...t.members, newMember] }
              : t,
          ),
        }));
      },

      removeMember: (teamId, memberId) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? { ...t, members: t.members.filter((m) => m.id !== memberId) }
              : t,
          ),
        }));
      },

      changeMemberRole: (teamId, memberId, role) => {
        set((s) => ({
          teams: s.teams.map((t) =>
            t.id === teamId
              ? {
                  ...t,
                  members: t.members.map((m) =>
                    m.id === memberId ? { ...m, role } : m,
                  ),
                }
              : t,
          ),
        }));
      },

      // ---- Shared Projects CRUD ----

      addProject: (project) => {
        const now = Date.now();
        const newProject: SharedProject = {
          ...project,
          id: generateId('proj'),
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ sharedProjects: [...s.sharedProjects, newProject] }));
      },

      updateProject: (id, updates) => {
        set((s) => ({
          sharedProjects: s.sharedProjects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p,
          ),
        }));
      },

      deleteProject: (id) => {
        set((s) => ({
          sharedProjects: s.sharedProjects.filter((p) => p.id !== id),
        }));
      },

      // ---- Invitations ----

      acceptInvitation: (id) => {
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            inv.id === id ? { ...inv, status: 'accepted' as const } : inv,
          ),
        }));
      },

      rejectInvitation: (id) => {
        set((s) => ({
          invitations: s.invitations.map((inv) =>
            inv.id === id ? { ...inv, status: 'rejected' as const } : inv,
          ),
        }));
      },

      // ---- Activity Log ----

      addActivityLog: (entry) => {
        const newEntry: ActivityLogEntry = {
          ...entry,
          id: generateId('act'),
          timestamp: Date.now(),
        };
        set((s) => ({ activityLog: [newEntry, ...s.activityLog] }));
      },
    }),
    {
      name: 'ai-assistant-team-store',
      partialize: (state) => ({
        teams: state.teams,
        sharedProjects: state.sharedProjects,
        invitations: state.invitations,
        activityLog: state.activityLog,
      }),
    }
  )
);
