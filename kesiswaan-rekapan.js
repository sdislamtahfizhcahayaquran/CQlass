/* CQlass — REKAPAN Kabid Kesiswaan
   Isolated/read-only. Does not alter any other role or input workflow. */
(function(){
  'use strict';
  if(window.__cqKesiswaanRekapanV11)return;
  window.__cqKesiswaanRekapanV11=true;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const API=BASE+'/functions/v1/student-affairs-center';
  const UKS_API=BASE+'/functions/v1/uks-duty';
  const WALAS={
    '03985f8c-bec2-4d14-b64f-da1452bd5857':'Adek Afrisilia, S.Hum.',
    '3227ac78-8c2f-4b41-a33e-8a9feadedb2f':'Muhammad Ilham, M.Pd.',
    '0954658b-1145-47c7-80e2-72a0266c6dd4':'Desyifa Fauziah, S.Kom.',
    '74fcd604-75a4-432b-8a78-ab7a2c68d9fa':'Dimas Hudda Satriani, S.Pd.',
    'd9c1b839-1141-40c1-beab-56f7bd46aa30':'Mulya Widianti, S.Hum',
    '23a912da-5497-4b58-b079-425d09f77371':'Hafizh Maulana S., S.Sos',
    '29ee5d4b-0c58-4f36-971e-e59bec30a088':'Devita Irmayani, S.Pd.',
    '177e4442-72e0-4f26-a0b3-4ce194731523':'M. Faris Aufarinsan, Lc',
    '4ab7c126-94fe-44e3-8fae-1b22d2735d18':'Karina Vega Irawan, S.Pd.',
    '8db93779-b0c1-47d6-a67e-f8632d93d4b6':'Yazid Abdurrohman, S.Pd.',
    'd4dd18d2-1582-4c0a-8354-10e2b7e9ce60':'Najwa Azka Khairani, S.Pd.',
    '31c7c96f-c0f2-49a8-95ab-6bba7e8e6acf':'Faaruq Ibrahim, S.Pd.',
    'd6d00d82-3c49-41b5-976f-27b8398f8b2a':'Dianita Priliasari, S.Pd.',
    '0e91ad73-707c-454f-81c1-b15b77356a31':'M. Luthfi Taufiqurrahman, S.H',
    '02e8083c-eb84-4ead-95c0-4fa20c35969a':'Salma Khoirunisa, S.Pd.',
    '2739e845-671e-4d6b-bc7d-9c346551a548':'Arif Hidayat',
    'ab5dcf6d-fa2a-4b4a-8a98-48c0fb0992d1':'Aghista Putri Amelia, S.Pd.',
    '2bd4fe85-c28e-452f-988b-7b339d53bf64':'Ahmad Naufal Ekasukma, S.Ag.',
    'f962edc7-f012-4914-9675-0a89738a94bf':'Zeni Hardiyanita, S.Pd.',
    'a654db89-312e-480b-9acc-6068fc2cdfe2':"Muhammad Sa'ad Salim, S.Sos.",
    '2272ba1a-9a4e-447a-9996-8a4232b4d792':'Dila Nur Azizah, S.Pd.',
    '4fa0f6ad-e5b2-4a13-bf64-fd798c8e4da5':'Abdurrokhman, M.Pd.'
  };
  const S={from:'',to:'',data:null,selected:null,uksSchedule:[],uksStatuses:[],timesheet:[],loadId:0};

  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const N=v=>String(v??'').trim().toLowerCase().replace(/[\s.,]/g,'');
  function role(){
    try{return String(currentUser?.role||currentUser?.primary_role||currentUser?.role_code||'').trim().toLowerCase().replace(/[\s-]+/g,'_')}
    catch(_){return''}
  }
  function isKesiswaan(){const r=role();return r==='kesiswaan'||r==='kabid_kesiswaan'}
  function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}}
  function today(){try{return typeof jakartaTodayISO==='function'?jakartaTodayISO():new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(_){return new Date().toISOString().slice(0,10)}}
  async function request(url,body){
    const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
    const r=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()},body:JSON.stringify(body)});
    const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw Error('Respons server tidak valid.')}
    if(!r.ok||d.success===false)throw Error(d.message||d.error||'Gagal memuat data.');
    return d;
  }
  const post=body=>request(API,body);
  const postUks=body=>request(UKS_API,body);
  function css(){
    if(document.getElementById('cq-kesiswaan-rekapan-css-v3'))return;
    const s=document.createElement('style');s.id='cq-kesiswaan-rekapan-css-v3';s.textContent=`
      .krek{max-width:1380px;margin:0 auto;color:#18334d}.krek *{box-sizing:border-box}
      .krek h1{font-size:24px;margin:0}.krek-sub{font-size:12px;color:#6b7f91;margin:5px 0 14px}
      .krek-filter{display:flex;align-items:end;gap:10px;flex-wrap:wrap;background:#fff;border:1px solid #dfe7ef;border-radius:14px;padding:12px;margin-bottom:12px}
      .krek-field{display:flex;flex-direction:column;gap:5px}.krek-field label{font-size:10px;font-weight:900;color:#607488;text-transform:uppercase}.krek-field input{border:1px solid #d8e3ed;border-radius:9px;padding:9px 10px;font:inherit}
      .krek-btn{border:0;border-radius:9px;padding:9px 13px;background:#173e69;color:#fff;font-weight:800;cursor:pointer}
      .krek-actions{display:flex;gap:8px;align-items:center;margin-left:auto}.krek-btn.secondary{background:#eef4f8;color:#24557f;border:1px solid #d3e0ea}.krek-btn.report{background:#0b7d79}
      .krek-report-head,.krek-summary,.krek-daily-table,.krek-missing{width:min(1160px,calc(100vw - 28px));margin-left:auto;margin-right:auto}
      .krek-report-head{display:flex;justify-content:space-between;align-items:center;gap:14px;background:#fff;border:1px solid #dfe7ef;border-radius:12px;padding:9px 14px;margin-bottom:6px}
      .krek-report-title{font-size:18px;font-weight:950;letter-spacing:.02em;color:#163b5d}.krek-report-school{font-size:9px;font-weight:850;color:#5f7789;margin-top:1px;text-transform:uppercase}.krek-report-date{font-size:10.5px;font-weight:800;color:#38566d;margin-top:3px}.krek-report-stamp{font-size:8px;color:#718294;margin-top:1px}
      .krek-summary{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin-bottom:6px}.krek-sum{background:#fff;border:1px solid #dfe7ef;border-radius:10px;padding:6px 9px;min-height:48px;display:flex;flex-direction:column;justify-content:center}.krek-sum b{display:block;font-size:17px;color:#173e69;line-height:1}.krek-sum span{display:block;font-size:7.8px;font-weight:850;color:#6d7f8e;text-transform:uppercase;margin-top:3px;line-height:1.05}
      .krek-daily-table{background:#fff;border:1px solid #dfe7ef;border-radius:10px;overflow:hidden}.krek-daily-table .krek-wrap{overflow:visible}.krek-daily-table table{width:100%!important;min-width:0!important;max-width:none!important;table-layout:fixed!important}.krek-daily-table th,.krek-daily-table td{padding:3px 7px!important;font-size:10.2px!important;line-height:1.05!important;height:25px!important}.krek-daily-table th{font-size:8.7px!important;height:27px!important}
      .krek-daily-table th:nth-child(1),.krek-daily-table td:nth-child(1){width:42px!important;min-width:42px!important;max-width:42px!important;text-align:center}
      .krek-daily-table th:nth-child(2),.krek-daily-table td:nth-child(2){width:105px!important}
      .krek-daily-table th:nth-child(3),.krek-daily-table td:nth-child(3){width:270px!important}
      .krek-daily-table th:nth-child(4),.krek-daily-table td:nth-child(4){width:150px!important;text-align:center}
      .krek-daily-table th:nth-child(5),.krek-daily-table td:nth-child(5){width:150px!important;text-align:center}
      .krek-daily-table th:nth-child(6),.krek-daily-table td:nth-child(6){width:145px!important;text-align:center}
      .krek-daily-table th:nth-child(7),.krek-daily-table td:nth-child(7){width:125px!important;text-align:center}
      .krek-daily-table th:nth-child(8),.krek-daily-table td:nth-child(8){width:125px!important;text-align:center}
      .krek-daily-table td:nth-child(2) b{font-size:11.5px!important;font-weight:900!important;color:#163b5d}.krek-daily-table td:nth-child(3){font-size:10.8px!important;font-weight:750!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#18334d}
      .krek-mini{display:inline-flex;align-items:center;justify-content:center;min-width:48px;border-radius:999px;padding:3px 7px;font-size:8px;font-weight:900;line-height:1}.krek-mini.ok{background:#dff4e8;color:#216b46}.krek-mini.no{background:#ffe4e5;color:#a3323b}.krek-mini.na{background:#edf1f4;color:#6b7782}
      .krek-missing{margin-top:6px;background:#fff;border:1px solid #dfe7ef;border-radius:10px;padding:7px 10px}.krek-missing h3{font-size:9.5px;margin:0 0 4px;color:#38566d}.krek-missing-line{font-size:8.5px;line-height:1.35;color:#5e7180}.krek-missing-line b{color:#293f50}
      body.krek-shot-mode #sidebar{display:none!important}body.krek-shot-mode #app-screen>.topbar{display:none!important}body.krek-shot-mode #app-screen>.layout{display:block!important;min-height:100vh!important}body.krek-shot-mode #content{width:100%!important;max-width:none!important;padding:6px 10px!important;min-height:100vh!important}body.krek-shot-mode .krek{max-width:1500px!important}body.krek-shot-mode .krek-filter,body.krek-shot-mode .krek>h1,body.krek-shot-mode .krek>.krek-sub{display:none!important}body.krek-shot-mode #krek-exit-report{padding:6px 10px!important;font-size:9px!important}
      @media(max-width:900px){.krek-summary{grid-template-columns:repeat(2,1fr)}.krek-actions{margin-left:0;width:100%}.krek-daily-table table{min-width:760px!important}}
      .krek-card{background:#fff;border:1px solid #dfe7ef;border-radius:14px;overflow:hidden}.krek-wrap,.krek-modal .krek-wrap{overflow:auto}
      .krek table,.krek-modal table{width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;border:1px solid #d9e2ea}
      .krek table{min-width:1000px}.krek-modal table{min-width:720px}
      .krek-card .krek-wrap{overflow-x:hidden}.krek-card table{width:100%!important;min-width:0!important;table-layout:fixed!important}
      .krek-card th:nth-child(1),.krek-card td:nth-child(1){width:46px;min-width:46px;max-width:46px;text-align:center;padding-left:4px;padding-right:4px}
      .krek-card th:nth-child(2),.krek-card td:nth-child(2){width:86px;min-width:86px;max-width:86px}
      .krek-card th:nth-child(3),.krek-card td:nth-child(3){width:172px}
      .krek-card tbody td{font-size:11px!important;line-height:1.3!important}.krek-card tbody td:nth-child(2) b{font-size:11px!important}.krek-card tbody td:nth-child(3){font-size:11px!important}
      .krek-card th:nth-child(4),.krek-card td:nth-child(4){width:118px}
      .krek-card th:nth-child(5),.krek-card td:nth-child(5){width:118px}
      .krek-card th:nth-child(6),.krek-card td:nth-child(6){width:112px}
      .krek-card th:nth-child(7),.krek-card td:nth-child(7){width:138px}
      .krek-card th:nth-child(8),.krek-card td:nth-child(8){width:104px;text-align:center}.krek-card th:nth-child(9),.krek-card td:nth-child(9){width:66px;text-align:center}
      .krek-card .krek-uks{min-width:0;width:100%}.krek-card .krek-detail{padding:6px 8px;min-width:48px}
      .krek th,.krek td,.krek-modal th,.krek-modal td{border:1px solid #d9e2ea;padding:6px 8px;font-size:10px;line-height:1.35;vertical-align:middle}
      .krek th,.krek-modal th{background:#f5f7fa;color:#44576b;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.02em;text-align:center;white-space:nowrap;position:sticky;top:0;z-index:1}
      .krek td,.krek-modal td{color:#18334d}.krek tbody tr:nth-child(even),.krek-modal tbody tr:nth-child(even){background:#fbfcfd}.krek tbody tr:hover,.krek-modal tbody tr:hover{background:#f3f8fc}
      .krek-modal th:nth-child(1),.krek-modal td:nth-child(1){width:48px;text-align:center}
      .krek-modal th:nth-child(2),.krek-modal td:nth-child(2){width:320px;text-align:left}
      .krek-modal th:nth-child(3),.krek-modal td:nth-child(3),.krek-modal th:nth-child(4),.krek-modal td:nth-child(4),.krek-modal th:nth-child(5),.krek-modal td:nth-child(5){width:118px;text-align:center}
      .krek-modal td:nth-child(2) b{font-size:10.5px;font-weight:700}
      .krek-modal .krek-count{font-size:10px;line-height:1;font-weight:800;min-width:24px;text-align:center}
      .krek-status{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:900;white-space:nowrap}.krek-status.done{background:#def4e8;color:#236d47}.krek-status.pending{background:#ffe6e8;color:#9b2f38}.krek-status.na{background:#edf1f4;color:#6b7782}\n      .krek-uks{min-width:145px}.krek-uks-main{font-size:9px;font-weight:900;color:#274c6c;white-space:nowrap}.krek-uks-time{font-size:8.5px;color:#718294;margin-top:2px}.krek-uks-state{margin-top:5px}
      .krek-detail{border:1px solid #cfdae6;background:#fff;border-radius:8px;padding:6px 9px;font-size:10px;font-weight:800;color:#24557f;cursor:pointer}
      .krek-count,.krek-modal .krek-count{border:0;background:transparent;color:#24557f;font-size:10px;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer;padding:2px 4px}
      .krek-empty,.krek-loading{padding:34px;text-align:center;color:#718294}.krek-error{padding:14px;color:#9b2730;background:#fff0f1;border:1px solid #f2c8cc;border-radius:12px}
      .krek-modal{position:fixed;inset:0;background:rgba(18,37,54,.48);z-index:99999;display:none;align-items:center;justify-content:center;padding:18px}.krek-modal.open{display:flex}
      .krek-box{width:min(900px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.22);font-size:10px;color:#18334d}
      .krek-boxhead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px 18px;border-bottom:1px solid #e5ebf0;position:sticky;top:0;background:#fff;z-index:2}.krek-boxhead h2{font-size:17px;margin:0}.krek-boxhead p{font-size:10px;color:#718294;margin:3px 0 0}.krek-close{border:0;background:#eef3f7;width:32px;height:32px;border-radius:50%;font-size:20px;cursor:pointer}.krek-boxbody{padding:14px 18px 18px}
      .krek-break{display:grid;gap:7px}.krek-breakrow{display:flex;justify-content:space-between;gap:15px;padding:8px 10px;background:#f7f9fc;border-radius:9px;font-size:11px}.krek-breakrow b{font-weight:900}
      @media(max-width:700px){.krek-filter{display:grid;grid-template-columns:1fr 1fr}.krek-btn{grid-column:1/-1}.krek-box{width:100%;max-height:92vh}}

.krek-weekly-table{max-width:1050px;margin:0 auto;overflow:hidden;border:1px solid #dbe4ed;border-radius:10px}
      .krek-weekly-table .krek-wrap{overflow-x:auto}
      .krek-weekly-table table{width:100%!important;min-width:690px!important;table-layout:fixed!important}
      .krek-weekly-table th,.krek-weekly-table td{padding:8px 5px!important;vertical-align:middle!important}
      .krek-weekly-table th:nth-child(1),.krek-weekly-table td:nth-child(1){width:45px!important;text-align:center!important;font-weight:800!important}
      .krek-weekly-table th:nth-child(2),.krek-weekly-table td:nth-child(2){width:108px!important;text-align:center!important;font-weight:800!important}
      .krek-weekly-table th:nth-child(3),.krek-weekly-table td:nth-child(3){width:auto!important;text-align:left!important;font-weight:800!important}
      .krek-weekly-table th:nth-child(n+4),.krek-weekly-table td:nth-child(n+4){width:115px!important;text-align:center!important}
      .krek-weekly-table .krek-weekmark{display:flex;align-items:center;justify-content:center;margin:auto;width:100%;min-height:23px;font-size:16px;font-weight:900;line-height:1}
      .krek-weekmark.ok{color:#168449}.krek-weekmark.missing{color:#bd303a}.krek-weekmark.unknown{color:#738296}
      .krek-weeknote{max-width:1050px;margin:12px auto 0;padding:10px 12px;background:#f7f9fc;border:1px solid #e2e8ef;border-radius:9px;color:#586a7b;font-size:11px}
      body.krek-shot-mode .krek-weekly-report{padding:0 3px}
      body.krek-shot-mode .krek-weekly-table{max-width:1050px}
      @media print{body.krek-shot-mode .krek-weekly-report #krek-exit-weekly{display:none!important}}
    `;
    document.head.appendChild(s);
  }
  function hasPointConfirmation(classId,kind,from,to){
    return (S.data?.point_confirmations||[]).some(z=>
      String(z.class_id)===String(classId)&&z.kind===kind&&
      String(z.date||'').slice(0,10)>=from&&String(z.date||'').slice(0,10)<=to);
  }
  function isoDow(date){const x=new Date(date+'T12:00:00Z').getUTCDay();return x===0?7:x}
  function dateSeq(start,end){
    const out=[];let d=new Date(start+'T00:00:00Z'),z=new Date(end+'T00:00:00Z');
    while(d<=z){out.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1)}
    return out;
  }
  function uksDailyState(row,date){
    if(!(Number(row.grade_level)>=1&&Number(row.grade_level)<=3))return{applicable:false,label:'—',done:null};
    const dow=isoDow(date);
    const slots=(S.uksSchedule||[]).filter(x=>N(x.teacher_name)===N(row.walas)&&Number(x.weekday)===dow);
    if(!slots.length)return{applicable:false,label:'—',done:null};
    const reports=row.uks||[];
    const notes=[];
    const pending=slots.some(slot=>!reports.some(r=>String(r.teacher_id)===String(slot.teacher_id)&&String(r.duty_date||r.date).slice(0,10)===date&&Number(r.shift_no)===Number(slot.shift_no))&&
      !S.uksStatuses.some(r=>String(r.teacher_id)===String(slot.teacher_id)&&r.duty_date===date&&Number(r.shift_no)===Number(slot.shift_no)));
    for(const slot of slots){
      const recorded=S.uksStatuses.find(r=>String(r.teacher_id)===String(slot.teacher_id)&&r.duty_date===date&&Number(r.shift_no)===Number(slot.shift_no));
      if(recorded)notes.push('Shift '+slot.shift_no+' · '+({sakit:'Sakit',izin:'Izin',badal:'Badal — '+recorded.badal_name}[recorded.status]));
    }
    return {applicable:true,done:!pending,notes};
  }
  function classRows(){
    const d=S.data||{},classes=d.classes||[],roster=d.roster||[],att=d.attendance||[],rw=d.rewards||[],vi=d.violations||[],uks=d.uks||[];
    return classes.map(c=>{
      const cid=String(c.id),students=roster.filter(x=>String(x.class_id)===cid),a=att.filter(x=>String(x.class_id)===cid),r=rw.filter(x=>String(x.class_id)===cid),v=vi.filter(x=>String(x.class_id)===cid);
      return{...c,walas:WALAS[cid]||'Belum ditetapkan',students,a,r,v,uks};
    }).sort((a,b)=>Number(a.grade_level)-Number(b.grade_level)||String(a.name).localeCompare(String(b.name),'id',{numeric:true}));
  }
  function dateKey(value){return String(value||'').slice(0,10)}
  function coverageCell(dates,missing,label='Tanggal tidak diisi'){
    if(!dates.length)return '<span class="krek-status na">Tidak ada hari yang dihitung</span>';
    if(!missing.length)return '<span class="krek-status done">Lengkap</span>';
    return '<span class="krek-status pending">Belum lengkap · '+missing.length+' hari</span>'+
      '<div style="margin-top:4px">'+E(label)+': '+E(missing.map(d=>d.split('-').reverse().join('/')).join(', '))+'</div>';
  }
  function pointCoverage(row,kind,days){
    const entries=kind==='discipline'?row.v:row.r;
    const recorded=new Set(entries.map(z=>dateKey(z.incident_date||z.reward_date||z.date)));
    const missing=days.filter(d=>!recorded.has(d)&&!hasPointConfirmation(row.id,kind,d,d));
    return coverageCell(days,missing);
  }
  function attendanceCoverage(row,days){
    const recorded=new Set((S.data.attendance_days||[])
      .filter(z=>String(z.class_id)===String(row.id)).map(z=>dateKey(z.date)));
    return coverageCell(days,days.filter(d=>!recorded.has(d)));
  }
  function uksCoverage(row,days){
    const duties=days.map(date=>({date,...uksDailyState(row,date)})).filter(day=>day.applicable);
    if(!duties.length)return '<span class="krek-status na">Tidak ada jadwal</span>';
    const missing=duties.filter(day=>!day.done).map(day=>day.date);
    const notes=duties.flatMap(day=>day.notes.map(note=>day.date.split('-').reverse().join('/')+' · '+note));
    const summary=!missing.length&&notes.length?'<span class="krek-status na">Ada perubahan piket</span>':coverageCell(duties,missing,'Tanggal laporan piket belum lengkap');
    return summary+notes.map(note=>'<div class="krek-uks-note">'+E(note)+'</div>').join('');
  }
  function timesheetCoverage(row,days){
    const recap=S.timesheet.find(r=>String(r.class_id)===String(row.id)&&r.teacher_id);
    if(!Array.isArray(recap?.complete_days))return '<span class="krek-status na">Data belum tersedia</span>';
    const complete=new Set(recap.complete_days.map(dateKey));
    return coverageCell(days,days.filter(d=>!complete.has(d)),'Tanggal timesheet belum lengkap');
  }
  function wrapImageText(ctx,text,width){
    const lines=[];
    let line='';
    for(const word of text.trim().split(/\s+/)){
      const next=line?line+' '+word:word;
      if(line&&ctx.measureText(next).width>width){
        lines.push(line);
        line=word;
      }else{
        line=next;
      }
    }
    lines.push(line);
    return lines;
  }
  function downloadRecapImage(table,from,to){
    const canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Browser belum dapat membuat gambar.');
    const widths=[42,104,173,134,139,130,130,134];
    const margin=20,lineHeight=19,top=145;
    const width=widths.reduce((sum,value)=>sum+value,2*margin);
    const rows=Array.from(table.rows,(row,index)=>{
      const cells=Array.from(row.cells).slice(0,widths.length).map((cell,column)=>{
        const status=cell.querySelector('.krek-status');
        const pending=status?.classList.contains('pending');
        const done=status?.classList.contains('done');
        const dateText=pending?status.nextElementSibling?.textContent.split(': ').slice(1).join(': '):'';
        const font=index===0||column===1||pending||done?'bold 15px Tahoma, sans-serif':'15px Tahoma, sans-serif';
        ctx.font=font;
        const notes=Array.from(cell.querySelectorAll('.krek-uks-note'),note=>note.textContent);
        const primary=dateText||(notes.length?status.textContent:cell.textContent);
        const lines=[primary,...notes].flatMap(line=>wrapImageText(ctx,line,widths[column]-18));
        return {lines,font,pending,done};
      });
      return {cells,height:Math.max(36,Math.max(...cells.map(cell=>cell.lines.length))*lineHeight+14)};
    });
    const height=rows.reduce((sum,row)=>sum+row.height,top+margin);
    const scale=Math.min(2,8192/Math.max(width,height));
    canvas.width=Math.ceil(width*scale);
    canvas.height=Math.ceil(height*scale);
    ctx.scale(scale,scale);
    ctx.fillStyle='#f4f7fb';
    ctx.fillRect(0,0,width,height);
    ctx.fillStyle='#142d47';
    ctx.fillRect(0,0,width,108);
    ctx.fillStyle='#8bd4cf';
    ctx.fillRect(0,0,6,108);
    ctx.font='bold 14px Tahoma, sans-serif';
    ctx.fillText("SD ISLAM TAHFIZH CAHAYA QUR’AN",margin,28);
    ctx.fillStyle='#fff';
    ctx.font='bold 31px Tahoma, sans-serif';
    ctx.fillText('Rekap Pengisian Data Kesiswaan',margin,63);
    ctx.font='16px Tahoma, sans-serif';
    const formatDate=new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
    ctx.fillText('Periode '+formatDate.format(new Date(from))+' – '+formatDate.format(new Date(to)),margin,90);
    ctx.fillStyle='#9a3420';
    ctx.font='bold 14px Tahoma, sans-serif';
    ctx.fillText('Tanggal berwarna merah menunjukkan isian kosong atau belum lengkap.',margin,132);
    let y=top;
    rows.forEach(({cells,height},index)=>{
      let x=margin;
      cells.forEach(({lines,font,pending,done},column)=>{
        const cellWidth=widths[column];
        ctx.fillStyle=index===0?'#244663':pending?'#fff1e9':index%2?'#fff':'#f1f6fb';
        ctx.fillRect(x,y,cellWidth,height);
        ctx.strokeStyle='#dce6ef';
        ctx.strokeRect(x,y,cellWidth,height);
        ctx.fillStyle=index===0?'#fff':pending?'#9a3420':done?'#176447':'#20384e';
        ctx.font=font;
        const textTop=y+(height-lines.length*lineHeight)/2+15;
        lines.forEach((line,i)=>ctx.fillText(line,x+9,textTop+i*lineHeight));
        x+=cellWidth;
      });
      y+=height;
    });
    return new Promise((resolve,reject)=>canvas.toBlob(blob=>{
      if(!blob){reject(Error('Gambar rekap gagal dibuat.'));return}
      const url=URL.createObjectURL(blob);
      const link=document.createElement('a');
      link.href=url;
      link.download='Rekapan-Kesiswaan_'+from+'_'+to+'.png';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      resolve();
    },'image/png'));
  }
  function renderTable(){
    const body=document.getElementById('krek-body');if(!body)return;
    const rows=classRows();
    const end=S.to<today()?S.to:today();
    const workdays=dateSeq(S.from,end).filter(d=>isoDow(d)<=6);
    const schooldays=workdays.filter(d=>isoDow(d)<=5);
    body.innerHTML=rows.length?`<div class="krek-card"><div style="padding:12px"><b>Periode ${E(S.from)} s.d. ${E(S.to)}</b> <button type="button" class="krek-btn" id="krek-png">Unduh Gambar (PNG)</button><div id="krek-png-error" role="alert"></div></div><div class="krek-wrap"><table><thead><tr><th>No.</th><th>Kelas</th><th>Nama Walas</th><th>Kehadiran</th><th>Kedisiplinan</th><th>Reward</th><th>UKS</th><th>Timesheet</th><th>Detail</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td><b>${E(x.name)}</b></td><td>${E(x.walas)}</td><td>${attendanceCoverage(x,schooldays)}</td><td>${pointCoverage(x,'discipline',schooldays)}</td><td>${pointCoverage(x,'reward',schooldays)}</td><td>${uksCoverage(x,workdays)}</td><td>${timesheetCoverage(x,workdays)}</td><td><button class="krek-detail" data-class="${E(x.id)}">Lihat</button></td></tr>`).join('')}</tbody></table></div></div>`:'<div class="krek-empty">Belum ada data kelas.</div>';
    const download=body.querySelector('#krek-png');
    const {from,to}=S;
    download?.addEventListener('click',async()=>{
      download.disabled=true;
      const error=body.querySelector('#krek-png-error');
      error.textContent='';
      try{await downloadRecapImage(body.querySelector('table'),from,to)}
      catch(e){error.textContent=e.message||'Gambar rekap gagal dibuat.'}
      finally{download.disabled=false}
    });
    body.querySelectorAll('.krek-detail').forEach(btn=>btn.addEventListener('click',()=>openDetail(btn.dataset.class||'')));
  }
  function countsBy(arr,key,labeler){
    const out={};
    arr.filter(x=>String(x.student_id)===String(key)).forEach(x=>{const k=labeler(x)||'Lainnya';out[k]=(out[k]||0)+1});
    return Object.entries(out).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]),'id'));
  }
  function attLabel(x){const s=String(x.status||'').toLowerCase();if(/hadir|present/.test(s))return'Hadir';if(/sakit|sick/.test(s))return'Sakit';if(/izin|excused/.test(s))return'Izin';if(/alpha|alpa|unexcused|tanpa/.test(s))return'Alfa';return x.status||'Lainnya'}
  function openDetail(classId){
    const row=classRows().find(x=>String(x.id)===String(classId));if(!row)return;
    S.selected=row;
    const modal=document.getElementById('krek-modal'),title=document.getElementById('krek-modal-title'),sub=document.getElementById('krek-modal-sub'),box=document.getElementById('krek-modal-body');
    title.textContent='Detail '+row.name;sub.textContent=row.walas+' · '+S.from+' s.d. '+S.to;
    box.innerHTML=`<div class="krek-wrap"><table><thead><tr><th>No</th><th>Nama Siswa</th><th>Kehadiran</th><th>Kedisiplinan</th><th>Reward</th></tr></thead><tbody>${row.students.map((s,i)=>{
      const a=row.a.filter(x=>String(x.student_id)===String(s.student_id)),v=row.v.filter(x=>String(x.student_id)===String(s.student_id)),r=row.r.filter(x=>String(x.student_id)===String(s.student_id));
      return`<tr><td>${i+1}</td><td><b>${E(s.student_name)}</b></td><td><button class="krek-count" data-kind="attendance" data-student="${E(s.student_id)}">${a.length}</button></td><td><button class="krek-count" data-kind="discipline" data-student="${E(s.student_id)}">${v.length}</button></td><td><button class="krek-count" data-kind="reward" data-student="${E(s.student_id)}">${r.length}</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
    box.querySelectorAll('.krek-count').forEach(b=>b.addEventListener('click',()=>openBreakdown(b.dataset.student||'',b.dataset.kind||'')));
    modal.classList.add('open');
  }
  function openBreakdown(studentId,kind){
    const row=S.selected;if(!row)return;
    const st=row.students.find(x=>String(x.student_id)===String(studentId));if(!st)return;
    let items=[],label='';
    if(kind==='attendance'){label='Kehadiran';items=countsBy(row.a,studentId,attLabel)}
    if(kind==='discipline'){label='Kedisiplinan';items=countsBy(row.v,studentId,x=>x.violation_name||x.category||'Pelanggaran')}
    if(kind==='reward'){label='Reward';items=countsBy(row.r,studentId,x=>x.reward_name||x.category||'Reward')}
    const body=document.getElementById('krek-modal-body');
    body.innerHTML=`<button type="button" class="krek-detail" id="krek-back" style="margin-bottom:12px">← Kembali</button><h3 style="margin:0 0 4px;font-size:15px">${E(st.student_name)}</h3><div style="font-size:11px;color:#718294;margin-bottom:12px">${E(label)} · ${E(row.name)}</div><div class="krek-break">${items.length?items.map(([n,c])=>`<div class="krek-breakrow"><span>${E(n)}</span><b>${c}</b></div>`).join(''):'<div class="krek-empty">Tidak ada data pada periode ini.</div>'}</div>`;
    document.getElementById('krek-back')?.addEventListener('click',()=>openDetail(row.id));
  }
  function ensureModal(){
    if(document.getElementById('krek-modal'))return;
    const m=document.createElement('div');m.id='krek-modal';m.className='krek-modal';m.innerHTML=`<div class="krek-box"><div class="krek-boxhead"><div><h2 id="krek-modal-title">Detail</h2><p id="krek-modal-sub"></p></div><button type="button" class="krek-close" aria-label="Tutup">×</button></div><div class="krek-boxbody" id="krek-modal-body"></div></div>`;
    document.body.appendChild(m);m.querySelector('.krek-close').addEventListener('click',()=>m.classList.remove('open'));m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});
  }
  async function load(){
    const body=document.getElementById('krek-body');if(!body)return;
    const loadId=++S.loadId;
    body.innerHTML='<div class="krek-loading">Memuat rekapan Kesiswaan…</div>';
    try{
      const range={start_date:S.from,end_date:S.to};
      const [report,schedule,timesheet]=await Promise.all([
        post({action:'report',...range}),
        postUks({action:'schedule',...range}),
        post({action:'timesheet_recap',...range})
      ]);
      if(loadId!==S.loadId)return;
      S.data=report;
      S.uksSchedule=schedule.schedule||[];
      S.uksStatuses=schedule.duty_statuses||[];
      S.timesheet=timesheet.rows||[];
      renderTable();
    }catch(e){
      if(loadId!==S.loadId)return;
      body.innerHTML='<div class="krek-error"><b>Rekapan belum dapat dimuat.</b><br>'+E(e.message||'Gagal memuat data.')+'</div>';
    }
  }
  function render(content){
    if(!isKesiswaan()){content.innerHTML='<div class="krek-error">Menu ini khusus Kabid Kesiswaan.</div>';return}
    css();ensureModal();const t=today();if(!S.to){S.to=t;S.from=t.slice(0,8)+'01'}
    content.innerHTML=`<div class="krek"><h1>REKAPAN</h1><div class="krek-sub">Pilih rentang tanggal untuk melihat kelengkapan setiap tugas. Kehadiran, Kedisiplinan, dan Reward dihitung Senin–Jumat. Timesheet dihitung Senin–Sabtu. UKS mengikuti jadwal petugas kelas 1–3. Tanggal mendatang tidak dihitung.</div><div class="krek-filter"><div class="krek-field"><label>Dari tanggal</label><input id="krek-from" type="date" value="${E(S.from)}"></div><div class="krek-field"><label>Sampai tanggal</label><input id="krek-to" type="date" value="${E(S.to)}"></div><button type="button" class="krek-btn" id="krek-apply">Tampilkan</button></div><div id="krek-body"></div></div>`;
    document.getElementById('krek-apply').addEventListener('click',()=>{const f=document.getElementById('krek-from').value,t2=document.getElementById('krek-to').value;if(!f||!t2||f>t2){S.loadId++;document.getElementById('krek-body').innerHTML='<div class="krek-error">Rentang tanggal tidak valid.</div>';return}S.from=f;S.to=t2;load()});
    load();
  }
  window.renderKesiswaanRekapan=render;
  })();