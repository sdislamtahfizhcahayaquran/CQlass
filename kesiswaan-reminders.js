/* CQlass — Pusat Pengingat Kabid Kesiswaan
   Satu halaman untuk semua hal yang perlu ditindaklanjuti, dihitung otomatis dari data live:
   1) tidak masuk 3 hari berturut-turut, 2) tahap panggilan walas (>=50 poin),
   3) tahap panggilan Kesiswaan (>=100 poin / pelanggaran berat), 4) surat keterlambatan
   yang sudah memenuhi ambang, 5) laporan walas & SALAM CQ yang belum selesai.
   Khusus role Kesiswaan; tidak mengubah role lain. */
(function(){
'use strict';
if(window.__cqKesReminders)return;window.__cqKesReminders=true;

const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
const SAC=BASE+'/functions/v1/student-affairs-center';
const RPC=BASE+'/rest/v1/rpc/';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const S={data:null,tab:'',q:'',cls:'',showDone:false,loading:null,loadedAt:0,open:''};

/* ---------- ikon SVG (garis, mengikuti gaya admin) ---------- */
const P={
  bell:'<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
  dashboard:'<path d="M4 13h7V4H4zM13 20h7v-9h-7zM4 20h7v-5H4zM13 9h7V4h-7z"/>',
  calx:'<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M7 3v4M17 3v4M3.5 9.5h17M9.5 13l5 5M14.5 13l-5 5"/>',
  userCheck:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="m16 11 2 2 4-4"/>',
  shield:'<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6l-8-3Z"/><path d="M12 8v4.5M12 16h.01"/>',
  mailClock:'<path d="M20 11V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h7"/><path d="m3 7 8.5 6L20 7"/><circle cx="18" cy="17" r="4"/><path d="M18 15.3V17l1.2 1"/>',
  clipboard:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M9 10h6M9 14h6M9 18h3"/>',
  chat:'<path d="M20 15a2 2 0 0 1-2 2H8l-5 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2Z"/><path d="M8 9h8M8 13h5"/>',
  check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  undo:'<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  refresh:'<path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M6.1 9a7 7 0 0 1 11.5-2L20 9M4 15l2.4 2A7 7 0 0 0 18 15"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  heart:'<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
  users:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><path d="M16 4.5a3 3 0 0 1 0 6M17.5 14.5A6 6 0 0 1 21 20"/>',
  grid:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  heartHand:'<path d="M11 14h2a2 2 0 0 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/><path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.8-2.8L14.5 13"/>',
  door:'<path d="M4 21h16M6 21V4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v17"/><path d="M13 12h.01M16 7h4v14"/>',
  idCard:'<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="11" r="2.2"/><path d="M5.5 16a3.5 3.5 0 0 1 7 0M15 10h3M15 13.5h3"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  flag:'<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 21h7M10 17h4l.5 4h-5l.5-4Z"/>',
  report:'<path d="M6 2h8l4 4v16H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z"/><path d="M14 2v5h5M8 13h3M8 17h6M14 13l2-2 2 2"/>',
  alertList:'<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 5v2M4 11v2M4 17v2"/>',
  table:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
  monitor:'<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4M7 11l2.5-2.5 2.5 2 4-4"/>',
  eye:'<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  megaphone:'<path d="M3 11v3a1 1 0 0 0 1 1h3l6 4V6L7 10H4a1 1 0 0 0-1 1Z"/><path d="M17 9a4 4 0 0 1 0 6M7 15l1.5 5"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  chartBar:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6Z"/>',
};
const icon=(n,size=18)=>`<svg class="cqk-i" viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[n]||P.bell}</svg>`;
window.cqKesIcon=icon;

const TABS=[
  {id:'absent',label:'Tidak masuk 3 hari',sub:'Sakit/Izin/Alfa berturut-turut',icon:'calx',tone:'red'},
  {id:'walas_call',label:'Dipanggil walas',sub:'Tahap 50–99 poin',icon:'userCheck',tone:'amber'},
  {id:'kesiswaan_call',label:'Dipanggil Kesiswaan',sub:'≥100 poin / pelanggaran berat',icon:'shield',tone:'red'},
  {id:'late',label:'Surat keterlambatan',sub:'Sudah memenuhi ambang',icon:'mailClock',tone:'orange'},
  {id:'walas_reports',label:'Laporan walas',sub:'Catatan pendampingan siswa',icon:'clipboard',tone:'blue'},
  {id:'salam',label:'SALAM CQ',sub:'Pesan orang tua belum selesai',icon:'chat',tone:'teal'},
];

function role(){try{return String(currentUser?.role||currentUser?.primary_role||currentUser?.role_code||JSON.parse(localStorage.getItem('cqlass_user')||'{}').role||'').trim().toLowerCase().replace(/[\s-]+/g,'_')}catch(_){return''}}
const isKes=()=>['kesiswaan','kabid_kesiswaan'].includes(role());
function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}}
const ERR={forbidden:'Khusus Kabid Kesiswaan.',active_period_missing:'Tahun ajaran / semester aktif belum diatur Admin.',unauthorized:'Sesi login berakhir. Silakan login kembali.',invalid_reminder_key:'Pengingat tidak valid. Muat ulang halaman.'};
async function call(url,body){
  const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
  const r=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:key,Authorization:'Bearer '+key,'x-session-token':token()},body:JSON.stringify(body)});
  let d={};try{d=await r.json()}catch(_){}
  if(!r.ok||d?.success===false){const code=d?.error||d?.message||'';throw Error(ERR[code]||d?.message||code||'Gagal memuat pengingat.')}
  return d;
}
/* Pengingat dihitung oleh fungsi database (RPC) dengan token sesi CQlass; SALAM tetap lewat student-affairs-center. */
function post(body){
  if(body.action==='reminders')return call(RPC+'kesiswaan_reminders',{p_token:token()});
  if(body.action==='reminder_ack')return call(RPC+'kesiswaan_reminder_ack',{p_token:token(),p_key:body.key,p_note:body.note||null,p_undo:!!body.undo});
  return call(SAC,body);
}
async function load(force){
  if(!force&&S.data&&Date.now()-S.loadedAt<120000)return S.data;
  if(S.loading)return S.loading;
  S.loading=post({action:'reminders'}).then(d=>{S.data=d;S.loadedAt=Date.now();updateBadges();return d}).finally(()=>{S.loading=null});
  return S.loading;
}
window.cqKesReminderLoad=load;
window.cqKesUpdateBadges=()=>updateBadges();

