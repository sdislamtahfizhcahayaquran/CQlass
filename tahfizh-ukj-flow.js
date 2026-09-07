/* CQlass — Tahfizh UKJ request + scheduling */
(function(){
  const API=()=>`${SUPABASE_URL}/functions/v1/tahfizh-ukj`;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  async function call(action,payload={}){
    const token=getAuthToken?.(); if(!token) throw new Error('Sesi login tidak ditemukan.');
    const r=await fetch(API(),{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,'x-session-token':token},body:JSON.stringify({action,semester_no:1,...payload})});
    const d=await r.json().catch(()=>({success:false,error:'Respons sistem tidak valid'}));
    if(!r.ok||d.success===false) throw new Error(d.error||'Proses UKJ gagal.'); return d;
  }
  function latestByStudent(rows){const m=new Map();for(const r of rows||[]){if(!m.has(r.student_id))m.set(r.student_id,r)}return m}
  async function enhanceTeacherGrid(){
    const table=document.querySelector('#gpt2-body table.gp-table'); if(!table||table.dataset.ukjReady==='1')return;
    table.dataset.ukjReady='1';
    let rows=[];try{rows=(await call('teacher_list')).rows||[]}catch(_){rows=[]}
    const latest=latestByStudent(rows), head=table.querySelector('thead tr');
    head.insertAdjacentHTML('beforeend','<th>Siap UKJ?</th><th>Status UKJ</th><th>Tanggal UKJ</th>');
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const first=tr.querySelector('.gp-cell'); if(!first)return; const sid=first.dataset.student; const u=latest.get(sid)||{};
      const ready=['requested','scheduled','completed'].includes(u.request_status)?'yes':'no';
      const label=u.request_status==='scheduled'?'Terjadwal':u.request_status==='requested'?'Menunggu Kabid':u.request_status==='completed'?'Selesai':'Belum siap';
      tr.insertAdjacentHTML('beforeend',`<td><select class="gp-ukj-ready" data-student="${esc(sid)}" style="min-width:120px;padding:8px;border:1px solid var(--border);border-radius:8px"><option value="no" ${ready==='no'?'selected':''}>Belum Siap</option><option value="yes" ${ready==='yes'?'selected':''}>Siap UKJ</option></select></td><td class="gp-ukj-status">${esc(label)}</td><td class="gp-ukj-date">${esc(u.scheduled_date||'-')}</td>`);
    });
    table.querySelectorAll('.gp-ukj-ready').forEach(sel=>sel.addEventListener('change',async e=>{
      const sid=e.target.dataset.student, classId=document.getElementById('gpt2-class')?.value||''; const tr=e.target.closest('tr'),st=tr.querySelector('.gp-ukj-status'),dt=tr.querySelector('.gp-ukj-date');
      st.textContent='Menyimpan...';
      try{const d=await call('teacher_request',{student_id:sid,class_id:classId,ready:e.target.value});const r=d.request||{};st.textContent=r.request_status==='scheduled'?'Terjadwal':r.request_status==='requested'?'Menunggu Kabid':'Belum siap';dt.textContent=r.scheduled_date||'-';showToast?.(e.target.value==='yes'?'Request UKJ dikirim.':'Status UKJ diperbarui.');}
      catch(err){st.textContent='Gagal';showToast?.(err.message,true)}
    }));
  }
  async function renderKabidUKJ(){
    const content=document.getElementById('content'); if(!content)return; content.innerHTML='<div class="card"><span class="spinner"></span>Memuat request UKJ...</div>';
    try{const d=await call('kabid_list');const rows=d.rows||[];content.innerHTML=`<div class="page-title">Request UKJ Tahfizh</div><div class="page-sub">Tentukan tanggal UKJ untuk siswa yang diajukan guru Tahfizh.</div><div class="card"><div style="overflow:auto"><table class="gp-table" style="min-width:900px"><thead><tr><th>No</th><th>Siswa</th><th>Kelas</th><th>Guru Tahfizh</th><th>Status</th><th>Tanggal UKJ</th><th>Catatan Kabid</th><th>Aksi</th></tr></thead><tbody>${rows.length?rows.map((r,i)=>`<tr data-id="${esc(r.id)}"><td>${i+1}</td><td class="name">${esc(r.student_name)}</td><td>${esc(r.class_name)}</td><td>${esc(r.teacher_name)}</td><td>${esc(r.request_status==='scheduled'?'Terjadwal':r.request_status==='completed'?'Selesai':'Menunggu')}</td><td><input type="date" class="ukj-date" value="${esc(r.scheduled_date||'')}"></td><td><input class="ukj-note" value="${esc(r.kabid_note||'')}" placeholder="Opsional"></td><td><button class="btn btn-sm ukj-set">Tetapkan</button></td></tr>`).join(''):'<tr><td colspan="8"><div class="empty-state">Belum ada request UKJ.</div></td></tr>'}</tbody></table></div></div>`;
      content.querySelectorAll('.ukj-set').forEach(btn=>btn.addEventListener('click',async()=>{const tr=btn.closest('tr'),date=tr.querySelector('.ukj-date').value,note=tr.querySelector('.ukj-note').value;if(!date){showToast?.('Pilih tanggal UKJ terlebih dahulu.',true);return}btn.disabled=true;btn.textContent='Menyimpan...';try{await call('schedule',{request_id:tr.dataset.id,scheduled_date:date,kabid_note:note});showToast?.('Tanggal UKJ ditetapkan.');await renderKabidUKJ()}catch(e){showToast?.(e.message,true);btn.disabled=false;btn.textContent='Tetapkan'}}));
    }catch(e){content.innerHTML=`<div class="card"><div class="empty-state">${esc(e.message)}</div></div>`}
  }
  function installKabidCard(){
    const role=String(currentUser?.role||'').toLowerCase(); if(role!=='tahfizh')return; const content=document.getElementById('content'); if(!content||document.getElementById('ukj-kabid-card'))return;
    const card=document.createElement('div');card.id='ukj-kabid-card';card.className='card';card.style.marginBottom='14px';card.innerHTML='<div style="display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap"><div><b>Request UKJ Tahfizh</b><div class="page-sub" style="margin:4px 0 0">Lihat pengajuan siswa siap UKJ dan tentukan tanggal pelaksanaannya.</div></div><button class="btn" id="ukj-kabid-open">Kelola Request UKJ</button></div>';
    content.prepend(card);card.querySelector('#ukj-kabid-open').addEventListener('click',renderKabidUKJ);
  }
  const obs=new MutationObserver(()=>{enhanceTeacherGrid();installKabidCard()});obs.observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>{enhanceTeacherGrid();installKabidCard()});
  window.CQlassTahfizhUKJ={renderKabidUKJ,refreshTeacher:enhanceTeacherGrid};
})();
