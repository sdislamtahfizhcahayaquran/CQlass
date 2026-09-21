/* CQlass — Periode & Kunci Penginputan */
(function(){
'use strict';
if(window.__cqInputAccessControl)return;
window.__cqInputAccessControl=true;

const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
const RPC=BASE+'/rest/v1/rpc/input_access_api_v1';
const originalFetch=window.fetch.bind(window);
const STATE={loaded:false,loading:false,isAdmin:false,rules:[],access:{},admin:null,lastLoad:0};

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const token=()=>{try{return (typeof getAuthToken==='function'?getAuthToken():'')||localStorage.getItem('cqlass_session_token')||sessionStorage.getItem('cqlass_session_token')||''}catch{return''}};
const toast=(m,bad=false)=>{try{if(typeof showToast==='function')return showToast(m,bad)}catch{};console[bad?'warn':'log']('[Input Access]',m)};
const pad=n=>String(n).padStart(2,'0');
const toLocalInput=v=>{if(!v)return'';const d=new Date(v);if(Number.isNaN(d.getTime()))return'';return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`};
const toIso=v=>{if(!v)return null;const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()};
const fmt=v=>{if(!v)return'—';try{return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(v))+' WIB'}catch{return String(v)}};

async function rpc(action,payload={}){
  const t=token();
  if(!t)throw new Error('Sesi CQlass tidak ditemukan. Silakan login ulang.');
  const r=await originalFetch(RPC,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY},body:JSON.stringify({p_session_token:t,p_action:action,p_payload:payload})});
  let d=await r.json().catch(()=>({}));
  if(!r.ok||d?.success===false){
    const map={session_invalid:'Sesi berakhir. Silakan login ulang.',forbidden:'Akses hanya untuk Admin.',module_required:'Modul belum dipilih.',invalid_mode:'Mode akses tidak valid.',invalid_datetime:'Tanggal/jam tidak valid.',deadline_before_start:'Deadline harus setelah waktu mulai.',rule_not_found:'Aturan modul tidak ditemukan.',exception_fields_required:'Guru, modul, dan batas waktu wajib diisi.',exception_expiry_invalid:'Batas dispensasi harus setelah waktu mulai.',user_not_found:'Pengguna tidak ditemukan.',exception_not_found:'Dispensasi tidak ditemukan.'};
    throw new Error(map[d?.error]||d?.detail||d?.error||'Perubahan belum dapat disimpan.');
  }
  return d;
}

async function refresh(force=false){
  if(STATE.loading)return STATE;
  const t=token();if(!t)return STATE;
  if(!force&&STATE.loaded&&Date.now()-STATE.lastLoad<30000)return STATE;
  STATE.loading=true;
  try{
    const d=await rpc('status');
    STATE.loaded=true;STATE.isAdmin=!!d.is_admin;STATE.rules=d.rules||[];STATE.access=d.access||{};STATE.lastLoad=Date.now();
    window.dispatchEvent(new CustomEvent('cq-input-access-updated',{detail:STATE}));
  }catch(e){console.warn('[Input Access] status gagal:',e)}finally{STATE.loading=false}
  return STATE;
}
function allowed(moduleKey){
  if(!STATE.loaded)return true;
  const x=STATE.access?.[moduleKey];
  return !x||x.allowed!==false;
}
function lockMessage(moduleKey){
  const a=STATE.access?.[moduleKey]||{};
  const r=STATE.rules.find(x=>x.module_key===moduleKey)||{};
  if(a.reason==='not_started'||a.reason==='global_not_started')return `Penginputan ${r.module_label||moduleKey} belum dibuka${a.opens_at?' sampai '+fmt(a.opens_at):''}.`;
  if(a.reason==='deadline_passed'||a.reason==='global_deadline_passed')return `Penginputan ${r.module_label||moduleKey} telah ditutup${a.closes_at?' sejak '+fmt(a.closes_at):''}. Silakan hubungi Admin jika memerlukan pembukaan akses.`;
  return `Penginputan ${r.module_label||moduleKey} sedang ditutup oleh Admin. Data tetap dapat dilihat, tetapi perubahan tidak dapat disimpan.`;
}
function guard(moduleKey,show=true){
  if(allowed(moduleKey))return true;
  if(show)toast(lockMessage(moduleKey),true);
  return false;
}

window.cqInputAccess={state:STATE,refresh,allowed,guard,lockMessage,rpc};

function parseAction(init){
  try{if(!init?.body||typeof init.body!=='string')return'';const b=JSON.parse(init.body);return String(b.action||b.p_action||'').toLowerCase()}catch{return''}
}
function writeAction(a){return /^(save|save_|savebatch|save_batch|upsert|create|update|delete|remove|submit|add|insert|import|record|set_|mark|finalize|approve)/.test(String(a||''))}
function classify(url,action){
  const u=String(url||'').toLowerCase(),a=String(action||'').toLowerCase();
  if(u.includes('/rest/v1/rpc/input_access_api_v1'))return null;
  if(u.includes('/functions/v1/academic-fast-save'))return 'academic_scores';
  if(u.includes('/functions/v1/academic-scores')&&writeAction(a))return 'academic_scores';
  if(u.includes('/functions/v1/tahfizh-pts-public')&&writeAction(a))return 'tahfizh_pts';
  if((u.includes('/functions/v1/activity-extracurricular')||u.includes('/functions/v1/extracurricular-raw'))&&writeAction(a))return 'extracurricular_internal';
  if(u.includes('/functions/v1/extracurricular-external-pts')&&writeAction(a))return 'extracurricular_external';
  if(u.includes('/functions/v1/student-points')&&writeAction(a))return 'student_points';
  if(u.includes('/functions/v1/attendance')&&writeAction(a))return 'attendance';
  if((u.includes('/functions/v1/school-activity')||u.includes('/functions/v1/kegiatan-report'))&&writeAction(a))return 'school_activity';
  if((u.includes('/functions/v1/rpp')||u.includes('/functions/v1/lp-monitoring'))&&writeAction(a))return 'rpp';
  if(u.includes('/functions/v1/timesheet')&&writeAction(a))return 'timesheet';
  return null;
}

window.fetch=async function(input,init){
  const url=typeof input==='string'?input:(input?.url||'');
  const action=parseAction(init);
  const moduleKey=classify(url,action);
  if(moduleKey){
    if(!STATE.loaded)await refresh(true);
    if(!guard(moduleKey,true)){
      return new Response(JSON.stringify({success:false,error:'input_closed',message:lockMessage(moduleKey),module_key:moduleKey}),{status:423,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
    }
  }
  return originalFetch(input,init);
};

function injectCss(){
  if(document.getElementById('cq-input-access-css'))return;
  const s=document.createElement('style');s.id='cq-input-access-css';s.textContent=`
  .iac{max-width:1460px;margin:0 auto;color:#173d3b}.iac-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-end;flex-wrap:wrap;margin-bottom:16px}.iac-title{font-size:24px;font-weight:900}.iac-sub{font-size:11px;color:#6c8583;margin-top:4px}.iac-card{background:#fff;border:1px solid #d8e6e4;border-radius:16px;padding:16px;margin-bottom:14px;box-shadow:0 7px 22px rgba(20,70,68,.05)}.iac-global{border:2px solid #c9dfdc;background:linear-gradient(135deg,#f8fcfb,#fff)}.iac-row{display:grid;grid-template-columns:minmax(190px,1.4fr) 120px minmax(175px,1fr) minmax(175px,1fr) 160px 210px;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid #edf3f2}.iac-row:last-child{border-bottom:0}.iac-th{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:.05em;color:#79908e}.iac-name{font-size:11px;font-weight:850}.iac-key{font-size:8px;color:#92a5a3;margin-top:2px}.iac-input,.iac-select{width:100%;height:38px;border:1px solid #bfd2d0;border-radius:9px;background:#fff;padding:0 9px;font:600 10px Inter,system-ui,sans-serif;color:#173d3b}.iac-actions{display:flex;gap:5px;flex-wrap:wrap}.iac-btn{border:1px solid #bfd2d0;background:#fff;color:#24524f;border-radius:9px;padding:8px 10px;font-size:9px;font-weight:850;cursor:pointer}.iac-btn.primary{background:#0b7773;border-color:#0b7773;color:#fff}.iac-btn.danger{background:#fff1ef;border-color:#f0c9c2;color:#a43b2c}.iac-btn.open{background:#effaf6;border-color:#bfe5d6;color:#176b50}.iac-pill{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:6px 9px;font-size:9px;font-weight:900}.iac-pill.open{background:#e9f8f1;color:#176b50}.iac-pill.closed{background:#fff0ed;color:#a43b2c}.iac-pill.pending{background:#fff7df;color:#8d6711}.iac-dot{width:7px;height:7px;border-radius:50%;background:currentColor}.iac-section-title{font-size:14px;font-weight:900;margin-bottom:4px}.iac-section-sub{font-size:10px;color:#728a88;margin-bottom:12px}.iac-ex-form{display:grid;grid-template-columns:1.1fr 1.3fr 1fr 1.2fr auto;gap:9px;align-items:end}.iac-label{display:block;font-size:8px;text-transform:uppercase;font-weight:900;color:#7d9290;margin-bottom:5px}.iac-ex-item{display:grid;grid-template-columns:1.4fr 1fr 1fr 1.5fr auto;gap:8px;align-items:center;padding:9px 0;border-top:1px solid #edf3f2;font-size:9px}.iac-empty{padding:18px;text-align:center;color:#7f9391;font-size:10px}.iac-help{padding:11px 13px;border-radius:12px;background:#f4f9f8;font-size:9px;line-height:1.6;color:#607a77;margin-top:10px}.iac-loading{padding:28px;text-align:center}.iac-badge-admin{font-size:9px;font-weight:900;background:#edf7f6;border:1px solid #c5dfdc;border-radius:999px;padding:7px 10px}.iac-toolbar{display:flex;gap:7px;flex-wrap:wrap}.iac-log{font-size:9px;color:#617b79;padding:7px 0;border-top:1px solid #eef3f2}.iac-log b{color:#274e4b}@media(max-width:1100px){.iac-row{grid-template-columns:1fr 110px 1fr 1fr}.iac-row>*:nth-child(5),.iac-row>*:nth-child(6){grid-column:auto}.iac-ex-form{grid-template-columns:1fr 1fr}.iac-ex-item{grid-template-columns:1fr 1fr}}@media(max-width:680px){.iac-row{grid-template-columns:1fr}.iac-th{display:none}.iac-ex-form,.iac-ex-item{grid-template-columns:1fr}.iac-card{padding:12px}}
  `;document.head.appendChild(s);
}
function statusFor(r){
  const now=Date.now();
  if(r.mode==='closed')return {c:'closed',t:'Ditutup'};
  if(r.mode==='open')return {c:'open',t:'Dibuka'};
  if(r.opens_at&&new Date(r.opens_at).getTime()>now)return {c:'pending',t:'Belum mulai'};
  if(r.closes_at&&new Date(r.closes_at).getTime()<=now)return {c:'closed',t:'Deadline lewat'};
  return {c:'open',t:'Dibuka'};
}
function modeOpts(v){return `<option value="auto" ${v==='auto'?'selected':''}>Otomatis sesuai jadwal</option><option value="open" ${v==='open'?'selected':''}>Selalu dibuka</option><option value="closed" ${v==='closed'?'selected':''}>Ditutup manual</option>`}
function moduleOpts(rules,val=''){return (rules||[]).map(r=>`<option value="${esc(r.module_key)}" ${r.module_key===val?'selected':''}>${esc(r.module_label)}</option>`).join('')}
function userOpts(users){return `<option value="">Pilih guru / pengguna</option>`+(users||[]).map(u=>`<option value="${esc(u.id)}">${esc(u.name)}${u.username&&u.username!==u.name?' — '+esc(u.username):''}</option>`).join('')}
function rowHtml(r,header=false){
  if(header)return `<div class="iac-row iac-th"><div>Modul</div><div>Status</div><div>Mulai Input</div><div>Deadline</div><div>Mode</div><div>Aksi</div></div>`;
  const st=statusFor(r),id=String(r.module_key).replace(/[^a-z0-9_-]/gi,'_');
  return `<div class="iac-row" data-iac-row="${esc(r.module_key)}"><div><div class="iac-name">${esc(r.module_label)}</div><div class="iac-key">${esc(r.module_key)}</div></div><div><span class="iac-pill ${st.c}"><i class="iac-dot"></i>${st.t}</span></div><div><input id="iac_open_${id}" class="iac-input" type="datetime-local" value="${esc(toLocalInput(r.opens_at))}"></div><div><input id="iac_close_${id}" class="iac-input" type="datetime-local" value="${esc(toLocalInput(r.closes_at))}"></div><div><select id="iac_mode_${id}" class="iac-select">${modeOpts(r.mode)}</select></div><div class="iac-actions"><button class="iac-btn primary" onclick="iacSaveRule('${esc(r.module_key)}')">Simpan</button><button class="iac-btn open" onclick="iacQuickMode('${esc(r.module_key)}','open')">Buka</button><button class="iac-btn danger" onclick="iacQuickMode('${esc(r.module_key)}','closed')">Tutup</button></div></div>`;
}
function renderAdmin(c,d){
  injectCss();STATE.admin=d;
  const rules=d.rules||[],global=rules.find(x=>x.module_key==='all_input'),modules=rules.filter(x=>x.module_key!=='all_input');
  const ex=d.exceptions||[];
  c.innerHTML=`<div class="iac"><div class="iac-head"><div><div class="iac-title">Periode & Kunci Penginputan</div><div class="iac-sub">Atur kapan guru dapat menginput, edit, atau menghapus data. Data lama tetap dapat dilihat.</div></div><div class="iac-toolbar"><span class="iac-badge-admin">Admin Control</span><button class="iac-btn" onclick="renderInputAccessControlAdmin(document.getElementById('content'))">↻ Muat ulang</button></div></div>${global?`<div class="iac-card iac-global"><div class="iac-section-title">Kunci Global</div><div class="iac-section-sub">Gunakan hanya bila seluruh penginputan CQlass perlu ditutup sekaligus. Admin tetap memiliki akses.</div>${rowHtml(global,true)}${rowHtml(global)}</div>`:''}<div class="iac-card"><div class="iac-section-title">Akses per Modul</div><div class="iac-section-sub">Mode “Otomatis sesuai jadwal” akan membuka dan menutup akses berdasarkan tanggal/jam yang ditentukan.</div>${rowHtml(null,true)}${modules.map(r=>rowHtml(r)).join('')}</div><div class="iac-card"><div class="iac-section-title">Buka Akses Khusus</div><div class="iac-section-sub">Dispensasi hanya untuk pengguna tertentu tanpa membuka akses guru lain.</div><div class="iac-ex-form"><div><label class="iac-label">Modul</label><select id="iac_ex_module" class="iac-select">${moduleOpts(rules.filter(x=>x.module_key!=='all_input'))}</select></div><div><label class="iac-label">Guru / Pengguna</label><select id="iac_ex_user" class="iac-select">${userOpts(d.users)}</select></div><div><label class="iac-label">Dibuka sampai</label><input id="iac_ex_until" class="iac-input" type="datetime-local"></div><div><label class="iac-label">Alasan (opsional)</label><input id="iac_ex_reason" class="iac-input" placeholder="Contoh: perbaikan nilai"></div><button class="iac-btn primary" onclick="iacGrantException()">Buka Khusus</button></div><div class="iac-help">Saat deadline lewat, pengguna tidak dapat menyimpan perubahan. Jika perlu koreksi, Admin cukup memberi dispensasi sementara pada guru tersebut; modul tidak perlu dibuka untuk semua orang.</div><div style="margin-top:12px">${ex.length?ex.map(x=>`<div class="iac-ex-item"><div><b>${esc(x.user?.name||x.user?.username||'Pengguna')}</b><br><span style="color:#839795">${esc(x.user?.username||'')}</span></div><div>${esc((rules.find(r=>r.module_key===x.module_key)||{}).module_label||x.module_key)}</div><div>Sampai ${esc(fmt(x.expires_at))}</div><div>${esc(x.reason||'—')}</div><button class="iac-btn danger" onclick="iacRevokeException('${esc(x.id)}')">Cabut</button></div>`).join(''):'<div class="iac-empty">Tidak ada dispensasi aktif.</div>'}</div></div><div class="iac-card"><div class="iac-section-title">Riwayat Perubahan</div><div class="iac-section-sub">50 aktivitas pengaturan terbaru.</div>${(d.audit||[]).length?(d.audit||[]).slice(0,20).map(a=>`<div class="iac-log"><b>${esc(String(a.action||'').replaceAll('_',' '))}</b> · ${esc((rules.find(r=>r.module_key===a.module_key)||{}).module_label||a.module_key||'Sistem')} · ${esc(fmt(a.created_at))}</div>`).join(''):'<div class="iac-empty">Belum ada perubahan.</div>'}</div></div>`;
  if(!document.getElementById('iac_ex_until'))return;
  const until=new Date(Date.now()+2*60*60*1000);document.getElementById('iac_ex_until').value=toLocalInput(until.toISOString());
}
window.renderInputAccessControlAdmin=async function(c){
  c=c||document.getElementById('content');if(!c)return;
  injectCss();c.innerHTML='<div class="iac"><div class="iac-card iac-loading">Memuat pengaturan akses...</div></div>';
  try{const d=await rpc('admin_list');renderAdmin(c,d)}catch(e){c.innerHTML=`<div class="iac"><div class="iac-card">${esc(e.message||e)}</div></div>`}
};
window.iacSaveRule=async function(moduleKey){
  const id=String(moduleKey).replace(/[^a-z0-9_-]/gi,'_');
  try{await rpc('save_rule',{module_key:moduleKey,mode:document.getElementById('iac_mode_'+id)?.value||'auto',opens_at:toIso(document.getElementById('iac_open_'+id)?.value),closes_at:toIso(document.getElementById('iac_close_'+id)?.value)});toast('Pengaturan akses berhasil disimpan.');await refresh(true);await window.renderInputAccessControlAdmin(document.getElementById('content'))}catch(e){toast(e.message||String(e),true)}
};
window.iacQuickMode=async function(moduleKey,mode){
  try{const d=STATE.admin||await rpc('admin_list'),r=(d.rules||[]).find(x=>x.module_key===moduleKey);await rpc('save_rule',{module_key:moduleKey,mode,opens_at:r?.opens_at||null,closes_at:r?.closes_at||null});toast(mode==='closed'?'Penginputan ditutup.':'Penginputan dibuka.');await refresh(true);await window.renderInputAccessControlAdmin(document.getElementById('content'))}catch(e){toast(e.message||String(e),true)}
};
window.iacGrantException=async function(){
  const moduleKey=document.getElementById('iac_ex_module')?.value,userId=document.getElementById('iac_ex_user')?.value,until=document.getElementById('iac_ex_until')?.value,reason=document.getElementById('iac_ex_reason')?.value||'';
  try{if(!userId)throw new Error('Pilih guru / pengguna terlebih dahulu.');await rpc('grant_exception',{module_key:moduleKey,user_account_id:userId,expires_at:toIso(until),reason});toast('Akses khusus berhasil dibuka.');await window.renderInputAccessControlAdmin(document.getElementById('content'))}catch(e){toast(e.message||String(e),true)}
};
window.iacRevokeException=async function(id){try{await rpc('revoke_exception',{exception_id:id});toast('Dispensasi dicabut.');await window.renderInputAccessControlAdmin(document.getElementById('content'))}catch(e){toast(e.message||String(e),true)}};
window.openCleanAdminInputAccess=function(){window.__cqAdminActive='input-access';try{if(typeof renderSidebar==='function')renderSidebar()}catch{};window.renderInputAccessControlAdmin(document.getElementById('content'))};

function patchModule(){
  try{
    if(typeof MODULE_GROUPS!=='undefined'){
      let g=MODULE_GROUPS.find(x=>x.id==='administrasi');if(!g){g={id:'administrasi',label:'Administrasi',roles:['admin'],items:[]};MODULE_GROUPS.push(g)}
      if(!g.items.some(x=>x.id==='input-access'))g.items.push({id:'input-access',label:'Periode & Kunci Input',roles:['admin'],built:true,render:window.renderInputAccessControlAdmin});
    }
  }catch{}
}
let tries=0;(function boot(){patchModule();if(token())refresh(true);if(++tries<25&&typeof MODULE_GROUPS==='undefined')setTimeout(boot,150)})();
setInterval(()=>{if(token())refresh(true)},60000);
window.addEventListener('focus',()=>{if(token())refresh(true)});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&token())refresh(true)});
})();