function openCount(id){const d=S.data;if(!d)return 0;return Number(d.counts?.[id]||0)}
function totalOpen(){return TABS.reduce((n,t)=>n+openCount(t.id),0)}
function updateBadges(){
  const total=totalOpen();
  document.querySelectorAll('[data-cqk-badge]').forEach(el=>{el.textContent=total>99?'99+':String(total);el.hidden=!total});
}

/* ---------- CSS ---------- */
function css(){
  if(document.getElementById('cqk-css'))return;
  const s=document.createElement('style');s.id='cqk-css';
  s.textContent=`
.cqk-i{flex:none;display:inline-block;vertical-align:middle}
.cqk{max-width:1240px;margin:0 auto;color:#16343a;font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif}
.cqk *{box-sizing:border-box}
.cqk-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.cqk-head h1{margin:0;font-size:23px;display:flex;align-items:center;gap:10px}
.cqk-head h1 .cqk-hico{width:38px;height:38px;border-radius:11px;background:#e6f4f1;color:#0a6e6e;display:grid;place-items:center}
.cqk-head p{margin:6px 0 0;color:#5f7a79;font-size:13px}
.cqk-btn{border:1px solid #cfe2df;background:#fff;color:#0a6e6e;border-radius:10px;padding:8px 13px;font:700 12.5px/1 inherit;display:inline-flex;align-items:center;gap:7px;cursor:pointer;white-space:nowrap}
.cqk-btn:hover{background:#eef8f6}.cqk-btn:disabled{opacity:.55;cursor:wait}
.cqk-btn.primary{background:#0a6e6e;border-color:#0a6e6e;color:#fff}.cqk-btn.primary:hover{background:#085c5c}
.cqk-btn.ghost{border-color:transparent;background:transparent;color:#5f7a79}
.cqk-cards{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:10px;margin-bottom:14px}
@media(max-width:1100px){.cqk-cards{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:560px){.cqk-cards{grid-template-columns:repeat(2,minmax(0,1fr))}}
.cqk-card{text-align:left;border:1px solid #dfeae8;background:#fff;border-radius:14px;padding:12px;cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:box-shadow .15s,border-color .15s;font:inherit;color:inherit}
.cqk-card:hover{box-shadow:0 6px 16px rgba(16,60,60,.08)}
.cqk-card.active{border-color:#0a6e6e;box-shadow:0 0 0 2px rgba(10,110,110,.15)}
.cqk-card .ico{width:34px;height:34px;border-radius:10px;display:grid;place-items:center}
.cqk-card b{font-size:24px;line-height:1}.cqk-card span{font-size:12.5px;font-weight:700}.cqk-card small{font-size:11px;color:#6b8584;line-height:1.3}
.tone-red .ico{background:#fdecec;color:#c0392b}.tone-amber .ico{background:#fff5df;color:#b7791f}.tone-orange .ico{background:#fff0e5;color:#c25e12}
.tone-blue .ico{background:#e9f1fd;color:#2563a8}.tone-teal .ico{background:#e4f4f1;color:#0a6e6e}
.cqk-card.zero b{color:#9db1af}
.cqk-panel{background:#fff;border:1px solid #dfeae8;border-radius:14px;overflow:hidden}
.cqk-ph{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:13px 14px;border-bottom:1px solid #edf3f2}
.cqk-ph h2{margin:0;font-size:16px;display:flex;align-items:center;gap:8px}
.cqk-ph .rule{font-size:12px;color:#5f7a79;margin-top:3px}
.cqk-tools{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.cqk-search{display:flex;align-items:center;gap:6px;border:1px solid #d6e4e2;border-radius:10px;padding:0 10px;background:#fbfdfd;color:#7a918f}
.cqk-search input{border:0;background:transparent;outline:0;padding:8px 0;font:inherit;font-size:13px;width:170px;color:#16343a}
.cqk-sel{border:1px solid #d6e4e2;border-radius:10px;padding:8px 10px;font:inherit;font-size:13px;background:#fbfdfd;color:#16343a}
.cqk-list{display:flex;flex-direction:column}
.cqk-row{display:grid;grid-template-columns:38px minmax(0,1fr) auto;gap:12px;padding:12px 14px;border-bottom:1px solid #f0f5f4;align-items:start}
.cqk-row:last-child{border-bottom:0}.cqk-row.done{background:#fafcfc}.cqk-row.done .cqk-name{color:#6b8584}
.cqk-av{width:38px;height:38px;border-radius:50%;background:#e8f2f1;color:#0a6e6e;display:grid;place-items:center;font-weight:800;font-size:13px}
.cqk-row.urgent .cqk-av{background:#fdecec;color:#c0392b}
.cqk-name{font-weight:800;font-size:14px}.cqk-meta{font-size:12px;color:#5f7a79;margin-top:2px}
.cqk-detail{font-size:12.5px;color:#26474a;margin-top:6px;line-height:1.45}
.cqk-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px}
.cqk-chip{display:inline-flex;align-items:center;gap:4px;border-radius:999px;padding:3px 9px;font-size:11.5px;font-weight:700;background:#eef4f3;color:#35585a}
.cqk-chip.red{background:#fdecec;color:#b03a2e}.cqk-chip.amber{background:#fff5df;color:#94610f}.cqk-chip.blue{background:#e9f1fd;color:#245b98}.cqk-chip.green{background:#e3f5ea;color:#1e7a46}.cqk-chip.gray{background:#f0f2f2;color:#5f6f6e}
.cqk-act{display:flex;flex-direction:column;gap:6px;align-items:flex-end}
.cqk-ackform{grid-column:2/4;display:flex;gap:8px;flex-wrap:wrap;align-items:center;background:#f4faf9;border:1px solid #dcebe8;border-radius:10px;padding:9px}
.cqk-ackform input{flex:1;min-width:200px;border:1px solid #cfe2df;border-radius:8px;padding:8px 10px;font:inherit;font-size:13px}
.cqk-quick{display:flex;gap:5px;flex-wrap:wrap}.cqk-quick button{border:1px solid #cfe2df;background:#fff;border-radius:999px;padding:4px 10px;font:600 11.5px inherit;color:#35585a;cursor:pointer}.cqk-quick button:hover{border-color:#0a6e6e;color:#0a6e6e}
.cqk-empty{padding:34px 16px;text-align:center;color:#6b8584;font-size:13.5px}
.cqk-empty .cqk-i{color:#1e7a46;margin-bottom:6px}
.cqk-foot{padding:10px 14px;border-top:1px solid #edf3f2;display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px;color:#6b8584}
.cqk-err{padding:16px;border:1px solid #f3cfcb;background:#fdf3f2;color:#9b2c22;border-radius:12px}
@media(max-width:640px){.cqk-row{grid-template-columns:32px minmax(0,1fr)}.cqk-act{grid-column:2/3;flex-direction:row;flex-wrap:wrap;align-items:center}.cqk-av{width:32px;height:32px}.cqk-ackform{grid-column:1/3}.cqk-search input{width:120px}}
/* strip ringkas di dashboard */
.cqk-strip{max-width:1240px;margin:0 auto 14px;background:#fff;border:1px solid #dfeae8;border-radius:14px;padding:12px 14px;font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif;color:#16343a}
.cqk-strip-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
.cqk-strip-h b{display:flex;align-items:center;gap:8px;font-size:14.5px}
.cqk-strip-g{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:8px}
@media(max-width:900px){.cqk-strip-g{grid-template-columns:repeat(3,minmax(0,1fr))}}
.cqk-strip-i{border:1px solid #edf3f2;border-radius:11px;padding:9px;display:flex;gap:9px;align-items:center;cursor:pointer;background:#fbfdfd;text-align:left;font:inherit;color:inherit}
.cqk-strip-i:hover{border-color:#0a6e6e}.cqk-strip-i .ico{width:30px;height:30px;border-radius:9px;display:grid;place-items:center}
.cqk-strip-i b{display:block;font-size:18px;line-height:1}.cqk-strip-i small{display:block;font-size:11px;color:#5f7a79;margin-top:3px;line-height:1.2}
/* sidebar Kesiswaan bergaya admin */
#sidebar .cqk-side{padding:14px 12px 24px;display:flex;flex-direction:column;gap:2px;font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif}
#sidebar .cqk-nav{width:100%;min-height:40px;border:0;border-radius:11px;background:transparent;color:#2c4a48;padding:0 12px;display:flex;align-items:center;gap:11px;font:600 13.5px/1.2 inherit;text-align:left;cursor:pointer;transition:background .12s,color .12s}
#sidebar .cqk-nav:hover{background:#eaf5f3;color:#0b5e5a}
#sidebar .cqk-nav.active{background:#0a6e6e;color:#fff;box-shadow:0 6px 14px rgba(10,110,110,.2)}
#sidebar .cqk-nav span{flex:1;min-width:0;padding:9px 0;line-height:1.25}
#sidebar .cqk-nav .cqk-i{opacity:.9}
#sidebar .cqk-nav .cqk-badge{flex:none;min-width:22px;height:20px;padding:0 6px;border-radius:999px;background:#c0392b;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center}
#sidebar .cqk-nav.active .cqk-badge{background:#fff;color:#c0392b}
#sidebar .cqk-nav .cqk-badge[hidden]{display:none}
#sidebar .cqk-sec{margin:14px 12px 4px;font-size:10px;font-weight:800;letter-spacing:.11em;color:#7a918f;text-transform:uppercase}
#sidebar .cqk-more{width:100%;margin:14px 0 2px;border:0;background:transparent;display:flex;align-items:center;gap:8px;padding:6px 12px;cursor:pointer;text-align:left;font:inherit;color:#7a918f}
#sidebar .cqk-more span{font-size:10px;font-weight:800;letter-spacing:.11em;text-transform:uppercase}
#sidebar .cqk-more small{flex:1;min-width:0;font-size:10.5px;color:#9aaeac;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#sidebar .cqk-more .cqk-i{transition:transform .15s}#sidebar .cqk-more.open .cqk-i{transform:rotate(180deg)}
`;
  document.head.appendChild(s);
}
window.cqKesReminderCss=css;

