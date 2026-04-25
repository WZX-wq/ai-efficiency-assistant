import{j as e,m as r,A as c}from"./vendor-motion-Dx6xgJmk.js";import{a as s}from"./vendor-react-DfmVI5gG.js";const v="ai-assistant-feedbacks",j="ai-assistant-feedback-given",C=["功能建议","Bug反馈","体验优化","内容质量","其他"],E=["😞","😐","🙂","😊","🤩"],w=["很差","较差","一般","满意","非常满意"];function L(){try{const a=localStorage.getItem(v);return a?JSON.parse(a):[]}catch{return[]}}function F(a){localStorage.setItem(v,JSON.stringify(a))}function A(){return sessionStorage.getItem(j)==="true"}function D(){sessionStorage.setItem(j,"true")}function T({rating:a,onChange:i}){return e.jsx("div",{className:"flex items-center justify-center gap-1",children:E.map((m,o)=>{const n=o+1;return e.jsxs(r.button,{type:"button",whileHover:{scale:1.25},whileTap:{scale:.9},onClick:()=>i(n),className:`
              relative text-3xl cursor-pointer select-none
              transition-all duration-200
              ${a===n?"scale-110":"opacity-50 hover:opacity-80"}
            `,"aria-label":w[o],children:[m,a===n&&e.jsx(r.span,{layoutId:"star-ring",className:"absolute inset-0 rounded-full border-2 border-primary-500 dark:border-primary-400",transition:{type:"spring",stiffness:400,damping:25}})]},n)})})}function I({onClose:a}){return e.jsxs(r.div,{initial:{opacity:0,scale:.8},animate:{opacity:1,scale:1},exit:{opacity:0,scale:.8},transition:{type:"spring",stiffness:300,damping:25},className:"flex flex-col items-center gap-4 py-6",children:[e.jsx(r.div,{initial:{scale:0},animate:{scale:1},transition:{type:"spring",stiffness:260,damping:20,delay:.1},className:"w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center",children:e.jsx(r.svg,{initial:{pathLength:0},animate:{pathLength:1},transition:{duration:.5,delay:.3},className:"w-8 h-8 text-green-600 dark:text-green-400",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2.5,children:e.jsx(r.path,{d:"M5 13l4 4L19 7",strokeLinecap:"round",strokeLinejoin:"round",initial:{pathLength:0},animate:{pathLength:1},transition:{duration:.5,delay:.3}})})}),e.jsxs(r.div,{initial:{opacity:0,y:8},animate:{opacity:1,y:0},transition:{delay:.4},className:"text-center",children:[e.jsx("p",{className:"text-lg font-semibold text-gray-900 dark:text-gray-100",children:"感谢您的反馈！"}),e.jsx("p",{className:"mt-1 text-sm text-gray-500 dark:text-gray-400",children:"您的意见对我们非常重要，我们会认真对待每一条反馈。"})]}),e.jsx(r.button,{initial:{opacity:0},animate:{opacity:1},transition:{delay:.7},whileHover:{scale:1.03},whileTap:{scale:.97},onClick:a,className:`
          mt-2 px-6 py-2 rounded-lg text-sm font-medium
          bg-primary-600 text-white
          hover:bg-primary-700 dark:hover:bg-primary-500
          transition-colors duration-200
        `,children:"关闭"})]})}function R(){const[a,i]=s.useState(!1),[m,o]=s.useState(!1),[n,p]=s.useState(0),[g,h]=s.useState(""),[l,b]=s.useState(""),[x,f]=s.useState(""),[N,k]=s.useState(!1);s.useEffect(()=>{A()||k(!0)},[]),s.useEffect(()=>{const t=()=>i(!0);return window.addEventListener("open-feedback",t),()=>window.removeEventListener("open-feedback",t)},[]),s.useEffect(()=>{if(!a)return;const t=y=>{y.key==="Escape"&&i(!1)};return window.addEventListener("keydown",t),()=>window.removeEventListener("keydown",t)},[a]);const S=s.useCallback(()=>{if(n===0)return;const t={id:crypto.randomUUID(),rating:n,category:g||"其他",content:l.trim(),email:x.trim(),createdAt:new Date().toISOString()},y=L();F([t,...y]),D(),o(!0),k(!1)},[n,g,l,x]),u=s.useCallback(()=>{i(!1),setTimeout(()=>{o(!1),p(0),h(""),b(""),f("")},300)},[]),d=n>0&&l.trim().length>0;return e.jsxs(e.Fragment,{children:[e.jsxs(r.button,{onClick:()=>i(t=>!t),whileHover:{scale:1.08},whileTap:{scale:.92},"aria-label":"用户反馈",className:`
          fixed bottom-28 right-4 z-40
          md:bottom-16 md:right-6
          w-12 h-12 rounded-full
          flex items-center justify-center
          bg-primary-600 dark:bg-primary-600
          text-white shadow-lg shadow-primary-600/30 dark:shadow-primary-600/20
          hover:bg-primary-700 dark:hover:bg-primary-500
          transition-colors duration-200
          group
        `,children:[!a&&e.jsx("span",{className:"absolute inset-0 rounded-full bg-primary-500 animate-ping opacity-20"}),e.jsx("svg",{className:`w-5 h-5 transition-transform duration-300 ${a?"rotate-0":"group-hover:scale-110"}`,fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:1.8,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.424 48.424 0 017.687-1.429A3.375 3.375 0 0021.75 12.51V8.25A3.375 3.375 0 0018.375 4.875H5.625A3.375 3.375 0 002.25 8.25v3.51z"})}),e.jsx(c,{children:N&&!a&&e.jsx(r.span,{initial:{scale:0},animate:{scale:1},exit:{scale:0},transition:{type:"spring",stiffness:500,damping:25},className:`
                absolute -top-1 -right-1
                w-5 h-5 rounded-full
                bg-red-500 dark:bg-red-500
                text-[10px] font-bold text-white
                flex items-center justify-center
                shadow-sm
              `,children:"1"})})]}),e.jsx(c,{children:a&&e.jsx(r.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.2},className:"fixed inset-0 z-40 bg-black/30 dark:bg-black/50 backdrop-blur-sm",onClick:u})}),e.jsx(c,{children:a&&e.jsxs(r.div,{initial:{opacity:0,y:40,scale:.95},animate:{opacity:1,y:0,scale:1},exit:{opacity:0,y:40,scale:.95},transition:{type:"spring",stiffness:350,damping:30},role:"dialog","aria-label":"反馈面板",className:`
              fixed z-50
              bottom-0 right-0
              mb-28 mr-4
              md:mb-16 md:mr-6
              w-[calc(100%-2rem)] max-w-md
              rounded-2xl
              bg-white dark:bg-gray-900
              border border-gray-200 dark:border-gray-700/60
              shadow-2xl shadow-black/10 dark:shadow-black/40
              overflow-hidden
            `,children:[e.jsxs("div",{className:"flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"text-lg",children:"💬"}),e.jsx("h3",{className:"text-base font-semibold text-gray-900 dark:text-gray-100",children:"意见反馈"})]}),e.jsx("button",{onClick:u,"aria-label":"关闭",className:`
                  w-8 h-8 rounded-lg
                  flex items-center justify-center
                  text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                  hover:bg-gray-100 dark:hover:bg-gray-800
                  transition-colors duration-150
                `,children:e.jsx("svg",{className:"w-4 h-4",fill:"none",viewBox:"0 0 24 24",stroke:"currentColor",strokeWidth:2,children:e.jsx("path",{strokeLinecap:"round",strokeLinejoin:"round",d:"M6 18L18 6M6 6l12 12"})})})]}),e.jsx("div",{className:"px-5 py-4",children:e.jsx(c,{mode:"wait",children:m?e.jsx(I,{onClose:u},"thanks"):e.jsxs(r.div,{initial:{opacity:0},animate:{opacity:1},exit:{opacity:0},transition:{duration:.15},className:"flex flex-col gap-5",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",children:"您的体验如何？"}),e.jsx(T,{rating:n,onChange:p}),n>0&&e.jsx(r.p,{initial:{opacity:0,y:-4},animate:{opacity:1,y:0},className:"text-center text-xs text-gray-500 dark:text-gray-400 mt-1",children:w[n-1]})]}),e.jsxs("div",{children:[e.jsx("label",{htmlFor:"fb-category",className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",children:"反馈类型"}),e.jsxs("select",{id:"fb-category",value:g,onChange:t=>h(t.target.value),className:`
                          w-full px-3 py-2 rounded-lg text-sm
                          bg-gray-50 dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          text-gray-900 dark:text-gray-100
                          focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500
                          dark:focus:ring-primary-400/40 dark:focus:border-primary-400
                          transition-colors duration-150
                          appearance-none
                          bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%236b7280%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22m19.5%208.25-7.5%207.5-7.5-7.5%22%2F%3E%3C%2Fsvg%3E')]
                          bg-[length:1rem] bg-[right_0.5rem_center] bg-no-repeat
                          pr-8
                        `,children:[e.jsx("option",{value:"",disabled:!0,children:"请选择反馈类型"}),C.map(t=>e.jsx("option",{value:t,children:t},t))]})]}),e.jsxs("div",{children:[e.jsxs("label",{htmlFor:"fb-content",className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",children:["详细描述",e.jsx("span",{className:"text-red-500 ml-0.5",children:"*"})]}),e.jsx("textarea",{id:"fb-content",value:l,onChange:t=>b(t.target.value),rows:4,placeholder:"请告诉我们您的想法、遇到的问题或改进建议...",maxLength:1e3,className:`
                          w-full px-3 py-2 rounded-lg text-sm resize-none
                          bg-gray-50 dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500
                          focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500
                          dark:focus:ring-primary-400/40 dark:focus:border-primary-400
                          transition-colors duration-150
                        `}),e.jsxs("p",{className:"text-right text-xs text-gray-400 dark:text-gray-500 mt-1",children:[l.length," / 1000"]})]}),e.jsxs("div",{children:[e.jsxs("label",{htmlFor:"fb-email",className:"block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",children:["联系邮箱",e.jsx("span",{className:"text-gray-400 dark:text-gray-500 font-normal ml-1",children:"（选填）"})]}),e.jsx("input",{id:"fb-email",type:"email",value:x,onChange:t=>f(t.target.value),placeholder:"方便我们跟进回复您",className:`
                          w-full px-3 py-2 rounded-lg text-sm
                          bg-gray-50 dark:bg-gray-800
                          border border-gray-200 dark:border-gray-700
                          text-gray-900 dark:text-gray-100
                          placeholder-gray-400 dark:placeholder-gray-500
                          focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500
                          dark:focus:ring-primary-400/40 dark:focus:border-primary-400
                          transition-colors duration-150
                        `})]}),e.jsx(r.button,{type:"button",disabled:!d,whileHover:d?{scale:1.02}:void 0,whileTap:d?{scale:.98}:void 0,onClick:S,className:`
                        w-full py-2.5 rounded-lg text-sm font-medium
                        transition-colors duration-200
                        ${d?"bg-primary-600 text-white hover:bg-primary-700 dark:hover:bg-primary-500 cursor-pointer":"bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"}
                      `,children:"提交反馈"})]},"form")})})]})})]})}export{R as default};
