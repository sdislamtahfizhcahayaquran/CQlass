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
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const account=String(currentUser?.id||currentUser?.username||'');
  if(today!==reportDate||account!==reportedAccount){last=null;delete window.__cqWalasDailyCompleted;refreshAt=0;reportDate=today;reportedAccount=account;force=true}
  if(loading){if(force)refreshAgain=true;return}
  if(!force&&Date.now()-refreshAt<45000){draw();return}
  loading=true;refreshAt=Date.now();
  try{
   const out=await api({action:'daily_get'});
   const c=out.completion;
   if(c){
    last={absensi:!!c.attendance,kedisiplinan:!!c.discipline,reward:!!c.reward};
    window.__cqWalasDailyCompleted={...last};
    draw();
   }
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
  if(side){const observer=new MutationObserver(()=>{if(isWalas())draw()});observer.observe(side,{childList:true,subtree:true})}
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