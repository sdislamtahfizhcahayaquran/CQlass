/* CQlass — hard guard for report attendance and printable report output. */
(function(){
  'use strict';
  if(window.__CQ_RAPOR_EFFECTIVE_ATTENDANCE_GUARD__) return;
  window.__CQ_RAPOR_EFFECTIVE_ATTENDANCE_GUARD__=true;

  const num=v=>{const n=Number(v);return Number.isFinite(n)&&n>=0?Math.trunc(n):0};

  function installUniformReportBorders(){
    const id='cq-rapor-uniform-border-v2';
    let style=document.getElementById(id);
    if(!style){style=document.createElement('style');style.id=id;document.head.appendChild(style)}
    style.textContent=`
      #rpv-preview .rpv-template-head,
      #rpv-preview .rpv-table{
        border-collapse:collapse!important;
        border-spacing:0!important;
      }
      #rpv-preview .rpv-template-head{
        border:1px solid #111!important;
      }
      #rpv-preview .rpv-template-head td,
      #rpv-preview .rpv-table th,
      #rpv-preview .rpv-table td{
        border:1px solid #111!important;
      }
      #rpv-preview .rpv-total-line{
        border:1px solid #111!important;
        border-top:0!important;
      }
      #rpv-preview .rpv-team-simple td{
        border:0!important;
      }
    `;
  }

  function normalizeAttendance(report){
    if(!report||typeof report!=='object'||!report.attendance||typeof report.attendance!=='object') return report;
    const a=report.attendance;
    const effectiveRaw=a.effective_days!=null?a.effective_days:a.total;
    const effective=Number(effectiveRaw);
    if(!Number.isFinite(effective)||effective<0) return report;
    const total=Math.trunc(effective),sick=num(a.sick),excused=num(a.excused),unexcused=num(a.unexcused),late=num(a.late);
    const present=Math.max(0,total-sick-excused-unexcused);
    const denom=Math.max(1,total);
    a.present=present;
    a.total=total;
    a.effective_days=total;
    a.sick=sick;
    a.excused=excused;
    a.unexcused=unexcused;
    a.late=late;
    a.present_formula='effective_days_minus_sick_excused_unexcused';
    a.percent={
      ...(a.percent||{}),
      present:Math.round(present/denom*100),
      sick:Math.round(sick/denom*100),
      excused:Math.round(excused/denom*100),
      unexcused:Math.round(unexcused/denom*100)
    };
    return report;
  }

  function normalizePayload(d){
    if(d?.report) normalizeAttendance(d.report);
    if(Array.isArray(d?.reports)) d.reports.forEach(normalizeAttendance);
    return d;
  }

  function currentReport(){
    try{return typeof raporPreviewState!=='undefined'?raporPreviewState?.report:null}catch(_){return null}
  }

  const validGrade=v=>['A','B','C','D'].includes(String(v??'').trim().toUpperCase());

  function cleanExtracurricularDisplay(){
    const eks=currentReport()?.extracurricular;
    if(!eks||typeof eks!=='object') return;
    const noAssessment=!validGrade(eks.activity_grade)&&!validGrade(eks.skill_grade)&&!validGrade(eks.competition_grade);
    const notParticipating=String(eks.status||'').trim().toUpperCase()==='TIDAK_IKUT';
    if(!notParticipating&&!noAssessment) return;
    document.querySelectorAll('#rpv-preview .rpv-exkul tbody').forEach(tbody=>{
      const rows=[...tbody.querySelectorAll('tr')];
      rows.slice(0,3).forEach(row=>{
        const cells=row.querySelectorAll('td');
        if(cells[2]) cells[2].textContent='';
        if(cells[3]) cells[3].textContent='';
      });
    });
  }

  const isDashValue=value=>/^[-–—]+$/.test(String(value??'').trim());
  const countIsOne=value=>{
    const n=Number(String(value??'').replace(',','.'));
    return Number.isFinite(n)&&Math.abs(n)===1;
  };

  function normalizeTahfizhRange(value){
    return String(value??'')
      .replace(/\s*s\.\s*d\.?\s*/gi,' to ')
      .replace(/\s*s\/d\s*/gi,' to ')
      .replace(/\s+/g,' ')
      .trim();
  }

  function normalizeTahfizhFreeText(value){
    let text=normalizeTahfizhRange(value);
    if(!text||isDashValue(text)) return text;
    text=text
      .replace(/\b(\d+(?:[.,]\d+)?)\s*(?:surat|surah|surahs)\b/gi,(_,n)=>`${n} ${countIsOne(n)?'Surah':'Surahs'}`)
      .replace(/\b(\d+(?:[.,]\d+)?)\s*(?:ayat|verse|verses)\b/gi,(_,n)=>`${n} ${countIsOne(n)?'Verse':'Verses'}`)
      .replace(/\b(\d+(?:[.,]\d+)?)\s*(?:baris|line|lines)\b/gi,(_,n)=>`${n} ${countIsOne(n)?'Line':'Lines'}`)
      .replace(/\bsurat\b/gi,'Surah')
      .replace(/\bayat\b/gi,'Verse')
      .replace(/\bbaris\b/gi,'Line');
    return text.replace(/\s+/g,' ').trim();
  }

  function normalizeTahfizhStructuredCount(value,singular,plural){
    const raw=String(value??'').trim();
    if(!raw||isDashValue(raw)) return raw;
    const match=raw.match(/\d+(?:[.,]\d+)?/);
    if(!match) return normalizeTahfizhFreeText(raw);
    return `${match[0]} ${countIsOne(match[0])?singular:plural}`;
  }

  function normalizeUkjAssessment(value){
    let raw=String(value??'').trim();
    if(!raw||isDashValue(raw)) return raw;
    raw=raw.replace(/\bujian\s+kenaikan\s+juz\b/gi,'UKJ').replace(/\bukj\b/gi,'UKJ').replace(/\s+/g,' ').trim();
    const juz=(raw.match(/\b(?:juz\s*)?(\d{1,2})\b/i)||[])[1]||'';
    const tag=`UKJ${juz?' '+juz:''}`;
    if(/\b(?:belum|tidak)\s+lulus\b/i.test(raw)) return `${tag} Not Yet Passed`;
    if(/\blulus\b/i.test(raw)) return `Passed ${tag}`;
    if(/\bbelum\b/i.test(raw)) return `${tag} Not Yet Completed`;
    if(/\bsudah\b/i.test(raw)) return `Completed ${tag}`;
    if(/\bUKJ\b/i.test(raw)) return tag;
    return normalizeTahfizhFreeText(raw);
  }

  function normalizeTahfizhEnglishDisplay(){
    document.querySelectorAll('#rpv-preview .rpv-tahfizh tbody tr').forEach(row=>{
      const cells=[...row.querySelectorAll('td')];
      if(cells.length<2) return;
      const label=String(cells[0]?.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
      const valueCell=cells[cells.length-1];
      if(!valueCell) return;
      const raw=valueCell.textContent||'';
      if(label.includes('number of surahs')) valueCell.textContent=normalizeTahfizhStructuredCount(raw,'Surah','Surahs');
      else if(label.includes('number of lines')) valueCell.textContent=normalizeTahfizhStructuredCount(raw,'Line','Lines');
      else if(label.includes('number of verses')) valueCell.textContent=normalizeTahfizhStructuredCount(raw,'Verse','Verses');
      else if(label.includes('juz advancement assessment')) valueCell.textContent=normalizeUkjAssessment(raw);
      else valueCell.textContent=normalizeTahfizhFreeText(raw);
    });
  }

  function installHdPdfRenderer(){
    if(typeof rpElementPdfBlob!=='function'||typeof rpEnsurePdfLibs!=='function'||typeof rpWaitForImages!=='function') return false;
    if(rpElementPdfBlob.__cqHdPrint) return true;
    const hdRenderer=async function(el){
      installUniformReportBorders();
      await rpEnsurePdfLibs(false);
      const pages=[...el.querySelectorAll('.rpv-paper')];
      if(!pages.length) throw new Error('Halaman rapor tidak ditemukan.');
      const {jsPDF}=window.jspdf||{};
      if(!jsPDF) throw new Error('Library PDF belum siap.');
      const pdf=new jsPDF({orientation:'portrait',unit:'mm',format:'a4',compress:true});
      if(document.fonts?.ready){try{await document.fonts.ready}catch(_){}}
      for(let i=0;i<pages.length;i++){
        const page=pages[i];
        await rpWaitForImages(page);
        const canvas=await window.html2canvas(page,{
          scale:3.2,useCORS:true,backgroundColor:'#ffffff',logging:false,
          scrollX:0,scrollY:0,width:page.scrollWidth,height:page.scrollHeight,
          windowWidth:page.scrollWidth,windowHeight:page.scrollHeight,imageSmoothingEnabled:true
        });
        if(i>0) pdf.addPage('a4','portrait');
        pdf.addImage(canvas.toDataURL('image/png'),'PNG',0,0,210,297,undefined,'SLOW');
        canvas.width=1;canvas.height=1;
      }
      return pdf.output('blob');
    };
    hdRenderer.__cqHdPrint=true;
    rpElementPdfBlob=hdRenderer;
    return true;
  }

  function install(){
    installUniformReportBorders();
    if(typeof getAuthToken!=='function'||typeof SUPABASE_URL==='undefined'||typeof SUPABASE_PUBLISHABLE_KEY==='undefined') return setTimeout(install,50);

    reportPreviewRequest=async function(action,payload={},timeoutMs=35000){
      const token=getAuthToken();if(!token)throw new Error('Sesi login tidak ditemukan.');
      const url=SUPABASE_URL+'/functions/v1/report-preview-v2?cq_effective=20260923-1';
      return await new Promise((resolve,reject)=>{
        const xhr=new XMLHttpRequest();
        xhr.open('POST',url,true);xhr.timeout=timeoutMs;
        xhr.setRequestHeader('Content-Type','application/json');
        xhr.setRequestHeader('apikey',SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('Authorization','Bearer '+SUPABASE_PUBLISHABLE_KEY);
        xhr.setRequestHeader('x-session-token',token);
        xhr.onload=()=>{
          let d={};
          try{d=xhr.responseText?JSON.parse(xhr.responseText):{}}catch(_){return reject(new Error('Respons Rapor bukan JSON. HTTP '+xhr.status+'.'))}
          if(xhr.status<200||xhr.status>=300||d.success===false){
            const map={session_invalid:'Sesi login tidak valid.',session_expired:'Sesi login telah berakhir.',forbidden:'Akun ini tidak memiliki akses Rapor.',class_forbidden:'Kelas tidak berada dalam akses akun ini.',student_not_in_class:'Siswa tidak ditemukan pada kelas ini.',academic_year_not_found:'Tahun ajaran belum tersedia di Supabase.'};
            return reject(new Error(map[d.error]||d.error||('HTTP '+xhr.status)));
          }
          resolve(normalizePayload(d));
        };
        xhr.onerror=()=>reject(new Error('Server Rapor gagal dihubungi.'));
        xhr.ontimeout=()=>reject(new Error('Server Rapor terlalu lama merespons.'));
        xhr.send(JSON.stringify({action,...payload}));
      });
    };

    if(typeof renderRaporPreview==='function'&&!renderRaporPreview.__cqEffectiveGuard){
      const original=renderRaporPreview;
      const guarded=function(){
        installUniformReportBorders();
        try{normalizeAttendance(currentReport())}catch(_){}
        const result=original.apply(this,arguments);
        try{cleanExtracurricularDisplay()}catch(_){}
        try{normalizeTahfizhEnglishDisplay()}catch(_){}
        return result;
      };
      guarded.__cqEffectiveGuard=true;
      renderRaporPreview=guarded;
    }

    if(!installHdPdfRenderer()) setTimeout(installHdPdfRenderer,50);
  }
  install();
})();
