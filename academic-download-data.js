/* CQlass — Download Data Kabid Akademik
   Satu page resmi: Nilai, RPP & LP, Bilingual. */
(function(){
'use strict';
if(window.__CQ_ACADEMIC_DOWNLOAD_DATA__)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function css(){if(document.getElementById('cq-ak-download-css'))return;const s=document.createElement('style');s.id='cq-ak-download-css';s.textContent=`
.akdl{max-width:1250px;margin:auto}.akdl-head{margin-bottom:16px}.akdl-head h1{margin:0;color:#123f3d;font-size:26px}.akdl-head p{color:#6d817e;font-size:12px;margin:5px 0 0}
.akdl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}.akdl-card{background:#fff;border:1px solid #dce9e6;border-radius:16px;padding:18px;display:flex;flex-direction:column;min-height:245px}
.akdl-card h2{font-size:17px;margin:0 0 6px;color:#154b46}.akdl-card p{font-size:11px;color:#71817f;line-height:1.55;margin:0}.akdl-list{margin:14px 0 18px;padding:0;list-style:none;font-size:11px;color:#405d58}.akdl-list li{padding:5px 0;border-bottom:1px solid #eef3f2}
.akdl-actions{margin-top:auto;display:flex;gap:7px;flex-wrap:wrap}.akdl-btn{border:1px solid #c9dfdb;border-radius:9px;padding:9px 12px;background:#fff;color:#0d7168;font-weight:800;font-size:11px;cursor:pointer}.akdl-btn.primary{background:#0c7b70;color:#fff;border-color:#0c7b70}.akdl-note{margin-top:14px;background:#eef7f5;border-radius:12px;padding:12px;font-size:10.5px;color:#58716d}
@media(max-width:850px){.akdl-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
function go(id){if(typeof setActiveModule==='function')setActiveModule(id)}

const CLASSES=['1A Banin','1B Banin','1A Banat','1B Banat','2A Banin','2B Banin','2A Banat','2B Banat','3A Banin','3B Banin','3A Banat','3B Banat','4A Banin','4B Banin','4A Banat','4B Banat','5A Banin','5B Banin','5A Banat','5B Banat','6 Banin','6 Banat'];
function toast(m,e){if(typeof showToast==='function')showToast(m,!!e)}
function isAcademic(){const r=String(window.currentUser?.role||'').toLowerCase().trim();return r==='akademik'||r==='kabid_akademik'||r==='academic'}
let xlsxPromise=null;
function loadXlsx(){if(window.XLSX)return Promise.resolve(window.XLSX);if(xlsxPromise)return xlsxPromise;xlsxPromise=new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';s.async=true;s.dataset.cqAcademicDownload='xlsx';s.onload=()=>window.XLSX?resolve(window.XLSX):reject(new Error('Mesin Excel gagal dimuat.'));s.onerror=()=>reject(new Error('Mesin Excel gagal dimuat. Periksa koneksi internet.'));document.head.appendChild(s)});return xlsxPromise}
function needXlsx(){if(!window.XLSX)throw new Error('Mesin Excel belum termuat.');return window.XLSX}
function aoaSheet(rows,widths){const X=needXlsx(),ws=X.utils.aoa_to_sheet(rows);if(widths)ws['!cols']=widths.map(w=>({wch:w}));return ws}
function saveBook(wb,name){needXlsx().writeFile(wb,name,{compression:true})}
function dateId(v){if(!v)return '';try{return new Date(v).toLocaleDateString('id-ID')}catch(_){return String(v)}}
function authHeaders(){const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';let tok='';try{tok=typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){}return {'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':tok}}
async function rppReq(action){const base=(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL)||'https://lmglkxzemtvxcgktiord.supabase.co';const r=await fetch(base+'/functions/v1/rpp-lp-manager',{method:'POST',headers:authHeaders(),body:JSON.stringify({action})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.error||'Data RPP & LP gagal dimuat.');return d}
async function exportRppLp(btn){
 if(!isAcademic()){toast('Download Data hanya untuk Kabid Akademik.',true);return}
 const old=btn.textContent;btn.disabled=true;btn.textContent='Menyiapkan...';
 try{await loadXlsx();
  const [rpp,lp]=await Promise.all([rppReq('archive_report'),rppReq('report')]),X=needXlsx(),wb=X.utils.book_new();
  const rr=rpp.rows||[],ll=lp.rows||[],teachers=new Set([...rr.map(x=>x.teacher_name),...ll.map(x=>x.teacher_name)].filter(Boolean));
  const summary=[['RINGKASAN RPP & LP'],['Tahun Ajaran',rpp.academic_year||lp.academic_year||''],['Semester',rpp.semester_no||lp.semester_no||1],[],['Indikator','Jumlah'],['Total RPP',rr.length],['Total Target LP',ll.length],['Guru Tercatat',teachers.size],['RPP Perlu Ditinjau',Number(rpp.summary?.pending_review||0)],['LP RPP Masuk',Number(lp.summary?.submitted||0)],['LP Belum Upload',Number(lp.summary?.missing||0)]];
  X.utils.book_append_sheet(wb,aoaSheet(summary,[28,18]),'RINGKASAN');
  const graph=[['GRAFIK PROGRES'],['Status','Jumlah'],['RPP Masuk',Number(lp.summary?.submitted||0)],['Belum Upload',Number(lp.summary?.missing||0)],['Perlu Ditinjau',Number(rpp.summary?.pending_review||0)]];
  X.utils.book_append_sheet(wb,aoaSheet(graph,[24,16]),'GRAFIK');
  X.utils.book_append_sheet(wb,aoaSheet([['No','File','Guru','Kelas','Mapel','Tanggal Upload','Status'],...rr.map((x,i)=>[i+1,x.original_filename||'',x.teacher_name||'',x.class_name||'',x.subject_name||'',dateId(x.uploaded_at||x.created_at),x.content_status||''])],[6,36,26,18,24,18,20]),'DETAIL RPP');
  X.utils.book_append_sheet(wb,aoaSheet([['No','Guru','Kelas','Mapel','Periode','Target LP','Progres %','Status RPP','Pelaksanaan'],...ll.map((x,i)=>[i+1,x.teacher_name||'',x.class_name||'',x.subject_name||'',x.period_label||('Minggu '+(x.week_no||'')),x.target_text||'',Number(x.progress_percent||0),x.rpp_status||'',x.execution_status||''])],[6,26,18,24,18,45,12,18,18]),'DETAIL LP');
  saveBook(wb,'Rekap_RPP_LP_SDCQ.xlsx');toast('RPP & LP berhasil diunduh.');
 }catch(e){toast(e.message||'Gagal membuat Excel RPP & LP.',true)}finally{btn.disabled=false;btn.textContent=old}
}
async function exportBilingual(btn){
 if(!isAcademic()){toast('Download Data hanya untuk Kabid Akademik.',true);return}
 const old=btn.textContent;btn.disabled=true;btn.textContent='Mengumpulkan 22 kelas...';
 try{await loadXlsx();
  const all=[];let categories=[];
  for(let i=0;i<CLASSES.length;i++){btn.textContent='Kelas '+(i+1)+'/22';const d=await callApi('getVocabularyBulanan',{kelas:CLASSES[i],tahunAjaran:'2026/2027',semester:1});if(!d||d.success===false)continue;categories=d.categories||categories;for(const s of (d.students||[])){const vals=(d.categories||[]).map(cat=>d.values?.[String(s.nis)+'|'+Number(cat.urutan)]??'');const total=vals.reduce((a,v)=>a+(Number(v)||0),0);all.push({kelas:CLASSES[i],nis:s.nis,nama:s.nama,vals,total,target:(d.categories||[]).reduce((a,x)=>a+(Number(x.target)||0),0)})}}
  const X=needXlsx(),wb=X.utils.book_new(),by={};all.forEach(x=>{(by[x.kelas]||(by[x.kelas]=[])).push(x)});
  const sum=[['RINGKASAN BILINGUAL'],['Tahun Ajaran','2026/2027'],['Semester',1],[],['Kelas','Siswa','Rata-rata Capaian %'],...CLASSES.map(k=>{const a=by[k]||[];const pct=a.length?a.reduce((z,x)=>z+(x.target?x.total/x.target*100:0),0)/a.length:0;return[k,a.length,Math.round(pct*10)/10]})];
  X.utils.book_append_sheet(wb,aoaSheet(sum,[20,12,22]),'RINGKASAN');
  X.utils.book_append_sheet(wb,aoaSheet([['GRAFIK CAPAIAN PER KELAS'],['Kelas','Capaian %'],...sum.slice(5).map(r=>[r[0],r[2]])],[20,16]),'GRAFIK');
  const heads=['No','Kelas','NIS','Nama',...categories.map(x=>x.label||('Kategori '+x.urutan)),'Total','Target','Capaian %'];
  X.utils.book_append_sheet(wb,aoaSheet([heads,...all.map((x,i)=>[i+1,x.kelas,x.nis,x.nama,...x.vals,x.total,x.target,x.target?Math.round(x.total/x.target*1000)/10:0])],[6,18,16,30,...categories.map(()=>16),12,12,14]),'DETAIL');
  saveBook(wb,'Rekap_Bilingual_SDCQ.xlsx');toast('Bilingual berhasil diunduh.');
 }catch(e){toast(e.message||'Gagal membuat Excel Bilingual.',true)}finally{btn.disabled=false;btn.textContent=old}
}
function exportNilai(btn){if(!isAcademic()){toast('Download Data hanya untuk Kabid Akademik.',true);return}toast('Download Nilai sedang dikunci ke template Legger resmi; tidak dibuat dengan format generik.',true)}
function runDownload(kind,btn){if(kind==='RPP & LP')return exportRppLp(btn);if(kind==='Bilingual')return exportBilingual(btn);return exportNilai(btn)}

window.renderAcademicDownloadData=function(c){if(!isAcademic()){c.innerHTML='<div class="card">Menu ini khusus Kabid Akademik.</div>';return}css();c.innerHTML=`
<div class="akdl"><div class="akdl-head"><h1>Download Data Akademik</h1><p>Unduh data akademik siap laporan. Setiap workbook memuat Ringkasan, Grafik, dan data detail.</p></div>
<div class="akdl-grid">
<section class="akdl-card"><h2>Nilai</h2><p>Legger nilai Semester 1 TA 2026/2027.</p><ul class="akdl-list"><li>Sheet Ringkasan</li><li>Grafik capaian nilai</li><li>1 sheet = 1 kelas</li><li>Detail nilai siswa per mata pelajaran</li></ul><div class="akdl-actions"><button class="akdl-btn" data-go="leger">Buka Nilai</button><button class="akdl-btn primary" data-dl="Nilai">Download Excel</button></div></section>
<section class="akdl-card"><h2>RPP &amp; LP</h2><p>Rekap kelengkapan dokumen pembelajaran guru.</p><ul class="akdl-list"><li>Sheet Ringkasan</li><li>Grafik progres kelengkapan</li><li>Detail guru · mapel · kelas</li><li>Status dan kesesuaian RPP ↔ LP</li></ul><div class="akdl-actions"><button class="akdl-btn" data-go="rpp-lp-akademik">Buka RPP &amp; LP</button><button class="akdl-btn primary" data-dl="RPP & LP">Download Excel</button></div></section>
<section class="akdl-card"><h2>Bilingual</h2><p>Rekap perkembangan program vocabulary bilingual.</p><ul class="akdl-list"><li>Sheet Ringkasan</li><li>Grafik progres/capaian</li><li>Detail per kelas dan periode</li><li>Perbandingan target dan capaian</li></ul><div class="akdl-actions"><button class="akdl-btn" data-go="bilingual">Buka Bilingual</button><button class="akdl-btn primary" data-dl="Bilingual">Download Excel</button></div></section>
</div><div class="akdl-note"><b>Format wajib:</b> seluruh hasil download memiliki Ringkasan + Grafik + Detail. Nilai menggunakan struktur Legger dengan satu sheet untuk setiap kelas.</div></div>`;
c.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>go(b.dataset.go));
c.querySelectorAll('[data-dl]').forEach(b=>b.onclick=()=>runDownload(b.dataset.dl,b));
};
window.__CQ_ACADEMIC_DOWNLOAD_DATA__=true;
})();