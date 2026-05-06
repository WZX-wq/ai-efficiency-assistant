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

const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`

const SITE_NAME = 'AI效率助手'

const SUPPORTED_LOCALES = [
  { lang: 'zh', locale: 'zh_CN' },
  { lang: 'en', locale: 'en_US' },
  { lang: 'ja', locale: 'ja_JP' },
  { lang: 'ko', locale: 'ko_KR' },
] as const

// ============================================================
// 工具页面路径映射 (用于 JSON-LD 结构化数据)
// ============================================================

const TOOL_PAGE_PATTERNS: RegExp[] = [
  /^\/workspace\/writing$/,
  /^\/workspace\/rewrite$/,
  /^\/workspace\/continue$/,
  /^\/workspace\/summarize$/,
  /^\/workspace\/translate$/,
  /^\/workspace\/document-analysis$/,
  /^\/workspace\/mind-map$/,
  /^\/workspace\/code-assistant$/,
  /^\/workspace\/learning$/,
  /^\/workspace\/life-assistant$/,
  /^\/workspace\/ppt-generator$/,
  /^\/workspace\/data-analysis$/,
  /^\/workspace\/marketing$/,
  /^\/workspace\/fiction$/,
]

function isToolPage(pathname: string): boolean {
  return TOOL_PAGE_PATTERNS.some((pattern) => pattern.test(pathname))
}

// ============================================================
// 面包屑名称映射
// ============================================================

const BREADCRUMB_NAMES: Record<string, string> = {
  '': '首页',
  workspace: 'AI创作工作台',
  writing: 'AI写作',
  rewrite: 'AI智能改写',
  continue: 'AI续写扩写',
  summarize: '内容总结',
  translate: 'AI智能翻译',
  'document-analysis': 'AI文档分析',
  'mind-map': 'AI思维导图',
  'code-assistant': 'AI代码助手',
  learning: 'AI学习助手',
  'life-assistant': 'AI生活助手',
  'ppt-generator': 'AI PPT生成器',
  'data-analysis': 'AI数据分析',
  marketing: 'AI营销文案',
  fiction: 'AI互动小说',
  playground: 'AI游乐场',
  pricing: '定价方案',
  'api-platform': 'API开放平台',
  login: '登录 / 注册',
  services: 'AI服务介绍',
  settings: '个人设置',
  privacy: '隐私政策',
  terms: '服务条款',
  profile: '个人中心',
  video: '短视频制作',
  'group-buy': '社区团购运营',
  'private-domain': '私域运营',
  'ai-cs': 'AI智能客服',
  'live-stream': '直播运营',
  creative: '创意灵感',
  calendar: '营销日历',
  scripts: 'AI话术库',
  copywriting: '文案生成器',
  history: '历史记录',
  brand: '品牌声音',
  seo: 'SEO优化',
  templates: '模板库',
  'template-market': 'AI模板市场',
  humanize: '人性化改写',
  polish: '文章润色',
  summarizer: '内容总结',
  longform: 'AI长文写作',
  'theme-settings': '主题设置',
  accessibility: '无障碍设置',
  plugins: 'AI插件市场',
  knowledge: '知识库',
  chat: 'AI对话',
  'chat-history': '对话历史',
  workflows: '自动化工作流',
  'workflow-dashboard': '工作流面板',
}

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

/** 获取或创建 <link rel="alternate" hreflang="..."> */
function getOrCreateHreflang(lang: string): HTMLLinkElement {
  let el = document.querySelector<HTMLLinkElement>(
    `link[rel="alternate"][hreflang="${lang}"]`,
  )
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'alternate')
    el.setAttribute('hreflang', lang)
    document.head.appendChild(el)
  }
  return el
}

/** 快照当前 head 中的 SEO 相关状态，用于卸载时还原 */
function snapshotHead() {
  const queryMeta = (attr: string, key: string) =>
    document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
      ?.content ?? ''

  const queryLink = (rel: string, extra?: string) => {
    if (extra) {
      return (
        document.querySelector<HTMLLinkElement>(
          `link[rel="${rel}"][${extra}]`,
        )?.href ?? ''
      )
    }
    return (
      document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)?.href ?? ''
    )
  }

  return {
    title: document.title,
    description: queryMeta('name', 'description'),
    keywords: queryMeta('name', 'keywords'),
    ogTitle: queryMeta('property', 'og:title'),
    ogDescription: queryMeta('property', 'og:description'),
    ogType: queryMeta('property', 'og:type'),
    ogImage: queryMeta('property', 'og:image'),
    ogUrl: queryMeta('property', 'og:url'),
    ogSiteName: queryMeta('property', 'og:site_name'),
    ogLocale: queryMeta('property', 'og:locale'),
    ogLocaleAlternate: queryMeta('property', 'og:locale:alternate'),
    twitterCard: queryMeta('name', 'twitter:card'),
    twitterTitle: queryMeta('name', 'twitter:title'),
    twitterDescription: queryMeta('name', 'twitter:description'),
    twitterImage: queryMeta('name', 'twitter:image'),
    canonical: queryLink('canonical'),
    hreflangs: SUPPORTED_LOCALES.map((l) => ({
      lang: l.lang,
      href: queryLink('alternate', `hreflang="${l.lang}"`),
    })),
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
  setMeta('property', 'og:site_name', prev.ogSiteName)
  setMeta('property', 'og:locale', prev.ogLocale)
  setMeta('property', 'og:locale:alternate', prev.ogLocaleAlternate)
  setMeta('name', 'twitter:card', prev.twitterCard)
  setMeta('name', 'twitter:title', prev.twitterTitle)
  setMeta('name', 'twitter:description', prev.twitterDescription)
  setMeta('name', 'twitter:image', prev.twitterImage)

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

  // 还原 hreflang 标签
  for (const { lang, href } of prev.hreflangs) {
    const el = document.querySelector<HTMLLinkElement>(
      `link[rel="alternate"][hreflang="${lang}"]`,
    )
    if (el) {
      if (href) {
        el.setAttribute('href', href)
      } else {
        el.remove()
      }
    }
  }
}

// ============================================================
// JSON-LD 生成函数
// ============================================================

/** 生成 WebApplication 结构化数据 */
function generateWebApplicationSchema(
  title: string,
  description: string,
  url: string,
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: title,
    url: url,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'CNY',
    },
    description: description,
    inLanguage: ['zh', 'en', 'ja', 'ko'],
  }
}

/** 生成 WebSite 结构化数据 (首页) */
function generateWebSiteSchema(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: BASE_URL,
    description: DEFAULT_DESCRIPTION,
    inLanguage: ['zh', 'en', 'ja', 'ko'],
    potentialAction: {
      '@type': 'SearchAction',
      target: `${BASE_URL}/workspace?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

