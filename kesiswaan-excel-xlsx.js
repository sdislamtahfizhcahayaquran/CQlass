/* CQlass — native XLSX export for Laporan Kesiswaan */
(function(){
  'use strict';
  if(window.__cqKesiswaanXlsx)return;window.__cqKesiswaanXlsx=true;
  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const API=BASE+'/functions/v1/student-affairs-center';
  const AUDIT=BASE+'/functions/v1/student-point-input-audit';
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
  const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}};
  const toast=(m,e=false)=>{try{if(typeof showToast==='function')return showToast(m,!!e)}catch(_){ }(e?console.error:console.log)(m)};
  function headers(){return {'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':token()}}
  async function post(url,body){const r=await fetch(url,{method:'POST',headers:headers(),body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.message||d.error||'Gagal memuat data ekspor.');return d}
  function ensureXlsx(){if(window.XLSX)return Promise.resolve(window.XLSX);return new Promise((resolve,reject)=>{let s=document.querySelector('script[data-cq-xlsx]');if(s){s.addEventListener('load',()=>resolve(window.XLSX),{once:true});s.addEventListener('error',()=>reject(new Error('Library Excel gagal dimuat.')),{once:true});return}s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.dataset.cqXlsx='1';s.onload=()=>resolve(window.XLSX);s.onerror=()=>reject(new Error('Library Excel gagal dimuat.'));document.head.appendChild(s)})}
  function val(id){return document.getElementById(id)?.value||''}
  function relevantAudit(rows){return (rows||[]).filter(x=>{const rs=(x.roles||[]).map(v=>String(v||'').toLowerCase().replace(/[ _-]+/g,''));return rs.some(v=>v==='walas'||v==='walikelas'||v==='tahfizh'||v==='gurutahfizh')})}
  function sheet(XLSX,wb,name,rows){const safe=String(name).slice(0,31);const data=rows&&rows.length?rows:[{Keterangan:'Belum ada data'}];const ws=XLSX.utils.json_to_sheet(data);const keys=Object.keys(data[0]||{});ws['!cols']=keys.map(k=>({wch:Math.min(45,Math.max(String(k).length+2,...data.slice(0,200).map(r=>String(r?.[k]??'').length+2)))}));XLSX.utils.book_append_sheet(wb,ws,safe)}
  async function run(){
    const btn=document.getElementById('ksr2-export');if(btn)btn.disabled=true;
    try{
      toast('Menyiapkan file Excel Kesiswaan...');
      const [XLSX,d,a]=await Promise.all([
        ensureXlsx(),
        post(API,{action:'report',start_date:val('ksr2-from'),end_date:val('ksr2-to'),class_id:val('ksr2-class')}),
        post(AUDIT,{start_date:val('ksr2-from'),end_date:val('ksr2-to')}).catch(()=>({rows:[]}))
      ]);
      const wb=XLSX.utils.book_new(),s=d.summary||{},att=s.attendance||{},aff=s.affairs_by_type||{};
      sheet(XLSX,wb,'Ringkasan',[{
        'Periode Mulai':d.period?.start_date||val('ksr2-from'),'Periode Selesai':d.period?.end_date||val('ksr2-to'),'Siswa Aktif':s.students||0,
        Hadir:att.hadir||0,Sakit:att.sakit||0,Izin:att.izin||0,Alpha:att.alpha||0,Terlambat:s.late||0,Reward:s.rewards||0,
        Pelanggaran:s.violations||0,'Total Kasus':s.cases||0,'Kasus Aktif':s.open_cases||0,Pembinaan:aff.pembinaan||0,
        Prestasi:s.achievements||0,'Laporan Jaga UKS':s.uks_duty_reports||0
      }]);
      sheet(XLSX,wb,'Kehadiran',(d.attendance||[]).map(x=>({Tanggal:x.date,Siswa:x.student_name,Kelas:x.class_name,Status:x.status,Catatan:x.note||''})));
      sheet(XLSX,wb,'Reward',(d.rewards||[]).map(x=>({Tanggal:x.date,Siswa:x.student_name,Kelas:x.class_name,Reward:x.reward_name,Kategori:x.category||'',Poin:x.points??'',Catatan:x.note||''})));
      sheet(XLSX,wb,'Pelanggaran',(d.violations||[]).map(x=>({Tanggal:x.date,Siswa:x.student_name,Kelas:x.class_name,Pelanggaran:x.violation_name,Kategori:x.category||'',Poin:x.points??'',Catatan:x.note||''})));
      sheet(XLSX,wb,'Kasus',(d.cases||[]).map(x=>({Tanggal:x.date,Siswa:x.student_name,Kelas:x.class_name,Kategori:x.category||'',Masalah:x.main_problem||'',Ringkasan:x.summary||'',Tindak_Lanjut:x.final_suggestion||'',Status:x.status||'',Prioritas:x.attention_level||''})));
      sheet(XLSX,wb,'Layanan Kesiswaan',(d.affairs||[]).map(x=>({Tanggal:x.date,Jenis:x.record_type,Siswa:x.student_name,Kelas:x.class_name,Judul:x.title||'',Deskripsi:x.description||'',Tindak_Lanjut:x.follow_up||'',Status:x.status||'',Prioritas:x.priority||''})));
      sheet(XLSX,wb,'Prestasi',(d.achievements||[]).map(x=>({Tanggal:x.date,Siswa:x.student_name,Kelas:x.class_name,Prestasi:x.achievement_name,Lomba:x.competition_name||'',Tingkat:x.level||'',Hasil:x.rank_title||'',Penyelenggara:x.organizer||'',Pembimbing:x.coach_name||'',Status:x.status||''})));
      sheet(XLSX,wb,'Jaga UKS',(d.uks||[]).map(x=>({Tanggal:x.date,Guru:x.teacher_name,Shift:x.shift_no,Jam_Mulai:String(x.scheduled_start||'').slice(0,5),Jam_Selesai:String(x.scheduled_end||'').slice(0,5),Waktu_Foto:x.captured_at||x.created_at||''})));
      sheet(XLSX,wb,'Monitoring Input',relevantAudit(a.rows).map(x=>({Nama:x.name,Role:(x.roles||[]).join(', '),'Hari Tanpa Input Keduanya':x.missing_both_days||0,'Belum Pelanggaran':x.missing_violation_days||0,'Belum Reward':x.missing_reward_days||0,'Tanggal Kosong':(x.missing_both_dates||[]).join(', '),'Terakhir Pelanggaran':x.last_violation_date||'','Terakhir Reward':x.last_reward_date||''})));
      sheet(XLSX,wb,'Profil Siswa',(d.roster||[]).map(x=>({Siswa:x.student_name,Kelas:x.class_name,NIS:x.nis||'',NISN:x.nisn||''})));
      const from=(d.period?.start_date||val('ksr2-from')||'awal').replaceAll('-',''),to=(d.period?.end_date||val('ksr2-to')||'akhir').replaceAll('-','');
      XLSX.writeFile(wb,`Laporan_Kesiswaan_${from}_${to}.xlsx`);
      toast('File Excel Kesiswaan berhasil dibuat.');
    }catch(e){console.error(e);toast(e?.message||'Gagal membuat file Excel.',true)}finally{if(btn)btn.disabled=false}
  }
  document.addEventListener('click',function(ev){const t=ev.target?.closest?.('#ksr2-export');if(!t)return;ev.preventDefault();ev.stopImmediatePropagation();run()},true);
})();
