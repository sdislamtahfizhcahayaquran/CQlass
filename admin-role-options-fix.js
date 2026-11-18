(function(){
'use strict';
let roles=[];
const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
const RPC=BASE+'/rest/v1/rpc/role_catalog_manage';
function key(){return typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:''}
function token(){return typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||''}
async function rpc(action,p={}){const k=key();const r=await fetch(RPC,{method:'POST',headers:{'Content-Type':'application/json','apikey':k,'Authorization':'Bearer '+k},body:JSON.stringify({p_session_token:token(),p_action:action,p_role_code:p.role_code||null,p_display_name:p.display_name||null,p_description:p.description||null,p_is_active:p.is_active??null})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.error||'Gagal memuat role.');return d}
async function loadRoles(){try{const d=await rpc('list');roles=Array.isArray(d.roles)?d.roles:[]}catch(e){console.warn('Role catalog:',e);roles=[]}return roles}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function style(){
 if(typeof window.__cqAdminV2Style==='function')window.__cqAdminV2Style();
 if(document.getElementById('cq-role-mgr-css'))return;
 const x=document.createElement('style');x.id='cq-role-mgr-css';
 x.textContent=`.crm{max-width:1050px;margin:auto;color:#123634}
.crm-h{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.crm-add{border:0;border-radius:10px;background:#0a6e6e;color:#fff;padding:0 16px;min-height:40px;font:inherit;font-weight:700;font-size:13px;cursor:pointer}
.crm-info{margin:0 0 14px;padding:14px 16px 14px 34px;background:#f3f9f8;border:1px solid #dbe8e6;border-radius:14px;font-size:12.5px;line-height:1.6;color:#2c4a48}
.crm-info li+li{margin-top:2px}
.crm-card{background:#fff;border:1px solid #dbe8e6;border-radius:16px;padding:16px}
.crm-card+.crm-card{margin-top:14px}
.crm-form{border-color:#9fd3c9;box-shadow:0 8px 24px rgba(10,110,110,.08)}
.crm-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.crm-field label{display:block;font-size:12px;font-weight:700;color:#2c4a48;margin-bottom:5px}
.crm-field small{display:block;font-size:11.5px;color:#5f7775;margin-top:4px}
.crm-in{width:100%;height:40px;border:1px solid #cddfdc;border-radius:10px;padding:0 10px;font:inherit;font-size:13px;box-sizing:border-box}
.crm-in:disabled{background:#f4f8f8;color:#5f7775}
.crm-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:14px}
.crm-btn{border:1px solid #cddfdc;background:#fff;border-radius:10px;padding:0 14px;min-height:36px;font:inherit;font-size:12.5px;font-weight:700;color:#123634;cursor:pointer}
.crm-btn.save{background:#0a6e6e;border-color:#0a6e6e;color:#fff}
.crm-btn.warn{color:#a84a38}
.crm-btn:disabled{opacity:.5;cursor:not-allowed}
.crm-table{width:100%;border-collapse:separate;border-spacing:0}
.crm-table th,.crm-table td{padding:12px 14px;border-bottom:1px solid #edf3f3;font-size:13px;text-align:left;vertical-align:middle}
.crm-table th{background:#f4f8f8;font-size:10.5px;font-weight:800;letter-spacing:.07em;color:#5f7775;text-transform:uppercase}
.crm-table tr:last-child td{border-bottom:0}
.crm-table tr.off td{background:#fcfcfb}
.crm-table tr.off .crm-name{color:#7a918f}
.crm-name{font-weight:700}
.crm-desc{font-size:12px;color:#5f7775;margin-top:2px}
.crm-code{font-family:ui-monospace,Consolas,monospace;font-size:12px;background:#f4f8f8;border:1px solid #e1eceb;border-radius:6px;padding:2px 6px}
.crm-pill{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:700;background:#e8f6ee;color:#1d7a46}
.crm-pill.off{background:#fff1ed;color:#a84a38}
.crm-act{text-align:right;white-space:nowrap}
.crm-act .crm-btn+.crm-btn{margin-left:6px}
.crm-wrap{overflow:auto;border:1px solid #e1eceb;border-radius:12px}
.crm-sec{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#5f7775;margin:0 0 10px}
@media(max-width:700px){.crm-grid{grid-template-columns:1fr}.crm-table{min-width:560px}.crm-add{width:100%}}`;
 document.head.appendChild(x)}
function roleRow(r){const code=esc(r.role_code),active=!!r.is_active,lockAdmin=r.role_code==='admin'&&active;return `<tr class="${active?'':'off'}"><td><div class="crm-name">${esc(r.display_name)}</div>${r.description?`<div class="crm-desc">${esc(r.description)}</div>`:''}</td><td><span class="crm-code">${code}</span></td><td><span class="crm-pill ${active?'':'off'}">${active?'Aktif':'Nonaktif'}</span></td><td class="crm-act"><button type="button" class="crm-btn" onclick="cqRoleEdit('${code}')">Edit</button><button type="button" class="crm-btn ${active?'warn':''}" ${lockAdmin?'disabled title="Role Admin wajib aktif"':''} onclick="cqRoleToggle('${code}',${!active})">${active?'Nonaktifkan':'Aktifkan'}</button></td></tr>`}
async function renderRoleManager(){style();await loadRoles();const c=document.getElementById('content');if(!c)return;
 const on=roles.filter(r=>r.is_active),off=roles.filter(r=>!r.is_active);
 const table=(list)=>`<div class="crm-wrap"><table class="crm-table"><thead><tr><th>Nama Role</th><th>Kode</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody>${list.map(roleRow).join('')}</tbody></table></div>`;
 c.innerHTML=`<div class="crm"><div class="crm-h"><div><div class="av2title">Daftar Role</div><div class="av2sub">Atur jenis role akses yang tersedia. Role dibagikan ke akun lewat menu Guru &amp; Pengguna.</div></div><button type="button" class="crm-add" onclick="cqRoleNew()">+ Tambah Role</button></div>
 <ul class="crm-info">
  <li>Tugas mengajar dan kelas diatur di <b>Penugasan Guru</b>, bukan di sini. Partner dan Tahfizh juga termasuk tugas di sana.</li>
  <li>Menonaktifkan role mencabut role itu dari semua akun dan mengakhiri sesi mereka. Mengaktifkan kembali <b>tidak</b> memulihkan akses lama.</li>
  <li>Role baru belum punya izin fitur apa pun. Pengabdian bertugas sebagai badal sesuai penugasan, tanpa akses pengelola.</li>
 </ul>
 <div id="cq-role-form" class="crm-card crm-form" style="display:none;margin-bottom:14px"><input type="hidden" id="cq-role-original"><div class="crm-sec" id="cq-role-form-title">Tambah Role</div><div class="crm-grid"><div class="crm-field"><label for="cq-role-name">Nama Role</label><input id="cq-role-name" class="crm-in" placeholder="Contoh: Koordinator Tahfizh"></div><div class="crm-field"><label for="cq-role-code">Kode Role</label><input id="cq-role-code" class="crm-in" placeholder="contoh: koord_tahfizh"><small>Tidak dapat diubah setelah disimpan.</small></div></div><div class="crm-field" style="margin-top:12px"><label for="cq-role-desc">Deskripsi</label><input id="cq-role-desc" class="crm-in" placeholder="Singkat: apa saja yang bisa dilakukan role ini"></div><div class="crm-actions"><button type="button" class="crm-btn" onclick="document.getElementById('cq-role-form').style.display='none'">Batal</button><button type="button" class="crm-btn save" onclick="cqRoleSave()">Simpan Role</button></div></div>
 <div class="crm-card"><div class="crm-sec">Role aktif (${on.length})</div>${on.length?table(on):'<div class="crm-desc">Belum ada role aktif.</div>'}</div>
 ${off.length?`<div class="crm-card"><div class="crm-sec">Role nonaktif (${off.length})</div>${table(off)}</div>`:''}
 </div>`}
window.renderRoleManager=renderRoleManager;
function openForm(title){const f=document.getElementById('cq-role-form');document.getElementById('cq-role-form-title').textContent=title;f.style.display='block';f.scrollIntoView?.({behavior:'smooth',block:'nearest'});document.getElementById('cq-role-name').focus?.()}
window.cqRoleNew=function(){document.getElementById('cq-role-original').value='';document.getElementById('cq-role-name').value='';document.getElementById('cq-role-code').value='';document.getElementById('cq-role-code').disabled=false;document.getElementById('cq-role-desc').value='';openForm('Tambah Role')};
window.cqRoleEdit=function(code){const r=roles.find(x=>x.role_code===code);if(!r)return;document.getElementById('cq-role-original').value=code;document.getElementById('cq-role-name').value=r.display_name||'';document.getElementById('cq-role-code').value=r.role_code||'';document.getElementById('cq-role-code').disabled=true;document.getElementById('cq-role-desc').value=r.description||'';openForm('Edit Role: '+(r.display_name||code))};
window.cqRoleSave=async function(){const original=document.getElementById('cq-role-original')?.value.trim(),name=document.getElementById('cq-role-name')?.value.trim(),code=document.getElementById('cq-role-code')?.value.trim(),description=document.getElementById('cq-role-desc')?.value.trim();if(!name){showToast?.('Nama role wajib diisi.',true);return}try{const old=roles.find(x=>x.role_code===(original||code));await rpc('upsert',{role_code:original||code||name,display_name:name,description,is_active:old?old.is_active:true});showToast?.(original?'Role berhasil diperbarui.':'Role berhasil ditambahkan.');await renderRoleManager()}catch(e){showToast?.(e.message,true)}};
window.cqRoleToggle=async function(code,is_active){try{const result=await rpc('toggle',{role_code:code,is_active});if(result.reauth_required){if(typeof showToast==='function')showToast('Role tersimpan. Silakan login ulang.');if(typeof logout==='function')await logout();return}showToast?.(is_active?'Role diaktifkan.':'Role dinonaktifkan.');await renderRoleManager()}catch(e){showToast?.(e.message==='admin_role_required'?'Role Admin wajib tetap aktif.':e.message,true)}};

})();