/** 生成 BreadcrumbList 结构化数据 */
function generateBreadcrumbSchema(pathname: string): Record<string, unknown> {
  const segments = pathname
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean)

  const items: { '@type': string; name: string; item: string }[] = [
    {
      '@type': 'ListItem',
      name: '首页',
      item: BASE_URL,
    },
  ]

  let accumulatedPath = ''
  for (const segment of segments) {
    accumulatedPath += `/${segment}`
    const name =
      BREADCRUMB_NAMES[segment] ||
      segment
        .split(/[-_]/)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ')
    items.push({
      '@type': 'ListItem',
      name,
      item: `${BASE_URL}${accumulatedPath}`,
    })
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      ...item,
      position: index + 1,
    })),
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
 * - 管理 Open Graph 标签 (含 og:site_name, og:locale, og:locale:alternate)
 * - 管理 Twitter Card 标签 (含 twitter:image)
 * - 设置 canonical 链接
 * - 设置 hreflang 多语言标签 (zh/en/ja/ko)
 * - 注入 JSON-LD 结构化数据 (WebApplication / BreadcrumbList)
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

    const pathname = window.location.pathname.replace(
      /^\/ai-efficiency-assistant/,
      '',
    ) || '/'

    const resolvedTitle = title || DEFAULT_TITLE
    const resolvedDescription = description || DEFAULT_DESCRIPTION
    const resolvedOgImage = ogImage
      ? ogImage.startsWith('http')
        ? ogImage
        : `${BASE_URL}${ogImage}`
      : DEFAULT_OG_IMAGE

    const resolvedUrl = canonicalUrl
      ? canonicalUrl.startsWith('http')
        ? canonicalUrl
        : `${BASE_URL}${canonicalUrl}`
      : `${BASE_URL}${pathname}`

    // 1. 设置页面标题
    document.title = resolvedTitle

    // 2. 设置 meta description
    getOrCreateMeta('name', 'description').setAttribute(
      'content',
      resolvedDescription,
    )

    // 3. 设置 meta keywords
    getOrCreateMeta('name', 'keywords').setAttribute('content', keywords)

    // 4. 设置 Open Graph 标签
    getOrCreateMeta('property', 'og:title').setAttribute(
      'content',
      resolvedTitle,
    )
    getOrCreateMeta('property', 'og:description').setAttribute(
      'content',
      resolvedDescription,
    )
    getOrCreateMeta('property', 'og:type').setAttribute('content', 'website')
    getOrCreateMeta('property', 'og:image').setAttribute(
      'content',
      resolvedOgImage,
    )
    getOrCreateMeta('property', 'og:url').setAttribute('content', resolvedUrl)
    getOrCreateMeta('property', 'og:site_name').setAttribute(
      'content',
      SITE_NAME,
    )
    getOrCreateMeta('property', 'og:locale').setAttribute(
      'content',
      'zh_CN',
    )

    // 设置 og:locale:alternate (en_US, ja_JP, ko_KR)
    const alternateLocales = SUPPORTED_LOCALES.filter(
      (l) => l.locale !== 'zh_CN',
    )
    alternateLocales.forEach((l, index) => {
      const el = document.querySelector<HTMLMetaElement>(
        `meta[property="og:locale:alternate"]`,
      )
      if (index === 0) {
        // 第一个 alternate locale，创建或更新
        const metaEl =
          el ||
          document.createElement('meta') as HTMLMetaElement
        if (!el) {
          metaEl.setAttribute('property', 'og:locale:alternate')
          document.head.appendChild(metaEl)
        }
        metaEl.setAttribute('content', l.locale)
      } else {
        // 额外的 alternate locale
        let extraEl = document.querySelector<HTMLMetaElement>(
          `meta[property="og:locale:alternate"][content="${l.locale}"]`,
        )
        if (!extraEl) {
          extraEl = document.createElement('meta')
          extraEl.setAttribute('property', 'og:locale:alternate')
          document.head.appendChild(extraEl)
        }
        extraEl.setAttribute('content', l.locale)
      }
    })

    // 5. 设置 Twitter Card 标签
    getOrCreateMeta('name', 'twitter:card').setAttribute(
      'content',
      'summary_large_image',
    )
    getOrCreateMeta('name', 'twitter:title').setAttribute(
      'content',
      resolvedTitle,
    )
    getOrCreateMeta('name', 'twitter:description').setAttribute(
      'content',
      resolvedDescription,
    )
    getOrCreateMeta('name', 'twitter:image').setAttribute(
      'content',
      resolvedOgImage,
    )

    // 6. 设置 canonical 链接
    getOrCreateCanonical().setAttribute('href', resolvedUrl)

    // 7. 设置 hreflang 多语言标签
    SUPPORTED_LOCALES.forEach((l) => {
      const el = getOrCreateHreflang(l.lang)
      const href =
        l.lang === 'zh'
          ? resolvedUrl
          : `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}lang=${l.lang}`
      el.setAttribute('href', href)
    })

    // 8. 注入 JSON-LD 结构化数据
    injectJsonLd(pathname, resolvedTitle, resolvedDescription, resolvedUrl)
  }, [options])

  useEffect(() => {
    const prev = snapshotHead()
    applySeo()
    return () => {
      restoreHead(prev)
      // 清理 JSON-LD
      document
        .querySelectorAll('script[data-jsonld="true"]')
        .forEach((el) => el.remove())
    }
  }, [applySeo])
}

