/* CQlass — HRD/Timesheet semantic correction */
(function(){
'use strict';
if(window.__cqSemanticFix20260921)return;window.__cqSemanticFix20260921=true;
const rawFetch=window.fetch.bind(window);
window.fetch=function(input,init){
  try{
    let raw=typeof input==='string'?input:input?.url||'';
    let next=raw;
    // HRD Live Report tetap memakai endpoint stabil utama.
    // Jangan rewrite ke v4: rantai v4 -> v3 -> v2 menambah latency dan dapat memicu AbortError/Failed to fetch.
    if(raw.includes('/functions/v1/teacher-timesheet-v2')){}
    else if(raw.includes('/functions/v1/teacher-timesheet')) next=raw.replace('/functions/v1/teacher-timesheet','/functions/v1/teacher-timesheet-v2');
    if(next!==raw) input=typeof input==='string'?next:new Request(next,input);
  }catch(_){}
  return rawFetch(input,init);
};
function isHrd(){return String(window.currentUser?.role||'').toLowerCase()==='hrd'||(Array.isArray(window.currentUser?.roles)&&window.currentUser.roles.map(x=>String(x||'').toLowerCase()).includes('hrd'))}
function patchText(){
  document.querySelectorAll('body *').forEach(el=>{
    if(el.children.length)return;
    const s=(el.textContent||'').trim();
    if(s==='Timesheet / JP')el.textContent='Timesheet';
    else if(/^\d+(?:[.,]\d+)?\s*JP\s*·\s*\d+\s*aktivitas$/i.test(s))el.textContent=s.replace(/^\d+(?:[.,]\d+)?\s*JP\s*·\s*/i,'')+' aktivitas';
    else if(s.includes('kelas-mapel memenuhi minimum rapor'))el.textContent=s.replace('kelas-mapel memenuhi minimum rapor','kelas-mapel memenuhi target 2 TP pekan ini');
    else if(/\d+\s*TP terisi\s*·/i.test(s))el.textContent=s.replace(/(\d+)\s*TP terisi/i,'$1/2 TP target pekan ini');
    else if(s==='Belum ada entry mengajar/JP pada periode ini.')el.textContent='Belum ada data Timesheet pada periode ini.';
  });
}
function patchTimesheetPage(){
  const root=document.querySelector('.tsv2');if(!root)return;
  const hrd=isHrd();
  const title=root.querySelector('.tsv2-title');if(title)title.textContent='Timesheet';
  const sub=root.querySelector('.tsv2-sub');if(sub)sub.textContent=hrd?'Mode HRD — hanya melihat. Seluruh aktivitas kerja guru ditampilkan dalam satu timeline.':'Senin–Jumat: aktivitas kerja ditampilkan dalam satu timeline. Sabtu: seluruh jam kerja 07.30–12.00 mengikuti penugasan sekolah dan agenda HRD.';
  const kpis=root.querySelector('.tsv2-kpis');if(kpis)kpis.style.display=hrd?'grid':'none';
  root.querySelectorAll('.tsv2-card').forEach(card=>{
    const b=card.querySelector(':scope > b');const head=(b?.textContent||'').trim();
    if(head==='Aktivitas Timesheet'||head==='Aktivitas pada Jam Kosong'||head==='Aktivitas Pendukung'){
      if(b)b.textContent='Aktivitas Pendukung';
      const h=card.querySelector('.tsv2-help');if(h)h.textContent='Isi hanya pada waktu yang benar-benar bebas dari penugasan terjadwal. Sistem menolak waktu yang bertabrakan dengan mengajar, badal, MT/Morning Talk, literasi, snack/istirahat, ishoma, briefing, penyambutan, Eduhub/administrasi rutin, UKS terjadwal, atau Timesheet yang sudah ada.';
      if(hrd)card.style.display='none';
    }
    if(/^Timesheet\s/i.test(head)){
      b.textContent='Timesheet';
      const h=card.querySelector('.tsv2-help');if(h)h.textContent='Timeline kerja guru. JP hanya informasi beban mengajar dan bukan penentu tunggal kelengkapan Timesheet.';
      const table=card.querySelector('.tsv2-table');if(table){
        if(hrd)table.querySelectorAll('tbody tr').forEach(tr=>tr.style.display='');
        if(hrd)table.querySelectorAll('th:nth-child(6),td:nth-child(6),th:nth-child(7),td:nth-child(7)').forEach(x=>x.style.display='none');
        else table.querySelectorAll('th:nth-child(6),td:nth-child(6)').forEach(x=>x.style.display='none');
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
      if(h)h.textContent='Data mengajar';
      g.querySelectorAll('.cqts-empty').forEach(x=>{if(/mengajar|JP/i.test(x.textContent||''))x.textContent='Belum ada data mengajar pada periode ini.'});
    }else if(/Aktivitas Kerja/i.test(txt)&&h)h.textContent='Aktivitas produktif yang sudah dicatat';
  });
}
function openTeacherTimesheet(teacherId){
  if(!teacherId)return;
  try{if(typeof setActiveModule==='function')setActiveModule('timesheet')}catch(_){}
  let n=0;const apply=()=>{
    n++;
    try{
      if(typeof window.tsv2Teacher==='function'){
        window.tsv2Teacher(teacherId);
        return;
      }
      const sel=document.querySelector('.tsv2-sel');
      if(sel){sel.value=teacherId;sel.dispatchEvent(new Event('change',{bubbles:true}));return}
    }catch(_){}
    if(n<20)setTimeout(apply,120);
  };
  setTimeout(apply,60);
}
function patchHrdCards(){
  if(!isHrd())return;
  document.querySelectorAll('.hrd-admin-card[id^="hrd-teacher-"]').forEach(card=>{
    const teacherId=String(card.id||'').replace(/^hrd-teacher-/,'');if(!teacherId)return;
    const teacher=card.querySelector('.hrd-admin-card-head .hrd-teacher');
    if(teacher&&!teacher.dataset.hrdTsOpen){
      teacher.dataset.hrdTsOpen='1';teacher.style.cursor='pointer';teacher.title='Klik untuk membuka Timesheet lengkap guru';
      teacher.addEventListener('click',()=>openTeacherTimesheet(teacherId));
    }
    card.querySelectorAll('.hrd-admin-chip').forEach(btn=>{
      const label=(btn.querySelector('.hrd-chip-top b')?.textContent||'').trim();
      if(label!=='Timesheet'||btn.dataset.hrdTsOpen)return;
      btn.dataset.hrdTsOpen='1';btn.title='Buka Timesheet lengkap guru';
      btn.addEventListener('click',ev=>{ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();openTeacherTimesheet(teacherId)},true);
    });
  });
}
window.hrdOpenTeacherTimesheet=openTeacherTimesheet;
function patch(){patchText();patchTimesheetPage();patchTimesheetPopup();patchHrdCards()}
let timer=null;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(patch,40)}).observe(document.documentElement,{childList:true,subtree:true});
document.addEventListener('DOMContentLoaded',()=>setTimeout(patch,100));setTimeout(patch,500);
})();