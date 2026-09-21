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
      .iac{width:100%;max-width:1460px;min-width:0;overflow:hidden}
      .iac-card{width:100%;max-width:100%;min-width:0;overflow:hidden}
      .iac-row{
        width:100%;max-width:100%;min-width:0;
        grid-template-columns:minmax(150px,1.25fr) minmax(90px,.7fr) minmax(145px,1fr) minmax(145px,1fr) minmax(145px,.9fr) minmax(160px,.95fr)!important;
        gap:10px!important;
      }
      .iac-row>*{min-width:0;max-width:100%}
      .iac-input,.iac-select{width:100%!important;max-width:100%!important;min-width:0!important;box-sizing:border-box!important}
      .iac-actions{
        width:100%;max-width:100%;min-width:0;
        display:grid!important;
        grid-template-columns:repeat(3,minmax(0,1fr));
        gap:6px!important;
        align-items:center;
      }
      .iac-actions .iac-btn{width:100%;min-width:0;padding:8px 6px;white-space:nowrap}
      .iac-ex-form,.iac-ex-item{width:100%;max-width:100%;min-width:0}
      .iac-ex-form>* ,.iac-ex-item>*{min-width:0;max-width:100%}
      @media(max-width:1200px){
        .iac-row{grid-template-columns:minmax(150px,1.25fr) minmax(90px,.75fr) minmax(140px,1fr) minmax(140px,1fr)!important}
        .iac-row>*:nth-child(5){grid-column:1/3!important}
        .iac-row>*:nth-child(6){grid-column:3/5!important}
        .iac-actions{grid-template-columns:repeat(3,minmax(0,1fr))}
      }
      @media(max-width:760px){
        .iac-row{grid-template-columns:1fr!important}
        .iac-row>*:nth-child(5),.iac-row>*:nth-child(6){grid-column:1!important}
        .iac-th{display:none!important}
        .iac-actions{grid-template-columns:repeat(3,minmax(0,1fr))}
      }
      @media(max-width:430px){
        .iac-actions{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(s);
  }

  inject();
  document.addEventListener('DOMContentLoaded',inject);
  new MutationObserver(inject).observe(document.documentElement,{childList:true,subtree:true});
})();
