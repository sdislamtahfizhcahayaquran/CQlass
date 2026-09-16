/* CQlass — fix layout toolbar Data Ekskul agar Reset Filter tetap di dalam card */
(function(){
  'use strict';
  function apply(){
    if(document.getElementById('kx-layout-fix-1')) return;
    const s=document.createElement('style');
    s.id='kx-layout-fix-1';
    s.textContent=`
      #kx-root .kx-toolbar{
        width:100%;
        box-sizing:border-box;
        grid-template-columns:minmax(0,1.25fr) minmax(0,.95fr) minmax(0,1.15fr) minmax(0,1.15fr) 112px;
      }
      #kx-root .kx-toolbar > *{
        min-width:0;
        max-width:100%;
        box-sizing:border-box;
      }
      #kx-root .kx-toolbar .kx-reset{
        width:112px;
        min-width:112px;
        max-width:112px;
        justify-self:end;
        white-space:normal;
        line-height:1.2;
        padding-left:10px;
        padding-right:10px;
      }
      @media(max-width:1250px){
        #kx-root .kx-toolbar{
          grid-template-columns:minmax(0,1.2fr) minmax(0,.9fr) minmax(0,1fr) minmax(0,1fr);
        }
        #kx-root .kx-toolbar .kx-reset{
          grid-column:1/-1;
          justify-self:end;
          width:auto;
          min-width:112px;
          max-width:none;
          white-space:nowrap;
        }
      }
      @media(max-width:850px){
        #kx-root .kx-toolbar{grid-template-columns:1fr 1fr;}
        #kx-root .kx-toolbar .kx-reset{
          grid-column:auto;
          justify-self:stretch;
          width:100%;
          min-width:0;
        }
      }
      @media(max-width:620px){
        #kx-root .kx-toolbar{grid-template-columns:1fr;}
        #kx-root .kx-toolbar .kx-reset{width:100%;}
      }
    `;
    document.head.appendChild(s);
  }
  apply();
  document.addEventListener('DOMContentLoaded',apply);
  setTimeout(apply,500);
})();