/* ---------- helpers ---------- */
const initials=n=>String(n||'?').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'?';
const fmtDate=v=>{if(!v)return'-';try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',timeZone:'Asia/Jakarta'}).format(new Date(String(v).length===10?v+'T12:00:00+07:00':v))}catch(_){return String(v).slice(0,10)}};
const chip=(t,c='')=>`<span class="cqk-chip ${c}">${t}</span>`;
function goto(id){if(typeof setActiveModule==='function')setActiveModule(id)}

function itemsFor(tab){
  const list=(S.data?.[tab]||[]);
  const q=S.q.trim().toLowerCase();
  return list.filter(x=>{
    if(!S.showDone&&x.acked)return false;
    if(S.cls&&x.class_name!==S.cls)return false;
    if(q&&![x.student_name,x.class_name,x.walas,x.problem,x.topic,x.message,x.ticket_code,x.reporter].join(' ').toLowerCase().includes(q))return false;
    return true;
  });
}

const QUICK={
  absent:['Orang tua sudah dihubungi','Sakit, ada surat dokter','Izin keluarga, sudah konfirmasi'],
  walas_call:['Walas sudah memanggil siswa','Orang tua sudah di-WA walas','Sudah dicatat walas'],
  kesiswaan_call:['Siswa sudah dipanggil','Orang tua sudah dipanggil','Dijadwalkan pertemuan'],
  walas_reports:['Sudah dibaca','Dipantau','Sudah dibahas dengan walas'],
};

function rowAbsent(x){
  const st=x.statuses||{};
  const parts=Object.entries(st).map(([k,n])=>chip(`${E(k)} ${n}`,k==='Alfa'?'red':k==='Sakit'?'blue':'amber')).join('');
  return {urgent:x.ongoing,detail:`<b>${x.days} hari sekolah berturut-turut</b> (${fmtDate(x.start_date)} – ${fmtDate(x.end_date)})`,
    chips:(x.ongoing?chip(icon('alertList',12)+' Masih belum masuk','red'):chip('Sudah masuk kembali','green'))+parts};
}
function rowPoints(x,kind){
  const nx=x.next_points?`Tahap berikutnya di ${x.next_points} poin`:'';
  return {urgent:!!x.urgent,detail:`${x.stage?`<b>${E(x.stage)}</b>`:`<b>${E(x.reason)}</b>`}${x.action?`<br>${E(x.action)}`:''}`,
    chips:chip(`${x.balance} poin`,x.balance>=100?'red':'amber')+(x.urgent?chip(E(x.reason),'red'):'')+(x.last_heavy?chip(`Terakhir: ${E(x.last_heavy.name)} · ${fmtDate(x.last_heavy.date)}`,'gray'):'')+(nx?chip(nx,'gray'):'')+(kind==='walas_call'&&x.walas?chip('Walas: '+E(x.walas),'blue'):'')};
}
function rowLate(x){
  return {urgent:x.late_count>=15,detail:`<b>${x.late_count} kali terlambat</b> semester ini${x.last_late?` · terakhir ${fmtDate(x.last_late)}`:''}`,
    chips:x.due.map(d=>chip('Perlu: '+E(d.label),d.kind==='sp1'?'amber':'red')).join('')+Object.keys(x.issued||{}).map(k=>chip(`Sudah terbit: ${k.toUpperCase()}`,'green')).join('')};
}
function rowReport(x){
  return {urgent:x.urgent||x.forwarded,detail:`${x.problem?E(x.problem):'<i>Tanpa ringkasan</i>'}`,
    chips:(x.forwarded?chip('Diteruskan ke Kesiswaan','red'):chip(E(x.status||'Baru'),'gray'))+(x.attention?chip(E(x.attention),'amber'):'')+(x.needs_parent?chip('Perlu orang tua','amber'):'')+(x.needs_uks?chip('Perlu UKS','blue'):'')+(x.reporter?chip('Dari: '+E(x.reporter),'blue'):'')+chip(fmtDate(x.date||x.created_at),'gray')};
}
function rowSalam(x){
  const st={diterima:['Belum diproses','red'],diproses:['Sedang diproses','amber'],butuh_koordinasi:['Butuh koordinasi','amber']}[x.status]||[x.status,'gray'];
  return {urgent:x.status==='diterima',name:x.student_name||'Orang tua / umum',meta:`${E(x.ticket_code||'')} · ${E(x.class_name||'-')}`,
    detail:`<b>${E(x.message_type||'Pesan')}${x.topic?' · '+E(x.topic):''}</b><br>${E(String(x.message||'').slice(0,220))}${String(x.message||'').length>220?'…':''}`,
    chips:chip(st[0],st[1])+(x.pic?chip('PIC: '+E(x.pic),'blue'):'')+chip(fmtDate(x.created_at),'gray')};
}

function actions(tab,x){
  const k=E(x.key);
  if(tab==='late')return `<button class="cqk-btn primary" data-goto="kes-rekap-keterlambatan">${icon('mailClock',15)} Terbitkan surat</button>`;
  if(tab==='salam'){
    const b=[];if(x.status==='diterima')b.push(`<button class="cqk-btn" data-salam="${E(x.id)}" data-st="diproses">${icon('clock',15)} Proses</button>`);
    b.push(`<button class="cqk-btn primary" data-salam="${E(x.id)}" data-st="selesai">${icon('check',15)} Selesai</button>`);
    b.push(`<button class="cqk-btn ghost" data-goto="kes-salam-cq">${icon('arrow',14)} Buka</button>`);return b.join('');
  }
  const out=[];
  if(tab==='walas_reports')out.push(`<button class="cqk-btn ghost" data-goto="kes-pendampingan">${icon('arrow',14)} Buka Pendampingan</button>`);
  if(tab==='walas_reports'&&x.forwarded)return out.join('');
  if(x.acked)out.unshift(`<button class="cqk-btn ghost" data-undo="${k}">${icon('undo',14)} Batalkan</button>`);
  else out.unshift(`<button class="cqk-btn primary" data-ack="${k}">${icon('check',15)} ${tab==='walas_reports'?'Tandai dibaca':'Sudah ditangani'}</button>`);
  return out.join('');
}

function rowHtml(tab,x){
  const r=tab==='absent'?rowAbsent(x):tab==='late'?rowLate(x):tab==='walas_reports'?rowReport(x):tab==='salam'?rowSalam(x):rowPoints(x,tab);
  const name=r.name||x.student_name, meta=r.meta||`${E(x.class_name)}${x.walas?' · Walas '+E(x.walas):''}${x.nis?' · NIS '+E(x.nis):''}`;
  const done=x.acked?`<div class="cqk-chips">${chip(icon('check',12)+' Ditangani '+fmtDate(x.acked_at)+(x.ack_note?' · '+E(x.ack_note):''),'green')}</div>`:'';
  const form=S.open===x.key?`<div class="cqk-ackform"><input id="cqk-note" maxlength="300" placeholder="Catatan singkat (boleh dikosongkan)"><div class="cqk-quick">${(QUICK[tab]||[]).map(q=>`<button type="button" data-q="${E(q)}">${E(q)}</button>`).join('')}</div><button class="cqk-btn primary" data-save="${E(x.key)}">${icon('check',15)} Simpan</button><button class="cqk-btn ghost" data-cancel="1">Batal</button></div>`:'';
  return `<div class="cqk-row${r.urgent?' urgent':''}${x.acked?' done':''}"><div class="cqk-av">${E(initials(name))}</div><div><div class="cqk-name">${E(name)}</div><div class="cqk-meta">${meta}</div><div class="cqk-detail">${r.detail}</div><div class="cqk-chips">${r.chips}</div>${done}</div><div class="cqk-act">${actions(tab,x)}</div>${form}</div>`;
}

function ruleText(tab){
  const r=S.data?.rules||{};
  return {absent:`Tidak hadir Morning Talk (Sakit/Izin/Alfa) ${r.absent_days||3} hari sekolah berturut-turut dalam 2 pekan terakhir. Terlambat dihitung hadir.`,
    walas_call:`Saldo poin ${r.walas_points||50}–${(r.kesiswaan_points||100)-1}: Proses 1 oleh wali kelas. Pastikan walas sudah memanggil siswa / menghubungi orang tua.`,
    kesiswaan_call:`Saldo poin ≥ ${r.kesiswaan_points||100}, atau ada pelanggaran berat/DO (langsung tahap Kesiswaan). Muncul lagi otomatis saat naik ke tahap berikutnya.`,
    late:`Ambang per semester: ${(r.late_letters||[]).map(x=>`${x.label} ${x.min}x`).join(' · ')}. Hilang otomatis setelah suratnya diterbitkan.`,
    walas_reports:'Catatan pendampingan dari walas yang belum selesai ditindaklanjuti. Yang diteruskan ke Kesiswaan selesai dari menu Pendampingan Siswa.',
    salam:'Pesan SALAM CQ dari orang tua yang statusnya belum selesai.'}[tab]||'';
}

function draw(content){
  const d=S.data;if(!d)return;
  if(!S.tab)S.tab=TABS.find(t=>openCount(t.id))?.id||'absent';
  const t=TABS.find(x=>x.id===S.tab);
  const all=d[S.tab]||[],doneN=all.filter(x=>x.acked).length,items=itemsFor(S.tab);
  const classes=[...new Set(all.map(x=>x.class_name).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id',{numeric:true}));
  if(S.cls&&!classes.includes(S.cls))S.cls='';
  const when=new Intl.DateTimeFormat('id-ID',{dateStyle:'full',timeZone:'Asia/Jakarta'}).format(new Date());
  content.innerHTML=`<div class="cqk">
  <div class="cqk-head"><div><h1><span class="cqk-hico">${icon('bell',20)}</span>Pengingat Kesiswaan</h1><p>${E(when)} · Tahun ajaran ${E(d.period?.year||'')} semester ${E(d.period?.semester_no||'')} · dihitung otomatis dari data CQlass</p></div>
  <button class="cqk-btn" id="cqk-refresh">${icon('refresh',15)} Muat ulang</button></div>
  <div class="cqk-cards">${TABS.map(x=>{const n=openCount(x.id);return `<button type="button" class="cqk-card tone-${x.tone}${x.id===S.tab?' active':''}${n?'':' zero'}" data-tab="${x.id}"><div class="ico">${icon(x.icon,18)}</div><b>${n}</b><span>${E(x.label)}</span><small>${E(x.sub)}</small></button>`}).join('')}</div>
  <section class="cqk-panel"><div class="cqk-ph"><div><h2>${icon(t.icon,18)} ${E(t.label)}</h2><div class="rule">${E(ruleText(S.tab))}</div></div>
   <div class="cqk-tools"><label class="cqk-search">${icon('search',15)}<input id="cqk-q" placeholder="Cari nama / kelas" value="${E(S.q)}"></label>
   <select class="cqk-sel" id="cqk-cls"><option value="">Semua kelas</option>${classes.map(c=>`<option ${c===S.cls?'selected':''}>${E(c)}</option>`).join('')}</select></div></div>
   <div class="cqk-list">${items.length?items.map(x=>rowHtml(S.tab,x)).join(''):`<div class="cqk-empty">${icon('check',26)}<div>${S.q||S.cls?'Tidak ada yang cocok dengan pencarian.':'Tidak ada yang perlu ditindaklanjuti di sini.'}</div></div>`}</div>
   ${['absent','walas_call','kesiswaan_call','walas_reports'].includes(S.tab)?`<div class="cqk-foot"><span>${items.length} ditampilkan${doneN?` · ${doneN} sudah ditangani`:''}</span>${doneN?`<button class="cqk-btn ghost" id="cqk-done">${icon('eye',14)} ${S.showDone?'Sembunyikan':'Tampilkan'} yang sudah ditangani</button>`:''}</div>`:`<div class="cqk-foot"><span>${items.length} ditampilkan</span></div>`}
  </section></div>`;
  bind(content);
}

function bind(content){
  content.querySelector('#cqk-refresh').onclick=async e=>{e.currentTarget.disabled=true;try{await load(true)}catch(err){toast(err.message,true)}draw(content)};
  content.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;S.open='';S.q='';S.cls='';draw(content)});
  const q=content.querySelector('#cqk-q');q.oninput=()=>{S.q=q.value;const pos=q.selectionStart;draw(content);const n=content.querySelector('#cqk-q');n.focus();n.setSelectionRange(pos,pos)};
  content.querySelector('#cqk-cls').onchange=e=>{S.cls=e.target.value;draw(content)};
  const done=content.querySelector('#cqk-done');if(done)done.onclick=()=>{S.showDone=!S.showDone;draw(content)};
  content.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>goto(b.dataset.goto));
  content.querySelectorAll('[data-ack]').forEach(b=>b.onclick=()=>{S.open=b.dataset.ack;draw(content);content.querySelector('#cqk-note')?.focus()});
  content.querySelectorAll('[data-cancel]').forEach(b=>b.onclick=()=>{S.open='';draw(content)});
  content.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{const n=content.querySelector('#cqk-note');n.value=b.dataset.q;n.focus()});
  content.querySelectorAll('[data-save]').forEach(b=>b.onclick=()=>ack(content,b,b.dataset.save,false,content.querySelector('#cqk-note')?.value||''));
  const note=content.querySelector('#cqk-note');if(note)note.onkeydown=e=>{if(e.key==='Enter')content.querySelector('[data-save]')?.click();if(e.key==='Escape'){S.open='';draw(content)}};
  content.querySelectorAll('[data-undo]').forEach(b=>b.onclick=()=>ack(content,b,b.dataset.undo,true,''));
  content.querySelectorAll('[data-salam]').forEach(b=>b.onclick=()=>salam(content,b));
}

