(function(){
window.__cqAdminUsersV2=true;
const URL=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/admin-users';
let roles={};
let st={users:[],q:'',sort:'az',role:'',edit:null,adding:false,photos:{}};
const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function say(v,f='Perubahan belum dapat disimpan.'){if(!v)return f;if(typeof v==='string')return v;if(v instanceof Error)return v.message||f;return v.message||v.details||v.error||v.hint||f}
async function api(action,p={}){const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token');const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':token||''},body:JSON.stringify({action,...p})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false){const m={invalid_username:'Username minimal 4 karakter; gunakan huruf kecil, angka, titik, atau underscore.',password_too_short:'Password minimal 8 karakter.',username_taken:'Username sudah digunakan.',name_required:'Nama guru wajib diisi.',cannot_disable_self:'Akun Admin yang sedang dipakai tidak dapat dinonaktifkan.',cannot_remove_own_admin:'Role Admin pada akun yang sedang dipakai tidak dapat dihapus.',role_required:'Pilih minimal satu role akses.',invalid_or_inactive_role:'Role tidak aktif atau tidak tersedia. Muat ulang daftar pengguna.',admin_account_required:'Akun admin utama harus tetap aktif dengan role Admin.',teacher_already_has_account:'Guru ini sudah memiliki akun.',reserved_admin_username:'Username admin utama tidak dapat diganti.',forbidden:'Sesi admin tidak valid. Silakan login ulang.'};throw new Error(m[d.error]||d.message||d.error||'Perubahan belum dapat disimpan.')}return d}
function applyRoleOptions(d){roles={};if(Array.isArray(d?.role_options))d.role_options.forEach(x=>{if(x?.id)roles[String(x.id)]=String(x.name||x.id)});}

/* Warna lembut per role agar pembagian role mudah dibedakan */
const TONES=[['#e6f4f1','#0a6e6e'],['#eef0fb','#3f4fa8'],['#fdf1e4','#a5600f'],['#f4ecfa','#7a3fa0'],['#e9f3fb','#1f6a9a'],['#fbeef0','#a83a52'],['#eef6e6','#4d7a1f'],['#f3f1ea','#6b5b2e'],['#e7f5f7','#13707f'],['#fbefe8','#b0472a'],['#eef1f4','#46566a'],['#f6efe1','#8a6a12']];
function tone(code){if(code==='admin')return['#123634','#ffffff'];const keys=Object.keys(roles);let i=keys.indexOf(code);if(i<0){i=0;for(const ch of String(code))i=(i*31+ch.charCodeAt(0))>>>0}return TONES[i%TONES.length]}
function pill(code,label){const [bg,fg]=tone(code);return `<span class="av2pill av2role" style="background:${bg};color:${fg}">${esc(label||roles[code]||code)}</span>`}
function userRoles(u){const codes=Array.isArray(u.roles)?u.roles:[];const labels=Array.isArray(u.role_labels)?u.role_labels:[];if(codes.length)return codes.map((c,i)=>[c,labels[i]||roles[c]||c]);return labels.map(l=>{const c=Object.keys(roles).find(k=>roles[k]===l)||l;return[c,l]})}
const active=u=>String(u.status).toUpperCase()==='AKTIF';

