import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeo } from '../../components/SeoHead';
import { chatWithAiStream } from '../../services/aiChat';
import { useToast } from '../../components/ToastProvider';

// ============================================================
// Types
// ============================================================

type LifeMode = 'travel' | 'food' | 'health' | 'career' | 'emotional';

interface ModeConfig {
  key: LifeMode;
  label: string;
  icon: string;
  description: string;
  systemPrompt: string;
}

// ============================================================
// Mode Configurations
// ============================================================

const MODES: ModeConfig[] = [
  {
    key: 'travel',
    label: '旅行规划',
    icon: '✈️',
    description: '输入目的地和偏好，AI 生成详细行程',
    systemPrompt: `你是一位专业的旅行规划师。请根据用户提供的旅行信息，生成一份详细的旅行行程规划。

请严格按照以下 Markdown 格式输出：

## 🗓️ 第X天 - 日期

### 上午
- **09:00** 活动/景点名称
  - 详细描述和注意事项
  - 📍 地址信息

### 下午
- **14:00** 活动/景点名称
  - 详细描述和注意事项

### 晚上
- **18:30** 晚餐推荐
  - 🍽️ 餐厅名称：人均 ¥XX
  - 推荐菜品

### 住宿
- 🏨 酒店/民宿名称：¥XX/晚
  - 预订建议

---

### 💰 当日预算
| 项目 | 预估费用 |
|------|---------|
| 交通 | ¥XX |
| 餐饮 | ¥XX |
| 门票 | ¥XX |
| 住宿 | ¥XX |
| **合计** | **¥XX** |

## 📊 总预算汇总
| 天数 | 预算 |
|------|------|
| 第1天 | ¥XX |
| ... | ... |
| **总计** | **¥XX** |

## 💡 旅行贴士
- 贴士1
- 贴士2

请确保行程合理、景点之间交通便利、预算符合用户要求。`,
  },
  {
    key: 'food',
    label: '美食推荐',
    icon: '🍳',
    description: '输入食材和偏好，AI 推荐菜谱',
    systemPrompt: `你是一位专业的美食顾问和烹饪专家。请根据用户提供的食材、口味偏好和饮食限制，推荐合适的菜谱。

请严格按照以下 Markdown 格式输出：

## 🍽️ 推荐菜谱：菜名

### 📋 基本信息
- **难度**：⭐⭐⭐（1-5星）
- **烹饪时间**：XX分钟
- **份量**：X人份
- **菜系**：中式/西式/日式等

### 🥘 食材清单
- [ ] 主料1 - XX克
- [ ] 主料2 - XX克
- [ ] 辅料1 - 适量
- [ ] 调料1 - X勺

### 👨‍🍳 烹饪步骤

#### 第一步：准备工作
详细描述准备步骤...

#### 第二步：烹饪过程
详细描述烹饪步骤...

#### 第三步：调味出锅
详细描述调味和出锅步骤...

### 📊 营养信息（每份）
| 营养素 | 含量 |
|--------|------|
| 热量 | XXX 千卡 |
| 蛋白质 | XX 克 |
| 脂肪 | XX 克 |
| 碳水化合物 | XX 克 |

### 💡 烹饪小贴士
- 贴士1
- 贴士2

请确保食谱详细可操作，步骤清晰。`,
  },
  {
    key: 'health',
    label: '健康顾问',
    icon: '🏥',
    description: '描述健康状况，AI 提供健康建议',
    systemPrompt: `你是一位专业的健康顾问。请根据用户描述的症状和健康状况，提供健康建议和参考信息。

**重要声明**：你提供的信息仅供参考，不能替代专业医疗诊断和治疗。

请严格按照以下 Markdown 格式输出：

## ⚕️ 健康评估

### 📋 症状分析
根据你描述的症状，可能涉及以下方面：
- 分析1
- 分析2

### 🔍 可能的原因
1. **原因一**：详细说明
2. **原因二**：详细说明
3. **原因三**：详细说明

### 💊 建议措施

#### 即时缓解
- 措施1
- 措施2

#### 生活调整
- 调整1
- 调整2

#### 饮食建议
- 建议1
- 建议2

### ⚠️ 何时需要就医
如果出现以下情况，请及时就医：
- 情况1
- 情况2
- 情况3

### 📝 就医准备
就诊时建议告知医生：
- 信息1
- 信息2

---
> ⚠️ **免责声明**：以上内容仅供参考，不构成医疗建议。如有健康问题，请咨询专业医生或前往正规医疗机构就诊。

请确保建议温和、专业，不做出任何诊断性结论。`,
  },
  {
    key: 'career',
    label: '职业规划',
    icon: '💼',
    description: '输入职业目标，AI 制定发展计划',
    systemPrompt: `你是一位资深的职业规划师。请根据用户提供的当前职业状况和目标，制定一份详细的职业发展计划。

请严格按照以下 Markdown 格式输出：

## 🎯 职业发展路线图

### 📊 现状分析
- **当前角色**：XXX
- **核心优势**：
  - 优势1
  - 优势2
- **待提升领域**：
  - 领域1
  - 领域2

### 🗺️ 发展路径

#### 阶段一：基础夯实（0-3个月）
**目标**：明确方向，打牢基础
- [ ] 任务1
- [ ] 任务2
- [ ] 任务3
**推荐资源**：资源链接/书籍/课程

#### 阶段二：技能提升（3-6个月）
**目标**：核心技能突破
- [ ] 任务1
- [ ] 任务2
- [ ] 任务3
**推荐资源**：资源链接/书籍/课程

#### 阶段三：实践积累（6-12个月）
**目标**：项目经验积累
- [ ] 任务1
- [ ] 任务2
- [ ] 任务3
**推荐资源**：资源链接/书籍/课程

#### 阶段四：跃迁突破（12-24个月）
**目标**：实现职业跃迁
- [ ] 任务1
- [ ] 任务2
- [ ] 任务3

### 📚 技能差距分析
| 目标技能 | 当前水平 | 目标水平 | 优先级 | 学习建议 |
|----------|---------|---------|--------|---------|
| 技能1 | ⭐⭐ | ⭐⭐⭐⭐⭐ | 高 | 建议 |
| 技能2 | ⭐⭐⭐ | ⭐⭐⭐⭐ | 中 | 建议 |

### 📖 推荐资源
- 📚 书籍：《书名》- 推荐理由
- 🎓 课程：课程名称 - 推荐理由
- 🌐 网站：网站名称 - 用途说明

### 💡 职业建议
- 建议1
- 建议2

请确保计划具体、可执行，时间安排合理。`,
  },
  {
    key: 'emotional',
    label: '情感倾听',
    icon: '💚',
    description: '倾诉心事，AI 提供温暖陪伴',
    systemPrompt: `你是一位温暖、善解人意的情感倾听者。你的职责是：

1. **认真倾听**：仔细理解用户表达的情感和困扰
2. **共情回应**：用温暖、理解的语言回应，让用户感受到被关注
3. **情感支持**：提供情感上的支持和安慰，不急于给出建议
4. **引导思考**：适时引导用户从不同角度看待问题
5. **积极鼓励**：帮助用户发现自身的力量和积极面

**重要原则**：
- 不要评判用户的感受
- 不要急于给出解决方案
- 使用温暖、柔和的语言
- 适当使用 emoji 增加亲和力
- 如果用户表现出严重的心理困扰，建议寻求专业心理咨询师的帮助

请用自然的对话方式回应，不要使用格式化的列表或表格。让用户感受到真诚的关心和理解。`,
  },
];

