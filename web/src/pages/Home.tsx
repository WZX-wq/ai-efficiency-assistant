import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { FeatureCard } from '../types';
import { ACTION_DESCRIPTIONS } from '../types';
import { useSeo, JsonLd, PAGE_SEO } from '../components/SeoHead';
import { useTranslation } from '../i18n';

const features: FeatureCard[] = [
  {
    id: 'longform',
    title: '长文写作',
    description: '大纲规划 + 分段生成，轻松创作万字论文、报告、小说',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    color: 'from-emerald-500 to-teal-600',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    id: 'rewrite',
    title: '智能改写',
    description: '降重改写、去AI痕迹、学术润色，一键提升文本质量',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
      </svg>
    ),
    color: 'from-violet-500 to-purple-600',
    textColor: 'text-violet-600',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
  },
  {
    id: 'continue',
    title: '续写扩写',
    description: '智能续写、扩写丰富、结尾生成，多版本对比选择',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    color: 'from-blue-500 to-indigo-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
  {
    id: 'expand',
    title: '一键扩写',
    description: ACTION_DESCRIPTIONS.expand,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
    color: 'from-emerald-500 to-emerald-600',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'translate',
    title: '多语言翻译',
    description: ACTION_DESCRIPTIONS.translate,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
    color: 'from-purple-500 to-purple-600',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'summarize',
    title: '内容总结',
    description: ACTION_DESCRIPTIONS.summarize,
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: 'from-amber-500 to-amber-600',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'docAnalysis',
    title: '文档分析',
    description: '上传文档智能分析，提取摘要、关键信息、支持文档问答',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3m-3 3h3m-3 3h3" />
      </svg>
    ),
    color: 'from-rose-500 to-pink-600',
    textColor: 'text-rose-600',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
  },
  {
    id: 'translation',
    title: '智能翻译',
    description: '11种语言互译，支持批量翻译、润色翻译、文档翻译',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5a17.92 17.92 0 01-8.716-2.247m0 0A8.966 8.966 0 013 12c0-1.264.26-2.466.732-3.559" />
      </svg>
    ),
    color: 'from-cyan-500 to-teal-600',
    textColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
  },
  {
    id: 'mindmap',
    title: '思维导图',
    description: 'AI生成可视化思维导图，支持发散、流程、SWOT等多种模式',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM3.75 12a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM12.75 12a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM12 20.25a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5l3 4.5M16.5 7.5l-3 4.5M7.5 16.5l3-4.5M16.5 16.5l-3-4.5" />
      </svg>
    ),
    color: 'from-amber-500 to-orange-600',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
  },
  {
    id: 'creative',
    title: '创意灵感',
    description: 'AI 生成视觉创意方案、拍摄建议和配色推荐',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a15.996 15.996 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
      </svg>
    ),
    color: 'from-pink-500 to-pink-600',
    textColor: 'text-pink-600',
    bgColor: 'bg-pink-50',
  },
  {
    id: 'copywriting',
    title: '文案生成器',
    description: '批量生成标题、广告语、卖点文案，覆盖多平台风格',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    color: 'from-violet-500 to-violet-600',
    textColor: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  {
    id: 'scripts',
    title: 'AI 话术库',
    description: '客服、销售、直播、社群等多场景专业话术一键生成',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
    color: 'from-orange-500 to-orange-600',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50',
  },
  {
    id: 'calendar',
    title: '营销日历',
    description: 'AI 自动生成内容排期计划，覆盖多平台运营节奏',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
      </svg>
    ),
    color: 'from-teal-500 to-teal-600',
    textColor: 'text-teal-600',
    bgColor: 'bg-teal-50',
  },
  {
    id: 'seo',
    title: 'SEO 优化',
    description: 'AI 分析内容生成 SEO 标题、Meta 描述和优化建议',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    color: 'from-green-500 to-green-600',
    textColor: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  {
    id: 'templates',
    title: '智能模板库',
    description: '20+ 专业模板覆盖营销、社交、电商、办公场景',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: 'from-cyan-500 to-cyan-600',
    textColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50',
  },
  {
    id: 'history',
    title: '历史记录',
    description: '所有生成内容自动保存，随时查看和导出',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'from-gray-500 to-gray-600',
    textColor: 'text-gray-600',
    bgColor: 'bg-gray-50',
  },
  {
    id: 'humanize',
    title: '人性化改写',
    description: '去除AI痕迹，让文字更自然更有温度',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    color: 'from-rose-500 to-rose-600',
    textColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  {
    id: 'polish',
    title: '文章润色',
    description: '一键提升文章质量，让表达更精准有力',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    color: 'from-sky-500 to-sky-600',
    textColor: 'text-sky-600',
    bgColor: 'bg-sky-50',
  },
  {
    id: 'summarizer',
    title: '文本摘要',
    description: '快速提炼长文核心要点，多种摘要模式',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    color: 'from-yellow-500 to-yellow-600',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
  },
  {
    id: 'playground',
    title: 'AI游乐场',
    description: '沉浸式AI角色扮演，修仙、三国、荒岛求生等多元世界等你探索',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875s-2.25.84-2.25 1.875c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 01-.657.643 48.491 48.491 0 01-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 01-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 00-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 01-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 00.657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 01-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 005.427-.63 48.05 48.05 0 00.582-4.717.532.532 0 00-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 00.658-.663 48.422 48.422 0 00-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 01-.61-.58v0z" />
      </svg>
    ),
    color: 'from-purple-500 to-pink-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    textColor: 'text-purple-600 dark:text-purple-400',
    to: '/playground',
  },
  {
    id: 'codeAssistant',
    title: '代码助手',
    description: 'AI代码生成、解释、调试、转换、优化，支持12种编程语言',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
      </svg>
    ),
    color: 'from-slate-500 to-gray-600',
    textColor: 'text-slate-600',
    bgColor: 'bg-slate-50 dark:bg-slate-950/30',
  },
  {
    id: 'learning',
    title: '学习助手',
    description: '知识问答、概念解释、练习题生成、学习计划、论文助手',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
    color: 'from-indigo-500 to-violet-600',
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
  },
  {
    id: 'lifeAssistant',
    title: '生活助手',
    description: '旅行规划、美食推荐、健康顾问、职业规划、情感倾听',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
      </svg>
    ),
    color: 'from-emerald-500 to-green-600',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
  },
  {
    id: 'pptGenerator',
    title: 'PPT 生成器',
    description: 'AI生成大纲与幻灯片，支持多种风格，一键导出',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    color: 'from-orange-500 to-amber-600',
    textColor: 'text-orange-600',
    bgColor: 'bg-orange-50 dark:bg-orange-950/30',
  },
  {
    id: 'dataAnalysis',
    title: '数据分析',
    description: '上传CSV/Excel数据，AI自动生成分析报告与洞察',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    color: 'from-cyan-500 to-teal-600',
    textColor: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
  },
  {
    id: 'marketing',
    title: '营销文案',
    description: '7大平台文案生成，小红书/抖音/公众号一键适配',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" />
      </svg>
    ),
    color: 'from-rose-500 to-pink-600',
    textColor: 'text-rose-600',
    bgColor: 'bg-rose-50 dark:bg-rose-950/30',
  },
  {
    id: 'fiction',
    title: '互动小说',
    description: '6大题材AI互动小说，选择你的冒险，沉浸式体验',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15" />
      </svg>
    ),
    color: 'from-violet-500 to-purple-600',
    textColor: 'text-violet-600',
    bgColor: 'bg-violet-50 dark:bg-violet-950/30',
  },
  {
    id: 'apiPlatform',
    title: 'API 平台',
    description: '开放API接口，8大端点，4种SDK，快速集成AI能力',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.54a4.5 4.5 0 00-1.242-7.244l4.5-4.5a4.5 4.5 0 016.364 6.364l-1.757 1.757" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 7.5h.01M7.5 12h.01M7.5 16.5h.01" />
      </svg>
    ),
    color: 'from-blue-500 to-indigo-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
  },
];

