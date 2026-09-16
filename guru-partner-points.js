/* CQlass — Guru Partner: Kedisiplinan & Reward, shared source with Walas */
(function(){
'use strict';
const API=()=>`${SUPABASE_URL}/functions/v1/partner-student-points`;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let boot=null,state={kind:'violation',classId:'',students:[],viewStudent:'',snapshot:null};

async function req(action,payload={}){
  const token=getAuthToken?.();if(!token)throw Error('Sesi login tidak ditemukan. Silakan login ulang.');
  const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),15000);
  try{
    const r=await fetch(API(),{method:'POST',signal:ctl.signal,headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,'x-session-token':token},body:JSON.stringify({action,semester_no:1,...payload})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.success===false)throw Object.assign(Error(d.message||d.error||`HTTP ${r.status}`),{code:d.error,status:r.status,data:d});
    return d;
  }catch(e){if(e?.name==='AbortError')throw Error('Server terlalu lama merespons.');throw e}finally{clearTimeout(tm)}
}
function toast(msg,bad=false){if(typeof showToast==='function')showToast(msg,!!bad);else alert(msg)}
function today(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`}
function masters(){return state.kind==='violation'?(boot?.violation_masters||[]):(boot?.reward_masters||[])}
function mName(m){return state.kind==='violation'?m.violation_name:m.reward_name}
function kindLabel(){return state.kind==='violation'?'Kedisiplinan':'Reward'}
function ensureCss(){if(document.getElementById('gpp-style'))return;const s=document.createElement('style');s.id='gpp-style';s.textContent=`
.gpp-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}.gpp-chip{padding:6px 10px;border-radius:999px;background:#eaf7f6;color:var(--primary);font-size:10px;font-weight:900}.gpp-grid{display:grid;grid-template-columns:1.1fr 1fr;gap:14px;margin-top:14px}.gpp-card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:15px}.gpp-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.gpp-field{display:grid;gap:5px}.gpp-field.full{grid-column:1/-1}.gpp-field label{font-size:9.5px;text-transform:uppercase;font-weight:850;color:var(--muted)}.gpp-field input,.gpp-field select,.gpp-field textarea{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:9px;background:#fff;padding:9px 10px;font:500 12px Inter,sans-serif}.gpp-field textarea{min-height:74px;resize:vertical}.gpp-note{font-size:10.5px;color:var(--muted);line-height:1.55;margin-top:8px}.gpp-students{border:1px solid var(--border);border-radius:10px;overflow:auto;max-height:360px}.gpp-row{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:8px;padding:9px 10px;border-bottom:1px solid var(--border)}.gpp-row:last-child{border-bottom:0}.gpp-row:hover{background:#f8fbfb}.gpp-name{border:0;background:transparent;text-align:left;padding:0;font:700 11.5px Inter,sans-serif;color:var(--text);cursor:pointer}.gpp-sub{font-size:9.5px;color:var(--muted);margin-top:2px}.gpp-tools{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:9px}.gpp-tools input{flex:1;min-width:0;border:1px solid var(--border);border-radius:8px;padding:8px 9px}.gpp-history{overflow:auto;border:1px solid var(--border);border-radius:10px;margin-top:10px}.gpp-table{width:100%;border-collapse:collapse;min-width:620px}.gpp-table th,.gpp-table td{padding:8px 9px;border-bottom:1px solid var(--border);font-size:10px;text-align:left;vertical-align:top}.gpp-table th{background:#f3f8f7;color:var(--muted);font-size:9px}.gpp-own{display:inline-flex;padding:3px 6px;border-radius:999px;background:#eaf7f6;color:var(--primary);font-size:8.5px;font-weight:850}.gpp-other{display:inline-flex;padding:3px 6px;border-radius:999px;background:#f1f2f4;color:#677;font-size:8.5px;font-weight:800}.gpp-actions{display:flex;gap:5px;white-space:nowrap}.gpp-mini{border:1px solid var(--border);background:#fff;border-radius:7px;padding:5px 7px;font-size:9px;font-weight:750;cursor:pointer}.gpp-mini.danger{color:#a33}.gpp-save{width:100%;margin-top:10px}.gpp-empty{padding:18px;color:var(--muted);font-size:11px;text-align:center}.gpp-modal{position:fixed;inset:0;background:#102c2c66;z-index:12000;display:grid;place-items:center;padding:18px}.gpp-modal-box{width:min(520px,100%);background:#fff;border-radius:16px;padding:18px;box-shadow:0 20px 60px #0003}.gpp-modal-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}@media(max-width:900px){.gpp-grid{grid-template-columns:1fr}.gpp-fields{grid-template-columns:1fr}.gpp-field.full{grid-column:auto}}
`;document.head.appendChild(s)}

function install(){
  if(typeof MODULE_GROUPS==='undefined')return false;
  const g=MODULE_GROUPS.find(x=>x.id==='partner-tasks');if(!g)return false;
  const add=(id,label,kind)=>{if(!(g.items||[]).some(x=>x.id===id))g.items.push({id,label,roles:['partner'],built:true,render:c=>render(c,kind)})};
  add('partner-discipline','Kedisiplinan','violation');add('partner-reward','Reward','reward');return true;
}
async function getBoot(force=false){if(boot&&!force)return boot;boot=await req('bootstrap');return boot}

async function render(content,kind){
  ensureCss();state={kind,classId:'',students:[],viewStudent:'',snapshot:null};content.innerHTML='<div class="card"><span class="spinner"></span> Memuat data...</div>';
  try{
    const b=await getBoot();const cs=b.classes||[];if(!cs.length){content.innerHTML='<div class="empty-state">Belum ada siswa halaqah pada akun ini.</div>';return}
    state.classId=cs[0].id;
    content.innerHTML=`<div class="gpp-head"><div><div class="page-title">${kindLabel()} — Guru Partner</div><div class="page-sub">Catat hanya siswa halaqah Anda. Data langsung menyatu dengan catatan Walas/Kesiswaan.</div></div><span class="gpp-chip">${esc(b.teacher_name||'Guru Partner')}</span></div>
    <div class="gpp-grid"><div class="gpp-card"><div class="card-title">Input ${kindLabel()}</div><div class="gpp-fields">
      <div class="gpp-field"><label>Kelas Halaqah</label><select id="gpp-class">${cs.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join('')}</select></div>
      <div class="gpp-field"><label>Tanggal Kejadian</label><input id="gpp-date" type="date" max="${today()}" value="${today()}"></div>
      <div class="gpp-field full"><label>${kind==='violation'?'Jenis Pelanggaran':'Jenis Reward'}</label><select id="gpp-master"><option value="">— Pilih —</option>${masters().map(m=>`<option value="${esc(m.id)}">${esc(mName(m))} · ${esc(m.category)} · ${Number(m.points||0)} poin</option>`).join('')}</select></div>
      <div class="gpp-field full"><label>Catatan / Keterangan</label><textarea id="gpp-note" placeholder="Keterangan singkat kejadian (opsional)"></textarea></div>
    </div><div class="gpp-note"><b>Anti-duplikasi aktif:</b> siswa + tanggal + jenis ${kind==='violation'?'pelanggaran':'reward'} yang sama tidak dapat masuk dua kali, walaupun dicatat oleh role berbeda.</div>
    <div style="margin-top:12px"><div class="gpp-tools"><input id="gpp-search" placeholder="Cari siswa halaqah..."><button class="gpp-mini" id="gpp-all">Pilih Semua</button></div><div id="gpp-students" class="gpp-students"><div class="gpp-empty">Memuat siswa...</div></div></div>
    <button class="btn gpp-save" id="gpp-save">Simpan ${kindLabel()}</button></div>
    <div class="gpp-card"><div class="card-title">Riwayat Siswa</div><div class="gpp-note">Klik nama siswa untuk melihat semua catatan, termasuk yang dibuat Walas. Catatan milik role lain hanya dapat dilihat, tidak dapat diubah Guru Partner.</div><div id="gpp-history"><div class="gpp-empty">Pilih salah satu siswa.</div></div></div></div><div id="gpp-modal-root"></div>`;
    document.getElementById('gpp-class').onchange=async e=>{state.classId=e.target.value;state.viewStudent='';document.getElementById('gpp-history').innerHTML='<div class="gpp-empty">Pilih salah satu siswa.</div>';await loadStudents()};
    document.getElementById('gpp-search').oninput=filterStudents;document.getElementById('gpp-all').onclick=toggleAll;document.getElementById('gpp-save').onclick=save;await loadStudents();
  }catch(e){content.innerHTML=`<div class="empty-state">${esc(e.message||'Gagal memuat data.')}</div>`}
}
async function loadStudents(){
  const box=document.getElementById('gpp-students');if(!box)return;box.innerHTML='<div class="gpp-empty">Memuat siswa...</div>';
  try{const d=await req('students',{class_id:state.classId});state.students=d.students||[];box.innerHTML=state.students.length?state.students.map(s=>`<div class="gpp-row" data-search="${esc((s.name+' '+(s.nis||'')).toLowerCase())}"><input type="checkbox" class="gpp-check" value="${esc(s.id)}"><div><button class="gpp-name" data-student="${esc(s.id)}">${esc(s.name)}</button><div class="gpp-sub">${esc(s.nis||'')}</div></div><span class="gpp-other">halaqah</span></div>`).join(''):'<div class="gpp-empty">Tidak ada siswa halaqah pada kelas ini.</div>';box.querySelectorAll('[data-student]').forEach(x=>x.onclick=()=>loadHistory(x.dataset.student))}catch(e){box.innerHTML=`<div class="gpp-empty">${esc(e.message)}</div>`}
}
function filterStudents(){const q=(document.getElementById('gpp-search')?.value||'').toLowerCase().trim();document.querySelectorAll('#gpp-students .gpp-row').forEach(r=>r.style.display=!q||(r.dataset.search||'').includes(q)?'grid':'none')}
function toggleAll(){const visible=[...document.querySelectorAll('#gpp-students .gpp-row')].filter(r=>r.style.display!=='none'),checks=visible.map(r=>r.querySelector('.gpp-check')).filter(Boolean),next=checks.some(x=>!x.checked);checks.forEach(x=>x.checked=next);document.getElementById('gpp-all').textContent=next?'Batal Pilih':'Pilih Semua'}
async function save(){
  const mids=document.getElementById('gpp-master')?.value||'',date=document.getElementById('gpp-date')?.value||'',note=(document.getElementById('gpp-note')?.value||'').trim(),ids=[...document.querySelectorAll('.gpp-check:checked')].map(x=>x.value);
  if(!mids)return toast(`Pilih jenis ${kindLabel().toLowerCase()} terlebih dahulu.`,true);if(!ids.length)return toast('Pilih minimal satu siswa.',true);if(!date)return toast('Tanggal wajib diisi.',true);
  const btn=document.getElementById('gpp-save'),old=btn.textContent;btn.disabled=true;btn.textContent='Menyimpan...';
  try{const action=state.kind==='violation'?'bulk_save_violations':'bulk_save_rewards',d=await req(action,{class_id:state.classId,date,note,items:ids.map(student_id=>({student_id,master_id:mids}))});toast(`${d.saved||ids.length} catatan berhasil disimpan.`);document.querySelectorAll('.gpp-check:checked').forEach(x=>x.checked=false);document.getElementById('gpp-note').value='';if(state.viewStudent&&ids.includes(state.viewStudent))await loadHistory(state.viewStudent)}catch(e){toast(e.message||'Gagal menyimpan.',true)}finally{btn.disabled=false;btn.textContent=old}
}
async function loadHistory(sid){
  state.viewStudent=sid;const box=document.getElementById('gpp-history');if(!box)return;box.innerHTML='<div class="gpp-empty">Memuat riwayat...</div>';
  try{const d=await req('student_snapshot',{student_id:sid});state.snapshot=d;const rows=state.kind==='violation'?(d.violations||[]):(d.rewards||[]),student=state.students.find(x=>x.id===sid);box.innerHTML=`<div class="gpp-note" style="padding:10px 0 0"><b>${esc(student?.name||'Siswa')}</b> · ${rows.length} catatan ${kindLabel().toLowerCase()}</div><div class="gpp-history"><table class="gpp-table"><thead><tr><th>Tanggal</th><th>${kindLabel()}</th><th>Poin</th><th>Catatan</th><th>Dicatat oleh</th><th>Aksi</th></tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.name)}<div class="gpp-sub">${esc(r.category||'')}</div></td><td>${Number(r.points||0)}</td><td>${esc(r.note||'-')}</td><td>${esc(r.recorded_by||'-')}<br>${r.can_edit?'<span class="gpp-own">Catatan Anda</span>':'<span class="gpp-other">Baca saja</span>'}</td><td>${r.can_edit?`<div class="gpp-actions"><button class="gpp-mini" data-edit="${esc(r.id)}">Edit</button><button class="gpp-mini danger" data-del="${esc(r.id)}">Hapus</button></div>`:'—'}</td></tr>`).join(''):'<tr><td colspan="6">Belum ada catatan.</td></tr>'}</tbody></table></div>`;box.querySelectorAll('[data-edit]').forEach(x=>x.onclick=()=>openEdit(rows.find(r=>r.id===x.dataset.edit)));box.querySelectorAll('[data-del]').forEach(x=>x.onclick=()=>removeRecord(x.dataset.del))}catch(e){box.innerHTML=`<div class="gpp-empty">${esc(e.message)}</div>`}
}
function openEdit(row){if(!row)return;const root=document.getElementById('gpp-modal-root');root.innerHTML=`<div class="gpp-modal"><div class="gpp-modal-box"><div class="card-title">Edit ${kindLabel()}</div><div class="gpp-fields"><div class="gpp-field"><label>Tanggal</label><input id="gpp-edit-date" type="date" max="${today()}" value="${esc(row.date)}"></div><div class="gpp-field"><label>Jenis</label><select id="gpp-edit-master">${masters().map(m=>`<option value="${esc(m.id)}" ${String(m.id)===String(row.master_id)?'selected':''}>${esc(mName(m))}</option>`).join('')}</select></div><div class="gpp-field full"><label>Catatan</label><textarea id="gpp-edit-note">${esc(row.note||'')}</textarea></div></div><div class="gpp-modal-actions"><button class="gpp-mini" id="gpp-cancel">Batal</button><button class="btn" id="gpp-edit-save">Simpan Perubahan</button></div></div></div>`;document.getElementById('gpp-cancel').onclick=()=>root.innerHTML='';document.getElementById('gpp-edit-save').onclick=async()=>{const b=document.getElementById('gpp-edit-save');b.disabled=true;try{await req('update_record',{record_type:state.kind,record_id:row.id,date:document.getElementById('gpp-edit-date').value,master_id:document.getElementById('gpp-edit-master').value,note:document.getElementById('gpp-edit-note').value});root.innerHTML='';toast('Catatan berhasil diperbarui.');await loadHistory(state.viewStudent)}catch(e){toast(e.message,true);b.disabled=false}}}
async function removeRecord(id){if(!confirm(`Hapus catatan ${kindLabel().toLowerCase()} ini?`))return;try{await req('delete_record',{record_type:state.kind,record_id:id});toast('Catatan dihapus.');await loadHistory(state.viewStudent)}catch(e){toast(e.message,true)}}

const ready=install();
if(ready){setTimeout(()=>{if(typeof renderSidebar==='function'&&window.currentUser?.role==='partner')renderSidebar()},0)}
else{
  const ob=new MutationObserver(()=>{if(install()){ob.disconnect();if(typeof renderSidebar==='function'&&window.currentUser?.role==='partner')renderSidebar()}});ob.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>{if(install()&&typeof renderSidebar==='function'&&window.currentUser?.role==='partner')renderSidebar()},900);
}
})();