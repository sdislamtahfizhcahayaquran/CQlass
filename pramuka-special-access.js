/* CQlass — akses khusus Input Pramuka untuk akun luthfi & aryobimo */
(function(){
  'use strict';
  if(window.__cqPramukaSpecialAccess)return;
  window.__cqPramukaSpecialAccess=true;

  const SPECIAL=['luthfi','aryobimo'];
  const username=()=>{try{return String(currentUser?.username||'').toLowerCase()}catch(_){return''}};
  const isSpecial=()=>SPECIAL.includes(username());
  const DRAG={active:false,value:false,root:null,last:null};

  function fireChange(el){
    try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch(_){}
  }
  function applyDragBox(el){
    if(!el||el.disabled||el.dataset.code!=='PRAMUKA')return;
    if(el===DRAG.last)return;
    el.checked=DRAG.value;
    DRAG.last=el;
    fireChange(el);
  }
  function installDragFill(root){
    if(!root||root.dataset.pramukaDragInstalled==='1')return;
    root.dataset.pramukaDragInstalled='1';

    root.addEventListener('pointerdown',function(e){
      const el=e.target?.closest?.('.sar-check[data-code="PRAMUKA"]');
      if(!el||el.disabled)return;
      e.preventDefault();
      DRAG.active=true;
      DRAG.value=!el.checked;
      DRAG.root=root;
      DRAG.last=null;
      el.dataset.pramukaManualPointer='1';
      applyDragBox(el);
      document.body.classList.add('cq-pramuka-dragging');
    });

    root.addEventListener('click',function(e){
      const el=e.target?.closest?.('.sar-check[data-code="PRAMUKA"]');
      if(!el||el.disabled)return;
      if(el.dataset.pramukaManualPointer==='1'){
        e.preventDefault();
        delete el.dataset.pramukaManualPointer;
      }
    },true);
  }

  document.addEventListener('pointermove',function(e){
    if(!DRAG.active||!DRAG.root)return;
    const under=document.elementFromPoint(e.clientX,e.clientY);
    const el=under?.closest?.('.sar-check[data-code="PRAMUKA"]');
    if(el&&DRAG.root.contains(el))applyDragBox(el);
  },{passive:true});
  document.addEventListener('pointerup',function(){
    if(!DRAG.active)return;
    DRAG.active=false;DRAG.root=null;DRAG.last=null;
    document.body.classList.remove('cq-pramuka-dragging');
  });
  document.addEventListener('pointercancel',function(){
    DRAG.active=false;DRAG.root=null;DRAG.last=null;
    document.body.classList.remove('cq-pramuka-dragging');
  });

  function pruneToPramuka(){
    if(!isSpecial())return;
    const root=document.getElementById('sar-root');
    if(!root)return;
    root.classList.add('pramuka-only');
    const h=root.querySelector('.sar-head h2');
    const p=root.querySelector('.sar-head p');
    if(h)h.textContent='Input Pramuka';
    if(p)p.textContent='Pilih kelas, klik Edit, lalu klik atau tahan dan tarik pada kolom Pramuka. Setelah selesai klik Simpan.';
    const range=root.querySelector('.sar-range');
    if(range)range.style.display='none';
    const info=root.querySelector('.sar-info');
    if(info)info.textContent='Kolom Pramuka bisa diisi cepat: tahan kotak lalu tarik ke atas/bawah. Data tersimpan setelah menekan Simpan.';

    root.querySelectorAll('[data-head-code]').forEach(th=>{
      th.style.display=th.dataset.headCode==='PRAMUKA'?'':'none';
    });
    root.querySelectorAll('.sar-check').forEach(ch=>{
      const td=ch.closest('td');
      if(td)td.style.display=ch.dataset.code==='PRAMUKA'?'':'none';
    });
    const pred=[...root.querySelectorAll('thead th')].find(th=>String(th.textContent||'').trim()==='Predikat');
    if(pred)pred.style.display='none';
    root.querySelectorAll('tbody tr').forEach(tr=>{
      const cells=[...tr.children];
      const last=cells[cells.length-1];
      if(last&&last.querySelector('.sar-grade'))last.style.display='none';
    });
    installDragFill(root);
  }

  function watchReport(){
    let n=0;
    const t=setInterval(()=>{pruneToPramuka();if(++n>40)clearInterval(t)},75);
  }

  function openInput(btn){
    window.__cqPramukaInputOnly=true;
    try{if(typeof activeModule!=='undefined')activeModule='input-pramuka'}catch(_){}
    document.querySelectorAll('#sidebar .nav-item').forEach(x=>x.classList.remove('active'));
    if(btn)btn.classList.add('active');
    const content=document.getElementById('content');
    if(!content)return;
    if(typeof window.renderSchoolActivityReport==='function'){
      window.renderSchoolActivityReport(content);
      watchReport();
    }else{
      content.innerHTML='<div class="kv2"><div class="kv2-card"><span class="spinner"></span> Memuat Input Pramuka...</div></div>';
      let tries=0;
      const wait=setInterval(()=>{
        if(typeof window.renderSchoolActivityReport==='function'){
          clearInterval(wait);window.renderSchoolActivityReport(content);watchReport();
        }else if(++tries>50){clearInterval(wait);content.innerHTML='<div class="kv2"><div class="kv2-card kv2-empty">Modul Input Pramuka belum termuat. Silakan refresh halaman.</div></div>'}
      },100);
    }
  }

  function removeGenericSpecialMenu(sb){
    if(!isSpecial())return;
    [...sb.querySelectorAll('.nav-item')].forEach(item=>{
      if(String(item.textContent||'').trim()==='Rapor Kegiatan')item.remove();
    });
  }

  function inject(){
    if(!isSpecial())return;
    const sb=document.getElementById('sidebar');
    if(!sb)return;
    removeGenericSpecialMenu(sb);
    if(sb.querySelector('[data-pramuka-special-group="1"]'))return;

    const head=document.createElement('div');
    head.className='nav-group-head open';
    head.dataset.pramukaSpecialGroup='1';
    head.innerHTML='<span>PRAMUKA</span><svg class="nav-chevron" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    const sub=document.createElement('div');
    sub.className='nav-group-items';
    sub.dataset.pramukaSpecialItems='1';
    const item=document.createElement('div');
    item.className='nav-item nav-item-sub';
    item.dataset.pramukaInput='1';
    item.innerHTML='<span>Input Pramuka</span>';
    item.onclick=()=>openInput(item);
    sub.appendChild(item);
    head.onclick=function(){
      const open=head.classList.toggle('open');
      sub.style.display=open?'':'none';
    };
    sb.appendChild(head);sb.appendChild(sub);
  }

  const st=document.createElement('style');
  st.textContent=`
    #sar-root.pramuka-only .sar-table{min-width:520px!important}
    #sar-root.pramuka-only .sar-act-head{min-width:150px!important}
    #sar-root.pramuka-only .sar-check[data-code="PRAMUKA"]:not(:disabled){cursor:crosshair;touch-action:none}
    #sar-root.pramuka-only td:has(.sar-check[data-code="PRAMUKA"]:not(:disabled)){cursor:crosshair;user-select:none}
    body.cq-pramuka-dragging{user-select:none}
  `;
  document.head.appendChild(st);

  const obs=new MutationObserver(()=>setTimeout(()=>{inject();pruneToPramuka()},0));
  function start(){
    const sb=document.getElementById('sidebar');
    if(sb)obs.observe(sb,{childList:true,subtree:true});
    inject();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
  setInterval(inject,900);
})();
