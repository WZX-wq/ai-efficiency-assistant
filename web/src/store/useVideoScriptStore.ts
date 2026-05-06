import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 视频平台类型 */
export type Platform = 'douyin' | 'kuaishou' | 'bilibili' | 'youtube' | 'xiaohongshu' | 'wechat-video';

/** 视频时长类型 */
export type Duration = '15s' | '30s' | '60s' | '3min' | '5min' | '10min';

/** 脚本语气类型 */
export type Tone = 'funny' | 'serious' | 'emotional' | 'professional' | 'casual' | 'inspirational';

/** 脚本段落类型 */
export type SectionType = 'hook' | 'intro' | 'body' | 'cta' | 'outro';

/** 脚本段落 */
export interface ScriptSection {
  id: string;
  type: SectionType;
  content: string;
  duration: number;
  visualNote?: string;
}

/** 视频脚本 */
export interface VideoScript {
  id: string;
  title: string;
  platform: Platform;
  duration: Duration;
  tone: Tone;
  topic: string;
  targetAudience: string;
  keyPoints: string[];
  scriptContent: ScriptSection[];
  status: 'draft' | 'generating' | 'completed';
  createdAt: number;
  updatedAt: number;
}

/** 脚本模板 */
export interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  duration: Duration;
  tone: Tone;
  defaultSections: { type: SectionType; duration: number }[];
}

/** Store 状态 */
interface VideoScriptState {
  scripts: VideoScript[];
  templates: ScriptTemplate[];
  currentScriptId: string | null;
}

