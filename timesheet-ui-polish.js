/* CQlass — Timesheet UI polish: compact, aligned, responsive */
(function(){
'use strict';
if(window.__cqTimesheetUiPolish20260922)return;
window.__cqTimesheetUiPolish20260922=true;

function addStyle(){
  if(document.getElementById('cq-ts-ui-polish'))return;
  const s=document.createElement('style');
  s.id='cq-ts-ui-polish';
  s.textContent=`
/* === Timesheet shell === */
.tsv2{max-width:1320px!important;margin:0 auto!important}
.tsv2-head{margin-bottom:12px!important;align-items:center!important}
.tsv2-title{font-size:22px!important;line-height:1.15!important}
.tsv2-sub,.tsv2-help{font-size:11px!important;line-height:1.45!important}
.tsv2-card{border-radius:16px!important;padding:16px!important;margin-bottom:12px!important;box-shadow:0 2px 10px rgba(20,62,59,.035)!important}
.tsv2-card>b{display:block;font-size:16px!important;line-height:1.2!important;color:#173d3b!important;margin-bottom:3px!important}
.tsv2-in,.tsv2-sel{height:42px!important;border-radius:10px!important;font-size:12px!important;padding:0 12px!important}
.tsv2-btn{height:42px!important;padding:0 16px!important;border-radius:10px!important;font-size:11px!important;display:inline-flex!important;align-items:center!important;justify-content:center!important;white-space:nowrap!important}
.tsv2-field label{font-size:10px!important;line-height:1.2!important;margin-bottom:6px!important;color:#506965!important}

/* === Manual work activity: one clean aligned row === */
.tsv2-card:has(#tsv2-date){padding:17px 18px!important}
.tsv2-card:has(#tsv2-date)>.tsv2-help{display:block!important;max-width:1050px!important;margin-top:2px!important;color:#6c7f7c!important}
.tsv2-form{
  display:grid!important;
  grid-template-columns:170px 116px 116px minmax(215px,1fr) minmax(230px,1.08fr) 112px!important;
  grid-template-areas:'date start end activity note save'!important;
  gap:10px!important;
  align-items:end!important;
  margin-top:13px!important;
}
.tsv2-form>.tsv2-field:nth-child(1){grid-area:date!important}
.tsv2-form>.tsv2-field:nth-child(2){grid-area:start!important}
.tsv2-form>.tsv2-field:nth-child(3){grid-area:end!important}
.tsv2-form>.tsv2-field:nth-child(4){grid-area:activity!important}
.tsv2-form>.tsv2-field:nth-child(5){grid-area:note!important}
.tsv2-form>.tsv2-btn{grid-area:save!important;width:100%!important;min-width:0!important}

/* === Recurring activity card === */
.cqrec-card{padding:17px 18px!important;border-radius:16px!important;overflow:visible!important}
.cqrec-card:before{width:3px!important;border-radius:16px 0 0 16px!important}
.cqrec-head{margin-bottom:11px!important}
.cqrec-titleline{font-size:16px!important;gap:8px!important;color:#173d3b!important}
.cqrec-kicker{height:22px!important;padding:0 8px!important;border-radius:999px!important;font-size:8px!important}
.cqrec-help{font-size:10.5px!important;line-height:1.45!important;max-width:1000px!important;color:#6c7f7c!important}
.cqrec-form{
  display:grid!important;
  grid-template-columns:minmax(250px,1.65fr) 116px 116px minmax(260px,1.35fr) 112px!important;
  grid-template-areas:
    'name start end days save'
    'note note note note save'!important;
  gap:10px!important;
  align-items:end!important;
  padding:12px!important;
  border-radius:12px!important;
  background:#f8fbfb!important;
  border:1px solid #e4eeec!important;
}
.cqrec-activity{grid-area:name!important}
.cqrec-form>.cqrec-field:nth-child(2){grid-area:start!important}
.cqrec-form>.cqrec-field:nth-child(3){grid-area:end!important}
.cqrec-days-field{grid-area:days!important}
.cqrec-note{grid-area:note!important;margin:0!important}
.cqrec-save{grid-area:save!important;width:100%!important;height:100%!important;min-height:42px!important;align-self:stretch!important;min-width:0!important}
.cqrec-field>label{font-size:10px!important;line-height:1.2!important;margin-bottom:6px!important;color:#506965!important}
.cqrec-in{height:42px!important;border-radius:10px!important;padding:0 12px!important;font-size:12px!important}
.cqrec-days{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:6px!important;min-height:42px!important;align-items:end!important}
.cqrec-day{min-width:0!important;width:100%!important}
.cqrec-day span{width:100%!important;min-width:0!important;height:42px!important;border-radius:10px!important;padding:0 8px!important;font-size:10px!important}
.cqrec-list{margin-top:9px!important;gap:7px!important}
.cqrec-empty{padding:4px 2px 0!important;font-size:10px!important}
.cqrec-item{padding:9px 11px!important;border-radius:10px!important}
.cqrec-title{font-size:11px!important}
.cqrec-meta{font-size:9.5px!important}

/* === Medium screens: intentional rows, no awkward holes === */
@media(max-width:1250px){
  .tsv2-form{
    grid-template-columns:170px 110px 110px minmax(230px,1fr) 112px!important;
    grid-template-areas:
      'date start end activity save'
      'note note note note note'!important;
  }
  .cqrec-form{
    grid-template-columns:minmax(250px,1fr) 110px 110px minmax(250px,1fr)!important;
    grid-template-areas:
      'name start end days'
      'note note note save'!important;
  }
  .cqrec-save{height:42px!important;align-self:end!important}
}

@media(max-width:900px){
  .tsv2{max-width:none!important}
  .tsv2-form{
    grid-template-columns:1fr 1fr!important;
    grid-template-areas:
      'date date'
      'start end'
      'activity activity'
      'note note'
      'save save'!important;
  }
  .cqrec-form{
    grid-template-columns:1fr 1fr!important;
    grid-template-areas:
      'name name'
      'start end'
      'days days'
      'note note'
      'save save'!important;
  }
  .cqrec-days{grid-template-columns:repeat(5,1fr)!important}
  .cqrec-save{height:42px!important}
}

@media(max-width:560px){
  .tsv2-card,.cqrec-card{padding:14px!important;border-radius:14px!important}
  .tsv2-form,.cqrec-form{grid-template-columns:1fr!important}
  .tsv2-form{grid-template-areas:'date' 'start' 'end' 'activity' 'note' 'save'!important}
  .cqrec-form{grid-template-areas:'name' 'start' 'end' 'days' 'note' 'save'!important}
  .cqrec-days{grid-template-columns:repeat(5,1fr)!important;gap:5px!important}
  .cqrec-day span{padding:0 4px!important;font-size:9px!important}
}
`;
  document.head.appendChild(s);
}

function cleanText(root=document){
  const replacements=new Map([
    ['Aktivitas pada Jam Kosong','Aktivitas Kerja'],
    ['Kegiatan Jam Kosong','Jenis Aktivitas'],
    ['Jadwal rutin masuk otomatis; guru hanya melengkapi kegiatan pada jam kosong.','Jadwal rutin masuk otomatis; guru hanya melengkapi aktivitas kerja yang belum tercatat.'],
    ['Jadwal mengajar, badal, briefing, penyambutan siswa, dan administrasi/Eduhub masuk otomatis. Pada jam kosong pilih kegiatan yang benar, misalnya Jaga UKS, Badal, Administrasi, atau Kegiatan Lainnya.','Jadwal mengajar, badal, briefing, penyambutan siswa, dan administrasi/Eduhub masuk otomatis. Tambahkan hanya aktivitas kerja yang belum tercatat otomatis, misalnya Jaga UKS atau kegiatan lainnya.']
  ]);
  root.querySelectorAll('.tsv2 b,.tsv2 label,.tsv2-sub,.tsv2-help').forEach(el=>{
    const t=(el.textContent||'').trim();
    if(replacements.has(t))el.textContent=replacements.get(t);
  });
}

function apply(){addStyle();cleanText(document)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
const target=document.getElementById('content')||document.body;
new MutationObserver(()=>apply()).observe(target,{childList:true,subtree:true});
setTimeout(apply,500);setTimeout(apply,1500);
})();
