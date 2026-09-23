/* CQlass — Tahfizh report preview polish
   Preview and PDF share the exact same A4 DOM. Tahfizh values are normalized
   for English report wording, while preserving raw CQlass data semantics. */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_REPORT_PREVIEW_POLISH_V1__)return;
  window.__CQ_TAHFIZH_REPORT_PREVIEW_POLISH_V1__=1;

  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const empty=v=>!clean(v)||clean(v)==='-';
  const numberOnly=v=>/^[-+]?\d+(?:[.,]\d+)?$/.test(clean(v));
  function qty(v,singular,plural){
    let s=clean(v);if(empty(s))return '-';
    s=s.replace(/\b(ayat)\b/gi,'Verses').replace(/\b(surat|surah)\b/gi,'Surahs').replace(/\b(baris)\b/gi,'Lines');
    if(!numberOnly(s))return s;
    const n=Number(s.replace(',','.'));
    return `${s} ${n===1?singular:plural}`;
  }
  function pct(v){const s=clean(v);if(empty(s))return '-';return /%$/.test(s)?s:`${s}%`}
  function wording(v){
    return clean(v)
      .replace(/\bdriling\b/gi,'Drilling')
      .replace(/\bdrillling\b/gi,'Drilling')
      .replace(/\b(\d+(?:[.,]\d+)?)\s*ayat\b/gi,'$1 Verses')
      .replace(/\b(\d+(?:[.,]\d+)?)\s*(surat|surah)\b/gi,'$1 Surahs')
      .replace(/\b(\d+(?:[.,]\d+)?)\s*baris\b/gi,'$1 Lines');
  }

  function css(){
    if(document.getElementById('cq-tahfizh-report-preview-polish-css'))return;
    const s=document.createElement('style');s.id='cq-tahfizh-report-preview-polish-css';s.textContent=`
      #rpv-preview .rpv-tahfizh{width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 3.2mm;font-size:10.5px;line-height:1.18;color:#111}
      #rpv-preview .rpv-tahfizh td{border:.65px solid #333;padding:1.15mm 1.65mm;vertical-align:middle;background:#fff;height:5.35mm;box-sizing:border-box}
      #rpv-preview .rpv-tahfizh td:first-child{width:43%;font-weight:600}
      #rpv-preview .rpv-tahfizh td:nth-child(2){width:4%;text-align:center;padding-left:0;padding-right:0}
      #rpv-preview .rpv-tahfizh td:nth-child(3){width:53%;font-weight:500;word-break:break-word}
      #rpv-preview .rpv-tahfizh td.sub{padding-left:6mm;font-weight:500}
      #rpv-preview .rpv-tahfizh tr:nth-child(4) td{border-bottom-color:#333}
      #rpv-preview .rpv-tahfizh tr:last-child td{font-weight:600}
      #rpv-preview .rpv-section-plain:first-of-type{margin-bottom:1.25mm;font-weight:800}
      #rpv-preview .rpv-paper{image-rendering:auto;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
      @media print{
        #rpv-preview .rpv-tahfizh td{border-color:#222!important;background:#fff!important;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      }
    `;document.head.appendChild(s);
  }

  function polishTahfizh(){
    css();
    document.querySelectorAll('#rpv-preview .rpv-tahfizh').forEach(table=>{
      table.dataset.cqTemplate='tahfizh-a4-v1';
      [...table.querySelectorAll('tbody tr')].forEach(row=>{
        const c=row.children;if(c.length<3)return;
        const label=clean(c[0].textContent).toLowerCase();
        let value=clean(c[2].textContent);
        if(label.includes('number of surahs'))value=qty(value,'Surah','Surahs');
        else if(label.includes('number of lines'))value=qty(value,'Line','Lines');
        else if(label.includes('number of verses'))value=qty(value,'Verse','Verses');
        else if(label.includes('percentage'))value=pct(value);
        else value=wording(value);
        c[2].textContent=value||'-';
      });
    });
  }

  function patchPreview(){
    if(typeof renderRaporPreview!=='function'||renderRaporPreview.__cqTahfizhPolishV1)return false;
    const original=renderRaporPreview;
    const wrapped=function(){
      const out=original.apply(this,arguments);
      requestAnimationFrame(polishTahfizh);
      return out;
    };
    wrapped.__cqTahfizhPolishV1=true;
    renderRaporPreview=wrapped;
    return true;
  }

  function patchPdf(){
    if(typeof rpElementPdfBlob!=='function'||rpElementPdfBlob.__cqTahfizhHdPdfV1)return false;
    const wrapped=async function(el){
      await rpEnsurePdfLibs(false);
      const pages=[...el.querySelectorAll('.rpv-paper')];
      if(!pages.length)throw new Error('Halaman rapor tidak ditemukan.');
      const {jsPDF}=window.jspdf||{};
      if(!jsPDF)throw new Error('Library PDF belum siap.');
      polishTahfizh();
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      const scale=Math.min(3,Math.max(2.4,(window.devicePixelRatio||1)*1.35));
      for(let i=0;i<pages.length;i++){
        const page=pages[i];
        await rpWaitForImages(page);
        const canvas=await window.html2canvas(page,{scale,useCORS:true,backgroundColor:'#ffffff',logging:false,scrollX:0,scrollY:0,width:page.scrollWidth,height:page.scrollHeight,windowWidth:page.scrollWidth,windowHeight:page.scrollHeight});
        if(i>0)pdf.addPage('a4','portrait');
        pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'FAST');
        canvas.width=1;canvas.height=1;
      }
      return pdf.output('blob');
    };
    wrapped.__cqTahfizhHdPdfV1=true;
    rpElementPdfBlob=wrapped;
    return true;
  }

  function install(){const a=patchPreview(),b=patchPdf();return a&&b}
  let n=0;(function boot(){n++;if(install()||n>=30)return;setTimeout(boot,200)})();
  document.addEventListener('cq:rapor-preview-rendered',polishTahfizh);
})();
