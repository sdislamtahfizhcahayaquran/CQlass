/* CQlass HRD — Useful Role-aware Per-Teacher Stat Highlight */
(function(){
  'use strict';
  if(window.__cqHrdPeriodBar) return;
  window.__cqHrdPeriodBar=true;

  const BASE=typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
  const KEY=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
  const LIVE_URL=BASE+'/functions/v1/hrd-live-report-v2';
  let highlightCache={key:'',data:null};

  const low=v=>String(v||'').trim().toLowerCase();
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date(String(v).slice(0,10)+'T00:00:00+07:00'))}catch(_){return String(v)}};
  const fmtShort=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(String(v).slice(0,10)+'T00:00:00+07:00'))}catch(_){return String(v)}};
  const statusLabel=v=>({present:'Lengkap',missing:'Belum',partial:'Sebagian',na:'Tidak Berlaku',contextual:'Informasi',separate:'Operasional'}[low(v)]||v||'—');
  const context=(t,key)=>(t.context_categories||[]).find(x=>x.key===key);
  const regular=(t,key)=>(t.categories||[]).find(x=>x.key===key);
  const applicableRequired=t=>(t.categories||[]).filter(x=>x.applicable);

  function isHRD(){
    try{
      if(low(window.currentUser?.role)==='hrd') return true;
      const u=JSON.parse(localStorage.getItem('cqlass_user')||'{}');
      return [u.role,u.primary_role,u.role_code].map(low).includes('hrd');
    }catch(_){return false}
  }

  function roleProfile(t){
    const p=low(t.position),sa=context(t,'student_affairs_reporting'),tah=regular(t,'tahfizh'),principal=regular(t,'principal_work');
    const roles=[];
    if(/kepala sekolah|kepsek/.test(p)||principal?.applicable) roles.push('Kepala Sekolah');
    if(/kabid/.test(p)) roles.push(t.position||'Kabid');
    if(sa?.applicable) roles.push('Wali Kelas');
    if(/tahfizh|tahfiz/.test(p)||tah?.applicable) roles.push('Guru Tahfizh');
    if(!roles.length&&/guru/.test(p)) roles.push(t.position||'Guru');
    if(!roles.length) roles.push(t.position||'Pegawai');
    return {label:[...new Set(roles)].join(' + '),isHomeroom:!!sa?.applicable,isTahfizh:!!(/tahfizh|tahfiz/.test(p)||tah?.applicable),isPrincipal:!!(/kepala sekolah|kepsek/.test(p)||principal?.applicable)};
  }

  function initials(name){
    const p=String(name||'?').trim().split(/\s+/).filter(Boolean);
    return ((p[0]?.[0]||'?')+(p.length>1?p[p.length-1][0]:'')).toUpperCase();
  }

  function css(){
    if(!document.getElementById('cq-hrd-period-bar-style')){
      const s=document.createElement('style');s.id='cq-hrd-period-bar-style';s.textContent=`
        .cq-hrd-periodbar{margin:12px 0 16px;background:#fff;border:1px solid #d9e8e6;border-radius:16px;padding:13px 15px;box-shadow:0 5px 18px rgba(21,74,74,.05)}
        .cq-hrd-periodbar-main{display:flex;align-items:center;justify-content:space-between;gap:14px}.cq-hrd-periodbar-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#789090;font-weight:850;margin-bottom:4px}.cq-hrd-periodbar-range{font-size:15px;font-weight:850;color:#153f3f;line-height:1.35}
        .cq-hrd-periodbar-change{border:1px solid #cfe2df;background:#eef8f6;color:#0A6E6E;border-radius:11px;height:38px;padding:0 13px;font:800 11px Inter,sans-serif;cursor:pointer;white-space:nowrap}.cq-hrd-periodbar-edit{display:none;align-items:end;gap:9px;flex-wrap:wrap;padding-top:12px;margin-top:12px;border-top:1px dashed #dce8e7}.cq-hrd-periodbar.editing .cq-hrd-periodbar-edit{display:flex}.cq-hrd-periodbar-edit .hrd-date-field{min-width:160px;margin:0}.cq-hrd-periodbar-edit .hrd-apply{margin:0}
        #hrd-root .hrd-cat-field{display:none!important}#hrd-root .hrd-chip-grid,#hrd-root .hrd-context-title{display:none!important}
        .hrd-admin-card-head[data-cq-highlight]{cursor:pointer;border-radius:12px;padding:5px;margin:-5px -5px 6px;transition:.15s}.hrd-admin-card-head[data-cq-highlight]:hover{background:#f0f8f7}
        .cq-card-open{width:100%;margin-top:8px;border:1px solid #cfe4e1;background:#f1f8f7;color:#0b6762;border-radius:12px;padding:10px 12px;text-align:left;cursor:pointer;font:800 10px/1.35 Inter,sans-serif}.cq-card-open span{display:block;color:#78908d;font-weight:600;font-size:9px;margin-top:3px}.cq-card-open:hover{background:#e7f4f1}
        @media(max-width:650px){.cq-hrd-periodbar-main{align-items:flex-start}.cq-hrd-periodbar-range{font-size:13px}.cq-hrd-periodbar-edit{display:none;grid-template-columns:1fr 1fr}.cq-hrd-periodbar.editing .cq-hrd-periodbar-edit{display:grid}.cq-hrd-periodbar-edit .hrd-date-field{min-width:0}.cq-hrd-periodbar-edit .hrd-apply{grid-column:1/-1;width:100%}}
      `;document.head.appendChild(s);
    }
    if(document.getElementById('cq-hrd-highlight-style'))return;
    const s=document.createElement('style');s.id='cq-hrd-highlight-style';s.textContent=`
      .cq-hl-overlay{position:fixed;inset:0;z-index:10050;background:rgba(6,35,35,.44);display:none;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}.cq-hl-overlay.open{display:flex}
      .cq-hl-card{width:min(1080px,97vw);max-height:92vh;overflow:auto;background:#f8fbfa;border:1px solid #d9e7e5;border-radius:24px;box-shadow:0 24px 70px rgba(4,45,45,.22)}
      .cq-hl-head{position:sticky;top:0;z-index:8;display:flex;justify-content:space-between;gap:18px;align-items:center;padding:17px 22px;background:rgba(255,255,255,.97);border-bottom:1px solid #e1ebea;backdrop-filter:blur(10px)}.cq-hl-ident{display:flex;align-items:center;gap:14px;min-width:0}.cq-hl-photo{width:70px;height:70px;border-radius:19px;overflow:hidden;background:#e7f3f1;color:#0a6e6e;display:grid;place-items:center;flex:none;font:900 22px 'Plus Jakarta Sans',Inter,sans-serif;border:1px solid #d3e6e3}.cq-hl-photo img{width:100%;height:100%;display:block;object-fit:cover}.cq-hl-copy{min-width:0}.cq-hl-head h3{margin:0;color:#153f3d;font:800 20px/1.25 'Plus Jakarta Sans',Inter,sans-serif;white-space:normal}.cq-hl-head p{margin:5px 0 0;color:#78908d;font-size:10px;line-height:1.45}.cq-hl-role{display:inline-flex;margin-top:7px;padding:5px 9px;border-radius:999px;background:#e9f5f3;color:#0a6964;font-size:9px;font-weight:850}.cq-hl-close{border:0;background:#edf5f4;color:#35615e;width:38px;height:38px;border-radius:12px;font-size:22px;cursor:pointer;flex:none}.cq-hl-body{padding:18px 20px 26px}.cq-hl-loading,.cq-hl-empty{padding:34px;text-align:center;color:#829390;font-size:11px}
      .cq-overview{display:grid;grid-template-columns:300px minmax(0,1fr);gap:14px}.cq-score-panel,.cq-section{border:1px solid #dfeae8;border-radius:18px;background:#fff}.cq-score-panel{padding:17px;display:grid;grid-template-columns:100px minmax(0,1fr);gap:15px;align-items:center;background:linear-gradient(145deg,#f1faf8,#fff)}
      .cq-ring{--p:0;width:96px;height:96px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#0a6e6e calc(var(--p)*1%),#e4efed 0);position:relative}.cq-ring:after{content:'';position:absolute;inset:9px;border-radius:50%;background:#fff}.cq-ring strong{position:relative;z-index:1;color:#124946;font:800 24px/1 'Plus Jakarta Sans',Inter,sans-serif}.cq-score-copy b{display:block;color:#214846;font-size:12px}.cq-score-copy span{display:block;margin-top:4px;color:#78908d;font-size:9px;line-height:1.5}.cq-score-mini{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}.cq-score-mini em{font-style:normal;padding:5px 7px;border-radius:8px;background:#eef6f5;color:#406c69;font-size:8px;font-weight:800}
      .cq-summary{padding:17px}.cq-panel-title{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;margin-bottom:11px}.cq-panel-title h4{margin:0;color:#244c49;font-size:12px}.cq-panel-title small{color:#8a9a98;font-size:8.7px}.cq-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}.cq-summary-box{padding:11px 12px;border-radius:13px;background:#f4f9f8}.cq-summary-box.good{background:#eef8f2}.cq-summary-box.warn{background:#fff7ee}.cq-summary-box b{display:block;color:#28504d;font-size:10px}.cq-summary-box span{display:block;color:#738a87;font-size:9px;line-height:1.45;margin-top:3px}
      .cq-section{padding:16px 17px;margin-top:14px}.cq-academic-summary{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.cq-academic-summary span{padding:7px 9px;border-radius:10px;background:#eef7f5;color:#315e5a;font-size:9px;font-weight:800}.cq-assignment{border:1px solid #e1ebe9;border-radius:15px;background:#fcfefe;margin-top:9px;overflow:hidden}.cq-assignment-head{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:11px 13px;background:#f3f8f7;border-bottom:1px solid #e4edeb}.cq-assignment-head b{display:block;color:#244e4b;font-size:11px}.cq-assignment-head small{display:block;color:#7e9290;font-size:8.7px;margin-top:2px}.cq-assignment-head strong{color:#0a6e6e;font-size:10px;white-space:nowrap}.cq-tp-list{display:grid}.cq-tp{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:9px;align-items:start;padding:10px 12px;border-bottom:1px solid #edf2f1}.cq-tp:last-child{border-bottom:0}.cq-tp-code{width:38px;height:25px;border-radius:8px;display:grid;place-items:center;background:#e8f6ef;color:#24704a;font-size:8.5px;font-weight:900}.cq-tp.missing .cq-tp-code{background:#f3f5f4;color:#8b9997}.cq-tp-main b{display:block;color:#2f504e;font-size:9.7px;line-height:1.42}.cq-tp-main small{display:block;color:#849492;font-size:8.4px;margin-top:3px;line-height:1.4}.cq-tp-status{font-size:8.5px;font-weight:850;border-radius:999px;padding:5px 7px;background:#e7f7ee;color:#26724b;white-space:nowrap}.cq-tp.missing .cq-tp-status{background:#f2f4f4;color:#82918f}
      .cq-work-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.cq-work{border:1px solid #e2ebe9;border-radius:14px;padding:12px;background:#fff}.cq-work-head{display:flex;justify-content:space-between;gap:9px;align-items:center}.cq-work-head b{font-size:10.5px;color:#2c504d}.cq-work-state{font-size:8px;font-weight:850;padding:4px 7px;border-radius:999px;background:#eef2f1;color:#72817f}.cq-work-state.present{background:#e8f7ee;color:#217047}.cq-work-state.missing{background:#fdeceb;color:#a14942}.cq-work-state.partial{background:#fff3dc;color:#89661d}.cq-work-note{font-size:8.6px;color:#81928f;line-height:1.45;margin-top:5px}.cq-work-items{display:grid;margin-top:8px}.cq-work-item{padding:7px 0;border-top:1px solid #edf2f1}.cq-work-item b{display:block;font-size:9.2px;color:#3e5b59;line-height:1.35}.cq-work-item small{display:block;font-size:8.2px;color:#899795;margin-top:2px;line-height:1.35}.cq-more{font-size:8.3px;color:#738784;padding-top:7px;border-top:1px solid #edf2f1;font-weight:750}
      .cq-op-list{display:grid}.cq-op-row{display:grid;grid-template-columns:160px minmax(0,1fr);gap:10px;padding:9px 2px;border-bottom:1px solid #edf2f1}.cq-op-row:last-child{border-bottom:0}.cq-op-row b{color:#31514e;font-size:9.5px}.cq-op-row span{color:#798c89;font-size:9px;line-height:1.5}
      @media(max-width:760px){.cq-overview{grid-template-columns:1fr}.cq-work-grid{grid-template-columns:1fr}.cq-summary-grid{grid-template-columns:1fr}.cq-hl-body{padding:13px}.cq-hl-head{padding:13px 14px}.cq-hl-photo{width:58px;height:58px;border-radius:16px}.cq-op-row{grid-template-columns:1fr}.cq-tp{grid-template-columns:38px minmax(0,1fr)}.cq-tp-status{grid-column:2}}
      @media(max-width:460px){.cq-hl-overlay{padding:5px}.cq-hl-card{max-height:97vh;border-radius:18px}.cq-score-panel{grid-template-columns:86px 1fr}.cq-ring{width:82px;height:82px}.cq-hl-head h3{font-size:16px}}
    `;document.head.appendChild(s);
  }

  function ensureHighlightModal(){
    let el=document.getElementById('cq-hrd-person-highlight');
    if(el)return el;
    el=document.createElement('div');el.id='cq-hrd-person-highlight';el.className='cq-hl-overlay';
    el.innerHTML='<div class="cq-hl-card" onclick="event.stopPropagation()"><div class="cq-hl-head"><div class="cq-hl-ident"><div class="cq-hl-photo" id="cq-hl-photo">?</div><div class="cq-hl-copy"><h3 id="cq-hl-name">Stat Highlight</h3><p id="cq-hl-meta"></p><span class="cq-hl-role" id="cq-hl-role">Role</span></div></div><button class="cq-hl-close" type="button">×</button></div><div class="cq-hl-body" id="cq-hl-body"></div></div>';
    el.addEventListener('click',closeHighlight);el.querySelector('.cq-hl-close').addEventListener('click',closeHighlight);document.body.appendChild(el);return el;
  }
  function closeHighlight(){const el=document.getElementById('cq-hrd-person-highlight');if(el)el.classList.remove('open');document.body.style.overflow=''}

  async function liveData(start,end){
    const key=start+'|'+end;if(highlightCache.key===key&&highlightCache.data)return highlightCache.data;
    const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||'';
    const r=await fetch(LIVE_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':token},body:JSON.stringify({action:'administration',start,end})});
    const d=await r.json().catch(()=>({success:false,error:'Respons tidak valid'}));
    if(!r.ok||d.success===false)throw new Error(d.message||d.error||'Data HRD gagal dimuat.');
    highlightCache={key,data:d};return d;
  }

  function namesByStatus(t,statuses){return applicableRequired(t).filter(c=>statuses.includes(low(c.status))).map(c=>c.label||c.key)}
  const joinNames=(a,empty)=>a.length?a.join(', '):(empty||'Tidak ada');

  function academicHtml(t){
    const detail=t.academic_tp_detail||[],sum=t.academic_tp_summary||{};
    if(!detail.length){
      const ac=regular(t,'academic');
      if(!ac?.applicable)return '';
      return `<section class="cq-section"><div class="cq-panel-title"><h4>Nilai & Tujuan Pembelajaran</h4><small>Data akademik</small></div><div class="cq-hl-empty">${ac.status==='missing'?'Belum ada nilai TP yang tercatat.':'Data nilai ada, tetapi rincian TP belum tersedia untuk penugasan ini.'}</div></section>`;
    }
    const blocks=detail.map(a=>{
      const tps=(a.tp||[]);
      const rows=tps.length?tps.map(tp=>{
        const entered=tp.status==='entered';
        const meta=entered?[`${tp.scored_students||0} siswa sudah dinilai`,tp.average_score!=null?`rata-rata ${tp.average_score}`:'',tp.last_updated_at?`terakhir ${fmtShort(tp.last_updated_at)}`:''].filter(Boolean).join(' · '):'Belum ada nilai siswa pada TP ini';
        return `<div class="cq-tp ${entered?'entered':'missing'}"><div class="cq-tp-code">${esc(tp.code||'TP')}</div><div class="cq-tp-main"><b>${esc(tp.description||'Tujuan pembelajaran')}</b><small>${esc(meta)}</small></div><span class="cq-tp-status">${entered?'✓ Sudah input':'Belum input'}</span></div>`;
      }).join(''):'<div class="cq-hl-empty">Belum ada master Tujuan Pembelajaran pada mapel/kelas ini.</div>';
      return `<article class="cq-assignment"><div class="cq-assignment-head"><div><b>${esc(a.subject_name)} · ${esc(a.class_name)}</b><small>${esc(a.students_scored||0)} siswa memiliki nilai TP · ${esc(a.score_rows||0)} data nilai</small></div><strong>${esc(a.entered_tp||0)}/${esc(a.total_tp||0)} TP terisi</strong></div><div class="cq-tp-list">${rows}</div></article>`;
    }).join('');
    return `<section class="cq-section"><div class="cq-panel-title"><h4>Nilai & Tujuan Pembelajaran</h4><small>Langsung dari Input Nilai TP</small></div><div class="cq-academic-summary"><span>${esc(sum.entered_tp||0)} dari ${esc(sum.total_tp||0)} TP sudah memiliki nilai</span><span>${esc(sum.students_scored||0)} siswa bernilai</span><span>${esc(sum.score_rows||0)} data nilai TP</span></div>${blocks}</section>`;
  }

  function usefulItems(c,max=5){
    const items=(c?.items||[]).slice().sort((a,b)=>String(b.created_at||b.period_start||'').localeCompare(String(a.created_at||a.period_start||'')));
    if(!items.length)return c?.status==='missing'?'<div class="cq-work-note">Belum ada data yang tercatat.</div>':'<div class="cq-work-note">Belum ada rincian yang perlu ditampilkan.</div>';
    const shown=items.slice(0,max).map(x=>{
      const meta=[x.description,x.period_start?fmtShort(x.period_start):'',x.created_at&&!x.period_start?fmtShort(x.created_at):''].filter(Boolean).join(' · ');
      return `<div class="cq-work-item"><b>${esc(x.title||c.label||'Data')}</b>${meta?`<small>${esc(meta)}</small>`:''}</div>`;
    }).join('');
    return shown+(items.length>max?`<div class="cq-more">+ ${items.length-max} data lainnya tercatat</div>`:'');
  }

  function workHtml(t){
    const allowed=(t.categories||[]).filter(c=>c.applicable&&c.key!=='academic');
    if(!allowed.length)return '';
    const cards=allowed.map(c=>`<article class="cq-work"><div class="cq-work-head"><b>${esc(c.label||c.key)}</b><span class="cq-work-state ${esc(c.status)}">${esc(statusLabel(c.status))}</span></div><div class="cq-work-note">${esc(c.note||'Data dibaca otomatis dari CQlass.')}</div><div class="cq-work-items">${usefulItems(c)}</div></article>`).join('');
    return `<section class="cq-section"><div class="cq-panel-title"><h4>Administrasi & Pekerjaan Tercatat</h4><small>Tanpa chip dan tanpa drill-down</small></div><div class="cq-work-grid">${cards}</div></section>`;
  }

  function operationalHtml(t){
    const rows=[];
    const bad=context(t,'badal');
    if(bad){
      const items=bad.items||[],inCount=items.filter(x=>/menggantikan/i.test(x.title||'')).length,outCount=items.filter(x=>/digantikan/i.test(x.title||'')).length;
      if(items.length)rows.push(['Badal Mengajar',`${inCount} kali menggantikan · ${outCount} kali digantikan. ${items.slice(0,3).map(x=>x.title).filter(Boolean).join(' · ')}`]);
    }
    const uks=context(t,'uks_duty');
    if(uks)rows.push(['Jaga UKS',`${uks.item_count||0} laporan. ${uks.note||''}`]);
    const sa=context(t,'student_affairs_reporting');
    if(sa?.applicable)rows.push(['Reward & Kedisiplinan',`${statusLabel(sa.status)}. ${sa.note||''}`]);
    const att=context(t,'attendance');
    if(att?.item_count)rows.push(['Kehadiran Kegiatan',`${att.item_count} kegiatan tercatat.`]);
    if(!rows.length)return '';
    return `<section class="cq-section"><div class="cq-panel-title"><h4>Operasional Periode Ini</h4><small>Hanya yang memang berlaku</small></div><div class="cq-op-list">${rows.map(x=>`<div class="cq-op-row"><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div>`).join('')}</div></section>`;
  }

  function setPhoto(t){
    const box=document.getElementById('cq-hl-photo');if(!box)return;
    const ini=initials(t.name);
    if(t.profile_photo_url){
      box.innerHTML=`<img alt="Foto ${esc(t.name||'pegawai')}" src="${esc(t.profile_photo_url)}"><span style="display:none">${esc(ini)}</span>`;
      const img=box.querySelector('img'),fb=box.querySelector('span');
      img.addEventListener('error',()=>{img.style.display='none';fb.style.display='grid'});
    }else box.textContent=ini;
  }

  async function openHighlight(teacherId){
    if(!isHRD()||!teacherId)return;
    css();
    const modal=ensureHighlightModal(),name=document.getElementById('cq-hl-name'),meta=document.getElementById('cq-hl-meta'),role=document.getElementById('cq-hl-role'),body=document.getElementById('cq-hl-body'),photo=document.getElementById('cq-hl-photo');
    modal.classList.add('open');document.body.style.overflow='hidden';name.textContent='Stat Highlight';meta.textContent='Memuat data periode terpilih…';role.textContent='Membaca role…';photo.textContent='…';body.innerHTML='<div class="cq-hl-loading">Menyiapkan data pekerjaan pegawai…</div>';
    try{
      const start=document.getElementById('hrd-date-start')?.value||new Date().toISOString().slice(0,7)+'-01',end=document.getElementById('hrd-date-end')?.value||new Date().toISOString().slice(0,10);
      const d=await liveData(start,end),t=(d.teachers||[]).find(x=>String(x.teacher_id)===String(teacherId));
      if(!t)throw new Error('Data pegawai tidak ditemukan pada laporan HRD.');
      const profile=roleProfile(t),done=namesByStatus(t,['present']),pending=namesByStatus(t,['missing','partial']),pct=Math.max(0,Math.min(100,Number(t.completeness_index||0)));
      name.textContent=t.name||'Stat Highlight';role.textContent=profile.label;meta.textContent=[t.username,(t.classes||[]).join(', '),fmt(start)+' — '+fmt(end)].filter(Boolean).join(' · ');setPhoto(t);
      body.innerHTML=`
        <div class="cq-overview">
          <section class="cq-score-panel"><div class="cq-ring" style="--p:${pct}"><strong>${Math.round(pct)}%</strong></div><div class="cq-score-copy"><b>Kelengkapan sesuai role</b><span>Yang dihitung hanya pekerjaan yang memang menjadi tanggung jawab ${esc(profile.label)}.</span><div class="cq-score-mini"><em>${esc(t.completed_count||0)} dari ${esc(t.required_count||0)} selesai</em><em>${esc((t.missing_count||0)+(t.partial_count||0))} perlu dilengkapi</em></div></div></section>
          <section class="cq-section cq-summary" style="margin-top:0"><div class="cq-panel-title"><h4>Stat Highlight</h4><small>Langsung terbaca</small></div><div class="cq-summary-grid"><div class="cq-summary-box good"><b>Sudah dikerjakan</b><span>${esc(joinNames(done,'Belum ada kewajiban yang berstatus lengkap.'))}</span></div><div class="cq-summary-box warn"><b>Masih perlu dilengkapi</b><span>${esc(joinNames(pending,'Tidak ada kekurangan pada kewajiban yang berlaku.'))}</span></div></div></section>
        </div>
        ${academicHtml(t)}
        ${workHtml(t)}
        ${operationalHtml(t)}`;
    }catch(e){meta.textContent='';role.textContent='';photo.textContent='?';body.innerHTML='<div class="cq-hl-empty"><b>Stat Highlight belum dapat dimuat.</b><br>'+esc(e.message||'Terjadi kendala')+'</div>'}
  }

  function simplifyTeacherCards(){
    document.querySelectorAll('.hrd-admin-card').forEach(card=>{
      const head=card.querySelector('.hrd-admin-card-head');if(!head)return;
      const id=String(card.id||'').replace(/^hrd-teacher-/,'');if(!id)return;
      card.querySelectorAll('.hrd-chip-grid,.hrd-context-title').forEach(x=>x.remove());
      if(!head.dataset.cqHighlight){head.dataset.cqHighlight='1';head.title='Klik untuk membuka Stat Highlight';head.addEventListener('click',()=>openHighlight(id))}
      if(!card.querySelector('.cq-card-open')){
        const btn=document.createElement('button');btn.type='button';btn.className='cq-card-open';btn.innerHTML='Buka Stat Highlight<span>Lihat nilai TP, RPP, timesheet, tugas, dan data sesuai role pegawai.</span>';btn.addEventListener('click',()=>openHighlight(id));card.appendChild(btn);
      }
    });
  }

  function bindHighlights(){
    if(!isHRD())return;css();simplifyTeacherCards();
    const cat=document.querySelector('#hrd-root .hrd-cat-field');if(cat)cat.remove();
    document.querySelectorAll('#hrd-root h2,#hrd-root h3').forEach(h=>{if(/drill-down per guru/i.test(h.textContent||''))h.textContent='Stat Highlight Per Guru'});
    if(typeof window.hrdFocusTeacher==='function'&&!window.hrdFocusTeacher.__cqHighlightWrapped){
      const base=window.hrdFocusTeacher,wrapped=function(id){openHighlight(id)};wrapped.__cqHighlightWrapped=true;wrapped.__cqBase=base;window.hrdFocusTeacher=wrapped;
    }
  }

  function mount(){
    if(!isHRD())return;
    const kpis=document.querySelector('#hrd-root .hrd-kpis'),toolbar=document.querySelector('#hrd-root .hrd-admin-toolbar'),start=document.getElementById('hrd-date-start'),end=document.getElementById('hrd-date-end');
    bindHighlights();if(!kpis||!toolbar||!start||!end)return;if(document.getElementById('cq-hrd-periodbar'))return;css();
    const startField=start.closest('.hrd-date-field'),endField=end.closest('.hrd-date-field'),apply=toolbar.querySelector('.hrd-apply');if(!startField||!endField||!apply)return;
    const bar=document.createElement('section');bar.id='cq-hrd-periodbar';bar.className='cq-hrd-periodbar';bar.innerHTML=`<div class="cq-hrd-periodbar-main"><div><div class="cq-hrd-periodbar-label">Periode Laporan</div><div class="cq-hrd-periodbar-range" id="cq-hrd-period-range">${fmt(start.value)} — ${fmt(end.value)}</div></div><button type="button" class="cq-hrd-periodbar-change">Ubah Tanggal</button></div><div class="cq-hrd-periodbar-edit"></div>`;kpis.insertAdjacentElement('afterend',bar);
    const edit=bar.querySelector('.cq-hrd-periodbar-edit');edit.append(startField,endField,apply);
    bar.querySelector('.cq-hrd-periodbar-change').onclick=function(){bar.classList.toggle('editing');this.textContent=bar.classList.contains('editing')?'Tutup':'Ubah Tanggal'};
    const sync=()=>{highlightCache={key:'',data:null};const x=document.getElementById('cq-hrd-period-range');if(x)x.textContent=fmt(start.value)+' — '+fmt(end.value)};start.addEventListener('change',sync);end.addEventListener('change',sync);
  }

  window.cqHrdOpenHighlight=openHighlight;window.cqHrdCloseHighlight=closeHighlight;
  const root=document.getElementById('content')||document.body;const obs=new MutationObserver(function(){clearTimeout(window.__cqHrdPeriodBarTimer);window.__cqHrdPeriodBarTimer=setTimeout(mount,45)});obs.observe(root,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,80));setTimeout(mount,500);
})();
