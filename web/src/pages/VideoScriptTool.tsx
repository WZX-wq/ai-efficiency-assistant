import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { chatWithAiStream, ChatWithAiRequest } from '../services/aiChat';
import useVideoScriptStore, {
  Platform,
  Duration,
  Tone,
  SectionType,
  VideoScript,
  ScriptSection,
  platformConfig,
  durationConfig,
  toneConfig,
  sectionTypeConfig,
} from '../store/useVideoScriptStore';
import { useSeo } from '../components/SeoHead';

// Icons
const Icons = {
  Plus: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  Trash: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Edit: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  Copy: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Download: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Sparkles: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  Search: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Eye: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  EyeOff: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ),
  GripVertical: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
    </svg>
  ),
  ChevronDown: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  Info: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  X: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  FileText: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Play: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Save: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
    </svg>
  ),
};

// Platform selector component
function PlatformSelector({
  value,
  onChange,
  t,
}: {
  value: Platform;
  onChange: (platform: Platform) => void;
  t: (key: string) => string;
}) {
  const platforms: Platform[] = ['douyin', 'kuaishou', 'bilibili', 'youtube', 'xiaohongshu', 'wechat-video'];

  return (
    <div className="grid grid-cols-3 gap-2">
      {platforms.map((platform) => (
        <button
          key={platform}
          onClick={() => onChange(platform)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
            value === platform
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300'
              : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
          }`}
        >
          <span>{platformConfig[platform].icon}</span>
          <span className="text-sm font-medium">{t(`videoScript.platforms.${platform}`)}</span>
        </button>
      ))}
    </div>
  );
}

// Duration selector component
function DurationSelector({
  value,
  onChange,
  t,
  platform,
}: {
  value: Duration;
  onChange: (duration: Duration) => void;
  t: (key: string) => string;
  platform: Platform;
}) {
  const durations: Duration[] = ['15s', '30s', '60s', '3min', '5min', '10min'];

  return (
    <div className="flex flex-wrap gap-2">
      {durations.map((duration) => {
        const isRecommended = durationConfig[duration].recommended.includes(platform);
        return (
          <button
            key={duration}
            onClick={() => onChange(duration)}
            className={`relative px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              value === duration
                ? 'bg-gradient-to-r from-red-500 to-rose-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {t(`videoScript.durations.${duration}`)}
            {isRecommended && value !== duration && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// Tone selector component
function ToneSelector({
  value,
  onChange,
  t,
}: {
  value: Tone;
  onChange: (tone: Tone) => void;
  t: (key: string) => string;
}) {
  const tones: Tone[] = ['funny', 'serious', 'emotional', 'professional', 'casual', 'inspirational'];

  return (
    <div className="grid grid-cols-2 gap-2">
      {tones.map((tone) => (
        <button
          key={tone}
          onClick={() => onChange(tone)}
          className={`flex flex-col items-start px-3 py-2 rounded-lg border transition-all text-left ${
            value === tone
              ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
              : 'border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
          }`}
        >
          <span className={`text-sm font-medium ${value === tone ? 'text-red-700 dark:text-red-300' : ''}`}>
            {t(`videoScript.tones.${tone}`)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{toneConfig[tone].description}</span>
        </button>
      ))}
    </div>
  );
}

// Tag input component for key points
function TagInput({
  tags,
  onChange,
  placeholder,
  hint,
}: {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
  hint: string;
}) {
  const [input, setInput] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) {
        onChange([...tags, input.trim()]);
      }
      setInput('');
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  return (
    <div className="w-full">
      <div className="flex flex-wrap gap-2 p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 min-h-[42px]">
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-sm rounded-md"
          >
            {tag}
            <button onClick={() => removeTag(index)} className="hover:text-red-900 dark:hover:text-red-100">
              <Icons.X />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] bg-transparent outline-none text-sm"
        />
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
    </div>
  );
}

// Script section card component
function SectionCard({
  section,
  isPreview,
  onUpdate,
  onRemove,
  onEnhance,
  isEnhancing,
  t,
}: {
  section: ScriptSection;
  index: number;
  isPreview: boolean;
  onUpdate: (updates: Partial<ScriptSection>) => void;
  onRemove: () => void;
  onEnhance: () => void;
  isEnhancing: boolean;
  t: (key: string) => string;
}) {
  const config = sectionTypeConfig[section.type];

  if (isPreview) {
    return (
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bgColor} ${config.color}`}>
            {t(`videoScript.sectionTypes.${section.type}`)}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">{section.duration}s</span>
        </div>
        <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{section.content}</p>
        {section.visualNote && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
            🎬 {section.visualNote}
          </p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-move">
          <Icons.GripVertical />
        </button>
        <span className={`px-2 py-0.5 text-xs font-medium rounded ${config.bgColor} ${config.color}`}>
          {t(`videoScript.sectionTypes.${section.type}`)}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto">
          {config.description}
        </span>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Icons.Trash />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <textarea
          value={section.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
          placeholder={t('videoScript.contentPlaceholder')}
          rows={3}
          className="w-full px-3 py-2 bg-transparent border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        />
        <div className="flex gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('videoScript.durationSeconds')}</span>
            <input
              type="number"
              value={section.duration}
              onChange={(e) => onUpdate({ duration: parseInt(e.target.value) || 0 })}
              className="w-16 px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <button
            onClick={onEnhance}
            disabled={isEnhancing}
            className="flex items-center gap-1 px-3 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <Icons.Sparkles />
            {isEnhancing ? t('videoScript.aiEnhancing') : t('videoScript.aiEnhance')}
          </button>
        </div>
        <input
          type="text"
          value={section.visualNote || ''}
          onChange={(e) => onUpdate({ visualNote: e.target.value })}
          placeholder={t('videoScript.visualNotePlaceholder')}
          className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        />
      </div>
    </motion.div>
  );
}

// Timeline component
function Timeline({
  sections,
  totalDuration,
  t,
}: {
  sections: ScriptSection[];
  totalDuration: number;
  t: (key: string) => string;
}) {
  const getPosition = (duration: number, startTime: number) => {
    const left = (startTime / totalDuration) * 100;
    const width = (duration / totalDuration) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  let currentTime = 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('videoScript.timeline')}</span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {t('videoScript.totalDuration')}: {Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')}
        </span>
      </div>
      <div className="relative h-12 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
        {sections.map((section) => {
          const position = getPosition(section.duration, currentTime);
          currentTime += section.duration;
          const config = sectionTypeConfig[section.type];
          return (
            <div
              key={section.id}
              className={`absolute top-0 h-full ${config.bgColor} border-r border-white dark:border-gray-700 flex items-center justify-center text-xs font-medium ${config.color} truncate px-1`}
              style={position}
              title={`${t(`videoScript.sectionTypes.${section.type}`)} - ${section.duration}s`}
            >
              {section.duration}s
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-xs text-gray-400">
        <span>0:00</span>
        <span>{Math.floor(totalDuration / 60)}:{String(totalDuration % 60).padStart(2, '0')}</span>
      </div>
    </div>
  );
}

// Script list sidebar component
function ScriptSidebar({
  scripts,
  currentId,
  onSelect,
  onDelete,
  t,
}: {
  scripts: VideoScript[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Platform | 'all'>('all');

  const filteredScripts = useMemo(() => {
    return scripts
      .filter((script) => {
        const matchesSearch = script.title.toLowerCase().includes(search.toLowerCase()) ||
          script.topic.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filter === 'all' || script.platform === filter;
        return matchesSearch && matchesFilter;
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [scripts, search, filter]);

  return (
    <div className="w-72 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{t('videoScript.title')}</h3>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('videoScript.searchPlaceholder')}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            <Icons.Search />
          </span>
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Platform | 'all')}
          className="w-full mt-2 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
        >
          <option value="all">{t('videoScript.filterAll')}</option>
          {Object.keys(platformConfig).map((platform) => (
            <option key={platform} value={platform}>
              {platformConfig[platform as Platform].icon} {t(`videoScript.platforms.${platform}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filteredScripts.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">{t('videoScript.noScripts')}</p>
          </div>
        ) : (
          filteredScripts.map((script) => (
            <div
              key={script.id}
              onClick={() => onSelect(script.id)}
              className={`group p-3 rounded-lg cursor-pointer transition-all ${
                currentId === script.id
                  ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  : 'hover:bg-white dark:hover:bg-gray-800 border border-transparent'
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{platformConfig[script.platform].icon}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                    {script.title}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{script.topic}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                    <span>{durationConfig[script.duration].label}</span>
                    <span>•</span>
                    <span>{t(`videoScript.tones.${script.tone}`)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(t('videoScript.deleteConfirm'))) {
                      onDelete(script.id);
                    }
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all"
                >
                  <Icons.Trash />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Main component
export default function VideoScriptTool() {
  const { t } = useTranslation();
  useSeo('videoScript');

  const {
    scripts,
    templates,
    currentScriptId,
    createScript,
    updateScript,
    deleteScript,
    setCurrentScript,
    updateSection,
    addSection,
    removeSection,
  } = useVideoScriptStore();

  // Form state
  const [platform, setPlatform] = useState<Platform>('douyin');
  const [duration, setDuration] = useState<Duration>('60s');
  const [tone, setTone] = useState<Tone>('casual');
  const [topic, setTopic] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [keyPoints, setKeyPoints] = useState<string[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [enhancingSectionId, setEnhancingSectionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Get current script
  const currentScript = useMemo(() => {
    return scripts.find((s) => s.id === currentScriptId) || null;
  }, [scripts, currentScriptId]);

  // Load current script data into form
  useEffect(() => {
    if (currentScript) {
      setPlatform(currentScript.platform);
      setDuration(currentScript.duration);
      setTone(currentScript.tone);
      setTopic(currentScript.topic);
      setTargetAudience(currentScript.targetAudience);
      setKeyPoints(currentScript.keyPoints);
    }
  }, [currentScriptId]);

  // Calculate total duration
  const totalDuration = useMemo(() => {
    if (currentScript) {
      return currentScript.scriptContent.reduce((sum, section) => sum + section.duration, 0);
    }
    return 0;
  }, [currentScript]);

  // Generate script with AI
  const handleGenerate = async () => {
    if (!topic.trim()) return;

    setIsGenerating(true);

    const scriptId = currentScript?.id || createScript({
      title: topic.slice(0, 30) + (topic.length > 30 ? '...' : ''),
      platform,
      duration,
      tone,
      topic,
      targetAudience,
      keyPoints,
      scriptContent: [],
      status: 'generating',
    });

    const request: ChatWithAiRequest = {
      systemPrompt: `你是一位资深的短视频脚本创作专家。请根据用户提供的平台、时长、语气和主题，生成一个专业的视频脚本。

要求：
1. 脚本必须包含以下段落类型：hook（钩子/开场吸引）、intro（介绍）、body（正文内容）、cta（行动号召）、outro（结尾）
2. 每个段落需要标注建议时长（秒）
3. 每个段落需要包含画面提示（描述应该展示什么视觉内容）
4. 语气风格要符合选择的平台特点和语气要求
5. 总时长控制在${durationConfig[duration].seconds}秒左右
6. 平台：${platformConfig[platform].name}，特点：${platformConfig[platform].tip}

请按以下JSON格式返回：
{
  "sections": [
    {
      "type": "hook",
      "content": "段落文案",
      "duration": 3,
      "visualNote": "画面提示"
    }
  ]
}`,
      messages: [
        {
          role: 'user',
          content: `请为以下主题生成视频脚本：
主题：${topic}
目标受众：${targetAudience || '通用受众'}
关键要点：${keyPoints.join('、') || '无'}
语气风格：${toneConfig[tone].name}
视频时长：${durationConfig[duration].label}`,
        },
      ],
      temperature: 0.8,
      maxTokens: 2048,
    };

    try {
      const response = await chatWithAiStream(request);

      if (response.success && response.stream) {
        const reader = response.stream.getReader();
        let result = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += value;
        }

        // Parse JSON from result
        try {
          const jsonMatch = result.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const data = JSON.parse(jsonMatch[0]);
            if (data.sections && Array.isArray(data.sections)) {
              const newSections: ScriptSection[] = data.sections.map((s: any) => ({
                id: Math.random().toString(36).substring(2, 15),
                type: s.type as SectionType,
                content: s.content,
                duration: s.duration,
                visualNote: s.visualNote,
              }));

              updateScript(scriptId, {
                scriptContent: newSections,
                status: 'completed',
              });
            }
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          // Fallback: create sections from plain text
          const fallbackSections: ScriptSection[] = [
            {
              id: Math.random().toString(36).substring(2, 15),
              type: 'hook',
              content: result.slice(0, 100) + '...',
              duration: 5,
              visualNote: '开场画面',
            },
          ];
          updateScript(scriptId, {
            scriptContent: fallbackSections,
            status: 'completed',
          });
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhance section with AI
  const handleEnhanceSection = async (sectionId: string, content: string, type: SectionType) => {
    setEnhancingSectionId(sectionId);

    const request: ChatWithAiRequest = {
      systemPrompt: `你是一位短视频文案优化专家。请优化以下${sectionTypeConfig[type].name}段落的文案，使其更加吸引人、流畅自然。
要求：
1. 保持原有的核心意思
2. 让语言更生动、有感染力
3. 适合${platformConfig[platform].name}平台的风格
4. 直接返回优化后的文案，不要添加解释`,
      messages: [
        {
          role: 'user',
          content: `请优化以下文案：\n${content}`,
        },
      ],
      temperature: 0.7,
      maxTokens: 1024,
    };

    try {
      const response = await chatWithAiStream(request);
      if (response.success && response.stream) {
        const reader = response.stream.getReader();
        let result = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += value;
        }

        updateSection(currentScriptId!, sectionId, { content: result.trim() });
      }
    } catch (error) {
      console.error('Enhancement failed:', error);
    } finally {
      setEnhancingSectionId(null);
    }
  };

  // Add new section
  const handleAddSection = (type: SectionType) => {
    if (!currentScriptId) return;

    const defaultDurations: Record<SectionType, number> = {
      hook: 3,
      intro: 5,
      body: 30,
      cta: 5,
      outro: 3,
    };

    addSection(currentScriptId, {
      type,
      content: '',
      duration: defaultDurations[type],
      visualNote: '',
    });
  };

  // Copy script to clipboard
  const handleCopy = () => {
    if (!currentScript) return;

    const text = currentScript.scriptContent
      .map((s) => `[${t(`videoScript.sectionTypes.${s.type}`)}] ${s.duration}s\n${s.content}\n${s.visualNote ? `🎬 ${s.visualNote}\n` : ''}`)
      .join('\n---\n\n');

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export as Markdown
  const handleExportMarkdown = () => {
    if (!currentScript) return;

    const markdown = `# ${currentScript.title}\n\n` +
      `**平台**: ${platformConfig[currentScript.platform].name}\n` +
      `**时长**: ${durationConfig[currentScript.duration].label}\n` +
      `**语气**: ${toneConfig[currentScript.tone].name}\n` +
      `**主题**: ${currentScript.topic}\n\n` +
      `---\n\n` +
      currentScript.scriptContent
        .map((s) => `## ${t(`videoScript.sectionTypes.${s.type}`)} (${s.duration}s)\n\n${s.content}\n\n${s.visualNote ? `> 🎬 画面: ${s.visualNote}\n\n` : ''}`)
        .join('');

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentScript.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export as JSON
  const handleExportJson = () => {
    if (!currentScript) return;

    const json = JSON.stringify(currentScript, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentScript.title}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Apply template
  const handleApplyTemplate = (templateId: string) => {
    const template = templates.find((tmpl) => tmpl.id === templateId);
    if (template) {
      setPlatform(template.platform);
      setDuration(template.duration);
      setTone(template.tone);
      setSelectedTemplate(templateId);
    }
  };

  // Create new script
  const handleNewScript = () => {
    setCurrentScript(null);
    setPlatform('douyin');
    setDuration('60s');
    setTone('casual');
    setTopic('');
    setTargetAudience('');
    setKeyPoints([]);
    setSelectedTemplate('');
    setIsPreview(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <section className="relative overflow-hidden pt-28 pb-6 sm:pt-32 sm:pb-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-red-100/60 via-rose-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-red-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <Link to="/workspace" className="hover:text-red-600 transition-colors">
              {t('nav.workspace')}
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">{t('videoScript.title')}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight">
                <span className="bg-gradient-to-r from-red-600 via-rose-500 to-red-600 bg-clip-text text-transparent">
                  {t('videoScript.title')}
                </span>
              </h1>
              <p className="mt-2 text-base text-gray-600 dark:text-gray-300">
                {t('videoScript.subtitle')}
              </p>
            </div>
            <button
              onClick={handleNewScript}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-500/25"
            >
              <Icons.Plus />
              {t('videoScript.newScript')}
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[600px]">
          {/* Sidebar */}
          <ScriptSidebar
            scripts={scripts}
            currentId={currentScriptId}
            onSelect={setCurrentScript}
            onDelete={deleteScript}
            t={t}
          />

          {/* Main Editor */}
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Form Section */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800">
              <div className="grid grid-cols-2 gap-6">
                {/* Platform & Duration */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('videoScript.platform')}
                    </label>
                    <PlatformSelector value={platform} onChange={setPlatform} t={t} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('videoScript.duration')}
                    </label>
                    <DurationSelector value={duration} onChange={setDuration} t={t} platform={platform} />
                  </div>
                </div>

                {/* Tone & Template */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('videoScript.tone')}
                    </label>
                    <ToneSelector value={tone} onChange={setTone} t={t} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('videoScript.template')}
                    </label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => handleApplyTemplate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                    >
                      <option value="">{t('videoScript.templatePlaceholder')}</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name} - {template.description}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Topic & Target Audience */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('videoScript.topic')}
                  </label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={t('videoScript.topicPlaceholder')}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('videoScript.targetAudience')}
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder={t('videoScript.targetAudiencePlaceholder')}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                  />
                </div>
              </div>

              {/* Key Points */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('videoScript.keyPoints')}
                </label>
                <TagInput
                  tags={keyPoints}
                  onChange={setKeyPoints}
                  placeholder={t('videoScript.keyPointsPlaceholder')}
                  hint={t('videoScript.keyPointsHint')}
                />
              </div>

              {/* Platform Tip */}
              <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <Icons.Info />
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {t('videoScript.tips')}: {platformConfig[platform].tip}
                </span>
              </div>

              {/* Generate Button */}
              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic.trim()}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white font-medium rounded-xl hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t('videoScript.generating')}
                    </>
                  ) : (
                    <>
                      <Icons.Play />
                      {t('videoScript.generate')}
                    </>
                  )}
                </button>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('videoScript.estimatedTime', { seconds: '15-30' })}
                </span>
              </div>
            </div>

            {/* Script Editor */}
            {currentScript && currentScript.scriptContent.length > 0 && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {t('videoScript.scriptEditor')}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      ({currentScript.scriptContent.length} {t('chat.messages')})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsPreview(!isPreview)}
                      className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        isPreview
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                          : 'hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {isPreview ? <Icons.Eye /> : <Icons.EyeOff />}
                      {isPreview ? t('videoScript.editMode') : t('videoScript.preview')}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Icons.Copy />
                      {copied ? t('videoScript.copied') : t('videoScript.copy')}
                    </button>
                    <div className="relative group">
                      <button className="flex items-center gap-1 px-3 py-1.5 text-sm hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                        <Icons.Download />
                        {t('videoScript.export')}
                      </button>
                      <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={handleExportMarkdown}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg"
                        >
                          {t('videoScript.exportMarkdown')}
                        </button>
                        <button
                          onClick={handleExportJson}
                          className="w-full px-4 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 last:rounded-b-lg"
                        >
                          {t('videoScript.exportJson')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Timeline */}
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
                  <Timeline sections={currentScript.scriptContent} totalDuration={totalDuration} t={t} />
                </div>

                {/* Sections */}
                <div className="flex-1 overflow-y-auto p-6">
                  <AnimatePresence>
                    {isPreview ? (
                      <div className="max-w-2xl mx-auto">
                        {currentScript.scriptContent.map((section, index) => (
                          <SectionCard
                            key={section.id}
                            section={section}
                            index={index}
                            isPreview={true}
                            onUpdate={() => {}}
                            onRemove={() => {}}
                            onEnhance={() => {}}
                            isEnhancing={false}
                            t={t}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-4 max-w-3xl mx-auto">
                        {currentScript.scriptContent.map((section, index) => (
                          <SectionCard
                            key={section.id}
                            section={section}
                            index={index}
                            isPreview={false}
                            onUpdate={(updates) => updateSection(currentScript.id, section.id, updates)}
                            onRemove={() => removeSection(currentScript.id, section.id)}
                            onEnhance={() => handleEnhanceSection(section.id, section.content, section.type)}
                            isEnhancing={enhancingSectionId === section.id}
                            t={t}
                          />
                        ))}

                        {/* Add Section Buttons */}
                        <div className="flex flex-wrap gap-2 pt-4">
                          <span className="text-sm text-gray-500 dark:text-gray-400 mr-2">
                            {t('videoScript.addSection')}:
                          </span>
                          {(Object.keys(sectionTypeConfig) as SectionType[]).map((type) => (
                            <button
                              key={type}
                              onClick={() => handleAddSection(type)}
                              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${sectionTypeConfig[type].bgColor} ${sectionTypeConfig[type].color} hover:opacity-80`}
                            >
                              + {t(`videoScript.sectionTypes.${type}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!currentScript || currentScript.scriptContent.length === 0) && (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-red-100 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30 rounded-2xl flex items-center justify-center">
                    <Icons.FileText />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('videoScript.createFirst')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                    {t('videoScript.contentPlaceholder')}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
