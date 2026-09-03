(function(){
  const replacements=[
    [/Google Apps Script/gi,'sistem'],[/Apps Script/gi,'sistem'],[/Supabase/gi,'sistem'],[/GitHub Pages/gi,'sistem'],[/GitHub/gi,'sistem'],[/Google\s*Sheets?/gi,'sistem'],[/Spreadsheet/gi,'sistem'],[/signed\s*URL/gi,'tautan foto'],[/backend/gi,'sistem'],[/database/gi,'sistem data'],[/Google Drive/gi,'arsip'],[/DriveApp/gi,'arsip'],[/SHEET_ID/gi,'konfigurasi data']
  ];
  function cleanText(v){let s=String(v||'');for(const [rx,to] of replacements)s=s.replace(rx,to);return s.replace(/\b(?:sheet)\s+["“”']?([A-Za-z0-9_ -]+)["“”']?/gi,'data $1');}
  function cleanNode(root){
    if(!root)return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,{acceptNode:n=>{const p=n.parentElement;if(!p||['SCRIPT','STYLE','CODE','PRE'].includes(p.tagName))return NodeFilter.FILTER_REJECT;return NodeFilter.FILTER_ACCEPT;}});
    const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);nodes.forEach(n=>{const x=cleanText(n.nodeValue);if(x!==n.nodeValue)n.nodeValue=x;});
    if(root.querySelectorAll){root.querySelectorAll('[placeholder],[title],[aria-label]').forEach(el=>['placeholder','title','aria-label'].forEach(a=>{if(el.hasAttribute(a)){const old=el.getAttribute(a)||'',nu=cleanText(old);if(old!==nu)el.setAttribute(a,nu);}}));}
  }
  function run(){cleanNode(document.body)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  const obs=new MutationObserver(ms=>{for(const m of ms){m.addedNodes.forEach(n=>{if(n.nodeType===1)cleanNode(n);else if(n.nodeType===3){const x=cleanText(n.nodeValue);if(x!==n.nodeValue)n.nodeValue=x;}})}});
  document.addEventListener('DOMContentLoaded',()=>{if(document.body)obs.observe(document.body,{childList:true,subtree:true,characterData:true})},{once:true});
  window.CQNeutralUI={clean:run,cleanText};
})();