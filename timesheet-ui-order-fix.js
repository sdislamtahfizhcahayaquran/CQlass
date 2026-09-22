/* CQlass — keep final Timesheet UI stylesheet last in cascade */
(function(){
'use strict';
if(window.__cqTimesheetUiOrderFix20260922)return;
window.__cqTimesheetUiOrderFix20260922=true;

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
    if(el&&polish.compareDocumentPosition(el)&Node.DOCUMENT_POSITION_FOLLOWING){later=true;break;}
  }
  if(!later)return;
  moving=true;
  head.appendChild(polish);
  requestAnimationFrame(()=>{moving=false});
}

const mo=new MutationObserver(()=>requestAnimationFrame(ensureLast));
if(document.head)mo.observe(document.head,{childList:true});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ensureLast);else ensureLast();
setTimeout(ensureLast,300);setTimeout(ensureLast,900);setTimeout(ensureLast,1800);setTimeout(ensureLast,3500);
})();