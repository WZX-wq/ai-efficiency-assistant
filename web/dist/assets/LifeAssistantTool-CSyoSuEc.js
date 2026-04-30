import{j as e,m as N,A as $}from"./vendor-motion-BCFRTMCL.js";import{a,L as S}from"./vendor-react-DEZBGjak.js";import{u as L}from"./SeoHead-DNgOazpb.js";import{c as I}from"./aiChat-rZQ7JYJC.js";import{a as W}from"./index-X0Me7pQZ.js";import"./api-BzEi16Tb.js";import"./vendor-zustand-B7_ng4WW.js";const C=[{key:"travel",label:"旅行规划",icon:"✈️",description:"输入目的地和偏好，AI 生成详细行程",systemPrompt:`你是一位专业的旅行规划师。请根据用户提供的旅行信息，生成一份详细的旅行行程规划。

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

请确保行程合理、景点之间交通便利、预算符合用户要求。`},{key:"food",label:"美食推荐",icon:"🍳",description:"输入食材和偏好，AI 推荐菜谱",systemPrompt:`你是一位专业的美食顾问和烹饪专家。请根据用户提供的食材、口味偏好和饮食限制，推荐合适的菜谱。

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

请确保食谱详细可操作，步骤清晰。`},{key:"health",label:"健康顾问",icon:"🏥",description:"描述健康状况，AI 提供健康建议",systemPrompt:`你是一位专业的健康顾问。请根据用户描述的症状和健康状况，提供健康建议和参考信息。

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

请确保建议温和、专业，不做出任何诊断性结论。`},{key:"career",label:"职业规划",icon:"💼",description:"输入职业目标，AI 制定发展计划",systemPrompt:`你是一位资深的职业规划师。请根据用户提供的当前职业状况和目标，制定一份详细的职业发展计划。

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

请确保计划具体、可执行，时间安排合理。`},{key:"emotional",label:"情感倾听",icon:"💚",description:"倾诉心事，AI 提供温暖陪伴",systemPrompt:`你是一位温暖、善解人意的情感倾听者。你的职责是：

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

请用自然的对话方式回应，不要使用格式化的列表或表格。让用户感受到真诚的关心和理解。`}],E=["描述越详细，AI 给出的建议越精准","旅行规划建议提前提供日期和预算范围","健康建议仅供参考，如有不适请及时就医","职业规划可以分阶段设定目标","情感倾听模式下，尽情倾诉你的心事"],M=[{to:"/workspace/copywriting",label:"文案生成器"},{to:"/workspace/creative",label:"创意灵感"}],R=["自然风光","历史文化","美食探店","户外运动","艺术展览","购物休闲","摄影打卡","亲子活动"];function T({onSubmit:p,loading:l}){const[c,m]=a.useState(""),[u,g]=a.useState(""),[d,y]=a.useState(""),[i,r]=a.useState("5000"),[o,h]=a.useState("comfortable"),[b,x]=a.useState([]),n=t=>{x(f=>f.includes(t)?f.filter(j=>j!==t):[...f,t])},s=()=>{if(!c.trim())return;const f=`请为我规划一次旅行：
目的地：${c}
出发日期：${u||"待定"}
返回日期：${d||"待定"}
预算：${i}元/人
旅行风格：${{budget:"经济",comfortable:"舒适",luxury:"豪华"}[o]||"舒适"}
兴趣偏好：${b.length>0?b.join("、"):"不限"}
请生成详细的每日行程安排。`;p(f)};return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"目的地 *"}),e.jsx("input",{type:"text",value:c,onChange:t=>m(t.target.value),placeholder:"例如：日本东京、云南大理、泰国清迈",className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"出发日期"}),e.jsx("input",{type:"date",value:u,onChange:t=>g(t.target.value),className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"返回日期"}),e.jsx("input",{type:"date",value:d,onChange:t=>y(t.target.value),className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"})]})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:["预算（每人）: ¥",Number(i).toLocaleString()]}),e.jsx("input",{type:"range",min:"1000",max:"50000",step:"500",value:i,onChange:t=>r(t.target.value),className:"w-full accent-emerald-500"}),e.jsxs("div",{className:"flex justify-between text-xs text-gray-400 mt-1",children:[e.jsx("span",{children:"¥1,000"}),e.jsx("span",{children:"¥50,000"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"旅行风格"}),e.jsx("div",{className:"flex gap-2",children:[{key:"budget",label:"经济实惠",icon:"💰"},{key:"comfortable",label:"舒适品质",icon:"🌟"},{key:"luxury",label:"豪华享受",icon:"👑"}].map(t=>e.jsxs("button",{onClick:()=>h(t.key),className:`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${o===t.key?"border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300":"border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-300"}`,children:[t.icon," ",t.label]},t.key))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"兴趣偏好"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:R.map(t=>e.jsxs("button",{onClick:()=>n(t),className:`px-3 py-1.5 rounded-full text-sm border transition-all ${b.includes(t)?"border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300":"border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-300"}`,children:[b.includes(t)&&"✓ ",t]},t))})]}),e.jsx("button",{onClick:s,disabled:l||!c.trim(),className:"w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]",children:l?"生成中...":"✈️ 生成旅行计划"})]})}function D({onSubmit:p,loading:l}){const[c,m]=a.useState(""),[u,g]=a.useState("不限"),[d,y]=a.useState([]),[i,r]=a.useState("30"),[o,h]=a.useState("any"),b=n=>{y(s=>s.includes(n)?s.filter(t=>t!==n):[...s,n])},x=()=>{if(!c.trim())return;const n=`请根据以下信息推荐菜谱：
可用食材：${c}
菜系偏好：${u}
饮食限制：${d.length>0?d.join("、"):"无"}
烹饪时间：${i}分钟以内
难度要求：${o==="any"?"不限":o==="easy"?"简单":o==="medium"?"中等":"有挑战"}
请推荐2-3道菜谱，包含详细步骤。`;p(n)};return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"可用食材 *"}),e.jsx("textarea",{value:c,onChange:n=>m(n.target.value),placeholder:"例如：鸡胸肉、西兰花、胡萝卜、大蒜",rows:3,className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"菜系偏好"}),e.jsx("select",{value:u,onChange:n=>g(n.target.value),className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none",children:["不限","中式","西式","日式","韩式","东南亚","地中海","素食"].map(n=>e.jsx("option",{value:n,children:n},n))})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"饮食限制"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:["素食","无麸质","低糖","低脂","高蛋白","无乳制品"].map(n=>e.jsxs("button",{onClick:()=>b(n),className:`px-3 py-1.5 rounded-full text-sm border transition-all ${d.includes(n)?"border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300":"border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-emerald-300"}`,children:[d.includes(n)&&"✓ ",n]},n))})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsxs("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:["烹饪时间: ",i,"分钟"]}),e.jsx("input",{type:"range",min:"10",max:"120",step:"5",value:i,onChange:n=>r(n.target.value),className:"w-full accent-emerald-500"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"难度"}),e.jsxs("select",{value:o,onChange:n=>h(n.target.value),className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none",children:[e.jsx("option",{value:"any",children:"不限"}),e.jsx("option",{value:"easy",children:"简单"}),e.jsx("option",{value:"medium",children:"中等"}),e.jsx("option",{value:"hard",children:"有挑战"})]})]})]}),e.jsx("button",{onClick:x,disabled:l||!c.trim(),className:"w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]",children:l?"生成中...":"🍳 推荐菜谱"})]})}function P({onSubmit:p,loading:l}){const[c,m]=a.useState(""),[u,g]=a.useState(""),[d,y]=a.useState("未指定"),[i,r]=a.useState("不确定"),[o,h]=a.useState("moderate"),b=()=>{if(!c.trim())return;const n=`请帮我分析以下健康状况：
症状描述：${c}
年龄：${u||"未提供"}
性别：${d}
持续时间：${i}
严重程度：${{mild:"轻微",moderate:"中等",severe:"严重"}[o]||"中等"}
请提供健康建议和参考信息。`;p(n)};return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"症状描述 *"}),e.jsx("textarea",{value:c,onChange:x=>m(x.target.value),placeholder:"请详细描述你的症状、不适感或健康困扰...",rows:4,className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"年龄"}),e.jsx("input",{type:"number",value:u,onChange:x=>g(x.target.value),placeholder:"例如：28",min:"1",max:"120",className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"性别"}),e.jsxs("select",{value:d,onChange:x=>y(x.target.value),className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none",children:[e.jsx("option",{value:"未指定",children:"未指定"}),e.jsx("option",{value:"男",children:"男"}),e.jsx("option",{value:"女",children:"女"})]})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"持续时间"}),e.jsxs("select",{value:i,onChange:x=>r(x.target.value),className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none",children:[e.jsx("option",{value:"不确定",children:"不确定"}),e.jsx("option",{value:"今天刚开始",children:"今天刚开始"}),e.jsx("option",{value:"几天",children:"几天"}),e.jsx("option",{value:"一周左右",children:"一周左右"}),e.jsx("option",{value:"一个月以上",children:"一个月以上"}),e.jsx("option",{value:"长期",children:"长期（数月/数年）"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"严重程度"}),e.jsxs("select",{value:o,onChange:x=>h(x.target.value),className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none",children:[e.jsx("option",{value:"mild",children:"轻微"}),e.jsx("option",{value:"moderate",children:"中等"}),e.jsx("option",{value:"severe",children:"严重"})]})]})]}),e.jsx("div",{className:"bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4",children:e.jsxs("p",{className:"text-sm text-amber-800 dark:text-amber-200",children:["⚠️ ",e.jsx("strong",{children:"免责声明"}),"：AI 提供的健康建议仅供参考，不能替代专业医疗诊断。如有严重不适，请及时就医。"]})}),e.jsx("button",{onClick:b,disabled:l||!c.trim(),className:"w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]",children:l?"分析中...":"🏥 获取健康建议"})]})}function z({onSubmit:p,loading:l}){const[c,m]=a.useState(""),[u,g]=a.useState(""),[d,y]=a.useState(""),[i,r]=a.useState(""),[o,h]=a.useState("12"),b=()=>{if(!c.trim()||!d.trim())return;const x=`请帮我制定职业发展规划：
当前职位：${c}
工作经验：${u||"未提供"}年
目标职位：${d}
现有技能：${i||"未提供"}
期望时间线：${o}个月
请制定详细的职业发展计划。`;p(x)};return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"当前职位 *"}),e.jsx("input",{type:"text",value:c,onChange:x=>m(x.target.value),placeholder:"例如：前端开发工程师",className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"目标职位 *"}),e.jsx("input",{type:"text",value:d,onChange:x=>y(x.target.value),placeholder:"例如：技术总监",className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"})]})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"工作经验（年）"}),e.jsx("input",{type:"number",value:u,onChange:x=>g(x.target.value),placeholder:"例如：3",min:"0",max:"40",className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"})]}),e.jsxs("div",{children:[e.jsxs("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:["期望时间线: ",o,"个月"]}),e.jsx("input",{type:"range",min:"3",max:"36",step:"3",value:o,onChange:x=>h(x.target.value),className:"w-full accent-emerald-500"}),e.jsxs("div",{className:"flex justify-between text-xs text-gray-400 mt-1",children:[e.jsx("span",{children:"3个月"}),e.jsx("span",{children:"36个月"})]})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",children:"现有技能"}),e.jsx("textarea",{value:i,onChange:x=>r(x.target.value),placeholder:"例如：React, TypeScript, Node.js, 项目管理...",rows:3,className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"})]}),e.jsx("button",{onClick:b,disabled:l||!c.trim()||!d.trim(),className:"w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]",children:l?"生成中...":"💼 生成职业规划"})]})}function B({onSubmit:p,loading:l}){const[c,m]=a.useState(""),u=()=>{c.trim()&&(p(c.trim()),m(""))},g=d=>{d.key==="Enter"&&!d.shiftKey&&(d.preventDefault(),u())};return e.jsxs("div",{className:"space-y-4",children:[e.jsx("div",{className:"bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4",children:e.jsx("p",{className:"text-sm text-emerald-800 dark:text-emerald-200",children:"💚 这是一个安全的空间，你可以自由地表达你的感受。AI 会认真倾听并给予温暖的回应。"})}),e.jsx("div",{children:e.jsx("textarea",{value:c,onChange:d=>m(d.target.value),onKeyDown:g,placeholder:"说说你现在的感受...",rows:4,className:"w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none resize-none"})}),e.jsx("button",{onClick:u,disabled:l||!c.trim(),className:"w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]",children:l?"思考中...":"💚 发送"})]})}function F({content:p}){const l=()=>{const c=p.split(`
`),m=[];let u=!1,g=[];const d=()=>{if(g.length===0)return;const y=g[0],i=g.slice(1);m.push(e.jsx("div",{className:"overflow-x-auto my-3",children:e.jsxs("table",{className:"w-full text-sm border-collapse",children:[e.jsx("thead",{children:e.jsx("tr",{className:"bg-emerald-50 dark:bg-emerald-900/20",children:y.map((r,o)=>e.jsx("th",{className:"px-4 py-2 text-left font-semibold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700",children:r.replace(/\*\*/g,"")},o))})}),e.jsx("tbody",{children:i.map((r,o)=>e.jsx("tr",{className:o%2===0?"bg-white dark:bg-gray-800":"bg-gray-50 dark:bg-gray-800/50",children:r.map((h,b)=>e.jsx("td",{className:"px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700",children:h.replace(/\*\*/g,"")},b))},o))})]})},`table-${m.length}`)),g=[],u=!1};return c.forEach((y,i)=>{const r=y.trim();if(r.startsWith("|")&&r.endsWith("|")){if(r.replace(/[|\-\s]/g,"")==="")return;u=!0,g.push(r.split("|").slice(1,-1).map(o=>o.trim()));return}else u&&d();if(r.startsWith("## "))m.push(e.jsx("h2",{className:"text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3",children:r.slice(3)},i));else if(r.startsWith("### "))m.push(e.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2",children:r.slice(4)},i));else if(r.startsWith("#### "))m.push(e.jsx("h4",{className:"text-base font-semibold text-gray-900 dark:text-white mt-3 mb-1",children:r.slice(5)},i));else if(r==="---"||r==="***")m.push(e.jsx("hr",{className:"my-4 border-gray-200 dark:border-gray-700"},i));else if(r.startsWith("> "))m.push(e.jsx("blockquote",{className:"my-3 pl-4 border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 rounded-r-lg py-2 pr-4",children:e.jsx("p",{className:"text-sm text-gray-700 dark:text-gray-300",children:r.slice(2)})},i));else if(r.startsWith("- [ ]")||r.startsWith("- [x]")){const o=r.startsWith("- [x]"),h=r.slice(6);m.push(e.jsxs("label",{className:"flex items-center gap-2 my-1 cursor-pointer",children:[e.jsx("input",{type:"checkbox",defaultChecked:o,className:"rounded border-gray-300 text-emerald-500 focus:ring-emerald-500",readOnly:!0}),e.jsx("span",{className:"text-sm text-gray-700 dark:text-gray-300",children:h})]},i))}else if(r.startsWith("- ")||r.startsWith("* "))m.push(e.jsx("li",{className:"ml-4 text-sm text-gray-700 dark:text-gray-300 list-disc my-1",children:r.slice(2)},i));else if(/^\d+\.\s/.test(r))m.push(e.jsx("li",{className:"ml-4 text-sm text-gray-700 dark:text-gray-300 list-decimal my-1",children:r.replace(/^\d+\.\s/,"")},i));else if(r==="")m.push(e.jsx("div",{className:"h-2"},i));else{const o=r.split(/(\*\*[^*]+\*\*)/g);m.push(e.jsx("p",{className:"text-sm text-gray-700 dark:text-gray-300 leading-relaxed my-1",children:o.map((h,b)=>h.startsWith("**")&&h.endsWith("**")?e.jsx("strong",{className:"font-semibold text-gray-900 dark:text-white",children:h.slice(2,-2)},b):h)},i))}}),u&&d(),m};return e.jsx("div",{className:"prose-sm",children:l()})}function _(){L({title:"AI生活助手 - AI效率助手",description:"AI生活助手提供旅行规划、美食推荐、健康顾问、职业规划、情感倾听等智能生活服务，让AI成为你的全方位生活助手。",keywords:"AI生活助手,旅行规划,美食推荐,健康顾问,职业规划,情感倾听,AI助手",canonicalUrl:"/workspace/life-assistant"});const{toast:p}=W(),[l,c]=a.useState("travel"),[m,u]=a.useState(""),[g,d]=a.useState(!1),[y,i]=a.useState([]),r=a.useRef(null),o=a.useRef(null),h=C.find(s=>s.key===l),b=a.useCallback(async s=>{var j;(j=r.current)==null||j.abort();const t=new AbortController;r.current=t,d(!0),u("");const f=[...y,{role:"user",content:s}];try{const k=await I({messages:f,systemPrompt:h.systemPrompt,temperature:l==="emotional"?.8:.7,maxTokens:4096},t.signal);if(!k.success||!k.stream){p(k.error||"生成失败，请重试","error"),d(!1);return}const X=k.stream.getReader();let v="";for(;;){const{done:w,value:A}=await X.read();if(w)break;v+=A,u(v)}i(w=>[...w,{role:"user",content:s},{role:"assistant",content:v}])}catch(k){k instanceof DOMException&&k.name==="AbortError"||p("生成失败，请检查网络连接","error")}finally{d(!1)}},[y,h.systemPrompt,l,p]),x=a.useCallback(()=>{var s;(s=r.current)==null||s.abort(),d(!1)},[]),n=a.useCallback(()=>{var s;(s=r.current)==null||s.abort(),u(""),i([]),d(!1)},[]);return a.useEffect(()=>{o.current&&(o.current.scrollTop=o.current.scrollHeight)},[m]),a.useEffect(()=>{n()},[l]),e.jsxs("div",{className:"min-h-screen bg-gray-50 dark:bg-gray-950",children:[e.jsxs("section",{className:"relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12",children:[e.jsxs("div",{className:"absolute inset-0 -z-10",children:[e.jsx("div",{className:"absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-emerald-100/60 via-emerald-50/40 to-transparent rounded-full blur-3xl"}),e.jsx("div",{className:"absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full blur-3xl"})]}),e.jsxs("div",{className:"max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",children:[e.jsxs("div",{className:"flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in",children:[e.jsx(S,{to:"/workspace",className:"hover:text-emerald-600 transition-colors",children:"工具"}),e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M8.25 4.5l7.5 7.5-7.5 7.5"})}),e.jsx("span",{className:"text-gray-900 dark:text-white font-medium",children:"生活助手"})]}),e.jsx("h1",{className:"text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up",children:e.jsx("span",{className:"bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 bg-clip-text text-transparent",children:"AI生活助手"})}),e.jsx("p",{className:"mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up",children:"旅行规划、美食推荐、健康顾问、职业规划、情感倾听 -- 你的全方位 AI 生活助手"})]})]}),e.jsx("section",{className:"pb-20 sm:pb-28",children:e.jsxs("div",{className:"max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",children:[e.jsx("div",{className:"flex flex-wrap gap-2 mb-8",children:C.map(s=>e.jsxs("button",{onClick:()=>c(s.key),className:`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${l===s.key?"bg-emerald-600 text-white shadow-md shadow-emerald-200 dark:shadow-emerald-900/30":"bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400"}`,children:[e.jsx("span",{children:s.icon}),e.jsx("span",{children:s.label})]},s.key))}),e.jsx(N.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{duration:.3},children:e.jsxs("div",{className:"bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden",children:[e.jsx("div",{className:"px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/10 dark:to-teal-900/10",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"text-2xl",children:h.icon}),e.jsxs("div",{children:[e.jsx("h2",{className:"text-lg font-bold text-gray-900 dark:text-white",children:h.label}),e.jsx("p",{className:"text-sm text-gray-500 dark:text-gray-400",children:h.description})]})]}),y.length>0&&e.jsxs("button",{onClick:n,className:"text-sm text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors flex items-center gap-1",children:[e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"})}),"重置"]})]})}),e.jsxs("div",{className:"p-6",children:[e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2",children:[e.jsx("svg",{className:"w-4 h-4 text-emerald-500",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"})}),"输入信息"]}),e.jsx($,{mode:"wait",children:e.jsxs(N.div,{initial:{opacity:0,x:-10},animate:{opacity:1,x:0},exit:{opacity:0,x:10},transition:{duration:.2},children:[l==="travel"&&e.jsx(T,{onSubmit:b,loading:g}),l==="food"&&e.jsx(D,{onSubmit:b,loading:g}),l==="health"&&e.jsx(P,{onSubmit:b,loading:g}),l==="career"&&e.jsx(z,{onSubmit:b,loading:g}),l==="emotional"&&e.jsx(B,{onSubmit:b,loading:g})]},l)})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h3",{className:"text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2",children:[e.jsx("svg",{className:"w-4 h-4 text-emerald-500",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"})}),"AI 结果"]}),g&&e.jsxs("button",{onClick:x,className:"text-sm text-red-500 hover:text-red-600 font-medium transition-colors flex items-center gap-1",children:[e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"})}),"停止"]})]}),e.jsx("div",{ref:o,className:"min-h-[300px] max-h-[500px] overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 scrollbar-thin",children:m?e.jsxs("div",{className:"animate-fade-in",children:[e.jsx(F,{content:m}),g&&e.jsx("span",{className:"inline-block w-2 h-4 bg-emerald-500 animate-pulse ml-1 align-middle"})]}):g?e.jsxs("div",{className:"flex flex-col items-center justify-center h-[250px] text-gray-400 dark:text-gray-500",children:[e.jsx("div",{className:"relative",children:e.jsx("div",{className:"w-12 h-12 border-4 border-emerald-200 dark:border-emerald-800 border-t-emerald-500 rounded-full animate-spin"})}),e.jsx("p",{className:"mt-4 text-sm",children:"AI 正在思考中..."})]}):e.jsxs("div",{className:"flex flex-col items-center justify-center h-[250px] text-gray-400 dark:text-gray-500",children:[e.jsx("span",{className:"text-5xl mb-4",children:h.icon}),e.jsxs("p",{className:"text-sm",children:["填写左侧信息，AI 将为你生成",h.label,"方案"]})]})})]})]}),l==="emotional"&&y.length>0&&e.jsxs("div",{className:"mt-6 pt-6 border-t border-gray-100 dark:border-gray-700",children:[e.jsx("h3",{className:"text-sm font-semibold text-gray-900 dark:text-white mb-3",children:"对话记录"}),e.jsx("div",{className:"space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin",children:y.map((s,t)=>e.jsx("div",{className:`flex ${s.role==="user"?"justify-end":"justify-start"}`,children:e.jsx("div",{className:`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${s.role==="user"?"bg-emerald-600 text-white rounded-br-md":"bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-bl-md"}`,children:s.content})},t))})]})]})]})},l)]})}),e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10",children:[e.jsx("h3",{className:"text-base font-semibold text-gray-900 dark:text-white mb-3",children:"💡 使用技巧"}),e.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",children:E.map((s,t)=>e.jsxs("div",{className:"flex items-start gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700",children:[e.jsx("span",{className:"text-emerald-500 mt-0.5",children:"✓"}),e.jsx("span",{className:"text-sm text-gray-600 dark:text-gray-400",children:s})]},t))})]}),e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-100 dark:border-gray-800",children:[e.jsx("h3",{className:"text-base font-semibold text-gray-900 dark:text-white mb-3",children:"🔗 相关工具"}),e.jsx("div",{className:"flex flex-wrap gap-3",children:M.map(s=>e.jsx(S,{to:s.to,className:"px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all",children:s.label},s.to))})]})]})}export{_ as default};
