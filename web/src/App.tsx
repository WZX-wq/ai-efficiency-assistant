import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ToastProvider from './components/ToastProvider';
import Onboarding from './components/Onboarding';
import RouteProgress from './components/RouteProgress';
import AnnouncementBar from './components/AnnouncementBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import MobileNav from './components/MobileNav';
import BackToTop from './components/BackToTop';
import PageTransition from './components/PageTransition';
import { ToolPageSkeleton } from './components/Skeleton';
import { useAppStore } from './store/appStore';

// 大型组件懒加载 — 减少首屏 bundle 体积
const AiAssistantPanel = lazy(() => import('./components/AiAssistantPanel'));
const CommandPalette = lazy(() => import('./components/CommandPalette'));
const ShortcutsModal = lazy(() => import('./components/ShortcutsModal'));
const FeedbackWidget = lazy(() => import('./components/FeedbackWidget'));

const Home = lazy(() => import('./pages/Home'));
const Workspace = lazy(() => import('./pages/Workspace'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Services = lazy(() => import('./pages/Services'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const VideoProduction = lazy(() => import('./pages/services/VideoProduction'));
const GroupBuy = lazy(() => import('./pages/services/GroupBuy'));
const PrivateDomain = lazy(() => import('./pages/services/PrivateDomain'));
const AiCustomerService = lazy(() => import('./pages/services/AiCustomerService'));
const DataAnalysis = lazy(() => import('./pages/services/DataAnalysis'));
const LiveStream = lazy(() => import('./pages/services/LiveStream'));
const CreativeTool = lazy(() => import('./pages/tools/CreativeTool'));
const MarketingCalendar = lazy(() => import('./pages/tools/MarketingCalendar'));
const ScriptLibrary = lazy(() => import('./pages/tools/ScriptLibrary'));
const CopywritingTool = lazy(() => import('./pages/tools/CopywritingTool'));
const History = lazy(() => import('./pages/tools/History'));
const BrandVoice = lazy(() => import('./pages/tools/BrandVoice'));
const SeoTool = lazy(() => import('./pages/tools/SeoTool'));
const Templates = lazy(() => import('./pages/tools/Templates'));
const HumanizeTool = lazy(() => import('./pages/tools/HumanizeTool'));
const PolishTool = lazy(() => import('./pages/tools/PolishTool'));
const SummarizerTool = lazy(() => import('./pages/tools/SummarizerTool'));

const LazyFallback = <ToolPageSkeleton />;

/** 主题初始化组件 */
function ThemeInitializer() {
  const theme = useAppStore((s) => s.theme);

  useEffect(() => {
    const applyTheme = () => {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (prefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    applyTheme();

    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === 'system') applyTheme();
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  return null;
}

/** 滚动到顶部组件 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename="/ai-efficiency-assistant">
      <ToastProvider>
        <ThemeInitializer />
        <AppContent />
      </ToastProvider>
    </BrowserRouter>
  );
}

function AppContent() {
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);

  // 同步命令面板状态
  useEffect(() => {
    setCommandPaletteOpen(commandOpen);
  }, [commandOpen, setCommandPaletteOpen]);

  useKeyboardShortcuts(() => setCommandOpen(true));

  // ? 键打开快捷键帮助
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '?' && !['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <Onboarding />
      <RouteProgress />
      <AnnouncementBar />
      {/* 无障碍: 跳过导航链接 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none"
      >
        跳到主要内容
      </a>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          <ErrorBoundary>
            <PageTransition>
              <Routes>
                <Route path="/" element={<Suspense fallback={LazyFallback}><Home /></Suspense>} />
                <Route path="/workspace" element={<Suspense fallback={LazyFallback}><Workspace /></Suspense>} />
                <Route path="/pricing" element={<Suspense fallback={LazyFallback}><Pricing /></Suspense>} />
                <Route path="/services" element={<Suspense fallback={LazyFallback}><Services /></Suspense>} />
                <Route path="/settings" element={<Suspense fallback={LazyFallback}><Settings /></Suspense>} />
                <Route path="/services/video" element={<Suspense fallback={LazyFallback}><VideoProduction /></Suspense>} />
                <Route path="/services/group-buy" element={<Suspense fallback={LazyFallback}><GroupBuy /></Suspense>} />
                <Route path="/services/private-domain" element={<Suspense fallback={LazyFallback}><PrivateDomain /></Suspense>} />
                <Route path="/services/ai-cs" element={<Suspense fallback={LazyFallback}><AiCustomerService /></Suspense>} />
                <Route path="/services/data-analysis" element={<Suspense fallback={LazyFallback}><DataAnalysis /></Suspense>} />
                <Route path="/services/live-stream" element={<Suspense fallback={LazyFallback}><LiveStream /></Suspense>} />
                <Route path="/workspace/creative" element={<Suspense fallback={LazyFallback}><CreativeTool /></Suspense>} />
                <Route path="/workspace/calendar" element={<Suspense fallback={LazyFallback}><MarketingCalendar /></Suspense>} />
                <Route path="/workspace/scripts" element={<Suspense fallback={LazyFallback}><ScriptLibrary /></Suspense>} />
                <Route path="/workspace/copywriting" element={<Suspense fallback={LazyFallback}><CopywritingTool /></Suspense>} />
                <Route path="/workspace/history" element={<Suspense fallback={LazyFallback}><History /></Suspense>} />
                <Route path="/workspace/brand" element={<Suspense fallback={LazyFallback}><BrandVoice /></Suspense>} />
                <Route path="/workspace/seo" element={<Suspense fallback={LazyFallback}><SeoTool /></Suspense>} />
                <Route path="/workspace/templates" element={<Suspense fallback={LazyFallback}><Templates /></Suspense>} />
                <Route path="/workspace/humanize" element={<Suspense fallback={LazyFallback}><HumanizeTool /></Suspense>} />
                <Route path="/workspace/polish" element={<Suspense fallback={LazyFallback}><PolishTool /></Suspense>} />
                <Route path="/workspace/summarizer" element={<Suspense fallback={LazyFallback}><SummarizerTool /></Suspense>} />
                <Route path="/privacy" element={<Suspense fallback={LazyFallback}><PrivacyPolicy /></Suspense>} />
                <Route path="/terms" element={<Suspense fallback={LazyFallback}><TermsOfService /></Suspense>} />
                <Route path="*" element={<Suspense fallback={LazyFallback}><NotFound /></Suspense>} />
              </Routes>
            </PageTransition>
          </ErrorBoundary>
        </main>
        <MobileNav />
        <BackToTop />
        <Footer />
      </div>
      <Suspense fallback={null}>
        <AiAssistantPanel />
      </Suspense>
      <Suspense fallback={null}>
        <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} />
      </Suspense>
      <Suspense fallback={null}>
        <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      </Suspense>
      <Suspense fallback={null}>
        <FeedbackWidget />
      </Suspense>
      <ScrollToTop />
    </>
  );
}
