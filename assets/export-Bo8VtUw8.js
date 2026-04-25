function l(){const t=new Date,e=t.getFullYear(),o=String(t.getMonth()+1).padStart(2,"0"),r=String(t.getDate()).padStart(2,"0");return`${e}-${o}-${r}`}function i(t){return t.replace(/[<>:"/\\|?*\x00-\x1f]/g,"").trim()}function n(t,e,o,r){const d=new Blob([t],{type:r}),c=URL.createObjectURL(d),a=document.createElement("a");a.href=c,a.download=i(e)+o,a.style.display="none",document.body.appendChild(a),a.click(),setTimeout(()=>{URL.revokeObjectURL(c),document.body.removeChild(a)},100)}function s(t,e){const o=e??`AI改写_${l()}`;n(t,o,".md","text/markdown;charset=utf-8")}function p(t,e){const o=e??`AI改写_${l()}`;n(t,o,".txt","text/plain;charset=utf-8")}function m(t,e="document"){const o=`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; line-height: 1.8; color: #333; }
    h1, h2, h3, h4 { margin-top: 1.5em; }
    blockquote { border-left: 4px solid #6366f1; padding-left: 1em; color: #666; }
    code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
    pre { background: #1f2937; color: #e5e7eb; padding: 1em; border-radius: 8px; overflow-x: auto; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; }
    th { background: #f3f4f6; }
  </style>
</head>
<body>${t}</body>
</html>`;n(o,e,".html","text/html;charset=utf-8")}function h(t,e="document"){const o=t.replace(/<[^>]*>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\n{3,}/g,`

`).trim();n(o,e,".txt","text/plain;charset=utf-8")}export{m as a,h as b,p as c,n as d,s as e};
