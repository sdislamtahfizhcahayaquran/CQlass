/* CQlass — Timesheet UI system: compact, aligned, responsive */
(function(){
'use strict';
if(window.__cqTimesheetUiPolish20260922V2)return;
window.__cqTimesheetUiPolish20260922V2=true;

function addStyle(){
  if(document.getElementById('cq-ts-ui-polish-v2'))return;
  const s=document.createElement('style');
  s.id='cq-ts-ui-polish-v2';
  s.textContent=`
/* ===== Shell ===== */
.tsv2{max-width:1360px!important;margin:0 auto!important;color:#173d3b!important}
.tsv2 *{box-sizing:border-box}
.tsv2-head{display:flex!important;justify-content:space-between!important;align-items:center!important;gap:14px!important;flex-wrap:wrap!important;margin-bottom:12px!important;padding:0 2px!important}
.tsv2-title{font-size:23px!important;line-height:1.15!important;font-weight:900!important;letter-spacing:-.02em!important;color:#173d3b!important}
.tsv2-sub{font-size:11px!important;line-height:1.45!important;color:#6c7f7c!important;margin-top:3px!important}
.tsv2-tools{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important}
.tsv2-tools .tsv2-in,.tsv2-tools .tsv2-sel{min-width:150px!important}
.tsv2-teacher-chip{display:inline-flex;align-items:center;gap:7px;height:34px;padding:0 11px;border:1px solid #dce8e6;border-radius:999px;background:#fff;color:#173d3b;font-size:10.5px;font-weight:800;box-shadow:0 1px 4px rgba(23,61,59,.04)}
.tsv2-teacher-chip:before{content:'';width:7px;height:7px;border-radius:50%;background:#0b7e78;box-shadow:0 0 0 3px #e2f4f1}
.tsv2-in,.tsv2-sel{height:40px!important;border:1px solid #d5e3e1!important;background:#fff!important;border-radius:10px!important;padding:0 11px!important;font:inherit!important;font-size:11px!important;color:#173d3b!important;outline:none!important;box-shadow:none!important}
.tsv2-in:focus,.tsv2-sel:focus{border-color:#0b7e78!important;box-shadow:0 0 0 3px rgba(11,126,120,.08)!important}
.tsv2-btn{min-height:40px!important;border:0!important;border-radius:10px!important;background:#08746f!important;color:#fff!important;padding:0 15px!important;font-size:10.5px!important;font-weight:900!important;cursor:pointer!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important;box-shadow:none!important}
.tsv2-btn:hover{filter:brightness(.97)}
.tsv2-btn.alt{background:#edf6f5!important;color:#12645f!important}
.tsv2-btn.danger{background:#fff0ed!important;color:#a84738!important}
.tsv2-card{background:#fff!important;border:1px solid #dce8e6!important;border-radius:15px!important;padding:15px 16px!important;margin-bottom:10px!important;box-shadow:0 2px 10px rgba(20,62,59,.025)!important}
.tsv2-card>b{display:block!important;font-size:15px!important;line-height:1.25!important;color:#173d3b!important;margin:0 0 3px!important}
.tsv2-help{font-size:10px!important;line-height:1.45!important;color:#718481!important}

/* ===== KPI strip ===== */
.tsv2-kpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:8px!important;margin:0 0 10px!important}
.tsv2-kpi{min-height:70px!important;background:#fff!important;border:1px solid #dce8e6!important;border-radius:13px!important;padding:10px 12px!important;display:flex!important;flex-direction:column!important;justify-content:center!important;box-shadow:none!important}
.tsv2-kpi b{font-size:21px!important;line-height:1!important;color:#08746f!important;margin-bottom:6px!important}
.tsv2-kpi span{font-size:8.5px!important;line-height:1.25!important;color:#718481!important;font-weight:900!important;text-transform:uppercase!important;letter-spacing:.025em!important}

/* ===== One-time activity form ===== */
.tsv2-entry-card{padding:15px 16px!important}
.tsv2-entry-card>.tsv2-help{display:block!important;max-width:1080px!important;margin-top:2px!important}
.tsv2-form{display:grid!important;grid-template-columns:160px 106px 106px minmax(210px,1fr) minmax(210px,1fr) minmax(185px,.8fr) 104px!important;grid-template-areas:'date start end activity note photo save'!important;gap:8px!important;align-items:end!important;margin-top:11px!important}
.tsv2-field{min-width:0!important}
.tsv2-field label{display:block!important;font-size:9.5px!important;line-height:1.2!important;font-weight:800!important;color:#526c68!important;margin:0 0 5px!important}
.tsv2-field .tsv2-in,.tsv2-field .tsv2-sel{width:100%!important;min-width:0!important}
.tsv2-form>.tsv2-field:nth-child(1){grid-area:date!important}
.tsv2-form>.tsv2-field:nth-child(2){grid-area:start!important}
.tsv2-form>.tsv2-field:nth-child(3){grid-area:end!important}
.tsv2-form>.tsv2-field:nth-child(4){grid-area:activity!important}
.tsv2-form>.tsv2-field:nth-child(5){grid-area:note!important}
.tsv2-form>.ts-photo-field{grid-area:photo!important}
.tsv2-form>.tsv2-btn:last-child{grid-area:save!important;width:100%!important;min-width:0!important}
.ts-photo-field input{width:100%!important;height:40px!important;padding:7px 8px!important;border:1px dashed #cadbd8!important;border-radius:10px!important;background:#fbfdfd!important;font-size:9px!important;color:#5c7470!important}
.ts-photo-note{display:none!important}
.ts-photo-required input{border-color:#e2a29a!important;background:#fff9f8!important}
.ts-photo-required label{color:#a84738!important}

/* ===== Recurring ===== */
.cqrec-card{padding:15px 16px!important;border-radius:15px!important;overflow:hidden!important}
.cqrec-card:before{width:3px!important;background:#0b7e78!important}
.cqrec-head{margin:0 0 10px!important}
.cqrec-titleline{font-size:15px!important;line-height:1.25!important;gap:7px!important;color:#173d3b!important}
.cqrec-kicker{height:20px!important;padding:0 7px!important;border-radius:999px!important;background:#e9f6f4!important;color:#0b6e69!important;font-size:7.5px!important}
.cqrec-help{font-size:10px!important;line-height:1.45!important;color:#718481!important;max-width:1080px!important}
.cqrec-form{display:grid!important;grid-template-columns:minmax(230px,1.45fr) 106px 106px minmax(280px,1.25fr) 104px!important;grid-template-areas:'name start end days save' 'note note note note save'!important;gap:8px!important;align-items:end!important;padding:10px!important;background:#f8fbfb!important;border:1px solid #e4eeec!important;border-radius:12px!important}
.cqrec-activity{grid-area:name!important}
.cqrec-form>.cqrec-field:nth-child(2){grid-area:start!important}
.cqrec-form>.cqrec-field:nth-child(3){grid-area:end!important}
.cqrec-days-field{grid-area:days!important}
.cqrec-note{grid-area:note!important;margin:0!important}
.cqrec-save{grid-area:save!important;width:100%!important;height:100%!important;min-height:40px!important;align-self:stretch!important;min-width:0!important}
.cqrec-field>label{font-size:9.5px!important;line-height:1.2!important;margin:0 0 5px!important;color:#526c68!important;font-weight:800!important}
.cqrec-in{width:100%!important;height:40px!important;border-radius:10px!important;padding:0 11px!important;font-size:11px!important}
.cqrec-days{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:5px!important;min-height:40px!important;align-items:end!important}
.cqrec-day{min-width:0!important;width:100%!important}
.cqrec-day span{width:100%!important;min-width:0!important;height:40px!important;border-radius:9px!important;padding:0 5px!important;font-size:9px!important}
.cqrec-list{display:grid!important;gap:6px!important;margin-top:8px!important}
.cqrec-empty{padding:3px 1px 0!important;font-size:9.5px!important;color:#718481!important}
.cqrec-item{padding:8px 10px!important;border-radius:10px!important;border-color:#e5eeec!important}
.cqrec-title{font-size:10.5px!important}
.cqrec-meta{font-size:9px!important}
.cqrec-item .tsv2-btn{min-height:32px!important;padding:0 10px!important;font-size:9px!important}

/* ===== Timeline ===== */
.tsv2-timeline-card{padding:15px 16px!important}
.tsv2-tablewrap{overflow:auto!important;border:1px solid #dfeae8!important;border-radius:11px!important;background:#fff!important}
.tsv2-table{width:100%!important;min-width:800px!important;border-collapse:separate!important;border-spacing:0!important;table-layout:auto!important}
.tsv2-table th,.tsv2-table td{padding:8px 9px!important;border-bottom:1px solid #edf2f1!important;text-align:left!important;font-size:9.5px!important;line-height:1.35!important;vertical-align:middle!important}
.tsv2-table th{position:sticky!important;top:0!important;z-index:2!important;background:#f5f9f8!important;font-size:8px!important;text-transform:uppercase!important;letter-spacing:.035em!important;color:#687d79!important;font-weight:900!important}
.tsv2-table tbody tr:last-child td{border-bottom:0!important}
.tsv2-table tbody tr:hover td{background:#fbfdfd!important}
.tsv2-table th:nth-child(1),.tsv2-table td:nth-child(1){width:120px!important;white-space:nowrap!important}
.tsv2-table th:nth-child(2),.tsv2-table td:nth-child(2){width:115px!important;white-space:nowrap!important}
.tsv2-table th:nth-child(3),.tsv2-table td:nth-child(3){width:105px!important}
.tsv2-table th:nth-child(6),.tsv2-table td:nth-child(6){width:170px!important}
.tsv2-table th:nth-child(7),.tsv2-table td:nth-child(7){width:70px!important;text-align:right!important}
.tsv2-badge{display:inline-flex!important;align-items:center!important;min-height:22px!important;border-radius:999px!important;padding:3px 7px!important;font-size:8px!important;font-weight:900!important}
.tsv2-cert,.ts-evidence-actions{gap:5px!important;flex-wrap:wrap!important}
.tsv2-cert .tsv2-btn,.ts-evidence-actions .tsv2-btn,.tsv2-table .tsv2-btn{min-height:30px!important;height:30px!important;padding:0 9px!important;font-size:8.5px!important;border-radius:8px!important}
.tsv2-file{font-size:8px!important;max-width:145px!important}
.tsv2-empty{padding:24px!important;font-size:10px!important;color:#718481!important}

/* ===== Desktop squeeze: use deliberate rows, never overflow ===== */
@media(max-width:1280px){
  .tsv2-form{grid-template-columns:155px 102px 102px minmax(210px,1fr) minmax(210px,1fr) 104px!important;grid-template-areas:'date start end activity note save' 'photo photo photo photo photo save'!important}
  .ts-photo-field input{max-width:320px!important}
  .cqrec-form{grid-template-columns:minmax(230px,1fr) 102px 102px minmax(260px,1fr)!important;grid-template-areas:'name start end days' 'note note note save'!important}
  .cqrec-save{height:40px!important;align-self:end!important}
}

@media(max-width:980px){
  .tsv2{max-width:none!important}
  .tsv2-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}
  .tsv2-form{grid-template-columns:1fr 1fr!important;grid-template-areas:'date date' 'start end' 'activity activity' 'note note' 'photo photo' 'save save'!important}
  .ts-photo-field input{max-width:none!important}
  .cqrec-form{grid-template-columns:1fr 1fr!important;grid-template-areas:'name name' 'start end' 'days days' 'note note' 'save save'!important}
  .cqrec-days{grid-template-columns:repeat(5,1fr)!important}
  .cqrec-save{height:40px!important}
  .tsv2-table{min-width:760px!important}
}

@media(max-width:620px){
  .tsv2-head{display:block!important}
  .tsv2-tools{margin-top:9px!important;display:grid!important;grid-template-columns:1fr 1fr!important}
  .tsv2-tools>*{min-width:0!important;width:100%!important}
  .tsv2-tools .tsv2-sel:first-child{grid-column:1/-1!important}
  .tsv2-kpis{grid-template-columns:1fr 1fr!important;gap:6px!important}
  .tsv2-kpi{min-height:64px!important;padding:9px 10px!important}
  .tsv2-card,.cqrec-card{padding:13px!important;border-radius:13px!important}
  .tsv2-form,.cqrec-form{grid-template-columns:1fr!important}
  .tsv2-form{grid-template-areas:'date' 'start' 'end' 'activity' 'note' 'photo' 'save'!important}
  .cqrec-form{grid-template-areas:'name' 'start' 'end' 'days' 'note' 'save'!important}
  .cqrec-days{grid-template-columns:repeat(5,1fr)!important;gap:4px!important}
  .cqrec-day span{padding:0 3px!important;font-size:8.5px!important}
  .tsv2-table{min-width:720px!important}
}
`;
  document.head.appendChild(s);
}

function textReplace(root=document){
  const replacements=new Map([
    ['Aktivitas pada Jam Kosong','Tambah Aktivitas Kerja'],
    ['Aktivitas Kerja','Tambah Aktivitas Kerja'],
    ['Kegiatan Jam Kosong','Jenis Aktivitas'],
    ['Kegiatan Berulang','Pola Aktivitas Mingguan'],
    ['Jadwal rutin masuk otomatis; guru hanya melengkapi kegiatan pada jam kosong.','Jadwal rutin masuk otomatis. Tambahkan hanya aktivitas kerja yang belum tercatat.'],
    ['Jadwal rutin masuk otomatis; guru hanya melengkapi aktivitas kerja yang belum tercatat.','Jadwal rutin masuk otomatis. Tambahkan hanya aktivitas kerja yang belum tercatat.'],
    ['Jadwal mengajar, badal, briefing, penyambutan siswa, dan administrasi/Eduhub masuk otomatis. Pada jam kosong pilih kegiatan yang benar, misalnya Jaga UKS, Badal, Administrasi, atau Kegiatan Lainnya.','Mengajar, badal, briefing, penyambutan siswa, dan administrasi/Eduhub masuk otomatis. Isi bagian ini hanya untuk aktivitas tambahan seperti Jaga UKS atau kegiatan lainnya.'],
    ['Jadwal mengajar, badal, briefing, penyambutan siswa, dan administrasi/Eduhub masuk otomatis. Tambahkan hanya aktivitas kerja yang belum tercatat otomatis, misalnya Jaga UKS atau kegiatan lainnya.','Mengajar, badal, briefing, penyambutan siswa, dan administrasi/Eduhub masuk otomatis. Isi bagian ini hanya untuk aktivitas tambahan seperti Jaga UKS atau kegiatan lainnya.'],
    ['Atur sekali, lalu Timesheet menampilkannya otomatis setiap pekan. Mengajar, badal, UKS, dan rutinitas sekolah tetap menjadi prioritas.','Atur satu kali untuk aktivitas rutin. Jadwal mengajar, badal, UKS, dan agenda sekolah tetap menjadi prioritas.']
  ]);
  root.querySelectorAll('.tsv2 b,.tsv2 label,.tsv2-sub,.tsv2-help,.cqrec-titleline,.cqrec-help').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(replacements.has(t))el.textContent=replacements.get(t);
  });
}

