/* CQlass - Pemantauan Harian Walas, per kelas dan tanggal, tanpa menambah laporan duplikat */
(function(){
 'use strict';
 if(window.__cqDailyPointsUI)return;window.__cqDailyPointsUI=true;
 const URL='https://lmglkxzemtvxcgktiord.supabase.co/functions/v1/student-point-input-audit';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let chosenClass='',loaded=null,root=null;
 async function api(payload){
  const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||'';
  const resp=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':token},body:JSON.stringify(payload)});
  let data={};try{data=await resp.json()}catch(e){throw Error('Respons server tidak valid');}
  if(!resp.ok||data.success===false)throw Error(data.error==='status_conflicts_with_records'?'Pilihan tidak cocok dengan catatan yang sudah tersimpan. Periksa data kedisiplinan, keterlambatan, dan reward.':(data.message||data.error||'Gagal menghubungi server'));
  return data;
 }
 function css(){
  if(document.getElementById('cq-daily-points-style'))return;
  const s=document.createElement('style');s.id='cq-daily-points-style';
  s.textContent=`
.cdp-wrap{max-width:1040px;margin:0 auto;padding:4px 0 26px;color:#203747;font-family:inherit}
.cdp-wrap *{box-sizing:border-box}
.cdp-hero{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:17px;flex-wrap:wrap}
.cdp-hero h2{margin:0 0 6px;font-size:clamp(21px,2.3vw,29px);font-weight:850;letter-spacing:-.5px;color:#173e4a}
.cdp-hero p{margin:0;max-width:770px;color:#637986;font-size:13px;line-height:1.65}
.cdp-eyebrow{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#0b8678;font-weight:850;margin-bottom:7px}
.cdp-panel{background:#fff;border:1px solid #deeaeb;border-radius:18px;padding:22px 24px;margin:0 0 14px;box-shadow:0 6px 20px rgba(24,77,78,.035)}
.cdp-overview{background:linear-gradient(112deg,#fff 40%,#f2fbf8);border:1px solid #cfe6df}
.cdp-overview-head{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:15px}
.cdp-context{display:flex;gap:8px;flex-wrap:wrap}
.cdp-pill{padding:8px 12px;background:#fff;border:1px solid #d9e9e7;border-radius:999px;color:#3e6570;font-size:12px;font-weight:750;display:inline-flex;align-items:center;gap:6px}
.cdp-pill b{color:#194653}
.cdp-status{display:inline-flex;align-items:center;gap:6px;padding:8px 13px;border-radius:999px;font-size:12px;font-weight:800}
.cdp-status.wait{background:#fff7e6;color:#9a6710;border:1px solid #f0dfbd}
.cdp-status.done{background:#dff6ed;color:#0b755f;border:1px solid #bce9d4}
.cdp-status.issue{background:#fff0ee;color:#b13e31;border:1px solid #f7d4cd}
.cdp-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}
.cdp-metric{border:1px solid #e2ecec;border-radius:13px;background:#fff;padding:13px 15px;display:flex;align-items:center;gap:12px}
.cdp-metric-icon{width:40px;height:40px;border-radius:12px;background:#e8f6f3;color:#14766d;display:grid;place-items:center;font-size:17px;font-weight:900;flex-shrink:0}
.cdp-metric-num{font-size:23px;font-weight:850;line-height:1.05;color:#1b4650;font-variant-numeric:tabular-nums}
.cdp-metric-label{font-size:11px;font-weight:650;color:#708592;margin-top:4px;line-height:1.3}
.cdp-section{display:flex;gap:13px;align-items:flex-start;margin-bottom:17px}
.cdp-section-icon{width:41px;height:41px;flex-shrink:0;background:#e7f6f2;color:#0c806e;border-radius:12px;display:grid;place-items:center;font-size:20px;font-weight:900}
.cdp-section-title{font-size:16px;font-weight:850;color:#1d3e4c;margin:0 0 4px}
.cdp-section-sub{font-size:12px;color:#78909a;line-height:1.5;margin:0}
.cdp-check-section+.cdp-check-section{border-top:1px solid #eaf0f1;padding-top:22px;margin-top:23px}
.cdp-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0}
.cdp-options label{border:1.5px solid #dce7e9;background:#fff;border-radius:13px;display:flex;align-items:flex-start;gap:12px;min-height:86px;padding:17px;cursor:pointer;transition:border-color .16s,background .16s,box-shadow .16s}
.cdp-options label:hover{border-color:#9dd1c8;background:#f8fcfb}
.cdp-options label:has(input:checked){border-color:#1a9281;background:#effaf6;box-shadow:0 0 0 1px rgba(26,146,129,.13)}
.cdp-options input{margin:3px 0 0;width:18px;height:18px;accent-color:#138978;flex-shrink:0}
.cdp-opt-title{display:block;font-size:13px;font-weight:800;color:#274754;line-height:1.45}
.cdp-opt-help{display:block;font-size:11px;color:#748a94;margin-top:6px;line-height:1.4;font-weight:500}
.cdp-declaration{display:flex;align-items:flex-start;gap:11px;background:#f4f9fa;border:1px solid #deebee;border-radius:13px;padding:15px 17px;cursor:pointer;margin:23px 0 16px}
.cdp-declaration input{width:18px;height:18px;accent-color:#138978;flex-shrink:0;margin:2px 0}
.cdp-declaration span{font-size:12.5px;line-height:1.6;font-weight:650;color:#355b66}
.cdp-action{display:flex;align-items:center;gap:15px;flex-wrap:wrap}
.cdp-wrap button{padding:12px 22px;border:0;border-radius:11px;font:inherit;background:#087f74;color:#fff;cursor:pointer;font-size:13px;font-weight:800;box-shadow:0 5px 12px rgba(8,127,116,.17)}
.cdp-wrap button:hover:not(:disabled){background:#066a61}
.cdp-wrap button:disabled{background:#b5d2cd;color:#f9ffff;box-shadow:none;cursor:not-allowed}
.cdp-wrap select,.cdp-wrap input[type=date]{padding:10px 12px;border:1px solid #c9dfe0;border-radius:10px;font:inherit}
.cdp-foot{font-size:11px;line-height:1.6;color:#79909a}
.cdp-note{padding:0 9px}
.cdp-state{background:#eaf7f2;padding:12px;border-radius:10px;color:#165b48;font-weight:700}
.cdp-error{color:#b43a34;font-size:12px;font-weight:750}
.cdp-row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.cdp-meta{font-size:12px;font-weight:750;color:#526c7b}
@media(max-width:700px){.cdp-panel{padding:17px}.cdp-metrics{grid-template-columns:1fr 1fr}.cdp-metric:last-child{grid-column:span 2}.cdp-options{grid-template-columns:1fr}.cdp-options label{min-height:68px}.cdp-hero{margin-bottom:15px}}
`;
  document.head.appendChild(s);
 }

 // Single source of truth: existing per-category confirmation and actual saved input.
 function isWalas(){try{return currentUser?.role==='walas'}catch{return false}}
 let last=null,loading=false,refreshAt=0,refreshAgain=false,reportDate='',reportedAccount='';
 const MENU={'absensi':'absensi','kedisiplinan':'kedisiplinan','reward':'reward'};
 function draw(){
  if(!isWalas()||!last)return;
  const sidebar=document.getElementById('sidebar');if(!sidebar)return;
  sidebar.querySelectorAll('.nav-group-items .nav-item').forEach(el=>{
   const label=String(el.querySelector('span')?.textContent||'').trim().toLowerCase();
   const key=label==='absensi (morning talk)'||label==='absensi'?'absensi':label==='kedisiplinan'?'kedisiplinan':label==='reward'?'reward':null;
   if(!key)return;
   const shouldShow=!last[key];
   let dot=el.querySelector('.cq-walas-red-dot');
   if(!shouldShow){dot?.remove();return;}
   if(!dot){dot=document.createElement('span');dot.className='cq-walas-red-dot';dot.title='Belum dilaporkan hari ini';dot.setAttribute('aria-label','Belum dilaporkan hari ini');el.appendChild(dot)}
  });
 }
 async function refresh(force=false){
  if(!isWalas()||document.hidden)return;
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const account=String(currentUser?.id||currentUser?.username||'');
  if(today!==reportDate||account!==reportedAccount){last=null;refreshAt=0;reportDate=today;reportedAccount=account;force=true}
  if(loading){if(force)refreshAgain=true;return}
  if(!force&&Date.now()-refreshAt<45000){draw();return}
  loading=true;refreshAt=Date.now();
  try{
   const out=await api({action:'daily_get'});
   const c=out.completion;
   if(c){last={absensi:!!c.attendance,kedisiplinan:!!c.discipline,reward:!!c.reward};draw()}
  }catch(e){last=null;refreshAt=0;console.warn('Notifikasi Walas: status tidak tersedia',e)}
  finally{loading=false;if(refreshAgain){refreshAgain=false;refresh(true)}}
 }
 window.cqWalasConfirmEmpty=async function(kind,cid,day,output){
  if(!isWalas())return;
  const label=kind==='violation'?'pelanggaran':'reward';
  const actionKind=kind==='violation'?'discipline':'reward';
  if(!cid||!day){showToast('Pilih kelas dan tanggal terlebih dahulu.',true);return}
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  if(day!==today){showToast('Konfirmasi tanpa kejadian hanya untuk hari ini.',true);return}
  if(!window.confirm('Sudah memeriksa kelas dan memastikan tidak ada '+label+' hari ini?'))return;
  if(output)output.textContent='Memeriksa dan menyimpan...';
  try{
   await api({action:'daily_zero',class_id:cid,date:day,kind:actionKind,checked:true});
   if(output)output.textContent='Tersimpan: tidak ada '+label+' hari ini.';
   showToast('Pemeriksaan tersimpan.');
   window.dispatchEvent(new Event('cq-walas-kesiswaan-saved'));
  }catch(e){if(output)output.textContent='Gagal: '+e.message;showToast(e.message,true)}
 };
 function startMarkers(){
  if(window.__cqWalasMarkersV2)return;window.__cqWalasMarkersV2=true;
  const el=document.createElement('style');el.textContent='#sidebar .nav-item .cq-walas-red-dot{display:inline-block;flex:0 0 9px;margin-left:auto;width:9px;height:9px;border-radius:50%;background:#e7473c;box-shadow:0 0 0 2px rgba(255,255,255,.65)}#sidebar .nav-item:has(.cq-walas-red-dot){display:flex;align-items:center}';
  document.head.appendChild(el);
  // Observe sidebar redraws; do not poll DOM every five seconds or rewrite global routing.
  const side=document.getElementById('sidebar');
  if(side){const observer=new MutationObserver(()=>{if(isWalas())draw()});observer.observe(side,{childList:true,subtree:false})}
  window.addEventListener('focus',()=>refresh(true));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh(true)});
  window.addEventListener('cq-walas-kesiswaan-saved',()=>refresh(true));
  // One lightweight refresh cadence, not repeated DOM polling.
  window.setInterval(()=>refresh(false),60000);
  refresh(true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',startMarkers,{once:true});else startMarkers();
 window.renderKesiswaanDailyMonitoring=async function(content){
  css();content.innerHTML='<div class="cdp-wrap"><h2>Rekap Pemantauan Harian</h2><p>Rekap otomatis dari konfirmasi wali kelas. Tidak ada input bukan berarti sudah dipantau.</p><div class="cdp-panel"><label>Tanggal <input id="cdp-date" type="date"></label> <button id="cdp-refresh">Tampilkan</button></div><div class="cdp-panel" id="cdp-report">Memuat...</div></div>';
  const box=content.querySelector('#cdp-report'),input=content.querySelector('#cdp-date');
  input.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());input.max=input.value;
  async function fetchReport(){
   box.textContent='Memuat...';
   try{
    const d=await api({action:'daily_summary',date:input.value});
    const rows=d.rows||[];
    box.innerHTML='<div class="cdp-meta">'+rows.filter(x=>x.status==='lengkap').length+' dari '+rows.length+' kelas sudah terkonfirmasi</div><div style="overflow-x:auto"><table style="border-collapse:collapse;width:100%;margin-top:12px"><thead><tr><th style="text-align:left;padding:9px">Kelas</th><th>Pelanggaran</th><th>Reward</th><th>Status</th></tr></thead><tbody>'+rows.map(x=>'<tr style="border-top:1px solid #e4eaed"><td style="padding:9px">'+esc(x.class_name)+'</td><td style="text-align:center">'+(x.violation_count||0)+'</td><td style="text-align:center">'+(x.reward_count||0)+'</td><td style="text-align:center">'+(x.status==='lengkap'?'✓ Sudah Dipantau':x.status==='perlu_verifikasi'?'Perlu Verifikasi':'Belum Dikonfirmasi')+'</td></tr>').join('')+'</tbody></table></div>';
   }catch(e){box.innerHTML='<span class="cdp-error">'+esc(e.message)+'</span>';}
  }
  content.querySelector('#cdp-refresh').addEventListener('click',fetchReport);fetchReport();
 };
})();