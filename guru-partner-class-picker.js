/* CQlass — Guru Partner Tahfizh standalone override */
(function(){
  const API=()=>`${SUPABASE_URL}/functions/v1/partner-tasks`;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  let state={boot:null,classId:'',students:[],reports:new Map(),dirty:false};

  async function call(action,payload={}){
    const token=getAuthToken?.();
    if(!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    const ctrl=new AbortController();
    const timer=setTimeout(()=>ctrl.abort(),12000);
    try{
      const res=await fetch(API(),{method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,'x-session-token':token},body:JSON.stringify({action,semester_no:1,...payload})});
      const data=await res.json().catch(()=>({success:false,error:'Respons sistem tidak valid'}));
      if(!res.ok||data.success===false) throw new Error(data.error||`Gagal memuat data (${res.status})`);
      return data;
    }catch(e){
      if(e?.name==='AbortError') throw new Error('Waktu memuat data habis. Silakan coba lagi.');
      throw e;
    }finally{clearTimeout(timer)}
  }

  function findItem(){
    for(const g of (window.MODULE_GROUPS||[])){
      const it=(g.items||[]).find(x=>x.id==='partner-pts');
      if(it)return it;
    }
    return null;
  }

  function install(){const it=findItem();if(!it)return false;it.render=render;return true;}

  async function render(content){
    content.innerHTML='<div class="card"><span class="spinner"></span>Memuat kelas Tahfizh...</div>';
    try{
      state.boot=await call('bootstrap');
      const classes=state.boot.classes||[];
      if(!classes.length){content.innerHTML='<div class="empty-state">Belum ada kelas Tahfizh pada akun ini.</div>';return}
      state.classId=''; state.students=[]; state.reports=new Map(); state.dirty=false;
      content.innerHTML=`<div class="page-title">Nilai Tahfizh</div><div class="page-sub">Pilih kelas input, lalu sistem menampilkan siswa halaqah Anda pada kelas tersebut.</div><div class="card"><div class="gp-toolbar" style="display:flex;gap:12px;align-items:end;flex-wrap:wrap"><div class="gp-field" style="min-width:240px"><label>Pilih Kelas Input</label><select id="gpt2-class" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#fff"><option value="">— Pilih kelas —</option>${classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div><div class="gp-field"><label>Guru Pengisi</label><div class="gp-badge">${esc(state.boot.teacher_name||currentUser?.nama||'')}</div></div><span id="gpt2-status" class="gp-state">Pilih kelas terlebih dahulu</span><button class="btn gp-save" id="gpt2-save" disabled>Simpan</button></div><div id="gpt2-body" style="margin-top:12px"><div class="empty-state">Silakan pilih kelas input.</div></div></div>`;
      document.getElementById('gpt2-class').addEventListener('change',e=>loadClass(e.target.value));
      document.getElementById('gpt2-save').addEventListener('click',save);
    }catch(e){
      content.innerHTML=`<div class="card"><div class="empty-state"><b>Nilai Tahfizh gagal dimuat.</b><br>${esc(e.message)}<br><br><button class="btn" onclick="setActiveModule('partner-pts')">Coba Lagi</button></div></div>`;
    }
  }

  async function loadClass(id){
    const body=document.getElementById('gpt2-body'),saveBtn=document.getElementById('gpt2-save'),st=document.getElementById('gpt2-status');
    state.classId=id; state.students=[]; state.reports=new Map(); state.dirty=false;
    if(!id){body.innerHTML='<div class="empty-state">Silakan pilih kelas input.</div>';saveBtn.disabled=true;st.textContent='Pilih kelas terlebih dahulu';return}
    body.innerHTML='<div style="padding:18px"><span class="spinner"></span>Memuat siswa halaqah...</div>';saveBtn.disabled=true;st.textContent='Memuat...';
    try{const d=await call('roster',{class_id:id});state.students=d.students||[];state.reports=new Map((d.reports||[]).map(r=>[r.student_id,r]));renderGrid(body,d);saveBtn.disabled=!state.students.length;st.textContent=state.students.length?'Tersimpan':'Tidak ada siswa';}
    catch(e){body.innerHTML=`<div class="empty-state">${esc(e.message)}</div>`;st.textContent='Gagal memuat';}
  }

  const fields=[['materi_hafalan','Materi Hafalan',180],['lp_tahfizh','LP Tahfizh',180],['realisasi_saat_ini','Realisasi Saat Ini',180],['prestasi_tahfizh','Prestasi Tahfizh',180],['jumlah_surat','Jml Surat',90],['jumlah_baris','Jml Baris',90],['jumlah_ayat','Jml Ayat',90],['jumlah_baris_lp','Jml Baris LP',100],['persentase','Persentase',100],['mengikuti_kenaikan_juz','Kenaikan Juz',120]];
  function renderGrid(body,d){
    if(!state.students.length){body.innerHTML='<div class="empty-state">Belum ada siswa pada halaqah ini.</div>';return}
    body.innerHTML=`<div class="gp-note">${state.students.length} siswa · Halaqah ${esc(d.halaqah_name||state.boot?.teacher_name||'')}</div><div class="gp-tablewrap"><table class="gp-table"><thead><tr><th>No</th><th>Nama Siswa</th>${fields.map(f=>`<th>${f[1]}</th>`).join('')}</tr></thead><tbody>${state.students.map((s,i)=>{const r=state.reports.get(s.id)||{};return `<tr><td style="padding:8px;text-align:center">${i+1}</td><td class="name">${esc(s.full_name||s.name||'')}</td>${fields.map(f=>`<td><input class="gp-cell" style="min-width:${f[2]}px" data-student="${esc(s.id)}" data-key="${f[0]}" value="${esc(r[f[0]]??'')}"></td>`).join('')}</tr>`}).join('')}</tbody></table></div>`;
    body.querySelectorAll('.gp-cell').forEach(el=>el.addEventListener('input',()=>{state.dirty=true;const st=document.getElementById('gpt2-status');if(st)st.textContent='Belum disimpan'}));
  }

  async function save(){
    const btn=document.getElementById('gpt2-save'),st=document.getElementById('gpt2-status');if(!state.classId||!state.students.length)return;
    const map=new Map(state.students.map(s=>[s.id,{student_id:s.id}]));document.querySelectorAll('#gpt2-body .gp-cell').forEach(el=>{const r=map.get(el.dataset.student);if(r)r[el.dataset.key]=el.value.trim()});
    btn.disabled=true;const old=btn.textContent;btn.textContent='Menyimpan...';
    try{const d=await call('save',{class_id:state.classId,items:[...map.values()]});state.dirty=false;st.textContent=`Tersimpan (${d.saved||state.students.length} siswa)`;if(window.showToast)showToast('Nilai Tahfizh tersimpan.','success')}
    catch(e){st.textContent='Gagal menyimpan';if(window.showToast)showToast(e.message,'error');else alert(e.message)}finally{btn.disabled=false;btn.textContent=old}
  }

  if(!install()){
    const obs=new MutationObserver(()=>{if(install())obs.disconnect()});obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(install,700);
  }
})();
