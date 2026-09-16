/* CQlass — drag-fill checkbox Rapor Kegiatan untuk Walas */
(function(){
  'use strict';
  if(window.__cqSchoolActivityDragFill)return;
  window.__cqSchoolActivityDragFill=true;

  const SPECIAL=['luthfi','aryobimo'];
  const username=()=>{try{return String(currentUser?.username||'').toLowerCase()}catch(_){return''}};
  const isSpecial=()=>SPECIAL.includes(username());
  const D={active:false,root:null,code:'',value:false,last:null};

  function fireChange(el){
    try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch(_){}
  }
  function apply(el){
    if(!D.active||!el||el.disabled||el.dataset.code!==D.code||el===D.last)return;
    el.checked=D.value;
    D.last=el;
    fireChange(el);
  }
  function stop(){
    if(!D.active)return;
    D.active=false;D.root=null;D.code='';D.last=null;
    document.body.classList.remove('cq-activity-dragging');
  }
  function install(root){
    if(!root||root.dataset.activityDragInstalled==='1'||isSpecial())return;
    root.dataset.activityDragInstalled='1';

    root.addEventListener('pointerdown',function(e){
      const el=e.target?.closest?.('.sar-check.editable:not(:disabled)');
      if(!el||!root.contains(el))return;
      e.preventDefault();
      D.active=true;
      D.root=root;
      D.code=String(el.dataset.code||'');
      D.value=!el.checked;
      D.last=null;
      el.dataset.activityManualPointer='1';
      apply(el);
      document.body.classList.add('cq-activity-dragging');
    });

    root.addEventListener('click',function(e){
      const el=e.target?.closest?.('.sar-check.editable:not(:disabled)');
      if(!el)return;
      if(el.dataset.activityManualPointer==='1'){
        e.preventDefault();
        delete el.dataset.activityManualPointer;
      }
    },true);
  }

  document.addEventListener('pointermove',function(e){
    if(!D.active||!D.root)return;
    const under=document.elementFromPoint(e.clientX,e.clientY);
    const el=under?.closest?.('.sar-check.editable:not(:disabled)');
    if(el&&D.root.contains(el)&&el.dataset.code===D.code)apply(el);
  },{passive:true});
  document.addEventListener('pointerup',stop);
  document.addEventListener('pointercancel',stop);

  function scan(){
    if(isSpecial())return;
    const root=document.getElementById('sar-root');
    if(root)install(root);
  }

  const st=document.createElement('style');
  st.textContent=`
    #sar-root .sar-check.editable:not(:disabled){cursor:crosshair;touch-action:none}
    #sar-root td:has(.sar-check.editable:not(:disabled)){cursor:crosshair;user-select:none}
    body.cq-activity-dragging{user-select:none}
  `;
  document.head.appendChild(st);

  const obs=new MutationObserver(()=>setTimeout(scan,0));
  function start(){
    obs.observe(document.body,{childList:true,subtree:true});
    scan();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