// ============================================================
// Constants
// ============================================================

const TIPS = [
  '描述越详细，AI 给出的建议越精准',
  '旅行规划建议提前提供日期和预算范围',
  '健康建议仅供参考，如有不适请及时就医',
  '职业规划可以分阶段设定目标',
  '情感倾听模式下，尽情倾诉你的心事',
];

const RELATED = [
  { to: '/workspace/copywriting', label: '文案生成器' },
  { to: '/workspace/creative', label: '创意灵感' },
];

const TRAVEL_INTERESTS = ['自然风光', '历史文化', '美食探店', '户外运动', '艺术展览', '购物休闲', '摄影打卡', '亲子活动'];

// ============================================================
// Sub-components
// ============================================================

/** Travel form */
function TravelForm({ onSubmit, loading }: { onSubmit: (prompt: string) => void; loading: boolean }) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState('5000');
  const [style, setStyle] = useState('comfortable');
  const [interests, setInterests] = useState<string[]>([]);

  const toggleInterest = (item: string) => {
    setInterests((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]);
  };

  const handleSubmit = () => {
    if (!destination.trim()) return;
    const styleLabels: Record<string, string> = { budget: '经济', comfortable: '舒适', luxury: '豪华' };
    const prompt = `请为我规划一次旅行：
目的地：${destination}
出发日期：${startDate || '待定'}
返回日期：${endDate || '待定'}
预算：${budget}元/人
旅行风格：${styleLabels[style] || '舒适'}
兴趣偏好：${interests.length > 0 ? interests.join('、') : '不限'}
请生成详细的每日行程安排。`;
    onSubmit(prompt);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">目的地 *</label>
        <input type="text" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="例如：日本东京、云南大理、泰国清迈" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">出发日期</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">返回日期</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">预算（每人）: ¥{Number(budget).toLocaleString()}</label>
        <input type="range" min="1000" max="50000" step="500" value={budget} onChange={(e) => setBudget(e.target.value)} className="w-full accent-emerald-500" />
        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>¥1,000</span><span>¥50,000</span></div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">旅行风格</label>
        <div className="flex gap-2">
          {[
            { key: 'budget', label: '经济实惠', icon: '💰' },
            { key: 'comfortable', label: '舒适品质', icon: '🌟' },
            { key: 'luxury', label: '豪华享受', icon: '👑' },
          ].map((s) => (
            <button key={s.key} onClick={() => setStyle(s.key)} className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${style === s.key ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-300'}`}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">兴趣偏好</label>
        <div className="flex flex-wrap gap-2">
          {TRAVEL_INTERESTS.map((item) => (
            <button key={item} onClick={() => toggleInterest(item)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${interests.includes(item) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-300'}`}>
              {interests.includes(item) && '✓ '}{item}
            </button>
          ))}
        </div>
      </div>
      <button onClick={handleSubmit} disabled={loading || !destination.trim()} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
        {loading ? '生成中...' : '✈️ 生成旅行计划'}
      </button>
    </div>
  );
}

/** Food form */
function FoodForm({ onSubmit, loading }: { onSubmit: (prompt: string) => void; loading: boolean }) {
  const [ingredients, setIngredients] = useState('');
  const [cuisine, setCuisine] = useState('不限');
  const [dietary, setDietary] = useState<string[]>([]);
  const [cookTime, setCookTime] = useState('30');
  const [difficulty, setDifficulty] = useState('any');

  const toggleDietary = (item: string) => {
    setDietary((prev) => prev.includes(item) ? prev.filter((d) => d !== item) : [...prev, item]);
  };

  const handleSubmit = () => {
    if (!ingredients.trim()) return;
    const prompt = `请根据以下信息推荐菜谱：
可用食材：${ingredients}
菜系偏好：${cuisine}
饮食限制：${dietary.length > 0 ? dietary.join('、') : '无'}
烹饪时间：${cookTime}分钟以内
难度要求：${difficulty === 'any' ? '不限' : difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '有挑战'}
请推荐2-3道菜谱，包含详细步骤。`;
    onSubmit(prompt);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">可用食材 *</label>
        <textarea value={ingredients} onChange={(e) => setIngredients(e.target.value)} placeholder="例如：鸡胸肉、西兰花、胡萝卜、大蒜" rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">菜系偏好</label>
        <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none">
          {['不限', '中式', '西式', '日式', '韩式', '东南亚', '地中海', '素食'].map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">饮食限制</label>
        <div className="flex flex-wrap gap-2">
          {['素食', '无麸质', '低糖', '低脂', '高蛋白', '无乳制品'].map((item) => (
            <button key={item} onClick={() => toggleDietary(item)} className={`px-3 py-1.5 rounded-full text-sm border transition-all ${dietary.includes(item) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-300'}`}>
              {dietary.includes(item) && '✓ '}{item}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">烹饪时间: {cookTime}分钟</label>
          <input type="range" min="10" max="120" step="5" value={cookTime} onChange={(e) => setCookTime(e.target.value)} className="w-full accent-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">难度</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none">
            <option value="any">不限</option>
            <option value="easy">简单</option>
            <option value="medium">中等</option>
            <option value="hard">有挑战</option>
          </select>
        </div>
      </div>
      <button onClick={handleSubmit} disabled={loading || !ingredients.trim()} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
        {loading ? '生成中...' : '🍳 推荐菜谱'}
      </button>
    </div>
  );
}

/** Health form */
function HealthForm({ onSubmit, loading }: { onSubmit: (prompt: string) => void; loading: boolean }) {
  const [symptoms, setSymptoms] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('未指定');
  const [duration, setDuration] = useState('不确定');
  const [severity, setSeverity] = useState('moderate');

  const handleSubmit = () => {
    if (!symptoms.trim()) return;
    const severityLabels: Record<string, string> = { mild: '轻微', moderate: '中等', severe: '严重' };
    const prompt = `请帮我分析以下健康状况：
症状描述：${symptoms}
年龄：${age || '未提供'}
性别：${gender}
持续时间：${duration}
严重程度：${severityLabels[severity] || '中等'}
请提供健康建议和参考信息。`;
    onSubmit(prompt);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">症状描述 *</label>
        <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} placeholder="请详细描述你的症状、不适感或健康困扰..." rows={4} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">年龄</label>
          <input type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="例如：28" min="1" max="120" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">性别</label>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none">
            <option value="未指定">未指定</option>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">持续时间</label>
          <select value={duration} onChange={(e) => setDuration(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none">
            <option value="不确定">不确定</option>
            <option value="今天刚开始">今天刚开始</option>
            <option value="几天">几天</option>
            <option value="一周左右">一周左右</option>
            <option value="一个月以上">一个月以上</option>
            <option value="长期">长期（数月/数年）</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">严重程度</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none">
            <option value="mild">轻微</option>
            <option value="moderate">中等</option>
            <option value="severe">严重</option>
          </select>
        </div>
      </div>
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          ⚠️ <strong>免责声明</strong>：AI 提供的健康建议仅供参考，不能替代专业医疗诊断。如有严重不适，请及时就医。
        </p>
      </div>
      <button onClick={handleSubmit} disabled={loading || !symptoms.trim()} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
        {loading ? '分析中...' : '🏥 获取健康建议'}
      </button>
    </div>
  );
}

/** Career form */
function CareerForm({ onSubmit, loading }: { onSubmit: (prompt: string) => void; loading: boolean }) {
  const [currentRole, setCurrentRole] = useState('');
  const [experience, setExperience] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [skills, setSkills] = useState('');
  const [timeline, setTimeline] = useState('12');

  const handleSubmit = () => {
    if (!currentRole.trim() || !targetRole.trim()) return;
    const prompt = `请帮我制定职业发展规划：
当前职位：${currentRole}
工作经验：${experience || '未提供'}年
目标职位：${targetRole}
现有技能：${skills || '未提供'}
期望时间线：${timeline}个月
请制定详细的职业发展计划。`;
    onSubmit(prompt);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">当前职位 *</label>
          <input type="text" value={currentRole} onChange={(e) => setCurrentRole(e.target.value)} placeholder="例如：前端开发工程师" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">目标职位 *</label>
          <input type="text" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} placeholder="例如：技术总监" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">工作经验（年）</label>
          <input type="number" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="例如：3" min="0" max="40" className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">期望时间线: {timeline}个月</label>
          <input type="range" min="3" max="36" step="3" value={timeline} onChange={(e) => setTimeline(e.target.value)} className="w-full accent-emerald-500" />
          <div className="flex justify-between text-xs text-gray-400 mt-1"><span>3个月</span><span>36个月</span></div>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">现有技能</label>
        <textarea value={skills} onChange={(e) => setSkills(e.target.value)} placeholder="例如：React, TypeScript, Node.js, 项目管理..." rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none" />
      </div>
      <button onClick={handleSubmit} disabled={loading || !currentRole.trim() || !targetRole.trim()} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
        {loading ? '生成中...' : '💼 生成职业规划'}
      </button>
    </div>
  );
}

/** Emotional chat form */
function EmotionalForm({ onSubmit, loading }: { onSubmit: (prompt: string) => void; loading: boolean }) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!message.trim()) return;
    onSubmit(message.trim());
    setMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
        <p className="text-sm text-emerald-800 dark:text-emerald-200">
          💚 这是一个安全的空间，你可以自由地表达你的感受。AI 会认真倾听并给予温暖的回应。
        </p>
      </div>
      <div>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="说说你现在的感受..." rows={4} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none" />
      </div>
      <button onClick={handleSubmit} disabled={loading || !message.trim()} className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]">
        {loading ? '思考中...' : '💚 发送'}
      </button>
    </div>
  );
}

/** Simple markdown-ish renderer */
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
              <tr className="bg-emerald-50 dark:bg-emerald-900/20">
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

      // Table detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (trimmed.replace(/[|\-\s]/g, '') === '') return; // separator row
        inTable = true;
        tableRows.push(trimmed.split('|').slice(1, -1).map((c) => c.trim()));
        return;
      } else if (inTable) {
        flushTable();
      }

      // Headings
      if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={idx} className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">{trimmed.slice(3)}</h2>);
      } else if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={idx} className="text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2">{trimmed.slice(4)}</h3>);
      } else if (trimmed.startsWith('#### ')) {
        elements.push(<h4 key={idx} className="text-base font-semibold text-gray-900 dark:text-white mt-3 mb-1">{trimmed.slice(5)}</h4>);
      }
      // Horizontal rule
      else if (trimmed === '---' || trimmed === '***') {
        elements.push(<hr key={idx} className="my-4 border-gray-200 dark:border-gray-700" />);
      }
      // Blockquote
      else if (trimmed.startsWith('> ')) {
        elements.push(
          <blockquote key={idx} className="my-3 pl-4 border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 rounded-r-lg py-2 pr-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">{trimmed.slice(2)}</p>
          </blockquote>
        );
      }
      // Checkbox
      else if (trimmed.startsWith('- [ ]') || trimmed.startsWith('- [x]')) {
        const checked = trimmed.startsWith('- [x]');
        const text = trimmed.slice(6);
        elements.push(
          <label key={idx} className="flex items-center gap-2 my-1 cursor-pointer">
            <input type="checkbox" defaultChecked={checked} className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500" readOnly />
            <span className="text-sm text-gray-700 dark:text-gray-300">{text}</span>
          </label>
        );
      }
      // List item
      else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <li key={idx} className="ml-4 text-sm text-gray-700 dark:text-gray-300 list-disc my-1">{trimmed.slice(2)}</li>
        );
      }
      // Numbered list
      else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <li key={idx} className="ml-4 text-sm text-gray-700 dark:text-gray-300 list-decimal my-1">{trimmed.replace(/^\d+\.\s/, '')}</li>
        );
      }
      // Empty line
      else if (trimmed === '') {
        elements.push(<div key={idx} className="h-2" />);
      }
      // Normal paragraph
      else {
        // Bold text handling
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

export default function LifeAssistantTool() {
  useSeo({
    title: 'AI生活助手 - AI效率助手',
    description: 'AI生活助手提供旅行规划、美食推荐、健康顾问、职业规划、情感倾听等智能生活服务，让AI成为你的全方位生活助手。',
    keywords: 'AI生活助手,旅行规划,美食推荐,健康顾问,职业规划,情感倾听,AI助手',
    canonicalUrl: '/workspace/life-assistant',
  });

  const { toast } = useToast();

  const [activeMode, setActiveMode] = useState<LifeMode>('travel');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const abortRef = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const currentMode = MODES.find((m) => m.key === activeMode)!;

  const handleGenerate = useCallback(async (userMessage: string) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setResult('');

    const messages = [
      ...chatHistory,
      { role: 'user' as const, content: userMessage },
    ];

    try {
      const response = await chatWithAiStream(
        {
          messages,
          systemPrompt: currentMode.systemPrompt,
          temperature: activeMode === 'emotional' ? 0.8 : 0.7,
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

      setChatHistory((prev) => [
        ...prev,
        { role: 'user', content: userMessage },
        { role: 'assistant', content: fullContent },
      ]);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
      } else {
        toast('生成失败，请检查网络连接', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [chatHistory, currentMode.systemPrompt, activeMode, toast]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  const handleReset = useCallback(() => {
    abortRef.current?.abort();
    setResult('');
    setChatHistory([]);
    setLoading(false);
  }, []);

  // Auto scroll result
  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result]);

  // Reset chat when mode changes
  useEffect(() => {
    handleReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-emerald-100/60 via-emerald-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-emerald-600 transition-colors">工具</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">生活助手</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent">
              AI生活助手
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            旅行规划、美食推荐、健康顾问、职业规划、情感倾听 -- 你的全方位 AI 生活助手
          </p>
        </div>
      </section>

      {/* Mode Tabs */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Pill Tabs */}
          <div className="flex flex-wrap gap-2 mb-8">
            {MODES.map((mode) => (
              <button
                key={mode.key}
                onClick={() => setActiveMode(mode.key)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                  activeMode === mode.key
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400'
                }`}
              >
                <span>{mode.icon}</span>
                <span>{mode.label}</span>
              </button>
            ))}
          </div>

          {/* Mode Description */}
          <motion.div
            key={activeMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Mode Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{currentMode.icon}</span>
                    <div>
                      <h2 className="text-lg font-bold text-gray-900 dark:text-white">{currentMode.label}</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{currentMode.description}</p>
                    </div>
                  </div>
                  {chatHistory.length > 0 && (
                    <button onClick={handleReset} className="text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                      </svg>
                      重置
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Input Form */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      输入信息
                    </h3>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeMode}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                      >
                        {activeMode === 'travel' && <TravelForm onSubmit={handleGenerate} loading={loading} />}
                        {activeMode === 'food' && <FoodForm onSubmit={handleGenerate} loading={loading} />}
                        {activeMode === 'health' && <HealthForm onSubmit={handleGenerate} loading={loading} />}
                        {activeMode === 'career' && <CareerForm onSubmit={handleGenerate} loading={loading} />}
                        {activeMode === 'emotional' && <EmotionalForm onSubmit={handleGenerate} loading={loading} />}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {/* Result Area */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                        </svg>
                        AI 结果
                      </h3>
                      {loading && (
                        <button onClick={handleStop} className="text-sm text-red-500 hover:text-red-600 font-medium transition-colors flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                          </svg>
                          停止
                        </button>
                      )}
                    </div>
                    <div
                      ref={resultRef}
                      className="min-h-[300px] max-h-[500px] overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 scrollbar-thin"
                    >
                      {result ? (
                        <div className="animate-fade-in">
                          <MarkdownContent content={result} />
                          {loading && (
                            <span className="inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-1 align-middle" />
                          )}
                        </div>
                      ) : loading ? (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-400 dark:text-gray-500">
                          <div className="relative">
                            <div className="w-12 h-12 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-500 rounded-full animate-spin" />
                          </div>
                          <p className="mt-4 text-sm">AI 正在思考中...</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-[250px] text-gray-400 dark:text-gray-500">
                          <span className="text-5xl mb-4">{currentMode.icon}</span>
                          <p className="text-sm">填写左侧信息，AI 将为你生成{currentMode.label}方案</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Chat History (for emotional mode) */}
                {activeMode === 'emotional' && chatHistory.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">对话记录</h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                      {chatHistory.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                            msg.role === 'user'
                              ? 'bg-emerald-600 text-white rounded-br-md'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-bl-md'
                          }`}>
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">💡 使用技巧</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {TIPS.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <span className="text-emerald-500 mt-0.5">✓</span>
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
            <Link key={item.to} to={item.to} className="px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all">
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
