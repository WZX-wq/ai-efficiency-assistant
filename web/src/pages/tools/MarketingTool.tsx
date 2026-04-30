import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeo } from '../../components/SeoHead';
import { chatWithAiStream } from '../../services/aiChat';
import { useToast } from '../../components/ToastProvider';

// ============================================================
// Types
// ============================================================

type Platform = 'xiaohongshu' | 'douyin' | 'wechat' | 'weibo' | 'moments' | 'ecommerce' | 'email';

interface PlatformConfig {
  key: Platform;
  label: string;
  icon: string;
  color: string;
  activeColor: string;
  systemPrompt: string;
}

// ============================================================
// Platform Configurations
// ============================================================

const PLATFORMS: PlatformConfig[] = [
  {
    key: 'xiaohongshu',
    label: '小红书',
    icon: '📕',
    color: 'border-red-200 dark:border-red-800',
    activeColor: 'bg-red-500 text-white shadow-md shadow-red-200 dark:shadow-red-900/30',
    systemPrompt: `你是一个小红书爆款文案专家。请生成种草力强的文案，遵循以下规则：
1. 标题必须吸引眼球，使用数字、感叹号或悬念
2. 多用emoji增加可读性和亲和力
3. 正文分段清晰，每段2-3句话
4. 结尾引导互动（点赞、收藏、关注）
5. 使用话题标签 #话题名
6. 语气亲切自然，像朋友分享好物
7. 突出产品使用体验和效果

请按以下格式输出：
## 📌 标题
（生成3个备选标题）

## 📝 正文
（完整文案内容）

## 🏷️ 推荐话题标签
（5-8个相关话题标签）

## 📸 配图建议
（3-5条配图拍摄建议）`,
  },
  {
    key: 'douyin',
    label: '抖音/快手',
    icon: '🎬',
    color: 'border-gray-200 dark:border-gray-700',
    activeColor: 'bg-gray-900 text-white shadow-md shadow-gray-300 dark:shadow-gray-900/30',
    systemPrompt: `你是一个短视频脚本专家。请生成15-60秒的短视频脚本，遵循以下规则：
1. 开头3秒必须抓住注意力（hook）
2. 脚本结构：hook → 问题/痛点 → 解决方案/产品展示 → CTA
3. 标注每个环节的预估时间
4. 语言口语化、有节奏感
5. 加入画面/动作指示
6. 结尾有明确的行动号召

请按以下格式输出：
## 🎯 脚本概览
- 总时长：XX秒
- 风格：XX

## 📋 分镜脚本

### [0-3秒] Hook（开头钩子）
- 画面：XX
- 台词：XX

### [3-15秒] 痛点/引入
- 画面：XX
- 台词：XX

### [15-40秒] 产品展示/解决方案
- 画面：XX
- 台词：XX

### [40-55秒] 效果/证明
- 画面：XX
- 台词：XX

### [55-60秒] CTA（行动号召）
- 画面：XX
- 台词：XX

## 💡 拍摄建议
（2-3条拍摄技巧建议）`,
  },
  {
    key: 'wechat',
    label: '微信公众号',
    icon: '💬',
    color: 'border-green-200 dark:border-green-800',
    activeColor: 'bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-green-900/30',
    systemPrompt: `你是一个公众号写作专家。请生成深度、专业、有观点的长文，遵循以下规则：
1. 标题要有信息量和吸引力
2. 开头用故事或数据引入
3. 结构清晰，使用小标题分段
4. 观点鲜明，论据充分
5. 语言专业但不晦涩
6. 结尾有总结和互动引导

请按以下格式输出：
## 📌 标题
（生成3个备选标题）

## 📝 正文
（完整文章，1500-3000字）

## 💬 引导互动
（文末互动话题或引导关注的话术）`,
  },
  {
    key: 'weibo',
    label: '微博',
    icon: '📢',
    color: 'border-orange-200 dark:border-orange-800',
    activeColor: 'bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30',
    systemPrompt: `你是一个微博运营专家。请生成适合微博传播的短文案，遵循以下规则：
1. 文案简洁有力，140字以内
2. 适当使用话题标签 #话题名
3. 语言有网感、有话题性
4. 可以适当蹭热点
5. 引导转发、评论、点赞

请按以下格式输出：
## 📌 文案内容
（2-3条备选文案）

## 🏷️ 推荐话题标签
（3-5个相关话题）

## 💡 互动建议
（提升互动率的小技巧）`,
  },
  {
    key: 'moments',
    label: '朋友圈',
    icon: '🫂',
    color: 'border-blue-200 dark:border-blue-800',
    activeColor: 'bg-blue-500 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30',
    systemPrompt: `你是一个朋友圈文案专家。请生成适合微信朋友圈的文案，遵循以下规则：
1. 语气自然、像朋友分享
2. 不超过100字
3. 避免过度营销感
4. 可以适当使用emoji
5. 引发好奇或共鸣

请按以下格式输出：
## 📌 朋友圈文案
（3-5条备选文案，风格各异）

## 📸 配图建议
（配图风格和内容建议）`,
  },
  {
    key: 'ecommerce',
    label: '电商详情页',
    icon: '🛒',
    color: 'border-amber-200 dark:border-amber-800',
    activeColor: 'bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30',
    systemPrompt: `你是一个电商文案专家。请生成专业的电商详情页文案，遵循以下规则：
1. 突出产品核心卖点
2. 将功能转化为用户利益
3. 使用社会证明（数据、评价）
4. 结构清晰：痛点 → 解决方案 → 产品优势 → 信任背书 → 促单
5. 语言有说服力但不夸大

请按以下格式输出：
## 📌 商品标题
（2-3个SEO优化标题）

## ✨ 核心卖点提炼
（5-6条核心卖点，每条一句话）

## 📝 详情页文案

### 痛点引入
（描述用户痛点）

### 产品介绍
（产品核心功能和优势）

### 使用场景
（3-4个典型使用场景）

### 用户好评
（3-5条模拟用户好评）

### 促单话术
（限时优惠、品质保证等促单信息）`,
  },
  {
    key: 'email',
    label: '邮件营销',
    icon: '📧',
    color: 'border-indigo-200 dark:border-indigo-800',
    activeColor: 'bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30',
    systemPrompt: `你是一个邮件营销专家。请生成高转化率的营销邮件，遵循以下规则：
1. 主题行要有吸引力（不超过50字符）
2. 预览文本补充主题行信息
3. 邮件正文简洁明了
4. 有明确的CTA按钮文案
5. 个性化、有温度

请按以下格式输出：
## 📌 主题行
（3-5个备选主题行）

## 👁️ 预览文本
（对应的预览文本）

## 📝 邮件正文
（完整邮件内容，包含称呼、正文、签名）

## 🔘 CTA按钮文案
（2-3个备选CTA文案）

## 💡 发送建议
（最佳发送时间、A/B测试建议）`,
  },
];

