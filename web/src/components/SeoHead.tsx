import { useEffect, useCallback, type ReactNode } from 'react'

// ============================================================
// 类型定义
// ============================================================

interface SeoOptions {
  title: string
  description: string
  keywords?: string
  ogImage?: string
  canonicalUrl?: string
}

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[]
  children?: ReactNode
}

// ============================================================
// 常量
// ============================================================

const BASE_URL = 'https://wzx-wq.github.io/ai-efficiency-assistant'

const DEFAULT_TITLE = 'AI效率助手 - 让AI成为你的超级写作搭档'

const DEFAULT_DESCRIPTION =
  'AI效率助手是一款专业的AI内容创作平台，提供智能写作、文案生成、内容优化等功能，帮助创作者大幅提升写作效率与内容质量。'

const DEFAULT_KEYWORDS =
  'AI写作,AI内容创作,智能写作助手,文案生成,AI效率工具,内容优化,写作平台'

// ============================================================
// 工具函数
// ============================================================

/** 获取或创建指定 meta 标签 */
function getOrCreateMeta(
  attr: 'name' | 'property',
  key: string,
): HTMLMetaElement {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  return el
}

/** 获取或创建 <link rel="canonical"> */
function getOrCreateCanonical(): HTMLLinkElement {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  return el
}

/** 快照当前 head 中的 SEO 相关状态，用于卸载时还原 */
function snapshotHead() {
  return {
    title: document.title,
    description:
      document.querySelector<HTMLMetaElement>('meta[name="description"]')
        ?.content ?? '',
    keywords:
      document.querySelector<HTMLMetaElement>('meta[name="keywords"]')
        ?.content ?? '',
    ogTitle:
      document.querySelector<HTMLMetaElement>('meta[property="og:title"]')
        ?.content ?? '',
    ogDescription:
      document.querySelector<HTMLMetaElement>('meta[property="og:description"]')
        ?.content ?? '',
    ogType:
      document.querySelector<HTMLMetaElement>('meta[property="og:type"]')
        ?.content ?? '',
    ogImage:
      document.querySelector<HTMLMetaElement>('meta[property="og:image"]')
        ?.content ?? '',
    ogUrl:
      document.querySelector<HTMLMetaElement>('meta[property="og:url"]')
        ?.content ?? '',
    twitterCard:
      document.querySelector<HTMLMetaElement>('meta[name="twitter:card"]')
        ?.content ?? '',
    twitterTitle:
      document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')
        ?.content ?? '',
    twitterDescription:
      document.querySelector<HTMLMetaElement>('meta[name="twitter:description"]')
        ?.content ?? '',
    canonical:
      document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
        ?.href ?? '',
  }
}

/** 还原 head 到快照状态 */
function restoreHead(prev: ReturnType<typeof snapshotHead>) {
  document.title = prev.title

  const setMeta = (attr: 'name' | 'property', key: string, val: string) => {
    const el = document.querySelector<HTMLMetaElement>(
      `meta[${attr}="${key}"]`,
    )
    if (el) {
      if (val) {
        el.setAttribute('content', val)
      } else {
        el.remove()
      }
    }
  }

  setMeta('name', 'description', prev.description)
  setMeta('name', 'keywords', prev.keywords)
  setMeta('property', 'og:title', prev.ogTitle)
  setMeta('property', 'og:description', prev.ogDescription)
  setMeta('property', 'og:type', prev.ogType)
  setMeta('property', 'og:image', prev.ogImage)
  setMeta('property', 'og:url', prev.ogUrl)
  setMeta('name', 'twitter:card', prev.twitterCard)
  setMeta('name', 'twitter:title', prev.twitterTitle)
  setMeta('name', 'twitter:description', prev.twitterDescription)

  const canonicalEl = document.querySelector<HTMLLinkElement>(
    'link[rel="canonical"]',
  )
  if (canonicalEl) {
    if (prev.canonical) {
      canonicalEl.setAttribute('href', prev.canonical)
    } else {
      canonicalEl.remove()
    }
  }
}

// ============================================================
// useSeo Hook
// ============================================================

/**
 * 轻量级 SEO 管理 Hook
 *
 * - 设置 document.title
 * - 管理 meta description / keywords
 * - 管理 Open Graph 标签
 * - 管理 Twitter Card 标签
 * - 设置 canonical 链接
 * - 组件卸载时自动还原
 */
