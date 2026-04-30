import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeo } from '../../components/SeoHead';
import { chatWithAiStream } from '../../services/aiChat';
import { useToast } from '../../components/ToastProvider';

// ============================================================
// Types
// ============================================================

type Genre = 'fantasy' | 'scifi' | 'mystery' | 'horror' | 'romance' | 'apocalypse';
type StoryLength = 'short' | 'medium' | 'long';
type Difficulty = 'easy' | 'normal' | 'hard';

interface GenreConfig {
  key: Genre;
  label: string;
  icon: string;
  description: string;
  bgClass: string;
  systemPrompt: string;
}

interface GameState {
  genre: Genre;
  characterName: string;
  characterBackground: string;
  storyLength: StoryLength;
  difficulty: Difficulty;
  hp: number;
  maxHp: number;
  inventory: string[];
  location: string;
  sceneCount: number;
  maxScenes: number;
  scenes: Array<{ text: string; choices: string[] }>;
  currentScene: string;
  currentChoices: string[];
  isGameOver: boolean;
  gameStarted: boolean;
  isBadEnding: boolean;
}

interface SaveData {
  state: GameState;
  timestamp: number;
}

// ============================================================
// Genre Configurations
// ============================================================

const GENRES: GenreConfig[] = [
  {
    key: 'fantasy',
    label: '奇幻冒险',
    icon: '⚔️',
    description: '剑与魔法、巨龙与地下城，踏上史诗般的冒险之旅',
    bgClass: 'from-amber-100/60 via-yellow-50/40',
    systemPrompt: `你是一个奇幻冒险互动小说的叙事者。你将引导玩家在一个充满魔法、剑术和神秘生物的奇幻世界中冒险。

规则：
1. 每次回复包含：场景描述 + 2-4个选择
2. 选择格式：[选择:选项文本|指令]
3. 物品获取/失去格式：[获得:物品名] 或 [失去:物品名]
4. 生命值变化格式：[生命:+10] 或 [生命:-20]
5. 场景描写要生动，有画面感
6. 根据玩家选择推进剧情，保持故事连贯性
7. 难度影响：轻松模式HP变化小，困难模式HP变化大
8. 当HP<=0时，触发坏结局

风格：史诗感、冒险精神、英雄主义。描写要有画面感和沉浸感。`,
  },
  {
    key: 'scifi',
    label: '科幻未来',
    icon: '🚀',
    description: '星际旅行、人工智能、时间悖论，探索未知的宇宙',
    bgClass: 'from-cyan-100/60 via-blue-50/40',
    systemPrompt: `你是一个科幻未来互动小说的叙事者。你将引导玩家在一个充满高科技、太空探索和未来科技的世界中冒险。

规则：
1. 每次回复包含：场景描述 + 2-4个选择
2. 选择格式：[选择:选项文本|指令]
3. 物品获取/失去格式：[获得:物品名] 或 [失去:物品名]
4. 生命值变化格式：[生命:+10] 或 [生命:-20]
5. 场景描写要有科技感和未来感
6. 根据玩家选择推进剧情，保持故事连贯性
7. 难度影响：轻松模式HP变化小，困难模式HP变化大
8. 当HP<=0时，触发坏结局

风格：硬科幻、未来感、哲学思考。描写要有科技感和想象力。`,
  },
  {
    key: 'mystery',
    label: '悬疑推理',
    icon: '🔍',
    description: '迷雾重重、线索交织，用智慧揭开真相的面纱',
    bgClass: 'from-slate-100/60 via-gray-50/40',
    systemPrompt: `你是一个悬疑推理互动小说的叙事者。你将引导玩家在一个充满谜团、线索和悬念的世界中探案。

规则：
1. 每次回复包含：场景描述 + 2-4个选择
2. 选择格式：[选择:选项文本|指令]
3. 物品获取/失去格式：[获得:物品名] 或 [失去:物品名]
4. 生命值变化格式：[生命:+10] 或 [生命:-20]
5. 场景描写要有悬疑感和紧张感
6. 线索要合理分布，让玩家有推理空间
7. 难度影响：轻松模式线索更多，困难模式线索更少
8. 当HP<=0时，触发坏结局（角色遇害）

风格：悬疑、紧张、逻辑严密。描写要有氛围感和推理乐趣。`,
  },
  {
    key: 'horror',
    label: '恐怖惊悚',
    icon: '👻',
    description: '黑暗笼罩、危机四伏，在恐惧中寻找生存之路',
    bgClass: 'from-gray-200/60 via-gray-100/40',
    systemPrompt: `你是一个恐怖惊悚互动小说的叙事者。你将引导玩家在一个充满恐怖、惊悚和未知的世界中求生。

规则：
1. 每次回复包含：场景描述 + 2-4个选择
2. 选择格式：[选择:选项文本|指令]
3. 物品获取/失去格式：[获得:物品名] 或 [失去:物品名]
4. 生命值变化格式：[生命:+10] 或 [生命:-20]
5. 场景描写要有恐怖氛围，但不要过度血腥
6. 制造紧张感和jump scare效果
7. 难度影响：轻松模式威胁较少，困难模式威胁更多
8. 当HP<=0时，触发坏结局

风格：恐怖、紧张、氛围感强。描写要有心理恐惧和压迫感。`,
  },
  {
    key: 'romance',
    label: '浪漫爱情',
    icon: '💕',
    description: '邂逅、心动、抉择，书写属于你的爱情故事',
    bgClass: 'from-pink-100/60 via-rose-50/40',
    systemPrompt: `你是一个浪漫爱情互动小说的叙事者。你将引导玩家在一个充满浪漫、情感和抉择的世界中体验爱情故事。

规则：
1. 每次回复包含：场景描述 + 2-4个选择
2. 选择格式：[选择:选项文本|指令]
3. 物品获取/失去格式：[获得:物品名] 或 [失去:物品名]
4. 生命值变化格式：[生命:+10] 或 [生命:-20]（这里代表心情值/好感度）
5. 场景描写要有浪漫氛围和情感细腻度
6. 角色要有个性，对话要自然
7. 难度影响：轻松模式好感度容易提升，困难模式需要更多努力
8. 当HP<=0时，触发坏结局（关系破裂）

风格：浪漫、细腻、温暖。描写要有情感共鸣和心动感。`,
  },
  {
    key: 'apocalypse',
    label: '末日生存',
    icon: '☢️',
    description: '资源匮乏、危机四伏，在废土世界中挣扎求生',
    bgClass: 'from-orange-100/60 via-amber-50/40',
    systemPrompt: `你是一个末日生存互动小说的叙事者。你将引导玩家在一个资源匮乏、危机四伏的末日世界中求生。

规则：
1. 每次回复包含：场景描述 + 2-4个选择
2. 选择格式：[选择:选项文本|指令]
3. 物品获取/失去格式：[获得:物品名] 或 [失去:物品名]
4. 生命值变化格式：[生命:+10] 或 [生命:-20]
5. 场景描写要有末世感和生存紧迫感
6. 资源管理是关键，选择要权衡利弊
7. 难度影响：轻松模式资源较多，困难模式资源极度匮乏
8. 当HP<=0时，触发坏结局

风格：末世感、生存紧迫、资源管理。描写要有荒凉感和求生欲。`,
  },
];

