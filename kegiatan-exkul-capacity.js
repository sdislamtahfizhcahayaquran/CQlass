/* CQlass — Data Ekskul: kapasitas + pemindahan ke ekskul internal */
(function(){
  'use strict';
  const URL=SUPABASE_URL+'/functions/v1/activity-extracurricular';
  const S={summary:null,capacities:[],rows:[],state:'unknown'};
  const esc=v=>escapeHtml(String(v==null?'':v));
  const role=()=>String(currentUser?.role||'').toLowerCase();
  const canEdit=()=>role()==='kegiatan';

  async function req(action,payload={}){
    const token=getAuthToken();
    const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':token},body:JSON.stringify({action,...payload})});
    let d={};try{d=JSON.parse(await r.text()||'{}')}catch(_){throw new Error('Respons data ekskul tidak valid.');}
    if(!r.ok||d.success===false){const m={forbidden:'Akun tidak memiliki akses ke Data Ekskul.',readonly:'Data hanya dapat diubah Kabid Kegiatan.',student_internal:'Siswa sudah tercatat di ekskul internal.',extracurricular_full:'Ekskul yang dipilih sudah penuh.',invalid_internal_target:'Pilih ekskul internal terlebih dahulu.',student_not_enrolled:'Siswa tidak terdaftar aktif pada semester ini.',extracurricular_not_found:'Ekskul tidak ditemukan.'};throw new Error(m[d.error]||d.error||'Data ekskul belum berhasil diproses.');}
    return d;
  }
  async function loadAll(state){
    S.state=state||S.state||'unknown';
    const [a,b,c]=await Promise.all([req('summary'),req('capacities'),req('list',{state:S.state})]);
    S.summary=a.summary||{};S.capacities=b.rows||[];S.rows=c.rows||[];
  }
  function inject(){
    if(document.getElementById('kx-cap-style'))return;
    const s=document.createElement('style');s.id='kx-cap-style';s.textContent=`
      .kx-cap-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.kx-cap{border:1px solid var(--border);border-radius:12px;padding:11px;background:#fff}.kx-cap h4{font-size:11px;margin:0 0 7px}.kx-cap-line{display:flex;justify-content:space-between;gap:8px;font-size:9.5px;color:var(--muted)}.kx-meter{height:7px;border-radius:999px;background:#edf3f3;overflow:hidden;margin:7px 0}.kx-meter i{display:block;height:100%;background:var(--primary)}.kx-status{display:inline-flex;padding:4px 7px;border-radius:999px;font-size:8.7px;font-weight:900}.kx-status.ok{background:#e8f7ef;color:#357352}.kx-status.warn{background:#fff2de;color:#936500}.kx-status.full{background:#fff0ec;color:#ad4c39}.kx-move{display:grid;grid-template-columns:minmax(185px,1fr) auto;gap:5px;align-items:center;margin-bottom:6px}.kx-move select{min-width:185px}.kx-other{display:flex;gap:5px;flex-wrap:wrap}.kx-other input{min-width:150px}.kx-note{font-size:9px;color:var(--muted);margin-top:4px}@media(max-width:1000px){.kx-cap-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:620px){.kx-cap-grid{grid-template-columns:1fr}.kx-move{grid-template-columns:1fr}.kx-move select{min-width:0}}
    `;document.head.appendChild(s);
  }
  function fullnessLabel(x){return x.fullness==='FULL'?['Penuh','full']:x.fullness==='ALMOST_FULL'?['Hampir Penuh','warn']:['Tersedia','ok'];}
  function capacityOptions(){return S.capacities.filter(x=>x.selectable).map(x=>`<option value="${esc(x.id)}">${esc(x.name)} — sisa ${x.available_slots} (${x.active_students}/${x.quota})${x.fullness==='ALMOST_FULL'?' • hampir penuh':''}</option>`).join('');}
  function actionCell(r){
    if(!canEdit()||S.state==='internal')return'';
    const sid=esc(r.student_id),opts=capacityOptions();
    return `<td><div class="kx-move"><select id="kx-int-${sid}" class="kv2-select"><option value="">Pilih ekskul internal...</option>${opts}</select><button class="kv2-btn" onclick="kxMoveInternal('${sid}')">Pindah Internal</button></div>${S.state==='unknown'?`<div class="kx-other"><input id="kx-ext-${sid}" class="kv2-input" placeholder="Nama ekskul di luar"><button class="kv2-btn secondary" onclick="kxSetStatus('${sid}','external')">Ekskul Luar</button><button class="kv2-btn ghost" onclick="kxSetStatus('${sid}','none')">Tidak Ikut</button></div>`:''}</td>`;
  }
  function render(content){
    inject();
    const x=S.summary||{};const edit=canEdit();
    content.innerHTML=`<div class="kv2" id="kx-root"><div class="kv2-head"><div><h2>Data Ekskul Siswa</h2><p>Data internal dibaca dari sistem. Siswa yang belum punya status dapat dipindahkan ke ekskul internal selama kuota masih tersedia.</p></div><div class="kv2-actions"><button class="kv2-btn ghost" onclick="setActiveModule('dashboard')">Kembali ke Dashboard</button></div></div>
      <div class="kv2-kpis"><div class="kv2-kpi"><strong>${x.internal||0}</strong><span>Ekskul Internal</span></div><div class="kv2-kpi"><strong>${x.external||0}</strong><span>Ekskul di Luar</span></div><div class="kv2-kpi"><strong>${x.none||0}</strong><span>Tidak Ikut Ekskul</span></div><div class="kv2-kpi"><strong>${x.unknown||0}</strong><span>Belum Ada Status</span></div></div>
      <div class="kv2-card" style="margin-bottom:12px"><div class="kv2-title">Kapasitas Ekskul Internal</div><div class="kv2-sub">Status dihitung dari jumlah anggota aktif dibanding kuota resmi ekskul. Ekskul berstatus Penuh tidak bisa dipilih untuk pemindahan siswa.</div><div class="kx-cap-grid">${S.capacities.map(c=>{const [lab,cls]=fullnessLabel(c),pct=Math.min(100,Number(c.fill_pct||0));return`<div class="kx-cap"><h4>${esc(c.name)}</h4><div class="kx-cap-line"><span>${c.active_students} / ${c.quota} siswa</span><span>sisa ${c.available_slots}</span></div><div class="kx-meter"><i style="width:${pct}%"></i></div><div class="kx-cap-line"><span>${c.fill_pct}% terisi</span><span class="kx-status ${cls}">${lab}</span></div>${c.day_text||c.time_text?`<div class="kx-note">${esc(c.day_text||'')}${c.time_text?' · '+esc(c.time_text):''}</div>`:''}</div>`}).join('')}</div></div>
      <div class="kv2-card"><div class="kv2-tabs">${['internal','external','none','unknown'].map(k=>`<button class="kv2-tab ${S.state===k?'active':''}" onclick="kxTab('${k}')">${{internal:'Ekskul Internal',external:'Ekskul di Luar',none:'Tidak Ikut Ekskul',unknown:'Belum Ada Status'}[k]}</button>`).join('')}</div><div class="kv2-filters"><input id="kx-search" class="kv2-input" placeholder="Cari siswa / kelas..." oninput="kxFilter()"><span class="kv2-badge">${S.rows.length} siswa</span></div><div style="height:9px"></div><div class="kv2-tablewrap"><table class="kv2-table" style="min-width:${edit&&S.state!=='internal'?'1080':'760'}px"><thead><tr><th>Nama</th><th>Kelas</th><th>Keterangan</th>${edit&&S.state!=='internal'?'<th>Ubah Status / Pindahkan</th>':''}</tr></thead><tbody>${S.rows.length?S.rows.map(r=>`<tr class="kx-row" data-search="${esc((r.name+' '+r.class_name+' '+(r.activity_name||'')).toLowerCase())}"><td><b>${esc(r.name)}</b><div class="kv2-note">${esc(r.nis||'')}</div></td><td>${esc(r.class_name)}</td><td>${esc(r.activity_name||r.notes||'—')}</td>${actionCell(r)}</tr>`).join(''):`<tr><td colspan="4"><div class="kv2-empty">Tidak ada siswa pada status ini.</div></td></tr>`}</tbody></table></div></div></div>`;
  }
  async function boot(content,state){content.innerHTML='<div class="kv2"><div class="kv2-card"><span class="spinner"></span> Memuat data ekskul...</div></div>';try{await loadAll(state);render(content);}catch(e){content.innerHTML='<div class="kv2"><div class="kv2-card kv2-empty">'+esc(e.message)+'</div></div>';}}

  window.renderKegiatanEkskul=function(content){boot(content,S.state||'unknown');};
  window.kxTab=async function(state){const root=document.getElementById('content');if(root)await boot(root,state);};
  window.kxFilter=function(){const q=(document.getElementById('kx-search')?.value||'').toLowerCase().trim();document.querySelectorAll('.kx-row').forEach(r=>r.style.display=!q||(r.dataset.search||'').includes(q)?'':'none');};
  window.kxMoveInternal=async function(studentId){const sel=document.getElementById('kx-int-'+studentId),id=sel?.value||'';if(!id){showToast('Pilih ekskul internal terlebih dahulu.',true);return;}const c=S.capacities.find(x=>x.id===id);if(c?.fullness==='FULL'){showToast('Ekskul ini sudah penuh.',true);return;}if(!confirm(`Pindahkan siswa ini ke ${c?.name||'ekskul internal'}?`))return;try{const d=await req('set',{student_id:studentId,state:'internal',extracurricular_id:id});S.summary=d.summary||S.summary;S.capacities=d.capacities||S.capacities;showToast('Siswa berhasil dipindahkan ke ekskul internal.');await loadAll(S.state);render(document.getElementById('content'));}catch(e){showToast(e.message||'Pemindahan belum berhasil.',true);}};
  window.kxSetStatus=async function(studentId,state){try{const activity=document.getElementById('kx-ext-'+studentId)?.value||'';if(state==='external'&&!activity.trim()){showToast('Isi nama ekskul di luar terlebih dahulu.',true);return;}const d=await req('set',{student_id:studentId,state,activity_name:activity});S.summary=d.summary||S.summary;showToast('Status ekskul berhasil disimpan.');await loadAll(S.state);render(document.getElementById('content'));}catch(e){showToast(e.message||'Status belum tersimpan.',true);}};

  function bind(){try{if(typeof MODULE_GROUPS!=='undefined'){for(const g of MODULE_GROUPS){const it=(g.items||[]).find(x=>x.id==='kegiatan-ekskul');if(it)it.render=window.renderKegiatanEkskul;}}}catch(e){console.warn('Bind kapasitas ekskul gagal',e);}}
  bind();
  try{if(currentUser&&typeof renderSidebar==='function')renderSidebar();}catch(_){ }
})();
