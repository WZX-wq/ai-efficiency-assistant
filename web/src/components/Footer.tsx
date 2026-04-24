import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white">
                AI<span className="text-primary-400">效率助手</span>
              </span>
            </Link>
            <p className="text-sm text-gray-400 dark:text-gray-500 leading-relaxed mb-6">
              企业级 AI 内容创作平台，集成富文本编辑器与 AI 写作助手，全面提升内容创作与运营效率。
            </p>
            {/* Social Links */}
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/WZX-wq/ai-efficiency-assistant"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                aria-label="GitHub"
              >
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a
                href="#"
                title="微信: AI效率助手"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                aria-label="微信"
              >
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm3.97 3.258c-3.794 0-6.874 2.694-6.874 6.021 0 3.328 3.08 6.022 6.874 6.022.717 0 1.41-.103 2.064-.286a.723.723 0 01.598.082l1.585.926a.272.272 0 00.14.047c.134 0 .24-.11.24-.245 0-.06-.024-.12-.04-.178l-.325-1.233a.493.493 0 01.177-.554C22.896 18.872 24 17.086 24 15.27c0-3.327-3.08-6.021-6.874-6.021h-.558zm-2.347 2.93c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983zm4.694 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.983.97-.983z"/>
                </svg>
              </a>
              <a
                href="#"
                title="微博: @AI效率助手"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                aria-label="微博"
              >
                <svg className="w-4.5 h-4.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M10.098 20.323c-3.977.391-7.414-1.406-7.672-4.02-.259-2.609 2.759-5.047 6.74-5.441 3.979-.394 7.413 1.404 7.671 4.018.259 2.6-2.759 5.049-6.739 5.443zM9.05 17.219c-.384.616-1.208.884-1.829.602-.612-.279-.793-.991-.406-1.593.379-.595 1.176-.861 1.793-.583.631.283.822.985.442 1.574zm1.27-1.627c-.141.237-.449.353-.689.253-.236-.09-.313-.361-.177-.586.138-.227.436-.346.672-.24.239.09.328.36.194.573zm.176-2.719c-1.893-.493-4.033.45-4.857 2.118-.836 1.704-.026 3.591 1.886 4.21 1.983.642 4.318-.341 5.132-2.179.8-1.793-.201-3.642-2.161-4.149zM20.1 11.04c-.205-.665-.904-1.043-1.556-.844-.652.199-1.014.903-.809 1.568.207.664.904 1.043 1.557.844.652-.199 1.015-.903.808-1.568zm1.438-3.498c-.732-2.37-3.213-3.693-5.546-2.955-2.329.738-3.601 3.234-2.868 5.604.732 2.37 3.213 3.693 5.546 2.955 2.332-.738 3.601-3.234 2.868-5.604z"/>
                </svg>
              </a>
              <a
                href="mailto:contact@ai-assistant.com"
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
                aria-label="邮箱"
              >
                <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">产品</h3>
            <ul className="space-y-3">
              <li><Link to="/workspace" className="text-sm text-gray-400 hover:text-white transition-colors">AI工作台</Link></li>
              <li><Link to="/workspace/templates" className="text-sm text-gray-400 hover:text-white transition-colors">模板库</Link></li>
              <li><Link to="/workspace/brand" className="text-sm text-gray-400 hover:text-white transition-colors">品牌声音</Link></li>
              <li><Link to="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">定价方案</Link></li>
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">工具</h3>
            <ul className="space-y-3">
              <li><Link to="/workspace/creative" className="text-sm text-gray-400 hover:text-white transition-colors">创意灵感</Link></li>
              <li><Link to="/workspace/copywriting" className="text-sm text-gray-400 hover:text-white transition-colors">文案生成器</Link></li>
              <li><Link to="/workspace/seo" className="text-sm text-gray-400 hover:text-white transition-colors">SEO 优化</Link></li>
              <li><Link to="/workspace/humanize" className="text-sm text-gray-400 hover:text-white transition-colors">人性化改写</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">服务</h3>
            <ul className="space-y-3">
              <li><Link to="/services" className="text-sm text-gray-400 hover:text-white transition-colors">服务总览</Link></li>
              <li><Link to="/services/video" className="text-sm text-gray-400 hover:text-white transition-colors">短视频运营</Link></li>
              <li><Link to="/services/live-stream" className="text-sm text-gray-400 hover:text-white transition-colors">直播运营</Link></li>
              <li><Link to="/services/data-analysis" className="text-sm text-gray-400 hover:text-white transition-colors">数据分析</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">支持</h3>
            <ul className="space-y-3">
              <li><Link to="/settings" className="text-sm text-gray-400 hover:text-white transition-colors">设置</Link></li>
              <li><Link to="/workspace/history" className="text-sm text-gray-400 hover:text-white transition-colors">历史记录</Link></li>
              <li><Link to="/services#contact" className="text-sm text-gray-400 hover:text-white transition-colors">联系我们</Link></li>
              <li><Link to="/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">帮助中心</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-1 md:col-span-2 lg:col-span-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">订阅更新</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">获取最新功能更新和使用技巧</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              const email = (e.target as HTMLFormElement).querySelector('input')?.value;
              if (email) {
                const subs = JSON.parse(localStorage.getItem('ai-newsletter-subs') || '[]');
                if (!subs.includes(email)) {
                  subs.push(email);
                  localStorage.setItem('ai-newsletter-subs', JSON.stringify(subs));
                }
                (e.target as HTMLFormElement).reset();
                alert('订阅成功！');
              }
            }} className="flex gap-2">
              <input type="email" placeholder="your@email.com" required className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
              <button type="submit" className="px-4 py-1.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">订阅</button>
            </form>
          </div>
        </div>

        {/* Trust Badges */}
        <div className="mt-12 pt-8 border-t border-gray-800 dark:border-gray-700">
          <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
            {[
              { icon: '🔒', label: '数据加密传输' },
              { icon: '🛡️', label: '隐私安全保护' },
              { icon: '⚡', label: '99.9% 服务可用' },
              { icon: '🌍', label: '全球 CDN 加速' },
            ].map((badge) => (
              <div key={badge.label} className="flex items-center gap-2 text-sm text-gray-500">
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-800 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <p className="text-sm text-gray-500 dark:text-gray-600">
              &copy; {currentYear} AI效率助手. All rights reserved.
            </p>
            <div className="hidden sm:block w-px h-4 bg-gray-700" />
            <div className="flex items-center gap-4">
              <Link to="/privacy" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">隐私政策</Link>
              <Link to="/terms" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">服务条款</Link>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span>京ICP备XXXXXXXX号-1</span>
            <span>·</span>
            <span>京公网安备XXXXXXXXXXXXXX号</span>
            <span>·</span>
            <button
              onClick={() => {
                const current = localStorage.getItem('ai-assistant-i18n') || 'zh';
                const next = current === 'zh' ? 'en' : 'zh';
                localStorage.setItem('ai-assistant-i18n', next);
                window.location.reload();
              }}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
            >
              {localStorage.getItem('ai-assistant-i18n') === 'en' ? '中文' : 'English'}
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
