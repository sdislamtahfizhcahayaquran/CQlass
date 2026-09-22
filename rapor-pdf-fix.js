(function(){
  'use strict';

  function twoFrames(){
    return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }

  async function waitPageReady(page){
    if(document.fonts && document.fonts.ready){
      try{ await document.fonts.ready; }catch(_){ }
    }
    if(typeof window.rpWaitForImages === 'function'){
      await window.rpWaitForImages(page);
    }else{
      await Promise.all([...page.querySelectorAll('img')].map(img => {
        if(img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.addEventListener('load', resolve, {once:true});
          img.addEventListener('error', resolve, {once:true});
        });
      }));
    }
    await twoFrames();
  }

  function ensureExportStyles(){
    if(document.getElementById('rapor-pdf-export-fix-style')) return;
    const style=document.createElement('style');
    style.id='rapor-pdf-export-fix-style';
    style.textContent=`
      .rpv-export-page{box-shadow:none!important;margin:0!important;overflow:hidden!important}

      .rpv-export-page.rpv-page-one{
        padding:13mm 11mm 10mm!important;
        font-size:9.3px!important;
        line-height:1.16!important;
      }
      .rpv-export-page.rpv-page-one .rpv-template-head td{height:6.7mm!important;padding:1px 3px!important}
      .rpv-export-page.rpv-page-one .rpv-template-head .head-left{font-size:10.3px!important}
      .rpv-export-page.rpv-page-one .rpv-template-head .head-right{font-size:9.3px!important}
      .rpv-export-page.rpv-page-one .rpv-template-shadow{height:1.5mm!important;margin-bottom:2.4mm!important}
      .rpv-export-page.rpv-page-one .rpv-section-plain{font-size:10px!important;margin-bottom:1.5px!important}
      .rpv-export-page.rpv-page-one .rpv-tahfizh{font-size:8.6px!important;margin-bottom:1.8mm!important}
      .rpv-export-page.rpv-page-one .rpv-tahfizh td{height:3.6mm!important;padding:0 2px!important}
      .rpv-export-page.rpv-page-one .rpv-academic{font-size:7.2px!important;line-height:1.02!important}
      .rpv-export-page.rpv-page-one .rpv-academic th{font-size:6.9px!important;line-height:1.02!important;padding:.7px 1px!important}
      .rpv-export-page.rpv-page-one .rpv-academic td{height:3.8mm!important;padding:.35px 1.2px!important}
      .rpv-export-page.rpv-page-one .rpv-academic .no{width:4%!important}
      .rpv-export-page.rpv-page-one .rpv-academic .subject{width:27%!important}
      .rpv-export-page.rpv-page-one .rpv-academic .kktp{width:14%!important}
      .rpv-export-page.rpv-page-one .rpv-academic .lo{width:6.1%!important}
      .rpv-export-page.rpv-page-one .rpv-academic .remarks{width:24.5%!important}
      .rpv-export-page.rpv-page-one .rpv-academic .rpv-sub{padding-left:7px!important}
      .rpv-export-page.rpv-page-one .rpv-att-grid{grid-template-columns:64% 34%!important;gap:2%!important;margin-top:2px!important}
      .rpv-export-page.rpv-page-one .rpv-attendance,
      .rpv-export-page.rpv-page-one .rpv-score-table{font-size:7.2px!important}
      .rpv-export-page.rpv-page-one .rpv-attendance th,
      .rpv-export-page.rpv-page-one .rpv-attendance td,
      .rpv-export-page.rpv-page-one .rpv-score-table th,
      .rpv-export-page.rpv-page-one .rpv-score-table td{height:4.7mm!important;padding:.6px 1.5px!important}
      .rpv-export-page.rpv-page-one .rpv-score-table{margin-top:14px!important}
      .rpv-export-page.rpv-page-one .rpv-footer{left:11mm!important;right:11mm!important;font-size:8.5px!important}

      .rpv-export-page.rpv-page-two{
        padding:14mm 11mm 10mm!important;
        font-size:9.2px!important;
        line-height:1.18!important;
      }
      .rpv-export-page.rpv-page-two .rpv-p2-section{font-size:10.2px!important;margin-bottom:3px!important}
      .rpv-export-page.rpv-page-two .rpv-p2-sub{font-size:9px!important;margin-top:6px!important;margin-bottom:2px!important}
      .rpv-export-page.rpv-page-two .rpv-exkul,
      .rpv-export-page.rpv-page-two .rpv-discipline,
      .rpv-export-page.rpv-page-two .rpv-merit{font-size:8.5px!important;line-height:1.12!important}
      .rpv-export-page.rpv-page-two .rpv-exkul th,
      .rpv-export-page.rpv-page-two .rpv-exkul td,
      .rpv-export-page.rpv-page-two .rpv-discipline th,
      .rpv-export-page.rpv-page-two .rpv-discipline td,
      .rpv-export-page.rpv-page-two .rpv-merit th,
      .rpv-export-page.rpv-page-two .rpv-merit td{height:auto!important;min-height:5mm!important;padding:1.5px 3px!important}
      .rpv-export-page.rpv-page-two .rpv-total-line{font-size:8.6px!important;padding:3px!important}
      .rpv-export-page.rpv-page-two .rpv-date-center{top:170mm!important;font-size:9px!important;line-height:1.35!important}
      .rpv-export-page.rpv-page-two .rpv-signatures{left:11mm!important;right:11mm!important;top:185mm!important;height:34mm!important;font-size:9px!important}
      .rpv-export-page.rpv-page-two .rpv-signatures .name,
      .rpv-export-page.rpv-page-two .rpv-signatures .blank-line{margin-top:27mm!important}
      .rpv-export-page.rpv-page-two .rpv-signatures .name{font-size:9px!important}
      .rpv-export-page.rpv-page-two .rpv-signature-img{top:4mm!important;max-height:21mm!important}
      .rpv-export-page.rpv-page-two .rpv-team-area{left:11mm!important;right:11mm!important;top:224mm!important;font-size:8.5px!important;column-gap:5mm!important}
      .rpv-export-page.rpv-page-two .rpv-team-title{margin-bottom:2px!important}
      .rpv-export-page.rpv-page-two .rpv-team-simple td,
      .rpv-export-page.rpv-page-two .rpv-position-list div{padding:1px 0!important}
      .rpv-export-page.rpv-page-two .rpv-footer{left:11mm!important;right:11mm!important;font-size:8.5px!important}
    `;
    document.head.appendChild(style);
  }

  const originalInject=window.injectRaporPreviewStyles;
  if(typeof originalInject === 'function'){
    window.injectRaporPreviewStyles=function(){
      originalInject.apply(this, arguments);
      ensureExportStyles();
    };
  }
  ensureExportStyles();

  window.rpElementPdfBlob=async function(el){
    await window.rpEnsurePdfLibs(false);
    ensureExportStyles();

    const sourcePages=[...el.querySelectorAll('.rpv-paper')];
    if(!sourcePages.length) throw new Error('Halaman rapor tidak ditemukan.');

    const {jsPDF}=window.jspdf||{};
    if(!jsPDF) throw new Error('Library PDF belum siap.');

    const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
    const stage=document.createElement('div');
    stage.setAttribute('aria-hidden','true');
    stage.style.cssText='position:fixed;left:-12000px;top:0;width:210mm;height:297mm;overflow:hidden;background:#fff;z-index:-9999;';
    document.body.appendChild(stage);

    try{
      for(let i=0;i<sourcePages.length;i++){
        const page=sourcePages[i].cloneNode(true);
        page.classList.add('rpv-export-page', i===0 ? 'rpv-page-one' : 'rpv-page-two');
        page.style.width='210mm';
        page.style.height='297mm';
        page.style.minHeight='297mm';
        page.style.maxHeight='297mm';
        stage.replaceChildren(page);

        await waitPageReady(page);
        const rect=page.getBoundingClientRect();
        const canvas=await window.html2canvas(page,{
          scale:2,
          useCORS:true,
          allowTaint:false,
          backgroundColor:'#ffffff',
          logging:false,
          scrollX:0,
          scrollY:0,
          width:Math.ceil(rect.width),
          height:Math.ceil(rect.height),
          windowWidth:Math.ceil(rect.width),
          windowHeight:Math.ceil(rect.height)
        });

        if(i>0) pdf.addPage('a4','portrait');
        pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'FAST');
      }
    }finally{
      stage.remove();
    }

    return pdf.output('blob');
  };
})();