function toast(m,err){if(typeof showToast==='function')showToast(m,err);else if(err)console.warn(m)}
function setCount(tab){const list=S.data[tab]||[];S.data.counts[tab]=list.filter(x=>!x.acked).length;updateBadges()}

async function ack(content,btn,key,undo,note){
  btn.disabled=true;
  try{
    await post({action:'reminder_ack',key,undo,note:note.trim()});
    for(const tab of ['absent','walas_call','kesiswaan_call','walas_reports']){const x=(S.data[tab]||[]).find(y=>y.key===key);if(x){x.acked=!undo;x.acked_at=undo?null:new Date().toISOString();x.ack_note=undo?'':note.trim();setCount(tab)}}
    S.open='';toast(undo?'Pengingat dikembalikan.':'Ditandai sudah ditangani.');
  }catch(e){toast(e.message,true)}
  draw(content);
}
async function salam(content,btn){
  const x=(S.data.salam||[]).find(y=>String(y.id)===btn.dataset.salam);if(!x)return;
  btn.disabled=true;
  try{
    // kirim ulang PIC/target/catatan lama agar tidak terhapus
    await post({action:'salam_followup',id:x.id,status:btn.dataset.st,pic:x.pic||'',target_follow_up:x.target_follow_up||'',follow_up_note:x.follow_up_note||''});
    if(btn.dataset.st==='selesai')S.data.salam=S.data.salam.filter(y=>y!==x);else x.status=btn.dataset.st;
    S.data.counts.salam=S.data.salam.length;updateBadges();toast(btn.dataset.st==='selesai'?'SALAM CQ ditandai selesai.':'SALAM CQ sedang diproses.');
  }catch(e){toast(e.message,true)}
  draw(content);
}