// ============================================================
// Constants
// ============================================================

const LENGTH_CONFIG: Record<StoryLength, { label: string; scenes: number }> = {
  short: { label: '短篇 (10场景)', scenes: 10 },
  medium: { label: '中篇 (20场景)', scenes: 20 },
  long: { label: '长篇 (30+场景)', scenes: 30 },
};

const DIFFICULTY_CONFIG: Record<Difficulty, { label: string; hp: number; description: string }> = {
  easy: { label: '轻松', hp: 150, description: '适合休闲体验' },
  normal: { label: '普通', hp: 100, description: '平衡的挑战' },
  hard: { label: '困难', hp: 70, description: '高难度，步步惊心' },
};

const SAVE_KEY = 'ai-fiction-save';

// ============================================================
// Helper Functions
// ============================================================

function parseChoices(text: string): { cleanText: string; choices: string[] } {
  const choiceRegex = /\[选择:([^\]|]+)\|([^\]]+)\]/g;
  const choices: string[] = [];
  let match;
  while ((match = choiceRegex.exec(text)) !== null) {
    choices.push(match[1]);
  }
  const cleanText = text.replace(/\[选择:[^\]]+\]/g, '').trim();
  return { cleanText, choices };
}

function parseInventoryChanges(text: string): { gained: string[]; lost: string[] } {
  const gained: string[] = [];
  const lost: string[] = [];
  const gainRegex = /\[获得:([^\]]+)\]/g;
  const loseRegex = /\[失去:([^\]]+)\]/g;
  let match;
  while ((match = gainRegex.exec(text)) !== null) {
    gained.push(match[1]);
  }
  while ((match = loseRegex.exec(text)) !== null) {
    lost.push(match[1]);
  }
  return { gained, lost };
}