/** Store 动作 */
interface VideoScriptActions {
  createScript: (script: Omit<VideoScript, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateScript: (id: string, updates: Partial<VideoScript>) => void;
  deleteScript: (id: string) => void;
  setCurrentScript: (id: string | null) => void;
  generateScript: (id: string) => void;
  updateSection: (scriptId: string, sectionId: string, updates: Partial<ScriptSection>) => void;
  reorderSections: (scriptId: string, fromIndex: number, toIndex: number) => void;
  addSection: (scriptId: string, section: Omit<ScriptSection, 'id'>) => void;
  removeSection: (scriptId: string, sectionId: string) => void;
  addTemplate: (template: Omit<ScriptTemplate, 'id'>) => void;
  deleteTemplate: (id: string) => void;
}

/** 生成唯一ID */
const generateId = () => Math.random().toString(36).substring(2, 15);

/** 平台配置 */
export const platformConfig: Record<Platform, { name: string; color: string; icon: string; tip: string }> = {
  douyin: {
    name: '抖音',
    color: 'from-black to-gray-800',
    icon: '🎵',
    tip: '抖音前3秒最关键，开头要有强吸引力',
  },
  kuaishou: {
    name: '快手',
    color: 'from-orange-500 to-red-500',
    icon: '⚡',
    tip: '快手用户喜欢真实、接地气的内容',
  },
  bilibili: {
    name: 'B站',
    color: 'from-pink-400 to-blue-400',
    icon: '📺',
    tip: 'B站用户偏好深度内容，可适当延长时长',
  },
  youtube: {
    name: 'YouTube',
    color: 'from-red-600 to-red-500',
    icon: '▶️',
    tip: 'YouTube适合长视频，注重SEO优化标题',
  },
  xiaohongshu: {
    name: '小红书',
    color: 'from-red-500 to-rose-500',
    icon: '📕',
    tip: '小红书注重生活方式分享，图片质量很重要',
  },
  'wechat-video': {
    name: '视频号',
    color: 'from-green-500 to-emerald-500',
    icon: '💬',
    tip: '视频号适合社交传播，内容要有分享价值',
  },
};

/** 时长配置 */
export const durationConfig: Record<Duration, { label: string; seconds: number; recommended: Platform[] }> = {
  '15s': { label: '15秒', seconds: 15, recommended: ['douyin', 'kuaishou'] },
  '30s': { label: '30秒', seconds: 30, recommended: ['douyin', 'kuaishou', 'xiaohongshu'] },
  '60s': { label: '1分钟', seconds: 60, recommended: ['douyin', 'kuaishou', 'xiaohongshu', 'wechat-video'] },
  '3min': { label: '3分钟', seconds: 180, recommended: ['bilibili', 'youtube', 'wechat-video'] },
  '5min': { label: '5分钟', seconds: 300, recommended: ['bilibili', 'youtube'] },
  '10min': { label: '10分钟', seconds: 600, recommended: ['bilibili', 'youtube'] },
};

/** 语气配置 */
export const toneConfig: Record<Tone, { name: string; description: string; color: string }> = {
  funny: { name: '幽默搞笑', description: '轻松有趣，让人会心一笑', color: 'bg-yellow-500' },
  serious: { name: '严肃正经', description: '专业严谨，适合知识分享', color: 'bg-gray-700' },
  emotional: { name: '情感共鸣', description: '打动人心，引发情感共振', color: 'bg-pink-500' },
  professional: { name: '专业权威', description: '行业专家，建立信任感', color: 'bg-blue-600' },
  casual: { name: '轻松随意', description: '像朋友聊天一样自然', color: 'bg-green-500' },
  inspirational: { name: '励志激励', description: '鼓舞人心，传递正能量', color: 'bg-orange-500' },
};

/** 段落类型配置 */
export const sectionTypeConfig: Record<SectionType, { name: string; color: string; bgColor: string; description: string }> = {
  hook: { name: '钩子', color: 'text-red-600', bgColor: 'bg-red-100 dark:bg-red-900/30', description: '前3秒抓住注意力' },
  intro: { name: '开场', color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30', description: '介绍主题和背景' },
  body: { name: '正文', color: 'text-green-600', bgColor: 'bg-green-100 dark:bg-green-900/30', description: '核心内容展开' },
  cta: { name: '行动号召', color: 'text-orange-600', bgColor: 'bg-orange-100 dark:bg-orange-900/30', description: '引导用户行动' },
  outro: { name: '结尾', color: 'text-purple-600', bgColor: 'bg-purple-100 dark:bg-purple-900/30', description: '总结和告别' },
};

/** 默认模板 */
const defaultTemplates: ScriptTemplate[] = [
  {
    id: 'template-1',
    name: '产品种草',
    description: '适合小红书和抖音的产品推荐视频',
    platform: 'xiaohongshu',
    duration: '60s',
    tone: 'casual',
    defaultSections: [
      { type: 'hook', duration: 3 },
      { type: 'intro', duration: 5 },
      { type: 'body', duration: 40 },
      { type: 'cta', duration: 8 },
      { type: 'outro', duration: 4 },
    ],
  },
  {
    id: 'template-2',
    name: '知识科普',
    description: 'B站风格的干货分享视频',
    platform: 'bilibili',
    duration: '3min',
    tone: 'professional',
    defaultSections: [
      { type: 'hook', duration: 10 },
      { type: 'intro', duration: 20 },
      { type: 'body', duration: 120 },
      { type: 'cta', duration: 20 },
      { type: 'outro', duration: 10 },
    ],
  },
  {
    id: 'template-3',
    name: '搞笑短剧',
    description: '抖音快手风格的搞笑内容',
    platform: 'douyin',
    duration: '30s',
    tone: 'funny',
    defaultSections: [
      { type: 'hook', duration: 2 },
      { type: 'body', duration: 25 },
      { type: 'outro', duration: 3 },
    ],
  },
  {
    id: 'template-4',
    name: '励志故事',
    description: '视频号情感励志内容',
    platform: 'wechat-video',
    duration: '60s',
    tone: 'inspirational',
    defaultSections: [
      { type: 'hook', duration: 5 },
      { type: 'intro', duration: 10 },
      { type: 'body', duration: 35 },
      { type: 'cta', duration: 8 },
      { type: 'outro', duration: 2 },
    ],
  },
  {
    id: 'template-5',
    name: 'Vlog日常',
    description: 'YouTube风格的生活记录',
    platform: 'youtube',
    duration: '5min',
    tone: 'casual',
    defaultSections: [
      { type: 'hook', duration: 15 },
      { type: 'intro', duration: 30 },
      { type: 'body', duration: 210 },
      { type: 'cta', duration: 30 },
      { type: 'outro', duration: 15 },
    ],
  },
];

/** 生成示例脚本 */
const generateMockScripts = (): VideoScript[] => [
  {
    id: 'script-1',
    title: '2024年必买的5件数码好物',
    platform: 'douyin',
    duration: '60s',
    tone: 'casual',
    topic: '数码产品推荐',
    targetAudience: '18-35岁科技爱好者',
    keyPoints: ['性价比高', '实用性强', '颜值在线'],
    scriptContent: [
      { id: 's1-1', type: 'hook', content: '花了3万块踩坑，这5件数码产品真的值得买！', duration: 3, visualNote: '展示堆积的数码产品，快速切换镜头' },
      { id: 's1-2', type: 'intro', content: '大家好，我是你们的数码博主小明。今天分享我这一年用下来最值得推荐的5件数码好物。', duration: 5, visualNote: '博主出镜，背景是整洁的桌面' },
      { id: 's1-3', type: 'body', content: '第一件是这个磁吸充电宝，轻薄便携，出门必备...（详细产品介绍）', duration: 40, visualNote: '产品特写，使用场景展示' },
      { id: 's1-4', type: 'cta', content: '喜欢的话记得点赞收藏，评论区告诉我你最想买哪一件！', duration: 8, visualNote: '指向点赞按钮，展示评论区' },
      { id: 's1-5', type: 'outro', content: '关注我，下期分享更多数码好物！', duration: 4, visualNote: '博主挥手告别' },
    ],
    status: 'completed',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'script-2',
    title: 'Python入门：30分钟学会基础语法',
    platform: 'bilibili',
    duration: '3min',
    tone: 'professional',
    topic: 'Python编程教学',
    targetAudience: '编程初学者',
    keyPoints: ['零基础友好', '实战案例', '源码分享'],
    scriptContent: [
      { id: 's2-1', type: 'hook', content: '如果你是完全零基础，想快速入门Python，这个视频就是为你准备的。', duration: 10, visualNote: '代码编辑器界面，Python logo动画' },
      { id: 's2-2', type: 'intro', content: '我是程序员老王，今天用3分钟带你了解Python最核心的语法。', duration: 20, visualNote: '讲师出镜，旁边显示Python版本信息' },
      { id: 's2-3', type: 'body', content: '首先看变量定义，Python不需要声明类型...（详细代码讲解）', duration: 120, visualNote: '代码高亮显示，逐行讲解' },
      { id: 's2-4', type: 'cta', content: '源码已经放在评论区置顶，记得一键三连支持一下！', duration: 20, visualNote: '显示GitHub链接，三连动画' },
      { id: 's2-5', type: 'outro', content: '下期我们讲函数和类，点个关注不迷路！', duration: 10, visualNote: '订阅按钮动画' },
    ],
    status: 'completed',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5,
  },
  {
    id: 'script-3',
    title: '当00后开始整顿职场',
    platform: 'kuaishou',
    duration: '30s',
    tone: 'funny',
    topic: '职场搞笑短剧',
    targetAudience: '年轻职场人',
    keyPoints: ['反差萌', '共鸣感', '反转结局'],
    scriptContent: [
      { id: 's3-1', type: 'hook', content: '老板：今晚加班！00后：劳动法了解一下？', duration: 2, visualNote: '老板严肃脸 vs 00后淡定脸' },
      { id: 's3-2', type: 'body', content: '（场景演绎：老板要求加班，00后拿出劳动法条文，老板震惊）', duration: 25, visualNote: '办公室场景，夸张表情特写' },
      { id: 's3-3', type: 'outro', content: '关注我，看更多职场神操作！', duration: 3, visualNote: '搞笑表情定格' },
    ],
    status: 'completed',
    createdAt: Date.now() - 86400000 * 7,
    updatedAt: Date.now() - 86400000 * 7,
  },
  {
    id: 'script-4',
    title: '从负债到年入百万，我的创业故事',
    platform: 'wechat-video',
    duration: '60s',
    tone: 'inspirational',
    topic: '创业励志分享',
    targetAudience: '创业者、想搞钱的人',
    keyPoints: ['真实经历', '干货分享', '激励人心'],
    scriptContent: [
      { id: 's4-1', type: 'hook', content: '3年前我负债50万，今天我想分享我是如何翻身的。', duration: 5, visualNote: '对比图：过去的困境 vs 现在的成就' },
      { id: 's4-2', type: 'intro', content: '很多人问我成功的秘诀，其实就三个字：执行力。', duration: 10, visualNote: '创业者出镜，背景是办公室' },
      { id: 's4-3', type: 'body', content: '那时候我每天早上5点起床，跑遍整个城市找货源...（创业故事）', duration: 35, visualNote: '老照片/视频素材，工作场景' },
      { id: 's4-4', type: 'cta', content: '如果你也在奋斗，双击屏幕给自己加油！', duration: 8, visualNote: '点赞动画，鼓励的手势' },
      { id: 's4-5', type: 'outro', content: '关注我，分享更多创业干货。', duration: 2, visualNote: '微笑挥手' },
    ],
    status: 'completed',
    createdAt: Date.now() - 86400000 * 10,
    updatedAt: Date.now() - 86400000 * 10,
  },
  {
    id: 'script-5',
    title: '东京7天深度游攻略',
    platform: 'xiaohongshu',
    duration: '60s',
    tone: 'casual',
    topic: '旅游攻略分享',
    targetAudience: '喜欢日本旅游的年轻人',
    keyPoints: ['省钱技巧', '小众景点', '美食推荐'],
    scriptContent: [
      { id: 's5-1', type: 'hook', content: '去了10次东京，这7个地方最值得去！', duration: 3, visualNote: '东京夜景/樱花等美景快剪' },
      { id: 's5-2', type: 'intro', content: '姐妹们好，我是爱旅行的橙子，今天分享我的私藏东京攻略。', duration: 5, visualNote: '博主出镜，背景是东京街景' },
      { id: 's5-3', type: 'body', content: '第一天建议住在新宿，交通最方便。一定要去这个隐藏版拉面店...（详细攻略）', duration: 40, visualNote: '景点实拍，美食特写' },
      { id: 's5-4', type: 'cta', content: '攻略整理成图文放在主页了，记得收藏！', duration: 8, visualNote: '展示小红书主页截图' },
      { id: 's5-5', type: 'outro', content: '下期分享京都攻略，关注我不错过！', duration: 4, visualNote: '挥手告别' },
    ],
    status: 'completed',
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 12,
  },
  {
    id: 'script-6',
    title: '我的极简生活：一年只买12件新衣服',
    platform: 'youtube',
    duration: '10min',
    tone: 'serious',
    topic: '极简生活方式',
    targetAudience: '追求品质生活的人群',
    keyPoints: ['环保理念', '省钱攻略', '品质提升'],
    scriptContent: [
      { id: 's6-1', type: 'hook', content: '一年只买12件新衣服，我的生活发生了什么变化？', duration: 15, visualNote: '衣柜前后对比，极简风格画面' },
      { id: 's6-2', type: 'intro', content: '大家好，我是极简主义者小林。今天想和大家聊聊我的消费观转变。', duration: 30, visualNote: '博主在极简风格的家中出镜' },
      { id: 's6-3', type: 'body', content: '开始极简生活之前，我的衣柜塞满了只穿一次的衣服...（详细经历分享）', duration: 210, visualNote: '生活场景实拍，数据图表展示' },
      { id: 's6-4', type: 'cta', content: '如果你也对极简生活感兴趣，订阅我的频道，每周更新。', duration: 30, visualNote: '订阅按钮动画' },
      { id: 's6-5', type: 'outro', content: '感谢观看，我们下期再见。', duration: 15, visualNote: '片尾画面，社交账号信息' },
    ],
    status: 'completed',
    createdAt: Date.now() - 86400000 * 15,
    updatedAt: Date.now() - 86400000 * 15,
  },
];

export const useVideoScriptStore = create<VideoScriptState & VideoScriptActions>()(
  persist(
    (set) => ({
      scripts: generateMockScripts(),
      templates: defaultTemplates,
      currentScriptId: null,

      createScript: (script) => {
        const id = generateId();
        const newScript: VideoScript = {
          ...script,
          id,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          scripts: [newScript, ...state.scripts],
          currentScriptId: id,
        }));
        return id;
      },

      updateScript: (id, updates) => {
        set((state) => ({
          scripts: state.scripts.map((script) =>
            script.id === id
              ? { ...script, ...updates, updatedAt: Date.now() }
              : script
          ),
        }));
      },

      deleteScript: (id) => {
        set((state) => ({
          scripts: state.scripts.filter((script) => script.id !== id),
          currentScriptId: state.currentScriptId === id ? null : state.currentScriptId,
        }));
      },

      setCurrentScript: (id) => {
        set({ currentScriptId: id });
      },

      generateScript: (id) => {
        set((state) => ({
          scripts: state.scripts.map((script) =>
            script.id === id
              ? { ...script, status: 'generating' as const }
              : script
          ),
        }));
      },

      updateSection: (scriptId, sectionId, updates) => {
        set((state) => ({
          scripts: state.scripts.map((script) =>
            script.id === scriptId
              ? {
                  ...script,
                  scriptContent: script.scriptContent.map((section) =>
                    section.id === sectionId ? { ...section, ...updates } : section
                  ),
                  updatedAt: Date.now(),
                }
              : script
          ),
        }));
      },

      reorderSections: (scriptId, fromIndex, toIndex) => {
        set((state) => ({
          scripts: state.scripts.map((script) => {
            if (script.id !== scriptId) return script;
            const sections = [...script.scriptContent];
            const [moved] = sections.splice(fromIndex, 1);
            sections.splice(toIndex, 0, moved);
            return { ...script, scriptContent: sections, updatedAt: Date.now() };
          }),
        }));
      },

      addSection: (scriptId, section) => {
        set((state) => ({
          scripts: state.scripts.map((script) =>
            script.id === scriptId
              ? {
                  ...script,
                  scriptContent: [
                    ...script.scriptContent,
                    { ...section, id: generateId() },
                  ],
                  updatedAt: Date.now(),
                }
              : script
          ),
        }));
      },

      removeSection: (scriptId, sectionId) => {
        set((state) => ({
          scripts: state.scripts.map((script) =>
            script.id === scriptId
              ? {
                  ...script,
                  scriptContent: script.scriptContent.filter((s) => s.id !== sectionId),
                  updatedAt: Date.now(),
                }
              : script
          ),
        }));
      },

      addTemplate: (template) => {
        set((state) => ({
          templates: [...state.templates, { ...template, id: generateId() }],
        }));
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((t) => t.id !== id),
        }));
      },
    }),
    {
      name: 'ai-assistant-video-scripts',
      partialize: (state) => ({
        scripts: state.scripts,
        templates: state.templates,
      }),
    }
  )
);

export default useVideoScriptStore;
