/* CQlass — Global report period control
 * Admin is the single source of truth for PTS/PAS report dates.
 * Teachers can inspect the period, but cannot change a configured period.
 */
(function(){
  'use strict';
  if(window.__cqReportPeriodControl)return;
  window.__cqReportPeriodControl=true;

  const API=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/report-period-config';
  const MONTHS_H=['Muharram','Safar','Rabiul Awal','Rabiul Akhir','Jumadil Awal','Jumadil Akhir','Rajab','Syaban','Ramadan','Syawal','Dzulqaidah','Dzulhijjah'];
  const cache=new Map();
  let syncing=false,lastKey='',observerTimer=0;

  const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const pubType=v=>String(v||'').toUpperCase()==='SEMESTER'||String(v||'').toUpperCase()==='PAS'?'PAS':'PTS';
  function token(){try{return typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')}catch(_){return''}}
  function key(){
    try{
      if(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'&&SUPABASE_PUBLISHABLE_KEY)return SUPABASE_PUBLISHABLE_KEY;
      if(typeof SUPABASE_ANON_KEY!=='undefined'&&SUPABASE_ANON_KEY)return SUPABASE_ANON_KEY;
    }catch(_){}
    return '';
  }
  async function rpc(action,payload={}){
    const k=key(),t=token();
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',...(k?{'apikey':k,'Authorization':'Bearer '+k}:{}),'x-session-token':t||''},body:JSON.stringify({action,...payload})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.success===false){
      const map={unauthorized:'Sesi login tidak ditemukan.',forbidden:'Akses khusus Admin.',academic_year_not_found:'Tahun ajaran tidak ditemukan.',semester_invalid:'Semester tidak valid.',date_invalid:'Tanggal belum lengkap atau tidak valid.',date_range_invalid:'Data Mulai tidak boleh setelah Data Selesai.'};
      throw Error(map[d.error]||d.error||'Pengaturan periode rapor gagal diproses.');
    }
    return d;
  }
  function reportKey(year,semester,type){return [String(year||''),Number(semester||0),pubType(type)].join('|')}
  async function getConfig(year,semester,type,force=false){
    const k=reportKey(year,semester,type);if(!force&&cache.has(k))return cache.get(k);
    const d=await rpc('get',{academic_year:year,semester_no:Number(semester),report_type:pubType(type)});
    cache.set(k,d.config||{configured:false});return d.config||{configured:false};
  }
  function ymdText(v,short=false){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(v||'')))return '—';
    try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:short?'short':'long',year:'numeric',timeZone:'Asia/Jakarta'}).format(new Date(v+'T12:00:00+07:00'))}catch(_){return v}
  }
  function hijriSuggestion(ymd){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(ymd||'')))return '';
    try{
      const p=new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric',timeZone:'Asia/Jakarta'}).formatToParts(new Date(ymd+'T12:00:00+07:00'));
      const val=t=>p.find(x=>x.type===t)?.value||'';
      const day=Number(val('day')),month=Number(val('month')),year=Number(val('year'));
      return day&&month&&year?`${day} ${MONTHS_H[month-1]||''} ${year} AH`:'';
    }catch(_){return''}
  }
  function css(){
    if(document.getElementById('cq-report-period-css'))return;
    const s=document.createElement('style');s.id='cq-report-period-css';s.textContent=`
.cq-rp-admin{max-width:980px;margin:0 auto}.cq-rp-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.cq-rp-grid.dates{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:16px}.cq-rp-field label{display:block;font-size:12px;font-weight:800;margin:0 0 7px}.cq-rp-control{width:100%;height:44px;box-sizing:border-box;border:1px solid #cbdedc;border-radius:10px;padding:0 12px;background:#fff;font:inherit}.cq-rp-help{font-size:11px;line-height:1.5;color:var(--muted,#667);margin-top:6px}.cq-rp-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:18px;padding-top:16px;border-top:1px solid #dce8e7}.cq-rp-note{margin:14px 0;padding:12px 14px;border-radius:11px;background:#eef8f6;color:#466b68;font-size:12px;line-height:1.5}.cq-rp-banner{margin:0 0 14px;padding:12px 14px;border:1px solid #bedbd7;border-radius:12px;background:#f2fbf9;color:#214d49}.cq-rp-banner.warn{border-color:#ead5a1;background:#fff9e9;color:#6f571a}.cq-rp-banner-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.cq-rp-banner strong{font-size:13px}.cq-rp-banner-main{font-size:12px;line-height:1.55;margin-top:4px}.cq-rp-link{border:0;background:transparent;color:#0a6e6e;font-weight:800;font-size:11px;cursor:pointer;padding:2px 0;white-space:nowrap}.cq-rp-detail{display:none;margin-top:10px;padding-top:10px;border-top:1px solid #d5e7e4;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 16px;font-size:11px}.cq-rp-detail.open{display:grid}.cq-rp-detail b{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:#66817e;margin-bottom:2px}.cq-rp-locked{background:#f5f7f7!important;color:#536b69!important;cursor:not-allowed!important}
@media(max-width:760px){.cq-rp-grid,.cq-rp-grid.dates,.cq-rp-detail{grid-template-columns:1fr}.cq-rp-actions{flex-direction:column}.cq-rp-actions .btn{width:100%}.cq-rp-banner-head{flex-direction:column}.cq-rp-link{white-space:normal}}
`;document.head.appendChild(s);
  }

  /* ---------- Admin page ---------- */
  let adminYears=[];
  function yearOptions(selected=''){return adminYears.map(y=>`<option value="${esc(y.id)}" ${String(y.id)===String(selected)?'selected':''}>${esc(y.name)}${y.is_active?' • Aktif':''}</option>`).join('')}
  function activeDefaults(){
    const y=adminYears.find(x=>x.is_active)||adminYears[0]||{};
    const sem=(y.semesters||[]).find(x=>x.is_active)?.semester_no||1;
    return {yearId:y.id||'',semester:Number(sem)};
  }
  async function adminLoadConfig(){
    const yearId=document.getElementById('cq-rp-year')?.value||'',semester=Number(document.getElementById('cq-rp-sem')?.value||1),type=pubType(document.getElementById('cq-rp-type')?.value||'PTS');
    if(!yearId)return;
    const year=adminYears.find(x=>String(x.id)===String(yearId));
    const status=document.getElementById('cq-rp-status');
    try{
      if(status)status.textContent='Memuat pengaturan...';
      const d=await rpc('get',{academic_year_id:yearId,semester_no:semester,report_type:type}),c=d.config||{};
      const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v||''};
      set('cq-rp-start',c.data_start_date);set('cq-rp-end',c.data_end_date);set('cq-rp-date',c.report_date_gregorian);set('cq-rp-hijri',c.report_date_hijri);
      if(status)status.innerHTML=c.configured?`Aktif untuk <b>${esc(type)} • Semester ${semester} • ${esc(year?.name||'')}</b>. Perubahan akan berlaku global pada rapor.`:`Belum ada periode tersimpan untuk <b>${esc(type)} • Semester ${semester} • ${esc(year?.name||'')}</b>.`;
    }catch(e){if(status)status.textContent=e.message;if(typeof showToast==='function')showToast(e.message,true)}
  }
  async function adminRender(container){
    css();container.innerHTML='<div class="cq-rp-admin"><div class="page-title">Pengaturan Rapor</div><div class="page-sub">Atur satu periode resmi untuk seluruh halaman, preview, dan cetak rapor.</div><div class="card"><span class="spinner"></span> Memuat periode...</div></div>';
    try{
      const d=await rpc('years');adminYears=d.years||[];const def=activeDefaults();
      container.innerHTML=`<div class="cq-rp-admin"><div class="page-title">Pengaturan Rapor</div><div class="page-sub">Satu sumber tanggal untuk PTS dan PAS agar data rapor tidak berbeda antarrole.</div><div class="card"><div class="card-title">Periode Data Rapor</div><div class="cq-rp-note">Pilih Tahun Ajaran, Semester, dan Jenis Rapor. Periode yang disimpan akan menjadi sumber resmi. Guru dapat melihat dan memeriksa rentangnya, tetapi tidak dapat mengubahnya dari halaman rapor.</div><div class="cq-rp-grid"><div class="cq-rp-field"><label>Tahun Ajaran</label><select id="cq-rp-year" class="cq-rp-control">${yearOptions(def.yearId)}</select></div><div class="cq-rp-field"><label>Semester</label><select id="cq-rp-sem" class="cq-rp-control"><option value="1" ${def.semester===1?'selected':''}>Semester 1</option><option value="2" ${def.semester===2?'selected':''}>Semester 2</option></select></div><div class="cq-rp-field"><label>Jenis Rapor</label><select id="cq-rp-type" class="cq-rp-control"><option value="PTS">PTS</option><option value="PAS">PAS</option></select></div></div><div id="cq-rp-status" class="cq-rp-note">Memuat pengaturan...</div><div class="cq-rp-grid dates"><div class="cq-rp-field"><label>Data Mulai</label><input id="cq-rp-start" type="date" class="cq-rp-control"><div class="cq-rp-help">Tanggal awal data yang boleh masuk ke rapor.</div></div><div class="cq-rp-field"><label>Data Selesai</label><input id="cq-rp-end" type="date" class="cq-rp-control"><div class="cq-rp-help">Tanggal akhir data yang boleh masuk ke rapor.</div></div><div class="cq-rp-field"><label>Tanggal Rapor (Masehi)</label><input id="cq-rp-date" type="date" class="cq-rp-control"><div class="cq-rp-help">Tanggal resmi pembagian/penandatanganan rapor.</div></div><div class="cq-rp-field"><label>Tanggal Rapor (Hijriah)</label><input id="cq-rp-hijri" class="cq-rp-control" placeholder="Contoh: 8 Muharram 1448 AH"><div class="cq-rp-help">Terisi otomatis dari tanggal Masehi dan tetap dapat dikoreksi Admin.</div></div></div><div class="cq-rp-actions"><button class="btn" id="cq-rp-save">Simpan Periode Rapor</button></div></div></div>`;
      ['cq-rp-year','cq-rp-sem','cq-rp-type'].forEach(id=>document.getElementById(id)?.addEventListener('change',adminLoadConfig));
      document.getElementById('cq-rp-date')?.addEventListener('change',e=>{const h=document.getElementById('cq-rp-hijri');if(h)h.value=hijriSuggestion(e.target.value)});
      document.getElementById('cq-rp-save')?.addEventListener('click',async()=>{
        const btn=document.getElementById('cq-rp-save');
        try{
          if(btn){btn.disabled=true;btn.textContent='Menyimpan...'}
          const yearId=document.getElementById('cq-rp-year')?.value||'',semester=Number(document.getElementById('cq-rp-sem')?.value||1),type=pubType(document.getElementById('cq-rp-type')?.value||'PTS');
          const payload={academic_year_id:yearId,semester_no:semester,report_type:type,data_start_date:document.getElementById('cq-rp-start')?.value||'',data_end_date:document.getElementById('cq-rp-end')?.value||'',report_date_gregorian:document.getElementById('cq-rp-date')?.value||'',report_date_hijri:(document.getElementById('cq-rp-hijri')?.value||'').trim()};
          const d=await rpc('save',payload),c=d.config||{};
          const y=adminYears.find(x=>String(x.id)===String(yearId));cache.set(reportKey(y?.name,semester,type),c);
          if(typeof showToast==='function')showToast('Periode rapor berhasil disimpan dan berlaku global.');
          await adminLoadConfig();scheduleSync(true);
        }catch(e){if(typeof showToast==='function')showToast(e.message,true)}finally{if(btn){btn.disabled=false;btn.textContent='Simpan Periode Rapor'}}
      });
      await adminLoadConfig();
    }catch(e){container.innerHTML=`<div class="cq-rp-admin"><div class="page-title">Pengaturan Rapor</div><div class="card">${esc(e.message)}</div></div>`}
  }
  function bindAdminMenu(){
    try{
      if(typeof MODULE_GROUPS==='undefined')return setTimeout(bindAdminMenu,120);
      let g=MODULE_GROUPS.find(x=>x&&x.id==='administrasi');
      if(!g){g={id:'administrasi',label:'Administrasi',roles:['admin'],items:[]};MODULE_GROUPS.push(g)}
      if(!Array.isArray(g.roles))g.roles=[];if(!g.roles.includes('admin'))g.roles.push('admin');
      let it=(g.items||[]).find(x=>x&&x.id==='pengaturan-rapor');
      if(!it)g.items.push({id:'pengaturan-rapor',label:'Pengaturan Rapor',roles:['admin'],built:true,render:adminRender});
      else Object.assign(it,{label:'Pengaturan Rapor',roles:['admin'],built:true,render:adminRender});
      if(typeof currentUser!=='undefined'&&currentUser?.role==='admin'&&typeof renderSidebar==='function')renderSidebar();
    }catch(e){console.warn('CQlass report period menu',e)}
  }

  /* ---------- Report page: read-only global period ---------- */
  function setLocked(id,locked){
    const el=document.getElementById(id);if(!el)return;
    el.readOnly=!!locked;el.classList.toggle('cq-rp-locked',!!locked);
    if(locked)el.setAttribute('aria-readonly','true');else el.removeAttribute('aria-readonly');
  }
  function banner(c,year,semester,type){
    const old=document.getElementById('cq-rp-banner');if(old)old.remove();
    const toolbar=document.querySelector('#rpv-root .rpv-toolbar')||document.querySelector('.rpv-toolbar');if(!toolbar)return;
    const box=document.createElement('div');box.id='cq-rp-banner';box.className='cq-rp-banner'+(c.configured?'':' warn');
    if(c.configured){
      box.innerHTML=`<div class="cq-rp-banner-head"><div><strong>Rapor ${esc(type)} • Semester ${esc(semester)} • TA ${esc(year)}</strong><div class="cq-rp-banner-main">Periode data: <b>${esc(ymdText(c.data_start_date,true))} – ${esc(ymdText(c.data_end_date,true))}</b> &nbsp;•&nbsp; Tanggal rapor: <b>${esc(ymdText(c.report_date_gregorian))}${c.report_date_hijri?' / '+esc(c.report_date_hijri):''}</b></div></div><button type="button" class="cq-rp-link" id="cq-rp-toggle">Lihat detail periode</button></div><div class="cq-rp-detail" id="cq-rp-detail"><div><b>Tahun Ajaran</b>${esc(year)}</div><div><b>Semester / Jenis</b>Semester ${esc(semester)} • ${esc(type)}</div><div><b>Periode Data Rapor</b>${esc(ymdText(c.data_start_date))} – ${esc(ymdText(c.data_end_date))}</div><div><b>Tanggal Rapor</b>${esc(ymdText(c.report_date_gregorian))}${c.report_date_hijri?' / '+esc(c.report_date_hijri):''}</div><div><b>Terakhir Diperbarui</b>${c.updated_at?esc(new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(c.updated_at))):'—'}</div><div><b>Akses Guru</b>Hanya lihat / cek periode</div></div>`;
    }else{
      box.innerHTML=`<div class="cq-rp-banner-head"><div><strong>Periode Rapor ${esc(type)} belum ditetapkan Admin</strong><div class="cq-rp-banner-main">Sementara ini halaman masih memakai rentang yang tampil pada form. Setelah Admin menyimpan periode resmi, rentang akan terkunci otomatis untuk semua pengguna.</div></div></div>`;
    }
    toolbar.parentNode.insertBefore(box,toolbar);
    document.getElementById('cq-rp-toggle')?.addEventListener('click',()=>{const d=document.getElementById('cq-rp-detail');if(!d)return;d.classList.toggle('open');const b=document.getElementById('cq-rp-toggle');if(b)b.textContent=d.classList.contains('open')?'Tutup detail':'Lihat detail periode'});
  }
  function applyConfig(c,year,semester,type){
    if(c?.configured){
      const values={'rpv-start':c.data_start_date||'','rpv-end':c.data_end_date||'','rpv-print-date':c.report_date_gregorian||'','rpv-hijri':c.report_date_hijri||''};
      for(const [id,v] of Object.entries(values)){const el=document.getElementById(id);if(el)el.value=v;setLocked(id,true)}
      try{
        if(window.raporPreviewState){window.raporPreviewState.startDate=c.data_start_date||'';window.raporPreviewState.endDate=c.data_end_date||'';window.raporPreviewState.printDate=c.report_date_gregorian||'';window.raporPreviewState.hijriDate=c.report_date_hijri||''}
      }catch(_){}
    }else ['rpv-start','rpv-end','rpv-print-date','rpv-hijri'].forEach(id=>setLocked(id,false));
    banner(c||{configured:false},year,semester,type);
  }
  async function syncReportPage(force=false){
    if(syncing||!document.getElementById('rpv-start'))return;
    let s;try{s=window.raporPreviewState}catch(_){return}if(!s)return;
    const year=String(s.academicYear||'').trim(),semester=Number(s.semester||0),type=pubType(s.reportType||document.getElementById('rpv-type')?.value||'PTS');
    if(!year||![1,2].includes(semester))return;
    const k=reportKey(year,semester,type);if(!force&&lastKey===k&&document.getElementById('cq-rp-banner'))return;
    syncing=true;lastKey=k;
    try{const c=await getConfig(year,semester,type,force);applyConfig(c,year,semester,type)}catch(e){console.warn('CQlass report period sync',e)}finally{syncing=false}
  }
  function scheduleSync(force=false){clearTimeout(observerTimer);observerTimer=setTimeout(()=>syncReportPage(force),80)}
  function observe(){
    css();
    const root=document.getElementById('content')||document.body;
    new MutationObserver(()=>scheduleSync(false)).observe(root,{childList:true,subtree:true});
    document.addEventListener('change',e=>{const id=String(e.target?.id||'');if(id.startsWith('rpv-')){lastKey='';scheduleSync(false)}},true);
    scheduleSync(false);
  }

  /* Defense in depth: configured data range also replaces preview/bulk payloads. */
  function wrapPreviewRequest(){
    if(typeof window.reportPreviewRequest!=='function')return setTimeout(wrapPreviewRequest,50);
    if(window.reportPreviewRequest.__cqReportPeriodGuard)return;
    const original=window.reportPreviewRequest;
    async function guarded(action,payload={},timeoutMs){
      let p={...(payload||{})};
      if(['preview','bulk'].includes(String(action||'').toLowerCase())){
        const year=String(p.academic_year||window.raporPreviewState?.academicYear||''),semester=Number(p.semester_no||window.raporPreviewState?.semester||0),type=pubType(p.report_type||window.raporPreviewState?.reportType||'PTS');
        if(year&&[1,2].includes(semester)){
          try{
            const c=await getConfig(year,semester,type,false);
            if(c.configured){p.start_date=c.data_start_date;p.end_date=c.data_end_date;applyConfig(c,year,semester,type)}
          }catch(e){console.warn('CQlass report period guard',e)}
        }
      }
      const data=await original(action,p,timeoutMs);
      const c=data?.report_period||data?.report?.report_period;
      if(c?.configured){cache.set(reportKey(c.academic_year,c.semester_no,c.report_type),c);applyConfig(c,c.academic_year,c.semester_no,c.report_type)}
      return data;
    }
    guarded.__cqReportPeriodGuard=true;window.reportPreviewRequest=guarded;
  }

  bindAdminMenu();observe();wrapPreviewRequest();
})();
