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
export function useSeo(options: SeoOptions): void {
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
} as const
