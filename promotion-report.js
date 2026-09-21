/* CQlass — Bukti Promosi Sekolah */
(function(){
'use strict';
if(window.__cqPromotionReportV7)return;window.__cqPromotionReportV7=true;
const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
const API=BASE+'/functions/v1/promotion-report';
const BASE_ROLES=['admin','hrd','guru','walas','wali_kelas','pimpinan','kepsek','kepala_sekolah','akademik','academic','kesiswaan','tahfizh','kegiatan','guru_partner','partner','kabid_akademik','kabid_kesiswaan','kabid_tahfizh','kabid_kegiatan'];
const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[m]));
const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch{return''}};
const role=()=>{try{return String((typeof currentUser!=='undefined'&&currentUser?.role)||JSON.parse(localStorage.getItem('cqlass_user')||'{}').role||'').trim().toLowerCase()}catch{return''}};
const roles=()=>[...BASE_ROLES];
const monitorOnly=()=>['hrd','admin'].includes(role());
const blocked=()=>role()==='sapras';
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const monthStart=()=>today().slice(0,8)+'01';
const fmt=v=>{if(!v)return'-';const p=String(v).slice(0,10).split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:String(v)};
function notify(msg,err=false){try{if(typeof showToast==='function')return showToast(msg,err)}catch{}if(err)console.error(msg)}
function headers(){return{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':token()}}
async function api(body){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);
  try{
    const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify(body),signal:ctrl.signal});
    const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch{throw Error('Respons server promosi tidak valid.')}
    if(!r.ok||d.success===false){const code=d.error||'request_failed';if(code==='image_too_large')throw Error('Foto maksimal 2 MB.');if(code==='session_invalid')throw Error('Sesi login berakhir. Silakan login ulang.');throw Error(d.message||code)}
    return d;
  }catch(e){if(e?.name==='AbortError')throw Error('Server promosi terlalu lama merespons.');if(e instanceof TypeError)throw Error('Tidak dapat terhubung ke server promosi.');throw e}
  finally{clearTimeout(timer)}
}
function css(){if(document.getElementById('promo-report-style'))return;const s=document.createElement('style');s.id='promo-report-style';s.textContent=`
.pr-shell{display:grid;gap:15px;max-width:1180px;margin:auto;color:#173f3e}.pr-hero{padding:24px 26px;border-radius:22px;background:linear-gradient(135deg,#075d5b,#10877e);color:#fff}.pr-hero h1{margin:4px 0 6px;font-size:27px}.pr-hero p{margin:0;opacity:.86;font-size:13px}.pr-grid{display:grid;grid-template-columns:minmax(310px,.8fr) minmax(0,1.2fr);gap:15px}.pr-card{background:#fff;border:1px solid #dce8e7;border-radius:18px;padding:18px;box-shadow:0 7px 24px rgba(13,72,72,.06)}.pr-card h2{font-size:17px;margin:0 0 4px}.pr-card>p{font-size:11px;color:#6b8080;margin:0 0 15px}.pr-form{display:grid;gap:11px}.pr-form label{display:grid;gap:5px;font-size:11px;font-weight:800;color:#375454}.pr-form input,.pr-form textarea{width:100%;box-sizing:border-box;border:1px solid #d4e4e2;border-radius:11px;padding:10px 11px;font:inherit;background:#fbfdfd}.pr-form button,.pr-reload{border:0;border-radius:11px;padding:11px 13px;background:#0a7771;color:#fff;font-weight:850;cursor:pointer}.pr-form button:disabled{opacity:.55}.pr-preview{display:none;width:100%;max-height:240px;object-fit:cover;border-radius:13px}.pr-status{padding:10px 12px;border-radius:12px;font-size:11px;font-weight:800}.pr-status.ok{background:#e8f7ef;color:#177145}.pr-status.bad{background:#fff2f1;color:#a04039}.pr-status.wait{background:#eef6f7;color:#56716f}.pr-list-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:12px}.pr-list{display:grid;gap:10px}.pr-item{display:grid;grid-template-columns:100px 1fr auto;gap:12px;align-items:center;border:1px solid #dce9e8;border-radius:14px;padding:10px}.pr-item img{width:100px;height:76px;object-fit:cover;border-radius:10px;background:#edf5f4}.pr-item b{display:block;font-size:12px}.pr-item span,.pr-item small{display:block;color:#6d8383;font-size:10px;margin-top:4px}.pr-delete{border:0;background:#fdeceb;color:#a43d36;border-radius:9px;padding:8px;font-weight:800;cursor:pointer}.pr-empty{padding:34px 12px;text-align:center;color:#758b89;font-size:12px}.pr-error{background:#fff4f3;border:1px solid #f2d3d0;border-radius:13px;padding:18px;text-align:center;color:#973c36}.pr-error button{display:inline-block;margin-top:10px}.pr-count{font-size:11px;font-weight:900;background:#edf8f6;color:#16736c;border-radius:999px;padding:5px 9px}.pr-monitor{max-width:780px}.pr-monitor strong{display:block;font-size:15px;margin-bottom:7px}.pr-monitor p{font-size:12px;line-height:1.65;color:#607877;margin:0}@media(max-width:760px){.pr-grid{grid-template-columns:1fr}.pr-item{grid-template-columns:76px 1fr}.pr-item img{width:76px;height:64px}.pr-delete{grid-column:1/-1}}
`;document.head.appendChild(s)}
async function compress(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{try{const max=1600,scale=Math.min(1,max/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);resolve(c.toDataURL('image/jpeg',.82))}catch(e){URL.revokeObjectURL(url);reject(e)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Foto tidak dapat dibaca.'))};img.src=url})}
async function load(){
  const box=document.getElementById('pr-list'),status=document.getElementById('pr-status'),count=document.getElementById('pr-count');if(!box)return;
  status.className='pr-status wait';status.textContent='Memeriksa status…';box.innerHTML='<div class="pr-empty">Memuat riwayat promosi…</div>';
  try{
    const d=await api({action:'my',start:monthStart(),end:today()}),items=d.items||[];
    status.className='pr-status '+(d.fulfilled?'ok':'bad');status.textContent=d.fulfilled?'✓ Kewajiban bulan ini sudah terpenuhi.':'Belum memenuhi: unggah minimal 1 foto promosi bulan ini.';if(count)count.textContent=items.length;
    box.innerHTML=items.length?items.map(x=>`<article class="pr-item"><a href="${esc(x.photo_url||'#')}" target="_blank" rel="noopener"><img src="${esc(x.photo_url||'')}" alt="Bukti promosi" onerror="this.style.opacity='.25'"></a><div><b>${esc(x.title||'Promosi Sekolah')}</b><span>${esc(x.description||'Tanpa keterangan')}</span><small>${fmt(x.activity_date)}</small></div><button class="pr-delete" type="button" data-del="${esc(x.id)}">Hapus</button></article>`).join(''):'<div class="pr-empty">Belum ada foto promosi pada bulan ini.</div>';
    box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>remove(b.dataset.del));
  }catch(e){
    status.className='pr-status bad';status.textContent='Gagal memeriksa status promosi.';if(count)count.textContent='!';box.innerHTML=`<div class="pr-error"><b>Riwayat promosi gagal dimuat.</b><br><span>${esc(e.message||'Gagal terhubung.')}</span><br><button class="pr-reload" type="button" id="pr-retry">Muat Ulang</button></div>`;document.getElementById('pr-retry').onclick=load;
  }
}
function render(){
  css();const c=document.getElementById('content');if(!c)return;
  if(blocked()){c.innerHTML='<div class="pr-shell"><section class="pr-card"><h2>Akses tidak tersedia</h2><p>Role Sapras tidak menggunakan fitur Promosi.</p></section></div>';return;}
  if(monitorOnly()){
    c.innerHTML=`<div class="pr-shell"><section class="pr-hero"><small>MONITORING PROMOSI</small><h1>Laporan Promosi</h1><p>Menu Promosi tersedia di semua role. HRD/Admin menggunakan halaman ini sebagai akses monitoring, bukan penginputan.</p></section><section class="pr-card pr-monitor"><strong>Mode monitoring</strong><p>Input foto promosi dilakukan oleh pegawai pelaksana. HRD/Admin tetap memantau kelengkapan promosi melalui Live Report sehingga tidak ada input ganda dari role monitoring.</p></section></div>`;
    return;
  }
  c.innerHTML=`<div class="pr-shell"><section class="pr-hero"><small>LAPORAN BULANAN</small><h1>Bukti Promosi Sekolah</h1><p>Setiap pegawai wajib mengunggah minimal satu foto promosi pada periode laporan.</p></section><div class="pr-grid"><section class="pr-card"><h2>Tambah Bukti</h2><p>Satu kegiatan menggunakan satu foto yang jelas.</p><div id="pr-status" class="pr-status wait">Memeriksa status…</div><form class="pr-form" id="pr-form" style="margin-top:12px"><label>Tanggal kegiatan<input id="pr-date" type="date" value="${today()}" required></label><label>Judul kegiatan<input id="pr-title" maxlength="120" value="Promosi Sekolah" required></label><label>Keterangan singkat<textarea id="pr-desc" rows="3" maxlength="500" placeholder="Contoh: Membagikan informasi PPDB melalui status WhatsApp"></textarea></label><label>Foto promosi (wajib)<input id="pr-file" type="file" accept="image/jpeg,image/png,image/webp" required></label><img id="pr-preview" class="pr-preview" alt="Pratinjau foto"><button id="pr-save" type="submit">Simpan Foto Promosi</button></form></section><section class="pr-card"><div class="pr-list-head"><div><h2>Riwayat Bulan Ini</h2><p style="margin:3px 0 0;font-size:11px;color:#6b8080">Foto yang tersimpan otomatis masuk ke Live Report HRD.</p></div><span class="pr-count" id="pr-count">0</span></div><div id="pr-list" class="pr-list"></div></section></div></div>`;
  let encoded='';const f=document.getElementById('pr-file');f.onchange=async e=>{const file=e.target.files?.[0];if(!file)return;try{encoded=await compress(file);const p=document.getElementById('pr-preview');p.src=encoded;p.style.display='block'}catch(err){notify(err.message||'Foto gagal dibaca.',true)}};
  document.getElementById('pr-form').onsubmit=async e=>{e.preventDefault();if(!encoded)return notify('Pilih foto promosi terlebih dahulu.',true);const b=document.getElementById('pr-save');b.disabled=true;b.textContent='Menyimpan…';try{await api({action:'upload',activity_date:document.getElementById('pr-date').value,title:document.getElementById('pr-title').value,description:document.getElementById('pr-desc').value,mime_type:'image/jpeg',base64:encoded});notify('Foto promosi berhasil disimpan.');render()}catch(err){notify(err.message||'Gagal menyimpan foto promosi.',true);b.disabled=false;b.textContent='Simpan Foto Promosi'}};
  load();
}
async function remove(id){if(!id||!confirm('Hapus foto promosi ini?'))return;try{await api({action:'delete',id});notify('Foto promosi dihapus.');await load()}catch(e){notify(e.message||'Gagal menghapus foto promosi.',true)}}
function install(){if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;const rs=roles();let g=MODULE_GROUPS.find(x=>x&&x.id==='laporan');if(!g){g={id:'laporan',label:'Laporan',roles:[],items:[]};MODULE_GROUPS.push(g)}if(!Array.isArray(g.items))g.items=[];g.roles=[...new Set([...(g.roles||[]),...rs])];const obj={id:'laporan-promosi',label:'Laporan Promosi',roles:[...rs],built:true,render};const old=g.items.find(x=>x&&x.id===obj.id);if(old)Object.assign(old,obj);else g.items.push(obj);return true}
function ensureSidebarEntry(){
  const r=role(),sb=document.getElementById('sidebar');if(!r||!sb)return;
  if(r==='sapras'){sb.querySelectorAll('[data-cq-promotion-fallback],.nav-item,.menu-item,button,a').forEach(x=>{if(String(x.textContent||'').trim()==='Laporan Promosi'||x.dataset?.cqPromotionFallback)x.remove()});return;}
  const found=[...sb.querySelectorAll('.nav-item,.menu-item,button,a')].find(x=>String(x.textContent||'').trim()==='Laporan Promosi');if(found)return;
  const item=document.createElement('div');item.className='nav-item';item.dataset.cqPromotionFallback='1';item.innerHTML='<span>Laporan Promosi</span>';
  item.onclick=()=>{try{if(typeof activeModule!=='undefined')activeModule='laporan-promosi'}catch{}document.querySelectorAll('#sidebar .nav-item').forEach(x=>x.classList.remove('active'));item.classList.add('active');render()};
  sb.appendChild(item);
}
function hookSidebar(){
  if(typeof renderSidebar!=='function'||renderSidebar.__cqPromotionV7)return;
  const old=renderSidebar;const wrapped=function(){install();const out=old.apply(this,arguments);setTimeout(ensureSidebarEntry,0);return out};wrapped.__cqPromotionV7=true;renderSidebar=wrapped;
}
window.renderPromotionReport=render;window.deletePromotionReport=remove;
function start(){
  install();hookSidebar();
  if(typeof renderSidebar==='function')renderSidebar();
  setTimeout(ensureSidebarEntry,0);
  const sb=document.getElementById('sidebar');if(sb&&!sb.__cqPromotionObserver){sb.__cqPromotionObserver=true;new MutationObserver(()=>setTimeout(ensureSidebarEntry,0)).observe(sb,{childList:true,subtree:true})}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(start,120));else setTimeout(start,120);setTimeout(start,700);setTimeout(start,1600);
})();