const stats = [
  { value: 10, suffix: 'x', prefix: '', label: '效率提升' },
  { value: 50, suffix: 'K+', prefix: '', label: '活跃用户' },
  { value: 99.9, suffix: '%', prefix: '', label: '服务可用性' },
  { value: 4.9, suffix: '/5', prefix: '', label: '用户评分' },
];

const testimonials = [
  {
    name: '张明',
    role: '内容运营总监',
    company: '某知名电商平台',
    avatar: 'ZM',
    content: 'AI效率助手彻底改变了我们团队的内容生产流程。从文案生成到SEO优化，效率提升了至少5倍。特别是品牌声音功能，让我们的内容风格保持了高度一致性。',
    rating: 5,
  },
  {
    name: '李雪',
    role: '自媒体创作者',
    company: '百万粉丝博主',
    avatar: 'LX',
    content: '作为一个日更博主，AI效率助手是我的秘密武器。一键扩写和人性化改写功能帮我节省了大量时间，而且生成的内容质量非常高，完全不像AI写的。',
    rating: 5,
  },
  {
    name: '王浩',
    role: '市场营销经理',
    company: '某科技公司',
    avatar: 'WH',
    content: '营销日历和话术库功能对团队帮助很大。AI能根据不同平台和节日自动生成排期方案，大大减轻了我们的策划负担。客服话术也变得更加专业了。',
    rating: 5,
  },
];