function parseHpChange(text: string): number {
  const hpRegex = /\[生命:([+-]\d+)\]/;
  const match = hpRegex.exec(text);
  return match ? parseInt(match[1], 10) : 0;
}

function cleanResponseText(text: string): string {
  return text
    .replace(/\[选择:[^\]]+\]/g, '')
    .replace(/\[获得:[^\]]+\]/g, '')
    .replace(/\[失去:[^\]]+\]/g, '')
    .replace(/\[生命:[^\]]+\]/g, '')
    .trim();
}

// ============================================================
// Main Component
// ============================================================

export default function InteractiveFictionTool() {
  useSeo({
    title: 'AI互动小说 - AI效率助手',
    description: 'AI互动小说生成器，支持奇幻冒险、科幻未来、悬疑推理、恐怖惊悚、浪漫爱情、末日生存等多种题材，沉浸式互动阅读体验。',
    keywords: 'AI互动小说,互动阅读,文字冒险,选择游戏,AI故事生成,互动小说',
    canonicalUrl: '/workspace/fiction',
  });

  const { toast } = useToast();

  // Setup state
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null);
  const [characterName, setCharacterName] = useState('');
  const [characterBackground, setCharacterBackground] = useState('');
  const [storyLength, setStoryLength] = useState<StoryLength>('medium');
  const [difficulty, setDifficulty] = useState<Difficulty>('normal');

  // Game state
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLog, setShowLog] = useState(false);
  const [hasSave, setHasSave] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const chatHistoryRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  // Check for saved game on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      setHasSave(!!saved);
    } catch { /* ignore */ }
  }, []);

  // Auto scroll story
  useEffect(() => {
    if (storyRef.current) {
      storyRef.current.scrollTop = storyRef.current.scrollHeight;
    }
  }, [streamingText, gameState?.scenes]);

  const currentGenre = GENRES.find((g) => g.key === selectedGenre);

  const startGame = useCallback(() => {
    if (!selectedGenre || !characterName.trim()) return;

    const genreConfig = GENRES.find((g) => g.key === selectedGenre)!;
    const diffConfig = DIFFICULTY_CONFIG[difficulty];
    const lengthConfig = LENGTH_CONFIG[storyLength];

    const initialState: GameState = {
      genre: selectedGenre,
      characterName: characterName.trim(),
      characterBackground: characterBackground.trim(),
      storyLength,
      difficulty,
      hp: diffConfig.hp,
      maxHp: diffConfig.hp,
      inventory: [],
      location: '起点',
      sceneCount: 0,
      maxScenes: lengthConfig.scenes,
      scenes: [],
      currentScene: '',
      currentChoices: [],
      isGameOver: false,
      gameStarted: true,
      isBadEnding: false,
    };

    setGameState(initialState);
    chatHistoryRef.current = [];
    setStreamingText('');
    setLoading(true);

    // Generate opening scene
    const openingPrompt = `请开始一个新的${genreConfig.label}互动故事。
角色名：${characterName.trim()}
角色背景：${characterBackground.trim() || '未设定'}
故事长度：${lengthConfig.label}
难度：${diffConfig.label}（最大HP: ${diffConfig.hp}）

请生成开场场景，描述角色所处的环境和初始情况，并在末尾提供2-4个选择。`;

    generateScene(openingPrompt, genreConfig.systemPrompt, initialState);
  }, [selectedGenre, characterName, characterBackground, storyLength, difficulty]);

  const generateScene = async (prompt: string, systemPrompt: string, currentState: GameState) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const messages = [
        ...chatHistoryRef.current,
        { role: 'user' as const, content: prompt },
      ];

      const response = await chatWithAiStream(
        {
          messages,
          systemPrompt,
          temperature: 0.9,
          maxTokens: 2048,
        },
        controller.signal,
      );

      if (!response.success || !response.stream) {
        toast(response.error || '生成失败，请重试', 'error');
        setLoading(false);
        return;
      }

      const reader = response.stream.getReader();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullContent += value;
        setStreamingText(fullContent);
      }

      // Parse the response
      const { choices } = parseChoices(fullContent);
      const { gained, lost } = parseInventoryChanges(fullContent);
      const hpChange = parseHpChange(fullContent);

      // Update game state
      chatHistoryRef.current = [
        ...chatHistoryRef.current,
        { role: 'user', content: prompt },
        { role: 'assistant', content: fullContent },
      ];

      const newHp = Math.max(0, Math.min(currentState.maxHp, currentState.hp + hpChange));
      const newInventory = [
        ...currentState.inventory.filter((item) => !lost.includes(item)),
        ...gained.filter((item) => !currentState.inventory.includes(item)),
      ];
      const newSceneCount = currentState.sceneCount + 1;
      const isBadEnding = newHp <= 0;
      const isGameOver = isBadEnding || newSceneCount >= currentState.maxScenes;

      const newState: GameState = {
        ...currentState,
        hp: newHp,
        inventory: newInventory,
        sceneCount: newSceneCount,
        scenes: [
          ...currentState.scenes,
          { text: cleanResponseText(fullContent), choices },
        ],
        currentScene: cleanResponseText(fullContent),
        currentChoices: choices,
        isGameOver,
        isBadEnding,
      };

      setGameState(newState);
      setStreamingText('');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
      } else {
        toast('生成失败，请检查网络连接', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = useCallback((choice: string) => {
    if (!gameState || loading) return;

    const genreConfig = GENRES.find((g) => g.key === gameState.genre)!;
    setLoading(true);
    setStreamingText('');

    const prompt = `我选择：${choice}

当前状态：
- HP: ${gameState.hp}/${gameState.maxHp}
- 物品栏: ${gameState.inventory.length > 0 ? gameState.inventory.join('、') : '空'}
- 当前位置: ${gameState.location}
- 场景进度: ${gameState.sceneCount}/${gameState.maxScenes}

请根据我的选择继续推进故事。`;

    generateScene(prompt, genreConfig.systemPrompt, gameState);
  }, [gameState, loading]);

  const handleRestart = useCallback(() => {
    abortRef.current?.abort();
    setGameState(null);
    setStreamingText('');
    setLoading(false);
    chatHistoryRef.current = [];
  }, []);

  const handleSave = useCallback(() => {
    if (!gameState) return;
    try {
      const saveData: SaveData = { state: gameState, timestamp: Date.now() };
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
      setHasSave(true);
      toast('进度已保存', 'success');
    } catch {
      toast('保存失败', 'error');
    }
  }, [gameState, toast]);

  const handleLoad = useCallback(() => {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (!saved) {
        toast('没有找到存档', 'warning');
        return;
      }
      const saveData: SaveData = JSON.parse(saved);
      setGameState(saveData.state);
      setSelectedGenre(saveData.state.genre);
      setStreamingText('');
      toast('存档已加载', 'success');
    } catch {
      toast('加载存档失败', 'error');
    }
  }, [toast]);

  const handleExport = useCallback(() => {
    if (!gameState) return;
    const genreConfig = GENRES.find((g) => g.key === gameState.genre)!;
    let content = `# ${genreConfig.label} - ${gameState.characterName}的故事\n\n`;
    content += `角色: ${gameState.characterName}\n`;
    content += `背景: ${gameState.characterBackground || '无'}\n`;
    content += `难度: ${DIFFICULTY_CONFIG[gameState.difficulty].label}\n\n`;
    content += `---\n\n`;

    gameState.scenes.forEach((scene, idx) => {
      content += `## 场景 ${idx + 1}\n\n`;
      content += `${scene.text}\n\n`;
      if (scene.choices.length > 0) {
        content += `可选选项:\n`;
        scene.choices.forEach((c, ci) => {
          content += `${ci + 1}. ${c}\n`;
        });
        content += '\n';
      }
    });

    if (gameState.isBadEnding) {
      content += `\n---\n\n**坏结局** - 你的冒险到此结束...\n`;
    } else if (gameState.isGameOver) {
      content += `\n---\n\n**故事完结** - 恭喜你完成了这次冒险！\n`;
    }

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${genreConfig.label}_${gameState.characterName}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('故事已导出', 'success');
  }, [gameState, toast]);

  const hpPercent = gameState ? (gameState.hp / gameState.maxHp) * 100 : 100;
  const hpColor = hpPercent > 60 ? 'bg-green-500' : hpPercent > 30 ? 'bg-yellow-500' : 'bg-red-500';

  // ============================================================
  // Setup Screen
  // ============================================================

  if (!gameState) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Compact Hero */}
        <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-violet-100/60 via-purple-50/40 to-transparent rounded-full blur-3xl" />
            <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-purple-100/40 to-transparent rounded-full blur-3xl" />
          </div>

          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
              <Link to="/workspace" className="hover:text-violet-600 transition-colors">工具</Link>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <span className="text-gray-900 dark:text-white font-medium">互动小说</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
              <span className="bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 bg-clip-text text-transparent">
                AI互动小说
              </span>
            </h1>
            <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
              选择你的题材，创建角色，开始一段由AI驱动的沉浸式互动冒险
            </p>
          </div>
        </section>

        <section className="pb-20 sm:pb-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Load Save */}
            {hasSave && (
              <div className="mb-6">
                <button onClick={handleLoad} className="w-full py-3 rounded-xl text-sm font-semibold text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-all flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  加载上次存档
                </button>
              </div>
            )}

            {/* Genre Selection */}
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">选择题材</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
              {GENRES.map((genre) => (
                <button
                  key={genre.key}
                  onClick={() => setSelectedGenre(genre.key)}
                  className={`relative p-4 rounded-2xl border-2 text-left transition-all duration-200 ${
                    selectedGenre === genre.key
                      ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-700'
                  }`}
                >
                  <span className="text-3xl block mb-2">{genre.icon}</span>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">{genre.label}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{genre.description}</p>
                  {selectedGenre === genre.key && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Character Setup */}
            <AnimatePresence>
              {selectedGenre && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/10 dark:to-purple-900/10">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{currentGenre?.icon}</span>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 dark:text-white">角色设定</h2>
                          <p className="text-sm text-gray-500 dark:text-gray-400">创建你的角色，准备开始冒险</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色名称 *</label>
                        <input
                          type="text"
                          value={characterName}
                          onChange={(e) => setCharacterName(e.target.value)}
                          placeholder="输入你的角色名"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">角色背景（可选）</label>
                        <textarea
                          value={characterBackground}
                          onChange={(e) => setCharacterBackground(e.target.value)}
                          placeholder="描述角色的背景故事、性格特点..."
                          rows={3}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">故事长度</label>
                          <div className="space-y-2">
                            {(Object.entries(LENGTH_CONFIG) as [StoryLength, typeof LENGTH_CONFIG.short][]).map(([key, config]) => (
                              <button
                                key={key}
                                onClick={() => setStoryLength(key)}
                                className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                                  storyLength === key
                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-violet-300'
                                }`}
                              >
                                {config.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">难度</label>
                          <div className="space-y-2">
                            {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG.easy][]).map(([key, config]) => (
                              <button
                                key={key}
                                onClick={() => setDifficulty(key)}
                                className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                                  difficulty === key
                                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300'
                                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-violet-300'
                                }`}
                              >
                                {config.label}
                                <span className="block text-xs opacity-70 mt-0.5">{config.description}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={startGame}
                        disabled={!characterName.trim() || loading}
                        className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-500 hover:from-violet-700 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
                      >
                        {loading ? '正在生成开场...' : `开始${currentGenre?.label}冒险`}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>
      </div>
    );
  }

  // ============================================================
  // Game Screen
  // ============================================================

  const genreConfig = GENRES.find((g) => g.key === gameState.genre)!;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Status Bar */}
      <div className="sticky top-16 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-3 gap-2">
            {/* Left: Genre + Scene */}
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <span className="text-lg shrink-0">{genreConfig.icon}</span>
              <div className="min-w-0">
                <span className="text-sm font-semibold text-gray-900 dark:text-white truncate block">{genreConfig.label}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {gameState.sceneCount}/{gameState.maxScenes}
                </span>
              </div>
            </div>

            {/* Center: HP Bar */}
            <div className="hidden sm:flex items-center gap-2 flex-1 max-w-xs mx-4">
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">HP</span>
              <div className="flex-1 h-2.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${hpColor}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${hpPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 shrink-0">
                {gameState.hp}/{gameState.maxHp}
              </span>
            </div>

            {/* Mobile HP (compact) */}
            <div className="flex sm:hidden items-center gap-1.5">
              <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">HP</span>
              <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${hpColor}`}
                  initial={{ width: '100%' }}
                  animate={{ width: `${hpPercent}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400 shrink-0">
                {gameState.hp}
              </span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setShowLog(!showLog)}
                className="p-2 rounded-lg text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="故事日志"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              </button>
              <button onClick={handleSave} className="p-2 rounded-lg text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="保存进度">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17H17.01M17 17H17.01M17 17H17.01M3 7.5L7.5 3L12 7.5M3 7.5V20.25C3 20.664 3.336 21 3.75 21H20.25C20.664 21 21 20.664 21 20.25V7.5L16.5 3M3 7.5L7.5 7.5M12 7.5L16.5 7.5M12 7.5V21" />
                </svg>
              </button>
              <button onClick={handleExport} className="hidden sm:block p-2 rounded-lg text-gray-500 hover:text-violet-600 dark:text-gray-400 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="导出故事">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              </button>
              <button onClick={handleRestart} className="p-2 rounded-lg text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="重新开始">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
              </button>
            </div>
          </div>

          {/* Inventory Bar */}
          {gameState.inventory.length > 0 && (
            <div className="flex items-center gap-2 pb-2 overflow-x-auto scrollbar-thin">
              <span className="text-xs text-gray-400 shrink-0">物品:</span>
              {gameState.inventory.map((item, idx) => (
                <span key={idx} className="px-2 py-0.5 text-xs bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 rounded-full whitespace-nowrap">
                  {item}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Game Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex gap-6">
          {/* Story Content */}
          <div className="flex-1 min-w-0">
            <div
              ref={storyRef}
              className="min-h-[400px] max-h-[calc(100vh-280px)] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 scrollbar-thin"
            >
              {/* All past scenes */}
              {gameState.scenes.map((scene, idx) => (
                <div key={idx} className="mb-6">
                  {idx > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs text-gray-400 dark:text-gray-500">场景 {idx + 1}</span>
                      <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                    </div>
                  )}
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {scene.text}
                  </div>
                </div>
              ))}

              {/* Streaming text */}
              {streamingText && (
                <div className="mb-6">
                  <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {cleanResponseText(streamingText)}
                    <span className="inline-block w-2 h-4 bg-violet-500 animate-pulse ml-1 align-middle" />
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {loading && !streamingText && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                  <div className="w-12 h-12 border-4 border-violet-200 dark:border-violet-800 border-t-violet-500 rounded-full animate-spin" />
                  <p className="mt-4 text-sm">故事正在展开...</p>
                </div>
              )}

              {/* Game Over */}
              {gameState.isGameOver && !loading && (
                <div className={`mt-6 p-6 rounded-xl text-center ${
                  gameState.isBadEnding
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : 'bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800'
                }`}>
                  <span className="text-4xl block mb-2">{gameState.isBadEnding ? '💀' : '🏆'}</span>
                  <h3 className={`text-lg font-bold ${gameState.isBadEnding ? 'text-red-700 dark:text-red-400' : 'text-violet-700 dark:text-violet-400'}`}>
                    {gameState.isBadEnding ? '冒险结束...' : '冒险完成!'}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {gameState.isBadEnding
                      ? '你的角色倒下了...但每一次失败都是新的开始。'
                      : `恭喜你完成了${gameState.sceneCount}个场景的冒险！`}
                  </p>
                  <div className="flex gap-3 justify-center mt-4">
                    <button onClick={handleRestart} className="px-4 py-2 rounded-xl text-sm font-medium bg-violet-600 text-white hover:bg-violet-700 transition-colors">
                      重新开始
                    </button>
                    <button onClick={handleExport} className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      导出故事
                    </button>
                  </div>
                </div>
              )}

              {/* Choice Buttons */}
              {!gameState.isGameOver && !loading && gameState.currentChoices.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">你的选择</p>
                  {gameState.currentChoices.map((choice, idx) => (
                    <motion.button
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => handleChoice(choice)}
                      className="w-full px-5 py-3.5 rounded-xl text-sm font-medium text-left text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 transition-all group"
                    >
                      <span className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 flex items-center justify-center text-xs font-bold group-hover:bg-violet-200 dark:group-hover:bg-violet-800/40 transition-colors">
                          {String.fromCharCode(65 + idx)}
                        </span>
                        {choice}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Story Log Sidebar */}
          <AnimatePresence>
            {showLog && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 280 }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.3 }}
                className="hidden lg:block shrink-0 overflow-hidden"
              >
                <div className="w-[280px] h-[calc(100vh-280px)] bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-y-auto scrollbar-thin p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 sticky top-0 bg-white dark:bg-gray-800 pb-2 border-b border-gray-100 dark:border-gray-700">
                    故事日志
                  </h3>
                  <div className="space-y-3">
                    {gameState.scenes.map((scene, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-violet-600 dark:text-violet-400">场景 {idx + 1}</span>
                          {scene.choices.length > 0 && (
                            <span className="text-xs text-gray-400">{scene.choices.length} 选项</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-3">
                          {scene.text.slice(0, 100)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
