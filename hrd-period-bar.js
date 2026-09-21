/* CQlass HRD — Compact Role-aware Per-Teacher Stat Highlight */
(function(){
  'use strict';
  if(window.__cqHrdPeriodBar) return;
  window.__cqHrdPeriodBar=true;

  const BASE=typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
  const KEY=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
  const LIVE_URL=BASE+'/functions/v1/hrd-live-report';
  let highlightCache={key:'',data:null};

  const low=v=>String(v||'').trim().toLowerCase();
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmt=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date(String(v).slice(0,10)+'T00:00:00+07:00'))}catch(_){return String(v)}};
  const fmtShort=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(String(v).slice(0,10)+'T00:00:00+07:00'))}catch(_){return String(v)}};
  const statusLabel=v=>({present:'Lengkap',missing:'Belum',partial:'Sebagian',na:'Tidak Berlaku',contextual:'Informasi',separate:'Operasional'}[low(v)]||v||'—');
  const statusIcon=v=>({present:'✓',missing:'!',partial:'△',na:'—',contextual:'i',separate:'•'}[low(v)]||'•');
  const context=(t,key)=>(t.context_categories||[]).find(x=>x.key===key);
  const regular=(t,key)=>(t.categories||[]).find(x=>x.key===key);
  const applicableCats=t=>[...(t.categories||[]).filter(x=>x.applicable),...(t.context_categories||[]).filter(x=>x.applicable!==false)];

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

  function badalCounts(c){
    let masuk=0,diganti=0;
    for(const x of c?.items||[]){
      if(/menggantikan/i.test(x.title||'')) masuk++;
      if(/digantikan/i.test(x.title||'')) diganti++;
    }
    return {masuk,diganti};
  }

  function namesByStatus(t,statuses){
    return applicableCats(t).filter(c=>statuses.includes(low(c.status))&&!['separate','contextual'].includes(low(c.status))).map(c=>c.label||c.key);
  }
  const joinNames=(a,empty)=>a.length?a.join(', '):(empty||'Tidak ada');

  function categoryTip(c){
    if(!c)return 'Data belum tersedia.';
    const s=low(c.status),count=Number(c.item_count||0),last=c.last_created_at?` Terakhir diperbarui ${fmtShort(c.last_created_at)}.`:'';
    if(s==='present') return `Sudah lengkap. ${count} item tercatat.${last}${c.note?' '+c.note:''}`;
    if(s==='missing') return `Belum lengkap. Belum ada data yang memenuhi periode terpilih.${c.note?' '+c.note:''}`;
    if(s==='partial') return `Baru sebagian. ${count} item tercatat, tetapi belum memenuhi seluruh kebutuhan periode.${last}${c.note?' '+c.note:''}`;
    if(s==='na') return `Tidak diwajibkan untuk role/jabatan ini pada periode terpilih.${c.note?' '+c.note:''}`;
    return `Data operasional/informasi. ${count} item tercatat dan tidak otomatis dihitung sebagai kelengkapan atau Performance.${last}${c.note?' '+c.note:''}`;
  }

  function itemPreview(c,max=3){
    const a=(c?.items||[]).slice(0,max).map(x=>x.title||x.description).filter(Boolean);
    return a.length?a.join(' • '):'Belum ada rincian item.';
  }

  function info(text){
    return `<button type="button" class="cq-info" data-tip="${esc(text)}" aria-label="Lihat keterangan">i</button>`;
  }

  function css(){
    if(!document.getElementById('cq-hrd-period-bar-style')){
      const s=document.createElement('style');s.id='cq-hrd-period-bar-style';s.textContent=`
        .cq-hrd-periodbar{margin:12px 0 16px;background:#fff;border:1px solid #d9e8e6;border-radius:16px;padding:13px 15px;box-shadow:0 5px 18px rgba(21,74,74,.05)}
        .cq-hrd-periodbar-main{display:flex;align-items:center;justify-content:space-between;gap:14px}.cq-hrd-periodbar-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#789090;font-weight:850;margin-bottom:4px}.cq-hrd-periodbar-range{font-size:15px;font-weight:850;color:#153f3f;line-height:1.35}
        .cq-hrd-periodbar-change{border:1px solid #cfe2df;background:#eef8f6;color:#0A6E6E;border-radius:11px;height:38px;padding:0 13px;font:800 11px Inter,sans-serif;cursor:pointer;white-space:nowrap}.cq-hrd-periodbar-edit{display:none;align-items:end;gap:9px;flex-wrap:wrap;padding-top:12px;margin-top:12px;border-top:1px dashed #dce8e7}.cq-hrd-periodbar.editing .cq-hrd-periodbar-edit{display:flex}.cq-hrd-periodbar-edit .hrd-date-field{min-width:160px;margin:0}.cq-hrd-periodbar-edit .hrd-apply{margin:0}
        .hrd-admin-card-head[data-cq-highlight]{cursor:pointer;border-radius:12px;padding:4px;margin:-4px -4px 9px;transition:.15s}.hrd-admin-card-head[data-cq-highlight]:hover{background:#f0f8f7}
        @media(max-width:650px){.cq-hrd-periodbar-main{align-items:flex-start}.cq-hrd-periodbar-range{font-size:13px}.cq-hrd-periodbar-edit{display:none;grid-template-columns:1fr 1fr}.cq-hrd-periodbar.editing .cq-hrd-periodbar-edit{display:grid}.cq-hrd-periodbar-edit .hrd-date-field{min-width:0}.cq-hrd-periodbar-edit .hrd-apply{grid-column:1/-1;width:100%}}
      `;document.head.appendChild(s);
    }
    if(document.getElementById('cq-hrd-highlight-style'))return;
    const s=document.createElement('style');s.id='cq-hrd-highlight-style';s.textContent=`
      .cq-hl-overlay{position:fixed;inset:0;z-index:10050;background:rgba(6,35,35,.42);display:none;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(5px)}.cq-hl-overlay.open{display:flex}
      .cq-hl-card{width:min(940px,96vw);max-height:90vh;overflow:auto;background:#fff;border:1px solid #d9e7e5;border-radius:22px;box-shadow:0 24px 70px rgba(4,45,45,.20)}
      .cq-hl-head{position:sticky;top:0;z-index:8;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;padding:18px 22px;background:rgba(255,255,255,.97);border-bottom:1px solid #e1ebea;backdrop-filter:blur(10px)}.cq-hl-head h3{margin:0;color:#153f3d;font:800 20px/1.25 'Plus Jakarta Sans',Inter,sans-serif}.cq-hl-head p{margin:5px 0 0;color:#78908d;font-size:10.5px;line-height:1.45}.cq-hl-role{display:inline-flex;margin-top:8px;padding:5px 9px;border-radius:999px;background:#e9f5f3;color:#0a6964;font-size:9px;font-weight:850}.cq-hl-close{border:0;background:#edf5f4;color:#35615e;width:38px;height:38px;border-radius:12px;font-size:22px;cursor:pointer;flex:none}.cq-hl-body{padding:20px 22px 24px}.cq-hl-loading,.cq-hl-empty{padding:45px;text-align:center;color:#829390;font-size:11px}
      .cq-overview{display:grid;grid-template-columns:310px minmax(0,1fr);gap:16px;margin-bottom:16px}.cq-score-panel,.cq-highlight-panel,.cq-section{border:1px solid #e0eae8;border-radius:17px;background:#fff}.cq-score-panel{padding:18px;display:grid;grid-template-columns:112px 1fr;gap:16px;align-items:center;background:linear-gradient(145deg,#f4faf9,#fff)}
      .cq-ring{--p:0;width:106px;height:106px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(#0a6e6e calc(var(--p)*1%),#e4efed 0);position:relative}.cq-ring:after{content:'';position:absolute;inset:10px;border-radius:50%;background:#fff}.cq-ring strong{position:relative;z-index:1;color:#124946;font:800 26px/1 'Plus Jakarta Sans',Inter,sans-serif}.cq-score-copy b{display:block;color:#214846;font-size:12px}.cq-score-copy span{display:block;margin-top:4px;color:#78908d;font-size:9.5px;line-height:1.45}.cq-score-mini{display:flex;gap:9px;margin-top:11px;flex-wrap:wrap}.cq-score-mini em{font-style:normal;padding:5px 7px;border-radius:8px;background:#eef6f5;color:#406c69;font-size:8.5px;font-weight:800}
      .cq-highlight-panel{padding:16px 17px}.cq-panel-title{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px}.cq-panel-title h4{margin:0;color:#244c49;font-size:12px}.cq-panel-title small{color:#8a9a98;font-size:8.7px}.cq-flags{display:grid;gap:7px}.cq-flag{display:grid;grid-template-columns:26px minmax(0,1fr);gap:9px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #edf2f1}.cq-flag:last-child{border-bottom:0}.cq-flag i{font-style:normal;width:26px;height:26px;border-radius:9px;background:#edf7f5;color:#0a6e6e;display:grid;place-items:center;font-weight:900}.cq-flag b{display:block;color:#2a4e4b;font-size:10.5px}.cq-flag span{display:block;color:#748986;font-size:9.2px;line-height:1.42;margin-top:2px}
      .cq-section{padding:15px 17px;margin-top:14px}.cq-status-list{display:grid}.cq-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 2px;border-bottom:1px solid #edf2f1}.cq-row:last-child{border-bottom:0}.cq-row-main b{display:flex;align-items:center;gap:6px;color:#2a4d4a;font-size:10.8px}.cq-row-main small{display:block;color:#829390;font-size:8.9px;margin-top:3px}.cq-state{font-size:8.8px;font-weight:850;border-radius:999px;padding:5px 8px;white-space:nowrap;background:#edf4f3;color:#58716f}.cq-state.present{background:#e9f7ef;color:#247149}.cq-state.missing{background:#fceceb;color:#9d443d}.cq-state.partial{background:#fff5dc;color:#89681f}.cq-state.na{background:#f2f4f4;color:#84928f}
      .cq-info{width:17px;height:17px;border-radius:50%;border:1px solid #a8c9c5;background:#fff;color:#0a6e6e;display:inline-grid;place-items:center;padding:0;font:800 10px/1 Inter,sans-serif;cursor:help;flex:none}.cq-info:hover{background:#0a6e6e;color:#fff;border-color:#0a6e6e}
      .cq-op-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.cq-op{padding:10px 11px;border-radius:12px;background:#f5f9f8}.cq-op strong{display:flex;align-items:center;gap:5px;color:#214946;font-size:14px}.cq-op span{display:block;color:#7e908e;font-size:8.6px;margin-top:3px}.cq-recent{display:grid;gap:6px}.cq-recent-item{padding:8px 0;border-bottom:1px solid #edf2f1}.cq-recent-item:last-child{border-bottom:0}.cq-recent-item b{display:block;color:#31514f;font-size:10px}.cq-recent-item small{display:block;margin-top:2px;color:#829390;font-size:8.7px;line-height:1.4}
      #cq-floating-tip{position:fixed;z-index:11000;display:none;max-width:290px;padding:9px 10px;border-radius:10px;background:#173f3d;color:#fff;box-shadow:0 10px 28px rgba(4,40,40,.22);font-size:9.3px;font-weight:600;line-height:1.45;pointer-events:none}
      @media(max-width:760px){.cq-overview{grid-template-columns:1fr}.cq-op-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.cq-hl-body{padding:14px}.cq-hl-head{padding:15px 16px}}
      @media(max-width:460px){.cq-hl-overlay{padding:6px}.cq-hl-card{max-height:96vh;border-radius:18px}.cq-score-panel{grid-template-columns:90px 1fr}.cq-ring{width:86px;height:86px}.cq-op-grid{grid-template-columns:1fr 1fr}}
    `;document.head.appendChild(s);
  }

  function ensureHighlightModal(){
    let el=document.getElementById('cq-hrd-person-highlight');
    if(el)return el;
    el=document.createElement('div');el.id='cq-hrd-person-highlight';el.className='cq-hl-overlay';
    el.innerHTML='<div class="cq-hl-card" onclick="event.stopPropagation()"><div class="cq-hl-head"><div><h3 id="cq-hl-name">Stat Highlight</h3><p id="cq-hl-meta"></p><span class="cq-hl-role" id="cq-hl-role">Role</span></div><button class="cq-hl-close" type="button">×</button></div><div class="cq-hl-body" id="cq-hl-body"></div></div>';
    el.addEventListener('click',closeHighlight);el.querySelector('.cq-hl-close').addEventListener('click',closeHighlight);document.body.appendChild(el);return el;
  }

  function closeHighlight(){
    const el=document.getElementById('cq-hrd-person-highlight');if(el)el.classList.remove('open');
    document.body.style.overflow='';hideTip();
  }

  function tooltipEl(){
    let el=document.getElementById('cq-floating-tip');if(el)return el;
    el=document.createElement('div');el.id='cq-floating-tip';document.body.appendChild(el);return el;
  }
  function showTip(btn){
    const text=btn?.dataset?.tip;if(!text)return;
    const tip=tooltipEl();tip.textContent=text;tip.style.display='block';tip.style.left='0px';tip.style.top='0px';
    const r=btn.getBoundingClientRect(),tw=tip.offsetWidth,th=tip.offsetHeight;
    let left=r.left+r.width/2-tw/2;left=Math.max(8,Math.min(window.innerWidth-tw-8,left));
    let top=r.top-th-9;if(top<8)top=r.bottom+9;
    tip.style.left=Math.round(left)+'px';tip.style.top=Math.round(top)+'px';
  }
  function hideTip(){const t=document.getElementById('cq-floating-tip');if(t)t.style.display='none'}
  function bindTips(root){
    root.querySelectorAll('.cq-info').forEach(btn=>{btn.addEventListener('mouseenter',()=>showTip(btn));btn.addEventListener('mouseleave',hideTip);btn.addEventListener('focus',()=>showTip(btn));btn.addEventListener('blur',hideTip)});
  }

  async function liveData(start,end){
    const key=start+'|'+end;if(highlightCache.key===key&&highlightCache.data)return highlightCache.data;
    const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||'';
    const r=await fetch(LIVE_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':token},body:JSON.stringify({action:'administration',start,end})});
    const d=await r.json().catch(()=>({success:false,error:'Respons tidak valid'}));
    if(!r.ok||d.success===false)throw new Error(d.message||d.error||'Data HRD gagal dimuat.');
    highlightCache={key,data:d};return d;
  }

  function flags(t){
    const out=[],profile=roleProfile(t),done=namesByStatus(t,['present']),pending=namesByStatus(t,['missing','partial']);
    const sa=context(t,'student_affairs_reporting'),tah=regular(t,'tahfizh'),principal=regular(t,'principal_work');
    if(done.length) out.push(['Sudah lengkap',joinNames(done)]);
    if(pending.length) out.push(['Perlu dilengkapi',joinNames(pending)]);
    if(profile.isHomeroom&&sa) out.push(['Laporan wali kelas',`${statusLabel(sa.status)} · Reward & Kedisiplinan`]);
    if(profile.isTahfizh&&tah) out.push(['Tahfizh',`${statusLabel(tah.status)} · ${tah.item_count||0} item`]);
    if(profile.isPrincipal&&principal) out.push(['Administrasi Kepala Sekolah',`${statusLabel(principal.status)} · ${principal.item_count||0} item`]);
    if(!out.length) out.push(['Data masih berkembang','Belum ada highlight khusus pada periode ini.']);
    return out.slice(0,4);
  }

  function categoryRows(t){
    const cats=applicableCats(t).filter(c=>!['separate','contextual'].includes(low(c.status)));
    if(!cats.length)return '<div class="cq-hl-empty">Tidak ada kewajiban administrasi yang berlaku.</div>';
    return cats.map(c=>`<div class="cq-row"><div class="cq-row-main"><b>${esc(c.label||c.key)} ${info(categoryTip(c))}</b><small>${esc(c.item_count||0)} item${c.last_created_at?' · terakhir '+fmtShort(c.last_created_at):''}</small></div><span class="cq-state ${esc(c.status)}">${statusIcon(c.status)} ${esc(statusLabel(c.status))}</span></div>`).join('');
  }

  function recentItems(t){
    const all=applicableCats(t).flatMap(c=>(c.items||[]).map(x=>({...x,_cat:c.label||c.key}))).filter(x=>x.created_at||x.period_start).sort((a,b)=>String(b.created_at||b.period_start).localeCompare(String(a.created_at||a.period_start))).slice(0,4);
    if(!all.length)return '<div class="cq-hl-empty">Belum ada aktivitas terbaru pada periode ini.</div>';
    return all.map(x=>`<div class="cq-recent-item"><b>${esc(x.title||x._cat||'Aktivitas')}</b><small>${esc(x._cat||'')} · ${esc(fmtShort(x.period_start||x.created_at))}${x.description?' · '+esc(x.description):''}</small></div>`).join('');
  }

  function operationalGrid(t){
    const profile=roleProfile(t),bad=context(t,'badal'),bc=badalCounts(bad),uks=context(t,'uks_duty'),work=regular(t,'work_activity'),sa=context(t,'student_affairs_reporting'),tah=regular(t,'tahfizh');
    const arr=[
      ['Badal',bc.masuk,`${bc.masuk} kali menggantikan, ${bc.diganti} kali digantikan. ${itemPreview(bad)}`],
      ['Jaga UKS',uks?.item_count||0,`${uks?.item_count||0} laporan UKS. ${itemPreview(uks)}`],
      ['Aktivitas',work?.item_count||0,categoryTip(work)]
    ];
    if(profile.isHomeroom&&sa)arr.push(['Wali Kelas',statusLabel(sa.status),categoryTip(sa)]);
    else if(profile.isTahfizh&&tah)arr.push(['Tahfizh',statusLabel(tah.status),categoryTip(tah)]);
    else arr.push(['Kelengkapan',(t.completeness_index??0)+'%',`Kelengkapan dihitung hanya dari kewajiban yang berlaku untuk role ini.`]);
    return arr.map(x=>`<div class="cq-op"><strong>${esc(x[1])} ${info(x[2])}</strong><span>${esc(x[0])}</span></div>`).join('');
  }

  async function openHighlight(teacherId){
    if(!isHRD()||!teacherId)return;
    css();hideTip();
    const modal=ensureHighlightModal(),name=document.getElementById('cq-hl-name'),meta=document.getElementById('cq-hl-meta'),role=document.getElementById('cq-hl-role'),body=document.getElementById('cq-hl-body');
    modal.classList.add('open');document.body.style.overflow='hidden';name.textContent='Stat Highlight';meta.textContent='Memuat data periode terpilih…';role.textContent='Membaca role…';body.innerHTML='<div class="cq-hl-loading">Menyiapkan Stat Highlight…</div>';
    try{
      const start=document.getElementById('hrd-date-start')?.value||new Date().toISOString().slice(0,7)+'-01',end=document.getElementById('hrd-date-end')?.value||new Date().toISOString().slice(0,10);
      const d=await liveData(start,end),t=(d.teachers||[]).find(x=>String(x.teacher_id)===String(teacherId));
      if(!t)throw new Error('Data pegawai tidak ditemukan pada laporan HRD.');
      const profile=roleProfile(t),done=namesByStatus(t,['present']),pending=namesByStatus(t,['missing','partial']),pct=Math.max(0,Math.min(100,Number(t.completeness_index||0)));
      name.textContent=t.name||'Stat Highlight';role.textContent=profile.label;meta.textContent=[t.username,(t.classes||[]).join(', '),fmt(start)+' — '+fmt(end)].filter(Boolean).join(' · ');
      const summaryTip=`Sudah lengkap: ${joinNames(done,'belum ada')}. Belum/sebagian: ${joinNames(pending,'tidak ada')}.`;
      body.innerHTML=`
        <div class="cq-overview">
          <section class="cq-score-panel">
            <div class="cq-ring" style="--p:${pct}"><strong>${Math.round(pct)}%</strong></div>
            <div class="cq-score-copy"><b>Kelengkapan sesuai role ${info(summaryTip)}</b><span>Hanya kewajiban yang berlaku untuk ${esc(profile.label)} yang dihitung.</span><div class="cq-score-mini"><em>${esc(t.completed_count||0)} dari ${esc(t.required_count||0)} selesai</em><em>${esc((t.missing_count||0)+(t.partial_count||0))} perlu tindak lanjut</em></div></div>
          </section>
          <section class="cq-highlight-panel"><div class="cq-panel-title"><h4>Stat Highlight</h4><small>Ringkasan utama</small></div><div class="cq-flags">${flags(t).map(x=>`<div class="cq-flag"><i>✦</i><div><b>${esc(x[0])}</b><span>${esc(x[1])}</span></div></div>`).join('')}</div></section>
        </div>
        <section class="cq-section"><div class="cq-panel-title"><h4>Status Kewajiban</h4><small>Hover ikon i untuk rincian</small></div><div class="cq-status-list">${categoryRows(t)}</div></section>
        <section class="cq-section"><div class="cq-panel-title"><h4>Operasional Periode Ini</h4><small>Data live, bukan skor Performance</small></div><div class="cq-op-grid">${operationalGrid(t)}</div></section>
        <section class="cq-section"><div class="cq-panel-title"><h4>Aktivitas Terbaru</h4><small>Maksimal 4 aktivitas</small></div><div class="cq-recent">${recentItems(t)}</div></section>`;
      bindTips(body);
    }catch(e){meta.textContent='';role.textContent='';body.innerHTML='<div class="cq-hl-empty"><b>Stat Highlight belum dapat dimuat.</b><br>'+esc(e.message||'Terjadi kendala')+'</div>'}
  }

  function bindHighlights(){
    if(!isHRD())return;css();
    document.querySelectorAll('.hrd-admin-card').forEach(card=>{
      const head=card.querySelector('.hrd-admin-card-head');if(!head||head.dataset.cqHighlight)return;
      const id=String(card.id||'').replace(/^hrd-teacher-/,'');if(!id)return;
      head.dataset.cqHighlight='1';head.title='Klik untuk melihat Stat Highlight';head.addEventListener('click',()=>openHighlight(id));
    });
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
  const root=document.getElementById('content')||document.body;const obs=new MutationObserver(function(){clearTimeout(window.__cqHrdPeriodBarTimer);window.__cqHrdPeriodBarTimer=setTimeout(mount,40)});obs.observe(root,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,80));setTimeout(mount,500);
})();