const trustLogos = [
  {
    name: '电商平台',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
    ),
  },
  {
    name: '在线教育',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
      </svg>
    ),
  },
  {
    name: '金融机构',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    name: '内容媒体',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
  },
  {
    name: '科技企业',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
      </svg>
    ),
  },
  {
    name: '制造行业',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
];

function AnimatedCounter({ end, suffix = '', prefix = '' }: { end: number; suffix?: string; prefix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !hasAnimated.current) {
        hasAnimated.current = true;
        const duration = 2000;
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(eased * end));
          if (progress < 1) requestAnimationFrame(animate);
        };
        animate();
      }
    }, { threshold: 0.3 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [end]);

  return <div ref={ref}>{prefix}{count.toLocaleString()}{suffix}</div>;
}

export default function Home() {
  useSeo(PAGE_SEO.home);
  const { t } = useTranslation();
  const featuresRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const enterpriseRef = useRef<HTMLDivElement>(null);
  const howItWorksRef = useRef<HTMLDivElement>(null);
  const testimonialsRef = useRef<HTMLDivElement>(null);
  const trustRef = useRef<HTMLDivElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<string>('');

  // 锚点导航高亮
  useEffect(() => {
    const sectionIds = ['features', 'demo', 'pricing', 'testimonials', 'faq'];
    const observer = new IntersectionObserver(
      (entries) => {
        // 找到当前可见比例最大的 section
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          // 取第一个可见的（按 DOM 顺序）
          setActiveSection(visible[0].target.id);
        }
      },
      { threshold: 0.3 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const refs = [
      featuresRef, statsRef, demoRef, enterpriseRef,
      howItWorksRef, testimonialsRef, trustRef, ctaRef,
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            // 同时为内部所有 scroll-reveal 和 stagger-children 元素添加 revealed
            entry.target.querySelectorAll('.scroll-reveal, .stagger-children').forEach((el) => {
              el.classList.add('revealed');
            });
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    refs.forEach((ref) => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  // FAQ structured data (JSON-LD)
  useEffect(() => {
    const faqData = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'AI效率助手是什么？能帮我做什么？',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'AI效率助手是一款基于先进 AI 大模型的智能内容创作平台。它可以帮助你进行文案撰写、智能改写、多语言翻译、内容总结、SEO优化等29+种内容创作任务，大幅提升你的写作效率。',
          },
        },
        {
          '@type': 'Question',
          name: '支持哪些 AI 模型？',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '我们支持 DeepSeek、GPT-4o、Claude、GLM-4、通义千问等主流 AI 大模型，同时兼容 OpenAI API 格式的自定义模型。你可以在设置页面自由切换和配置。',
          },
        },
        {
          '@type': 'Question',
          name: '我的数据安全吗？',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '我们非常重视数据安全。所有 API 密钥仅存储在你的本地浏览器中，不会上传到任何服务器。AI 对话内容仅在你设备和 AI 模型服务商之间传输，我们不会收集或存储你的创作内容。',
          },
        },
        {
          '@type': 'Question',
          name: '免费版有什么限制？',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '免费版可以体验所有基础功能，包括 AI 文本处理、AI 对话、富文本编辑等。专业版提供更高的使用额度、优先响应速度和高级功能。',
          },
        },
        {
          '@type': 'Question',
          name: '如何切换不同的 AI 模型？',
          acceptedAnswer: {
            '@type': 'Answer',
            text: '进入「设置 → 模型配置」页面，选择你想要使用的 AI 服务商，填入对应的 API 密钥即可。切换后立即生效，无需重启。',
          },
        },
        {
          '@type': 'Question',
          name: '支持哪些浏览器？',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'AI效率助手支持所有现代浏览器，包括 Chrome、Firefox、Safari、Edge 的最新版本。推荐使用 Chrome 或 Edge 获得最佳体验。',
          },
        },
      ],
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-structured-data';
    script.textContent = JSON.stringify(faqData);
    document.head.appendChild(script);

    return () => {
      const existing = document.getElementById('faq-structured-data');
      if (existing) existing.remove();
    };
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        name: 'AI效率助手',
        description: PAGE_SEO.home.description,
        url: 'https://wzx-wq.github.io/ai-efficiency-assistant',
        applicationCategory: 'UtilityApplication',
        operatingSystem: 'Web',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'CNY',
        },
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: 'AI效率助手',
        url: 'https://wzx-wq.github.io/ai-efficiency-assistant',
      }} />
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-10 sm:pt-40 sm:pb-14">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950 animate-gradient" style={{ backgroundSize: '200% 200%' }}>
          <div className="absolute top-20 right-10 w-72 h-72 bg-primary-400/20 dark:bg-primary-600/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 left-10 w-96 h-96 bg-indigo-400/15 dark:bg-indigo-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-hidden">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-full text-sm text-primary-700 dark:text-primary-300 font-medium mb-8 animate-fade-in">
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              {t('home.hero.badge')}
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight animate-slide-up animate-gradient-text">
              {t('home.hero.title')}
              <br />
              <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-purple-600 bg-clip-text text-transparent">
                {t('home.hero.titleHighlight')}
              </span>
            </h1>

            <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto animate-slide-up">
              {t('home.hero.subtitle')}
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
              <Link
                to="/workspace"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary-600 text-white text-base font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
              >
                {t('home.hero.cta')}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-base font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:-translate-y-0.5"
              >
                {t('home.hero.ctaSecondary')}
              </Link>
            </div>

            {/* Business Value Badges (replacing tech badges) */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 animate-fade-in">
              {['29+ 核心功能', '6 大专业服务', 'SSE 流式输出', '数据本地存储', '7天免费试用'].map((badge) => (
                <span key={badge} className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full text-xs font-medium border border-gray-200 dark:border-gray-700">
                  {badge}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 锚点导航 */}
      <nav className="sticky top-16 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 overflow-x-auto scrollbar-hide py-2">
          {[
            { id: 'features', label: '核心功能' },
            { id: 'demo', label: '产品演示' },
            { id: 'pricing', label: '定价方案' },
            { id: 'testimonials', label: '用户评价' },
            { id: 'faq', label: '常见问题' },
          ].map(item => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`relative text-sm whitespace-nowrap transition-colors pb-1 ${
                activeSection === item.id
                  ? 'text-primary-600 dark:text-primary-400 font-semibold'
                  : 'text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400'
              } ${activeSection === item.id ? 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary-600 dark:after:bg-primary-400 after:rounded-full' : ''}`}
              onClick={(e) => { e.preventDefault(); document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' }); }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Trust Logo Wall */}
      <section ref={trustRef} className="scroll-reveal py-12 bg-gray-50/50 dark:bg-gray-900/50 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-400 dark:text-gray-500 mb-8 font-medium">
            已服务 50,000+ 用户和企业，覆盖电商、教育、金融、媒体等多个行业
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12">
            {trustLogos.map((logo) => (
              <div
                key={logo.name}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-300">
                  {logo.icon}
                </div>
                <span className="text-sm font-medium text-gray-400 dark:text-gray-500">{logo.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section ref={statsRef} className="scroll-reveal py-8 bg-gray-50 dark:bg-gray-900 border-y border-gray-100 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary-600 to-purple-600 bg-clip-text text-transparent">
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} prefix={stat.prefix} />
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" ref={featuresRef} className="scroll-reveal py-12 sm:py-16" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              二十九核心功能
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              覆盖内容创作与运营全流程，AI 全程陪伴
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {features.map((feature) =>
              feature.to ? (
                <Link
                  key={feature.id}
                  to={feature.to}
                  className="group relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300"
                >
                  <div className={`w-14 h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center ${feature.textColor} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className={`absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r ${feature.color} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                </Link>
              ) : (
                <div
                  key={feature.id}
                  className="group relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-gray-900/50 hover:-translate-y-1 active:scale-[0.98] transition-all duration-300"
                >
                  <div className={`w-14 h-14 ${feature.bgColor} rounded-2xl flex items-center justify-center ${feature.textColor} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {feature.description}
                  </p>
                  <div className={`absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r ${feature.color} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Product Demo Section */}
      <section id="demo" ref={demoRef} className="scroll-reveal py-12 sm:py-16 bg-gray-50 dark:bg-gray-900" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10 scroll-reveal">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              直观高效的工作台
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              简洁现代的界面设计，让你专注于创作本身
            </p>
          </div>

          <div className="scroll-reveal">
            <div className="relative rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xl overflow-hidden">
              {/* Mock browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="max-w-md mx-auto px-4 py-1.5 bg-white dark:bg-gray-800 rounded-lg text-xs text-gray-400 text-center border border-gray-200 dark:border-gray-600">
                    ai-assistant.app/workspace
                  </div>
                </div>
              </div>
              {/* Mock workspace content */}
              <div className="p-6 sm:p-8 min-h-[400px]">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left sidebar mock */}
                  <div className="space-y-4">
                    <div className="h-8 bg-gray-100 dark:bg-gray-700 rounded-lg w-3/4" />
                    <div className="space-y-2">
                      {['AI 文本处理', 'AI 对话', '富文本编辑器'].map((tab) => (
                        <div key={tab} className={`px-3 py-2 rounded-lg text-sm ${tab === 'AI 文本处理' ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                          {tab}
                        </div>
                      ))}
                    </div>
                    <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                      <div className="text-xs text-gray-400 mb-2">最近使用</div>
                      {['智能改写', '文案生成', 'SEO优化'].map((tool) => (
                        <div key={tool} className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400">{tool}</div>
                      ))}
                    </div>
                  </div>
                  {/* Main content mock */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-32" />
                      <div className="flex gap-2">
                        <div className="h-8 w-20 bg-primary-100 dark:bg-primary-900/30 rounded-lg" />
                        <div className="h-8 w-20 bg-gray-100 dark:bg-gray-700 rounded-lg" />
                      </div>
                    </div>
                    {/* Editor mock */}
                    <div className="border border-gray-200 dark:border-gray-600 rounded-xl p-4 min-h-[200px] space-y-3">
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full" />
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-5/6" />
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-4/6" />
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-full" />
                      <div className="h-4 bg-gray-100 dark:bg-gray-700 rounded w-3/4" />
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="h-4 bg-primary-50 dark:bg-primary-900/20 rounded w-2/3" />
                        <div className="h-4 bg-primary-50 dark:bg-primary-900/20 rounded w-5/6 mt-2" />
                      </div>
                    </div>
                    {/* Toolbar mock */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {['B', 'I', 'U', 'H1', 'H2', '≡', '❝', '</>', '🔗', '🖼'].map((btn) => (
                        <div key={btn} className="w-8 h-8 flex items-center justify-center rounded text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                          {btn}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section ref={enterpriseRef} className="scroll-reveal py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              企业级特性
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              为专业团队打造的可靠、安全、高效的 AI 创作平台
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 stagger-children">
            {[
              { icon: '📝', title: '富文本编辑器', desc: 'Notion 风格编辑器，支持标题、列表、引用、代码块、图片、链接等丰富格式' },
              { icon: '🤖', title: 'AI 写作助手', desc: '侧边栏 AI 助手，支持快捷指令、上下文感知、流式输出，随时为你提供写作帮助' },
              { icon: '⌨️', title: '命令面板', desc: 'Ctrl+K 快速唤起，模糊搜索，键盘导航，毫秒级响应' },
              { icon: '🔒', title: '数据安全保障', desc: '所有数据本地存储，API Key 不上传服务器，端到端加密传输' },
              { icon: '✨', title: '流畅动画体验', desc: '页面过渡、滚动动画、骨架屏加载，打造丝滑的用户体验' },
              { icon: '🌙', title: '三模式主题', desc: '亮色/暗黑/跟随系统三种主题模式，全局一致的视觉体验' },
              { icon: '📱', title: '全端响应式', desc: '完美适配桌面、平板、手机，随时随地高效创作' },
              { icon: '📦', title: '内容自动保存', desc: '所有生成内容自动保存到本地，支持批量导出和管理' },
              { icon: '🛡️', title: '错误边界保护', desc: 'React Error Boundary 防止白屏崩溃，提供友好的错误回退 UI' },
            ].map((item) => (
              <div key={item.title} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
                <span className="text-2xl">{item.icon}</span>
                <h3 className="mt-3 text-base font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white dark:bg-gray-950" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold rounded-full mb-3">灵活定价</span>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">选择适合你的方案</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-2xl mx-auto">从免费版开始，随时升级</p>
          </div>
          <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto md:overflow-x-visible snap-x snap-mandatory pb-4 md:pb-0 scrollbar-hide max-w-5xl mx-auto">
            {/* 免费版 */}
            <div className="min-w-[280px] md:min-w-0 snap-start p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">免费版</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">¥0</span>
                <span className="text-gray-500 dark:text-gray-400">/月</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">适合个人体验</p>
              <ul className="mt-6 space-y-3">
                {['每日 10 次 AI 调用', '基础 AI 文本处理', '3 种 AI 角色', '富文本编辑器', '社区支持'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/workspace" className="mt-8 block w-full text-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                免费开始
              </Link>
            </div>
            {/* 专业版 */}
            <div className="relative min-w-[280px] md:min-w-0 snap-start p-6 rounded-2xl border-2 border-primary-500 dark:border-primary-400 shadow-xl shadow-primary-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary-600 text-white text-xs font-semibold rounded-full">推荐</div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">专业版</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">¥49</span>
                <span className="text-gray-500 dark:text-gray-400">/月</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">适合内容创作者</p>
              <ul className="mt-6 space-y-3">
                {['无限 AI 调用', '全部 29+ AI 工具', '所有 AI 角色', '高级编辑器功能', '优先响应速度', '邮件支持'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg className="w-4 h-4 text-primary-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/pricing" className="mt-8 block w-full text-center px-4 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors shadow-sm">
                立即升级
              </Link>
            </div>
            {/* 团队版 */}
            <div className="min-w-[280px] md:min-w-0 snap-start p-6 rounded-2xl border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">团队版</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">¥199</span>
                <span className="text-gray-500 dark:text-gray-400">/月</span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">适合团队协作</p>
              <ul className="mt-6 space-y-3">
                {['专业版全部功能', '最多 20 人协作', '团队数据看板', 'API 接口访问', '专属客户经理', 'SLA 保障'].map(f => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <Link to="/services" className="mt-8 block w-full text-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                联系我们
              </Link>
            </div>
          </div>
          <div className="text-center mt-8">
            <Link to="/pricing" className="text-sm text-primary-600 dark:text-primary-400 hover:underline">查看完整定价方案 →</Link>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" ref={testimonialsRef} className="scroll-reveal py-12 sm:py-16 bg-gray-50 dark:bg-gray-900" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              用户怎么说
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              来自真实用户的使用反馈
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-300"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                {/* Quote */}
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                  &ldquo;{t.content}&rdquo;
                </p>
                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section ref={howItWorksRef} className="scroll-reveal py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              三步开始使用
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              无需复杂配置，几分钟即可上手
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 stagger-children">
            {[
              { step: '01', title: '选择工具', description: '从二十九 AI 工具中选择适合你需求的工具，打开即用。' },
              { step: '02', title: '输入需求', description: '在富文本编辑器中填写信息，或使用 AI 助手对话。' },
              { step: '03', title: 'AI 即刻生成', description: 'AI 流式生成专业结果，支持复制、导出、继续编辑。' },
            ].map((item) => (
              <div key={item.step} className="relative bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-100 dark:border-gray-700 hover:shadow-lg transition-all duration-300">
                <div className="text-5xl font-bold text-gray-100 dark:text-gray-700 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI 模型支持 */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">支持主流 AI 大模型</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-10">灵活切换，选择最适合你的 AI 引擎</p>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { name: 'DeepSeek', desc: '深度求索', color: 'from-blue-500 to-cyan-500' },
              { name: 'GPT-4o', desc: 'OpenAI', color: 'from-green-500 to-emerald-500' },
              { name: 'Claude', desc: 'Anthropic', color: 'from-orange-500 to-amber-500' },
              { name: 'GLM-4', desc: '智谱 AI', color: 'from-purple-500 to-violet-500' },
              { name: '通义千问', desc: '阿里云', color: 'from-red-500 to-rose-500' },
              { name: '自定义', desc: '兼容 OpenAI API', color: 'from-gray-500 to-gray-600' },
            ].map((model) => (
              <div key={model.name} className="flex items-center gap-3 px-5 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-300">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${model.color} flex items-center justify-center text-white font-bold text-sm`}>
                  {model.name.charAt(0)}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{model.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{model.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 更新日志 */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold rounded-full mb-3">持续更新</span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">最近更新</h2>
            <p className="text-gray-500 dark:text-gray-400 mt-2">我们持续优化产品体验，以下是最新的更新内容</p>
          </div>
          <div className="space-y-4">
            {[
              { version: 'v3.2', date: '2025-05', title: '平台能力大升级', desc: '新增API开放平台、移动端优化、四语言国际化(中/英/日/韩)，修复产品演示', tag: '重大更新', tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
              { version: 'v3.1', date: '2025-05', title: '效率与娱乐双升级', desc: '新增PPT生成器、数据分析、营销文案、互动小说四大工具，工具总数达28+', tag: '新功能', tagColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
              { version: 'v3.0', date: '2025-05', title: '平台全面升级', desc: '新增用户系统、AI代码助手、AI学习助手、AI生活助手、社区精选，工具总数达24+', tag: '重大更新', tagColor: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
              { version: 'v2.8', date: '2025-04', title: '功能大扩展', desc: '新增AI文档分析、智能翻译、思维导图三大工具，工具总数达24+', tag: '新功能', tagColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
              { version: 'v2.7', date: '2025-04', title: '竞争力大升级', desc: '新增AI长文写作、智能改写、续写扩写三大核心工具，补齐与笔灵AI的功能差距', tag: '新功能', tagColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
              { version: 'v2.6', date: '2025-04', title: 'AI游乐场上线', desc: '新增AI角色扮演互动体验模块，支持9大世界观、沉浸式聊天、角色卡创建与分享', tag: '新功能', tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
              { version: 'v2.5', date: '2025-01', title: '富文本编辑器全面升级', desc: '新增 Slash 命令面板、表格编辑、待办事项、图片上传', tag: '新功能', tagColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
              { version: 'v2.4', date: '2025-01', title: 'AI 对话体验增强', desc: '预设提示词模板、消息重新生成、点赞反馈、对话导出', tag: '优化', tagColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
              { version: 'v2.3', date: '2024-12', title: '企业级安全与合规', desc: 'API Key 安全加固、SEO 优化、通知系统、数据备份恢复', tag: '安全', tagColor: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
              { version: 'v2.2', date: '2024-12', title: '首页视觉全面升级', desc: '渐变动画背景、数字滚动计数器、AI 模型展示、FAQ 区块', tag: '设计', tagColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
            ].map((item) => (
              <div key={item.version} className="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                <div className="flex-shrink-0 w-16 text-center">
                  <div className="text-sm font-bold text-primary-600 dark:text-primary-400">{item.version}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{item.date}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${item.tagColor}`}>{item.tag}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 bg-white dark:bg-gray-950" style={{ scrollMarginTop: '80px' }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              常见问题
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              快速了解 AI 效率助手
            </p>
          </div>

          <div className="space-y-3">
            {[
              {
                q: 'AI效率助手是什么？能帮我做什么？',
                a: 'AI效率助手是一款基于先进 AI 大模型的智能内容创作平台。它可以帮助你进行文案撰写、智能改写、多语言翻译、内容总结、SEO优化等21+种内容创作任务，大幅提升你的写作效率。',
              },
              {
                q: '支持哪些 AI 模型？',
                a: '我们支持 DeepSeek、GPT-4o、Claude、GLM-4、通义千问等主流 AI 大模型，同时兼容 OpenAI API 格式的自定义模型。你可以在设置页面自由切换和配置。',
              },
              {
                q: '我的数据安全吗？',
                a: '我们非常重视数据安全。所有 API 密钥仅存储在你的本地浏览器中，不会上传到任何服务器。AI 对话内容仅在你设备和 AI 模型服务商之间传输，我们不会收集或存储你的创作内容。',
              },
              {
                q: '免费版有什么限制？',
                a: '免费版可以体验所有基础功能，包括 AI 文本处理、AI 对话、富文本编辑等。专业版提供更高的使用额度、优先响应速度和高级功能。',
              },
              {
                q: '如何切换不同的 AI 模型？',
                a: '进入「设置 → 模型配置」页面，选择你想要使用的 AI 服务商，填入对应的 API 密钥即可。切换后立即生效，无需重启。',
              },
              {
                q: '支持哪些浏览器？',
                a: 'AI效率助手支持所有现代浏览器，包括 Chrome、Firefox、Safari、Edge 的最新版本。推荐使用 Chrome 或 Edge 获得最佳体验。',
              },
            ].map((faq, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                <button
                  onClick={() => setFaqOpenIndex(faqOpenIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-5 text-left font-medium text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <span>{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${faqOpenIndex === index ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <AnimatePresence initial={false}>
                  {faqOpenIndex === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-gray-600 dark:text-gray-300 leading-relaxed">
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section ref={ctaRef} className="scroll-reveal py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-3xl px-6 py-12 sm:px-16 sm:py-20 text-center">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                准备好提升你的写作效率了吗？
              </h2>
              <p className="text-lg text-primary-100 max-w-2xl mx-auto mb-8">
                立即免费开始，体验企业级 AI 内容创作平台
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/workspace"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-primary-700 text-base font-semibold rounded-xl hover:bg-primary-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  免费开始使用
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 text-white text-base font-semibold rounded-xl border border-white/20 hover:bg-white/20 transition-all hover:-translate-y-0.5"
                >
                  查看定价
                </Link>
              </div>
              <p className="mt-6 text-sm text-primary-200">
                无需信用卡 · 免费版永久可用 · 随时升级
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
