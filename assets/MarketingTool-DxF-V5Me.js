import{j as e,m as E,A as D}from"./vendor-motion-BCFRTMCL.js";import{a,L as H}from"./vendor-react-DEZBGjak.js";import{u as q}from"./SeoHead-CYU8jSme.js";import{c as G}from"./aiChat-rZQ7JYJC.js";import{a as K}from"./index-C2E6FsMA.js";import"./api-BzEi16Tb.js";import"./vendor-zustand-B7_ng4WW.js";const W=[{key:"xiaohongshu",label:"小红书",icon:"📕",color:"border-red-200 dark:border-red-800",activeColor:"bg-red-500 text-white shadow-md shadow-red-200 dark:shadow-red-900/30",systemPrompt:`你是一个小红书爆款文案专家。请生成种草力强的文案，遵循以下规则：
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
（3-5条配图拍摄建议）`},{key:"douyin",label:"抖音/快手",icon:"🎬",color:"border-gray-200 dark:border-gray-700",activeColor:"bg-gray-900 text-white shadow-md shadow-gray-300 dark:shadow-gray-900/30",systemPrompt:`你是一个短视频脚本专家。请生成15-60秒的短视频脚本，遵循以下规则：
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
（2-3条拍摄技巧建议）`},{key:"wechat",label:"微信公众号",icon:"💬",color:"border-green-200 dark:border-green-800",activeColor:"bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-green-900/30",systemPrompt:`你是一个公众号写作专家。请生成深度、专业、有观点的长文，遵循以下规则：
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
（文末互动话题或引导关注的话术）`},{key:"weibo",label:"微博",icon:"📢",color:"border-orange-200 dark:border-orange-800",activeColor:"bg-orange-500 text-white shadow-md shadow-orange-200 dark:shadow-orange-900/30",systemPrompt:`你是一个微博运营专家。请生成适合微博传播的短文案，遵循以下规则：
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
（提升互动率的小技巧）`},{key:"moments",label:"朋友圈",icon:"🫂",color:"border-blue-200 dark:border-blue-800",activeColor:"bg-blue-500 text-white shadow-md shadow-blue-200 dark:shadow-blue-900/30",systemPrompt:`你是一个朋友圈文案专家。请生成适合微信朋友圈的文案，遵循以下规则：
1. 语气自然、像朋友分享
2. 不超过100字
3. 避免过度营销感
4. 可以适当使用emoji
5. 引发好奇或共鸣

请按以下格式输出：
## 📌 朋友圈文案
（3-5条备选文案，风格各异）

## 📸 配图建议
（配图风格和内容建议）`},{key:"ecommerce",label:"电商详情页",icon:"🛒",color:"border-amber-200 dark:border-amber-800",activeColor:"bg-amber-500 text-white shadow-md shadow-amber-200 dark:shadow-amber-900/30",systemPrompt:`你是一个电商文案专家。请生成专业的电商详情页文案，遵循以下规则：
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
（限时优惠、品质保证等促单信息）`},{key:"email",label:"邮件营销",icon:"📧",color:"border-indigo-200 dark:border-indigo-800",activeColor:"bg-indigo-500 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30",systemPrompt:`你是一个邮件营销专家。请生成高转化率的营销邮件，遵循以下规则：
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
（最佳发送时间、A/B测试建议）`}],U=["选择平台后，表单会自动切换为该平台专属字段","核心卖点越详细，生成的文案越精准","可以多次生成后挑选最佳方案",'点击"换个风格"可以用不同语气重新生成'],J=[{to:"/workspace/copywriting",label:"文案生成器"},{to:"/workspace/brand",label:"品牌声音"},{to:"/workspace/seo",label:"SEO 优化"}];function Q({platform:n,onSubmit:u,loading:f}){var R;const[t,y]=a.useState(""),[c,k]=a.useState(""),[m,x]=a.useState(""),[s,d]=a.useState(""),[i,b]=a.useState(""),[h,v]=a.useState(""),[S,$]=a.useState(""),[w,l]=a.useState("种草"),[j,A]=a.useState("口播"),[p,L]=a.useState("30"),[N,P]=a.useState("悬念"),[C,I]=a.useState("深度"),[T,B]=a.useState("2000"),[M,F]=a.useState(""),[X,z]=a.useState("幽默"),O=()=>{let r=`产品/品牌名称：${t}
核心卖点：${c}
目标受众：${m}
行动号召：${s||"无特定要求"}
品牌调性：${i||"无特定要求"}
`;switch(n){case"xiaohongshu":r+=`话题：${h}
关键词：${S}
文案风格：${w}
`;break;case"douyin":r+=`视频类型：${j}
目标时长：${p}秒
Hook风格：${N}
`;break;case"wechat":r+=`文章类型：${C}
目标字数：${T}字
`;break;case"weibo":r+=`话题/事件：${h}
相关话题标签：${M}
语气风格：${X}
`;break;case"moments":r+=`分享场景：${h}
`;break;case"ecommerce":r+=`价格区间：${h}
`;break;case"email":r+=`邮件目的：${h}
`;break}return r},V=()=>{!t.trim()||!c.trim()||u(O())},g="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none",o="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1";return e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{children:[e.jsx("label",{className:o,children:"产品/品牌名称 *"}),e.jsx("input",{type:"text",value:t,onChange:r=>y(r.target.value),placeholder:"例如：智能保温杯 Pro",className:g})]}),e.jsxs("div",{children:[e.jsx("label",{className:o,children:"核心卖点 *"}),e.jsx("textarea",{value:c,onChange:r=>k(r.target.value),placeholder:"例如：12小时保温、316不锈钢内胆、智能温控显示",rows:3,className:`${g} resize-none`})]}),e.jsxs("div",{children:[e.jsx("label",{className:o,children:"目标受众"}),e.jsx("input",{type:"text",value:m,onChange:r=>x(r.target.value),placeholder:"例如：25-35岁都市白领女性",className:g})]}),n==="xiaohongshu"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("label",{className:o,children:"话题"}),e.jsx("input",{type:"text",value:h,onChange:r=>v(r.target.value),placeholder:"例如：办公室好物分享",className:g})]}),e.jsxs("div",{children:[e.jsx("label",{className:o,children:"关键词"}),e.jsx("input",{type:"text",value:S,onChange:r=>$(r.target.value),placeholder:"例如：保温杯, 办公好物, 种草",className:g})]}),e.jsxs("div",{children:[e.jsx("label",{className:o,children:"文案风格"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:["种草","测评","教程","vlog"].map(r=>e.jsxs("button",{onClick:()=>l(r),className:`px-3 py-1.5 rounded-full text-sm border transition-all ${w===r?"border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300":"border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-300"}`,children:[w===r&&"✓ ",r]},r))})]})]}),n==="douyin"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("label",{className:o,children:"视频类型"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:["口播","剧情","展示"].map(r=>e.jsxs("button",{onClick:()=>A(r),className:`px-3 py-1.5 rounded-full text-sm border transition-all ${j===r?"border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300":"border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-300"}`,children:[j===r&&"✓ ",r]},r))})]}),e.jsxs("div",{children:[e.jsxs("label",{className:o,children:["目标时长: ",p,"秒"]}),e.jsx("input",{type:"range",min:"15",max:"60",step:"5",value:p,onChange:r=>L(r.target.value),className:"w-full accent-rose-500"}),e.jsxs("div",{className:"flex justify-between text-xs text-gray-400 mt-1",children:[e.jsx("span",{children:"15秒"}),e.jsx("span",{children:"60秒"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:o,children:"Hook风格"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:["悬念","数据","痛点","反差"].map(r=>e.jsxs("button",{onClick:()=>P(r),className:`px-3 py-1.5 rounded-full text-sm border transition-all ${N===r?"border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300":"border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-300"}`,children:[N===r&&"✓ ",r]},r))})]})]}),n==="wechat"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("label",{className:o,children:"文章类型"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:["深度","资讯","观点","故事"].map(r=>e.jsxs("button",{onClick:()=>I(r),className:`px-3 py-1.5 rounded-full text-sm border transition-all ${C===r?"border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300":"border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-300"}`,children:[C===r&&"✓ ",r]},r))})]}),e.jsxs("div",{children:[e.jsxs("label",{className:o,children:["目标字数: ",T,"字"]}),e.jsx("input",{type:"range",min:"800",max:"5000",step:"200",value:T,onChange:r=>B(r.target.value),className:"w-full accent-rose-500"}),e.jsxs("div",{className:"flex justify-between text-xs text-gray-400 mt-1",children:[e.jsx("span",{children:"800字"}),e.jsx("span",{children:"5000字"})]})]})]}),n==="weibo"&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{children:[e.jsx("label",{className:o,children:"话题/事件"}),e.jsx("input",{type:"text",value:h,onChange:r=>v(r.target.value),placeholder:"例如：新品发布、节日促销",className:g})]}),e.jsxs("div",{children:[e.jsx("label",{className:o,children:"相关话题标签"}),e.jsx("input",{type:"text",value:M,onChange:r=>F(r.target.value),placeholder:"例如：#新品上市 #限时优惠",className:g})]}),e.jsxs("div",{children:[e.jsx("label",{className:o,children:"语气风格"}),e.jsx("div",{className:"flex flex-wrap gap-2",children:["幽默","专业","煽情","犀利"].map(r=>e.jsxs("button",{onClick:()=>z(r),className:`px-3 py-1.5 rounded-full text-sm border transition-all ${X===r?"border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300":"border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-rose-300"}`,children:[X===r&&"✓ ",r]},r))})]})]}),n==="moments"&&e.jsxs("div",{children:[e.jsx("label",{className:o,children:"分享场景"}),e.jsx("input",{type:"text",value:h,onChange:r=>v(r.target.value),placeholder:"例如：收到快递、旅行打卡、日常分享",className:g})]}),n==="ecommerce"&&e.jsxs("div",{children:[e.jsx("label",{className:o,children:"价格区间"}),e.jsx("input",{type:"text",value:h,onChange:r=>v(r.target.value),placeholder:"例如：99-199元",className:g})]}),n==="email"&&e.jsxs("div",{children:[e.jsx("label",{className:o,children:"邮件目的"}),e.jsx("input",{type:"text",value:h,onChange:r=>v(r.target.value),placeholder:"例如：新品发布通知、会员促销",className:g})]}),e.jsxs("div",{children:[e.jsx("label",{className:o,children:"行动号召 (CTA)"}),e.jsx("input",{type:"text",value:s,onChange:r=>d(r.target.value),placeholder:"例如：立即购买、点击了解更多",className:g})]}),e.jsxs("div",{children:[e.jsx("label",{className:o,children:"品牌调性描述"}),e.jsx("input",{type:"text",value:i,onChange:r=>b(r.target.value),placeholder:"例如：年轻、时尚、有活力",className:g})]}),e.jsx("button",{onClick:V,disabled:f||!t.trim()||!c.trim(),className:"w-full py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-pink-500 hover:from-rose-700 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm hover:shadow-md active:scale-[0.98]",children:f?"生成中...":`✨ 生成${(R=W.find(r=>r.key===n))==null?void 0:R.label}文案`})]})}function Y({content:n}){const u=()=>{const f=n.split(`
`),t=[];let y=!1,c=[];const k=()=>{if(c.length===0)return;const m=c[0],x=c.slice(1);t.push(e.jsx("div",{className:"overflow-x-auto my-3",children:e.jsxs("table",{className:"w-full text-sm border-collapse",children:[e.jsx("thead",{children:e.jsx("tr",{className:"bg-rose-50 dark:bg-rose-900/20",children:m.map((s,d)=>e.jsx("th",{className:"px-4 py-2 text-left font-semibold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700",children:s.replace(/\*\*/g,"")},d))})}),e.jsx("tbody",{children:x.map((s,d)=>e.jsx("tr",{className:d%2===0?"bg-white dark:bg-gray-800":"bg-gray-50 dark:bg-gray-800/50",children:s.map((i,b)=>e.jsx("td",{className:"px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700",children:i.replace(/\*\*/g,"")},b))},d))})]})},`table-${t.length}`)),c=[],y=!1};return f.forEach((m,x)=>{const s=m.trim();if(s.startsWith("|")&&s.endsWith("|")){if(s.replace(/[|\-\s]/g,"")==="")return;y=!0,c.push(s.split("|").slice(1,-1).map(d=>d.trim()));return}else y&&k();if(s.startsWith("## "))t.push(e.jsx("h2",{className:"text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3",children:s.slice(3)},x));else if(s.startsWith("### "))t.push(e.jsx("h3",{className:"text-lg font-semibold text-gray-900 dark:text-white mt-4 mb-2",children:s.slice(4)},x));else if(s.startsWith("#### "))t.push(e.jsx("h4",{className:"text-base font-semibold text-gray-900 dark:text-white mt-3 mb-1",children:s.slice(5)},x));else if(s==="---"||s==="***")t.push(e.jsx("hr",{className:"my-4 border-gray-200 dark:border-gray-700"},x));else if(s.startsWith("> "))t.push(e.jsx("blockquote",{className:"my-3 pl-4 border-l-4 border-rose-500 bg-rose-50 dark:bg-rose-900/20 rounded-r-lg py-2 pr-4",children:e.jsx("p",{className:"text-sm text-gray-700 dark:text-gray-300",children:s.slice(2)})},x));else if(s.startsWith("- [ ]")||s.startsWith("- [x]")){const d=s.startsWith("- [x]"),i=s.slice(6);t.push(e.jsxs("label",{className:"flex items-center gap-2 my-1 cursor-pointer",children:[e.jsx("input",{type:"checkbox",defaultChecked:d,className:"rounded border-gray-300 text-rose-500 focus:ring-rose-500",readOnly:!0}),e.jsx("span",{className:"text-sm text-gray-700 dark:text-gray-300",children:i})]},x))}else if(s.startsWith("- ")||s.startsWith("* "))t.push(e.jsx("li",{className:"ml-4 text-sm text-gray-700 dark:text-gray-300 list-disc my-1",children:s.slice(2)},x));else if(/^\d+\.\s/.test(s))t.push(e.jsx("li",{className:"ml-4 text-sm text-gray-700 dark:text-gray-300 list-decimal my-1",children:s.replace(/^\d+\.\s/,"")},x));else if(s==="")t.push(e.jsx("div",{className:"h-2"},x));else{const d=s.split(/(\*\*[^*]+\*\*)/g);t.push(e.jsx("p",{className:"text-sm text-gray-700 dark:text-gray-300 leading-relaxed my-1",children:d.map((i,b)=>i.startsWith("**")&&i.endsWith("**")?e.jsx("strong",{className:"font-semibold text-gray-900 dark:text-white",children:i.slice(2,-2)},b):i)},x))}}),y&&k(),t};return e.jsx("div",{className:"prose-sm",children:u()})}function le(){q({title:"AI营销文案 - AI效率助手",description:"AI营销文案生成器，支持小红书、抖音、微信公众号、微博、朋友圈、电商详情页、邮件营销等多平台文案一键生成。",keywords:"AI营销文案,小红书文案,抖音脚本,公众号文章,微博文案,电商文案,邮件营销,AI文案生成",canonicalUrl:"/workspace/marketing"});const{toast:n}=K(),[u,f]=a.useState("xiaohongshu"),[t,y]=a.useState(""),[c,k]=a.useState(!1),[m,x]=a.useState(""),s=a.useRef(null),d=a.useRef(null),i=W.find(l=>l.key===u),b=a.useCallback(async l=>{var A;(A=s.current)==null||A.abort();const j=new AbortController;s.current=j,k(!0),y(""),x(l);try{const p=await G({messages:[{role:"user",content:l}],systemPrompt:i.systemPrompt,temperature:.8,maxTokens:4096},j.signal);if(!p.success||!p.stream){n(p.error||"生成失败，请重试","error"),k(!1);return}const L=p.stream.getReader();let N="";for(;;){const{done:P,value:C}=await L.read();if(P)break;N+=C,y(N)}}catch(p){p instanceof DOMException&&p.name==="AbortError"||n("生成失败，请检查网络连接","error")}finally{k(!1)}},[i.systemPrompt,n]),h=a.useCallback(()=>{var l;(l=s.current)==null||l.abort(),k(!1)},[]),v=a.useCallback(()=>{m&&b(m)},[m,b]),S=a.useCallback(()=>{if(!m)return;const l=m+`

请换一种完全不同的风格和语气重新生成。`;b(l)},[m,b]),$=a.useCallback(()=>{t&&navigator.clipboard.writeText(t).then(()=>{n("已复制到剪贴板","success")}).catch(()=>{n("复制失败","error")})},[t,n]);a.useEffect(()=>{d.current&&(d.current.scrollTop=d.current.scrollHeight)},[t]);const w=t.length;return e.jsxs("div",{className:"min-h-screen bg-gray-50 dark:bg-gray-950",children:[e.jsxs("section",{className:"relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12",children:[e.jsxs("div",{className:"absolute inset-0 -z-10",children:[e.jsx("div",{className:"absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-rose-100/60 via-pink-50/40 to-transparent rounded-full blur-3xl"}),e.jsx("div",{className:"absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-pink-100/40 to-transparent rounded-full blur-3xl"})]}),e.jsxs("div",{className:"max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",children:[e.jsxs("div",{className:"flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in",children:[e.jsx(H,{to:"/workspace",className:"hover:text-rose-600 transition-colors",children:"工具"}),e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M8.25 4.5l7.5 7.5-7.5 7.5"})}),e.jsx("span",{className:"text-gray-900 dark:text-white font-medium",children:"营销文案"})]}),e.jsx("h1",{className:"text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up",children:e.jsx("span",{className:"bg-gradient-to-r from-rose-600 via-pink-500 to-rose-600 bg-clip-text text-transparent",children:"AI营销文案"})}),e.jsx("p",{className:"mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up",children:"多平台营销文案一键生成，覆盖小红书、抖音、公众号、微博等主流平台"})]})]}),e.jsx("section",{className:"pb-20 sm:pb-28",children:e.jsxs("div",{className:"max-w-4xl mx-auto px-4 sm:px-6 lg:px-8",children:[e.jsx("div",{className:"flex gap-2 overflow-x-auto flex-nowrap scrollbar-hide pb-1 mb-8",children:W.map(l=>e.jsxs("button",{onClick:()=>f(l.key),className:`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${u===l.key?l.activeColor:`bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border ${l.color} hover:text-rose-600 dark:hover:text-rose-400`}`,children:[e.jsx("span",{children:l.icon}),e.jsx("span",{children:l.label})]},l.key))}),e.jsx(E.div,{initial:{opacity:0,y:10},animate:{opacity:1,y:0},transition:{duration:.3},children:e.jsxs("div",{className:"bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden",children:[e.jsx("div",{className:"px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/10 dark:to-pink-900/10",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("span",{className:"text-2xl",children:i.icon}),e.jsxs("div",{children:[e.jsxs("h2",{className:"text-lg font-bold text-gray-900 dark:text-white",children:[i.label,"文案生成"]}),e.jsx("p",{className:"text-sm text-gray-500 dark:text-gray-400",children:"填写信息，AI 为你生成专属营销文案"})]})]})}),e.jsx("div",{className:"p-6",children:e.jsxs("div",{className:"grid grid-cols-1 lg:grid-cols-2 gap-6",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2",children:[e.jsx("svg",{className:"w-4 h-4 text-rose-500",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z"})}),"填写信息"]}),e.jsx(D,{mode:"wait",children:e.jsx(E.div,{initial:{opacity:0,x:-10},animate:{opacity:1,x:0},exit:{opacity:0,x:10},transition:{duration:.2},children:e.jsx(Q,{platform:u,onSubmit:b,loading:c})},u)})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center justify-between mb-4",children:[e.jsxs("h3",{className:"text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2",children:[e.jsx("svg",{className:"w-4 h-4 text-rose-500",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"})}),"生成结果"]}),e.jsxs("div",{className:"flex items-center gap-2",children:[c&&e.jsxs("button",{onClick:h,className:"text-sm text-red-500 hover:text-red-600 font-medium transition-colors flex items-center gap-1",children:[e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z"})}),"停止"]}),t&&!c&&e.jsxs(e.Fragment,{children:[e.jsxs("button",{onClick:$,className:"text-sm text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 font-medium transition-colors flex items-center gap-1",children:[e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184"})}),"一键复制"]}),e.jsxs("button",{onClick:v,className:"text-sm text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 font-medium transition-colors flex items-center gap-1",children:[e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182"})}),"重新生成"]}),e.jsxs("button",{onClick:S,className:"text-sm text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 font-medium transition-colors flex items-center gap-1",children:[e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"})}),"换个风格"]})]})]})]}),e.jsx("div",{ref:d,className:"min-h-[300px] max-h-[500px] overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 scrollbar-thin",children:t?e.jsxs("div",{className:"animate-fade-in",children:[e.jsx(Y,{content:t}),c&&e.jsx("span",{className:"inline-block w-2 h-4 bg-rose-500 animate-pulse ml-1 align-middle"})]}):c?e.jsxs("div",{className:"flex flex-col items-center justify-center h-[250px] text-gray-400 dark:text-gray-500",children:[e.jsx("div",{className:"relative",children:e.jsx("div",{className:"w-12 h-12 border-4 border-rose-200 dark:border-rose-800 border-t-rose-500 rounded-full animate-spin"})}),e.jsx("p",{className:"mt-4 text-sm",children:"AI 正在生成文案..."})]}):e.jsxs("div",{className:"flex flex-col items-center justify-center h-[250px] text-gray-400 dark:text-gray-500",children:[e.jsx("span",{className:"text-5xl mb-4",children:i.icon}),e.jsxs("p",{className:"text-sm",children:["填写左侧信息，AI 将为你生成",i.label,"文案"]})]})}),t&&e.jsxs("div",{className:"mt-2 text-right text-xs text-gray-400 dark:text-gray-500",children:["共 ",w," 字"]})]})]})})]})},u)]})}),e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10",children:[e.jsx("h3",{className:"text-base font-semibold text-gray-900 dark:text-white mb-3",children:"💡 使用技巧"}),e.jsx("div",{className:"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3",children:U.map((l,j)=>e.jsxs("div",{className:"flex items-start gap-2 p-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700",children:[e.jsx("span",{className:"text-rose-500 mt-0.5",children:"✓"}),e.jsx("span",{className:"text-sm text-gray-600 dark:text-gray-400",children:l})]},j))})]}),e.jsxs("div",{className:"max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 border-t border-gray-100 dark:border-gray-800",children:[e.jsx("h3",{className:"text-base font-semibold text-gray-900 dark:text-white mb-3",children:"🔗 相关工具"}),e.jsx("div",{className:"flex flex-wrap gap-3",children:J.map(l=>e.jsx(H,{to:l.to,className:"px-4 py-2 rounded-xl text-sm font-medium bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400 transition-all",children:l.label},l.to))})]})]})}export{le as default};