function style(){if(document.getElementById('adm-v2-css'))return;const x=document.createElement('style');x.id='adm-v2-css';x.textContent=`
.av2{max-width:1180px;margin:auto;color:#123634}
.av2h{display:flex;justify-content:space-between;align-items:flex-end;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.av2title{font-size:24px;font-weight:800;color:#123634}
.av2sub{font-size:12.5px;color:#5f7775;margin-top:4px;line-height:1.5}
.av2add{border:0;border-radius:10px;background:#0a6e6e;color:#fff;padding:0 16px;min-height:40px;font-weight:700;font-size:13px;cursor:pointer}
.av2card{background:#fff;border:1px solid #dbe8e6;border-radius:16px;padding:16px}
.av2card+.av2card{margin-top:14px}
.av2sec{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#5f7775;margin:0 0 10px}
.av2dist{display:flex;flex-wrap:wrap;gap:8px}
.av2chipbtn{display:inline-flex;align-items:center;gap:8px;border:1px solid #dbe8e6;background:#fff;border-radius:999px;padding:6px 8px 6px 12px;font:inherit;font-size:12.5px;font-weight:600;color:#2c4a48;cursor:pointer;transition:background .12s,border-color .12s}
.av2chipbtn:hover{background:#f3f9f8}
.av2chipbtn b{min-width:24px;text-align:center;border-radius:999px;padding:2px 7px;font-size:11.5px;background:#eef4f3;color:#2c4a48}
.av2chipbtn.on{background:#0a6e6e;border-color:#0a6e6e;color:#fff}
.av2chipbtn.on b{background:rgba(255,255,255,.2);color:#fff}
.av2dot{display:inline-block;width:9px;height:9px;border-radius:50%;flex:none}
.av2bar{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap}
.av2bar>b{font-size:14px}
.av2count{font-weight:600;color:#5f7775;font-size:12.5px;margin-left:6px}
.av2tools{display:flex;gap:8px;align-items:center;margin-left:auto}
.av2search{height:40px;min-width:260px;border:1px solid #cddfdc;border-radius:10px;padding:0 12px;font:inherit;font-size:13px}
.av2sort{height:40px;min-width:130px;border:1px solid #cddfdc;border-radius:10px;padding:0 10px;background:#fff;font:inherit;font-size:13px}
.av2wrap{overflow:auto;border:1px solid #e1eceb;border-radius:12px;max-height:calc(100vh - 330px);min-height:220px}
.av2table{width:100%;border-collapse:separate;border-spacing:0;min-width:640px}
.av2table th,.av2table td{padding:11px 14px;border-bottom:1px solid #edf3f3;font-size:13px;text-align:left;vertical-align:middle}
.av2table th{background:#f4f8f8;font-size:10.5px;font-weight:800;letter-spacing:.07em;color:#5f7775;text-transform:uppercase;position:sticky;top:0;z-index:2}
.av2table tr.editing td{background:#f1faf7!important}
.av2table tr.inactive .av2name,.av2table tr.inactive .av2av{opacity:.55}
.av2table td.cq-action-col{background:inherit}
.av2who{display:flex;align-items:center;gap:12px;min-width:0}
.av2av,.av2idav{position:relative;overflow:hidden}.av2photo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border-radius:50%;background:#fff}
.av2av{width:36px;height:36px;border-radius:50%;flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:800;letter-spacing:.02em}
.av2name{font-weight:700;color:#123634;line-height:1.3}
.av2user{font-size:12px;color:#5f7775;margin-top:2px}
.av2table td:first-child{min-width:240px}
.av2roles{display:flex;flex-wrap:wrap;gap:4px}
.av2pill{display:inline-block;padding:4px 10px;border-radius:999px;background:#edf7f6;color:#0a6e6e;font-size:11.5px;font-weight:700;white-space:nowrap}
.av2pill.off{background:#fff1ed;color:#a84a38}
.av2pill.ok{background:#e8f6ee;color:#1d7a46}
.av2none{font-size:12px;color:#a84a38}
.av2btn{border:1px solid #cddfdc;background:#fff;border-radius:10px;padding:0 14px;min-height:36px;font:inherit;font-size:12.5px;font-weight:700;color:#123634;cursor:pointer}
.av2btn.save{background:#0a6e6e;color:#fff;border-color:#0a6e6e}
.av2form{border-color:#9fd3c9;box-shadow:0 8px 24px rgba(10,110,110,.08)}
.av2formh{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px}
.av2formh b{font-size:15px}
.av2grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.av2field label{display:block;font-size:12px;font-weight:700;color:#2c4a48;margin-bottom:5px}
.av2in,.av2sel{width:100%;height:40px;border:1px solid #cddfdc;border-radius:10px;padding:0 10px;font:inherit;font-size:13px;background:#fff;box-sizing:border-box}
.av2rolepick{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:8px;margin-top:6px}
.av2rolepick .av2opt{position:relative;display:flex!important;margin:0!important;align-items:center;gap:9px;border:1px solid #dbe8e6;border-radius:12px;padding:10px 12px;font-size:13px;font-weight:600;color:#2c4a48;cursor:pointer;background:#fff;transition:border-color .12s,background .12s}
.av2opt:hover{border-color:#9fd3c9}
.av2opt input{width:16px;height:16px;margin:0;accent-color:#0a6e6e;flex:none}
.av2opt:has(input:checked){border-color:#0a6e6e;background:#eef8f6;color:#0b4f4c}
.av2row{cursor:pointer}.av2row:hover td{background:#f3faf8}.av2row:hover .av2name{color:#0a6e6e;text-decoration:underline;text-underline-offset:3px}
.av2modal{position:fixed;inset:0;z-index:100001;background:rgba(9,34,32,.5);display:flex;align-items:center;justify-content:center;padding:18px;animation:av2fade .15s ease}
@keyframes av2fade{from{opacity:0}to{opacity:1}}
.av2modal *{box-sizing:border-box}
.av2modal-box{width:100%;max-width:600px;max-height:92vh;display:flex;flex-direction:column;background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 30px 80px rgba(5,40,38,.35);color:#123634;font-family:inherit}
.av2idhead{position:relative;display:flex;align-items:center;gap:16px;padding:22px 24px;background:linear-gradient(110deg,#064a45 0%,#0a6e6e 55%,#13907f 100%);color:#fff}
.av2idav{width:68px;height:68px;border-radius:50%;flex:none;display:inline-flex;align-items:center;justify-content:center;font-size:24px;font-weight:800;border:3px solid rgba(255,255,255,.85);box-shadow:0 6px 16px rgba(0,0,0,.18)}
.av2idmeta{flex:1;min-width:0}
.av2idname{font-size:19px;font-weight:800;line-height:1.25;overflow:hidden;text-overflow:ellipsis}
.av2iduser{font-size:13px;opacity:.85;margin-top:2px}
.av2idroles{display:flex;flex-wrap:wrap;gap:5px;margin-top:9px}
.av2idroles .av2pill{border:1px solid rgba(255,255,255,.5)}
.av2x{position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;border:0;background:rgba(255,255,255,.16);color:#fff;font-size:15px;cursor:pointer}
.av2x:hover{background:rgba(255,255,255,.28)}
.av2idbody{padding:20px 24px 6px;overflow:auto}
.av2secnote{font-weight:600;letter-spacing:0;text-transform:none;color:#7a908e;margin-left:6px}
.av2grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.av2field.wide{grid-column:1/-1}
.av2small{display:block;font-size:11.5px;color:#6a817f;margin-top:5px}
.av2idfoot{display:flex;justify-content:flex-end;gap:8px;padding:14px 24px;border-top:1px solid #e8efee;background:#fafcfc}
.av2idfoot .av2btn{min-height:40px;padding:0 18px}
.av2btn:disabled{opacity:.6;cursor:wait}
@media(max-width:560px){.av2modal{padding:0;align-items:flex-end}.av2modal-box{max-height:94vh;border-radius:20px 20px 0 0}.av2grid2{grid-template-columns:1fr}.av2idhead{padding:18px}.av2idav{width:56px;height:56px;font-size:20px}}
.av2actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;flex-wrap:wrap}
.av2hint{font-size:12px;color:#5f7775;margin-top:10px;line-height:1.55}
@media(max-width:900px){.av2grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:700px){.av2tools{width:100%;flex-direction:column;align-items:stretch}.av2search,.av2sort{min-width:0;width:100%}.av2grid{grid-template-columns:1fr}.av2wrap{max-height:none}.av2add{width:100%}}
`;document.head.appendChild(x)}
window.__cqAdminV2Style=style;

