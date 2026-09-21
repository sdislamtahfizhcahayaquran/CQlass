/* CQlass HRD — Report Period Bar + Role-aware Per-Teacher Stat Highlight */
(function(){
  'use strict';
  if(window.__cqHrdPeriodBar) return;
  window.__cqHrdPeriodBar=true;

  const BASE=typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
  const KEY=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
  const LIVE_URL=BASE+'/functions/v1/hrd-live-report';
  let highlightCache={key:'',data:null};

  function isHRD(){
    try{
      if(String(window.currentUser?.role||'').toLowerCase()==='hrd') return true;
      const u=JSON.parse(localStorage.getItem('cqlass_user')||'{}');
      return String(u.role||u.primary_role||u.role_code||'').toLowerCase()==='hrd';
    }catch(_){ return false; }
  }
  function low(v){return String(v||'').trim().toLowerCase()}
  function esc(v){return typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]))}
  function fmt(v){
    if(!v) return '—';
    try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date(String(v).slice(0,10)+'T00:00:00+07:00'))}
    catch(_){return String(v)}
  }
  function fmtShort(v){
    if(!v)return '—';
    try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(String(v).slice(0,10)+'T00:00:00+07:00'))}catch(_){return String(v)}
  }
  function statusLabel(v){return ({present:'Lengkap',missing:'Belum',partial:'Sebagian',na:'Tidak Berlaku',contextual:'Informasi',separate:'Operasional'}[low(v)]||v||'—')}
  function statusIcon(v){return ({present:'✓',missing:'!',partial:'△',na:'—',contextual:'i',separate:'•'}[low(v)]||'•')}
  function context(t,key){return (t.context_categories||[]).find(x=>x.key===key)}
  function regular(t,key){return (t.categories||[]).find(x=>x.key===key)}
  function applicableCats(t){return [...(t.categories||[]).filter(x=>x.applicable),...(t.context_categories||[]).filter(x=>x.applicable!==false)]}
  function badalCounts(c){let masuk=0,diganti=0;for(const x of c?.items||[]){if(/menggantikan/i.test(x.title||''))masuk++;if(/digantikan/i.test(x.title||''))diganti++;}return{masuk,diganti}}

  function roleProfile(t){
    const p=low(t.position),sa=context(t,'student_affairs_reporting'),tah=regular(t,'tahfizh'),principal=regular(t,'principal_work');
    const roles=[];
    if(/kepala sekolah|kepsek/.test(p)||principal?.applicable)roles.push('Kepala Sekolah');
    if(/kabid/.test(p))roles.push(t.position||'Kabid');
    if(sa?.applicable)roles.push('Wali Kelas');
    if(/tahfizh|tahfiz/.test(p)||tah?.applicable)roles.push('Guru Tahfizh');
    if(!roles.length&&/guru/.test(p))roles.push(t.position||'Guru');
    if(!roles.length)roles.push(t.position||'Pegawai');
    return {label:[...new Set(roles)].join(' + '),isHomeroom:!!sa?.applicable,isTahfizh:!!(/tahfizh|tahfiz/.test(p)||tah?.applicable),isPrincipal:!!(/kepala sekolah|kepsek/.test(p)||principal?.applicable),isKabid:/kabid/.test(p)};
  }
  function namesByStatus(t,statuses){
    return applicableCats(t).filter(c=>statuses.includes(low(c.status))&&!['separate','contextual'].includes(low(c.status))).map(c=>c.label||c.key);
  }
  function joinNames(a,empty){return a.length?a.join(', '):(empty||'Tidak ada')}
  function categoryTip(c){
    const s=low(c.status),count=Number(c.item_count||0),last=c.last_created_at?` Terakhir: ${fmtShort(c.last_created_at)}.`:'';
    if(s==='present')return `Sudah lengkap. ${count} item tercatat.${last}${c.note?' '+c.note:''}`;
    if(s==='missing')return `Belum lengkap. Belum ada data yang memenuhi periode terpilih.${c.note?' '+c.note:''}`;
    if(s==='partial')return `Baru sebagian. ${count} item tercatat, tetapi belum memenuhi seluruh kebutuhan periode.${last}${c.note?' '+c.note:''}`;
    if(s==='na')return `Tidak diwajibkan untuk role/jabatan ini pada periode terpilih.${c.note?' '+c.note:''}`;
    return `Data operasional/informasi. ${count} item tercatat dan tidak otomatis dihitung sebagai kelengkapan atau Performance.${last}${c.note?' '+c.note:''}`;
  }
  function itemPreview(c,max=4){
    const a=(c?.items||[]).slice(0,max).map(x=>x.title||x.description).filter(Boolean);return a.length?a.join(' • '):'Belum ada rincian item.';
  }
  function statCard(label,value,tip,tone){return `<div class="cq-hl-stat cq-hl-tip ${esc(tone||'')}" data-cq-tip="${esc(tip)}" title="${esc(tip)}"><b>${esc(value)}</b><span>${esc(label)} <em>ⓘ</em></span></div>`}

  function css(){
    if(!document.getElementById('cq-hrd-period-bar-style')){
      const s=document.createElement('style');
      s.id='cq-hrd-period-bar-style';
      s.textContent=`
        .cq-hrd-periodbar{margin:12px 0 16px;background:#fff;border:1px solid #d9e8e6;border-radius:16px;padding:13px 15px;box-shadow:0 5px 18px rgba(21,74,74,.05)}
        .cq-hrd-periodbar-main{display:flex;align-items:center;justify-content:space-between;gap:14px}.cq-hrd-periodbar-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#789090;font-weight:850;margin-bottom:4px}.cq-hrd-periodbar-range{font-size:15px;font-weight:850;color:#153f3f;line-height:1.35}
        .cq-hrd-periodbar-change{border:1px solid #cfe2df;background:#eef8f6;color:#0A6E6E;border-radius:11px;height:38px;padding:0 13px;font:800 11px Inter,sans-serif;cursor:pointer;white-space:nowrap}.cq-hrd-periodbar-edit{display:none;align-items:end;gap:9px;flex-wrap:wrap;padding-top:12px;margin-top:12px;border-top:1px dashed #dce8e7}.cq-hrd-periodbar.editing .cq-hrd-periodbar-edit{display:flex}.cq-hrd-periodbar-edit .hrd-date-field{min-width:160px;margin:0}.cq-hrd-periodbar-edit .hrd-apply{margin:0}
        .hrd-admin-card-head[data-cq-highlight]{cursor:pointer;border-radius:12px;padding:4px;margin:-4px -4px 9px;transition:.15s}.hrd-admin-card-head[data-cq-highlight]:hover{background:#f0f8f7}
        @media(max-width:650px){.cq-hrd-periodbar-main{align-items:flex-start}.cq-hrd-periodbar-range{font-size:13px}.cq-hrd-periodbar-edit{display:none;grid-template-columns:1fr 1fr}.cq-hrd-periodbar.editing .cq-hrd-periodbar-edit{display:grid}.cq-hrd-periodbar-edit .hrd-date-field{min-width:0}.cq-hrd-periodbar-edit .hrd-apply{grid-column:1/-1;width:100%}}
      `;document.head.appendChild(s);
    }
    if(document.getElementById('cq-hrd-highlight-style'))return;
    const s=document.createElement('style');s.id='cq-hrd-highlight-style';s.textContent=`
      .cq-hl-overlay{position:fixed;inset:0;z-index:10050;background:rgba(5,31,31,.48);display:none;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}.cq-hl-overlay.open{display:flex}.cq-hl-card{width:min(1080px,96vw);max-height:92vh;overflow:auto;background:#f7fbfa;border:1px solid #d8e8e6;border-radius:24px;box-shadow:0 28px 80px rgba(3,42,42,.24)}
      .cq-hl-head{position:sticky;top:0;z-index:12;display:flex;justify-content:space-between;gap:14px;align-items:center;padding:18px 20px;background:rgba(255,255,255,.97);border-bottom:1px solid #dceae8;backdrop-filter:blur(12px)}.cq-hl-head h3{margin:0;font:800 19px/1.2 'Plus Jakarta Sans',Inter,sans-serif;color:#153e3d}.cq-hl-head p{margin:5px 0 0;font-size:10.5px;color:#748b89}.cq-hl-role{display:inline-flex;margin-top:7px;padding:5px 8px;border-radius:999px;background:#e7f4f2;color:#0a6863;font-size:9px;font-weight:850}.cq-hl-close{border:0;background:#e8f3f2;color:#315d59;width:38px;height:38px;border-radius:12px;font-size:22px;cursor:pointer}.cq-hl-body{padding:18px 20px 22px}.cq-hl-loading{padding:55px;text-align:center;color:#78908e;font-size:12px}
      .cq-hl-top{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:15px}.cq-hl-stat{background:#fff;border:1px solid #dce9e7;border-radius:16px;padding:13px 12px;min-height:78px;transition:.15s}.cq-hl-stat:hover{border-color:#9fcfc8;box-shadow:0 8px 22px rgba(17,79,75,.09);transform:translateY(-1px)}.cq-hl-stat b{display:block;font:800 19px/1.1 'Plus Jakarta Sans',Inter,sans-serif;color:#124846;word-break:break-word}.cq-hl-stat span{display:block;margin-top:7px;font-size:9px;color:#718987;font-weight:750}.cq-hl-stat span em{font-style:normal;color:#0a6e6e}.cq-hl-stat.warn{border-color:#efd8ac}.cq-hl-stat.good{border-color:#c5e5d4}
      .cq-hl-tip{position:relative;cursor:help}.cq-hl-tip:focus::after,.cq-hl-tip:hover::after{content:attr(data-cq-tip);position:absolute;z-index:100;left:50%;bottom:calc(100% + 9px);transform:translateX(-50%);width:min(330px,80vw);padding:10px 11px;border-radius:11px;background:#153f3d;color:#fff;font-size:9.5px;font-weight:600;line-height:1.48;box-shadow:0 10px 28px rgba(3,42,42,.25);white-space:normal;pointer-events:none}.cq-hl-tip:focus::before,.cq-hl-tip:hover::before{content:'';position:absolute;z-index:101;left:50%;bottom:calc(100% + 3px);width:10px;height:10px;background:#153f3d;transform:translateX(-50%) rotate(45deg);pointer-events:none}
      .cq-hl-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.cq-hl-panel{background:#fff;border:1px solid #dce9e7;border-radius:18px;padding:15px}.cq-hl-panel h4{margin:0 0 11px;font-size:12px;color:#234d4a}.cq-hl-panel-hint{font-size:9px;color:#829693;margin:-6px 0 11px}.cq-hl-flags{display:grid;gap:8px}.cq-hl-flag{display:flex;gap:10px;align-items:flex-start;border:1px solid #e3eceb;border-radius:13px;padding:10px;background:#fbfdfd}.cq-hl-flag i{font-style:normal;width:26px;height:26px;border-radius:9px;display:grid;place-items:center;background:#e9f5f2;color:#0a6e6e;font-weight:900;flex:none}.cq-hl-flag b{display:block;font-size:11px;color:#284b49}.cq-hl-flag small{display:block;margin-top:3px;font-size:9.5px;line-height:1.4;color:#718785}
      .cq-hl-cats{display:grid;gap:7px}.cq-hl-cat{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:9px 10px;border:1px solid #e2ecea;border-radius:12px;background:#fbfdfd;transition:.15s}.cq-hl-cat:hover{background:#f0f8f7;border-color:#b9dbd6}.cq-hl-cat b{font-size:10.5px;color:#315350}.cq-hl-cat small{display:block;font-size:8.8px;color:#829592;margin-top:2px}.cq-hl-state{font-size:8.7px;font-weight:850;border-radius:999px;padding:5px 7px;white-space:nowrap;background:#edf5f4;color:#57716f}.cq-hl-state.present{background:#e7f7ee;color:#197044}.cq-hl-state.missing{background:#fdecea;color:#993f38}.cq-hl-state.partial{background:#fff5d9;color:#866316}
      .cq-hl-recent{display:grid;gap:7px}.cq-hl-item{padding:9px 10px;border-left:3px solid #badfd8;background:#f7fbfa;border-radius:0 11px 11px 0}.cq-hl-item b{display:block;font-size:10.5px;color:#315350}.cq-hl-item small{display:block;margin-top:3px;font-size:8.8px;color:#81928f;line-height:1.4}.cq-hl-footnote{margin-top:13px;padding:10px 12px;border-radius:12px;background:#edf7f5;color:#66807d;font-size:9px;line-height:1.45}.cq-hl-empty{padding:16px;text-align:center;color:#879895;font-size:10px}
      @media(max-width:880px){.cq-hl-top{grid-template-columns:repeat(3,minmax(0,1fr))}.cq-hl-grid{grid-template-columns:1fr}}
      @media(max-width:540px){.cq-hl-overlay{padding:7px}.cq-hl-card{border-radius:18px;max-height:96vh}.cq-hl-body{padding:12px}.cq-hl-head{padding:14px}.cq-hl-top{grid-template-columns:repeat(2,minmax(0,1fr))}.cq-hl-tip:hover::after{left:0;transform:none;width:min(280px,78vw)}}
    `;document.head.appendChild(s);
  }

  function ensureHighlightModal(){
    let el=document.getElementById('cq-hrd-person-highlight');if(el)return el;
    el=document.createElement('div');el.id='cq-hrd-person-highlight';el.className='cq-hl-overlay';el.innerHTML='<div class="cq-hl-card" onclick="event.stopPropagation()"><div class="cq-hl-head"><div><h3 id="cq-hl-name">Stat Highlight</h3><p id="cq-hl-meta"></p><span class="cq-hl-role" id="cq-hl-role">Role</span></div><button class="cq-hl-close" type="button">×</button></div><div class="cq-hl-body" id="cq-hl-body"></div></div>';
    el.addEventListener('click',closeHighlight);el.querySelector('.cq-hl-close').addEventListener('click',closeHighlight);document.body.appendChild(el);return el;
  }
  function closeHighlight(){const el=document.getElementById('cq-hrd-person-highlight');if(el)el.classList.remove('open');document.body.style.overflow=''}
  async function liveData(start,end){
    const key=start+'|'+end;if(highlightCache.key===key&&highlightCache.data)return highlightCache.data;
    const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||'';
    const r=await fetch(LIVE_URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':token},body:JSON.stringify({action:'administration',start,end})});
    const d=await r.json().catch(()=>({success:false,error:'Respons tidak valid'}));if(!r.ok||d.success===false)throw new Error(d.message||d.error||'Data HRD gagal dimuat.');highlightCache={key,data:d};return d;
  }

  function flags(t){
    const out=[],bad=context(t,'badal'),bc=badalCounts(bad),uks=context(t,'uks_duty'),sa=context(t,'student_affairs_reporting'),work=regular(t,'work_activity'),profile=roleProfile(t),tah=regular(t,'tahfizh'),principal=regular(t,'principal_work');
    const done=namesByStatus(t,['present']),pending=namesByStatus(t,['missing','partial']);
    if(done.length)out.push(['Sudah lengkap',joinNames(done)]);
    if(pending.length)out.push(['Masih perlu dilengkapi',joinNames(pending)]);
    if(profile.isHomeroom&&sa?.status==='present')out.push(['Wali kelas: laporan lengkap','Reward & kedisiplinan pada request periode ini sudah dikonfirmasi.']);
    if(profile.isHomeroom&&['missing','partial'].includes(low(sa?.status)))out.push(['Wali kelas: perlu tindak lanjut',`Reward & Kedisiplinan: ${statusLabel(sa?.status)}.`]);
    if(profile.isTahfizh&&tah?.status==='present')out.push(['Tahfizh lengkap',`${tah.item_count||0} item laporan Tahfizh tersedia pada periode ini.`]);
    if(profile.isTahfizh&&['missing','partial'].includes(low(tah?.status)))out.push(['Tahfizh perlu dilengkapi',categoryTip(tah)]);
    if(profile.isPrincipal&&principal?.status==='present')out.push(['Administrasi Kepala Sekolah tersedia',`${principal.item_count||0} jurnal/rencana kerja tercatat.`]);
    if(profile.isPrincipal&&['missing','partial'].includes(low(principal?.status)))out.push(['Administrasi Kepala Sekolah perlu dilengkapi',categoryTip(principal)]);
    if(bc.masuk>0)out.push(['Aktif sebagai badal',`${bc.masuk} kali menggantikan guru lain pada periode ini.`]);
    if(bc.diganti>0)out.push(['Pernah digantikan',`${bc.diganti} jadwal dibadalkan pada periode ini.`]);
    if((uks?.item_count||0)>0)out.push(['Jaga UKS tercatat',`${uks.item_count} laporan jaga UKS tersedia.`]);
    if(work?.item_count>0)out.push(['Aktivitas kerja terdokumentasi',`${work.item_count} aktivitas/tugas tercatat.`]);
    if(!out.length)out.push(['Data masih berkembang','Belum ada highlight khusus di luar data dasar pada periode ini.']);
    return out.slice(0,8);
  }
  function categoryList(t){
    return applicableCats(t).map(c=>{const tip=categoryTip(c);return `<div class="cq-hl-cat cq-hl-tip" tabindex="0" data-cq-tip="${esc(tip)}" title="${esc(tip)}"><div><b>${esc(c.label||c.key)} ⓘ</b><small>${esc(c.item_count||0)} item${c.last_created_at?' · terakhir '+fmtShort(c.last_created_at):''}</small></div><span class="cq-hl-state ${esc(c.status)}">${statusIcon(c.status)} ${esc(statusLabel(c.status))}</span></div>`}).join('');
  }
  function recentItems(t){
    const all=applicableCats(t).flatMap(c=>(c.items||[]).map(x=>({...x,_cat:c.label||c.key}))).filter(x=>x.created_at||x.period_start).sort((a,b)=>String(b.created_at||b.period_start).localeCompare(String(a.created_at||a.period_start))).slice(0,6);
    if(!all.length)return '<div class="cq-hl-empty">Belum ada aktivitas terbaru pada periode ini.</div>';
    return all.map(x=>`<div class="cq-hl-item"><b>${esc(x.title||x._cat||'Aktivitas')}</b><small>${esc(x._cat||'')} · ${esc(fmtShort(x.period_start||x.created_at))}${x.description?' · '+esc(x.description):''}</small></div>`).join('');
  }
  function roleStats(t){
    const p=roleProfile(t),bad=context(t,'badal'),bc=badalCounts(bad),uks=context(t,'uks_duty'),work=regular(t,'work_activity'),sa=context(t,'student_affairs_reporting'),tah=regular(t,'tahfizh'),principal=regular(t,'principal_work');
    const done=namesByStatus(t,['present']),pending=namesByStatus(t,['missing','partial']);
    const cards=[
      statCard('Indeks Kelengkapan',(t.completeness_index??0)+'%',`Sudah lengkap: ${joinNames(done,'Belum ada')}. Belum/sebagian: ${joinNames(pending,'Tidak ada')}. Indeks hanya memakai kategori yang berlaku untuk role ini.`,pending.length?'warn':'good'),
      statCard('Administrasi Selesai',(t.completed_count||0)+'/'+(t.required_count||0),`Yang sudah lengkap: ${joinNames(done,'Belum ada kategori lengkap')}.`,done.length?'good':''),
      statCard('Perlu Tindak Lanjut',(t.missing_count||0)+(t.partial_count||0),`Yang belum atau baru sebagian: ${joinNames(pending,'Tidak ada — semua kewajiban yang berlaku sudah lengkap')}.`,pending.length?'warn':'good')
    ];
    if(p.isHomeroom&&sa)cards.push(statCard('Laporan Wali Kelas',statusLabel(sa.status),categoryTip(sa),['missing','partial'].includes(low(sa.status))?'warn':'good'));
    if(p.isTahfizh&&tah)cards.push(statCard('Tahfizh',statusLabel(tah.status),categoryTip(tah),['missing','partial'].includes(low(tah.status))?'warn':'good'));
    if(p.isPrincipal&&principal)cards.push(statCard('Adm. Kepala Sekolah',statusLabel(principal.status),categoryTip(principal),['missing','partial'].includes(low(principal.status))?'warn':'good'));
    if(cards.length<6)cards.push(statCard('Menjadi Badal',bc.masuk,`${bc.masuk} kali menggantikan. ${bc.diganti} kali jadwalnya digantikan. ${itemPreview(bad)}`));
    if(cards.length<6)cards.push(statCard('Jaga UKS',uks?.item_count||0,`${uks?.item_count||0} laporan jaga UKS pada periode ini. ${itemPreview(uks)}`));
    if(cards.length<6)cards.push(statCard('Aktivitas Kerja',work?.item_count||0,work?categoryTip(work):'Belum ada data aktivitas kerja.'));
    return cards.slice(0,6).join('');
  }

  async function openHighlight(teacherId){
    if(!isHRD()||!teacherId)return;
    css();const modal=ensureHighlightModal(),name=document.getElementById('cq-hl-name'),meta=document.getElementById('cq-hl-meta'),role=document.getElementById('cq-hl-role'),body=document.getElementById('cq-hl-body');
    modal.classList.add('open');document.body.style.overflow='hidden';name.textContent='Stat Highlight';meta.textContent='Memuat data periode terpilih…';role.textContent='Membaca role…';body.innerHTML='<div class="cq-hl-loading">Menyiapkan Stat Highlight…</div>';
    try{
      const start=document.getElementById('hrd-date-start')?.value||new Date().toISOString().slice(0,7)+'-01',end=document.getElementById('hrd-date-end')?.value||new Date().toISOString().slice(0,10),d=await liveData(start,end),t=(d.teachers||[]).find(x=>String(x.teacher_id)===String(teacherId));
      if(!t)throw new Error('Data pegawai tidak ditemukan pada laporan HRD.');
      const bad=context(t,'badal'),bc=badalCounts(bad),uks=context(t,'uks_duty'),work=regular(t,'work_activity'),sa=context(t,'student_affairs_reporting'),profile=roleProfile(t);
      name.textContent=t.name||'Stat Highlight';role.textContent=profile.label;meta.textContent=[t.position,t.username,(t.classes||[]).join(', '),fmt(start)+' — '+fmt(end)].filter(Boolean).join(' · ');
      const badTip=`${bc.masuk} kali menggantikan dan ${bc.diganti} kali digantikan. ${itemPreview(bad)}`;
      const uksTip=`${uks?.item_count||0} laporan UKS. ${itemPreview(uks)}`;
      const workTip=work?categoryTip(work):'Belum ada data aktivitas kerja.';
      body.innerHTML=`
        <div class="cq-hl-top">${roleStats(t)}</div>
        <div class="cq-hl-grid">
          <section class="cq-hl-panel"><h4>Stat Highlight — ${esc(profile.label)}</h4><div class="cq-hl-panel-hint">Highlight otomatis menyesuaikan kewajiban sesuai role/jabatan.</div><div class="cq-hl-flags">${flags(t).map(x=>`<div class="cq-hl-flag"><i>✦</i><div><b>${esc(x[0])}</b><small>${esc(x[1])}</small></div></div>`).join('')}</div></section>
          <section class="cq-hl-panel"><h4>Status Administrasi & Operasional</h4><div class="cq-hl-panel-hint">Arahkan kursor ke setiap data untuk melihat apa yang sudah lengkap atau belum.</div><div class="cq-hl-cats">${categoryList(t)}</div></section>
        </div>
        <div class="cq-hl-grid" style="margin-top:14px">
          <section class="cq-hl-panel"><h4>Ringkasan Operasional</h4><div class="cq-hl-cats">
            <div class="cq-hl-cat cq-hl-tip" tabindex="0" data-cq-tip="${esc(badTip)}" title="${esc(badTip)}"><div><b>Badal Mengajar ⓘ</b><small>${bc.masuk} menggantikan · ${bc.diganti} digantikan</small></div><span class="cq-hl-state separate">• Otomatis</span></div>
            <div class="cq-hl-cat cq-hl-tip" tabindex="0" data-cq-tip="${esc(uksTip)}" title="${esc(uksTip)}"><div><b>Jaga UKS ⓘ</b><small>${uks?.item_count||0} laporan periode ini</small></div><span class="cq-hl-state separate">• Otomatis</span></div>
            <div class="cq-hl-cat cq-hl-tip" tabindex="0" data-cq-tip="${esc(workTip)}" title="${esc(workTip)}"><div><b>Beban / Aktivitas Kerja ⓘ</b><small>${work?.item_count||0} item aktivitas & tugas</small></div><span class="cq-hl-state separate">• Live</span></div>
            ${sa?.applicable?`<div class="cq-hl-cat cq-hl-tip" tabindex="0" data-cq-tip="${esc(categoryTip(sa))}" title="${esc(categoryTip(sa))}"><div><b>Reward & Kedisiplinan ⓘ</b><small>${sa.item_count||0} unit laporan wali kelas</small></div><span class="cq-hl-state ${esc(sa.status)}">${statusIcon(sa.status)} ${esc(statusLabel(sa.status))}</span></div>`:''}
          </div><div class="cq-hl-footnote">Data operasional bersifat read-only. Kewajiban yang tidak berlaku untuk role ini tidak dihitung sebagai kekurangan. Hover pada kartu/status untuk melihat keterangannya.</div></section>
          <section class="cq-hl-panel"><h4>Aktivitas Terbaru</h4><div class="cq-hl-recent">${recentItems(t)}</div></section>
        </div>`;
    }catch(e){meta.textContent='';role.textContent='';body.innerHTML='<div class="cq-hl-empty"><b>Stat Highlight belum dapat dimuat.</b><br>'+esc(e.message||'Terjadi kendala')+'</div>'}
  }

  function bindHighlights(){
    if(!isHRD())return;css();
    document.querySelectorAll('.hrd-admin-card').forEach(card=>{
      const head=card.querySelector('.hrd-admin-card-head');if(!head||head.dataset.cqHighlight)return;
      const id=String(card.id||'').replace(/^hrd-teacher-/,'');if(!id)return;
      head.dataset.cqHighlight='1';head.title='Klik untuk melihat Stat Highlight sesuai role';head.addEventListener('click',()=>openHighlight(id));
    });
    if(typeof window.hrdFocusTeacher==='function'&&!window.hrdFocusTeacher.__cqHighlightWrapped){
      const base=window.hrdFocusTeacher;const wrapped=function(id){openHighlight(id)};wrapped.__cqHighlightWrapped=true;wrapped.__cqBase=base;window.hrdFocusTeacher=wrapped;
    }
  }
  function mount(){
    if(!isHRD()) return;
    const kpis=document.querySelector('#hrd-root .hrd-kpis'),toolbar=document.querySelector('#hrd-root .hrd-admin-toolbar'),start=document.getElementById('hrd-date-start'),end=document.getElementById('hrd-date-end');
    bindHighlights();if(!kpis||!toolbar||!start||!end) return;if(document.getElementById('cq-hrd-periodbar')) return;css();
    const startField=start.closest('.hrd-date-field'),endField=end.closest('.hrd-date-field'),apply=toolbar.querySelector('.hrd-apply');if(!startField||!endField||!apply) return;
    const bar=document.createElement('section');bar.id='cq-hrd-periodbar';bar.className='cq-hrd-periodbar';bar.innerHTML=`<div class="cq-hrd-periodbar-main"><div><div class="cq-hrd-periodbar-label">Periode Laporan</div><div class="cq-hrd-periodbar-range" id="cq-hrd-period-range">${fmt(start.value)} — ${fmt(end.value)}</div></div><button type="button" class="cq-hrd-periodbar-change">Ubah Tanggal</button></div><div class="cq-hrd-periodbar-edit"></div>`;kpis.insertAdjacentElement('afterend',bar);
    const edit=bar.querySelector('.cq-hrd-periodbar-edit');edit.append(startField,endField,apply);
    bar.querySelector('.cq-hrd-periodbar-change').onclick=function(){bar.classList.toggle('editing');this.textContent=bar.classList.contains('editing')?'Tutup':'Ubah Tanggal'};
    const sync=()=>{highlightCache={key:'',data:null};const x=document.getElementById('cq-hrd-period-range');if(x)x.textContent=fmt(start.value)+' — '+fmt(end.value)};start.addEventListener('change',sync);end.addEventListener('change',sync);
  }

  window.cqHrdOpenHighlight=openHighlight;window.cqHrdCloseHighlight=closeHighlight;
  const root=document.getElementById('content')||document.body;const obs=new MutationObserver(function(){clearTimeout(window.__cqHrdPeriodBarTimer);window.__cqHrdPeriodBarTimer=setTimeout(mount,40)});obs.observe(root,{childList:true,subtree:true});document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,80));setTimeout(mount,500);
})();
