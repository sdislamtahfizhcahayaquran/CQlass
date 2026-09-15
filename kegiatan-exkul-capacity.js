/* CQlass — Data Ekskul Kabid Kegiatan: ringkas, fokus tindak lanjut, kapasitas dapat dilipat */
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
    if(!r.ok||d.success===false){
      const m={forbidden:'Akun tidak memiliki akses ke Data Ekskul.',readonly:'Data hanya dapat diubah Kabid Kegiatan.',student_internal:'Siswa sudah tercatat di ekskul internal.',extracurricular_full:'Ekskul yang dipilih sudah penuh.',invalid_internal_target:'Pilih ekskul internal terlebih dahulu.',student_not_enrolled:'Siswa tidak terdaftar aktif pada semester ini.',extracurricular_not_found:'Ekskul tidak ditemukan.'};
      throw new Error(m[d.error]||d.error||'Data ekskul belum berhasil diproses.');
    }
    return d;
  }

  async function loadAll(state){
    S.state=state||S.state||'unknown';
    const [a,b,c]=await Promise.all([req('summary'),req('capacities'),req('list',{state:S.state})]);
    S.summary=a.summary||{};
    S.capacities=b.rows||[];
    S.rows=c.rows||[];
  }

  function inject(){
    if(document.getElementById('kx-cap-style-v2'))return;
    const s=document.createElement('style');
    s.id='kx-cap-style-v2';
    s.textContent=`
      #kx-root{max-width:1240px;margin:0 auto}
      #kx-root .kv2-head{margin-bottom:12px}
      #kx-root .kv2-head h2{font-size:25px;letter-spacing:-.02em}
      #kx-root .kv2-head p{max-width:760px;font-size:10.5px;line-height:1.55}
      .kx-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-bottom:12px}
      .kx-summary-btn{appearance:none;border:1px solid var(--border);background:#fff;border-radius:13px;padding:12px 13px;text-align:left;cursor:pointer;transition:.16s ease;min-width:0}
      .kx-summary-btn:hover{transform:translateY(-1px);border-color:#9ecbc7;box-shadow:0 6px 18px rgba(10,78,76,.07)}
      .kx-summary-btn.active{border-color:var(--primary);box-shadow:0 0 0 2px rgba(10,110,110,.08)}
      .kx-summary-btn.priority{background:#fff9ef;border-color:#f0d49b}
      .kx-summary-btn strong{display:block;font-size:25px;line-height:1;color:#075b59}
      .kx-summary-btn.priority strong{color:#9a6400}
      .kx-summary-btn span{display:block;margin-top:6px;font-size:9.5px;font-weight:850;color:var(--muted)}
      .kx-workcard{background:#fff;border:1px solid var(--border);border-radius:15px;padding:13px;margin-bottom:10px}
      .kx-toolbar{display:grid;grid-template-columns:1fr 170px auto;gap:7px;align-items:center;margin-top:10px}
      .kx-toolbar .kv2-input,.kx-toolbar .kv2-select{width:100%;box-sizing:border-box}
      .kx-table-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
      .kx-table-head .kv2-title{margin:0}
      .kx-count{white-space:nowrap}
      .kx-cap-details{background:#fff;border:1px solid var(--border);border-radius:15px;margin-bottom:12px;overflow:hidden}
      .kx-cap-details>summary{list-style:none;cursor:pointer;padding:13px 15px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:11px;font-weight:900;color:var(--text)}
      .kx-cap-details>summary::-webkit-details-marker{display:none}
      .kx-cap-details>summary:after{content:'▾';font-size:13px;color:var(--muted);transition:transform .15s ease}
      .kx-cap-details[open]>summary:after{transform:rotate(180deg)}
      .kx-cap-summary-meta{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-left:auto;margin-right:4px}
      .kx-mini{display:inline-flex;padding:4px 7px;border-radius:999px;background:#eef6f5;color:#47706d;font-size:8.5px;font-weight:850}
      .kx-mini.warn{background:#fff2de;color:#936500}.kx-mini.full{background:#fff0ec;color:#ad4c39}
      .kx-cap-body{padding:0 13px 13px;border-top:1px solid var(--border)}
      .kx-cap-help{font-size:9px;color:var(--muted);margin:10px 1px 9px;line-height:1.45}
      .kx-cap-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}
      .kx-cap{border:1px solid var(--border);border-radius:11px;padding:9px 10px;background:#fff;min-width:0}
      .kx-cap h4{font-size:10.5px;margin:0 0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .kx-cap-line{display:flex;justify-content:space-between;gap:7px;font-size:8.9px;color:var(--muted)}
      .kx-meter{height:6px;border-radius:999px;background:#edf3f3;overflow:hidden;margin:6px 0}.kx-meter i{display:block;height:100%;background:var(--primary)}
      .kx-status{display:inline-flex;padding:3px 6px;border-radius:999px;font-size:8px;font-weight:900}.kx-status.ok{background:#e8f7ef;color:#357352}.kx-status.warn{background:#fff2de;color:#936500}.kx-status.full{background:#fff0ec;color:#ad4c39}.kx-status.over{background:#ffe7e2;color:#9d3424}
      .kx-move{display:grid;grid-template-columns:minmax(175px,1fr) auto;gap:5px;align-items:center;margin-bottom:5px}.kx-move select{min-width:175px}
      .kx-other{display:flex;gap:5px;flex-wrap:wrap}.kx-other input{min-width:145px;flex:1}
      .kx-note{font-size:8.6px;color:var(--muted);margin-top:4px}
      .kx-row-priority td{background:#fffdf8}
      #kx-root .kv2-tablewrap{max-height:53vh}
      #kx-root .kv2-table th{top:0}
      @media(max-width:1000px){.kx-cap-grid{grid-template-columns:repeat(2,1fr)}.kx-toolbar{grid-template-columns:1fr 150px}.kx-toolbar .kx-count{grid-column:1/-1;justify-self:start}.kx-summary{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:620px){.kx-cap-grid,.kx-summary{grid-template-columns:1fr 1fr}.kx-move{grid-template-columns:1fr}.kx-move select{min-width:0}.kx-toolbar{grid-template-columns:1fr}.kx-toolbar .kx-count{grid-column:auto}.kx-cap-details>summary{align-items:flex-start;flex-wrap:wrap}.kx-cap-summary-meta{margin-left:0;width:100%}}
      @media(max-width:430px){.kx-summary{grid-template-columns:1fr}}
    `;
    document.head.appendChild(s);
  }

  function fullnessLabel(x){
    const active=Number(x.active_students||0),quota=Number(x.quota||0);
    if(quota>0&&active>quota)return['Melebihi Kuota','over'];
    if(x.fullness==='FULL')return['Penuh','full'];
    if(x.fullness==='ALMOST_FULL')return['Hampir Penuh','warn'];
    return['Tersedia','ok'];
  }

  function capacityOptions(){
    return S.capacities.filter(x=>x.selectable).map(x=>`<option value="${esc(x.id)}">${esc(x.name)} — sisa ${Math.max(0,Number(x.available_slots||0))} (${x.active_students}/${x.quota})${x.fullness==='ALMOST_FULL'?' • hampir penuh':''}</option>`).join('');
  }

  function actionCell(r){
    if(!canEdit()||S.state==='internal')return'';
    const sid=esc(r.student_id),opts=capacityOptions();
    return `<td><div class="kx-move"><select id="kx-int-${sid}" class="kv2-select"><option value="">Pilih ekskul internal...</option>${opts}</select><button class="kv2-btn" onclick="kxMoveInternal('${sid}')">Pindah Internal</button></div>${S.state==='unknown'?`<div class="kx-other"><input id="kx-ext-${sid}" class="kv2-input" placeholder="Nama ekskul di luar"><button class="kv2-btn secondary" onclick="kxSetStatus('${sid}','external')">Ekskul Luar</button><button class="kv2-btn ghost" onclick="kxSetStatus('${sid}','none')">Tidak Ikut</button></div>`:''}</td>`;
  }

  function stateLabel(state){return{internal:'Ekskul Internal',external:'Ekskul di Luar',none:'Tidak Ikut Ekskul',unknown:'Belum Ada Status'}[state]||state;}

  function classOptions(){
    const list=[...new Set(S.rows.map(r=>String(r.class_name||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id',{numeric:true}));
    return '<option value="">Semua kelas</option>'+list.map(x=>`<option value="${esc(x)}">${esc(x)}</option>`).join('');
  }

  function capacitySummary(){
    const available=S.capacities.filter(c=>c.fullness!=='FULL'&&Number(c.active_students||0)<=Number(c.quota||0)).length;
    const almost=S.capacities.filter(c=>c.fullness==='ALMOST_FULL').length;
    const full=S.capacities.filter(c=>c.fullness==='FULL'||Number(c.active_students||0)>Number(c.quota||0)).length;
    return {available,almost,full};
  }

  function capacityCards(){
    return S.capacities.map(c=>{
      const [lab,cls]=fullnessLabel(c);
      const pct=Math.min(100,Math.max(0,Number(c.fill_pct||0)));
      const remaining=Math.max(0,Number(c.available_slots||0));
      return `<div class="kx-cap" title="${esc(c.name)}"><h4>${esc(c.name)}</h4><div class="kx-cap-line"><span>${c.active_students} / ${c.quota} siswa</span><span>sisa ${remaining}</span></div><div class="kx-meter"><i style="width:${pct}%"></i></div><div class="kx-cap-line"><span>${c.fill_pct}% terisi</span><span class="kx-status ${cls}">${lab}</span></div>${c.day_text||c.time_text?`<div class="kx-note">${esc(c.day_text||'')}${c.time_text?' · '+esc(c.time_text):''}</div>`:''}</div>`;
    }).join('');
  }

  function render(content){
    inject();
    const x=S.summary||{};
    const edit=canEdit();
    const cap=capacitySummary();
    const priority=S.state==='unknown';
    const colSpan=edit&&S.state!=='internal'?4:3;
    content.innerHTML=`<div class="kv2" id="kx-root">
      <div class="kv2-head"><div><h2>Data Ekskul Siswa</h2><p>Fokuskan tindak lanjut pada siswa yang belum memiliki status. Data ekskul internal dibaca langsung dari sistem dan kapasitas hanya perlu dibuka saat akan memindahkan siswa.</p></div><div class="kv2-actions"><button class="kv2-btn ghost" onclick="setActiveModule('dashboard')">Kembali ke Dashboard</button></div></div>

      <div class="kx-summary">
        <button class="kx-summary-btn ${S.state==='internal'?'active':''}" onclick="kxTab('internal')"><strong>${x.internal||0}</strong><span>Ekskul Internal</span></button>
        <button class="kx-summary-btn ${S.state==='external'?'active':''}" onclick="kxTab('external')"><strong>${x.external||0}</strong><span>Ekskul di Luar</span></button>
        <button class="kx-summary-btn ${S.state==='none'?'active':''}" onclick="kxTab('none')"><strong>${x.none||0}</strong><span>Tidak Ikut Ekskul</span></button>
        <button class="kx-summary-btn priority ${S.state==='unknown'?'active':''}" onclick="kxTab('unknown')"><strong>${x.unknown||0}</strong><span>Belum Ada Status · perlu ditindaklanjuti</span></button>
      </div>

      <div class="kx-workcard">
        <div class="kx-table-head"><div><div class="kv2-title">${esc(stateLabel(S.state))}</div><div class="kv2-sub" style="margin-bottom:0">${priority?'Prioritas: lengkapi status siswa agar rekap ekskul bersih dan tidak ada data menggantung.':'Gunakan pencarian dan filter kelas untuk menemukan siswa dengan cepat.'}</div></div><span class="kv2-badge kx-count" id="kx-visible-count">${S.rows.length} siswa</span></div>
        <div class="kv2-tabs" style="margin-top:10px">${['unknown','internal','external','none'].map(k=>`<button class="kv2-tab ${S.state===k?'active':''}" onclick="kxTab('${k}')">${esc(stateLabel(k))}</button>`).join('')}</div>
        <div class="kx-toolbar"><input id="kx-search" class="kv2-input" placeholder="Cari nama siswa, NIS, kelas, atau ekskul..." oninput="kxFilter()"><select id="kx-class" class="kv2-select" onchange="kxFilter()">${classOptions()}</select><span class="kv2-badge kx-count">${edit&&S.state!=='internal'?'Status dapat diperbarui':'Mode lihat'}</span></div>
        <div style="height:9px"></div>
        <div class="kv2-tablewrap"><table class="kv2-table" style="min-width:${edit&&S.state!=='internal'?'1020':'720'}px"><thead><tr><th>Nama</th><th>Kelas</th><th>Keterangan</th>${edit&&S.state!=='internal'?'<th>Ubah Status / Pindahkan</th>':''}</tr></thead><tbody>${S.rows.length?S.rows.map(r=>`<tr class="kx-row ${priority?'kx-row-priority':''}" data-class="${esc(r.class_name||'')}" data-search="${esc((r.name+' '+(r.nis||'')+' '+r.class_name+' '+(r.activity_name||'')+' '+(r.notes||'')).toLowerCase())}"><td><b>${esc(r.name)}</b><div class="kv2-note">${esc(r.nis||'')}</div></td><td>${esc(r.class_name)}</td><td>${esc(r.activity_name||r.notes||'—')}</td>${actionCell(r)}</tr>`).join(''):`<tr><td colspan="${colSpan}"><div class="kv2-empty">Tidak ada siswa pada status ini.</div></td></tr>`}</tbody></table></div>
      </div>

      <details class="kx-cap-details">
        <summary><span>Kapasitas Ekskul Internal</span><span class="kx-cap-summary-meta"><span class="kx-mini">${cap.available} tersedia</span>${cap.almost?`<span class="kx-mini warn">${cap.almost} hampir penuh</span>`:''}${cap.full?`<span class="kx-mini full">${cap.full} penuh / lebih kuota</span>`:''}</span></summary>
        <div class="kx-cap-body"><div class="kx-cap-help">Buka bagian ini hanya saat perlu mengecek kuota. Ekskul yang penuh atau melebihi kuota tidak dapat dipilih untuk pemindahan siswa.</div><div class="kx-cap-grid">${capacityCards()}</div></div>
      </details>
    </div>`;
    kxFilter();
  }

  async function boot(content,state){
    content.innerHTML='<div class="kv2"><div class="kv2-card"><span class="spinner"></span> Memuat data ekskul...</div></div>';
    try{await loadAll(state);render(content);}catch(e){content.innerHTML='<div class="kv2"><div class="kv2-card kv2-empty">'+esc(e.message)+'</div></div>';}
  }

  window.renderKegiatanEkskul=function(content){boot(content,S.state||'unknown');};
  window.kxTab=async function(state){const root=document.getElementById('content');if(root)await boot(root,state);};
  window.kxFilter=function(){
    const q=(document.getElementById('kx-search')?.value||'').toLowerCase().trim();
    const cls=(document.getElementById('kx-class')?.value||'').trim();
    let visible=0;
    document.querySelectorAll('.kx-row').forEach(r=>{
      const okQ=!q||(r.dataset.search||'').includes(q);
      const okC=!cls||(r.dataset.class||'')===cls;
      const show=okQ&&okC;
      r.style.display=show?'':'none';
      if(show)visible++;
    });
    const el=document.getElementById('kx-visible-count');if(el)el.textContent=visible+' siswa';
  };

  window.kxMoveInternal=async function(studentId){
    const sel=document.getElementById('kx-int-'+studentId),id=sel?.value||'';
    if(!id){showToast('Pilih ekskul internal terlebih dahulu.',true);return;}
    const c=S.capacities.find(x=>x.id===id);
    if(c?.fullness==='FULL'||Number(c?.active_students||0)>=Number(c?.quota||0)){showToast('Ekskul ini sudah penuh.',true);return;}
    if(!confirm(`Pindahkan siswa ini ke ${c?.name||'ekskul internal'}?`))return;
    try{
      const d=await req('set',{student_id:studentId,state:'internal',extracurricular_id:id});
      S.summary=d.summary||S.summary;S.capacities=d.capacities||S.capacities;
      showToast('Siswa berhasil dipindahkan ke ekskul internal.');
      await loadAll(S.state);render(document.getElementById('content'));
    }catch(e){showToast(e.message||'Pemindahan belum berhasil.',true);}
  };

  window.kxSetStatus=async function(studentId,state){
    try{
      const activity=document.getElementById('kx-ext-'+studentId)?.value||'';
      if(state==='external'&&!activity.trim()){showToast('Isi nama ekskul di luar terlebih dahulu.',true);return;}
      const d=await req('set',{student_id:studentId,state,activity_name:activity});
      S.summary=d.summary||S.summary;
      showToast('Status ekskul berhasil disimpan.');
      await loadAll(S.state);render(document.getElementById('content'));
    }catch(e){showToast(e.message||'Status belum tersimpan.',true);}
  };

  function bind(){
    try{
      if(typeof MODULE_GROUPS!=='undefined'){
        for(const g of MODULE_GROUPS){
          const it=(g.items||[]).find(x=>x.id==='kegiatan-ekskul');
          if(it)it.render=window.renderKegiatanEkskul;
        }
      }
    }catch(e){console.warn('Bind kapasitas ekskul gagal',e);}
  }

  bind();
  try{if(currentUser&&typeof renderSidebar==='function')renderSidebar();}catch(_){ }
})();