function roleSelect(id,values){const selected=(Array.isArray(values)?values:[values]).filter(Boolean);const options={...roles};selected.forEach(r=>{if(!options[r])options[r]=r});return `<div id="${id}" class="av2rolepick">${Object.keys(options).map(r=>{const [bg,fg]=tone(r);return `<label class="av2opt"><input type="checkbox" value="${esc(r)}" ${selected.includes(r)?'checked':''}><span class="av2dot" style="background:${r==='admin'?bg:fg}"></span>${esc(options[r])}</label>`}).join('')}</div>`}
function selectedRoles(id){return [...document.getElementById(id).querySelectorAll('input:checked')].map(x=>x.value)}

/* Kartu identitas pop-up: klik nama/baris untuk melihat, mengedit, dan menyimpan di satu tempat */
function cardHtml(){const u=st.edit?st.users.find(x=>x.id===st.edit):null;const isNew=!u;
 const id=k=>isNew?{n:'av2n',u:'av2u',r:'av2r',p:'av2p',s:'av2s'}[k]:k+'_'+u.id;
 const on=isNew?true:active(u);const rs=isNew?[]:userRoles(u);const [abg,afg]=tone((rs[0]||['guru'])[0]);
 return `<div class="av2modal-box" role="dialog" aria-modal="true" aria-labelledby="av2-card-name">
 <div class="av2idhead">
  <span class="av2idav" style="background:${abg};color:${afg}"><span id="av2-card-av">${esc(isNew?'+':initials(u.name))}</span>${isNew?'':photoImg(u)}</span>
  <div class="av2idmeta"><div class="av2idname" id="av2-card-name">${isNew?'Guru / Pengguna Baru':esc(u.name)}</div><div class="av2iduser" id="av2-card-user">${isNew?'Isi data di bawah':'@'+esc(u.username)}</div>
   ${isNew?'':`<div class="av2idroles">${rs.map(([c,l])=>pill(c,l)).join('')}<span class="av2pill ${on?'ok':'off'}">${on?'Aktif':'Nonaktif'}</span></div>`}</div>
  <button type="button" class="av2x" onclick="adminV2Cancel()" aria-label="Tutup">✕</button>
 </div>
 <div class="av2idbody">
  <div class="av2sec">Data Akun</div>
  <div class="av2grid2">
   <div class="av2field wide"><label for="${id('n')}">Nama lengkap</label><input id="${id('n')}" class="av2in" value="${isNew?'':esc(u.name)}" placeholder="Nama guru / pengguna" oninput="adminV2Live()"></div>
   <div class="av2field"><label for="${id('u')}">Username</label><input id="${id('u')}" class="av2in" value="${isNew?'':esc(u.username)}" placeholder="username" autocomplete="off" oninput="adminV2Live()"></div>
   <div class="av2field"><label for="${id('s')}">Status akun</label><select id="${id('s')}" class="av2sel"><option ${on?'selected':''}>AKTIF</option><option ${on?'':'selected'}>NONAKTIF</option></select></div>
   <div class="av2field wide"><label for="${id('p')}">${isNew?'Password':'Password baru'}</label><input id="${id('p')}" class="av2in" type="password" autocomplete="new-password" placeholder="${isNew?'Minimal 8 karakter':'Kosongkan jika tidak diganti'}"><small class="av2small">${isNew?'Berikan password ini ke guru secara langsung.':'Password lama tidak bisa dilihat. Isi hanya jika guru lupa password.'}</small></div>
  </div>
  <div class="av2sec" style="margin-top:18px">Role Akses <span class="av2secnote">boleh lebih dari satu</span></div>
  ${roleSelect(id('r'),isNew?['guru']:(u.roles||['guru']))}
  <div class="av2hint">Kelas, mapel, Partner, dan Tahfizh diatur di <b>Penugasan Guru</b>. Mengubah role membuat pengguna perlu login ulang.</div>
 </div>
 <div class="av2idfoot"><button type="button" class="av2btn" onclick="adminV2Cancel()">Batal</button><button type="button" class="av2btn save" id="av2-card-save" onclick="${isNew?'adminV2SaveNew()':`adminV2Save('${u.id}')`}">${isNew?'Tambah Pengguna':'Simpan Perubahan'}</button></div>
 </div>`}