export function useSeo(optionsOrKey: SeoOptions | string): void {
  const options: SeoOptions =
    typeof optionsOrKey === 'string'
      ? (PAGE_SEO as Record<string, SeoOptions>)[optionsOrKey] ?? {}
      : optionsOrKey

  const applySeo = useCallback(() => {
    const {
      title,
      description,
      keywords = DEFAULT_KEYWORDS,
      ogImage,
      canonicalUrl,
    } = options

    // 1. 设置页面标题
    document.title = title || DEFAULT_TITLE

    // 2. 设置 meta description
    getOrCreateMeta('name', 'description').setAttribute(
      'content',
      description || DEFAULT_DESCRIPTION,
    )

    // 3. 设置 meta keywords
    getOrCreateMeta('name', 'keywords').setAttribute('content', keywords)

    // 4. 设置 Open Graph 标签
    getOrCreateMeta('property', 'og:title').setAttribute(
      'content',
      title || DEFAULT_TITLE,
    )
    getOrCreateMeta('property', 'og:description').setAttribute(
      'content',
      description || DEFAULT_DESCRIPTION,
    )
    getOrCreateMeta('property', 'og:type').setAttribute('content', 'website')

    if (ogImage) {
      getOrCreateMeta('property', 'og:image').setAttribute(
        'content',
        ogImage.startsWith('http') ? ogImage : `${BASE_URL}${ogImage}`,
      )
    }

    const resolvedUrl = canonicalUrl
      ? canonicalUrl.startsWith('http')
        ? canonicalUrl
        : `${BASE_URL}${canonicalUrl}`
      : BASE_URL

    getOrCreateMeta('property', 'og:url').setAttribute('content', resolvedUrl)

    // 5. 设置 Twitter Card 标签
    getOrCreateMeta('name', 'twitter:card').setAttribute(
      'content',
      'summary_large_image',
    )
    getOrCreateMeta('name', 'twitter:title').setAttribute(
      'content',
      title || DEFAULT_TITLE,
    )
    getOrCreateMeta('name', 'twitter:description').setAttribute(
      'content',
      description || DEFAULT_DESCRIPTION,
    )

    // 6. 设置 canonical 链接
    if (canonicalUrl) {
      getOrCreateCanonical().setAttribute('href', resolvedUrl)
    }
  }, [options])

  useEffect(() => {
    const prev = snapshotHead()
    applySeo()
    return () => restoreHead(prev)
  }, [applySeo])
}

// ============================================================
// JsonLd 组件
// ============================================================

/**
 * JSON-LD 结构化数据组件
 *
 * 用于向搜索引擎提供结构化数据，增强搜索结果展示效果。
 */
export function JsonLd({ data }: JsonLdProps): ReactNode {
  useEffect(() => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(data)
    script.setAttribute('data-jsonld', 'true')

    document.head.appendChild(script)

    return () => {
      script.remove()
    }
  }, [data])

  return null
}

// ============================================================
// 页面级 SEO 数据映射
// ============================================================

