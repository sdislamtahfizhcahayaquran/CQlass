/* CQlass — Kabid Akademik cleanup
   Fokus: data akademik terstruktur, menu tidak tercecer, dashboard hanya domain akademik.
   Tidak mengubah data atau skema backend. */
(function(){
  'use strict';

  const AY='2026/2027';
  const SEM=1;
  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const ANALYTICS_URL=BASE+'/functions/v1/academic-analytics';
  let cache=null, cacheAt=0;

  function role(){const u=typeof currentUser!=='undefined'?currentUser:null;return String(u?.role||'').toLowerCase()}
  function esc(v){return typeof window.escapeHtml==='function'?window.escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function num(v,d=0){const n=Number(v);return Number.isFinite(n)?n:d}
  function fmt(v){const n=Number(v);return Number.isFinite(n)?n.toLocaleString('id-ID',{maximumFractionDigits:1}):'—'}
  function pct(v){return `${fmt(v)}%`}
  function clamp(v){return Math.max(0,Math.min(100,num(v)))}
  function withoutRole(roles,r){return (Array.isArray(roles)?roles:[]).filter(x=>x!==r)}
  function hasModule(id){try{return typeof findModuleByIdV2==='function'&&!!findModuleByIdV2(id)}catch(_){return false}}

  function headers(){
    const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
    const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||'';
    return {'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token};
  }

  async function request(force=false){
    if(!force&&cache&&Date.now()-cacheAt<45000)return cache;
    const r=await fetch(ANALYTICS_URL,{method:'POST',headers:headers(),body:JSON.stringify({academic_year:AY,semester_no:SEM})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.success===false)throw new Error(d.message||d.detail||d.error||'Ringkasan akademik belum dapat dimuat.');
    cache=d;cacheAt=Date.now();return d;
  }

  function css(){
    if(document.getElementById('akd-clean-css'))return;
    const s=document.createElement('style');s.id='akd-clean-css';s.textContent=`
.akd{max-width:1500px;margin:0 auto;color:var(--text)}.akd-head{display:flex;justify-content:space-between;align-items:flex-end;gap:14px;flex-wrap:wrap;margin-bottom:14px}.akd-title{font-size:24px;font-weight:900;letter-spacing:-.025em;color:#123f3d}.akd-sub{font-size:10.5px;color:var(--muted);margin-top:5px;line-height:1.45}.akd-actions{display:flex;gap:7px;flex-wrap:wrap}.akd-actions button{height:36px}.akd-kpis{display:grid;grid-template-columns:repeat(6,minmax(125px,1fr));gap:9px;margin-bottom:11px}.akd-kpi,.akd-card{background:#fff;border:1px solid var(--border);border-radius:13px}.akd-kpi{padding:12px;min-height:82px}.akd-kpi b{display:block;font-size:21px;line-height:1;color:#08746f}.akd-kpi span{display:block;font-size:9px;color:var(--muted);font-weight:800;margin-top:7px}.akd-kpi.warn b{color:#a65823}.akd-kpi.bad b{color:#a43d35}.akd-card{padding:14px;margin-bottom:11px}.akd-card-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;margin-bottom:10px}.akd-card-title{font-size:12.5px;font-weight:900;color:#173f3d}.akd-card-sub{font-size:9.5px;color:var(--muted);margin-top:3px;line-height:1.4}.akd-grid2{display:grid;grid-template-columns:1fr 1fr;gap:11px}.akd-grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:11px}.akd-shortcuts{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:8px}.akd-shortcut{border:1px solid var(--border);background:#fbfdfd;border-radius:11px;padding:11px;text-align:left;cursor:pointer;transition:.15s}.akd-shortcut:hover{border-color:#83b8b4;background:#f2f9f8;transform:translateY(-1px)}.akd-shortcut b{display:block;font-size:10.5px;color:#174d49}.akd-shortcut span{display:block;font-size:8.8px;color:var(--muted);line-height:1.4;margin-top:4px}.akd-list{display:grid;gap:6px}.akd-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;align-items:center;padding:8px 9px;border-radius:9px;background:#f6f9f9}.akd-row.bad{background:#fff4f0}.akd-row b{display:block;font-size:10px;line-height:1.3}.akd-row small{display:block;font-size:8.7px;color:var(--muted);margin-top:2px}.akd-row strong{font-size:10.5px;color:#08746f;white-space:nowrap}.akd-row.bad strong{color:#a43d35}.akd-progress{height:5px;background:#e9efef;border-radius:99px;overflow:hidden;margin-top:5px}.akd-progress i{display:block;height:100%;background:#13817c}.akd-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:10px;max-height:430px}.akd-table{width:100%;border-collapse:collapse;min-width:760px}.akd-table th,.akd-table td{padding:8px 9px;border-bottom:1px solid var(--border);font-size:9.5px;text-align:left;vertical-align:top}.akd-table th{position:sticky;top:0;background:#f2f7f6;color:var(--muted);font-size:8.6px;text-transform:uppercase;letter-spacing:.03em;z-index:1}.akd-table tr:last-child td{border-bottom:0}.akd-table tbody tr:hover td{background:#fbfdfd}.akd-pill{display:inline-flex;padding:4px 7px;border-radius:999px;background:#edf7f5;color:#08746f;font-size:8.3px;font-weight:900}.akd-pill.warn{background:#fff6df;color:#946516}.akd-pill.bad{background:#fff0ec;color:#9b3e2d}.akd-empty{padding:19px;text-align:center;color:var(--muted);font-size:10px}.akd-note{font-size:8.8px;color:var(--muted);line-height:1.45;margin-top:8px}.akd-loading{padding:25px;text-align:center;color:var(--muted);font-size:10.5px}
@media(max-width:1180px){.akd-kpis,.akd-shortcuts{grid-template-columns:repeat(3,1fr)}}@media(max-width:820px){.akd-grid2,.akd-grid3{grid-template-columns:1fr}.akd-kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:560px){.akd-shortcuts{grid-template-columns:repeat(2,1fr)}.akd-head{align-items:flex-start}.akd-actions{width:100%}.akd-actions button{flex:1}}
`;
    document.head.appendChild(s);
  }

  function list(rows,kind){
    if(!rows.length)return '<div class="akd-empty">Belum ada data.</div>';
    return '<div class="akd-list">'+rows.slice(0,8).map(x=>{
      const completion=x.completion==null?null:num(x.completion);
      const value=kind==='completion'?pct(completion):kind==='student'?fmt(x.average):kind==='teacher'?pct(completion):fmt(x.average??x.score);
      const bad=kind==='completion'||kind==='teacher'?completion<100:(kind==='student'?num(x.average)<75:false);
      const meta=kind==='teacher'?`${num(x.assignments)} penugasan`:kind==='student'?`${num(x.count)} data nilai`:(x.subject_name||x.meta||'');
      return `<div class="akd-row ${bad?'bad':''}"><div><b>${esc(x.name||x.teacher_name||x.class_name||'—')}</b><small>${esc(meta)}</small>${completion!=null?`<div class="akd-progress"><i style="width:${clamp(completion)}%"></i></div>`:''}</div><strong>${esc(value)}</strong></div>`;
    }).join('')+'</div>';
  }

  function shortcuts(){
    const items=[
      ['akd-monitoring-nilai','Monitoring Nilai','Kelengkapan, TP, ketuntasan, dan leger per kelas.'],
      ['akd-laporan-guru','Laporan Per Guru','Guru belum input, progres penugasan, dan rincian kelas-mapel.'],
      ['rpp-lp','RPP & LP','Pantau target LP, upload RPP, pacing, dan hasil verifikasi.'],
      ['leger','Input Nilai','Buka input nilai TP dan komponen penilaian.'],
      ['pjbl','PjBL','Pantau pelaksanaan dan penilaian PjBL.'],
      ['rapor','Cetak Rapor','Finalisasi dan cetak rapor setelah data siap.']
    ];
    return '<div class="akd-shortcuts">'+items.filter(x=>hasModule(x[0])).map(x=>`<button class="akd-shortcut" onclick="setActiveModule('${x[0]}')"><b>${esc(x[1])}</b><span>${esc(x[2])}</span></button>`).join('')+'</div>';
  }

  function table(headers,rows,empty='Belum ada data.'){
    if(!rows.length)return `<div class="akd-empty">${esc(empty)}</div>`;
    return `<div class="akd-table-wrap"><table class="akd-table"><thead><tr>${headers.map(h=>`<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
  }

  function renderData(d){
    const summary=d.summary||{};
    const teachers=(d.teacher_reports||[]).slice().sort((a,b)=>num(a.completion)-num(b.completion));
    const teacherPending=teachers.filter(x=>num(x.completion)<100);
    const classes=(d.class_completion||[]).slice().sort((a,b)=>num(a.completion)-num(b.completion));
    const students=(d.attention_students||[]).slice().sort((a,b)=>num(a.average,999)-num(b.average,999));
    const subjects=(d.subject_analysis||[]).slice().sort((a,b)=>num(a.average,999)-num(b.average,999));
    const objectives=(d.objective_analysis||[]).slice().sort((a,b)=>num(a.average,999)-num(b.average,999));
    const assignments=(d.assignment_reports||[]).slice().sort((a,b)=>num(a.completion)-num(b.completion));
    const pjbl=(d.pjbl||[]).slice().sort((a,b)=>num(b.logs)-num(a.logs));
    const pjblLogs=pjbl.reduce((s,x)=>s+num(x.logs),0);

    const assignmentRows=assignments.slice(0,120).map(x=>`<tr><td><b>${esc(x.class_name||'—')}</b></td><td>${esc(x.subject_name||'—')}</td><td>${esc(x.teacher_name||'—')}</td><td>${num(x.students)}</td><td>${num(x.filled)}/${num(x.expected)}</td><td><span class="akd-pill ${num(x.completion)<70?'bad':num(x.completion)<100?'warn':''}">${pct(x.completion)}</span></td><td>${fmt(x.average)}</td></tr>`);
    const subjectRows=subjects.slice(0,15).map(x=>`<tr><td><b>${esc(x.name||'—')}</b></td><td>${fmt(x.average)}</td><td>${num(x.count)}</td></tr>`);
    const objectiveRows=objectives.slice(0,20).map(x=>`<tr><td><b>${esc(x.name||'—')}</b><div class="akd-note">${esc(x.description||'')}</div></td><td>${esc(x.subject_name||'—')}</td><td>${fmt(x.average)}</td><td>${num(x.count)}</td></tr>`);
    const pjblRows=pjbl.slice(0,20).map(x=>`<tr><td><b>${esc(x.name||'—')}</b></td><td>${num(x.logs)}</td><td>${num(x.scored)}</td></tr>`);

    return `<div class="akd">
      <div class="akd-head"><div><div class="akd-title">Dashboard Kabid Akademik</div><div class="akd-sub">Satu halaman untuk melihat kondisi nilai, guru, kelas, siswa, TP, RPP/LP, PjBL, dan kesiapan rapor · Semester ${SEM} · Tahun Ajaran ${AY}</div></div><div class="akd-actions"><button class="btn btn-sm" onclick="akdRefreshDashboard()">Muat Ulang</button><button class="btn btn-sm btn-secondary" onclick="setActiveModule('akd-monitoring-nilai')">Buka Monitoring</button></div></div>
      <div class="akd-kpis">
        <div class="akd-kpi"><b>${pct(summary.completion||0)}</b><span>Kelengkapan Nilai</span></div>
        <div class="akd-kpi ${teacherPending.length?'warn':''}"><b>${teacherPending.length}</b><span>Guru Belum Lengkap</span></div>
        <div class="akd-kpi ${num(summary.attention)?'bad':''}"><b>${num(summary.attention)}</b><span>Siswa Perlu Perhatian</span></div>
        <div class="akd-kpi"><b>${subjects.length}</b><span>Mata Pelajaran Terukur</span></div>
        <div class="akd-kpi"><b>${objectives.length}</b><span>TP Terukur</span></div>
        <div class="akd-kpi"><b>${pjblLogs}</b><span>Log PjBL</span></div>
      </div>
      <div class="akd-card"><div class="akd-card-head"><div><div class="akd-card-title">Akses Akademik Utama</div><div class="akd-card-sub">Menu yang paling sering dipakai Kabid Akademik disatukan di sini.</div></div></div>${shortcuts()}</div>
      <div class="akd-grid3">
        <div class="akd-card"><div class="akd-card-head"><div><div class="akd-card-title">Guru Perlu Tindak Lanjut</div><div class="akd-card-sub">Diurutkan dari kelengkapan nilai terendah.</div></div></div>${list(teacherPending,'teacher')}</div>
        <div class="akd-card"><div class="akd-card-head"><div><div class="akd-card-title">Kelas Belum Lengkap</div><div class="akd-card-sub">Prioritas pengecekan input nilai per kelas.</div></div></div>${list(classes,'completion')}</div>
        <div class="akd-card"><div class="akd-card-head"><div><div class="akd-card-title">Siswa Perlu Perhatian</div><div class="akd-card-sub">Berdasarkan capaian akademik dari data yang tersedia.</div></div></div>${list(students,'student')}</div>
      </div>
      <div class="akd-card"><div class="akd-card-head"><div><div class="akd-card-title">Kelengkapan Nilai per Kelas · Mapel · Guru</div><div class="akd-card-sub">Tabel utama untuk melihat bagian mana yang masih kosong sebelum rekap dan rapor.</div></div></div>${table(['Kelas','Mata Pelajaran','Guru','Siswa','Terisi / Target','Kelengkapan','Rata-rata'],assignmentRows,'Belum ada penugasan akademik yang dapat dianalisis.')}</div>
      <div class="akd-grid2">
        <div class="akd-card"><div class="akd-card-head"><div><div class="akd-card-title">Mata Pelajaran Paling Menantang</div><div class="akd-card-sub">Diurutkan dari rata-rata terendah.</div></div></div>${table(['Mata Pelajaran','Rata-rata','Data Nilai'],subjectRows)}</div>
        <div class="akd-card"><div class="akd-card-head"><div><div class="akd-card-title">TP Paling Menantang</div><div class="akd-card-sub">TP dengan rata-rata terendah menjadi prioritas evaluasi pembelajaran.</div></div></div>${table(['TP','Mata Pelajaran','Rata-rata','Data Nilai'],objectiveRows)}</div>
      </div>
      <div class="akd-card"><div class="akd-card-head"><div><div class="akd-card-title">Pelaksanaan PjBL</div><div class="akd-card-sub">Ringkasan laporan PjBL per kelas.</div></div></div>${table(['Kelas','Laporan Pekan','Nilai Siswa Terisi'],pjblRows,'Belum ada laporan PjBL.')}</div>
      <div class="akd-note">Nilai kosong tetap dianggap belum terisi, bukan 0. Dashboard ini hanya merapikan dan membaca data yang sudah ada; tidak mengubah nilai, penugasan, TP, RPP, maupun data siswa.</div>
    </div>`;
  }

  window.renderKabidAcademicDashboard=async function(content,force=false){
    css();
    content.innerHTML='<div class="akd"><div class="akd-card akd-loading"><span class="spinner"></span> Menyusun ringkasan akademik...</div></div>';
    try{
      const d=await request(force);
      if(role()!=='akademik'||String(typeof activeModule!=='undefined'?activeModule:'')!=='dashboard')return;
      content.innerHTML=renderData(d);
    }catch(e){
      content.innerHTML=`<div class="akd"><div class="akd-card"><div class="akd-card-title">Dashboard akademik belum dapat dimuat.</div><div class="akd-note">${esc(e.message)}</div><div style="margin-top:10px"><button class="btn btn-sm" onclick="akdRefreshDashboard()">Coba Lagi</button></div></div></div>`;
    }
  };

  window.akdRefreshDashboard=function(){
    cache=null;cacheAt=0;
    const content=document.getElementById('content');
    if(content&&role()==='akademik'&&String(typeof activeModule!=='undefined'?activeModule:'')==='dashboard')window.renderKabidAcademicDashboard(content,true);
  };

  function normalizeMenu(){
    try{
      if(typeof MODULE_GROUPS==='undefined')return false;
      const academic=MODULE_GROUPS.find(g=>g&&g.id==='akademik');
      if(!academic||!Array.isArray(academic.items))return false;
      if(!academic.roles.includes('akademik'))academic.roles.push('akademik');

      const labels={leger:'Input Nilai', 'rpp-lp':'RPP & LP', pjbl:'PjBL', bilingual:'Bilingual', rapor:'Cetak Rapor'};
      academic.items.forEach(item=>{if(item&&labels[item.id])item.label=labels[item.id]});
      const order=['leger','rpp-lp','pjbl','bilingual','rapor'];
      academic.items.sort((a,b)=>{
        const ai=order.indexOf(a?.id),bi=order.indexOf(b?.id);
        return (ai<0?999:ai)-(bi<0?999:bi);
      });

      let reports=MODULE_GROUPS.find(g=>g&&g.id==='laporan');
      if(!reports){reports={id:'laporan',label:'Laporan',roles:[],items:[]};MODULE_GROUPS.push(reports)}
      if(!Array.isArray(reports.roles))reports.roles=[];
      if(!Array.isArray(reports.items))reports.items=[];

      let monitoring=MODULE_GROUPS.find(g=>g&&g.id==='monitoring-akademik');
      if(!monitoring){
        monitoring={id:'monitoring-akademik',label:'Monitoring Akademik',roles:['akademik'],items:[]};
        const aidx=MODULE_GROUPS.indexOf(academic);
        MODULE_GROUPS.splice(aidx+1,0,monitoring);
      }
      monitoring.label='Monitoring Akademik';monitoring.roles=['akademik'];
      if(!Array.isArray(monitoring.items))monitoring.items=[];

      const sourceMonitoring=reports.items.find(x=>x&&x.id==='legger-live');
      const sourceTeacher=reports.items.find(x=>x&&x.id==='laporan-akademik-guru');
      if(sourceMonitoring){
        sourceMonitoring.roles=withoutRole(sourceMonitoring.roles,'akademik');
        let it=monitoring.items.find(x=>x&&x.id==='akd-monitoring-nilai');
        if(!it){it={...sourceMonitoring,id:'akd-monitoring-nilai'};monitoring.items.push(it)}
        it.label='Monitoring Nilai';it.roles=['akademik'];it.built=true;it.render=window.renderAcademicLeggerLive||sourceMonitoring.render;
      }
      if(sourceTeacher){
        sourceTeacher.roles=withoutRole(sourceTeacher.roles,'akademik');
        let it=monitoring.items.find(x=>x&&x.id==='akd-laporan-guru');
        if(!it){it={...sourceTeacher,id:'akd-laporan-guru'};monitoring.items.push(it)}
        it.label='Laporan Per Guru';it.roles=['akademik'];it.built=true;it.render=window.renderAcademicTeacherReport||sourceTeacher.render;
      }
      const monOrder=['akd-monitoring-nilai','akd-laporan-guru'];
      monitoring.items.sort((a,b)=>monOrder.indexOf(a.id)-monOrder.indexOf(b.id));

      if(reports.items.some(x=>Array.isArray(x.roles)&&x.roles.includes('akademik'))&&!reports.roles.includes('akademik'))reports.roles.push('akademik');
      return true;
    }catch(e){console.warn('Kabid Akademik menu cleanup gagal',e);return false}
  }

  function install(){
    normalizeMenu();
    try{
      if(typeof DASHBOARD_MODULE!=='undefined'){
        if(!DASHBOARD_MODULE.roles.includes('akademik'))DASHBOARD_MODULE.roles.push('akademik');
        const old=DASHBOARD_MODULE.render||window.renderDashboard;
        if(!window.__akdOldDashboard)window.__akdOldDashboard=old;
        const wrapped=function(content){
          if(role()==='akademik')return window.renderKabidAcademicDashboard(content,false);
          return window.__akdOldDashboard?window.__akdOldDashboard(content):undefined;
        };
        wrapped.__akdClean=true;
        window.renderDashboard=wrapped;
        DASHBOARD_MODULE.render=wrapped;
      }
      if(typeof window.renderSidebar==='function'&&!window.renderSidebar.__akdMenuClean){
        const oldSidebar=window.renderSidebar;
        const wrappedSidebar=function(){normalizeMenu();return oldSidebar.apply(this,arguments)};
        wrappedSidebar.__akdMenuClean=true;
        window.renderSidebar=wrappedSidebar;
      }
      if(typeof currentUser!=='undefined'&&currentUser&&typeof renderSidebar==='function')renderSidebar();
    }catch(e){console.warn('Kabid Akademik dashboard cleanup gagal',e)}
  }

  let tries=0;
  (function wait(){
    if(typeof MODULE_GROUPS!=='undefined'&&typeof DASHBOARD_MODULE!=='undefined'){install();return}
    if(++tries<50)setTimeout(wait,120);
  })();
  document.addEventListener('DOMContentLoaded',()=>setTimeout(install,80));
})();
