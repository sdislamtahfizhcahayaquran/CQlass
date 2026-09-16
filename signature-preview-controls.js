/* CQlass — WYSIWYG report-signature editor: preserve transparent uploads, clean paper backgrounds, drag/zoom inside the real 46x24 mm report slot. */
(function(){
  'use strict';

  const SLOT_W=920;
  const SLOT_H=480;
  const SLOT_RATIO=46/24;
  const FIT_X=.90;
  const FIT_Y=.82;

  let originalProcessed='';
  let busy=false;
  let boundHandler=null;
  let lastInputWasTransparent=false;
  let editor={
    source:'', img:null, scale:1, offsetX:0, offsetY:0, rotation:0,
    dragging:false, pointerId:null, lastClientX:0, lastClientY:0
  };

  const previousCleanStored=typeof window.cleanStoredTeacherSignature==='function'
    ? window.cleanStoredTeacherSignature
    : null;
  const previousLoadStored=typeof window.loadTeacherSignaturePreview==='function'
    ? window.loadTeacherSignaturePreview
    : null;

  function state(){
    try{ return typeof teacherSignatureState!=='undefined' ? teacherSignatureState : null; }
    catch(_){ return null; }
  }
  function msg(text,isError){
    const el=document.getElementById('teacher-signature-msg');
    if(!el) return;
    el.textContent=text||'';
    el.style.color=isError?'#b44535':'var(--muted,#70817f)';
    el.style.fontWeight=isError?'700':'400';
  }
  function current(){ return String(state()?.pngDataUrl||''); }
  function setCurrent(url){ const s=state(); if(s) s.pngDataUrl=url||''; }
  function saveEnabled(enabled){
    const btn=document.getElementById('teacher-signature-save');
    if(btn) btn.disabled=!enabled;
  }
  function bytesFromDataUrl(url){
    const b64=String(url||'').split(',')[1]||'';
    return Math.ceil(b64.length*3/4);
  }
  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function median(arr){
    const a=arr.slice().sort((x,y)=>x-y);
    return a.length?a[Math.floor(a.length/2)]:255;
  }

  function reportRoleLabel(){
    try{
      const role=String(currentUser?.role||'').toLowerCase();
      const kelas=String(currentUser?.kelas||'').trim();
      if(role==='walas'||role==='wali_kelas') return `Homeroom Teacher${kelas?', '+kelas:''}`;
      if(role==='pimpinan'||role==='kepsek'||role==='kepala_sekolah') return 'Principal';
      return 'Tanda Tangan Rapor';
    }catch(_){ return 'Tanda Tangan Rapor'; }
  }
  function reportSignerName(){
    try{return String(currentUser?.nama||currentUser?.full_name||currentUser?.username||'Nama Penandatangan').trim()||'Nama Penandatangan';}
    catch(_){return 'Nama Penandatangan';}
  }
  function esc(value){
    if(typeof escapeHtml==='function') return escapeHtml(value);
    return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  }

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Foto tidak dapat dibaca browser. Gunakan JPG, PNG, atau WEBP.'))};
      img.src=url;
    });
  }
  function loadImageFromDataUrl(src,crossOrigin=false){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      if(crossOrigin) img.crossOrigin='anonymous';
      img.onload=()=>resolve(img);
      img.onerror=()=>reject(new Error('Gambar tanda tangan tidak dapat dibaca.'));
      img.src=src;
    });
  }

  function exportTransparentSignature(canvas,imageData,w,h){
    const p=imageData.data;
    let minX=w,minY=h,maxX=-1,maxY=-1,visible=0;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const a=p[(y*w+x)*4+3];
        if(a>8){
          if(x<minX)minX=x;if(x>maxX)maxX=x;
          if(y<minY)minY=y;if(y>maxY)maxY=y;
          visible++;
        }
      }
    }
    if(maxX<0||visible<8) throw new Error('Tanda tangan transparan tidak memiliki coretan yang dapat disimpan.');
    const pad=Math.max(8,Math.round(Math.max(w,h)*.012));
    minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);
    maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
    const cw=maxX-minX+1,ch=maxY-minY+1;
    let out=document.createElement('canvas');
    const targetW=Math.min(1000,cw),ratio=targetW/cw;
    out.width=Math.max(1,Math.round(cw*ratio));
    out.height=Math.max(1,Math.round(ch*ratio));
    let octx=out.getContext('2d');
    octx.clearRect(0,0,out.width,out.height);
    octx.drawImage(canvas,minX,minY,cw,ch,0,0,out.width,out.height);
    let url=out.toDataURL('image/png');
    while(bytesFromDataUrl(url)>1024*1024&&out.width>420){
      const next=document.createElement('canvas');
      next.width=Math.max(420,Math.round(out.width*.82));
      next.height=Math.max(1,Math.round(out.height*(next.width/out.width)));
      const nctx=next.getContext('2d');
      nctx.clearRect(0,0,next.width,next.height);
      nctx.drawImage(out,0,0,next.width,next.height);
      out=next;url=out.toDataURL('image/png');
    }
    if(bytesFromDataUrl(url)>1200*1024) throw new Error('File tanda tangan transparan terlalu besar. Gunakan gambar dengan ukuran lebih kecil.');
    return url;
  }

  async function cleanSignature(file){
    if(!file) throw new Error('Pilih foto tanda tangan.');
    if(!String(file.type||'').startsWith('image/')) throw new Error('File yang dipilih bukan gambar.');
    if(file.size>30*1024*1024) throw new Error('Foto terlalu besar. Maksimal file asli 30 MB.');

    const img=await loadImage(file);
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    if(!iw||!ih) throw new Error('Ukuran foto tidak valid.');

    const maxDim=1600,scale=Math.min(1,maxDim/Math.max(iw,ih));
    const w=Math.max(1,Math.round(iw*scale)),h=Math.max(1,Math.round(ih*scale));
    const canvas=document.createElement('canvas');
    canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
    const image=ctx.getImageData(0,0,w,h),p=image.data;

    let fullyTransparent=0,partiallyTransparent=0;
    const totalPixels=Math.max(1,w*h);
    for(let i=3;i<p.length;i+=4){
      const a=p[i];
      if(a<=24)fullyTransparent++;else if(a<250)partiallyTransparent++;
    }
    const clearRatio=fullyTransparent/totalPixels;
    const alphaRatio=(fullyTransparent+partiallyTransparent)/totalPixels;
    const alreadyTransparent=clearRatio>=.02&&alphaRatio>=.04;
    if(alreadyTransparent){
      lastInputWasTransparent=true;
      return exportTransparentSignature(canvas,image,w,h);
    }
    lastInputWasTransparent=false;

    const rs=[],gs=[],bs=[],lums=[];
    const step=Math.max(1,Math.floor(Math.min(w,h)/120));
    for(let y=0;y<h;y+=step){
      for(let x=0;x<w;x+=step){
        const i=(y*w+x)*4,r=p[i],g=p[i+1],b=p[i+2],a=p[i+3];
        if(a<20)continue;
        const maxc=Math.max(r,g,b),minc=Math.min(r,g,b),chroma=maxc-minc;
        const lum=.299*r+.587*g+.114*b;
        if(lum>150&&chroma<42){rs.push(r);gs.push(g);bs.push(b);lums.push(lum)}
      }
    }
    const bgR=median(rs),bgG=median(gs),bgB=median(bs),bgLum=median(lums);
    let minX=w,minY=h,maxX=-1,maxY=-1,fg=0;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4;if(p[i+3]===0)continue;
        const r=p[i],g=p[i+1],b=p[i+2],lum=.299*r+.587*g+.114*b;
        const maxc=Math.max(r,g,b),minc=Math.min(r,g,b),chroma=maxc-minc;
        const dr=r-bgR,dg=g-bgG,db=b-bgB,dist=Math.sqrt(dr*dr+dg*dg+db*db);
        const darkness=255-lum,paperLike=(lum>138&&chroma<55),veryPaper=(lum>185&&chroma<70);
        let alpha=0;
        if(veryPaper){alpha=0}
        else if(paperLike){
          const inkScore=darkness+chroma*.35+dist*.18;
          if(inkScore<92)alpha=0;else if(inkScore<145)alpha=Math.round(255*(inkScore-92)/53);else alpha=255;
        }else{
          const inkScore=darkness*1.16+chroma*.28+Math.max(0,bgLum-lum)*.22;
          if(inkScore<70)alpha=0;else if(inkScore<128)alpha=Math.round(255*(inkScore-70)/58);else alpha=255;
        }
        if(alpha<72)alpha=0;else alpha=clamp(Math.round((alpha-72)*255/183),0,255);
        if(alpha>0){
          const gray=clamp(Math.round(lum*.78),0,150);
          p[i]=Math.min(r,gray);p[i+1]=Math.min(g,gray);p[i+2]=Math.min(b,gray);
        }
        p[i+3]=Math.min(alpha,p[i+3]);
        if(p[i+3]>88){
          if(x<minX)minX=x;if(x>maxX)maxX=x;
          if(y<minY)minY=y;if(y>maxY)maxY=y;fg++;
        }
      }
    }
    if(maxX<0||fg<20) throw new Error('Coretan tanda tangan tidak terdeteksi. Foto ulang lebih dekat dengan tinta yang lebih gelap.');
    ctx.putImageData(image,0,0);
    const pad=Math.max(8,Math.round(Math.max(w,h)*.012));
    minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);
    maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
    const cw=maxX-minX+1,ch=maxY-minY+1;
    const out=document.createElement('canvas');
    const targetW=Math.min(1000,Math.max(360,cw)),ratio=targetW/cw;
    out.width=Math.max(1,Math.round(cw*ratio));out.height=Math.max(1,Math.round(ch*ratio));
    const octx=out.getContext('2d');octx.clearRect(0,0,out.width,out.height);
    octx.drawImage(canvas,minX,minY,cw,ch,0,0,out.width,out.height);
    let url=out.toDataURL('image/png');
    if(bytesFromDataUrl(url)>1024*1024){
      const smaller=document.createElement('canvas'),s=Math.min(1,760/out.width);
      smaller.width=Math.max(1,Math.round(out.width*s));smaller.height=Math.max(1,Math.round(out.height*s));
      smaller.getContext('2d').drawImage(out,0,0,smaller.width,smaller.height);
      url=smaller.toDataURL('image/png');
    }
    return url;
  }

  async function trimTransparentDataUrl(src,padRatio=.02){
    if(!src)return '';
    const img=await loadImageFromDataUrl(src,/^https?:/i.test(src));
    const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
    if(!w||!h)return src;
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
    const data=ctx.getImageData(0,0,w,h),p=data.data;
    let minX=w,minY=h,maxX=-1,maxY=-1;
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      if(p[(y*w+x)*4+3]>18){
        if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;
      }
    }
    if(maxX<0)return src;
    const inkW=maxX-minX+1,inkH=maxY-minY+1,pad=Math.max(5,Math.round(Math.max(inkW,inkH)*padRatio));
    minX=Math.max(0,minX-pad);minY=Math.max(0,minY-pad);maxX=Math.min(w-1,maxX+pad);maxY=Math.min(h-1,maxY+pad);
    const cw=maxX-minX+1,ch=maxY-minY+1;
    const out=document.createElement('canvas');out.width=cw;out.height=ch;
    out.getContext('2d').drawImage(canvas,minX,minY,cw,ch,0,0,cw,ch);
    return out.toDataURL('image/png');
  }

  function editorCanvas(){return document.getElementById('cq-sign-editor-canvas')}
  function editorFit(img){
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    return Math.min((SLOT_W*FIT_X)/iw,(SLOT_H*FIT_Y)/ih);
  }
  function editorDrawBounds(){
    const img=editor.img;if(!img)return null;
    const fit=editorFit(img),iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    const angle=((editor.rotation%360)+360)%360;
    const swap=angle===90||angle===270;
    const rawW=iw*fit*editor.scale,rawH=ih*fit*editor.scale;
    return {w:swap?rawH:rawW,h:swap?rawW:rawH,rawW,rawH};
  }
  function clampEditorOffsets(){
    const b=editorDrawBounds();if(!b)return;
    const maxX=Math.max(SLOT_W*.42,(SLOT_W+b.w)*.42);
    const maxY=Math.max(SLOT_H*.42,(SLOT_H+b.h)*.42);
    editor.offsetX=clamp(editor.offsetX,-maxX,maxX);
    editor.offsetY=clamp(editor.offsetY,-maxY,maxY);
  }
  function drawEditor(){
    const canvas=editorCanvas();if(!canvas||!editor.img)return;
    canvas.width=SLOT_W;canvas.height=SLOT_H;
    const ctx=canvas.getContext('2d');ctx.clearRect(0,0,SLOT_W,SLOT_H);
    const img=editor.img,fit=editorFit(img),iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    const dw=iw*fit*editor.scale,dh=ih*fit*editor.scale;
    clampEditorOffsets();
    ctx.save();
    ctx.translate(SLOT_W/2+editor.offsetX,SLOT_H/2+editor.offsetY);
    ctx.rotate(editor.rotation*Math.PI/180);
    ctx.drawImage(img,-dw/2,-dh/2,dw,dh);
    ctx.restore();
    const out=canvas.toDataURL('image/png');
    setCurrent(out);saveEnabled(true);
    const zoom=document.getElementById('cq-sign-zoom-label');
    if(zoom)zoom.textContent=`${Math.round(editor.scale*100)}%`;
  }

  function bindCanvasDrag(){
    const canvas=editorCanvas();if(!canvas||canvas.dataset.dragBound)return;
    canvas.dataset.dragBound='1';
    canvas.addEventListener('pointerdown',e=>{
      if(busy)return;
      editor.dragging=true;editor.pointerId=e.pointerId;editor.lastClientX=e.clientX;editor.lastClientY=e.clientY;
      try{canvas.setPointerCapture(e.pointerId)}catch(_){}
      canvas.classList.add('dragging');e.preventDefault();
    });
    canvas.addEventListener('pointermove',e=>{
      if(!editor.dragging||editor.pointerId!==e.pointerId)return;
      const rect=canvas.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const dx=(e.clientX-editor.lastClientX)*(SLOT_W/rect.width);
      const dy=(e.clientY-editor.lastClientY)*(SLOT_H/rect.height);
      editor.lastClientX=e.clientX;editor.lastClientY=e.clientY;
      editor.offsetX+=dx;editor.offsetY+=dy;drawEditor();e.preventDefault();
    });
    const end=e=>{
      if(editor.pointerId!==null&&e.pointerId!==editor.pointerId)return;
      editor.dragging=false;editor.pointerId=null;canvas.classList.remove('dragging');
      drawEditor();
    };
    canvas.addEventListener('pointerup',end);canvas.addEventListener('pointercancel',end);
    canvas.addEventListener('wheel',e=>{
      if(!editor.img)return;
      e.preventDefault();
      editor.scale=clamp(editor.scale+(e.deltaY<0?.05:-.05),.45,2.2);drawEditor();
    },{passive:false});
  }

  function renderEditor(){
    const preview=document.getElementById('teacher-signature-preview');if(!preview||!editor.source)return;
    preview.innerHTML=`
      <div class="cq-sign-preview-shell">
        <div class="cq-sign-preview-head"><strong>Preview Rapor</strong><span>Drag tanda tangan langsung di kotak</span></div>
        <div class="cq-sign-report-sample">
          <div class="cq-sign-report-role">${esc(reportRoleLabel())}</div>
          <div class="cq-sign-editor-frame" title="Geser dengan mouse atau jari">
            <canvas id="cq-sign-editor-canvas" width="${SLOT_W}" height="${SLOT_H}" aria-label="Area tanda tangan 46 x 24 mm"></canvas>
            <span class="cq-sign-drag-hint">Geser langsung</span>
          </div>
          <div class="cq-sign-report-name">${esc(reportSignerName())}</div>
        </div>
        <div class="cq-sign-preview-tools" aria-label="Atur tanda tangan">
          <button type="button" onclick="zoomTeacherSignature(-0.08)" title="Perkecil">− Perkecil</button>
          <span class="cq-sign-zoom-value" id="cq-sign-zoom-label">100%</span>
          <button type="button" onclick="zoomTeacherSignature(0.08)" title="Perbesar">+ Perbesar</button>
          <button type="button" onclick="rotateTeacherSignature(-90)" title="Putar kiri">↶ Putar</button>
          <button type="button" onclick="rotateTeacherSignature(90)" title="Putar kanan">↷ Putar</button>
          <button type="button" onclick="autoFitTeacherSignature()" title="Kembalikan ukuran dan posisi otomatis">◎ Auto-fit</button>
          <button type="button" onclick="resetTeacherSignaturePreview()" title="Kembalikan gambar awal">Reset</button>
        </div>
        <div class="cq-sign-preview-note">Kotak ini memakai rasio area tanda tangan rapor asli 46 × 24 mm. Posisi, ukuran, dan rotasi yang terlihat di sini ikut tersimpan. PNG transparan yang sudah remove background tidak diproses ulang.</div>
      </div>`;
    bindCanvasDrag();drawEditor();
  }

  async function initializeEditor(source,{reset=true}={}){
    if(!source)return;
    editor.source=source;
    editor.img=await loadImageFromDataUrl(source,/^https?:/i.test(source));
    if(reset){editor.scale=1;editor.offsetX=0;editor.offsetY=0;editor.rotation=0}
    renderEditor();
  }

  window.zoomTeacherSignature=function(delta){
    if(busy||!editor.img)return;
    editor.scale=clamp(editor.scale+Number(delta||0),.45,2.2);drawEditor();
    msg('Ukuran diperbarui. Drag jika posisi masih perlu disesuaikan.');
  };
  window.rotateTeacherSignature=function(degrees){
    if(busy||!editor.img)return;
    editor.rotation=((editor.rotation+Number(degrees||0))%360+360)%360;drawEditor();
    msg('Rotasi diperbarui. Preview di kotak sama dengan hasil rapor.');
  };
  window.autoFitTeacherSignature=function(){
    if(!editor.img)return;
    editor.scale=1;editor.offsetX=0;editor.offsetY=0;editor.rotation=0;drawEditor();
    msg('Ukuran dan posisi dikembalikan ke Auto-fit.');
  };
  window.resetTeacherSignaturePreview=function(){
    if(!originalProcessed)return;
    initializeEditor(originalProcessed,{reset:true}).then(()=>{
      msg(lastInputWasTransparent
        ? 'Dikembalikan ke gambar awal. Background transparan tetap dipertahankan.'
        : 'Dikembalikan ke hasil remove background awal.');
    }).catch(err=>msg(err?.message||'Preview gagal direset.',true));
  };

  window.processTeacherSignatureImage=cleanSignature;

  function wrapHandler(){
    const fn=window.handleTeacherSignatureSelect;
    if(typeof fn!=='function'||fn===boundHandler||fn.__cqWysiwygWrapped)return false;
    const wrapped=async function(event){
      originalProcessed='';lastInputWasTransparent=false;
      const out=await fn.apply(this,arguments);
      let url=current();
      if(url){
        try{url=await trimTransparentDataUrl(url);setCurrent(url)}catch(_){}
        originalProcessed=url;
        try{
          await initializeEditor(url,{reset:true});
          msg(lastInputWasTransparent
            ? 'File transparan diterima. Drag dan zoom langsung pada preview rapor bila perlu, lalu Simpan Tanda Tangan.'
            : 'Background sudah dibersihkan. Drag dan zoom langsung pada preview rapor bila perlu, lalu Simpan Tanda Tangan.');
        }catch(err){msg(err?.message||'Preview editor gagal dibuat.',true)}
      }
      return out;
    };
    wrapped.__cqWysiwygWrapped=true;boundHandler=wrapped;window.handleTeacherSignatureSelect=wrapped;return true;
  }

  async function looksManagedSlotImage(url){
    try{
      const img=await loadImageFromDataUrl(url,/^https?:/i.test(url));
      const w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
      return !!w&&!!h&&Math.abs((w/h)-SLOT_RATIO)<.025;
    }catch(_){return false}
  }

  /* Preserve new WYSIWYG canvases exactly. Old signatures still use the previous cleanup path. */
  window.cleanStoredTeacherSignature=async function(url){
    if(!url)return '';
    try{
      if(await looksManagedSlotImage(url)) return url;
      if(previousCleanStored){
        const prepared=await previousCleanStored(url);
        return await trimTransparentDataUrl(prepared||url);
      }
      return url;
    }catch(err){
      console.warn('Normalisasi tanda tangan tersimpan gagal; memakai file asli.',err);return url;
    }
  };

  /* Existing stored signature can be repositioned immediately, without uploading again. */
  window.loadTeacherSignaturePreview=async function(){
    const preview=document.getElementById('teacher-signature-preview'),message=document.getElementById('teacher-signature-msg');
    if(!preview)return;
    setCurrent('');saveEnabled(false);preview.innerHTML='<span class="spinner"></span>';
    try{
      if(typeof teacherSignatureRequest!=='function'){
        if(previousLoadStored)return previousLoadStored();
        throw new Error('Layanan tanda tangan belum siap.');
      }
      const data=await teacherSignatureRequest('GET');
      if(data?.exists&&data?.url){
        let source=data.url;
        try{
          if(await looksManagedSlotImage(source)) source=await trimTransparentDataUrl(source);
          else if(previousCleanStored) source=await trimTransparentDataUrl(await previousCleanStored(source));
          else source=await trimTransparentDataUrl(source);
        }catch(err){console.warn('Persiapan editor tanda tangan tersimpan:',err)}
        originalProcessed=source;lastInputWasTransparent=true;
        await initializeEditor(source,{reset:true});
        if(message)message.textContent='Tanda tangan tersimpan siap diatur. Drag di kotak, zoom bila perlu, lalu simpan ulang.';
      }else{
        editor={source:'',img:null,scale:1,offsetX:0,offsetY:0,rotation:0,dragging:false,pointerId:null,lastClientX:0,lastClientY:0};
        preview.innerHTML='<span style="font-size:11px;color:var(--muted,#70817f)">Belum ada tanda tangan tersimpan. Pilih foto tanda tangan.</span>';
        if(message)message.textContent='';
      }
    }catch(err){
      preview.innerHTML='<span style="font-size:11px;color:var(--muted,#70817f)">Belum dapat memuat tanda tangan.</span>';
      if(message)message.textContent=err?.message||'';
    }
  };

  const css=document.createElement('style');
  css.id='cq-signature-preview-controls-css';
  css.textContent=`
    .cq-sign-preview-shell{width:100%;padding:12px;box-sizing:border-box}
    .cq-sign-preview-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;margin-bottom:10px;text-align:left}
    .cq-sign-preview-head strong{font-size:12px;color:var(--text,#163d3b)}
    .cq-sign-preview-head span{font-size:10px;color:var(--muted,#70817f)}
    .cq-sign-report-sample{background:#fff;border:1px solid rgba(10,110,110,.18);border-radius:14px;padding:13px 12px 10px;text-align:center;box-shadow:0 4px 14px rgba(11,60,58,.05)}
    .cq-sign-report-role{font-size:11px;color:#222;margin-bottom:7px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cq-sign-editor-frame{width:min(100%,368px);aspect-ratio:46/24;margin:0 auto;position:relative;overflow:hidden;border:1px dashed rgba(10,110,110,.33);border-radius:8px;background-color:#fff;background-image:linear-gradient(45deg,#eef4f3 25%,transparent 25%),linear-gradient(-45deg,#eef4f3 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eef4f3 75%),linear-gradient(-45deg,transparent 75%,#eef4f3 75%);background-size:16px 16px;background-position:0 0,0 8px,8px -8px,-8px 0;touch-action:none;user-select:none}
    #cq-sign-editor-canvas{display:block;width:100%;height:100%;cursor:grab;touch-action:none}
    #cq-sign-editor-canvas.dragging{cursor:grabbing}
    .cq-sign-drag-hint{position:absolute;right:7px;top:6px;pointer-events:none;background:rgba(255,255,255,.88);border:1px solid rgba(10,110,110,.18);border-radius:999px;padding:3px 7px;font-size:8.5px;color:#62817f}
    .cq-sign-report-name{display:inline-block;margin-top:8px;font-size:11px;font-weight:800;color:#1e1e1e;border-bottom:1px solid #222;padding-bottom:1px;max-width:95%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .cq-sign-preview-tools{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;align-items:center;margin-top:10px}
    .cq-sign-preview-tools button{border:1px solid rgba(10,110,110,.24);background:#fff;color:#08746f;border-radius:8px;padding:7px 10px;font:inherit;font-size:10.5px;font-weight:700;cursor:pointer}
    .cq-sign-preview-tools button:hover{background:#eaf6f4}.cq-sign-preview-tools button:disabled{opacity:.45;cursor:wait}
    .cq-sign-zoom-value{min-width:42px;text-align:center;font-size:10px;font-weight:900;color:#315f5d}
    .cq-sign-preview-note{font-size:10px;line-height:1.45;color:var(--muted,#70817f);text-align:center;margin-top:8px}
    .rpv-signature-img{width:46mm!important;height:24mm!important;max-width:46mm!important;max-height:24mm!important;object-fit:contain!important;object-position:center center!important}
    @media(max-width:520px){.cq-sign-preview-head{align-items:flex-start;flex-direction:column}.cq-sign-preview-tools button{flex:1 1 calc(50% - 8px)}.cq-sign-zoom-value{order:-1;flex:1 1 100%}}
  `;
  document.getElementById(css.id)?.remove();document.head.appendChild(css);

  let tries=0;
  (function bind(){
    window.processTeacherSignatureImage=cleanSignature;
    wrapHandler();
    if(++tries<120&&(!window.handleTeacherSignatureSelect||!window.handleTeacherSignatureSelect.__cqWysiwygWrapped))setTimeout(bind,100);
  })();

  /* If the signature panel is already open when this script arrives, upgrade it immediately. */
  setTimeout(()=>{
    if(document.getElementById('teacher-signature-preview')){
      try{window.loadTeacherSignaturePreview()}catch(_){}
    }
  },120);
})();
