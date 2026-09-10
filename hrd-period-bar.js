/* CQlass HRD — Report Period Bar */
(function(){
  'use strict';
  if(window.__cqHrdPeriodBar) return;
  window.__cqHrdPeriodBar=true;

  function isHRD(){
    try{
      if(String(window.currentUser?.role||'').toLowerCase()==='hrd') return true;
      const u=JSON.parse(localStorage.getItem('cqlass_user')||'{}');
      return String(u.role||u.primary_role||u.role_code||'').toLowerCase()==='hrd';
    }catch(_){ return false; }
  }
  function fmt(v){
    if(!v) return '—';
    try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric'}).format(new Date(v+'T00:00:00+07:00'))}
    catch(_){return v}
  }
  function css(){
    if(document.getElementById('cq-hrd-period-bar-style')) return;
    const s=document.createElement('style');
    s.id='cq-hrd-period-bar-style';
    s.textContent=`
      .cq-hrd-periodbar{margin:12px 0 16px;background:#fff;border:1px solid #d9e8e6;border-radius:16px;padding:13px 15px;box-shadow:0 5px 18px rgba(21,74,74,.05)}
      .cq-hrd-periodbar-main{display:flex;align-items:center;justify-content:space-between;gap:14px}
      .cq-hrd-periodbar-label{font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#789090;font-weight:850;margin-bottom:4px}
      .cq-hrd-periodbar-range{font-size:15px;font-weight:850;color:#153f3f;line-height:1.35}
      .cq-hrd-periodbar-change{border:1px solid #cfe2df;background:#eef8f6;color:#0A6E6E;border-radius:11px;height:38px;padding:0 13px;font:800 11px Inter,sans-serif;cursor:pointer;white-space:nowrap}
      .cq-hrd-periodbar-edit{display:none;align-items:end;gap:9px;flex-wrap:wrap;padding-top:12px;margin-top:12px;border-top:1px dashed #dce8e7}
      .cq-hrd-periodbar.editing .cq-hrd-periodbar-edit{display:flex}
      .cq-hrd-periodbar-edit .hrd-date-field{min-width:160px;margin:0}
      .cq-hrd-periodbar-edit .hrd-apply{margin:0}
      @media(max-width:650px){.cq-hrd-periodbar-main{align-items:flex-start}.cq-hrd-periodbar-range{font-size:13px}.cq-hrd-periodbar-edit{display:none;grid-template-columns:1fr 1fr}.cq-hrd-periodbar.editing .cq-hrd-periodbar-edit{display:grid}.cq-hrd-periodbar-edit .hrd-date-field{min-width:0}.cq-hrd-periodbar-edit .hrd-apply{grid-column:1/-1;width:100%}}
    `;
    document.head.appendChild(s);
  }
  function mount(){
    if(!isHRD()) return;
    const kpis=document.querySelector('#hrd-root .hrd-kpis');
    const toolbar=document.querySelector('#hrd-root .hrd-admin-toolbar');
    const start=document.getElementById('hrd-date-start');
    const end=document.getElementById('hrd-date-end');
    if(!kpis||!toolbar||!start||!end) return;
    if(document.getElementById('cq-hrd-periodbar')) return;
    css();

    const startField=start.closest('.hrd-date-field');
    const endField=end.closest('.hrd-date-field');
    const apply=toolbar.querySelector('.hrd-apply');
    if(!startField||!endField||!apply) return;

    const bar=document.createElement('section');
    bar.id='cq-hrd-periodbar';
    bar.className='cq-hrd-periodbar';
    bar.innerHTML=`<div class="cq-hrd-periodbar-main"><div><div class="cq-hrd-periodbar-label">Periode Laporan</div><div class="cq-hrd-periodbar-range" id="cq-hrd-period-range">${fmt(start.value)} — ${fmt(end.value)}</div></div><button type="button" class="cq-hrd-periodbar-change">Ubah Tanggal</button></div><div class="cq-hrd-periodbar-edit"></div>`;
    kpis.insertAdjacentElement('afterend',bar);
    const edit=bar.querySelector('.cq-hrd-periodbar-edit');
    edit.append(startField,endField,apply);

    bar.querySelector('.cq-hrd-periodbar-change').onclick=function(){
      bar.classList.toggle('editing');
      this.textContent=bar.classList.contains('editing')?'Tutup':'Ubah Tanggal';
    };
    const sync=()=>{const x=document.getElementById('cq-hrd-period-range');if(x)x.textContent=fmt(start.value)+' — '+fmt(end.value)};
    start.addEventListener('change',sync);end.addEventListener('change',sync);
  }

  const root=document.getElementById('content')||document.body;
  const obs=new MutationObserver(function(){clearTimeout(window.__cqHrdPeriodBarTimer);window.__cqHrdPeriodBarTimer=setTimeout(mount,40)});
  obs.observe(root,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,80));
  setTimeout(mount,500);
})();
