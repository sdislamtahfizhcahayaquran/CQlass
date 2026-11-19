/* CQlass — Nilai Pramuka (role tambahan "pembina_pramuka").
   Menu muncul di sidebar akun yang punya role ini, apa pun role utamanya (Guru/Walas tetap).
   Server memeriksa role, periode aktif, dan versi data. Nilai masuk Rapor IKM (Ekstrakurikuler, baris Pramuka). */
(function(){
'use strict';
const ROLE='pembina_pramuka',MOD='pramuka-nilai',GRADES=['A','B','C','D'];
const WORD={A:'Sangat Baik',B:'Baik',C:'Cukup',D:'Perlu Bimbingan'};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
function user(){try{return typeof currentUser!=='undefined'?currentUser:null}catch(_){return null}}
function hasRole(){const u=user();return!!u&&[u.role,...(Array.isArray(u.roles)?u.roles:[])].map(norm).includes(ROLE)}
async function api(action,payload={}){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);try{const r=await fetch(`${SUPABASE_URL}/functions/v1/admin-academic-period/pramuka`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':getAuthToken()},body:JSON.stringify({action,...payload}),signal:ctl.signal});const j=await r.json().catch(()=>({}));if(!r.ok||!j.success){const e=Error(j.error||'Gagal memproses Nilai Pramuka.');e.status=r.status;throw e}return j}finally{clearTimeout(timer)}}

/* ---------- Sidebar: satu item tambahan, dipasang ulang setiap sidebar digambar ulang ---------- */
function isActive(){try{return activeModule===MOD}catch(_){return false}}
function ensureMenu(){const sb=document.getElementById('sidebar');if(!sb)return;const old=sb.querySelector('[data-cq-pramuka]');
 if(!hasRole()){if(old)old.remove();return}
 if(old){old.classList.toggle('active',isActive());return}
 const item=document.createElement('div');item.className='nav-item'+(isActive()?' active':'');item.dataset.cqPramuka='1';item.innerHTML='<span>Nilai Pramuka</span>';item.onclick=open;sb.appendChild(item)}
function open(){try{activeModule=MOD}catch(_){}try{if(typeof renderSidebar==='function')renderSidebar()}catch(_){}ensureMenu();const c=document.getElementById('content');if(c)render(c)}
window.openPramukaGrades=open;
(function watch(){const sb=document.getElementById('sidebar');if(!sb){document.addEventListener('DOMContentLoaded',watch,{once:true});return}
 let busy=false;new MutationObserver(()=>{if(busy)return;busy=true;try{ensureMenu()}finally{busy=false}}).observe(sb,{childList:true});ensureMenu()})();

/* ---------- Halaman input ---------- */
async function render(content){
 if(!hasRole()){content.textContent='Akses khusus Pembina Pramuka.';return}
 const mount=String(Date.now())+Math.random();content.dataset.pramukaMount=mount;const alive=()=>content.isConnected&&content.dataset.pramukaMount===mount&&isActive();
 content.innerHTML='<div class="card"><span class="spinner"></span> Memuat Nilai Pramuka…</div>';
 let boot;try{boot=await api('bootstrap');if(!alive())return}catch(e){if(alive())content.innerHTML=`<div class="card">${esc(e.message)}</div>`;return}
 let classId=(boot.classes.find(c=>c.done<c.total)||boot.classes[0]||{}).id||'',students=[],entries=new Map(),dirty=new Set(),busy=false,message='';
 const gradeOf=sid=>(entries.get(sid)||{}).grade||'';
 async function load(){busy=true;try{const r=await api('load',{class_id:classId});if(!alive())return;students=r.students||[];entries=new Map((r.entries||[]).map(e=>[e.student_id,{version:Number(e.version)||0,grade:e.grade||''}]));dirty=new Set();message='';draw()}catch(e){if(alive())content.innerHTML=`<div class="card">${esc(e.message)}</div>`}finally{busy=false}}
 function setGrade(sid,g){const e=entries.get(sid)||{version:0,grade:''};if(e.grade===g)return;entries.set(sid,{...e,grade:g});dirty.add(sid)}
 function draw(){if(!alive())return;const filled=students.filter(s=>gradeOf(s.id)).length;
  content.innerHTML=`<div id="cq-pramuka"><style>
#cq-pramuka{font-family:Tahoma,sans-serif;color:#193b40;max-width:900px}#cq-pramuka *{box-sizing:border-box}
#cq-pramuka .card{padding:20px;border:1px solid #dcebe8;border-radius:16px;background:#fff;margin-bottom:16px;box-shadow:0 4px 18px #163d3910}
#cq-pramuka .pr-title{font-size:22px;font-weight:800;color:#0d7377;margin-bottom:4px}#cq-pramuka .pr-sub{font-size:13px;color:#5f756d;margin-bottom:16px;line-height:1.5}
#cq-pramuka .pr-row{display:flex;flex-wrap:wrap;gap:12px;align-items:end}#cq-pramuka label.pr-f{display:block;min-width:240px;font-size:13px;font-weight:600}
#cq-pramuka select{font:inherit;border:1px solid #cededa;border-radius:10px;padding:10px;background:#fbfdfd;color:#193b40;width:100%;margin-top:4px}
#cq-pramuka .pr-chip{display:inline-block;background:#edf8f6;color:#28595b;padding:7px 12px;border-radius:20px;font-size:13px}
#cq-pramuka .pr-wrap{overflow:auto;max-height:66vh;border:1px solid #ccdfd9;border-radius:10px}
#cq-pramuka table{border-collapse:separate;border-spacing:0;width:100%;font-size:13px}
#cq-pramuka th,#cq-pramuka td{border-bottom:1px solid #dce8e3;padding:8px 10px;text-align:left;background:#fff}
#cq-pramuka thead th{position:sticky;top:0;z-index:2;background:#e7f2ed;font-size:12px}
#cq-pramuka td.c,#cq-pramuka th.c{text-align:center}#cq-pramuka .pr-w{color:#5f756d;font-size:12px}
#cq-pramuka input.pr-g{width:64px;border:1px solid #cededa;border-radius:8px;text-align:center;font:inherit;font-weight:700;font-size:15px;padding:7px 4px;text-transform:uppercase}
#cq-pramuka input.pr-g:focus{outline:2px solid #18846c;outline-offset:-1px;background:#edfaf5}#cq-pramuka input.pr-g[aria-invalid=true]{background:#fff0ef;outline:2px solid #b54545}
#cq-pramuka .pr-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;position:sticky;bottom:0;z-index:3}#cq-pramuka .pr-msg{font-size:13px;color:#305877}
#cq-pramuka .pr-legend{font-size:12px;color:#5f756d;margin-top:10px}
</style>
<div class="pr-title">Nilai Pramuka</div><div class="pr-sub">${esc(boot.academic_year)} · Semester ${esc(boot.semester_no)} · Pramuka wajib untuk semua siswa. Nilai tampil di Rapor IKM (Ekstrakurikuler, baris pertama).</div>
<div class="card"><div class="pr-row"><label class="pr-f">Kelas<select id="pr-class">${boot.classes.map(c=>`<option value="${esc(c.id)}" ${c.id===classId?'selected':''}>${esc(c.name)} — ${c.id===classId?filled:c.done}/${c.id===classId?students.length:c.total} dinilai</option>`).join('')}</select></label>
<label class="pr-f" style="min-width:180px">Isi semua yang kosong<select id="pr-fill"><option value="">Pilih…</option>${GRADES.map(g=>`<option>${g}</option>`).join('')}</select></label><span class="pr-chip">${filled} dari ${students.length} siswa dinilai</span></div></div>
<div class="card">${students.length?`<div class="pr-wrap"><table><thead><tr><th class="c" style="width:48px">No</th><th style="width:110px">NIS</th><th>Nama Siswa</th><th class="c" style="width:90px">Nilai</th><th style="width:160px">Keterangan</th></tr></thead><tbody>${students.map((s,i)=>{const g=gradeOf(s.id);return`<tr><td class="c">${i+1}</td><td>${esc(s.nis)}</td><td>${esc(s.name)}</td><td class="c"><input class="pr-g" data-r="${i}" value="${esc(g)}" maxlength="1" aria-label="Nilai Pramuka ${esc(s.name)}"></td><td class="pr-w" data-w="${i}">${esc(WORD[g]||'')}</td></tr>`}).join('')}</tbody></table></div>
<div class="pr-legend">Isi A, B, C, atau D. A = Sangat Baik · B = Baik · C = Cukup · D = Perlu Bimbingan. Bisa tempel satu kolom dari Excel. Enter/↓ pindah ke baris berikutnya.</div>`:'<p>Daftar siswa belum tersedia untuk kelas ini.</p>'}</div>
<div class="card pr-actions"><button type="button" class="btn btn-primary" id="pr-save" ${busy?'disabled':''}>Simpan${dirty.size?` (${dirty.size} siswa)`:''}</button><span class="pr-msg" id="pr-msg" role="status" aria-live="polite">${esc(message||(dirty.size?'Ada perubahan yang belum disimpan.':'Semua perubahan sudah tersimpan.'))}</span></div></div>`;
  bind()}
 function bind(){const q=x=>content.querySelector(x);
  q('#pr-class').onchange=async e=>{if(dirty.size&&!confirm('Ada perubahan belum disimpan. Pindah kelas tanpa menyimpan?')){e.target.value=classId;return}classId=e.target.value;await load()};
  q('#pr-fill').onchange=e=>{const g=e.target.value;if(!g)return;let n=0;students.forEach(s=>{if(!gradeOf(s.id)){setGrade(s.id,g);n++}});message=n?`${n} siswa kosong diisi ${g}.`:'Tidak ada siswa yang kosong.';draw()};
  const status=()=>{q('#pr-msg').textContent='Ada perubahan yang belum disimpan.';q('#pr-save').textContent=`Simpan (${dirty.size} siswa)`};
  content.querySelectorAll('input.pr-g').forEach(el=>{
   el.oninput=()=>{const v=el.value.trim().toUpperCase();el.value=v;const ok=v===''||GRADES.includes(v);el.setAttribute('aria-invalid',String(!ok));if(!ok){q('#pr-msg').textContent='Isi hanya A, B, C, atau D.';return}const r=Number(el.dataset.r);setGrade(students[r].id,v);const w=q(`[data-w="${r}"]`);if(w)w.textContent=WORD[v]||'';status()};
   el.onkeydown=e=>{if(!['Enter','ArrowDown','ArrowUp'].includes(e.key))return;e.preventDefault();const d=e.key==='ArrowUp'||e.shiftKey?-1:1;const n=q(`input.pr-g[data-r="${Number(el.dataset.r)+d}"]`);if(n){n.focus();n.select()}};
   el.onpaste=e=>{const raw=e.clipboardData.getData('text');if(!/[\n\r]/.test(raw))return;e.preventDefault();const vals=raw.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(x=>x.split('\t')[0].trim().toUpperCase());const r0=Number(el.dataset.r);
    if(r0+vals.length>students.length){q('#pr-msg').textContent='Tempelan melebihi jumlah siswa. Tidak ada nilai diubah.';return}
    if(vals.some(v=>v&&!GRADES.includes(v))){q('#pr-msg').textContent='Tempelan hanya boleh A, B, C, D, atau kosong. Tidak ada nilai diubah.';return}
    vals.forEach((v,i)=>setGrade(students[r0+i].id,v));message=`${vals.length} nilai berhasil ditempel.`;draw()};
  });
  q('#pr-save').onclick=save}
 async function save(){if(busy)return;if(content.querySelector('input.pr-g[aria-invalid="true"]')){message='Perbaiki sel berwarna merah dulu.';draw();return}if(!dirty.size){message='Tidak ada perubahan untuk disimpan.';draw();return}
  busy=true;const btn=content.querySelector('#pr-save');if(btn){btn.disabled=true;btn.textContent='Menyimpan…'}
  try{const list=[...dirty].map(sid=>({student_id:sid,version:(entries.get(sid)||{}).version||0,grade:gradeOf(sid)}));const r=await api('save',{class_id:classId,academic_year_id:boot.academic_year_id,semester_no:boot.semester_no,entries:list});if(!alive())return;
   entries=new Map((r.entries||[]).map(e=>[e.student_id,{version:Number(e.version)||0,grade:e.grade||''}]));dirty=new Set();message=`Tersimpan (${r.saved} siswa).`;
   const c=boot.classes.find(x=>x.id===classId);if(c){c.done=students.filter(s=>gradeOf(s.id)).length;c.total=students.length}}
  catch(e){message=e.name==='AbortError'?'Waktu tunggu habis. Muat ulang untuk memeriksa hasil sebelum mencoba lagi.':e.message}
  finally{busy=false;if(alive())draw()}}
 if(classId)await load();else content.innerHTML='<div class="card">Belum ada kelas aktif pada tahun ajaran ini.</div>';
}
window.renderPramukaGrades=render;
})();