function openCard(){closeCard(true);const m=document.createElement('div');m.className='av2modal';m.id='av2-modal';m.innerHTML=cardHtml();m.addEventListener('mousedown',e=>{if(e.target===m)window.adminV2Cancel()});document.body.appendChild(m);document.addEventListener('keydown',escKey);setTimeout(()=>m.querySelector('.av2in')?.focus?.(),30)}
function closeCard(){document.getElementById('av2-modal')?.remove();document.removeEventListener('keydown',escKey)}
function escKey(e){if(e.key==='Escape')window.adminV2Cancel()}
window.adminV2Live=()=>{const m=document.getElementById('av2-modal');if(!m)return;const ins=m.querySelectorAll('.av2in');const n=ins[0]?.value.trim(),u=ins[1]?.value.trim();const nm=document.getElementById('av2-card-name'),us=document.getElementById('av2-card-user'),av=document.getElementById('av2-card-av');if(nm&&n)nm.textContent=n;if(us)us.textContent=u?'@'+u:'';if(av&&n)av.textContent=initials(n)}

/* Foto profil: tampil di atas inisial; kalau gagal dimuat, inisial tetap terlihat */
function photoImg(u){const src=u&&st.photos[u.id];return src?`<img class="av2photo" src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">`:''}
async function loadPhotos(){try{const d=await api('list_photos');st.photos=d.photos||{};if(!Object.keys(st.photos).length)return;const b=document.getElementById('av2-body');if(b)b.innerHTML=tbody()}catch(_){/* fungsi server lama: tetap pakai inisial */}}
function initials(n){const w=String(n||'').replace(/,.*$/,'').split(/\s+/).filter(x=>/^[A-Za-z]/.test(x));return((w[0]||'?')[0]+((w[1]||'')[0]||'')).toUpperCase()}
function row(u){const rs=userRoles(u);const [abg,afg]=tone((rs[0]||[''])[0]);return `<tr class="av2row${active(u)?'':' inactive'}" onclick="adminV2Edit('${u.id}')" title="Klik untuk membuka kartu"><td><div class="av2who"><span class="av2av" style="background:${abg};color:${afg}">${esc(initials(u.name))}${photoImg(u)}</span><div><div class="av2name">${esc(u.name)}</div><div class="av2user">@${esc(u.username)}</div></div></div></td><td><div class="av2roles">${rs.length?rs.map(([c,l])=>pill(c,l)).join(''):'<span class="av2none">Belum ada role</span>'}</div></td><td><span class="av2pill ${active(u)?'ok':'off'}">${active(u)?'Aktif':'Nonaktif'}</span></td><td style="text-align:right"><button type="button" class="av2btn" onclick="event.stopPropagation();adminV2Edit('${u.id}')">Edit</button></td></tr>`}

