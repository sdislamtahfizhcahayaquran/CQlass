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

/* Data Master: file sumber hasil seed Drive tetap dapat diunduh dari Admin. */
(function(){
'use strict';
const REST=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/rest/v1/rpc/admin_master_download_source';
function key(){return typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:''}
function token(){return typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')}
function downloadBase64(d){const bin=atob(d.file_base64||''),arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);const u=URL.createObjectURL(new Blob([arr],{type:d.mime_type||'application/octet-stream'}));const a=document.createElement('a');a.href=u;a.download=d.file_name||'master.xlsx';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
function downloadExternal(url,fileName){const m=String(url||'').match(/\/d\/([^/?]+)/);const href=m?'https://drive.usercontent.google.com/download?id='+encodeURIComponent(m[1])+'&export=download&confirm=t':url;if(!href)throw new Error('File sumber belum tersedia.');const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';if(fileName)a.download=fileName;document.body.appendChild(a);a.click();a.remove()}
async function source(id){const k=key();const r=await fetch(REST,{method:'POST',headers:{'Content-Type':'application/json','apikey':k,'Authorization':'Bearer '+k},body:JSON.stringify({p_id:id,p_session_token:token()||''})});const d=await r.json().catch(()=>({}));if(!r.ok||d?.success===false)throw new Error(d?.error==='admin_only'?'Akses hanya untuk Admin.':d?.error||'File sumber belum dapat diunduh.');return d}
let n=0;(function hook(){if(typeof window.adminMasterDownload==='function'&&!window.adminMasterDownload.__sourceFallback){const f=async function(id){try{const d=await source(id);if(d.file_base64)downloadBase64(d);else if(d.external_url)downloadExternal(d.external_url,d.file_name);else throw new Error('File sumber belum tersedia.') }catch(e){if(typeof showToast==='function')showToast(e.message||'File sumber belum dapat diunduh.',true)}};f.__sourceFallback=true;window.adminMasterDownload=f;return}if(++n<80)setTimeout(hook,100)})();
})();