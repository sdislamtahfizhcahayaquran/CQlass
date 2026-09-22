/* CQlass — final Timesheet cascade + copy cleanup */
(function(){
'use strict';
if(window.__cqTimesheetUiOrderFix20260922V2)return;
window.__cqTimesheetUiOrderFix20260922V2=true;

let moving=false;
function ensureLast(){
  if(moving)return;
  const head=document.head;
  const polish=document.getElementById('cq-ts-ui-polish-v2');
  if(!head||!polish)return;
  const conflicts=['tsv2-css','cqrec-css','ts-evidence-css'];
  let later=false;
  for(const id of conflicts){
    const el=document.getElementById(id);
    if(el&&(polish.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING)){later=true;break;}
  }
  if(!later)return;
  moving=true;
  head.appendChild(polish);
  requestAnimationFrame(()=>{moving=false});
}

function copyFix(){
  const title=document.querySelector('.cqrec-titleline');
  if(title){
    for(const n of [...title.childNodes]){
      if(n.nodeType===Node.TEXT_NODE&&/Kegiatan Berulang/i.test(n.nodeValue||'')){
        n.nodeValue=(n.nodeValue||'').replace(/Kegiatan Berulang/i,'Pola Aktivitas Mingguan');
      }
    }
  }
  const sub=document.querySelector('.tsv2-sub');
  if(sub&&/jam kosong/i.test(sub.textContent||''))sub.textContent='Jadwal rutin masuk otomatis. Tambahkan hanya aktivitas kerja yang belum tercatat.';
  document.querySelectorAll('.tsv2-field label').forEach(el=>{
    if(/Kegiatan Jam Kosong/i.test(el.textContent||''))el.textContent='Jenis Aktivitas';
  });
}

function apply(){ensureLast();copyFix()}
const headObserver=new MutationObserver(()=>requestAnimationFrame(apply));
if(document.head)headObserver.observe(document.head,{childList:true});
const bodyObserver=new MutationObserver(()=>requestAnimationFrame(copyFix));
if(document.body)bodyObserver.observe(document.body,{childList:true,subtree:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply);else apply();
setTimeout(apply,300);setTimeout(apply,900);setTimeout(apply,1800);setTimeout(apply,3500);
})();