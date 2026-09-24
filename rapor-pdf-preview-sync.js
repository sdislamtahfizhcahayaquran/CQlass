/* CQlass — PDF must mirror the live Rapor preview.
   Capture the exact rendered A4 page while keeping the same desktop viewport/media-query state as preview. */
(function(){
  'use strict';
  if(window.__cqRaporPdfPreviewSyncV1)return;
  window.__cqRaporPdfPreviewSyncV1=true;

  function install(){
    if(typeof rpElementPdfBlob!=='function'||typeof rpEnsurePdfLibs!=='function'||typeof rpWaitForImages!=='function'){
      return setTimeout(install,50);
    }
    if(rpElementPdfBlob.__cqPreviewSyncV1)return;

    const render=async function(el){
      await rpEnsurePdfLibs(false);
      const pages=[...el.querySelectorAll('.rpv-paper')];
      if(!pages.length)throw new Error('Halaman rapor tidak ditemukan.');
      const {jsPDF}=window.jspdf||{};
      if(!jsPDF)throw new Error('Library PDF belum siap.');

      if(document.fonts?.ready){try{await document.fonts.ready}catch(_){}}

      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      const viewportWidth=Math.max(document.documentElement?.clientWidth||0,window.innerWidth||0,1200);
      const viewportHeight=Math.max(document.documentElement?.clientHeight||0,window.innerHeight||0,900);

      for(let i=0;i<pages.length;i++){
        const page=pages[i];
        await rpWaitForImages(page);
        const rect=page.getBoundingClientRect();
        const width=Math.max(1,Math.ceil(rect.width));
        const height=Math.max(1,Math.ceil(rect.height));

        const canvas=await window.html2canvas(page,{
          scale:3.2,
          useCORS:true,
          allowTaint:false,
          backgroundColor:'#ffffff',
          logging:false,
          scrollX:0,
          scrollY:0,
          width,
          height,
          windowWidth:viewportWidth,
          windowHeight:viewportHeight,
          imageSmoothingEnabled:true,
          onclone:doc=>{
            doc.querySelectorAll('.rpv-paper').forEach(p=>{
              p.style.boxShadow='none';
              p.style.margin='0';
            });
          }
        });

        if(i>0)pdf.addPage('a4','portrait');
        pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'SLOW');
        canvas.width=1;
        canvas.height=1;
      }
      return pdf.output('blob');
    };

    render.__cqPreviewSyncV1=true;
    rpElementPdfBlob=render;
    window.rpElementPdfBlob=render;
  }

  install();
})();
