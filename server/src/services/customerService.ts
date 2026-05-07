import { execSync } from 'child_process';
import { v4 as uuidv4 } from 'uuid';

// ==================== 白山智算 API 配置 ====================
const API_BASE_URL = process.env.BAISHAN_API_URL || 'https://api.edgefn.net/v1/chat/completions';
const API_KEY = process.env.BAISHAN_API_KEY || process.env.DEEPSEEK_API_KEY || '';
const MODEL = 'DeepSeek-V3.2';

// ==================== 类型定义 ====================
export interface CustomerServiceSession {
  sessionId: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  intent: string;
  createdAt: number;
  updatedAt: number;
}

interface KnowledgeBaseItem {
  question: string;
  answer: string;
}

// ==================== 内存存储 ====================
const sessions = new Map<string, CustomerServiceSession>();
let knowledgeBase: KnowledgeBaseItem[] = [];

// ==================== 默认知识库 ====================
knowledgeBase = [
  {
    question: '如何重置密码？',
    answer: '您可以在登录页面点击"忘记密码"链接，按照提示通过邮箱验证后重置密码。如果邮箱无法收到验证邮件，请检查垃圾邮件文件夹，或联系客服人工处理。',
  },
  {
    question: '如何升级套餐？',
    answer: '登录后进入"账户设置 > 订阅管理"，选择您需要的套餐进行升级。升级后立即生效，差价将按剩余天数折算。',
  },
  {
    question: '退款政策是什么？',
    answer: '购买后7天内可申请全额退款，7-30天内按使用天数折算退款。退款将在3-5个工作日内原路返回。请联系客服提交退款申请。',
  },
  {
    question: '如何联系人工客服？',
    answer: '您可以通过以下方式联系人工客服：1. 在线聊天（工作时间9:00-21:00）；2. 发送邮件至 support@example.com；3. 拨打客服热线 400-xxx-xxxx。',
  },
  {
    question: '支持哪些支付方式？',
    answer: '我们支持微信支付、支付宝、银联卡、信用卡（Visa/MasterCard）以及企业对公转账。',
  },
];

// ==================== 意图识别提示词 ====================
const INTENT_PROMPT = `你是一个专业的意图识别引擎。根据用户的最新消息，判断其意图类别。

可能的意图类别：
- greeting: 问候/打招呼
- complaint: 投诉/不满
- inquiry: 一般咨询/询问
- refund: 退款相关
- technical_support: 技术支持/故障排查
- account: 账户相关（登录、注册、密码等）
- billing: 账单/支付相关
- feedback: 意见反馈/建议
- farewell: 告别
- unknown: 无法识别

请严格按以下JSON格式回复，不要添加任何其他内容：
{"intent":"意图类别","confidence":0.95}

示例：
用户说"你好" -> {"intent":"greeting","confidence":0.99}
用户说"我要退款" -> {"intent":"refund","confidence":0.95}
用户说"系统打不开了" -> {"intent":"technical_support","confidence":0.90}`;

// ==================== 客服系统提示词 ====================
function buildSystemPrompt(): string {
  let prompt = `你是一个专业、友好、有同理心的AI客服助手。你的职责是：

1. **专业态度**：使用礼貌、专业的语言，避免过于随意或机械
2. **同理心**：对用户的问题表示理解和关心，特别是投诉类问题
3. **准确回答**：基于知识库提供准确的信息，如果知识库中没有相关内容，诚实说明并建议联系人工客服
4. **引导解决**：主动引导用户解决问题，提供清晰的步骤说明
5. **情绪管理**：面对不满的用户，先安抚情绪再解决问题

回复要求：
- 使用中文回复
- 回复简洁明了，避免过长的内容
- 如果用户的问题超出你的能力范围，建议转接人工客服
- 对于投诉，先表达歉意和理解，再提供解决方案`;

  if (knowledgeBase.length > 0) {
    prompt += `\n\n以下是你的知识库，请优先基于这些信息回答用户问题：\n`;
    for (const item of knowledgeBase) {
      prompt += `\nQ: ${item.question}\nA: ${item.answer}\n`;
    }
  }

  return prompt;
}

