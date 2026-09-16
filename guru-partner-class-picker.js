/* CQlass — Guru Partner Tahfizh PTS Excel-like grid */
(function(){
  'use strict';
  const API=()=>`${SUPABASE_URL}/functions/v1/partner-tasks`;
  const esc=v=>String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]));
  const VISIBLE_COLS=10; // 0..7 input, 8 formula persentase, 9 kenaikan juz
  let state={boot:null,classId:'',students:[],reports:new Map(),dirty:false,undo:[],redo:[],applying:false,fill:null};

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

  function findItem(){for(const g of (window.MODULE_GROUPS||[])){const it=(g.items||[]).find(x=>x.id==='partner-pts');if(it)return it}return null}
  function install(){const it=findItem();if(!it)return false;it.render=render;return true}

  function toNum(v){const raw=String(v??'').trim().replace(/,/g,'.').replace(/[^0-9.\-]/g,'');if(!raw)return null;const n=Number(raw);return Number.isFinite(n)?n:null}
  function calcPct(baris,lp){const a=toNum(baris),b=toNum(lp);if(a===null||b===null||b<=0)return '';return `${Math.round((a/b)*100)}%`}
  function recalcRow(tr){if(!tr)return;const b=tr.querySelector('[data-key="jumlah_baris"]'),lp=tr.querySelector('[data-key="jumlah_baris_lp"]'),p=tr.querySelector('[data-formula="persentase"]');if(p)p.textContent=calcPct(b?.value,lp?.value)}
  function statusDirty(){state.dirty=true;const st=document.getElementById('gpt2-status');if(st)st.textContent='Belum disimpan'}
  function cellAt(row,col){return document.querySelector(`#gpt2-body .gp-cell[data-row="${row}"][data-col="${col}"]`)}
  function focusAt(row,col){let c=col;if(c===8)c+=(col>=8?1:-1);if(c<0||c>=VISIBLE_COLS)return;const x=cellAt(row,c);if(x){x.focus();x.select?.();x.scrollIntoView({block:'nearest',inline:'nearest'})}}
  function removeFillHandle(){document.querySelectorAll('#gpt2-body .gp-fill-handle').forEach(x=>x.remove());document.querySelectorAll('#gpt2-body td.gp-active-cell').forEach(x=>x.classList.remove('gp-active-cell'))}
  function showFillHandle(input){removeFillHandle();const td=input.closest('td');if(!td)return;td.classList.add('gp-active-cell');const h=document.createElement('span');h.className='gp-fill-handle';h.title='Tarik untuk menyalin ke bawah/atas';h.addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();state.fill={source:input,row:Number(input.dataset.row),col:Number(input.dataset.col)};h.setPointerCapture?.(e.pointerId);const done=ev=>{document.removeEventListener('pointerup',done,true);if(state.fill)finishFill(ev.clientX,ev.clientY)};document.addEventListener('pointerup',done,true)});td.appendChild(h)}

  function pushHistory(changes){const clean=changes.filter(x=>x&&x.el&&x.before!==x.after);if(!clean.length)return;state.undo.push(clean);if(state.undo.length>100)state.undo.shift();state.redo=[]}
  function applyTransaction(tx,useAfter){state.applying=true;for(const x of tx){x.el.value=useAfter?x.after:x.before;x.el.dataset.editStart=x.el.value;recalcRow(x.el.closest('tr'))}state.applying=false;statusDirty()}
  function commitFocused(el){if(!el?.classList?.contains('gp-cell'))return;const before=el.dataset.editStart??el.value,after=el.value;if(before!==after){pushHistory([{el,before,after}]);el.dataset.editStart=after}}
  function undo(){const tx=state.undo.pop();if(!tx)return;applyTransaction(tx,false);state.redo.push(tx);if(window.showToast)showToast('Undo','success')}
  function redo(){const tx=state.redo.pop();if(!tx)return;applyTransaction(tx,true);state.undo.push(tx);if(window.showToast)showToast('Redo','success')}

  function handleKeydown(e,input){
    const mod=e.ctrlKey||e.metaKey;
    if(mod&&e.key.toLowerCase()==='z'){e.preventDefault();commitFocused(input);if(e.shiftKey)redo();else undo();return}
    if(mod&&e.key.toLowerCase()==='y'){e.preventDefault();commitFocused(input);redo();return}
    if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key))return;
    e.preventDefault();commitFocused(input);
    let r=Number(input.dataset.row),c=Number(input.dataset.col);
    if(e.key==='ArrowLeft')c--;else if(e.key==='ArrowRight')c++;else if(e.key==='ArrowUp'||(e.key==='Enter'&&e.shiftKey))r--;else r++;
    if(c===8)c+=(e.key==='ArrowLeft'?-1:1);
    focusAt(r,c)
  }

  function handlePaste(e,input){
    const text=e.clipboardData?.getData('text/plain');if(text==null)return;
    e.preventDefault();commitFocused(input);
    const rows=text.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(r=>r.split('\t'));
    const sr=Number(input.dataset.row),sc=Number(input.dataset.col),changes=[];
    rows.forEach((vals,dr)=>vals.forEach((v,dc)=>{const col=sc+dc;if(col<0||col>=VISIBLE_COLS||col===8)return;const target=cellAt(sr+dr,col);if(!target)return;changes.push({el:target,before:target.value,after:v})}));
    if(!changes.length)return;
    state.applying=true;for(const x of changes){x.el.value=x.after;x.el.dataset.editStart=x.after;recalcRow(x.el.closest('tr'))}state.applying=false;pushHistory(changes);statusDirty();
    if(window.showToast)showToast(`${changes.filter(x=>x.before!==x.after).length} sel ditempel. Persentase dilewati otomatis.`,'success')
  }

  function finishFill(clientX,clientY){
    const f=state.fill;if(!f)return;state.fill=null;
    const dest=document.elementFromPoint(clientX,clientY)?.closest?.('.gp-cell');if(!dest||Number(dest.dataset.col)!==f.col)return;
    const dr=Number(dest.dataset.row);if(dr===f.row)return;
    const step=dr>f.row?1:-1,changes=[];
    for(let r=f.row+step;;r+=step){const target=cellAt(r,f.col);if(target)changes.push({el:target,before:target.value,after:f.source.value});if(r===dr)break}
    state.applying=true;for(const x of changes){x.el.value=x.after;x.el.dataset.editStart=x.after;recalcRow(x.el.closest('tr'))}state.applying=false;pushHistory(changes);statusDirty();showFillHandle(dest);
    if(window.showToast)showToast(`${changes.length} sel diisi dengan tarik.`,'success')
  }

  function attachGridEvents(body){
    body.querySelectorAll('.gp-cell').forEach(el=>{
      el.addEventListener('focus',()=>{el.dataset.editStart=el.value;showFillHandle(el)});
      el.addEventListener('input',()=>{if(!state.applying){statusDirty();recalcRow(el.closest('tr'))}});
      el.addEventListener('change',()=>{if(state.applying)return;commitFocused(el)});
      el.addEventListener('keydown',e=>handleKeydown(e,el));
      el.addEventListener('paste',e=>handlePaste(e,el));
    });
  }

  async function render(content){
    content.innerHTML='<div class="card"><span class="spinner"></span>Memuat kelas Tahfizh...</div>';
    try{
      state.boot=await call('bootstrap');const classes=state.boot.classes||[];
      if(!classes.length){content.innerHTML='<div class="empty-state">Belum ada kelas halaqah Tahfizh pada akun ini.</div>';return}
      state.classId='';state.students=[];state.reports=new Map();state.dirty=false;state.undo=[];state.redo=[];
      content.innerHTML=`<style>
      #gpt2-body .gp-tablewrap{overflow:auto;max-height:68vh}
      #gpt2-body .gp-table{border-collapse:separate;border-spacing:0;min-width:1750px}
      #gpt2-body .gp-table th{position:sticky;top:0;z-index:2}
      #gpt2-body .gp-cell{width:100%;box-sizing:border-box;border:1px solid var(--border,#d7e2e3);border-radius:6px;padding:7px 8px;background:#fff}
      #gpt2-body .gp-cell:focus{outline:2px solid #1976d2;outline-offset:-1px}
      #gpt2-body td.gp-active-cell{position:relative}
      #gpt2-body .gp-fill-handle{position:absolute;width:9px;height:9px;right:1px;bottom:1px;background:#1976d2;border:1px solid #fff;cursor:crosshair;z-index:5;touch-action:none}
      #gpt2-body .gp-formula{min-width:100px;padding:8px;border-radius:6px;background:#eef2f5;color:#445;font-weight:800;text-align:center;border:1px solid #d9e0e5;user-select:none}
      #gpt2-body .gp-formula::before{content:'🔒 ';font-size:10px}
      </style><div class="page-title">Nilai Tahfizh — PTS</div><div class="page-sub">Input seperti Excel: paste banyak sel, tarik isi, Arrow/Enter, Ctrl+Z undo, Ctrl+Y atau Ctrl+Shift+Z redo. Persentase terkunci dan dihitung otomatis.</div><div class="card"><div class="gp-toolbar" style="display:flex;gap:12px;align-items:end;flex-wrap:wrap"><div class="gp-field" style="min-width:240px"><label>Pilih Kelas Input</label><select id="gpt2-class" style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;background:#fff"><option value="">— Pilih kelas —</option>${classes.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></div><div class="gp-field"><label>Guru Halaqah</label><div class="gp-badge">${esc(state.boot.teacher_name||currentUser?.nama||'')}</div></div><span id="gpt2-status" class="gp-state">Pilih kelas terlebih dahulu</span><button class="btn gp-save" id="gpt2-save" disabled>Simpan</button></div><div id="gpt2-body" style="margin-top:12px"><div class="empty-state">Silakan pilih kelas input.</div></div></div>`;
      document.getElementById('gpt2-class').addEventListener('change',e=>loadClass(e.target.value));document.getElementById('gpt2-save').addEventListener('click',save)
    }catch(e){content.innerHTML=`<div class="card"><div class="empty-state"><b>Nilai Tahfizh gagal dimuat.</b><br>${esc(e.message)}<br><br><button class="btn" onclick="setActiveModule('partner-pts')">Coba Lagi</button></div></div>`}
  }

  async function loadClass(id){
    const body=document.getElementById('gpt2-body'),saveBtn=document.getElementById('gpt2-save'),st=document.getElementById('gpt2-status');state.classId=id;state.students=[];state.reports=new Map();state.dirty=false;state.undo=[];state.redo=[];removeFillHandle();
    if(!id){body.innerHTML='<div class="empty-state">Silakan pilih kelas input.</div>';saveBtn.disabled=true;st.textContent='Pilih kelas terlebih dahulu';return}
    body.innerHTML='<div style="padding:18px"><span class="spinner"></span>Memuat siswa halaqah...</div>';saveBtn.disabled=true;st.textContent='Memuat...';
    try{const d=await call('roster',{class_id:id});state.students=d.students||[];state.reports=new Map((d.reports||[]).map(r=>[r.student_id,r]));renderGrid(body,d);saveBtn.disabled=!state.students.length;st.textContent=state.students.length?'Tersimpan':'Tidak ada siswa'}catch(e){body.innerHTML=`<div class="empty-state">${esc(e.message)}</div>`;st.textContent='Gagal memuat'}
  }

  const beforeFormula=[['materi_hafalan','Materi Hafalan',180],['lp_tahfizh','LP Tahfizh',180],['realisasi_saat_ini','Realisasi Saat Ini',180],['prestasi_tahfizh','Prestasi Tahfizh',180],['jumlah_surat','Jml Surat',90],['jumlah_baris','Jml Baris',90],['jumlah_ayat','Jml Ayat',90],['jumlah_baris_lp','Jml Baris LP',100]];
  function inputCell(s,r,row,f,col){return `<td><input class="gp-cell" style="min-width:${f[2]}px" data-row="${row}" data-col="${col}" data-student="${esc(s.id)}" data-key="${f[0]}" value="${esc(r[f[0]]??'')}"></td>`}
  function renderGrid(body,d){
    if(!state.students.length){body.innerHTML='<div class="empty-state">Belum ada siswa pada halaqah ini.</div>';return}
    body.innerHTML=`<div class="gp-note">${state.students.length} siswa · Halaqah ${esc(d.halaqah_name||state.boot?.teacher_name||'')} · Sel abu-abu Persentase terkunci</div><div class="gp-tablewrap"><table class="gp-table"><thead><tr><th>No</th><th>Nama Siswa</th>${beforeFormula.map(f=>`<th>${f[1]}</th>`).join('')}<th>Persentase 🔒</th><th>Kenaikan Juz</th></tr></thead><tbody>${state.students.map((s,i)=>{const r=state.reports.get(s.id)||{},pct=calcPct(r.jumlah_baris,r.jumlah_baris_lp);return `<tr data-student="${esc(s.id)}"><td style="padding:8px;text-align:center">${i+1}</td><td class="name">${esc(s.full_name||s.name||'')}</td>${beforeFormula.map((f,c)=>inputCell(s,r,i,f,c)).join('')}<td><div class="gp-formula" data-formula="persentase" title="Otomatis: Jumlah Baris ÷ Jumlah Baris LP × 100">${esc(pct)}</div></td>${inputCell(s,r,i,['mengikuti_kenaikan_juz','Kenaikan Juz',120],9)}</tr>`}).join('')}</tbody></table></div>`;
    attachGridEvents(body)
  }

  async function save(){
    const btn=document.getElementById('gpt2-save'),st=document.getElementById('gpt2-status');if(!state.classId||!state.students.length)return;commitFocused(document.activeElement);
    const map=new Map(state.students.map(s=>[s.id,{student_id:s.id}]));document.querySelectorAll('#gpt2-body .gp-cell').forEach(el=>{const r=map.get(el.dataset.student);if(r)r[el.dataset.key]=el.value.trim()});
    btn.disabled=true;const old=btn.textContent;btn.textContent='Menyimpan...';
    try{const d=await call('save',{class_id:state.classId,items:[...map.values()]});state.dirty=false;st.textContent=`Tersimpan (${d.saved||state.students.length} siswa)`;if(window.showToast)showToast('Nilai PTS Tahfizh tersimpan.','success');await loadClass(state.classId)}catch(e){st.textContent='Gagal menyimpan';if(window.showToast)showToast(e.message,'error');else alert(e.message)}finally{btn.disabled=false;btn.textContent=old}
  }

  if(!install()){const obs=new MutationObserver(()=>{if(install())obs.disconnect()});obs.observe(document.documentElement,{childList:true,subtree:true});setTimeout(install,700)}
})();
