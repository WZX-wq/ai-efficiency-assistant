import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const quickLinks = [
  { to: '/workspace', label: 'AI 工作台', icon: '⚡', desc: '开始内容创作' },
  { to: '/services', label: '服务总览', icon: '🛎️', desc: '查看专业服务' },
  { to: '/pricing', label: '定价方案', icon: '💎', desc: '选择适合的套餐' },
  { to: '/workspace/templates', label: '模板库', icon: '📑', desc: '20+ 专业模板' },
  { to: '/workspace/history', label: '历史记录', icon: '📋', desc: '查看生成历史' },
  { to: '/settings', label: '设置', icon: '⚙️', desc: '模型与偏好配置' },
];

export default function NotFound() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/workspace');
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-4 py-20">
      <div className="max-w-2xl w-full text-center animate-fade-in">
        {/* Illustration */}
        <div className="relative mb-8 inline-block">
          <div className="text-[120px] sm:text-[160px] font-extrabold text-gray-100 dark:text-gray-800 select-none leading-none tracking-tighter">
            404
          </div>
          {/* Floating elements */}
          <div className="absolute top-4 -right-4 sm:top-6 sm:-right-6 w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center text-2xl animate-bounce" style={{ animationDelay: '0.2s' }}>
            🤖
          </div>
          <div className="absolute -bottom-2 -left-4 sm:-bottom-4 sm:-left-6 w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-xl animate-bounce" style={{ animationDelay: '0.5s' }}>
            📝
          </div>
          <div className="absolute top-1/2 -right-8 sm:-right-12 w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center text-base animate-bounce" style={{ animationDelay: '0.8s' }}>
            ✨
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3 animate-slide-up">
          页面走丢了
        </h1>
        <p className="text-base text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto animate-slide-up">
          你访问的页面不存在或已被移除。试试搜索或从下方快捷入口继续探索。
        </p>

        {/* Search Box */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto mb-10 animate-slide-up">
          <div className="relative">
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索工具、模板、服务..."
              className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition shadow-sm"
            />
          </div>
        </form>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10 animate-slide-up">
          {quickLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="group flex flex-col items-center gap-2 p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{link.icon}</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{link.label}</span>
              <span className="text-xs text-gray-400 dark:text-gray-500">{link.desc}</span>
            </Link>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 animate-slide-up">
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
          <Link
            to="/services#contact"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            报告此问题
          </Link>
        </div>
      </div>
    </div>
  );
}