function markCards(root=document){
  const scope=root.querySelector('.tsv2');
  if(!scope)return;
  const cards=[...scope.querySelectorAll(':scope .tsv2-card')];
  for(const card of cards){
    if(card.querySelector('#tsv2-date'))card.classList.add('tsv2-entry-card');
    const title=(card.querySelector(':scope > b')?.textContent||'').trim();
    if(/^Timesheet\b/i.test(title))card.classList.add('tsv2-timeline-card');
  }
}

function mergeTeacher(root=document){
  const scope=root.querySelector('.tsv2');
  const head=scope?.querySelector('.tsv2-head');
  if(!scope||!head)return;
  const cards=[...scope.querySelectorAll(':scope #tsv2-body > .tsv2-card')];
  const teacherCard=cards.find(c=>/Nama Guru/i.test(c.textContent||''));
  if(!teacherCard)return;
  const name=(teacherCard.querySelector('b')?.textContent||'').trim();
  if(name&&!head.querySelector('.tsv2-teacher-chip')){
    const chip=document.createElement('div');
    chip.className='tsv2-teacher-chip';
    chip.textContent=name;
    const titleBox=head.firstElementChild;
    if(titleBox)titleBox.appendChild(chip);
  }
  teacherCard.remove();
}

function cleanLabels(root=document){
  const photoLabel=root.querySelector('#tsv2-photo-label');
  if(photoLabel&&/Foto Bukti/i.test(photoLabel.textContent||''))photoLabel.textContent='Bukti Foto (opsional)';
  const save=root.querySelector('.tsv2-form > .tsv2-btn:last-child');
  if(save&&save.textContent.trim()==='Simpan')save.textContent='Simpan';
  const h6=root.querySelector('.tsv2-table thead th:nth-child(6)');
  if(h6)h6.textContent='Bukti';
  const h7=root.querySelector('.tsv2-table thead th:nth-child(7)');
  if(h7)h7.textContent='Aksi';
}

function apply(){
  addStyle();
  textReplace(document);
  markCards(document);
  mergeTeacher(document);
  cleanLabels(document);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(apply,0));else setTimeout(apply,0);
const target=document.getElementById('content')||document.body;
let raf=0;
new MutationObserver(()=>{cancelAnimationFrame(raf);raf=requestAnimationFrame(apply)}).observe(target,{childList:true,subtree:true});
setTimeout(apply,400);setTimeout(apply,1200);setTimeout(apply,2400);
})();
