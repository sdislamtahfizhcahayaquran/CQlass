(function(){
'use strict';
let roles=[];
const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
const RPC=BASE+'/rest/v1/rpc/role_catalog_manage';
function key(){return typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:''}
function token(){return typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||''}
function currentRole(){try{return String((typeof currentUser!=='undefined'&&currentUser?.role)||JSON.parse(localStorage.getItem('cqlass_user')||'{}').role||'').toLowerCase()}catch{return''}}
async function rpc(action,p={}){const k=key();const r=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json','apikey':k,'Authorization':'Bearer '+k},body:JSON.stringify({p_session_token:token(),p_action:action,p_role_code:p.role_code||null,p_display_name:p.display_name||null,p_description:p.description||null,p_is_active:p.is_active??null})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.error||'Gagal memuat role.');return d}
async function loadRoles(){try{const d=await rpc('list');roles=Array.isArray(d.roles)?d.roles:[]}catch(e){console.warn('Role catalog:',e);roles=[]}return roles}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function roleRow(r){const code=esc(r.role_code),active=!!r.is_active;return '<tr style="border-top:1px solid #eee"><td style="padding:12px"><b>'+esc(r.display_name)+'</b><div style="font-size:12px;color:#667085">'+esc(r.description||'')+'</div></td><td style="padding:12px"><code>'+code+'</code></td><td style="padding:12px">'+(active?'Aktif':'Nonaktif')+'</td><td style="padding:12px;text-align:right;white-space:nowrap"><button class="btn btn-secondary" onclick="cqRoleEdit(\''+code+'\')">Edit</button> <button class="btn btn-secondary" '+(r.role_code==='admin'&&active?'disabled title="Role Admin wajib aktif"':'')+' onclick="cqRoleToggle(\''+code+'\','+(!active)+')">'+(active?'Nonaktifkan':'Aktifkan')+'</button></td></tr>'}
async function renderRoleManager(){await loadRoles();const c=document.getElementById('content');if(!c)return;c.innerHTML='<div style="max-width:1050px;margin:0 auto;padding:18px"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><h2 style="margin:0 0 6px">Kelola Role</h2><div style="color:#667085">Satu sumber role Admin. Role aktif otomatis tersedia di Guru & Pengguna.</div></div><button class="btn" onclick="cqRoleNew()">+ Tambah Role</button></div><div id="cq-role-form" style="display:none;margin-top:16px;padding:16px;border:1px solid #e5e7eb;border-radius:16px;background:#fff"><input type="hidden" id="cq-role-original"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><label>Nama Role</label><input id="cq-role-name" class="form-control"></div><div><label>Kode Role</label><input id="cq-role-code" class="form-control"></div></div><div style="margin-top:12px"><label>Deskripsi</label><input id="cq-role-desc" class="form-control"></div><div style="margin-top:14px;display:flex;gap:8px"><button class="btn" onclick="cqRoleSave()">Simpan Role</button><button class="btn btn-secondary" onclick="document.getElementById(\'cq-role-form\').style.display=\'none\'">Batal</button></div></div><div style="margin-top:16px;background:#fff;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f8fafc"><th style="padding:12px;text-align:left">Nama</th><th style="padding:12px;text-align:left">Kode</th><th style="padding:12px;text-align:left">Status</th><th style="padding:12px;text-align:right">Aksi</th></tr></thead><tbody>'+roles.map(roleRow).join('')+'</tbody></table></div></div>'}
window.renderRoleManager=renderRoleManager;
window.cqRoleNew=function(){document.getElementById('cq-role-original').value='';document.getElementById('cq-role-name').value='';document.getElementById('cq-role-code').value='';document.getElementById('cq-role-code').disabled=false;document.getElementById('cq-role-desc').value='';document.getElementById('cq-role-form').style.display='block'};
window.cqRoleEdit=function(code){const r=roles.find(x=>x.role_code===code);if(!r)return;document.getElementById('cq-role-original').value=code;document.getElementById('cq-role-name').value=r.display_name||'';document.getElementById('cq-role-code').value=r.role_code||'';document.getElementById('cq-role-code').disabled=true;document.getElementById('cq-role-desc').value=r.description||'';document.getElementById('cq-role-form').style.display='block';document.getElementById('cq-role-form').scrollIntoView({behavior:'smooth',block:'nearest'})};
window.cqRoleSave=async function(){const original=document.getElementById('cq-role-original')?.value.trim(),name=document.getElementById('cq-role-name')?.value.trim(),code=document.getElementById('cq-role-code')?.value.trim(),description=document.getElementById('cq-role-desc')?.value.trim();if(!name){showToast?.('Nama role wajib diisi.',true);return}try{const old=roles.find(x=>x.role_code===(original||code));await rpc('upsert',{role_code:original||code||name,display_name:name,description,is_active:old?old.is_active:true});showToast?.(original?'Role berhasil diperbarui.':'Role berhasil ditambahkan.');await renderRoleManager()}catch(e){showToast?.(e.message,true)}};
window.cqRoleToggle=async function(code,is_active){try{await rpc('toggle',{role_code:code,is_active});showToast?.(is_active?'Role diaktifkan.':'Role dinonaktifkan.');await renderRoleManager()}catch(e){showToast?.(e.message==='admin_role_required'?'Role Admin wajib tetap aktif.':e.message,true)}};

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
let n=0;(function hook(){if(typeof window.adminMasterDownload==='function'&&!window.adminMasterDownload.__sourceFallback){const f=async function(id){try{const d=await source(id);if(d.file_base64)downloadBase64(d);else if(d.external_url)downloadExternal(d.external_url,d.file_name);else throw new Error('File sumber belum tersedia.')}catch(e){if(typeof showToast==='function')showToast(e.message||'File sumber belum dapat diunduh.',true)}};f.__sourceFallback=true;window.adminMasterDownload=f;return}if(++n<80)setTimeout(hook,100)})();
})();

/* Load Admin table UX: sticky action column + reachable Save/Cancel controls. */
(function(){
  if(document.querySelector('script[data-cq-admin-sticky]'))return;
  var s=document.createElement('script');
  s.src='admin-table-sticky-actions.js?v=20260917-1';
  s.defer=true;
  s.dataset.cqAdminSticky='1';
  document.head.appendChild(s);
})();

