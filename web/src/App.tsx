import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import ToastProvider from './components/ToastProvider';
import Onboarding from './components/Onboarding';
import RouteProgress from './components/RouteProgress';
import ReadingProgress from './components/ReadingProgress';
import AnnouncementBar from './components/AnnouncementBar';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import Header from './components/Header';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import MobileNav from './components/MobileNav';
import BackToTop from './components/BackToTop';
import PageTransition from './components/PageTransition';
import { ToolPageSkeleton } from './components/Skeleton';
import ThemeProvider from './components/ThemeProvider';
import { useAppStore } from './store/appStore';
import { analytics } from './utils/analytics';

/** 轻量级页面加载 spinner — 用于非主要路由组件 */
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
  </div>
);

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
const RewriteTool = lazy(() => import('./pages/tools/RewriteTool'));
const ContinueTool = lazy(() => import('./pages/tools/ContinueTool'));
const TranslationTool = lazy(() => import('./pages/tools/TranslationTool'));
const DocAnalysisTool = lazy(() => import('./pages/tools/DocAnalysisTool'));
const MindMapTool = lazy(() => import('./pages/tools/MindMapTool'));
const LongFormTool = lazy(() => import('./pages/tools/LongFormTool'));
const LifeAssistantTool = lazy(() => import('./pages/tools/LifeAssistantTool'));
const PptGeneratorTool = lazy(() => import('./pages/tools/PptGeneratorTool'));
const DataAnalysisTool = lazy(() => import('./pages/tools/DataAnalysisTool'));
const MarketingTool = lazy(() => import('./pages/tools/MarketingTool'));
const InteractiveFictionTool = lazy(() => import('./pages/tools/InteractiveFictionTool'));
const Playground = lazy(() => import('./pages/Playground'));
const RolePlayChat = lazy(() => import('./pages/RolePlayChat'));
const CharacterCreator = lazy(() => import('./pages/CharacterCreator'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const ApiPlatform = lazy(() => import('./pages/ApiPlatform'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const TemplateMarket = lazy(() => import('./pages/TemplateMarket'));
const ThemeSettings = lazy(() => import('./pages/ThemeSettings'));

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

/** 滚动到顶部 + 路由追踪组件 */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    analytics.trackPageView(pathname);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter basename="/ai-efficiency-assistant">
      <ThemeProvider>
        <ToastProvider>
          <ThemeInitializer />
          <AppContent />
        </ToastProvider>
      </ThemeProvider>
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
      <ReadingProgress />
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
                <Route path="/" element={<ErrorBoundary><Suspense fallback={LazyFallback}><Home /></Suspense></ErrorBoundary>} />
                <Route path="/workspace" element={<ErrorBoundary><Suspense fallback={LazyFallback}><Workspace /></Suspense></ErrorBoundary>} />
                <Route path="/pricing" element={<ErrorBoundary><Suspense fallback={LazyFallback}><Pricing /></Suspense></ErrorBoundary>} />
                <Route path="/services" element={<ErrorBoundary><Suspense fallback={LazyFallback}><Services /></Suspense></ErrorBoundary>} />
                <Route path="/settings" element={<ErrorBoundary><Suspense fallback={LazyFallback}><Settings /></Suspense></ErrorBoundary>} />
                <Route path="/services/video" element={<ErrorBoundary><Suspense fallback={LazyFallback}><VideoProduction /></Suspense></ErrorBoundary>} />
                <Route path="/services/group-buy" element={<ErrorBoundary><Suspense fallback={LazyFallback}><GroupBuy /></Suspense></ErrorBoundary>} />
                <Route path="/services/private-domain" element={<ErrorBoundary><Suspense fallback={LazyFallback}><PrivateDomain /></Suspense></ErrorBoundary>} />
                <Route path="/services/ai-cs" element={<ErrorBoundary><Suspense fallback={LazyFallback}><AiCustomerService /></Suspense></ErrorBoundary>} />
                <Route path="/services/data-analysis" element={<ErrorBoundary><Suspense fallback={LazyFallback}><DataAnalysis /></Suspense></ErrorBoundary>} />
                <Route path="/services/live-stream" element={<ErrorBoundary><Suspense fallback={LazyFallback}><LiveStream /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/creative" element={<ErrorBoundary><Suspense fallback={LazyFallback}><CreativeTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/calendar" element={<ErrorBoundary><Suspense fallback={LazyFallback}><MarketingCalendar /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/scripts" element={<ErrorBoundary><Suspense fallback={LazyFallback}><ScriptLibrary /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/copywriting" element={<ErrorBoundary><Suspense fallback={LazyFallback}><CopywritingTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/history" element={<ErrorBoundary><Suspense fallback={LazyFallback}><History /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/brand" element={<ErrorBoundary><Suspense fallback={LazyFallback}><BrandVoice /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/seo" element={<ErrorBoundary><Suspense fallback={LazyFallback}><SeoTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/templates" element={<ErrorBoundary><Suspense fallback={LazyFallback}><Templates /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/humanize" element={<ErrorBoundary><Suspense fallback={LazyFallback}><HumanizeTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/polish" element={<ErrorBoundary><Suspense fallback={LazyFallback}><PolishTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/summarizer" element={<ErrorBoundary><Suspense fallback={LazyFallback}><SummarizerTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/rewrite" element={<ErrorBoundary><Suspense fallback={LazyFallback}><RewriteTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/continue" element={<ErrorBoundary><Suspense fallback={LazyFallback}><ContinueTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/translation" element={<ErrorBoundary><Suspense fallback={LazyFallback}><TranslationTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/doc-analysis" element={<ErrorBoundary><Suspense fallback={LazyFallback}><DocAnalysisTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/mindmap" element={<ErrorBoundary><Suspense fallback={LazyFallback}><MindMapTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/longform" element={<ErrorBoundary><Suspense fallback={LazyFallback}><LongFormTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/life-assistant" element={<ErrorBoundary><Suspense fallback={LazyFallback}><LifeAssistantTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/ppt-generator" element={<ErrorBoundary><Suspense fallback={LazyFallback}><PptGeneratorTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/data-analysis" element={<ErrorBoundary><Suspense fallback={LazyFallback}><DataAnalysisTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/marketing" element={<ErrorBoundary><Suspense fallback={LazyFallback}><MarketingTool /></Suspense></ErrorBoundary>} />
                <Route path="/workspace/fiction" element={<ErrorBoundary><Suspense fallback={LazyFallback}><InteractiveFictionTool /></Suspense></ErrorBoundary>} />
                <Route path="/playground" element={<ErrorBoundary><Suspense fallback={LazyFallback}><Playground /></Suspense></ErrorBoundary>} />
                <Route path="/playground/:cardId" element={<ErrorBoundary><Suspense fallback={LazyFallback}><RolePlayChat /></Suspense></ErrorBoundary>} />
                <Route path="/playground/create" element={<ErrorBoundary><Suspense fallback={LazyFallback}><CharacterCreator /></Suspense></ErrorBoundary>} />
                <Route path="/privacy" element={<ErrorBoundary><Suspense fallback={LazyFallback}><PrivacyPolicy /></Suspense></ErrorBoundary>} />
                <Route path="/terms" element={<ErrorBoundary><Suspense fallback={LazyFallback}><TermsOfService /></Suspense></ErrorBoundary>} />
                <Route path="/login" element={<ErrorBoundary><Suspense fallback={LazyFallback}><LoginPage /></Suspense></ErrorBoundary>} />
                <Route path="/profile" element={<ErrorBoundary><Suspense fallback={LazyFallback}><ProfilePage /></Suspense></ErrorBoundary>} />
                <Route path="/api-platform" element={<ErrorBoundary><Suspense fallback={LazyFallback}><ApiPlatform /></Suspense></ErrorBoundary>} />
                <Route path="/dashboard" element={<ErrorBoundary><Suspense fallback={LazyFallback}><Dashboard /></Suspense></ErrorBoundary>} />
                <Route path="/templates" element={<ErrorBoundary><Suspense fallback={LazyFallback}><TemplateMarket /></Suspense></ErrorBoundary>} />
                <Route path="/theme-settings" element={<ErrorBoundary><Suspense fallback={LazyFallback}><ThemeSettings /></Suspense></ErrorBoundary>} />
                <Route path="*" element={<ErrorBoundary><Suspense fallback={LazyFallback}><NotFound /></Suspense></ErrorBoundary>} />
              </Routes>
            </PageTransition>
          </ErrorBoundary>
        </main>
        <MobileNav />
        <BackToTop />
        <Footer />
      </div>
      <Suspense fallback={<PageLoader />}>
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
