import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSeo } from '../components/SeoHead';
import { useUserStore } from '../store/userStore';
import { useTranslation } from '../i18n';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, register, enterDemoMode, isAuthenticated } = useUserStore();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [rememberMe, setRememberMe] = useState(false);

  // 登录表单
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // 注册表单
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  useSeo('login');

  // 已登录则跳转
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/workspace', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginEmail.trim()) {
      setLoginError(t('login.emailRequired'));
      return;
    }
    if (!loginPassword) {
      setLoginError(t('login.passwordRequired'));
      return;
    }

    const success = login(loginEmail.trim(), loginPassword);
    if (success) {
      navigate('/workspace', { replace: true });
    } else {
      setLoginError(t('login.invalidCredentials'));
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess(false);

    if (!regUsername.trim() || regUsername.trim().length < 2) {
      setRegError(t('login.usernameMinLength'));
      return;
    }
    if (!regEmail.trim()) {
      setRegError(t('login.emailRequired'));
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setRegError(t('login.invalidEmail'));
      return;
    }
    if (regPassword.length < 6) {
      setRegError(t('login.passwordMinLength'));
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError(t('login.passwordMismatch'));
      return;
    }

    const success = register(regUsername.trim(), regEmail.trim(), regPassword);
    if (success) {
      setRegSuccess(true);
      setTimeout(() => {
        navigate('/workspace', { replace: true });
      }, 1000);
    } else {
      setRegError(t('login.emailExists'));
    }
  };

  const handleDemoMode = () => {
    enterDemoMode();
    navigate('/workspace', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 px-4 py-12">
      {/* 背景装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">
              AI<span className="text-blue-200">效率助手</span>
            </span>
          </Link>
          <p className="mt-3 text-blue-100/80 text-sm">
            {t('login.subtitle')}
          </p>
        </div>

        {/* 卡片 */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab 切换 */}
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            <button
              onClick={() => { setActiveTab('login'); setLoginError(''); }}
              className={`flex-1 py-4 text-sm font-medium transition-all duration-200 relative ${
                activeTab === 'login'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('login.loginTab')}
              {activeTab === 'login' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 transition-all duration-200" />
              )}
            </button>
            <button
              onClick={() => { setActiveTab('register'); setRegError(''); setRegSuccess(false); }}
              className={`flex-1 py-4 text-sm font-medium transition-all duration-200 relative ${
                activeTab === 'register'
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t('login.registerTab')}
              {activeTab === 'register' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 dark:bg-primary-400 transition-all duration-200" />
              )}
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {/* 登录表单 */}
            {activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                {loginError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {loginError}
                  </div>
                )}

                <div>
                  <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('login.email')}
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('login.password')}
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                    autoComplete="current-password"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-600 dark:text-gray-400">{t('login.rememberMe')}</span>
                  </label>
                  <button
                    type="button"
                    className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                  >
                    {t('login.forgotPassword')}
                  </button>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all text-sm shadow-sm hover:shadow-md"
                >
                  {t('login.loginButton')}
                </button>

                {/* 社交登录 */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white dark:bg-gray-900 text-gray-400">{t('login.orContinueWith')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                    GitHub
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Google
                  </button>
                </div>
              </form>
            )}

            {/* 注册表单 */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                {regError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {regError}
                  </div>
                )}
                {regSuccess && (
                  <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-600 dark:text-green-400">
                    {t('login.registerSuccess')}
                  </div>
                )}

                <div>
                  <label htmlFor="reg-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('login.username')}
                  </label>
                  <input
                    id="reg-username"
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value)}
                    placeholder={t('login.usernamePlaceholder')}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                    autoComplete="username"
                  />
                </div>

                <div>
                  <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('login.email')}
                  </label>
                  <input
                    id="reg-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('login.password')}
                  </label>
                  <input
                    id="reg-password"
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder={t('login.passwordPlaceholder')}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                    autoComplete="new-password"
                  />
                </div>

                <div>
                  <label htmlFor="reg-confirm-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {t('login.confirmPassword')}
                  </label>
                  <input
                    id="reg-confirm-password"
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder={t('login.confirmPasswordPlaceholder')}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-sm"
                    autoComplete="new-password"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 focus:ring-4 focus:ring-primary-200 dark:focus:ring-primary-800 transition-all text-sm shadow-sm hover:shadow-md"
                >
                  {t('login.registerButton')}
                </button>
              </form>
            )}

            {/* 体验模式 */}
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={handleDemoMode}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 focus:ring-4 focus:ring-amber-200 dark:focus:ring-amber-800 transition-all text-sm shadow-sm hover:shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672 13.684 16.6m0 0-2.51 2.225.569-9.47 5.227 7.917-3.286-.672ZM12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59" />
                </svg>
                {t('login.demoMode')}
              </button>
              <p className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
                {t('login.demoModeDesc')}
              </p>
            </div>
          </div>
        </div>

        {/* 底部 */}
        <p className="mt-6 text-center text-xs text-blue-200/60">
          {t('login.termsHint')}
        </p>
      </div>
    </div>
  );
}


