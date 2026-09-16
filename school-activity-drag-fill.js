/* CQlass — universal centered checkbox + robust drag-fill Rapor Kegiatan */
(function(){
  'use strict';
  if(window.__cqSchoolActivityDragFillV2)return;
  window.__cqSchoolActivityDragFillV2=true;

  const D={active:false,root:null,code:'',value:false,last:null,suppressClickUntil:0};

  function fireChange(el){
    try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch(_){}
  }

  function editableBoxFromTarget(target){
    if(!target?.closest)return null;
    const root=target.closest('#sar-root');
    if(!root)return null;
    let box=target.closest('.sar-check.editable:not(:disabled)');
    if(box)return box;
    const cell=target.closest('td');
    if(cell)box=cell.querySelector('.sar-check.editable:not(:disabled)');
    return box||null;
  }

  function boxForRowAtPoint(x,y){
    if(!D.active||!D.root)return null;
    const under=document.elementFromPoint(x,y);
    if(!under||!D.root.contains(under))return null;
    const row=under.closest('tbody tr[data-student]');
    if(!row)return null;
    return row.querySelector('.sar-check.editable:not(:disabled)[data-code="'+CSS.escape(D.code)+'"]');
  }

  function apply(el){
    if(!D.active||!el||el.disabled||el.dataset.code!==D.code||el===D.last)return;
    el.checked=D.value;
    D.last=el;
    fireChange(el);
  }

  function stop(){
    if(!D.active)return;
    D.active=false;
    D.root=null;
    D.code='';
    D.last=null;
    D.suppressClickUntil=performance.now()+450;
    document.body.classList.remove('cq-activity-dragging');
  }

  /* Capture phase: take control before native checkbox click / legacy drag handlers. */
  document.addEventListener('pointerdown',function(e){
    const el=editableBoxFromTarget(e.target);
    if(!el)return;
    const root=el.closest('#sar-root');
    if(!root)return;

    e.preventDefault();
    e.stopImmediatePropagation();

    D.active=true;
    D.root=root;
    D.code=String(el.dataset.code||'');
    D.value=!el.checked;
    D.last=null;
    apply(el);
    document.body.classList.add('cq-activity-dragging');

    try{el.setPointerCapture?.(e.pointerId)}catch(_){}
  },true);

  document.addEventListener('pointermove',function(e){
    if(!D.active)return;
    e.preventDefault();
    const el=boxForRowAtPoint(e.clientX,e.clientY);
    if(el)apply(el);
  },{capture:true,passive:false});

  document.addEventListener('pointerup',function(e){
    if(!D.active)return;
    e.preventDefault();
    e.stopImmediatePropagation();
    stop();
  },true);

  document.addEventListener('pointercancel',stop,true);
  window.addEventListener('blur',stop);

  /* Prevent the browser click after our pointer sequence from toggling the box a second time. */
  document.addEventListener('click',function(e){
    if(performance.now()>D.suppressClickUntil)return;
    const el=editableBoxFromTarget(e.target);
    if(!el)return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },true);

  const st=document.createElement('style');
  st.id='cq-activity-grid-fix-style';
  st.textContent=`
    #sar-root .sar-table td:has(.sar-check){
      text-align:center!important;
      vertical-align:middle!important;
      padding-left:0!important;
      padding-right:0!important;
    }
    #sar-root .sar-check{
      display:block!important;
      float:none!important;
      position:static!important;
      width:20px!important;
      height:20px!important;
      margin:0 auto!important;
      padding:0!important;
      transform:none!important;
      box-sizing:border-box!important;
    }
    #sar-root .sar-check.editable:not(:disabled),
    #sar-root td:has(.sar-check.editable:not(:disabled)){
      cursor:crosshair!important;
      touch-action:none!important;
      user-select:none!important;
    }
    body.cq-activity-dragging,
    body.cq-activity-dragging *{
      user-select:none!important;
      cursor:crosshair!important;
    }
  `;
  document.head.appendChild(st);
})();
