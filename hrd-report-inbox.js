/* CQlass HRD — Laporan Masuk: Walas, Arsip Excel, Kegiatan Sabtu */
(function(){
  'use strict';
  if(window.__cqHrdReportInboxInstalled)return;
  window.__cqHrdReportInboxInstalled=true;

  const state={tab:'walas',data:null,key:'',loading:false};
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const fmtDate=v=>{if(!v)return '—';try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(String(v).slice(0,10)+'T00:00:00+07:00'))}catch(_){return String(v)}};
  const fmtSize=n=>{n=Number(n)||0;if(!n)return '';if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(1)+' MB'};
  const fmtTime=v=>v?String(v).slice(0,5):'';
  const role=()=>{try{return String((typeof currentUser!=='undefined'&&currentUser?.role)||'').toLowerCase()}catch(_){return ''}};
  const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():''}catch(_){return ''}};
  const endpoint=()=>typeof SUPABASE_URL!=='undefined'?SUPABASE_URL+'/functions/v1/hrd-report-inbox':'';

  function installStyle(){
    if(document.getElementById('hrd-inbox-style'))return;
    const s=document.createElement('style');s.id='hrd-inbox-style';s.textContent=`
      #hrd-report-inbox-panel{margin:16px 0;border:1px solid #d8e7e6;border-radius:18px;background:#fff;overflow:hidden;box-shadow:0 8px 24px rgba(25,76,76,.05)}
      .hrdi-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;padding:16px 18px;border-bottom:1px solid #e5eeee;background:#fbfdfd}.hrdi-head h2{margin:0;color:#173f3f;font-size:17px}.hrdi-head p{margin:5px 0 0;color:#6d8585;font-size:11px;line-height:1.5}.hrdi-refresh{border:0;border-radius:11px;background:#e8f4f3;color:#0a6763;height:36px;padding:0 12px;font-weight:800;cursor:pointer}
      .hrdi-tabs{display:flex;gap:7px;padding:12px 16px;border-bottom:1px solid #e7efef;overflow:auto}.hrdi-tab{border:1px solid #dbe8e7;background:#f8fbfb;color:#587171;border-radius:11px;padding:9px 12px;font-weight:800;font-size:11px;cursor:pointer;white-space:nowrap}.hrdi-tab.active{background:#0A6E6E;color:#fff;border-color:#0A6E6E}.hrdi-body{padding:15px;background:#f7fbfa}.hrdi-note{padding:11px 13px;border-radius:12px;background:#eef8f7;border:1px solid #d8ebe8;color:#617979;font-size:10px;line-height:1.55;margin-bottom:12px}
      .hrdi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:11px}.hrdi-card{border:1px solid #dfeae9;background:#fff;border-radius:15px;padding:13px}.hrdi-card summary{cursor:pointer;list-style:none}.hrdi-card summary::-webkit-details-marker{display:none}.hrdi-person{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.hrdi-person b{display:block;color:#214242;font-size:12px}.hrdi-person small{display:block;color:#7b9090;font-size:9px;margin-top:4px}.hrdi-count{background:#eaf5f3;color:#0b6864;border-radius:999px;padding:5px 8px;font-weight:900;font-size:9px;white-space:nowrap}
      .hrdi-report-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin-top:12px}.hrdi-report{border:1px solid #e0eaea;background:#fbfdfd;border-radius:11px;padding:9px}.hrdi-report strong{display:block;font-size:10px;color:#294848}.hrdi-report span{display:block;font-size:9px;color:#748989;margin-top:3px}.hrdi-report.empty{opacity:.62}.hrdi-items{margin-top:8px;border-top:1px dashed #e2eceb;padding-top:6px}.hrdi-item{padding:6px 0;font-size:9px;color:#657d7d;border-bottom:1px dashed #edf2f2}.hrdi-item:last-child{border-bottom:0}.hrdi-item b{font-size:9px;color:#365454}.hrdi-item em{font-style:normal;display:block;color:#849696;margin-top:2px}
      .hrdi-sheets{display:flex;gap:5px;flex-wrap:wrap;margin-top:8px}.hrdi-sheet{background:#f0f6f6;border-radius:8px;padding:4px 6px;font-size:8px;color:#5f7777}.hrdi-sat.placeholder{border-color:#ead9aa;background:#fffaf0}.hrdi-sat-title{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.hrdi-sat-title b{font-size:12px;color:#244444}.hrdi-badge{font-size:8px;font-weight:900;border-radius:999px;padding:5px 7px;background:#e7f5ef;color:#24734c;white-space:nowrap}.hrdi-badge.pending{background:#fff0cf;color:#8a6510}.hrdi-badge.info{background:#eef3f6;color:#5b7078}.hrdi-meta{font-size:9px;color:#788d8d;margin-top:5px;line-height:1.5}.hrdi-empty{padding:26px;text-align:center;color:#748989;font-size:11px}
      @media(max-width:900px){.hrdi-grid,.hrdi-report-grid{grid-template-columns:1fr}}@media(max-width:600px){.hrdi-head{flex-direction:column}.hrdi-refresh{width:100%}}
    `;document.head.appendChild(s);
  }

  async function api(payload){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),20000);
    try{
      const res=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':token()},body:JSON.stringify(payload),signal:ctrl.signal});
      const raw=await res.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons Laporan Masuk tidak valid.')}
      if(!res.ok||d.success===false)throw new Error(d.message||d.error||'Gagal memuat Laporan Masuk.');return d;
    }finally{clearTimeout(timer)}
  }

  function range(){
    const a=document.getElementById('hrd-date-start')?.value,b=document.getElementById('hrd-date-end')?.value;
    const now=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    return{start:a||now.slice(0,8)+'01',end:b||now};
  }
  function panel(){
    let p=document.getElementById('hrd-report-inbox-panel');if(p)return p;
    const root=document.getElementById('hrd-root'),anchor=root?.querySelector('.hrd-priority-board');if(!root||!anchor)return null;
    p=document.createElement('section');p.id='hrd-report-inbox-panel';anchor.parentNode.insertBefore(p,anchor);return p;
  }
  const tabs=()=>'<div class="hrdi-tabs">'+[['walas','Wali Kelas'],['archives','Arsip Excel Lama'],['saturday','Kegiatan Sabtu']].map(x=>'<button class="hrdi-tab '+(state.tab===x[0]?'active':'')+'" onclick="hrdInboxTab(\''+x[0]+'\')">'+x[1]+'</button>').join('')+'</div>';

  function reportBlock(r){
    const items=(r.items||[]).slice(0,10);
    return '<div class="hrdi-report '+(r.count?'':'empty')+'"><strong>'+esc(r.label)+'</strong><span>'+esc(r.count||0)+' data</span>'+(items.length?'<div class="hrdi-items">'+items.map(x=>'<div class="hrdi-item"><b>'+esc(x.title||r.label)+'</b>'+(x.description?'<em>'+esc(x.description)+'</em>':'')+'</div>').join('')+'</div>':'')+'</div>';
  }
  function walasHtml(){
    const rows=state.data?.walas||[];if(!rows.length)return '<div class="hrdi-empty">Belum ada penugasan wali kelas pada semester aktif.</div>';
    return '<div class="hrdi-note">Laporan walas dibaca dari data yang sudah tersimpan di CQlass: Kehadiran Siswa, Dinamika Siswa, PBL/Market Day, dan Bilingual. Data lama tetap dipertahankan di tab Arsip Excel; guru tidak perlu input ulang.</div><div class="hrdi-grid">'+rows.map(t=>'<details class="hrdi-card"><summary><div class="hrdi-person"><div><b>'+esc(t.name)+'</b><small>'+esc((t.classes||[]).join(', '))+(t.role_labels?.length?' · '+esc(t.role_labels.join(', ')):'')+'</small></div><span class="hrdi-count">'+esc((t.reports||[]).reduce((n,r)=>n+Number(r.count||0),0))+' data</span></div></summary><div class="hrdi-report-grid">'+(t.reports||[]).map(reportBlock).join('')+'</div></details>').join('')+'</div>';
  }
  function archivesHtml(){
    const rows=state.data?.archives||[];if(!rows.length)return '<div class="hrdi-empty">Belum ada arsip Excel guru yang dimigrasikan.</div>';
    return '<div class="hrdi-note"><b>Arsip laporan sudah terdata</b> sampai nama file, periode, ukuran, dan daftar sheet. File binary aslinya belum dipindahkan ke storage CQlass, jadi belum saya tampilkan tombol download agar tidak menyesatkan.</div><div class="hrdi-grid">'+rows.map(x=>'<div class="hrdi-card"><div class="hrdi-person"><div><b>'+esc(x.teacher_name||'Guru')+'</b><small>'+esc(x.period_label||x.academic_year_label||'Arsip lama')+'</small></div><span class="hrdi-badge info">Arsip terdata</span></div><div class="hrdi-meta">'+esc(x.source_file_name||'File Excel')+(x.file_size?' · '+esc(fmtSize(x.file_size)):'')+'</div><div class="hrdi-sheets">'+(x.sheet_names||[]).map(s=>'<span class="hrdi-sheet">'+esc(s)+'</span>').join('')+'</div></div>').join('')+'</div>';
  }
  function saturdayHtml(){
    const rows=state.data?.saturday||[];if(!rows.length)return '<div class="hrdi-empty">Tidak ada jadwal Sabtu pada rentang tanggal ini.</div>';
    return '<div class="hrdi-note">Kegiatan Sabtu ditentukan HRD. Jadwal yang masih “belum ditentukan” adalah tugas HRD yang belum ditetapkan dan <b>bukan</b> kekurangan guru.</div><div class="hrdi-grid">'+rows.map(x=>'<div class="hrdi-card hrdi-sat '+(x.placeholder?'placeholder':'')+'"><div class="hrdi-sat-title"><div><b>'+esc(fmtDate(x.event_date))+' — '+esc(x.activity_name||'Kegiatan Sabtu')+'</b><div class="hrdi-meta">'+esc([fmtTime(x.start_time),fmtTime(x.end_time)].filter(Boolean).join('–')||'Jam belum ditetapkan')+' · '+esc(x.audience_mode==='all_teachers'?'Semua guru':x.audience_mode||'Peserta terpilih')+'</div></div><span class="hrdi-badge '+(x.placeholder?'pending':'')+'">'+(x.placeholder?'Belum ditentukan HRD':'Terjadwal')+'</span></div><div class="hrdi-meta">'+esc(x.participant_rows||0)+' peserta tercatat · '+esc(x.attendance_filled||0)+' kehadiran terisi</div>'+(x.note?'<div class="hrdi-meta">'+esc(x.note)+'</div>':'')+'</div>').join('')+'</div>';
  }
  function render(){
    const p=panel();if(!p)return;p.innerHTML='<div class="hrdi-head"><div><h2>Laporan Masuk</h2><p>Walas, arsip Excel lama, dan kegiatan Sabtu. Bagian ini hanya untuk dibaca HRD, bukan form input baru untuk guru.</p></div><button class="hrdi-refresh" onclick="hrdInboxReload()">Muat Ulang</button></div>'+tabs()+'<div class="hrdi-body">'+(state.tab==='walas'?walasHtml():state.tab==='archives'?archivesHtml():saturdayHtml())+'</div>';
  }
  async function load(force=false){
    if(role()!=='hrd')return;const p=panel();if(!p)return;const r=range(),k=r.start+'|'+r.end;if(!force&&state.key===k&&state.data)return;if(state.loading)return;
    state.loading=true;state.key=k;p.innerHTML='<div class="hrdi-empty">Memuat Laporan Masuk...</div>';
    try{state.data=await api({action:'inbox',start:r.start,end:r.end});render()}catch(e){p.innerHTML='<div class="hrdi-empty">'+esc(e.message||'Belum dapat memuat Laporan Masuk.')+'</div>'}finally{state.loading=false}
  }
  function mount(){if(role()!=='hrd')return;installStyle();if(!document.getElementById('hrd-root')?.querySelector('.hrd-admin-hero'))return;panel();load(false)}
  let timer=0;const schedule=()=>{clearTimeout(timer);timer=setTimeout(mount,80)};new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('load',schedule);setTimeout(schedule,300);
  window.hrdInboxTab=v=>{if(!['walas','archives','saturday'].includes(v))return;state.tab=v;render()};
  window.hrdInboxReload=()=>{state.key='';state.data=null;load(true)};
})();