// ============================================================
// JSON-LD 注入
// ============================================================

function injectJsonLd(
  pathname: string,
  title: string,
  description: string,
  url: string,
): void {
  // 清理已有的 JSON-LD
  document
    .querySelectorAll('script[data-jsonld="true"]')
    .forEach((el) => el.remove())

  const schemas: Record<string, unknown>[] = []

  // 首页: WebSite schema
  if (pathname === '/' || pathname === '') {
    schemas.push(generateWebSiteSchema())
  }

  // 工具页面: WebApplication schema
  if (isToolPage(pathname)) {
    schemas.push(
      generateWebApplicationSchema(
        title,
        description,
        url,
      ),
    )
  }

  // 所有页面: BreadcrumbList schema
  schemas.push(generateBreadcrumbSchema(pathname))

  // 注入所有 schema
  schemas.forEach((schema) => {
    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.textContent = JSON.stringify(schema)
    script.setAttribute('data-jsonld', 'true')
    document.head.appendChild(script)
  })
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

  dashboard: {
    title: '数据面板 - AI效率助手',
    description:
      '查看AI效率助手的使用统计数据，包括页面浏览量、工具使用次数、错误追踪和每日活跃度分析。',
    keywords:
      '数据分析,使用统计,错误追踪,数据面板,使用报告',
    canonicalUrl: '/dashboard',
  },

  'template-market': {
    title: 'AI模板市场 - AI效率助手',
    description:
      '精选200+专业AI模板，覆盖商务办公、内容创作、学术研究、营销推广、技术开发、教育学习等场景，一键使用，让AI为你赋能。',
    keywords:
      'AI模板,模板市场,AI写作模板,文案模板,办公模板,创作模板,AI效率助手',
    canonicalUrl: '/templates',
  },

  'theme-settings': {
    title: '主题设置 - AI效率助手',
    description:
      '自定义AI效率助手的外观主题，包括预设主题、自定义配色、圆角、字体等个性化设置。',
    keywords:
      '主题设置,自定义主题,深色模式,配色方案,AI效率助手',
    canonicalUrl: '/theme-settings',
  },
  accessibility: {
    title: '无障碍设置 - AI效率助手',
    description:
      '自定义AI效率助手的无障碍体验，包括字体大小、行高、高对比度模式、减少动画、屏幕阅读器支持等设置。',
    keywords:
      '无障碍,辅助功能,高对比度,减少动画,屏幕阅读器,字体设置,AI效率助手',
    canonicalUrl: '/accessibility',
  },

  plugins: {
    title: 'AI插件市场 - AI效率助手',
    description:
      '探索和安装AI效率助手的社区插件，扩展AI能力，或创建你的专属插件。50+插件覆盖效率工具、写作增强、数据处理、AI模型等场景。',
    keywords:
      'AI插件,插件市场,插件商店,AI扩展,效率工具,写作增强,AI效率助手',
    canonicalUrl: '/plugins',
  },
  chat: {
    title: 'AI 对话 - AI效率助手',
    description:
      '与 AI 进行深度对话，支持多轮对话、斜杠指令、对话模板等功能，提升你的工作和学习效率。',
    keywords:
      'AI对话,智能聊天,AI助手,对话模板,斜杠指令,AI效率助手',
    canonicalUrl: '/chat',
  },
  'chat-history': {
    title: '对话历史 - AI效率助手',
    description:
      '查看和管理你的所有 AI 对话记录，支持搜索、筛选、批量操作和导入导出。',
    keywords:
      'AI对话历史,对话记录,聊天记录管理,AI效率助手',
    canonicalUrl: '/chat-history',
  },

  knowledge: {
    title: '知识库 - AI效率助手',
    description:
      'AI效率助手知识库，管理笔记、文章、代码片段、书签和参考资料，构建你的个人知识体系。',
    keywords:
      '知识库,笔记管理,知识管理,AI效率助手,个人知识体系',
    canonicalUrl: '/knowledge',
  },

  workflows: {
    title: '自动化工作流 - AI效率助手',
    description:
      '创建和管理自动化工作流，连接多个AI处理步骤，实现内容创作的自动化流水线。',
    keywords:
      'AI工作流,自动化,流水线,AI自动化,内容创作自动化,AI效率助手',
    canonicalUrl: '/workflows',
  },

  'workflow-dashboard': {
    title: '工作流数据面板 - AI效率助手',
    description:
      '查看自动化工作流的运行统计、成功率分析和最近运行记录。',
    keywords:
      'AI工作流,自动化统计,工作流面板,AI效率助手',
    canonicalUrl: '/workflow-dashboard',
  },

  videoScript: {
    title: 'AI视频脚本生成器 - AI效率助手',
    description:
      'AI视频脚本生成器，支持抖音、快手、B站、YouTube、小红书、视频号等多平台脚本创作，智能生成专业视频脚本。',
    keywords:
      'AI视频脚本,短视频脚本,抖音脚本,小红书脚本,视频文案,脚本生成器,AI效率助手',
    canonicalUrl: '/workspace/video-script',
  },
} as const