// ==================== API 调用 ====================
function callAPI(messages: Array<{ role: string; content: string }>): string {
  const requestBody: Record<string, unknown> = {
    model: MODEL,
    messages,
    stream: false,
    temperature: 0.7,
    max_tokens: 2048,
  };

  const bodyStr = JSON.stringify(requestBody);
  const escapedBody = bodyStr.replace(/'/g, "'\\''");

  const command = `curl -s --max-time 60 -X POST '${API_BASE_URL}' \
    -H 'Content-Type: application/json' \
    -H 'Authorization: Bearer ${API_KEY}' \
    -d '${escapedBody}'`;

  const responseData = execSync(command, {
    encoding: 'utf-8',
    timeout: 65000,
    maxBuffer: 10 * 1024 * 1024,
  });

  const parsed = JSON.parse(responseData);
  if (parsed.error) {
    throw new Error(`API 错误: ${parsed.error.message || JSON.stringify(parsed.error)}`);
  }

  return parsed.choices[0]?.message?.content || '';
}

// ==================== 公共方法 ====================

/**
 * 创建新的客服会话
 */
export function createSession(): { sessionId: string } {
  const sessionId = uuidv4();
  const session: CustomerServiceSession = {
    sessionId,
    messages: [],
    intent: 'unknown',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sessions.set(sessionId, session);
  return { sessionId };
}

/**
 * 获取会话信息
 */
export function getSession(sessionId: string): CustomerServiceSession | null {
  return sessions.get(sessionId) || null;
}

/**
 * 删除会话
 */
export function deleteSession(sessionId: string): boolean {
  return sessions.delete(sessionId);
}

/**
 * 设置知识库
 */
export function setKnowledgeBase(items: Array<{ question: string; answer: string }>): void {
  knowledgeBase = items.map((item) => ({
    question: item.question,
    answer: item.answer,
  }));
}

/**
 * 获取知识库
 */
export function getKnowledgeBase(): Array<{ question: string; answer: string }> {
  return [...knowledgeBase];
}

/**
 * 客服对话 - 核心方法
 * 1. 识别用户意图
 * 2. 基于上下文生成回复
 */
export async function chat(
  sessionId: string,
  userMessage: string,
): Promise<{ reply: string; intent: string; confidence: number }> {
  // 获取或创建会话
  let session = sessions.get(sessionId);
  if (!session) {
    session = {
      sessionId,
      messages: [],
      intent: 'unknown',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    sessions.set(sessionId, session);
  }

  // 添加用户消息到会话
  session.messages.push({ role: 'user', content: userMessage });
  session.updatedAt = Date.now();

  // 1. 意图识别
  let intent = 'unknown';
  let confidence = 0.5;

  try {
    const intentMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: INTENT_PROMPT },
      { role: 'user', content: userMessage },
    ];
    const intentResult = callAPI(intentMessages);

    // 解析意图识别结果
    const cleanedResult = intentResult.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const intentMatch = cleanedResult.match(/\{[\s\S]*\}/);
    if (intentMatch) {
      const intentData = JSON.parse(intentMatch[0]);
      intent = intentData.intent || 'unknown';
      confidence = typeof intentData.confidence === 'number' ? intentData.confidence : 0.5;
    }
  } catch (error) {
    console.error('[CustomerService] 意图识别失败:', error);
    // 意图识别失败不影响主流程，使用默认值
  }

  session.intent = intent;

  // 2. 生成客服回复
  const systemPrompt = buildSystemPrompt();
  const chatMessages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // 保留最近10轮对话作为上下文
  const recentMessages = session.messages.slice(-20);
  for (const msg of recentMessages) {
    chatMessages.push({ role: msg.role, content: msg.content });
  }

  let reply = '';
  try {
    reply = callAPI(chatMessages);
  } catch (error) {
    console.error('[CustomerService] 生成回复失败:', error);
    reply = '抱歉，我暂时无法处理您的请求，请稍后再试或联系人工客服。';
  }

  // 添加助手回复到会话
  session.messages.push({ role: 'assistant', content: reply });
  session.updatedAt = Date.now();

  return { reply, intent, confidence };
}

/**
 * 获取服务配置信息
 */
export function getServiceConfig(): Record<string, unknown> {
  return {
    name: 'AI 智能客服',
    version: '1.0.0',
    model: MODEL,
    features: [
      '多轮对话',
      '意图识别',
      '知识库管理',
      '情感分析',
      '会话管理',
    ],
    supportedIntents: [
      'greeting',
      'complaint',
      'inquiry',
      'refund',
      'technical_support',
      'account',
      'billing',
      'feedback',
      'farewell',
    ],
    knowledgeBaseSize: knowledgeBase.length,
    activeSessions: sessions.size,
  };
}
