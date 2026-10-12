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
  s.textContent='.cdp-wrap{max-width:850px;margin:auto}.cdp-panel{background:#fff;border:1px solid #d9e5ea;border-radius:15px;padding:19px;margin:12px 0}.cdp-wrap h2{font-size:21px;margin:0 0 8px}.cdp-wrap p{color:#617582;line-height:1.5}.cdp-meta{font-size:12px;font-weight:750;color:#526c7b}.cdp-row{display:flex;gap:14px;flex-wrap:wrap;align-items:center}.cdp-row label{display:flex;gap:7px;align-items:center}.cdp-wrap select,.cdp-wrap button{padding:10px;border:1px solid #bcd2dc;border-radius:10px;font:inherit}.cdp-wrap button{background:#096b68;color:#fff;cursor:pointer;font-weight:700}.cdp-wrap button:disabled{opacity:.45;cursor:not-allowed}.cdp-options{display:grid;gap:10px;margin:14px 0}.cdp-options label{padding:12px;border:1px solid #d9e5ea;border-radius:10px;cursor:pointer}.cdp-state{background:#eaf7f2;padding:12px;border-radius:10px;color:#165b48;font-weight:700}.cdp-error{color:#ac2626;font-weight:700}.cdp-foot{font-size:12px;color:#667e8a}';
  document.head.appendChild(s);
 }
 async function load(){
  if(!root)return;
  root.innerHTML='<div class="cdp-panel">Memeriksa catatan hari ini...</div>';
  try{loaded=await api({action:'daily_get',class_id:chosenClass});chosenClass=loaded.class_id;paint();}
  catch(e){root.innerHTML='<div class="cdp-panel cdp-error">'+esc(e.message)+'</div>';}
 }
 function paint(){
  if(!root||!loaded)return;
  const d=loaded,c=d.counts,exists=d.confirmation;
  const v=c.violation>0||c.late>0?'ada':'nihil',r=c.reward>0?'ada':'nihil';
  const mismatch=exists&&((exists.violation_status==='nihil'&&(c.violation||c.late))||(exists.reward_status==='nihil'&&c.reward)||(exists.violation_status==='ada'&&!(c.violation||c.late))||(exists.reward_status==='ada'&&!c.reward));
  root.innerHTML='<div class="cdp-wrap"><h2>Pemantauan Harian Siswa</h2><p>Pemeriksaan dilaksanakan wali kelas setelah memastikan kondisi siswa. Tidak perlu membuat pelanggaran ataupun apresiasi fiktif.</p>'+
   '<div class="cdp-panel"><div class="cdp-row"><span class="cdp-meta">Tanggal: '+esc(d.date)+'</span><span class="cdp-meta">Kelas: '+esc(d.class_name)+'</span></div>'+
   '<p>Data tercatat: '+c.violation+' pelanggaran, '+c.late+' keterlambatan Morning Talk, '+c.reward+' reward terverifikasi.</p>'+
   (exists?'<div class="'+(mismatch?'cdp-error':'cdp-state')+'">'+(mismatch?'Perlu verifikasi ulang karena catatan berubah.':'Sudah Dipantau — dikonfirmasi '+esc(new Date(exists.confirmed_at).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})))+'</div>':'<div class="cdp-meta">Belum dikonfirmasi hari ini</div>')+'</div>'+
   '<div class="cdp-panel"><strong>Kedisiplinan</strong><div class="cdp-options"><label><input type="radio" name="cdp-violation" value="nihil" '+(v==='nihil'?'checked':'')+'> Tidak ada pelanggaran yang ditemukan</label><label><input type="radio" name="cdp-violation" value="ada" '+(v==='ada'?'checked':'')+'> Ada pelanggaran/keterlambatan yang tercatat</label></div>'+
   '<strong>Apresiasi Siswa</strong><div class="cdp-options"><label><input type="radio" name="cdp-reward" value="nihil" '+(r==='nihil'?'checked':'')+'> Belum ada apresiasi khusus hari ini</label><label><input type="radio" name="cdp-reward" value="ada" '+(r==='ada'?'checked':'')+'> Ada apresiasi yang dicatat</label></div>'+
   '<label class="cdp-row"><input type="checkbox" id="cdp-declaration"> Saya telah memeriksa kondisi siswa dan memastikan laporan ini sesuai temuan hari ini.</label>'+
   '<div style="margin-top:16px"><button id="cdp-submit" disabled>Konfirmasi Pemantauan</button> <span id="cdp-message" class="cdp-foot"></span></div></div>'+
   '<p class="cdp-foot">Konfirmasi hanya untuk tanggal hari ini. Riwayat sebelumnya tidak dapat dikonfirmasi sekaligus. Data yang berubah setelah konfirmasi akan ditandai untuk diperiksa ulang.</p></div>';
  const checkbox=root.querySelector('#cdp-declaration'),button=root.querySelector('#cdp-submit');
  checkbox.addEventListener('change',()=>{button.disabled=!checkbox.checked;});
  button.addEventListener('click',async()=>{
   button.disabled=true;const msg=root.querySelector('#cdp-message');msg.textContent='Menyimpan...';
   try{
    await api({action:'daily_confirm',class_id:chosenClass,checked:checkbox.checked,violation_status:root.querySelector('input[name="cdp-violation"]:checked').value,reward_status:root.querySelector('input[name="cdp-reward"]:checked').value});
    await load();
   }catch(e){msg.textContent=e.message;msg.className='cdp-error';button.disabled=!checkbox.checked;}
  });
 }
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