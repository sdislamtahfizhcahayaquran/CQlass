(function(){
'use strict';
let users=[];
const URL=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/admin-users';
async function loadUsers(){try{const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token');const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'','Authorization':'Bearer '+(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:''),'x-session-token':token||''},body:JSON.stringify({action:'list_users'})});const d=await r.json();if(r.ok&&d.success!==false)users=Array.isArray(d.users)?d.users:[]}catch{}}
function patchSelect(s){if(!s||s.dataset.hrdPatched)return;s.dataset.hrdPatched='1';if(!Array.from(s.options).some(o=>o.value==='hrd'))s.add(new Option('HRD','hrd'));const m=String(s.id||'').match(/^r_(.+)$/);if(m){const u=users.find(x=>String(x.id)===m[1]);if((u?.roles||[]).includes('hrd'))s.value='hrd'}}
function scan(){document.querySelectorAll('#av2r,select[id^="r_"]').forEach(patchSelect)}
const mo=new MutationObserver(()=>scan());document.addEventListener('DOMContentLoaded',async()=>{await loadUsers();scan();mo.observe(document.body,{childList:true,subtree:true})});
const oldEdit=window.adminV2Edit;let tries=0;(function hook(){if(typeof window.adminV2Edit==='function'&&!window.adminV2Edit.__hrd){const orig=window.adminV2Edit;const f=async function(id){if(!users.length)await loadUsers();const out=await orig(id);setTimeout(scan,0);return out};f.__hrd=true;window.adminV2Edit=f;return}if(++tries<80)setTimeout(hook,100)})();
})();