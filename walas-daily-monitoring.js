/* CQlass - Pemantauan Harian Walas, per kelas dan tanggal, tanpa menambah laporan duplikat */
(function(){
 'use strict';
 if(window.__cqDailyPointsUI)return;window.__cqDailyPointsUI=true;
 const API_BASE='https://lmglkxzemtvxcgktiord.supabase.co/functions/v1/';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let chosenClass='',loaded=null,root=null;
 async function api(payload,url=API_BASE+'student-point-input-audit'){
  const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||'';
  const resp=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':token},body:JSON.stringify(payload)});
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
.cdp-wrap h2{font-size:22px;color:#173e4a;margin:0 0 8px}
.cdp-wrap p{color:#637986;font-size:13px;line-height:1.6}
.cdp-panel{background:#fff;border:1px solid #deeaeb;border-radius:16px;padding:20px 22px;margin:12px 0;box-shadow:0 5px 15px rgba(24,77,78,.035)}
.cdp-wrap button{padding:11px 18px;border:0;border-radius:10px;font:inherit;background:#087f74;color:#fff;cursor:pointer;font-size:13px;font-weight:800}
.cdp-wrap button:hover{background:#066a61}
.cdp-wrap input[type=date]{padding:10px 12px;border:1px solid #c9dfe0;border-radius:10px;font:inherit}
.cdp-meta{font-size:12px;font-weight:750;color:#526c7b}
.cdp-error{color:#b43a34;font-size:12px;font-weight:750}
@media(max-width:700px){.cdp-panel{padding:16px}}
`;
  document.head.appendChild(s);
 }

 // Single source of truth: existing per-category confirmation and actual saved input.
 function isWalas(){try{return currentUser?.role==='walas'}catch{return false}}
 let last=null,loading=false,refreshAt=0,refreshAgain=false,reportDate='',reportedAccount='';
 const reportModules=[['Absensi','absensi'],['Kedisiplinan','kedisiplinan'],['Reward','reward'],['Timesheet','timesheet']];
 let reportMount=null,reportBody=null,extraStatus=null,extraRequest=0;
 function reportDateToday(){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  return ['year','month','day'].map(part=>parts.find(item=>item.type===part).value).join('-');
 }
 function drawReportStatus(){
  if(!isWalas()||!reportMount?.isConnected)return;
  const rows=reportModules.map(([label,module])=>[label,module,module==='timesheet'?extraStatus?.timesheet:last?.[module]]);
  if(extraStatus?.uks!==undefined)rows.push(['UKS','uks-duty-report',extraStatus.uks]);
  const known=rows.filter(([, ,status])=>typeof status==='boolean');
  const done=known.filter(([, ,status])=>status).length;
  const summary=!extraStatus?.uksAvailable||known.length!==rows.length
   ? 'Status sedang diperiksa atau belum tersedia.'
   : done===rows.length?'✓ Semua laporan hari ini sudah lengkap':done+' dari '+rows.length+' laporan sudah diisi';
  const html='<div class="walas-card-sub" role="status">'+summary+'</div>'+rows.map(([label,module,status])=>
   '<div class="rd-task '+(status===true?'done':status===false?'pending':'')+'"><div class="rd-task-main"><div class="rd-task-name">'+label+'</div><div class="rd-task-meta">'+
   (status===true?'✓ Sudah diisi':status===false?'Belum diisi':'Status belum tersedia')+
   '</div></div>'+(status===false?`<button type="button" class="btn btn-sm" onclick="setActiveModule('${module}')">Isi sekarang</button>`:'')+'</div>').join('');
  if(reportMount.__reportHtml!==html){reportMount.__reportHtml=html;reportBody.innerHTML=html}
 }
 async function refreshReportStatus(){
  if(!isWalas()||!reportMount?.isConnected||document.hidden)return;
  const mount=reportMount,account=currentUser,date=reportDateToday(),request=++extraRequest;
  const endpoint=name=>API_BASE+name;
  const [timesheet,uks]=await Promise.allSettled([
   api({action:'bootstrap',month:date.slice(0,7)},endpoint('teacher-timesheet-v2')),
   api({action:'bootstrap'},endpoint('uks-duty'))
  ]);
  if(request!==extraRequest||!isWalas()||currentUser!==account||reportMount!==mount||!mount.isConnected||date!==reportDateToday())return;
  const ts=timesheet.status==='fulfilled'?timesheet.value:null;
  const duty=uks.status==='fulfilled'?uks.value:null;
  const shifts=duty?.today_schedule||[];
  extraStatus={
   timesheet:ts?.teacher&&Array.isArray(ts.activities)?ts.activities.some(row=>row.work_date===date):undefined,
   uks:shifts.length?shifts.every(shift=>(duty.today_reports||[]).some(report=>Number(report.shift_no)===Number(shift.shift_no))):undefined,
   uksAvailable:!!duty
  };
  drawReportStatus();
 }
 function mountReportStatus(){
  const dashboard=isWalas()&&typeof activeModule!=='undefined'&&activeModule==='dashboard'
   ? document.querySelector('#content #rd-root'):null;
  const taskHeader=dashboard?.querySelector('.walas-grid-bottom > .walas-card:first-child > .walas-card-head');
  // Dashboard V10 renders the generic shell for Walas, without the legacy task card.
  const anchor=taskHeader||dashboard?.querySelector(':scope > .rd-kpis');
  if(anchor&&reportMount?.previousElementSibling===anchor)return;
  if(!anchor&&!reportMount)return;
  reportMount?.remove();
  reportMount=null;reportBody=null;extraStatus=null;extraRequest++;
  if(!anchor)return;
  reportMount=document.createElement('section');
  reportMount.setAttribute('aria-label','Status pengisian laporan hari ini');
  reportBody=reportMount;
  if(!taskHeader){
   reportMount.className='rd-card';
   reportMount.innerHTML='<h2 class="rd-card-title">Tugas Hari Ini</h2><div></div>';
   reportBody=reportMount.lastElementChild;
  }
  anchor.after(reportMount);
  drawReportStatus();
  refresh(true);
  refreshReportStatus();
 }
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
   else if(dot.style.display==='none')dot.style.display='';
  });
 }
 async function refresh(force=false){
  if(!isWalas()||document.hidden)return;
  const today=reportDateToday();
  const account=String(currentUser?.id||currentUser?.username||'');
  if(today!==reportDate||account!==reportedAccount){last=null;delete window.__cqWalasDailyCompleted;refreshAt=0;reportDate=today;reportedAccount=account;force=true}
  if(loading){if(force)refreshAgain=true;return}
  if(!force&&Date.now()-refreshAt<45000){draw();return}
  const user=currentUser;
  loading=true;refreshAt=Date.now();
  try{
   const out=await api({action:'daily_get'});
   if(!isWalas()||currentUser!==user||today!==reportDateToday())return;
   const c=out.completion;
   if(c){
    last={absensi:!!c.attendance,kedisiplinan:!!c.discipline,reward:!!c.reward};
    window.__cqWalasDailyCompleted={...last};
    draw();
   }
  }catch(e){last=null;refreshAt=0;console.warn('Notifikasi Walas: status tidak tersedia',e)}
  finally{drawReportStatus();loading=false;if(refreshAgain){refreshAgain=false;refresh(true)}}
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
  if(side){const observer=new MutationObserver(()=>{if(isWalas())draw()});observer.observe(side,{childList:true,subtree:true})}
  const content=document.getElementById('content');
  if(content)new MutationObserver(mountReportStatus).observe(content,{childList:true,subtree:true});
  mountReportStatus();
  window.addEventListener('focus',()=>{refresh(true);refreshReportStatus()});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refresh(true);refreshReportStatus()}});
  window.addEventListener('cq-walas-kesiswaan-saved',()=>refresh(true));
  // One lightweight refresh cadence, not repeated DOM polling.
  window.setInterval(()=>{if(reportMount?.isConnected&&reportDate!==reportDateToday()){extraStatus=null;refreshReportStatus()}refresh(false)},60000);
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