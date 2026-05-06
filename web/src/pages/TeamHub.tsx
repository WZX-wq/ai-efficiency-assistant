import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { useTeamStore, type MemberRole } from '../store/useTeamStore';

// ============================================================
// Helpers
// ============================================================

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return new Date(ts).toLocaleDateString('zh-CN');
}

function isOnline(lastActive: number): boolean {
  return Date.now() - lastActive < 30 * 60 * 1000; // 30 minutes
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-indigo-500', 'bg-purple-500', 'bg-pink-500',
  'bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500',
];

const PROJECT_TYPE_ICONS: Record<string, string> = {
  document: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  knowledge: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  plan: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
};

// ============================================================
// Tab Type
// ============================================================

type TabKey = 'overview' | 'members' | 'projects' | 'activity' | 'invitations';

interface TabItem {
  key: TabKey;
  labelKey: string;
}

// ============================================================
// Sub-components
// ============================================================

function RoleBadge({ role }: { role: MemberRole }) {
  const { t } = useTranslation();
  const styles: Record<MemberRole, string> = {
    owner: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    admin: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
    member: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    viewer: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[role]}`}>
      {t(`team.memberRole.${role}`)}
    </span>
  );
}

function OnlineIndicator({ lastActive }: { lastActive: number }) {
  const { t } = useTranslation();
  const online = isOnline(lastActive);
  return (
    <span className="flex items-center gap-1 text-xs text-gray-400">
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
      {online ? t('team.online') : t('team.offline')}
    </span>
  );
}

function Avatar({ name, color, size = 'md' }: { name: string; color: string; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
  };
  return (
    <div className={`${sizeClasses[size]} ${color} rounded-full flex items-center justify-center text-white font-medium flex-shrink-0`}>
      {name.charAt(0)}
    </div>
  );
}

// ============================================================
// Create Team Modal
// ============================================================

function CreateTeamModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { addTeam } = useTeamStore();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [avatar, setAvatar] = useState(AVATAR_COLORS[0]);

  const handleSubmit = () => {
    if (!name.trim()) return;
    addTeam({ name: name.trim(), description: desc.trim(), avatar });
    setName('');
    setDesc('');
    setAvatar(AVATAR_COLORS[0]);
    onClose();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('team.createTeam')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('team.teamName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder={t('team.teamName')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('team.teamDesc')}</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              rows={3}
              placeholder={t('team.teamDesc')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('team.teamName')} {t('team.teamDesc')}
            </label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setAvatar(c)}
                  className={`w-8 h-8 rounded-full ${c} flex items-center justify-center transition-transform ${avatar === c ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : 'hover:scale-105'}`}
                >
                  {avatar === c && (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.confirm')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Invite Member Modal
// ============================================================

function InviteMemberModal({ open, onClose, teamId }: { open: boolean; onClose: () => void; teamId: string }) {
  const { t } = useTranslation();
  const { addMember } = useTeamStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<MemberRole>('member');

  const handleSubmit = () => {
    if (!name.trim() || !email.trim()) return;
    addMember(teamId, {
      name: name.trim(),
      email: email.trim(),
      role,
      avatar: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    });
    setName('');
    setEmail('');
    setRole('member');
    onClose();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('team.inviteMember')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('login.username')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder={t('login.usernamePlaceholder')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('login.email')}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder={t('login.email')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('team.memberRole.owner')}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="admin">{t('team.memberRole.admin')}</option>
              <option value="member">{t('team.memberRole.member')}</option>
              <option value="viewer">{t('team.memberRole.viewer')}</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.confirm')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Create Project Modal
// ============================================================

function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { teams, addProject } = useTeamStore();
  const [name, setName] = useState('');
  const [teamId, setTeamId] = useState(teams[0]?.id || '');
  const [type, setType] = useState('document');

  const handleSubmit = () => {
    if (!name.trim() || !teamId) return;
    addProject({ name: name.trim(), teamId, type, members: [] });
    setName('');
    setTeamId(teams[0]?.id || '');
    setType('document');
    onClose();
  };

  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">{t('team.createProject')}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('team.projectName')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder={t('team.projectName')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('team.teamName')}</label>
            <select
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>{team.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('team.projectType')}</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="document">Document</option>
              <option value="knowledge">Knowledge</option>
              <option value="plan">Plan</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !teamId}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('common.confirm')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================
// Tab: Teams Overview
// ============================================================

function TeamsOverview() {
  const { t } = useTranslation();
  const { teams, sharedProjects, activityLog } = useTeamStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getProjectCount = (teamId: string) =>
    sharedProjects.filter((p) => p.teamId === teamId).length;

  const getLastActivity = (teamId: string) => {
    const teamActivity = activityLog.filter((a) => a.teamId === teamId);
    if (teamActivity.length === 0) return null;
    return teamActivity[0];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('team.overview')}</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all shadow-sm"
        >
          + {t('team.createTeam')}
        </button>
      </div>

      {teams.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{t('team.noTeams')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => {
            const projectCount = getProjectCount(team.id);
            const lastAct = getLastActivity(team.id);
            return (
              <motion.div
                key={team.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={team.name} color={team.avatar} size="lg" />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-base font-semibold text-gray-900 dark:text-white truncate">{team.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{team.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                    {team.members.length}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                    </svg>
                    {projectCount}
                  </div>
                  {lastAct && (
                    <div className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                      {formatRelativeTime(lastAct.timestamp)}
                    </div>
                  )}
                </div>
                {/* Member avatars */}
                <div className="flex items-center mt-3 -space-x-2">
                  {team.members.slice(0, 5).map((member) => (
                    <div
                      key={member.id}
                      className={`${member.avatar} w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-medium ring-2 ring-white dark:ring-gray-800`}
                      title={member.name}
                    >
                      {member.name.charAt(0)}
                    </div>
                  ))}
                  {team.members.length > 5 && (
                    <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-medium ring-2 ring-white dark:ring-gray-800">
                      +{team.members.length - 5}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <CreateTeamModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

// ============================================================
// Tab: Members
// ============================================================

function MembersTab() {
  const { t } = useTranslation();
  const { teams, removeMember, changeMemberRole } = useTeamStore();
  const [selectedTeamId, setSelectedTeamId] = useState(teams[0]?.id || '');
  const [showInviteModal, setShowInviteModal] = useState(false);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId);
  const allMembers = useMemo(() => {
    if (selectedTeamId === 'all') {
      return teams.flatMap((team) =>
        team.members.map((m) => ({ ...m, teamName: team.name })),
      );
    }
    if (selectedTeam) {
      return selectedTeam.members.map((m) => ({ ...m, teamName: selectedTeam.name }));
    }
    return [];
  }, [teams, selectedTeamId, selectedTeam]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('team.members')}</h3>
          <select
            value={selectedTeamId}
            onChange={(e) => setSelectedTeamId(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('team.overview')}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
        {selectedTeamId !== 'all' && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all shadow-sm"
          >
            + {t('team.inviteMember')}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {allMembers.map((member) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow"
          >
            <div className="relative">
              <Avatar name={member.name} color={member.avatar} />
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-800 ${isOnline(member.lastActive) ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{member.name}</span>
                <RoleBadge role={member.role} />
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-gray-400">{member.email}</span>
                {selectedTeamId === 'all' && (
                  <span className="text-xs text-gray-400">{member.teamName}</span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <OnlineIndicator lastActive={member.lastActive} />
              <span className="text-xs text-gray-400">{formatRelativeTime(member.lastActive)}</span>
            </div>
            {selectedTeamId !== 'all' && member.role !== 'owner' && (
              <div className="flex items-center gap-1 ml-2">
                <select
                  value={member.role}
                  onChange={(e) => changeMemberRole(selectedTeamId, member.id, e.target.value as MemberRole)}
                  className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none"
                >
                  <option value="admin">{t('team.memberRole.admin')}</option>
                  <option value="member">{t('team.memberRole.member')}</option>
                  <option value="viewer">{t('team.memberRole.viewer')}</option>
                </select>
                <button
                  onClick={() => removeMember(selectedTeamId, member.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title={t('team.removeMember')}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {selectedTeamId !== 'all' && (
        <InviteMemberModal
          open={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          teamId={selectedTeamId}
        />
      )}
    </div>
  );
}

// ============================================================
// Tab: Shared Projects
// ============================================================

function ProjectsTab() {
  const { t } = useTranslation();
  const { teams, sharedProjects } = useTeamStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getTeamName = (teamId: string) => teams.find((t) => t.id === teamId)?.name || '';
  const getTeamMembers = (teamId: string) => teams.find((t) => t.id === teamId)?.members || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('team.projects')}</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all shadow-sm"
        >
          + {t('team.createProject')}
        </button>
      </div>

      {sharedProjects.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{t('team.noProjects')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sharedProjects.map((project) => {
            const teamMembers = getTeamMembers(project.teamId);
            const projectMembers = teamMembers.filter((m) => project.members.includes(m.id));
            return (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={PROJECT_TYPE_ICONS[project.type] || PROJECT_TYPE_ICONS.document} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{project.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">{getTeamName(project.teamId)}</span>
                      <span className="text-xs text-gray-300 dark:text-gray-600">|</span>
                      <span className="text-xs text-gray-400">{project.type}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex items-center -space-x-1.5">
                    {projectMembers.slice(0, 4).map((m) => (
                      <div
                        key={m.id}
                        className={`${m.avatar} w-6 h-6 rounded-full flex items-center justify-center text-white text-xs ring-2 ring-white dark:ring-gray-800`}
                        title={m.name}
                      >
                        {m.name.charAt(0)}
                      </div>
                    ))}
                    {projectMembers.length > 4 && (
                      <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs ring-2 ring-white dark:ring-gray-800">
                        +{projectMembers.length - 4}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{formatRelativeTime(project.updatedAt)}</span>
                    <button className="px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors">
                      {t('team.openProject')}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <CreateProjectModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

// ============================================================
// Tab: Activity Log
// ============================================================

function ActivityTab() {
  const { t } = useTranslation();
  const { teams, activityLog } = useTeamStore();
  const [filterTeamId, setFilterTeamId] = useState('all');
  const [filterAction, setFilterAction] = useState('all');

  const filteredLog = useMemo(() => {
    return activityLog.filter((entry) => {
      if (filterTeamId !== 'all' && entry.teamId !== filterTeamId) return false;
      if (filterAction !== 'all' && entry.action !== filterAction) return false;
      return true;
    });
  }, [activityLog, filterTeamId, filterAction]);

  const getActionText = (action: string, target: string): string => {
    const actionMap: Record<string, string> = {
      joined: t('team.actionJoined'),
      created: t('team.actionCreated'),
      shared: t('team.actionShared'),
      edited: t('team.actionEdited'),
      commented: t('team.actionCommented'),
    };
    return `${actionMap[action] || action} ${target}`;
  };

  const actionColors: Record<string, string> = {
    joined: 'bg-green-500',
    created: 'bg-blue-500',
    shared: 'bg-purple-500',
    edited: 'bg-amber-500',
    commented: 'bg-indigo-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('team.activityLog')}</h3>
        <div className="flex items-center gap-2">
          <select
            value={filterTeamId}
            onChange={(e) => setFilterTeamId(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none"
          >
            <option value="all">{t('team.overview')}</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 outline-none"
          >
            <option value="all">{t('team.activityLog')}</option>
            <option value="joined">{t('team.actionJoined')}</option>
            <option value="created">{t('team.actionCreated')}</option>
            <option value="shared">{t('team.actionShared')}</option>
            <option value="edited">{t('team.actionEdited')}</option>
            <option value="commented">{t('team.actionCommented')}</option>
          </select>
        </div>
      </div>

      {filteredLog.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-0">
          {filteredLog.map((entry, index) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className="flex gap-3"
            >
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${actionColors[entry.action] || 'bg-gray-400'}`} />
                {index < filteredLog.length - 1 && (
                  <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 my-1" />
                )}
              </div>
              {/* Content */}
              <div className={`pb-4 flex-1 min-w-0 ${index === filteredLog.length - 1 ? 'pb-0' : ''}`}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {entry.userName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{entry.userName}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{getActionText(entry.action, entry.target)}</span>
                </div>
                <span className="text-xs text-gray-400 ml-8">{formatRelativeTime(entry.timestamp)}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Tab: Invitations
// ============================================================

function InvitationsTab() {
  const { t } = useTranslation();
  const { invitations, acceptInvitation, rejectInvitation } = useTeamStore();

  const pending = invitations.filter((i) => i.status === 'pending');
  const resolved = invitations.filter((i) => i.status !== 'pending');

  const statusStyles: Record<string, string> = {
    pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
    accepted: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    rejected: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };

  const statusLabels: Record<string, string> = {
    pending: t('team.invitations'),
    accepted: t('team.acceptInvite'),
    rejected: t('team.rejectInvite'),
  };

  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('team.invitations')}</h3>

      {invitations.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400">{t('team.noInvitations')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                {t('team.invitations')} ({pending.length})
              </h4>
              <div className="space-y-2">
                {pending.map((inv) => (
                  <motion.div
                    key={inv.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{inv.teamName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {inv.fromUser} &middot; <RoleBadge role={inv.role} />
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{formatRelativeTime(inv.createdAt)}</span>
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={() => acceptInvitation(inv.id)}
                        className="px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 rounded-lg transition-all"
                      >
                        {t('team.acceptInvite')}
                      </button>
                      <button
                        onClick={() => rejectInvitation(inv.id)}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                      >
                        {t('team.rejectInvite')}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                {t('team.activityLog')} ({resolved.length})
              </h4>
              <div className="space-y-2">
                {resolved.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 opacity-70"
                  >
                    <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{inv.teamName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {inv.fromUser} &middot; <RoleBadge role={inv.role} />
                      </div>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[inv.status]}`}>
                      {statusLabels[inv.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Right Sidebar
// ============================================================

function RightSidebar() {
  const { t } = useTranslation();
  const { teams, sharedProjects, activityLog } = useTeamStore();

  const totalMembers = useMemo(
    () => teams.reduce((acc, team) => acc + team.members.length, 0),
    [teams],
  );

  const recentActivity = activityLog.slice(0, 5);

  const getActionText = (action: string, target: string): string => {
    const actionMap: Record<string, string> = {
      joined: t('team.actionJoined'),
      created: t('team.actionCreated'),
      shared: t('team.actionShared'),
      edited: t('team.actionEdited'),
      commented: t('team.actionCommented'),
    };
    return `${actionMap[action] || action} ${target}`;
  };

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('team.overview')}</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('team.totalTeams')}</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{teams.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('team.totalMembers')}</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{totalMembers}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">{t('team.totalProjects')}</span>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">{sharedProjects.length}</span>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">{t('team.recentActivity')}</h3>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('common.noData')}</p>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[10px] font-medium flex-shrink-0 mt-0.5">
                  {entry.userName.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-700 dark:text-gray-300 truncate">
                    <span className="font-medium">{entry.userName}</span>{' '}
                    {getActionText(entry.action, entry.target)}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatRelativeTime(entry.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function TeamHub() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const tabs: TabItem[] = [
    { key: 'overview', labelKey: 'team.overview' },
    { key: 'members', labelKey: 'team.members' },
    { key: 'projects', labelKey: 'team.projects' },
    { key: 'activity', labelKey: 'team.activity' },
    { key: 'invitations', labelKey: 'team.invitations' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </span>
            {t('team.title')}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {activeTab === tab.key && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{t(tab.labelKey)}</span>
            </button>
          ))}
        </div>

        {/* Content + Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {activeTab === 'overview' && <TeamsOverview />}
                {activeTab === 'members' && <MembersTab />}
                {activeTab === 'projects' && <ProjectsTab />}
                {activeTab === 'activity' && <ActivityTab />}
                {activeTab === 'invitations' && <InvitationsTab />}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="hidden lg:block">
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
