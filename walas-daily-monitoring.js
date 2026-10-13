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
 async function load(){
  if(!root)return;
  root.innerHTML='<div class="cdp-panel">Memeriksa catatan hari ini...</div>';
  try{loaded=await api({action:'daily_get',class_id:chosenClass});chosenClass=loaded.class_id;paint();updateMarkers(true);}
  catch(e){root.innerHTML='<div class="cdp-panel cdp-error">'+esc(e.message)+'</div>';}
 }
 function paint(){
  if(!root||!loaded)return;
  const d=loaded,c=d.counts,exists=d.confirmation;
  // No automatic selection: the teacher must review and choose both answers explicitly.
  const mismatch=exists&&((exists.violation_status==='nihil'&&(c.violation||c.late))||(exists.reward_status==='nihil'&&c.reward)||(exists.violation_status==='ada'&&!(c.violation||c.late))||(exists.reward_status==='ada'&&!c.reward));
  const dateLabel=esc(new Date(d.date+'T12:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
  const automatic=!!d.completion?.monitoring&&!exists;
  const status=automatic?'<span class="cdp-status done">✓ Input Sudah Lengkap</span>':exists?(mismatch?'<span class="cdp-status issue">● Perlu Verifikasi</span>':'<span class="cdp-status done">✓ Sudah Dipantau</span>'):'<span class="cdp-status wait">● Belum Dikonfirmasi</span>';
  const option=(group,value,title,help,selected)=>'<label><input type="radio" name="'+group+'" value="'+value+'" '+(selected?'checked':'')+'><span><span class="cdp-opt-title">'+title+'</span><span class="cdp-opt-help">'+help+'</span></span></label>';
  root.innerHTML='<div class="cdp-wrap">'+
   '<div class="cdp-hero"><div><div class="cdp-eyebrow">Kesiswaan · Wali Kelas</div><h2>Pemantauan Harian Siswa</h2><p>Pastikan kondisi siswa telah diperiksa sebelum mengonfirmasi laporan hari ini.</p></div></div>'+
   '<div class="cdp-panel cdp-overview"><div class="cdp-overview-head"><div class="cdp-context"><span class="cdp-pill">▦ &nbsp;'+dateLabel+'</span><span class="cdp-pill">Kelas <b>'+esc(d.class_name)+'</b></span></div>'+status+'</div>'+
   '<div class="cdp-metrics"><div class="cdp-metric"><span class="cdp-metric-icon">!</span><div><div class="cdp-metric-num">'+c.violation+'</div><div class="cdp-metric-label">Pelanggaran tercatat</div></div></div>'+
   '<div class="cdp-metric"><span class="cdp-metric-icon">◷</span><div><div class="cdp-metric-num">'+c.late+'</div><div class="cdp-metric-label">Keterlambatan Morning Talk</div></div></div>'+
   '<div class="cdp-metric"><span class="cdp-metric-icon">★</span><div><div class="cdp-metric-num">'+c.reward+'</div><div class="cdp-metric-label">Reward terverifikasi</div></div></div></div>'+
   (exists?'<div class="cdp-foot" style="margin-top:11px">'+(mismatch?'Catatan berubah setelah konfirmasi. Periksa dan konfirmasi ulang.':'Terakhir dikonfirmasi '+esc(new Date(exists.confirmed_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})))+'</div>':'')+'</div>'+
   '<div class="cdp-panel"><div class="cdp-check-section"><div class="cdp-section"><div class="cdp-section-icon">✓</div><div><div class="cdp-section-title">Kedisiplinan</div><p class="cdp-section-sub">Tinjau pelanggaran dan keterlambatan yang terjadi di kelas.</p></div></div><div class="cdp-options">'+
   option('cdp-violation','nihil','Tidak ada pelanggaran','Sudah diperiksa dan tidak ditemukan kejadian.',false)+
   option('cdp-violation','ada','Ada pelanggaran / keterlambatan','Kejadian telah dicatat pada sistem.',false)+'</div></div>'+
   '<div class="cdp-check-section"><div class="cdp-section"><div class="cdp-section-icon">★</div><div><div class="cdp-section-title">Apresiasi Siswa</div><p class="cdp-section-sub">Pastikan apakah ada apresiasi khusus yang perlu dicatat.</p></div></div><div class="cdp-options">'+
   option('cdp-reward','nihil','Belum ada apresiasi khusus','Tidak perlu membuat reward jika memang tidak ada.',false)+
   option('cdp-reward','ada','Ada apresiasi siswa','Reward telah dicatat dan diverifikasi.',false)+'</div></div>'+
   '<label class="cdp-declaration"><input type="checkbox" id="cdp-declaration"><span>Saya telah memeriksa kondisi siswa dan memastikan laporan sesuai dengan temuan hari ini.</span></label>'+
   '<div class="cdp-action"><button id="cdp-submit" disabled>✓ &nbsp; Konfirmasi Pemantauan</button><span id="cdp-message" class="cdp-foot">Pilih kedua hasil pemeriksaan dan centang pernyataan.</span></div></div>'+
   '<p class="cdp-foot cdp-note">Hanya dapat dikonfirmasi untuk hari ini. Jika data berubah, status akan ditandai untuk diperiksa ulang.</p></div>';
  const checkbox=root.querySelector('#cdp-declaration'),button=root.querySelector('#cdp-submit'),msg=root.querySelector('#cdp-message');
  const ready=()=>!!(checkbox.checked&&root.querySelector('input[name="cdp-violation"]:checked')&&root.querySelector('input[name="cdp-reward"]:checked'));
  const sync=()=>{button.disabled=!ready();msg.textContent=ready()?'Siap disimpan.':'Pilih kedua hasil pemeriksaan dan centang pernyataan.';};
  checkbox.addEventListener('change',sync);
  root.querySelectorAll('input[name="cdp-violation"],input[name="cdp-reward"]').forEach(el=>el.addEventListener('change',sync));
  sync();
  button.addEventListener('click',async()=>{
   if(!ready())return;button.disabled=true;msg.textContent='Menyimpan...';
   try{
    await api({action:'daily_confirm',class_id:chosenClass,checked:checkbox.checked,violation_status:root.querySelector('input[name="cdp-violation"]:checked').value,reward_status:root.querySelector('input[name="cdp-reward"]:checked').value});
    await load();window.dispatchEvent(new Event('cq-daily-point-saved'));
   }catch(e){msg.textContent=e.message;msg.className='cdp-error';button.disabled=!ready();}
  });
 }

 // Sidebar markers are strictly WALAS-only; no role or database changes.
 const markerNames={'absensi':'Absensi (Morning Talk)','kedisiplinan':'Kedisiplinan','reward':'Reward','pemantauan':'Pemantauan Harian'};
 let markerState=null,lastMarkerFetch=0,markerPending=false;
 function isWalas(){try{return String(currentUser?.role||'').toLowerCase()==='walas'}catch(_){return false}}
 function renderMarkers(){
   const side=document.getElementById('sidebar');if(!side||!isWalas()||!markerState)return;
   const lookup=Object.entries(markerNames);
   side.querySelectorAll('.nav-group-items .nav-item').forEach(node=>{
     const label=String(node.querySelector('span')?.textContent||'').trim();
     const match=lookup.find(([key,name])=>label===name);
     if(!match)return;
     const key=match[0],show=!!markerState[key];
     // Remove only this feature's own old marker. Never strip other role menus.
     let dot=node.querySelector('.cdp-sidebar-alert');
     if(!show){if(dot)dot.remove();return}
     if(!dot){dot=document.createElement('span');dot.className='cdp-sidebar-alert';dot.setAttribute('aria-label','Perlu ditindaklanjuti');dot.title='Perlu ditindaklanjuti';node.appendChild(dot)}
   });
 }
 async function updateMarkers(force=false){
   if(!isWalas()||markerPending)return;
   if(!force&&Date.now()-lastMarkerFetch<20000){renderMarkers();return;}
   markerPending=true;lastMarkerFetch=Date.now();
   try{
     const info=await api({action:'daily_get'});
     const d=info.completion;
     if(!d){markerState=null;return}
     markerState={absensi:!d.attendance,kedisiplinan:!d.discipline,reward:!d.reward,pemantauan:!d.monitoring};
     renderMarkers();
   }catch(e){markerState=null;console.warn('Pemantauan sidebar tidak dapat dimuat:',e)}
   finally{markerPending=false}
 }
 function installSidebarMarkers(){
   if(window.__cqWalasSidebarMarkers)return;window.__cqWalasSidebarMarkers=true;
   const style=document.createElement('style');style.id='cq-walas-sidebar-markers';
   style.textContent='#sidebar .nav-item .cdp-sidebar-alert{display:inline-flex;flex:0 0 auto;margin-left:auto;width:16px;height:16px;border-radius:50%;background:#e74436;color:#fff;box-shadow:0 0 0 2px #fff;align-items:center;justify-content:center}#sidebar .nav-item .cdp-sidebar-alert:after{content:"1";font-size:10px;font-weight:800;line-height:1}#sidebar .nav-item:has(.cdp-sidebar-alert){display:flex;align-items:center}';
   document.head.appendChild(style);
   // Sidebars are recreated by multiple existing CQlass modules; poll DOM without recreating them.
   window.setInterval(()=>{if(isWalas()){renderMarkers();updateMarkers()}},5000);
   window.addEventListener('focus',()=>{if(isWalas())updateMarkers(true)});
   document.addEventListener('visibilitychange',()=>{if(!document.hidden&&isWalas())updateMarkers(true)});
   window.addEventListener('cq-daily-point-saved',()=>updateMarkers(true));
   if(isWalas())updateMarkers(true);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installSidebarMarkers,{once:true});
 else installSidebarMarkers();
 window.renderWalasDailyMonitoring=function(content){css();chosenClass='';loaded=null;root=content;load();};
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