function distribution(){const count={};let off=0;st.users.forEach(u=>{if(!active(u))off++;userRoles(u).forEach(([c])=>{count[c]=(count[c]||0)+1})});const codes=[...new Set([...Object.keys(roles),...Object.keys(count)])].filter(c=>count[c]>0||st.role===c);
 const chip=(val,label,n,dot)=>`<button type="button" class="av2chipbtn${st.role===val?' on':''}" onclick="adminV2Role('${esc(val)}')">${dot?`<span class="av2dot" style="background:${dot}"></span>`:''}${esc(label)}<b>${n}</b></button>`;
 return `<div class="av2card"><div class="av2sec">Pembagian Role</div><div class="av2dist">${chip('','Semua',st.users.length)}${codes.map(c=>{const [bg,fg]=tone(c);return chip(c,roles[c]||c,count[c]||0,c==='admin'?bg:fg)}).join('')}${off?chip('__off','Nonaktif',off,'#a84a38'):''}</div></div>`}

function sortUsers(us){const t=u=>{const n=Date.parse(u.created_at||u.createdAt||u.updated_at||u.updatedAt||'');return Number.isFinite(n)?n:0};const byName=(a,b)=>String(a.name||'').localeCompare(String(b.name||''),'id');return us.sort((a,b)=>st.sort==='za'?byName(b,a):st.sort==='newest'?t(b)-t(a)||byName(a,b):st.sort==='oldest'?t(a)-t(b)||byName(a,b):byName(a,b))}
function filtered(){let us=st.users.slice();const q=st.q.toLowerCase();if(st.role==='__off')us=us.filter(u=>!active(u));else if(st.role)us=us.filter(u=>userRoles(u).some(([c])=>c===st.role));if(q)us=us.filter(u=>[u.name,u.username,userRoles(u).map(x=>x[1]).join(' ')].join(' ').toLowerCase().includes(q));return sortUsers(us)}
function tbody(){const us=filtered();return us.map(row).join('')||'<tr><td colspan="4" style="text-align:center;color:#5f7775;padding:28px">Tidak ada pengguna yang cocok.</td></tr>'}

function draw(c){if(!c)return;const us=filtered();c.innerHTML=`<div class="av2"><div class="av2h"><div><div class="av2title">Guru & Pengguna</div><div class="av2sub">Kelola akun dan role akses setiap guru atau pengguna.</div></div><button type="button" class="av2add" onclick="adminV2Add()">+ Tambah Guru / Pengguna</button></div>
 ${distribution()}
 <div class="av2card"><div class="av2bar"><b>Daftar Pengguna<span class="av2count" id="av2-count">${us.length} dari ${st.users.length}</span></b><div class="av2tools"><input class="av2search" placeholder="Cari nama, username, atau role" value="${esc(st.q)}" oninput="adminV2Q(this.value)"><select class="av2sort" onchange="adminV2Sort(this.value)"><option value="az" ${st.sort==='az'?'selected':''}>A–Z</option><option value="za" ${st.sort==='za'?'selected':''}>Z–A</option><option value="newest" ${st.sort==='newest'?'selected':''}>Terbaru</option><option value="oldest" ${st.sort==='oldest'?'selected':''}>Terlama</option></select></div></div>
 <div class="av2wrap"><table class="av2table"><thead><tr><th>Nama</th><th>Role</th><th>Status</th><th style="text-align:right">Aksi</th></tr></thead><tbody id="av2-body">${tbody()}</tbody></table></div>
 <div class="av2hint">Klik nama guru untuk membuka kartunya dan mengedit di sana. Klik nama role di atas untuk menyaring daftar.</div></div></div>`}
