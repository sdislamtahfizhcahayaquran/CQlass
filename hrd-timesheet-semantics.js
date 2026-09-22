/* CQlass — HRD/Timesheet semantic correction */
(function(){
'use strict';
if(window.__cqSemanticFix20260921)return;window.__cqSemanticFix20260921=true;
const rawFetch=window.fetch.bind(window);
window.fetch=function(input,init){
  try{
    let raw=typeof input==='string'?input:input?.url||'';
    let next=raw;
    if(raw.includes('/functions/v1/hrd-live-report-v4')){}
    else if(raw.includes('/functions/v1/hrd-live-report-v3')) next=raw.replace('/functions/v1/hrd-live-report-v3','/functions/v1/hrd-live-report-v4');
    else if(raw.includes('/functions/v1/hrd-live-report-v2')) next=raw.replace('/functions/v1/hrd-live-report-v2','/functions/v1/hrd-live-report-v4');
    else if(raw.includes('/functions/v1/hrd-live-report')) next=raw.replace('/functions/v1/hrd-live-report','/functions/v1/hrd-live-report-v4');
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
    if(s==='Timesheet / JP')el.textContent='Timesheet';
    else if(/^\d+(?:[.,]\d+)?\s*JP\s*·\s*\d+\s*aktivitas$/i.test(s))el.textContent=s.replace(/^\d+(?:[.,]\d+)?\s*JP\s*·\s*/i,'')+' aktivitas';
    else if(s.includes('kelas-mapel memenuhi minimum rapor'))el.textContent=s.replace('kelas-mapel memenuhi minimum rapor','kelas-mapel memenuhi target 2 TP pekan ini');
    else if(/\d+\s*TP terisi\s*·/i.test(s))el.textContent=s.replace(/(\d+)\s*TP terisi/i,'$1/2 TP target pekan ini');
    else if(s==='Belum ada entry mengajar/JP pada periode ini.')el.textContent='Semua slot kerja sudah terisi penuh pada periode ini.';
  });
}
function patchTimesheetPage(){
  const root=document.querySelector('.tsv2');if(!root)return;
  const title=root.querySelector('.tsv2-title');if(title)title.textContent='Timesheet';
  const sub=root.querySelector('.tsv2-sub');if(sub)sub.textContent='Senin–Jumat: isi aktivitas produktif pada waktu kerja. Sabtu: seluruh jam kerja 07.30–12.00 ditampilkan sebagai satu timeline; mengajar/ekskul dan agenda HRD mengambil prioritas atas slot kerja umum.';
  const kpis=root.querySelector('.tsv2-kpis');if(kpis)kpis.style.display='none';
  root.querySelectorAll('.tsv2-card').forEach(card=>{
    const b=card.querySelector(':scope > b');const head=(b?.textContent||'').trim();
    if(head==='Aktivitas Timesheet'){
      const h=card.querySelector('.tsv2-help');if(h)h.textContent='Isi hanya pada waktu yang benar-benar bebas. Sistem menolak waktu yang bertabrakan dengan mengajar, badal, MT/Morning Talk, literasi, snack/istirahat, ishoma, briefing, penyambutan, Eduhub/administrasi rutin, UKS terjadwal, atau Timesheet yang sudah ada.';
    }
    if(/^Timesheet\s/i.test(head)){
      b.textContent='Timesheet';
      const h=card.querySelector('.tsv2-help');if(h)h.textContent='Senin–Jumat mengikuti waktu kerja. Sabtu mengikuti jam kerja 07.30–12.00 dengan prioritas penugasan sekolah dan agenda HRD.';
      const table=card.querySelector('.tsv2-table');if(table){
        table.querySelectorAll('tbody tr').forEach(tr=>{const first=(tr.querySelector('td')?.textContent||'').trim();const isSat=/Sab/i.test(first);const badge=(tr.querySelector('.tsv2-badge')?.textContent||'').trim();const recurring=tr.dataset.recurring==='1';if(!isSat&&!recurring&&badge&&badge!=='Diisi guru')tr.style.display='none'});
        table.querySelectorAll('th:nth-child(6),td:nth-child(6)').forEach(x=>x.style.display='none');
      }
    }
  });
}
function patchTimesheetPopup(){
  const title=document.getElementById('cqcat-title');if(!title)return;
  if(!/Timesheet/i.test(title.textContent||''))return;
  title.textContent='Timesheet';
  const body=document.getElementById('cqcat-body');if(!body)return;
  const groups=[...body.querySelectorAll('.cqcat-group')];
  groups.forEach(g=>{
    const h=g.querySelector('h5');const txt=(h?.textContent||'').trim();
    if(/Mengajar\s*\/\s*JP/i.test(txt)){
      if(h)h.textContent='Waktu kerja belum terisi penuh';
      g.classList.remove('done');g.classList.add('todo');
      g.querySelectorAll('.cqts-empty').forEach(x=>{if(/mengajar|JP/i.test(x.textContent||''))x.textContent='Semua slot kerja sudah terisi penuh pada periode ini.'});
    }else if(/Aktivitas Kerja/i.test(txt)&&h)h.textContent='Aktivitas produktif yang sudah dicatat';
  });
}
function patch(){patchText();patchTimesheetPage();patchTimesheetPopup()}
let timer=null;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(patch,40)}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',()=>setTimeout(patch,100));setTimeout(patch,500);
})();