export interface Template {
  id: string;
  name: string;
  description: string;
  category: 'marketing' | 'social' | 'ecommerce' | 'office';
  icon: string;
  systemPrompt: string;
  fields: {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select';
    placeholder?: string;
    options?: { label: string; value: string }[];
  }[];
}

export const templates: Template[] = [
  // ─── 营销文案 (5) ─────────────────────────────────────────────────────────
  {
    id: 'product-selling-points',
    name: '产品卖点提炼',
    description: '从产品信息中提炼核心卖点，转化为消费者语言',
    category: 'marketing',
    icon: '💡',
    systemPrompt:
      '你是一个资深的营销策划专家。请根据用户提供的商品信息，提炼出最具吸引力的核心卖点。输出要求：## 🔥 核心卖点（5-7个，每个卖点一句话概括，突出差异化优势）\n## 💬 卖点文案（将每个卖点转化为消费者语言，带场景化描述）\n## 🎯 目标人群痛点匹配（列出3-5个目标人群痛点，说明产品如何解决）\n## 📊 竞争优势总结（从功能、体验、价格、服务四个维度总结）\n请用Markdown格式输出，内容具体有说服力。',
    fields: [
      { name: 'product', label: '商品名称', type: 'text', placeholder: '例如：智能空气净化器' },
      { name: 'features', label: '产品功能/特点', type: 'textarea', placeholder: '列出产品的主要功能和特点...' },
      { name: 'audience', label: '目标人群', type: 'text', placeholder: '例如：有宝宝的家庭' },
      { name: 'competitor', label: '竞品对比（可选）', type: 'textarea', placeholder: '与竞品相比的优势...' },
    ],
  },
  {
    id: 'slogan-generator',
    name: '广告语生成',
    description: '生成多种风格的广告语和品牌 Slogan',
    category: 'marketing',
    icon: '📢',
    systemPrompt:
      '你是一个顶尖的广告文案大师。请根据用户提供的品牌/商品信息，生成多种风格的广告语。输出要求：## 🏆 品牌Slogan（5条，简短有力，8字以内）\n## 🔥 产品广告语（10条，涵盖不同风格：情感型、功能型、场景型、悬念型、对比型）\n## 📱 短视频标题文案（5条，适合抖音/快手等平台，带话题标签）\n## 🖼️ 海报主标题（5条，适合不同尺寸的海报使用）\n请用Markdown格式输出，文案朗朗上口、过目不忘。',
    fields: [
      { name: 'brand', label: '品牌/商品名称', type: 'text', placeholder: '例如：元气森林' },
      { name: 'feature', label: '核心卖点', type: 'text', placeholder: '例如：0糖0脂0卡' },
      { name: 'style', label: '品牌调性', type: 'select', options: [{ label: '年轻活力', value: '年轻活力' }, { label: '高端奢华', value: '高端奢华' }, { label: '温暖亲切', value: '温暖亲切' }, { label: '专业权威', value: '专业权威' }, { label: '简洁直接', value: '简洁直接' }] },
      { name: 'scene', label: '使用场景（可选）', type: 'text', placeholder: '例如：运动后、下午茶' },
    ],
  },
  {
    id: 'email-marketing',
    name: '邮件营销文案',
    description: '生成高打开率、高转化率的营销邮件',
    category: 'marketing',
    icon: '📧',
    systemPrompt:
      '你是一个邮件营销专家。请根据用户提供的信息，生成完整的邮件营销文案。输出要求：## 📧 邮件标题（5个版本，包含不同策略：紧迫感、好奇心、利益驱动、个性化、提问式）\n## ✉️ 邮件正文（完整的HTML友好文案，包含称呼、开头引子、核心内容、行动号召、签名）\n## 🎯 A/B测试建议（针对标题和CTA的测试方案）\n## 📊 发送时机建议（最佳发送时间和频率）\n请用Markdown格式输出，文案专业且有转化力。',
    fields: [
      { name: 'brand', label: '品牌名称', type: 'text', placeholder: '例如：网易严选' },
      { name: 'product', label: '推广产品/活动', type: 'text', placeholder: '例如：春季新品上市' },
      { name: 'offer', label: '优惠/利益点', type: 'text', placeholder: '例如：满199减50' },
      { name: 'audience', label: '目标用户', type: 'text', placeholder: '例如：老客户复购' },
    ],
  },
  {
    id: 'brand-story',
    name: '品牌故事',
    description: '撰写打动人心的品牌故事和品牌介绍',
    category: 'marketing',
    icon: '📖',
    systemPrompt:
      '你是一个品牌策划专家和资深文案。请根据用户提供的品牌信息，撰写打动人心的品牌故事。输出要求：## 🌟 品牌故事（800-1000字，包含品牌起源、创始初心、发展历程、品牌理念）\n## 💎 品牌宣言（200字以内的品牌宣言，适合官网和宣传册）\n## 🏷️ 品牌一句话介绍（5个版本，适合不同场景使用）\n## 📝 品牌简介（300字版本，适合社交媒体和合作介绍）\n请用Markdown格式输出，故事真实动人，有情感共鸣。',
    fields: [
      { name: 'brand', label: '品牌名称', type: 'text', placeholder: '例如：三顿半' },
      { name: 'industry', label: '所属行业', type: 'text', placeholder: '例如：精品咖啡' },
      { name: 'origin', label: '品牌起源/初心', type: 'textarea', placeholder: '讲述品牌创立的故事和初衷...' },
      { name: 'values', label: '品牌价值观/理念', type: 'textarea', placeholder: '品牌坚持的核心理念...' },
    ],
  },
  {
    id: 'promo-copy',
    name: '促销活动文案',
    description: '生成各类促销活动的完整文案方案',
    category: 'marketing',
    icon: '🎉',
    systemPrompt:
      '你是一个电商营销策划专家。请根据用户提供的促销活动信息，生成完整的活动文案方案。输出要求：## 🎊 活动主题（5个备选主题，包含主标题和副标题）\n## 📢 活动预热文案（朋友圈/社群预热文案，3个版本）\n## 🏪 活动详情页文案（完整的活动规则、优惠说明、倒计时引导）\n## 💬 客服话术（活动咨询常见问题及标准回复）\n## 📊 活动节奏建议（预热期、爆发期、返场期的文案节奏安排）\n请用Markdown格式输出，文案有紧迫感和转化力。',
    fields: [
      { name: 'brand', label: '品牌名称', type: 'text', placeholder: '例如：完美日记' },
      { name: 'activity', label: '活动类型', type: 'select', options: [{ label: '双十一/618大促', value: '双十一/618大促' }, { label: '新品上市', value: '新品上市' }, { label: '周年庆', value: '周年庆' }, { label: '节日促销', value: '节日促销' }, { label: '清仓特卖', value: '清仓特卖' }] },
      { name: 'offer', label: '优惠力度', type: 'text', placeholder: '例如：全场5折起，满300减50' },
      { name: 'product', label: '主推产品', type: 'textarea', placeholder: '列出活动主推的产品...' },
    ],
  },

  // ─── 社交媒体 (5) ─────────────────────────────────────────────────────────
  {
    id: 'xiaohongshu-seeding',
    name: '小红书种草文',
    description: '生成小红书风格的种草笔记，带标题和标签',
    category: 'social',
    icon: '📕',
    systemPrompt:
      '你是一个小红书爆款笔记创作者。请根据用户提供的商品信息，生成小红书风格的种草笔记。输出要求：## 📝 笔记标题（8个版本，包含数字型、疑问型、对比型、攻略型等风格，带emoji）\n## ✨ 正文内容（500-800字的小红书风格笔记，口语化、真实感强、带emoji和分段，包含使用体验、效果对比、推荐理由）\n## #️⃣ 推荐话题标签（10-15个相关标签，包含热门标签和精准标签）\n## 📸 配图建议（6-9张图的拍摄建议，包含封面图、使用图、对比图等）\n请用Markdown格式输出，笔记真实自然，有种草力。',
    fields: [
      { name: 'product', label: '商品名称', type: 'text', placeholder: '例如：SK-II神仙水' },
      { name: 'category', label: '品类', type: 'text', placeholder: '例如：护肤精华' },
      { name: 'experience', label: '使用体验/效果', type: 'textarea', placeholder: '描述使用后的感受和效果...' },
      { name: 'audience', label: '适合人群', type: 'text', placeholder: '例如：油皮、混油皮' },
    ],
  },
  {
    id: 'wechat-moments',
    name: '朋友圈文案',
    description: '生成适合微信朋友圈的短文案，多种风格',
    category: 'social',
    icon: '💬',
    systemPrompt:
      '你是一个社交媒体文案专家。请根据用户提供的信息，生成适合微信朋友圈的文案。输出要求：## 💬 日常分享风（3条，自然不做作，像朋友推荐）\n## 🔥 种草安利风（3条，带使用感受，有说服力）\n## 🎊 活动促销风（3条，带紧迫感，促转化）\n## 🌟 高端品质风（3条，适合奢侈品/高端品牌）\n## 😄 幽默搞笑风（3条，轻松有趣，易传播）\n每条文案控制在100字以内，可配emoji。请用Markdown格式输出。',
    fields: [
      { name: 'product', label: '商品/品牌名称', type: 'text', placeholder: '例如：戴森吹风机' },
      { name: 'feature', label: '核心卖点', type: 'text', placeholder: '例如：3分钟速干，不伤发' },
      { name: 'purpose', label: '发文目的', type: 'select', options: [{ label: '日常种草', value: '日常种草' }, { label: '促销活动', value: '促销活动' }, { label: '新品推荐', value: '新品推荐' }, { label: '品牌宣传', value: '品牌宣传' }] },
      { name: 'tone', label: '文案风格', type: 'select', options: [{ label: '自然真实', value: '自然真实' }, { label: '专业权威', value: '专业权威' }, { label: '活泼有趣', value: '活泼有趣' }, { label: '高端优雅', value: '高端优雅' }] },
    ],
  },
  {
    id: 'weibo-topic',
    name: '微博话题文案',
    description: '生成微博话题营销文案，带话题标签和互动引导',
    category: 'social',
    icon: '🔥',
    systemPrompt:
      '你是一个微博运营专家。请根据用户提供的信息，生成微博话题营销文案。输出要求：## #️⃣ 话题标签建议（5-8个话题标签，包含主话题和子话题）\n## 📝 微博正文（3个版本：资讯型、互动型、故事型，各200字以内，带emoji）\n## 🔄 评论区引导（5条预设评论，引导用户互动）\n## 📊 互动策略（抽奖、投票、话题讨论等互动方式建议）\n## ⏰ 发布时间建议（最佳发布时间段和频率）\n请用Markdown格式输出，文案有话题性和传播力。',
    fields: [
      { name: 'brand', label: '品牌名称', type: 'text', placeholder: '例如：小米' },
      { name: 'topic', label: '话题/事件', type: 'text', placeholder: '例如：新品发布会' },
      { name: 'content', label: '核心信息', type: 'textarea', placeholder: '需要传达的核心信息...' },
      { name: 'goal', label: '营销目标', type: 'select', options: [{ label: '品牌曝光', value: '品牌曝光' }, { label: '产品种草', value: '产品种草' }, { label: '活动促销', value: '活动促销' }, { label: '用户互动', value: '用户互动' }] },
    ],
  },
  {
    id: 'douyin-video-script',
    name: '抖音视频文案',
    description: '生成抖音短视频脚本和口播文案',
    category: 'social',
    icon: '🎬',
    systemPrompt:
      '你是一个短视频内容策划专家。请根据用户提供的信息，生成抖音短视频脚本。输出要求：## 🎬 视频标题（5个版本，包含钩子型、悬念型、对比型）\n## 📋 完整脚本（包含：开头3秒钩子、正文内容、结尾CTA，标注画面建议和字幕）\n## 🎵 BGM和音效建议（推荐适合的背景音乐风格）\n## 📝 视频描述文案（带话题标签，100字以内）\n## 💡 拍摄建议（场景、道具、拍摄角度、剪辑节奏建议）\n视频时长控制在30-60秒。请用Markdown格式输出。',
    fields: [
      { name: 'product', label: '商品/品牌', type: 'text', placeholder: '例如：瑞幸咖啡' },
      { name: 'theme', label: '视频主题', type: 'text', placeholder: '例如：新品测评' },
      { name: 'sellingPoint', label: '核心卖点', type: 'textarea', placeholder: '需要在视频中展示的卖点...' },
      { name: 'duration', label: '视频时长', type: 'select', options: [{ label: '15秒以内', value: '15秒以内' }, { label: '15-30秒', value: '15-30秒' }, { label: '30-60秒', value: '30-60秒' }, { label: '1-3分钟', value: '1-3分钟' }] },
    ],
  },
  {
    id: 'wechat-article-outline',
    name: '公众号文章大纲',
    description: '生成微信公众号文章大纲和内容框架',
    category: 'social',
    icon: '📝',
    systemPrompt:
      '你是一个公众号内容策划专家。请根据用户提供的信息，生成公众号文章大纲。输出要求：## 📌 文章标题（8个版本，包含不同风格：数字型、故事型、观点型、盘点型）\n## 📋 文章大纲（详细的大纲结构，包含每个章节的标题、核心观点、字数建议）\n## 🎯 开头引子（3个版本的开头，分别用故事、数据、提问引入）\n## 💡 金句素材（5-8条可在文章中使用的金句）\n## 📊 结尾CTA（3个版本的结尾，引导点赞、转发、评论）\n请用Markdown格式输出，大纲逻辑清晰，有阅读价值。',
    fields: [
      { name: 'topic', label: '文章主题', type: 'text', placeholder: '例如：如何挑选适合自己的护肤品' },
      { name: 'keyword', label: '核心关键词', type: 'text', placeholder: '例如：护肤、成分、敏感肌' },
      { name: 'audience', label: '目标读者', type: 'text', placeholder: '例如：护肤新手、20-30岁女性' },
      { name: 'length', label: '文章篇幅', type: 'select', options: [{ label: '1000-1500字', value: '1000-1500字' }, { label: '1500-2500字', value: '1500-2500字' }, { label: '2500-4000字', value: '2500-4000字' }, { label: '4000字以上', value: '4000字以上' }] },
    ],
  },

  // ─── 电商运营 (5) ─────────────────────────────────────────────────────────
  {
    id: 'product-title-optimization',
    name: '商品标题优化',
    description: '优化电商商品标题，提升搜索排名和点击率',
    category: 'ecommerce',
    icon: '🏷️',
    systemPrompt:
      '你是一个电商SEO专家。请根据用户提供的商品信息，优化商品标题。输出要求：## 🏆 优化标题（5个版本，每个30字以内，包含核心关键词和长尾词）\n## 🔍 关键词分析（核心关键词、流量词、长尾词建议，各5-10个）\n## 📊 标题评分（对原标题进行评分，指出不足之处）\n## 💡 优化说明（每个标题的优化思路和关键词布局说明）\n## 📈 搜索排名建议（提升搜索排名的额外建议）\n请用Markdown格式输出，标题兼顾搜索权重和用户点击。',
    fields: [
      { name: 'title', label: '当前商品标题', type: 'text', placeholder: '例如：新款夏季连衣裙女2026' },
      { name: 'product', label: '商品名称', type: 'text', placeholder: '例如：碎花雪纺连衣裙' },
      { name: 'platform', label: '销售平台', type: 'select', options: [{ label: '淘宝/天猫', value: '淘宝/天猫' }, { label: '京东', value: '京东' }, { label: '拼多多', value: '拼多多' }, { label: '抖音电商', value: '抖音电商' }] },
      { name: 'keywords', label: '已有关键词（可选）', type: 'text', placeholder: '用逗号分隔...' },
    ],
  },
  {
    id: 'detail-page-copy',
    name: '详情页文案',
    description: '生成电商详情页的完整文案，提升转化率',
    category: 'ecommerce',
    icon: '📄',
    systemPrompt:
      '你是一个电商详情页文案专家。请根据用户提供的商品信息，生成详情页文案。输出要求：## 🎯 首屏文案（主标题+副标题+核心卖点，3秒抓住眼球）\n## 💡 卖点模块（5-7个卖点，每个卖点配图标建议和文案）\n## 📖 商品故事（200-300字的品牌/产品故事，建立信任）\n## 📊 参数对比（与竞品的对比表格文案）\n## 🛡️ 信任背书（售后保障、品质认证、用户好评等信任元素文案）\n## 📦 规格选择引导（帮助用户选择合适规格的引导文案）\n请用Markdown格式输出，文案有转化力。',
    fields: [
      { name: 'product', label: '商品名称', type: 'text', placeholder: '例如：Apple Watch Ultra 3' },
      { name: 'features', label: '核心卖点', type: 'textarea', placeholder: '列出商品的核心卖点和功能...' },
      { name: 'audience', label: '目标用户', type: 'text', placeholder: '例如：运动爱好者' },
      { name: 'price', label: '价格区间', type: 'text', placeholder: '例如：5999-7999元' },
    ],
  },
  {
    id: 'customer-service-script',
    name: '客服话术',
    description: '生成电商客服常用话术，提升服务效率',
    category: 'ecommerce',
    icon: '🎧',
    systemPrompt:
      '你是一个电商客服培训专家。请根据用户提供的商品信息，生成完整的客服话术库。输出要求：## 👋 售前咨询话术（包含：商品推荐、尺码/规格建议、优惠说明、物流时效，各3-5条）\n## 🚚 售中跟进话术（包含：订单确认、发货通知、物流查询，各2-3条）\n## 🔧 售后处理话术（包含：退换货引导、投诉处理、差评挽回，各3-5条）\n## ⭐ 好评引导话术（3-5条引导好评的话术）\n## 🚫 高频问题FAQ（10个常见问题及标准回复）\n请用Markdown格式输出，话术专业、温暖、有同理心。',
    fields: [
      { name: 'product', label: '商品/品牌名称', type: 'text', placeholder: '例如：优衣库' },
      { name: 'category', label: '商品品类', type: 'select', options: [{ label: '服装鞋帽', value: '服装鞋帽' }, { label: '美妆护肤', value: '美妆护肤' }, { label: '食品饮料', value: '食品饮料' }, { label: '数码家电', value: '数码家电' }, { label: '家居生活', value: '家居生活' }] },
      { name: 'features', label: '商品特点', type: 'textarea', placeholder: '商品的主要特点和卖点...' },
      { name: 'policy', label: '售后政策（可选）', type: 'textarea', placeholder: '退换货政策、保修政策等...' },
    ],
  },
  {
    id: 'negative-review-reply',
    name: '差评回复',
    description: '生成专业得体的差评回复，挽回用户信任',
    category: 'ecommerce',
    icon: '😤',
    systemPrompt:
      '你是一个电商口碑管理专家。请根据用户提供的差评信息，生成专业得体的回复。输出要求：## 📝 回复方案（3个版本的回复，分别：真诚道歉型、解决方案型、关怀补偿型）\n## 🔍 问题分析（分析差评的根本原因和用户真实诉求）\n## 🛡️ 改进建议（针对差评反映的问题，提出3-5条改进建议）\n## 📊 同类差评话术库（针对该类问题的通用回复模板，5条）\n## ⚠️ 注意事项（回复差评的注意事项和禁忌）\n请用Markdown格式输出，回复真诚、专业、有温度。',
    fields: [
      { name: 'review', label: '差评内容', type: 'textarea', placeholder: '粘贴用户的差评内容...' },
      { name: 'product', label: '商品名称', type: 'text', placeholder: '例如：无线蓝牙耳机' },
      { name: 'rating', label: '差评类型', type: 'select', options: [{ label: '质量问题', value: '质量问题' }, { label: '物流问题', value: '物流问题' }, { label: '服务态度', value: '服务态度' }, { label: '描述不符', value: '描述不符' }, { label: '其他', value: '其他' }] },
      { name: 'solution', label: '可提供的解决方案（可选）', type: 'text', placeholder: '例如：免费换新、补偿优惠券' },
    ],
  },
  {
    id: 'positive-review-guide',
    name: '好评引导',
    description: '生成好评引导策略和话术，提升店铺评分',
    category: 'ecommerce',
    icon: '⭐',
    systemPrompt:
      '你是一个电商运营专家。请根据用户提供的商品信息，生成好评引导方案。输出要求：## 💌 好评引导话术（5条，包含包裹卡片文案、客服引导、短信/微信引导）\n## 🎁 好评激励方案（3个版本的激励方案，合规且有吸引力）\n## 📸 晒图/视频引导（引导用户晒图或拍视频的话术，3条）\n## 📋 好评模板（提供5条不同角度的好评模板供用户参考）\n## 📊 评分提升策略（5条提升店铺整体评分的运营策略）\n请用Markdown格式输出，方案合规、自然、有效。',
    fields: [
      { name: 'product', label: '商品名称', type: 'text', placeholder: '例如：戴森吸尘器V15' },
      { name: 'feature', label: '核心卖点', type: 'text', placeholder: '例如：吸力强、续航长' },
      { name: 'platform', label: '销售平台', type: 'select', options: [{ label: '淘宝/天猫', value: '淘宝/天猫' }, { label: '京东', value: '京东' }, { label: '拼多多', value: '拼多多' }, { label: '抖音电商', value: '抖音电商' }] },
      { name: 'bonus', label: '可提供的激励（可选）', type: 'text', placeholder: '例如：返现2元、赠送配件' },
    ],
  },

  // ─── 办公效率 (5) ─────────────────────────────────────────────────────────
  {
    id: 'meeting-summary',
    name: '会议纪要总结',
    description: '将会议内容整理为结构化的会议纪要',
    category: 'office',
    icon: '📋',
    systemPrompt:
      '你是一个行政助理专家。请根据用户提供的会议信息，生成结构化的会议纪要。输出要求：## 📋 会议基本信息（会议主题、时间、参会人、主持人）\n## 📝 会议内容摘要（按议题分段总结，每段包含讨论要点和结论）\n## ✅ 行动项清单（任务、负责人、截止时间，表格形式）\n## 📌 待跟进事项（需要后续讨论或确认的问题）\n## 📅 下次会议安排（建议时间和议题）\n请用Markdown格式输出，纪要简洁准确、重点突出。',
    fields: [
      { name: 'topic', label: '会议主题', type: 'text', placeholder: '例如：Q2产品规划讨论会' },
      { name: 'content', label: '会议内容/笔记', type: 'textarea', placeholder: '粘贴会议记录或笔记...' },
      { name: 'attendees', label: '参会人员', type: 'text', placeholder: '例如：张三、李四、王五' },
      { name: 'date', label: '会议日期', type: 'text', placeholder: '例如：2026年4月13日' },
    ],
  },
  {
    id: 'weekly-report',
    name: '周报生成',
    description: '根据工作内容自动生成结构化周报',
    category: 'office',
    icon: '📊',
    systemPrompt:
      '你是一个职场效率专家。请根据用户提供的工作信息，生成结构化的周报。输出要求：## 📊 本周工作总结（按项目/模块分类，每项包含：工作内容、完成进度、成果数据）\n## 🎯 关键成果（3-5个本周的关键成果，用数据说话）\n## ⚠️ 问题与风险（遇到的问题、风险及应对措施）\n## 📅 下周工作计划（按优先级排列，包含具体目标和预期产出）\n## 💡 改进建议（1-2条工作流程改进建议）\n请用Markdown格式输出，周报专业、数据化、有亮点。',
    fields: [
      { name: 'work', label: '本周工作内容', type: 'textarea', placeholder: '列出本周完成的主要工作...' },
      { name: 'results', label: '工作成果/数据', type: 'textarea', placeholder: '例如：完成了3个页面开发，性能提升20%' },
      { name: 'department', label: '所属部门/岗位', type: 'text', placeholder: '例如：产品研发部-前端开发' },
      { name: 'nextWeek', label: '下周计划（可选）', type: 'textarea', placeholder: '下周计划要做的事情...' },
    ],
  },
  {
    id: 'project-proposal',
    name: '项目方案',
    description: '生成完整的项目方案和策划书框架',
    category: 'office',
    icon: '📁',
    systemPrompt:
      '你是一个项目管理专家。请根据用户提供的信息，生成完整的项目方案。输出要求：## 📋 项目概述（项目背景、目标、范围、预期收益）\n## 👥 项目团队（角色分工和职责说明）\n## 📅 项目计划（分阶段的时间表，包含里程碑和交付物）\n## 💰 预算估算（人力、物料、其他成本的估算）\n## ⚠️ 风险评估（潜在风险及应对策略）\n## 📊 成功指标（KPI和评估标准）\n请用Markdown格式输出，方案专业、可执行、有说服力。',
    fields: [
      { name: 'project', label: '项目名称', type: 'text', placeholder: '例如：企业官网改版项目' },
      { name: 'background', label: '项目背景', type: 'textarea', placeholder: '为什么要做这个项目...' },
      { name: 'goal', label: '项目目标', type: 'text', placeholder: '例如：3个月内完成官网改版，提升转化率30%' },
      { name: 'budget', label: '预算范围（可选）', type: 'text', placeholder: '例如：10-20万' },
    ],
  },
  {
    id: 'business-email',
    name: '商务邮件',
    description: '生成各类商务场景的专业邮件',
    category: 'office',
    icon: '✉️',
    systemPrompt:
      '你是一个商务沟通专家。请根据用户提供的信息，生成专业的商务邮件。输出要求：## 📧 邮件标题（3个版本，简洁专业）\n## ✉️ 邮件正文（完整的商务邮件，包含称呼、正文、结尾敬语）\n## 🔄 跟进邮件（如果未回复，1周后的跟进邮件）\n## 💡 邮件礼仪提示（发送此类邮件的注意事项）\n请用Markdown格式输出，邮件专业、得体、有礼貌。',
    fields: [
      { name: 'purpose', label: '邮件目的', type: 'select', options: [{ label: '商务合作', value: '商务合作' }, { label: '项目汇报', value: '项目汇报' }, { label: '客户跟进', value: '客户跟进' }, { label: '面试邀约', value: '面试邀约' }, { label: '感谢致歉', value: '感谢致歉' }] },
      { name: 'recipient', label: '收件人信息', type: 'text', placeholder: '例如：XX公司市场部王总' },
      { name: 'content', label: '核心内容', type: 'textarea', placeholder: '需要传达的核心信息...' },
      { name: 'tone', label: '语气风格', type: 'select', options: [{ label: '正式严谨', value: '正式严谨' }, { label: '友好亲切', value: '友好亲切' }, { label: '简洁高效', value: '简洁高效' }] },
    ],
  },
  {
    id: 'speech-script',
    name: '演讲稿',
    description: '生成各类场景的演讲稿和发言稿',
    category: 'office',
    icon: '🎤',
    systemPrompt:
      '你是一个演讲稿撰写专家。请根据用户提供的信息，生成完整的演讲稿。输出要求：## 🎤 演讲稿正文（完整的演讲稿，包含开场白、正文段落、结尾升华，标注停顿和语气提示）\n## ⏱️ 演讲时长估算（预计演讲时长和语速建议）\n## 🎯 核心金句（5-8条可在PPT中展示的金句）\n## 💡 演讲技巧建议（肢体语言、语调变化、互动技巧）\n## 📊 PPT大纲建议（建议的PPT页面结构和内容要点）\n请用Markdown格式输出，演讲稿有感染力、逻辑清晰、易于表达。',
    fields: [
      { name: 'topic', label: '演讲主题', type: 'text', placeholder: '例如：AI时代的营销变革' },
      { name: 'audience', label: '听众对象', type: 'text', placeholder: '例如：公司全体员工、行业峰会' },
      { name: 'duration', label: '演讲时长', type: 'select', options: [{ label: '3-5分钟', value: '3-5分钟' }, { label: '5-10分钟', value: '5-10分钟' }, { label: '10-20分钟', value: '10-20分钟' }, { label: '20分钟以上', value: '20分钟以上' }] },
      { name: 'keyPoint', label: '核心观点', type: 'textarea', placeholder: '需要在演讲中传达的核心观点...' },
    ],
  },
];

/** 分类元数据 */
export const categoryMeta: Record<Template['category'], { label: string; color: string }> = {
  marketing: { label: '营销文案', color: 'bg-purple-100 text-purple-700' },
  social: { label: '社交媒体', color: 'bg-pink-100 text-pink-700' },
  ecommerce: { label: '电商运营', color: 'bg-amber-100 text-amber-700' },
  office: { label: '办公效率', color: 'bg-blue-100 text-blue-700' },
};