/* Saat mengetik di kolom cari, cukup perbarui isi tabel agar fokus input tidak hilang */
function redrawList(){const b=document.getElementById('av2-body');if(!b)return draw(document.getElementById('content'));b.innerHTML=tbody();const n=document.getElementById('av2-count');if(n)n.textContent=filtered().length+' dari '+st.users.length}

async function load(c){style();c.innerHTML='<div class="av2"><div class="av2card">Memuat daftar guru...</div></div>';try{const d=await api('list_users');applyRoleOptions(d);st.users=Array.isArray(d.users)?d.users:[];draw(c);loadPhotos()}catch(x){c.innerHTML=`<div class="av2"><div class="av2card">${esc(say(x))}</div></div>`}}
window.renderAdminUsers=load;
window.adminV2Q=v=>{st.q=v;redrawList()};
window.adminV2Sort=v=>{st.sort=v||'az';redrawList()};
window.adminV2Role=v=>{st.role=st.role===v?'':v;draw(document.getElementById('content'))};
async function refreshRoles(){try{const d=await api('list_users');applyRoleOptions(d);st.users=Array.isArray(d.users)?d.users:st.users}catch(x){}}
window.adminV2Add=async()=>{await refreshRoles();st.adding=true;st.edit=null;openCard()};
window.adminV2Edit=async id=>{try{await refreshRoles();if(!st.users.some(u=>u.id===id))throw new Error('Data pengguna tidak ditemukan. Muat ulang halaman.');st.edit=id;st.adding=false;openCard()}catch(x){if(typeof showToast==='function')showToast(say(x),true)}};
window.adminV2Cancel=()=>{st.edit=null;st.adding=false;closeCard()};
function busy(on){const b=document.getElementById('av2-card-save');if(!b)return;if(on){b.dataset.t=b.textContent;b.textContent='Menyimpan…';b.disabled=true}else{b.textContent=b.dataset.t||b.textContent;b.disabled=false}}
window.adminV2SaveNew=async()=>{busy(true);try{await api('create_user',{name:document.getElementById('av2n').value,username:document.getElementById('av2u').value,password:document.getElementById('av2p').value,status:document.getElementById('av2s').value,roles:selectedRoles('av2r')});st.adding=false;closeCard();if(typeof showToast==='function')showToast('Pengguna berhasil ditambahkan.');await load(document.getElementById('content'))}catch(x){busy(false);if(typeof showToast==='function')showToast(say(x),true)}};
window.adminV2Save=async id=>{busy(true);try{const result=await api('save_user',{user_id:id,name:document.getElementById('n_'+id).value,username:document.getElementById('u_'+id).value,roles:selectedRoles('r_'+id),password:document.getElementById('p_'+id).value,status:document.getElementById('s_'+id).value});st.edit=null;closeCard();if(result.reauth_required){if(typeof showToast==='function')showToast('Role tersimpan. Silakan login ulang.');if(typeof logout==='function')await logout();return}if(typeof showToast==='function')showToast('Data pengguna berhasil disimpan.');await load(document.getElementById('content'))}catch(x){if(typeof showToast==='function')showToast(say(x),true)}};
let n=0;(function bind(){try{if(typeof MODULE_GROUPS!=='undefined'){let g=MODULE_GROUPS.find(x=>x.id==='administrasi');if(g){let i=g.items&&g.items.find(x=>x.id==='kelola-pengguna');if(!i){i={id:'kelola-pengguna',label:'Guru & Pengguna',roles:['admin'],built:true,render:load};g.items.push(i)}else{i.roles=['admin'];i.built=true;i.render=load}return}}}catch{}if(++n<80)setTimeout(bind,100)})();
})();
