/* CQlass — akses khusus Input Pramuka untuk akun luthfi & aryobimo */
(function(){
  'use strict';
  if(window.__cqPramukaSpecialAccess)return;
  window.__cqPramukaSpecialAccess=true;

  const SPECIAL=['luthfi','aryobimo'];
  const username=()=>{try{return String(currentUser?.username||'').toLowerCase()}catch(_){return''}};
  const isSpecial=()=>SPECIAL.includes(username());

  function pruneToPramuka(){
    if(!isSpecial())return;
    const root=document.getElementById('sar-root');
    if(!root)return;
    root.classList.add('pramuka-only');
    const h=root.querySelector('.sar-head h2');
    const p=root.querySelector('.sar-head p');
    if(h)h.textContent='Input Pramuka';
    if(p)p.textContent='Pilih kelas, klik Edit, lalu centang siswa yang mengikuti Pramuka dan klik Simpan.';
    const range=root.querySelector('.sar-range');
    if(range)range.style.display='none';
    const info=root.querySelector('.sar-info');
    if(info)info.textContent='Khusus akun Lutfi dan Bimo. Data Pramuka akan terbaca otomatis di Rapor Kegiatan wali kelas.';

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
  st.textContent='#sar-root.pramuka-only .sar-table{min-width:520px!important}#sar-root.pramuka-only .sar-act-head{min-width:150px!important}';
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
