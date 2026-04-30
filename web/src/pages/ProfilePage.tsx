import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeo } from '../components/SeoHead';
import { useUserStore } from '../store/userStore';
import { useTranslation } from '../i18n';

export default function ProfilePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    user,
    isDemoMode,
    isAuthenticated,
    updateProfile,
    logout,
    activities,
    clearActivities,
  } = useUserStore();

  const [activeSection, setActiveSection] = useState('overview');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [showEditUsername, setShowEditUsername] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useSeo('profile');

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    if (user) {
      setEditUsername(user.username);
    }
  }, [user]);

  const daysActive = useMemo(() => {
    if (!user) return 0;
    return Math.max(1, Math.ceil((Date.now() - user.createdAt) / (1000 * 60 * 60 * 24)));
  }, [user]);

  // 模拟最近7天使用数据
  const weeklyUsage = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dayLabel = date.toLocaleDateString('zh-CN', { weekday: 'short' });
      // 使用确定性伪随机生成模拟数据
      const seed = (user?.createdAt ?? 0) + i * 137;
      const value = Math.floor(((Math.sin(seed) + 1) / 2) * 15) + 1;
      data.push({ day: dayLabel, value });
    }
    return data;
  }, [user]);

  const maxUsage = useMemo(() => Math.max(...weeklyUsage.map((d) => d.value)), [weeklyUsage]);

  const recentActivities = useMemo(() => activities.slice(0, 10), [activities]);

  const planLabel = useMemo(() => {
    if (!user) return '';
    switch (user.plan) {
      case 'pro': return t('profile.planPro');
      case 'enterprise': return t('profile.planEnterprise');
      default: return t('profile.planFree');
    }
  }, [user, t]);

  const planBadgeColor = useMemo(() => {
    if (!user) return '';
    switch (user.plan) {
      case 'pro': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'enterprise': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    }
  }, [user]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSaveUsername = () => {
    if (!editUsername.trim() || editUsername.trim().length < 2) {
      showMessage('error', t('login.usernameMinLength'));
      return;
    }
    updateProfile({ username: editUsername.trim() });
    setShowEditUsername(false);
    showMessage('success', t('profile.usernameUpdated'));
  };

  const handleChangePassword = () => {
    if (editPassword.length < 6) {
      showMessage('error', t('login.passwordMinLength'));
      return;
    }
    if (editPassword !== editConfirmPassword) {
      showMessage('error', t('login.passwordMismatch'));
      return;
    }
    setShowChangePassword(false);
    setEditPassword('');
    setEditConfirmPassword('');
    showMessage('success', t('profile.passwordUpdated'));
  };

  const handleDeleteAccount = () => {
    if (window.confirm(t('profile.deleteConfirm'))) {
      logout();
      navigate('/', { replace: true });
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  if (!user) return null;

  const sidebarItems = [
    { id: 'overview', label: t('profile.overview'), icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { id: 'settings', label: t('profile.accountSettings'), icon: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28ZM15 12a3 3 0 11-6 0 3 3 0 016 0Z' },
    { id: 'activity', label: t('profile.recentActivity'), icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 消息提示 */}
        {message && (
          <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'
          }`}>
            {message.text}
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-6">
          {/* 侧边栏 */}
          <aside className="lg:w-56 shrink-0">
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 lg:sticky lg:top-24">
              {/* 用户信息 */}
              <div className="flex flex-col items-center text-center mb-4 pb-4 border-b border-gray-100 dark:border-gray-800">
                <div className="relative group">
                  <img
                    src={user.avatar}
                    alt={user.username}
                    className="w-16 h-16 rounded-full ring-2 ring-primary-100 dark:ring-primary-900"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                    </svg>
                  </div>
                </div>
                <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{user.username}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                <span className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${planBadgeColor}`}>
                  {planLabel}
                </span>
                {isDemoMode && (
                  <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    {t('profile.demoBadge')}
                  </span>
                )}
              </div>

              {/* 导航 */}
              <nav className="space-y-1">
                {sidebarItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeSection === item.id
                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    {item.label}
                  </button>
                ))}
              </nav>

              {/* 退出 */}
              <button
                onClick={handleLogout}
                className="w-full mt-4 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
                {t('profile.logout')}
              </button>
            </div>
          </aside>

          {/* 主内容 */}
          <main className="flex-1 min-w-0">
            {/* 概览 */}
            {activeSection === 'overview' && (
              <div className="space-y-6">
                {/* 统计卡片 */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.wordsGenerated.toLocaleString()}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.wordsGenerated')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.aiCalls}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.aiCalls')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1H21M3 21V3" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{user.toolsUsed.length}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.toolsUsed')}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{daysActive}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('profile.daysActive')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 使用趋势 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('profile.usageTrend')}</h3>
                  <div className="flex items-end gap-3 h-40">
                    {weeklyUsage.map((item, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.value}</span>
                        <div
                          className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-md transition-all duration-500 min-h-[4px]"
                          style={{ height: `${(item.value / maxUsage) * 100}%` }}
                        />
                        <span className="text-xs text-gray-400 dark:text-gray-500">{item.day}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 会员升级 */}
                <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{t('profile.currentPlan')}: {planLabel}</h3>
                      <p className="mt-1 text-sm text-white/80">{t('profile.upgradeDesc')}</p>
                    </div>
                    <Link
                      to="/pricing"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white text-primary-600 font-medium rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      {t('profile.upgrade')}
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </Link>
                  </div>
                </div>

                {/* 成就展示 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('profile.achievements')}</h3>
                  {user.achievements.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">{t('profile.noAchievements')}</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {user.achievements.map((achievement, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                          <span className="text-lg">&#x1f3c6;</span>
                          <span className="text-sm text-gray-700 dark:text-gray-300">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 账户设置 */}
            {activeSection === 'settings' && (
              <div className="space-y-6">
                {/* 修改用户名 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('profile.changeUsername')}</h3>
                    <button
                      onClick={() => setShowEditUsername(!showEditUsername)}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                    >
                      {showEditUsername ? t('common.cancel') : t('profile.edit')}
                    </button>
                  </div>
                  {showEditUsername ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      />
                      <button
                        onClick={handleSaveUsername}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">{user.username}</p>
                  )}
                </div>

                {/* 修改密码 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('profile.changePassword')}</h3>
                    <button
                      onClick={() => setShowChangePassword(!showChangePassword)}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium"
                    >
                      {showChangePassword ? t('common.cancel') : t('profile.edit')}
                    </button>
                  </div>
                  {showChangePassword ? (
                    <div className="space-y-3">
                      <input
                        type="password"
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder={t('login.newPassword')}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      />
                      <input
                        type="password"
                        value={editConfirmPassword}
                        onChange={(e) => setEditConfirmPassword(e.target.value)}
                        placeholder={t('login.confirmPassword')}
                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white text-sm placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                      />
                      <button
                        onClick={handleChangePassword}
                        className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                      >
                        {t('common.save')}
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 dark:text-gray-500">••••••••</p>
                  )}
                </div>

                {/* 危险区域 */}
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900 p-6">
                  <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-2">{t('profile.dangerZone')}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('profile.deleteDesc')}</p>
                  <button
                    onClick={handleDeleteAccount}
                    className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
                  >
                    {t('profile.deleteAccount')}
                  </button>
                </div>
              </div>
            )}

            {/* 最近活动 */}
            {activeSection === 'activity' && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{t('profile.recentActivity')}</h3>
                  {activities.length > 0 && (
                    <button
                      onClick={clearActivities}
                      className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      {t('profile.clearActivity')}
                    </button>
                  )}
                </div>
                {recentActivities.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-8 text-center">{t('profile.noActivity')}</p>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-800">
                    {recentActivities.map((item) => (
                      <div key={item.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">{item.action}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.detail}</p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-4">
                          {new Date(item.timestamp).toLocaleString('zh-CN', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
