/* CQlass — HRD/Timesheet semantic correction */
(function(){
'use strict';
if(window.__cqSemanticFix20260921)return;window.__cqSemanticFix20260921=true;
const rawFetch=window.fetch.bind(window);
window.fetch=function(input,init){
  try{
    let raw=typeof input==='string'?input:input?.url||'';
    let next=raw;
    if(raw.includes('/functions/v1/hrd-live-report-v3')){}
    else if(raw.includes('/functions/v1/hrd-live-report-v2')) next=raw.replace('/functions/v1/hrd-live-report-v2','/functions/v1/hrd-live-report-v3');
    else if(raw.includes('/functions/v1/hrd-live-report')) next=raw.replace('/functions/v1/hrd-live-report','/functions/v1/hrd-live-report-v3');
    if(raw.includes('/functions/v1/teacher-timesheet-v2')){}
    else if(raw.includes('/functions/v1/teacher-timesheet')) next=raw.replace('/functions/v1/teacher-timesheet','/functions/v1/teacher-timesheet-v2');
    if(next!==raw) input=typeof input==='string'?next:new Request(next,input);
  }catch(_){}
  return rawFetch(input,init);
};
function patchText(){
  document.querySelectorAll('body *').forEach(el=>{
    if(el.children.length)return;
    const s=(el.textContent||'').trim();
    if(s==='Timesheet / JP')el.textContent='Timesheet Jam Kosong';
    else if(/^\d+(?:[.,]\d+)?\s*JP\s*·\s*\d+\s*aktivitas$/i.test(s))el.textContent=s.replace(/^\d+(?:[.,]\d+)?\s*JP\s*·\s*/i,'')+' jam kosong';
    else if(s.includes('kelas-mapel memenuhi minimum rapor'))el.textContent=s.replace('kelas-mapel memenuhi minimum rapor','kelas-mapel memenuhi target 2 TP pekan ini');
    else if(/\d+\s*TP terisi\s*·/i.test(s))el.textContent=s.replace(/(\d+)\s*TP terisi/i,'$1/2 TP target pekan ini');
  });
}
function patchTimesheetPage(){
  const root=document.querySelector('.tsv2');if(!root)return;
  const title=root.querySelector('.tsv2-title');if(title)title.textContent='Timesheet Jam Kosong';
  const sub=root.querySelector('.tsv2-sub');if(sub)sub.textContent='Timesheet hanya untuk kegiatan produktif pada slot yang benar-benar kosong—di luar mengajar dan di luar rutinitas sekolah.';
  const kpis=root.querySelector('.tsv2-kpis');if(kpis)kpis.style.display='none';
  root.querySelectorAll('.tsv2-card').forEach(card=>{
    const b=card.querySelector(':scope > b');const head=(b?.textContent||'').trim();
    if(head==='Aktivitas pada Jam Kosong'){
      const h=card.querySelector('.tsv2-help');if(h)h.textContent='Isi hanya pada jam yang benar-benar bebas. Sistem menolak waktu yang bertabrakan dengan mengajar, badal, MT/Morning Talk, literasi, snack/istirahat, ishoma, briefing, penyambutan, Eduhub/administrasi rutin, UKS terjadwal, atau Timesheet yang sudah ada.';
    }
    if(/^Timesheet\s/i.test(head)){
      b.textContent=head.replace(/^Timesheet/,'Isian Timesheet Jam Kosong');
      const h=card.querySelector('.tsv2-help');if(h)h.textContent='Yang dihitung sebagai Timesheet hanya aktivitas produktif yang diisi guru pada jam kosong.';
      const table=card.querySelector('.tsv2-table');if(table){
        table.querySelectorAll('tbody tr').forEach(tr=>{const badge=(tr.querySelector('.tsv2-badge')?.textContent||'').trim();if(badge&&badge!=='Diisi guru')tr.style.display='none'});
        table.querySelectorAll('th:nth-child(6),td:nth-child(6)').forEach(x=>x.style.display='none');
      }
    }
  });
}
function patchTimesheetPopup(){
  const title=document.getElementById('cqcat-title');if(!title)return;
  if(!/Timesheet/i.test(title.textContent||''))return;
  title.textContent='Timesheet Jam Kosong';
  const body=document.getElementById('cqcat-body');if(!body)return;
  const groups=[...body.querySelectorAll('.cqcat-group')];
  groups.forEach(g=>{const h=g.querySelector('h5');const txt=(h?.textContent||'').trim();if(/Mengajar\s*\/\s*JP/i.test(txt))g.remove();else if(/Aktivitas Kerja/i.test(txt)&&h)h.textContent='Aktivitas produktif pada jam kosong'});
}
function patch(){patchText();patchTimesheetPage();patchTimesheetPopup()}
let timer=null;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(patch,40)}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',()=>setTimeout(patch,100));setTimeout(patch,500);
})();