async function render(content){
  if(!content)return;css();
  if(!isKes()){content.innerHTML='<div class="card">Khusus Kabid Kesiswaan.</div>';return}
  if(!S.data)content.innerHTML=`<div class="cqk"><div class="cqk-panel"><div class="cqk-empty"><span class="spinner"></span> Menghitung pengingat dari data CQlass...</div></div></div>`;
  try{await load(false);if(content.isConnected)draw(content)}
  catch(e){content.innerHTML=`<div class="cqk"><div class="cqk-err">${E(e.message)}</div></div>`}
}
window.renderKesiswaanReminders=render;
window.cqKesOpenReminders=function(tab){S.tab=tab||S.tab;S.q='';S.cls='';goto('kes-pengingat')};

/* ---------- ringkasan di dashboard ---------- */
window.cqKesReminderStrip=async function(content){
  if(!content||!isKes())return;css();
  let strip=content.querySelector('.cqk-strip');
  if(!strip){strip=document.createElement('div');strip.className='cqk-strip';content.insertBefore(strip,content.firstChild)}
  strip.innerHTML=`<div class="cqk-strip-h"><b>${icon('bell',17)} Pengingat hari ini</b><span style="font-size:12px;color:#6b8584"><span class="spinner"></span> menghitung…</span></div>`;
  try{
    await load(false);
    if(!strip.isConnected)return;
    strip.innerHTML=`<div class="cqk-strip-h"><b>${icon('bell',17)} Pengingat hari ini</b><button class="cqk-btn" data-open="">Buka semua ${icon('arrow',14)}</button></div><div class="cqk-strip-g">${TABS.map(t=>`<button type="button" class="cqk-strip-i tone-${t.tone}" data-open="${t.id}"><span class="ico">${icon(t.icon,16)}</span><span><b>${openCount(t.id)}</b><small>${E(t.label)}</small></span></button>`).join('')}</div>`;
    strip.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>window.cqKesOpenReminders(b.dataset.open));
  }catch(e){strip.innerHTML=`<div class="cqk-strip-h"><b>${icon('bell',17)} Pengingat hari ini</b></div><div style="font-size:12.5px;color:#9b2c22">${E(e.message)}</div>`}
};
})();
