/* CQlass UI Icons — replaces decorative emoji in interface controls with inline SVG */
(function(){
  if(window.CQIcons)return;
  const ICONS={
    book:'<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z"/>',
    calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
    camera:'<path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"/><circle cx="12" cy="13" r="3.5"/>',
    folder:'<path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2V6Z"/><path d="M3 10h18"/>',
    activity:'<path d="M3 12h4l2.5-6 5 12 2.5-6H21"/>',
    library:'<path d="M4 19V5M9 19V5M14 19V5M19 19V5"/><path d="M3 5h18M3 19h18"/>',
    pencil:'<path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m14.5 7.5 3 3"/>',
    download:'<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    printer:'<path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="7"/>',
    check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
    x:'<circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/>',
    alert:'<path d="M12 3 2.8 19a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L12 3Z"/><path d="M12 9v5M12 18h.01"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
    refresh:'<path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2L20 9M4 15l2.4 2A7 7 0 0 0 18 15"/>',
    save:'<path d="M5 3h12l2 2v16H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"/><path d="M7 3v6h8V3M8 21v-7h8v7"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    home:'<path d="m3 11 9-8 9 8"/><path d="M5 10v11h14V10M9 21v-6h6v6"/>',
    chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20V8"/>',
    file:'<path d="M6 2h8l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v5h5M8 13h8M8 17h6"/>',
    upload:'<path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2.8 2.8-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1.1 1.7V21h-4v-.1A1.8 1.8 0 0 0 8.8 19a1.8 1.8 0 0 0-2 .4l-.1.1-2.8-2.8.1-.1a1.8 1.8 0 0 0 .4-2A1.8 1.8 0 0 0 2.9 13H3V9h-.1A1.8 1.8 0 0 0 4.4 7.4a1.8 1.8 0 0 0-.4-2l-.1-.1 2.8-2.8.1.1a1.8 1.8 0 0 0 2 .4A1.8 1.8 0 0 0 10 1.1V1h4v.1A1.8 1.8 0 0 0 15.2 3a1.8 1.8 0 0 0 2-.4l.1-.1 2.8 2.8-.1.1a1.8 1.8 0 0 0-.4 2A1.8 1.8 0 0 0 21.1 9h-.1v4h.1a1.8 1.8 0 0 0-1.7 2Z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
    play:'<path d="m8 5 11 7-11 7V5Z"/>',
    pause:'<path d="M9 5v14M15 5v14"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    arrowLeft:'<path d="M19 12H5"/><path d="m10 17-5-5 5-5"/>'
  };
  const MAP=new Map([
    ['📖','book'],['🗓️','calendar'],['🗓','calendar'],['📷','camera'],['🗂️','folder'],['🗂','folder'],['🩺','activity'],['📚','library'],['✏️','pencil'],['✏','pencil'],['⬇️','download'],['⬇','download'],['🖨️','printer'],['🖨','printer'],['✅','check'],['❌','x'],['⚠️','alert'],['⚠','alert'],['ℹ️','info'],['ℹ','info'],['🔄','refresh'],['💾','save'],['🔍','search'],['👤','user'],['🏠','home'],['📊','chart'],['📄','file'],['📥','download'],['📤','upload'],['🔒','lock'],['⚙️','settings'],['⚙','settings'],['➕','plus'],['➖','minus'],['▶️','play'],['▶','play'],['⏸️','pause'],['⏸','pause'],['⏱️','clock'],['⏱','clock'],['←','arrowLeft']
  ]);
  const keys=[...MAP.keys()].sort((a,b)=>b.length-a.length);
  const re=new RegExp(keys.map(k=>k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'gu');
  function svg(name){return `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${ICONS[name]||ICONS.info}</svg>`}
  function span(name){const el=document.createElement('span');el.className='cq-ui-icon';el.setAttribute('aria-hidden','true');el.innerHTML=svg(name);return el}
  function replaceTextNode(node){const text=node.nodeValue||'';re.lastIndex=0;if(!re.test(text))return;re.lastIndex=0;const frag=document.createDocumentFragment();let last=0,m;while((m=re.exec(text))){if(m.index>last)frag.appendChild(document.createTextNode(text.slice(last,m.index)));frag.appendChild(span(MAP.get(m[0])));last=m.index+m[0].length;if(text[last]===' ')last++;}if(last<text.length)frag.appendChild(document.createTextNode(text.slice(last)));node.parentNode&&node.parentNode.replaceChild(frag,node)}
  const selector='button,a,[role="button"],.menu-item,.nav-item,.sidebar,.topbar,h1,h2,h3,.page-title,.page-sub,.badge,.toast,.empty-state,.pj-history-bar,.pj-history-actions';
  function processElement(el){if(!(el instanceof Element))return;const targets=[];if(el.matches?.(selector))targets.push(el);el.querySelectorAll?.(selector).forEach(x=>targets.push(x));targets.forEach(t=>{const w=document.createTreeWalker(t,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||['SCRIPT','STYLE','TEXTAREA','INPUT','OPTION','CODE','PRE'].includes(p.tagName)||p.closest('.cq-ui-icon'))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT}});const ns=[];while(w.nextNode())ns.push(w.currentNode);ns.forEach(replaceTextNode)})}
  function installStyle(){if(document.getElementById('cq-ui-icon-style'))return;const s=document.createElement('style');s.id='cq-ui-icon-style';s.textContent='.cq-ui-icon{display:inline-flex;width:1.05em;height:1.05em;align-items:center;justify-content:center;vertical-align:-.16em;margin-right:.38em;flex:0 0 auto}.cq-ui-icon svg{display:block;width:100%;height:100%}button .cq-ui-icon,a .cq-ui-icon{vertical-align:-.14em}';document.head.appendChild(s)}
  function init(){installStyle();if(document.body)processElement(document.body);const mo=new MutationObserver(ms=>ms.forEach(m=>{if(m.type==='characterData'&&m.target.parentElement)processElement(m.target.parentElement);m.addedNodes.forEach(n=>{if(n.nodeType===1)processElement(n);else if(n.nodeType===3&&n.parentElement)processElement(n.parentElement)})}));if(document.body)mo.observe(document.body,{subtree:true,childList:true,characterData:true});window.__cqIconObserver=mo}
  window.CQIcons={svg,process:processElement};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();