// ============================================================
// Constants
// ============================================================

const TIPS = [
  '选择平台后，表单会自动切换为该平台专属字段',
  '核心卖点越详细，生成的文案越精准',
  '可以多次生成后挑选最佳方案',
  '点击"换个风格"可以用不同语气重新生成',
];

const RELATED = [
  { to: '/workspace/copywriting', label: '文案生成器' },
  { to: '/workspace/brand', label: '品牌声音' },
  { to: '/workspace/seo', label: 'SEO 优化' },
];

// ============================================================
// Platform-specific form fields
// ============================================================

function PlatformForm({
  platform,
  onSubmit,
  loading,
}: {
  platform: Platform;
  onSubmit: (prompt: string) => void;
  loading: boolean;
}) {
  const [productName, setProductName] = useState('');
  const [sellingPoints, setSellingPoints] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [cta, setCta] = useState('');
  const [brandVoice, setBrandVoice] = useState('');

  // Platform-specific fields
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [tone, setTone] = useState('种草');
  const [videoType, setVideoType] = useState('口播');
  const [duration, setDuration] = useState('30');
  const [hookStyle, setHookStyle] = useState('悬念');
  const [articleType, setArticleType] = useState('深度');
  const [wordCount, setWordCount] = useState('2000');
  const [hashtags, setHashtags] = useState('');
  const [weiboTone, setWeiboTone] = useState('幽默');

  const buildPrompt = () => {
    let prompt = `产品/品牌名称：${productName}\n核心卖点：${sellingPoints}\n目标受众：${targetAudience}\n行动号召：${cta || '无特定要求'}\n品牌调性：${brandVoice || '无特定要求'}\n`;

    switch (platform) {
      case 'xiaohongshu':
        prompt += `话题：${topic}\n关键词：${keywords}\n文案风格：${tone}\n`;
        break;
      case 'douyin':
        prompt += `视频类型：${videoType}\n目标时长：${duration}秒\nHook风格：${hookStyle}\n`;
        break;
      case 'wechat':
        prompt += `文章类型：${articleType}\n目标字数：${wordCount}字\n`;
        break;
      case 'weibo':
        prompt += `话题/事件：${topic}\n相关话题标签：${hashtags}\n语气风格：${weiboTone}\n`;
        break;
      case 'moments':
        prompt += `分享场景：${topic}\n`;
        break;
      case 'ecommerce':
        prompt += `价格区间：${topic}\n`;
        break;
      case 'email':
        prompt += `邮件目的：${topic}\n`;
        break;
    }

    return prompt;
  };

  const handleSubmit = () => {
    if (!productName.trim() || !sellingPoints.trim()) return;
    onSubmit(buildPrompt());
  };

  const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1';

  return (
    <div className="space-y-4">
      {/* Common fields */}
      <div>
        <label className={labelClass}>产品/品牌名称 *</label>
        <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="例如：智能保温杯 Pro" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>核心卖点 *</label>
        <textarea value={sellingPoints} onChange={(e) => setSellingPoints(e.target.value)} placeholder="例如：12小时保温、316不锈钢内胆、智能温控显示" rows={3} className={`${inputClass} resize-none`} />
      </div>
      <div>
        <label className={labelClass}>目标受众</label>
        <input type="text" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="例如：25-35岁都市白领女性" className={inputClass} />
      </div>

      {/* Platform-specific fields */}
      {platform === 'xiaohongshu' && (
        <>
          <div>
            <label className={labelClass}>话题</label>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例如：办公室好物分享" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>关键词</label>
            <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="例如：保温杯, 办公好物, 种草" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>文案风格</label>
            <div className="flex flex-wrap gap-2">
              {['种草', '测评', '教程', 'vlog'].map((t) => (
                <button key={t} onClick={() => setTone(t)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${tone === t ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-300'}`}>
                  {tone === t && '✓ '}{t}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {platform === 'douyin' && (
        <>
          <div>
            <label className={labelClass}>视频类型</label>
            <div className="flex flex-wrap gap-2">
              {['口播', '剧情', '展示'].map((v) => (
                <button key={v} onClick={() => setVideoType(v)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${videoType === v ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-300'}`}>
                  {videoType === v && '✓ '}{v}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>目标时长: {duration}秒</label>
            <input type="range" min="15" max="60" step="5" value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full accent-rose-500" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>15秒</span><span>60秒</span></div>
          </div>
          <div>
            <label className={labelClass}>Hook风格</label>
            <div className="flex flex-wrap gap-2">
              {['悬念', '数据', '痛点', '反差'].map((h) => (
                <button key={h} onClick={() => setHookStyle(h)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${hookStyle === h ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-300'}`}>
                  {hookStyle === h && '✓ '}{h}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {platform === 'wechat' && (
        <>
          <div>
            <label className={labelClass}>文章类型</label>
            <div className="flex flex-wrap gap-2">
              {['深度', '资讯', '观点', '故事'].map((a) => (
                <button key={a} onClick={() => setArticleType(a)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${articleType === a ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-300'}`}>
                  {articleType === a && '✓ '}{a}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={labelClass}>目标字数: {wordCount}字</label>
            <input type="range" min="800" max="5000" step="200" value={wordCount} onChange={(e) => setWordCount(e.target.value)} className="w-full accent-rose-500" />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>800字</span><span>5000字</span></div>
          </div>
        </>
      )}

      {platform === 'weibo' && (
        <>
          <div>
            <label className={labelClass}>话题/事件</label>
            <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例如：新品发布、节日促销" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>相关话题标签</label>
            <input type="text" value={hashtags} onChange={(e) => setHashtags(e.target.value)} placeholder="例如：#新品上市 #限时优惠" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>语气风格</label>
            <div className="flex flex-wrap gap-2">
              {['幽默', '专业', '煽情', '犀利'].map((w) => (
                <button key={w} onClick={() => setWeiboTone(w)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${weiboTone === w ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-300'}`}>
                  {weiboTone === w && '✓ '}{w}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {platform === 'moments' && (
        <div>
          <label className={labelClass}>分享场景</label>
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例如：收到快递、旅行打卡、日常分享" className={inputClass} />
        </div>
      )}

      {platform === 'ecommerce' && (
        <div>
          <label className={labelClass}>价格区间</label>
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例如：99-199元" className={inputClass} />
        </div>
      )}

      {platform === 'email' && (
        <div>
          <label className={labelClass}>邮件目的</label>
          <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="例如：新品发布通知、会员促销" className={inputClass} />
        </div>
      )}

      {/* Common: CTA and brand voice */}
      <div>
        <label className={labelClass}>行动号召 (CTA)</label>
        <input type="text" value={cta} onChange={(e) => setCta(e.target.value)} placeholder="例如：立即购买、点击了解更多" className={inputClass} />
      </div>
      <div>
        <label className={labelClass}>品牌调性描述</label>
        <input type="text" value={brandVoice} onChange={(e) => setBrandVoice(e.target.value)} placeholder="例如：年轻、时尚、有活力" className={inputClass} />
      </div>

      <button onClick={handleSubmit} disabled={loading || !productName.trim() || !sellingPoints.trim()} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
        {loading ? '生成中...' : `✨ 生成${PLATFORMS.find((p) => p.key === platform)?.label}文案`}
      </button>
    </div>
  );
}

// ============================================================
// Simple Markdown Renderer
// ============================================================

function MarkdownContent({ content }: { content: string }) {
  const renderContent = () => {
    const lines = content.split('\n');
    const elements: JSX.Element[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushTable = () => {
      if (tableRows.length === 0) return;
      const header = tableRows[0];
      const body = tableRows.slice(1);
      elements.push(
        <div key={`table-${elements.length}`} className="overflow-x-auto my-3">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-rose-50 dark:bg-rose-900/20">
                {header.map((cell, i) => (
                  <th key={i} className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">{cell.replace(/\*\*/g, '')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{cell.replace(/\*\*/g, '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (trimmed.replace(/[|\-\s]/g, '') === '') return;
        inTable = true;
        tableRows.push(trimmed.split('|').slice(1, -1).map((c) => c.trim()));
        return;
      } else if (inTable) {
        flushTable();
      }

      if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={idx} className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">{trimmed.slice(3)}</h2>);
      } else if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={idx} className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">{trimmed.slice(4)}</h3>);
      } else if (trimmed.startsWith('#### ')) {
        elements.push(<h4 key={idx} className="text-base font-semibold text-gray-900 dark:text-white mt-3 mb-1">{trimmed.slice(5)}</h4>);
      } else if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={idx} className="my-4 border-gray-200 dark:border-gray-700" />);
      } else if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} className="my-3 pl-4 border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-r-lg py-2 pr-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{trimmed.slice(2)}</p>
          </blockquote>
        );
      } else if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
        const checked = trimmed.startsWith('- [x]');
        const text = trimmed.slice(6);
        elements.push(
          <label key={idx} className="flex items-center gap-2 my-1 cursor-pointer">
            <input type="checkbox" defaultChecked={checked} className="rounded border-gray-300 text-rose-500 focus:ring-rose-500" readOnly />
            <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
          </label>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <li key={idx} className="ml-4 text-sm text-gray-700 dark:text-gray-300 list-disc my-1">{trimmed.slice(2)}</li>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <li key={idx} className="ml-4 text-sm text-gray-700 dark:text-gray-300 list-decimal my-1">{trimmed.replace(/^\d+\.\s/, '')}</li>
        );
      } else if (trimmed === '') {
        elements.push(<div key={idx} className="h-2" />);
      } else {
        const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
        elements.push(
          <p key={idx} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed my-1">
            {parts.map((part, pi) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pi} className="font-semibold text-gray-900 dark:text-white">{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </p>
        );
      }
    });

    if (inTable) flushTable();
    return elements;
  };

  return <div className="prose-sm">{renderContent()}</div>;
}

// ============================================================
// Main Component
// ============================================================

export default function MarketingTool() {
  useSeo({
    title: 'AI营销文案 - AI效率助手',
    description: 'AI营销文案生成器，支持小红书、抖音、微信公众号、微博、朋友圈、电商详情页、邮件营销等多平台文案一键生成。',
    keywords: 'AI营销文案,小红书文案,抖音脚本,公众号文章,微博文案,电商文案,邮件营销,AI文案生成',
    canonicalUrl: '/workspace/marketing',
  });

  const { toast } = useToast();

  const [activePlatform, setActivePlatform] = useState<Platform>('xiaohongshu');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastPrompt, setLastPrompt] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const currentPlatform = PLATFORMS.find((p) => p.key === activePlatform)!;

  const handleGenerate = useCallback(async (userMessage: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setResult('');
    setLastPrompt(userMessage);

    try {
      const response = await chatWithAiStream(
        {
          messages: [{ role: 'user', content: userMessage }],
          systemPrompt: currentPlatform.systemPrompt,
          temperature: 0.8,
          maxTokens: 4096,
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
        setResult(fullContent);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
      } else {
        toast('生成失败，请检查网络连接', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [currentPlatform.systemPrompt, toast]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const handleRegenerate = useCallback(() => {
    if (lastPrompt) {
      handleGenerate(lastPrompt);
    }
  }, [lastPrompt, handleGenerate]);

  const handleStyleSwitch = useCallback(() => {
    if (!lastPrompt) return;
    const styleSwitchPrompt = lastPrompt + '\n\n请换一种完全不同的风格和语气重新生成。';
    handleGenerate(styleSwitchPrompt);
  }, [lastPrompt, handleGenerate]);

  const handleCopy = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      toast('已复制到剪贴板', 'success');
    }).catch(() => {
      toast('复制失败', 'error');
    });
  }, [result, toast]);

  // Auto scroll result
  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result]);

  const charCount = result.length;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-rose-100/60 via-pink-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-pink-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-rose-600 transition-colors">工具</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">营销文案</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-rose-600 via-pink-500 to-rose-600 bg-clip-text text-transparent">
              AI营销文案
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            多平台营销文案一键生成，覆盖小红书、抖音、公众号、微博等主流平台
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Platform Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {PLATFORMS.map((platform) => (
              <button
                key={platform.key}
                onClick={() => setActivePlatform(platform.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activePlatform === platform.key
                    ? platform.activeColor
                    : `bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border ${platform.color} hover:text-rose-600 dark:hover:text-rose-400`
                }`}
              >
                <span>{platform.icon}</span>
                <span>{platform.label}</span>
              </button>
            ))}
          </div>

          {/* Tool Card */}
          <motion.div
            key={activePlatform}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Card Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/10 dark:to-pink-900/10">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{currentPlatform.icon}</span>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{currentPlatform.label}文案生成</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">填写信息，AI 为你生成专属营销文案</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Input Form */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      填写信息
                    </h3>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activePlatform}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        <PlatformForm platform={activePlatform} onSubmit={handleGenerate} loading={loading} />
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Result Area */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        生成结果
                      </h3>
                      <div className="flex items-center gap-2">
                        {loading && (
                          <button onClick={handleStop} className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                            </svg>
                            停止
                          </button>
                        )}
                        {result && !loading && (
                          <>
                            <button onClick={handleCopy} className="text-sm text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 font-medium transition-colors flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                              </svg>
                              一键复制
                            </button>
                            <button onClick={handleRegenerate} className="text-sm text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 font-medium transition-colors flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                              </svg>
                              重新生成
                            </button>
                            <button onClick={handleStyleSwitch} className="text-sm text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 font-medium transition-colors flex items-center gap-1">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                              </svg>
                              换个风格
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      ref={resultRef}
                      className="min-h-[300px] max-h-[500px] overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 scrollbar-thin"
                    >
                      {result ? (
                        <div className="animate-fade-in">
                          <MarkdownContent content={result} />
                          {loading && (
                            <span className="inline-block w-2 h-4 bg-rose-500 animate-pulse ml-1 align-middle" />
                          )}
                        </div>
                      ) : loading ? (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-400 dark:text-gray-500">
                          <div className="relative">
                            <div className="w-12 h-12 border-4 border-rose-200 dark:border-rose-800 border-t-rose-500 rounded-full animate-spin" />
                          </div>
                          <p className="mt-4 text-sm">AI 正在生成文案...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-400 dark:text-gray-500">
                          <span className="text-5xl mb-4">{currentPlatform.icon}</span>
                          <p className="text-sm">填写左侧信息，AI 将为你生成{currentPlatform.label}文案</p>
                        </div>
                      )}
                    </div>
                    {/* Character count */}
                    {result && (
                      <div className="mt-2 text-right text-xs text-gray-400 dark:text-gray-500">
                        共 {charCount} 字
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">💡 使用技巧</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TIPS.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <span className="text-rose-500 mt-0.5">✓</span>
              <span className="text-sm text-gray-600 dark:text-gray-400">{tip}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Related Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-100 dark:border-gray-800">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">🔗 相关工具</h3>
        <div className="flex flex-wrap gap-3">
          {RELATED.map((item) => (
            <Link key={item.to} to={item.to} className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 transition-all">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