export const PAGE_SEO = {
  home: {
    title: 'AI效率助手 - 让AI成为你的超级写作搭档',
    description:
      'AI效率助手是一款专业的AI内容创作平台，提供智能写作、文案生成、内容优化等功能，帮助创作者大幅提升写作效率与内容质量。',
    keywords:
      'AI写作,AI内容创作,智能写作助手,文案生成,AI效率工具,内容优化,写作平台',
    canonicalUrl: '/',
  },

  workspace: {
    title: 'AI创作工作台 - AI效率助手',
    description:
      '在AI创作工作台中，您可以利用AI助手进行文章写作、内容改写、创意激发等多种创作任务，体验高效的AI辅助写作流程。',
    keywords:
      'AI工作台,AI写作,智能创作,内容改写,创意写作,AI辅助创作',
    canonicalUrl: '/workspace',
  },

  pricing: {
    title: '定价方案 - AI效率助手',
    description:
      '查看AI效率助手的灵活定价方案，提供免费版与专业版供您选择，满足个人创作者到企业团队的多样化需求。',
    keywords:
      'AI定价,订阅方案,免费AI工具,AI写作价格,会员计划,AI效率助手价格',
    canonicalUrl: '/pricing',
  },

  services: {
    title: 'AI服务介绍 - AI效率助手',
    description:
      '了解AI效率助手提供的核心AI服务，包括智能写作、内容优化、SEO优化、多语言翻译等全方位AI内容创作解决方案。',
    keywords:
      'AI服务,智能写作服务,内容优化,SEO优化,AI翻译,内容创作服务',
    canonicalUrl: '/services',
  },

  settings: {
    title: '个人设置 - AI效率助手',
    description:
      '管理您的AI效率助手账户设置，包括API密钥配置、偏好设置、使用统计等功能，打造个性化的AI写作体验。',
    keywords:
      'AI设置,API配置,偏好设置,账户管理,AI助手设置',
    canonicalUrl: '/settings',
  },

  // 服务子页面
  video: { title: '短视频制作 - AI效率助手', description: 'AI驱动的短视频脚本创作、分镜设计和内容优化工具，提升短视频制作效率' },
  'group-buy': { title: '社区团购运营 - AI效率助手', description: 'AI智能团购文案生成、活动策划和社群运营工具' },
  'private-domain': { title: '私域运营 - AI效率助手', description: 'AI赋能的私域流量运营工具，智能内容生成和用户管理' },
  'ai-cs': { title: 'AI智能客服 - AI效率助手', description: '基于AI的智能客服系统，自动回复、知识库管理和客户服务优化' },
  'data-analysis': { title: '数据分析 - AI效率助手', description: 'AI数据分析助手，智能报表生成、趋势预测和数据洞察' },
  'live-stream': { title: '直播运营 - AI效率助手', description: 'AI直播脚本创作、话术优化和直播数据分析工具' },

  // 工具子页面
  creative: { title: '创意灵感 - AI效率助手', description: 'AI创意灵感生成器，激发无限创意，支持多场景内容创作' },
  calendar: { title: '营销日历 - AI效率助手', description: 'AI智能营销日历，自动规划营销活动和内容排期' },
  scripts: { title: 'AI话术库 - AI效率助手', description: 'AI智能话术库，多场景话术模板和个性化话术生成' },
  copywriting: { title: '文案生成器 - AI效率助手', description: 'AI文案生成器，一键生成营销文案、广告语和推广内容' },
  history: { title: '历史记录 - AI效率助手', description: '查看和管理您的AI创作历史记录' },
  brand: { title: '品牌声音 - AI效率助手', description: '定义和管理品牌声音，确保AI生成内容符合品牌调性' },
  seo: { title: 'SEO优化 - AI效率助手', description: 'AI SEO优化工具，智能关键词分析和内容优化建议' },
  templates: { title: '模板库 - AI效率助手', description: '丰富的AI创作模板库，覆盖多种内容创作场景' },
  humanize: { title: '人性化改写 - AI效率助手', description: 'AI人性化改写工具，让AI生成的内容更自然、更有温度' },
  polish: { title: '文章润色 - AI效率助手', description: 'AI文章润色工具，智能优化文笔、修正语法和提升表达' },
  summarizer: { title: '内容总结 - AI效率助手', description: 'AI内容总结工具，快速提取长文核心要点和关键信息' },
  longform: { title: 'AI长文写作 - AI效率助手', description: 'AI长文写作工具，支持大纲规划与分段生成，轻松创作万字论文、报告、小说、教程等专业长文内容。', keywords: 'AI长文写作,万字论文生成,大纲规划,分段写作,长文生成器,AI写作助手' },
  continue: { title: 'AI续写扩写 - AI效率助手', description: 'AI续写扩写工具，智能理解上下文，一键续写文章、扩写段落、生成结尾，支持多版本对比选择。', keywords: 'AI续写,文章扩写,智能续写,结尾生成,标题生成,AI写作助手' },
  rewrite: { title: 'AI智能改写 - AI效率助手', description: 'AI智能改写工具，支持降重改写、去AI痕迹、学术润色、口语化等多种改写模式，一键提升文本质量。', keywords: 'AI改写,文本降重,去AI痕迹,学术润色,文本人性化,AI降重工具' },
  translation: { title: 'AI智能翻译 - AI效率助手', description: 'AI智能翻译工具，支持中英日韩法德西俄阿葡多语言互译，提供文本翻译、文档翻译、批量翻译、润色翻译四种模式。', keywords: 'AI翻译,多语言翻译,智能翻译,文档翻译,批量翻译,翻译工具' },
  'doc-analysis': { title: 'AI文档分析 - AI效率助手', description: 'AI文档分析工具，支持智能摘要、关键信息提取、文档问答、文档对比等多种分析模式，快速洞察文档内容。', keywords: 'AI文档分析,文档摘要,信息提取,文档问答,文档对比,AI分析工具' },
 mindmap: { title: 'AI思维导图 - AI效率助手', description: 'AI智能思维导图生成器，输入主题自动生成结构化思维导图，支持思维发散、流程图、SWOT分析等多种类型。', keywords: 'AI思维导图,思维导图生成器,脑图工具,SWOT分析,知识框架,项目规划,AI导图' },

  // 生活助手
  'life-assistant': { title: 'AI生活助手 - AI效率助手', description: 'AI生活助手提供旅行规划、美食推荐、健康顾问、职业规划、情感倾听等智能生活服务，让AI成为你的全方位生活助手。', keywords: 'AI生活助手,旅行规划,美食推荐,健康顾问,职业规划,情感倾听,AI助手' },

  // 营销文案
  marketing: { title: 'AI营销文案 - AI效率助手', description: 'AI营销文案生成器，支持小红书、抖音、微信公众号、微博、朋友圈、电商详情页、邮件营销等多平台文案一键生成。', keywords: 'AI营销文案,小红书文案,抖音脚本,公众号文章,微博文案,电商文案,邮件营销,AI文案生成' },

  // 互动小说
  fiction: { title: 'AI互动小说 - AI效率助手', description: 'AI互动小说生成器，支持奇幻冒险、科幻未来、悬疑推理、恐怖惊悚、浪漫爱情、末日生存等多种题材，沉浸式互动阅读体验。', keywords: 'AI互动小说,互动阅读,文字冒险,选择游戏,AI故事生成,互动小说' },

  'ppt-generator': { title: 'AI PPT生成器 - AI效率助手', description: 'AI智能PPT生成器，输入主题自动生成大纲和幻灯片内容，支持多种风格，一键导出HTML演示文稿和演讲稿。', keywords: 'AI PPT生成器,智能PPT,PPT大纲,幻灯片生成,AI演示文稿,PPT制作工具' },

  'tool-data-analysis': { title: 'AI数据分析 - AI效率助手', description: 'AI数据分析工具，支持CSV/JSON数据上传，提供数据概览、趋势分析、对比分析、相关性分析和智能洞察。', keywords: 'AI数据分析,数据可视化,CSV分析,趋势分析,数据洞察,AI分析工具' },

  // 游乐场
  playground: { title: 'AI游乐场 - AI效率助手', description: 'AI角色扮演互动体验，修仙、三国、荒岛求生等多种世界观等你探索' },

  // 其他页面
  privacy: { title: '隐私政策 - AI效率助手', description: '了解AI效率助手如何收集、使用和保护您的个人信息' },
  terms: { title: '服务条款 - AI效率助手', description: 'AI效率助手的服务条款和使用协议' },

  // 用户系统
  login: {
    title: '登录 / 注册 - AI效率助手',
    description: '登录或注册AI效率助手账户，开始使用AI智能写作、文案生成、内容优化等强大功能。',
    keywords: 'AI登录,注册,账号管理,AI写作助手,免费注册',
    canonicalUrl: '/login',
  },
  profile: {
    title: '个人中心 - AI效率助手',
    description: '管理您的AI效率助手个人资料、查看使用统计、账户设置和会员计划。',
    keywords: '个人中心,用户资料,使用统计,账户设置,会员管理',
    canonicalUrl: '/profile',
  },

  'api-platform': {
    title: 'API 开放平台 - AI效率助手',
    description:
      'AI效率助手 API 开放平台，提供多模型 AI 能力接入，包括对话生成、文本翻译、内容摘要、代码生成等 RESTful API，支持 JavaScript、Python、Go、Java 等多语言 SDK。',
    keywords:
      'AI API,开放平台,RESTful API,AI接口,文本生成API,翻译API,代码生成,SDK,开发者工具',
    canonicalUrl: '/api-platform',
  },
} as const
