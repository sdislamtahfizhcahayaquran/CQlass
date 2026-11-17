/* CQlass — Periode & Kunci Input: layout containment fix */
(function(){
  'use strict';
  if(window.__cqInputAccessLayoutFix)return;
  window.__cqInputAccessLayoutFix=true;

  function inject(){
    if(document.getElementById('cq-input-access-layout-fix'))return;
    const s=document.createElement('style');
    s.id='cq-input-access-layout-fix';
    s.textContent=`
      .iac,.iac *{box-sizing:border-box}
      .iac{width:100%;max-width:1180px;margin:0 auto;min-width:0}
      .iac-card{width:100%;max-width:100%;min-width:0;overflow:visible}
      .iac-row.iac-th{display:none!important}
      .iac-row:not(.iac-th){display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:12px 14px!important;align-items:end!important;padding:16px 0!important}
      .iac-row>*{min-width:0;max-width:100%}
      .iac-row:not(.iac-th)>div:nth-child(1){grid-column:1;align-self:center}
      .iac-row:not(.iac-th)>div:nth-child(2){grid-column:2;align-self:center}
      .iac-row:not(.iac-th)>div:nth-child(6){grid-column:3;grid-row:1;align-self:center}
      .iac-row:not(.iac-th)>div:nth-child(3),.iac-row:not(.iac-th)>div:nth-child(4),.iac-row:not(.iac-th)>div:nth-child(5){grid-row:2}
      .iac-row:not(.iac-th)>div:nth-child(3)::before,.iac-row:not(.iac-th)>div:nth-child(4)::before,.iac-row:not(.iac-th)>div:nth-child(5)::before{display:block;margin:0 0 6px;font-size:11px;font-weight:700;color:#5f7775}
      .iac-row:not(.iac-th)>div:nth-child(3)::before{content:'Mulai input'}
      .iac-row:not(.iac-th)>div:nth-child(4)::before{content:'Batas akhir (deadline)'}
      .iac-row:not(.iac-th)>div:nth-child(5)::before{content:'Mode'}
      .iac-name{font-size:14px!important;font-weight:800!important;color:#123634}
      .iac-key{font-size:11px!important;color:#8aa09e!important}
      .iac-pill{font-size:11.5px!important;padding:6px 11px!important}
      .iac-input,.iac-select{width:100%!important;max-width:100%!important;min-width:0!important;height:42px!important;font-size:13px!important;font-weight:600!important}
      .iac-actions{display:flex!important;justify-content:flex-end;gap:6px!important;flex-wrap:wrap}
      .iac-actions .iac-btn{width:auto!important;min-width:76px;min-height:36px;padding:0 14px!important;font-size:12.5px!important;white-space:nowrap}
      .iac-ex-form{grid-template-columns:repeat(4,minmax(0,1fr)) auto!important;gap:12px!important;align-items:end}
      .iac-ex-form>*,.iac-ex-item>*{min-width:0;max-width:100%}
      .iac-label{font-size:11px!important;text-transform:none!important;letter-spacing:0!important;color:#5f7775!important;font-weight:700!important}
      .iac-help,.iac-ex-item,.iac-log,.iac-empty{font-size:12px!important}
      .iac-section-title{font-size:16px!important}.iac-section-sub{font-size:12.5px!important}
      @media(max-width:1250px){.iac-ex-form{grid-template-columns:repeat(2,minmax(0,1fr))!important}.iac-ex-form>*:last-child{grid-column:1/-1}}
      @media(max-width:760px){
        .iac-row:not(.iac-th){grid-template-columns:1fr!important}
        .iac-row:not(.iac-th)>div{grid-column:1!important;grid-row:auto!important}
        .iac-actions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))}
        .iac-actions .iac-btn{min-width:0;width:100%!important}
        .iac-ex-form{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(s);
  }

  inject();
  document.addEventListener('DOMContentLoaded',inject);
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();
