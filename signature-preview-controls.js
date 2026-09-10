/* CQlass — preview, rotate, and stronger background cleanup for walas signature */
(function(){
  'use strict';

  let originalProcessed='';
  let busy=false;
  let boundHandler=null;

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
  function bytesFromDataUrl(url){
    const b64=String(url||'').split(',')[1]||'';
    return Math.ceil(b64.length*3/4);
  }

  function render(){
    const url=current();
    const preview=document.getElementById('teacher-signature-preview');
    if(!preview || !url) return;
    preview.innerHTML=`
      <div class="cq-sign-preview-shell">
        <div class="cq-sign-preview-head">
          <strong>Preview hasil akhir</strong>
          <span>Yang terlihat di sini yang akan masuk ke rapor</span>
        </div>
        <div class="cq-sign-preview-stage">
          <img src="${url}" alt="Preview tanda tangan sebelum disimpan">
        </div>
        <div class="cq-sign-preview-tools" aria-label="Atur posisi tanda tangan">
          <button type="button" onclick="rotateTeacherSignature(-90)" title="Putar 90 derajat ke kiri">↶ Putar kiri</button>
          <button type="button" onclick="rotateTeacherSignature(90)" title="Putar 90 derajat ke kanan">↷ Putar kanan</button>
          <button type="button" onclick="rotateTeacherSignature(180)" title="Balik posisi 180 derajat">↕ Balik 180°</button>
          <button type="button" onclick="resetTeacherSignaturePreview()" title="Kembalikan posisi awal">Reset</button>
        </div>
        <div class="cq-sign-preview-note">Kotak-kotak menandakan area transparan. Pastikan tidak ada kabut putih/abu-abu di sekitar tanda tangan.</div>
      </div>`;
  }

  function loadImage(file){
    return new Promise((resolve,reject)=>{
      const url=URL.createObjectURL(file);
      const img=new Image();
      img.onload=()=>{ URL.revokeObjectURL(url); resolve(img); };
      img.onerror=()=>{ URL.revokeObjectURL(url); reject(new Error('Foto tidak dapat dibaca browser. Gunakan JPG, PNG, atau WEBP.')); };
      img.src=url;
    });
  }

  function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
  function median(arr){
    const a=arr.slice().sort((x,y)=>x-y);
    return a.length?a[Math.floor(a.length/2)]:255;
  }

  /* Stronger cleanup: remove paper + shadows, preserve dark ink, auto crop. */
  async function cleanSignature(file){
    if(!file) throw new Error('Pilih foto tanda tangan.');
    if(!String(file.type||'').startsWith('image/')) throw new Error('File yang dipilih bukan gambar.');
    if(file.size>30*1024*1024) throw new Error('Foto terlalu besar. Maksimal file asli 30 MB.');

    const img=await loadImage(file);
    const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height;
    if(!iw||!ih) throw new Error('Ukuran foto tidak valid.');

    const maxDim=1600;
    const scale=Math.min(1,maxDim/Math.max(iw,ih));
    const w=Math.max(1,Math.round(iw*scale));
    const h=Math.max(1,Math.round(ih*scale));
    const canvas=document.createElement('canvas');
    canvas.width=w; canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(img,0,0,w,h);
    const image=ctx.getImageData(0,0,w,h), p=image.data;

    /* Estimate paper tone from bright, low-chroma pixels, not just the border. */
    const rs=[],gs=[],bs=[],lums=[];
    const step=Math.max(1,Math.floor(Math.min(w,h)/120));
    for(let y=0;y<h;y+=step){
      for(let x=0;x<w;x+=step){
        const i=(y*w+x)*4;
        const r=p[i],g=p[i+1],b=p[i+2],a=p[i+3];
        if(a<20) continue;
        const maxc=Math.max(r,g,b), minc=Math.min(r,g,b);
        const chroma=maxc-minc;
        const lum=.299*r+.587*g+.114*b;
        if(lum>150 && chroma<42){ rs.push(r);gs.push(g);bs.push(b);lums.push(lum); }
      }
    }
    const bgR=median(rs), bgG=median(gs), bgB=median(bs), bgLum=median(lums);

    let minX=w,minY=h,maxX=-1,maxY=-1,fg=0;
    for(let y=0;y<h;y++){
      for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        if(p[i+3]===0) continue;
        const r=p[i],g=p[i+1],b=p[i+2];
        const lum=.299*r+.587*g+.114*b;
        const maxc=Math.max(r,g,b), minc=Math.min(r,g,b);
        const chroma=maxc-minc;
        const dr=r-bgR,dg=g-bgG,db=b-bgB;
        const dist=Math.sqrt(dr*dr+dg*dg+db*db);

        /* Ink score: dark strokes survive; light paper/shadow is discarded. */
        const darkness=255-lum;
        const paperLike=(lum>138 && chroma<55);
        const veryPaper=(lum>185 && chroma<70);
        let alpha=0;

        if(veryPaper){
          alpha=0;
        }else if(paperLike){
          const inkScore=darkness + chroma*.35 + dist*.18;
          if(inkScore<92) alpha=0;
          else if(inkScore<145) alpha=Math.round(255*(inkScore-92)/53);
          else alpha=255;
        }else{
          const inkScore=darkness*1.16 + chroma*.28 + Math.max(0,bgLum-lum)*.22;
          if(inkScore<70) alpha=0;
          else if(inkScore<128) alpha=Math.round(255*(inkScore-70)/58);
          else alpha=255;
        }

        /* Remove residual low-opacity haze aggressively. */
        if(alpha<72) alpha=0;
        else alpha=clamp(Math.round((alpha-72)*255/183),0,255);

        /* Darken preserved strokes slightly so thin signatures stay visible. */
        if(alpha>0){
          const gray=clamp(Math.round(lum*.78),0,150);
          p[i]=Math.min(r,gray);
          p[i+1]=Math.min(g,gray);
          p[i+2]=Math.min(b,gray);
        }
        p[i+3]=Math.min(alpha,p[i+3]);

        if(p[i+3]>88){
          if(x<minX)minX=x;if(x>maxX)maxX=x;
          if(y<minY)minY=y;if(y>maxY)maxY=y;
          fg++;
        }
      }
    }

    if(maxX<0 || fg<20) throw new Error('Coretan tanda tangan tidak terdeteksi. Foto ulang lebih dekat dengan tinta yang lebih gelap.');
    ctx.putImageData(image,0,0);

    /* Tight crop around actual ink. */
    const pad=Math.max(8,Math.round(Math.max(w,h)*.012));
    minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad);
    maxX=Math.min(w-1,maxX+pad); maxY=Math.min(h-1,maxY+pad);
    const cw=maxX-minX+1, ch=maxY-minY+1;

    const out=document.createElement('canvas');
    const targetW=Math.min(1000,Math.max(360,cw));
    const ratio=targetW/cw;
    out.width=Math.max(1,Math.round(cw*ratio));
    out.height=Math.max(1,Math.round(ch*ratio));
    const octx=out.getContext('2d');
    octx.clearRect(0,0,out.width,out.height);
    octx.drawImage(canvas,minX,minY,cw,ch,0,0,out.width,out.height);

    let url=out.toDataURL('image/png');
    if(bytesFromDataUrl(url)>1024*1024){
      const smaller=document.createElement('canvas');
      const s=Math.min(1,760/out.width);
      smaller.width=Math.max(1,Math.round(out.width*s));
      smaller.height=Math.max(1,Math.round(out.height*s));
      smaller.getContext('2d').drawImage(out,0,0,smaller.width,smaller.height);
      url=smaller.toDataURL('image/png');
    }
    return url;
  }

  /* Override the older cleanup pipeline. */
  window.processTeacherSignatureImage=cleanSignature;

  function rotateDataUrl(src,degrees){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      img.onload=()=>{
        try{
          const rad=degrees*Math.PI/180;
          const swap=Math.abs(degrees)%180===90;
          const canvas=document.createElement('canvas');
          canvas.width=swap?img.height:img.width;
          canvas.height=swap?img.width:img.height;
          const ctx=canvas.getContext('2d');
          ctx.clearRect(0,0,canvas.width,canvas.height);
          ctx.translate(canvas.width/2,canvas.height/2);
          ctx.rotate(rad);
          ctx.drawImage(img,-img.width/2,-img.height/2);
          resolve(canvas.toDataURL('image/png'));
        }catch(err){ reject(err); }
      };
      img.onerror=()=>reject(new Error('Preview tanda tangan gagal diputar.'));
      img.src=src;
    });
  }

  window.rotateTeacherSignature=async function(degrees){
    if(busy || !current()) return;
    busy=true;
    const buttons=document.querySelectorAll('.cq-sign-preview-tools button');
    buttons.forEach(b=>b.disabled=true);
    msg('Memutar preview tanda tangan...');
    try{
      setCurrent(await rotateDataUrl(current(),degrees));
      render();
      msg('Periksa preview. Jika sudah bersih dan posisinya benar, klik Simpan Tanda Tangan.');
    }catch(err){
      msg(err?.message||'Preview tidak dapat diputar.',true);
    }finally{ busy=false; }
  };

  window.resetTeacherSignaturePreview=function(){
    if(!originalProcessed) return;
    setCurrent(originalProcessed);
    render();
    msg('Posisi dikembalikan ke hasil awal. Periksa lagi sebelum menyimpan.');
  };

  function wrapHandler(){
    const fn=window.handleTeacherSignatureSelect;
    if(typeof fn!=='function' || fn===boundHandler || fn.__cqPreviewWrapped) return false;
    const wrapped=async function(event){
      originalProcessed='';
      const out=await fn.apply(this,arguments);
      const url=current();
      if(url){
        originalProcessed=url;
        render();
        msg('Preview siap. Pastikan hanya tinta tanda tangan yang terlihat; area kotak-kotak harus transparan.');
      }
      return out;
    };
    wrapped.__cqPreviewWrapped=true;
    boundHandler=wrapped;
    window.handleTeacherSignatureSelect=wrapped;
    return true;
  }

  const css=document.createElement('style');
  css.id='cq-signature-preview-controls-css';
  css.textContent=`
    .cq-sign-preview-shell{width:100%;padding:12px;box-sizing:border-box}
    .cq-sign-preview-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-end;margin-bottom:10px;text-align:left}
    .cq-sign-preview-head strong{font-size:12px;color:var(--text,#163d3b)}
    .cq-sign-preview-head span{font-size:10px;color:var(--muted,#70817f)}
    .cq-sign-preview-stage{min-height:130px;border:1px dashed rgba(10,110,110,.3);border-radius:12px;background-color:#fff;background-image:linear-gradient(45deg,#eef4f3 25%,transparent 25%),linear-gradient(-45deg,#eef4f3 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#eef4f3 75%),linear-gradient(-45deg,transparent 75%,#eef4f3 75%);background-size:18px 18px;background-position:0 0,0 9px,9px -9px,-9px 0;display:flex;align-items:center;justify-content:center;padding:12px;overflow:hidden}
    .cq-sign-preview-stage img{display:block;max-width:100%;max-height:170px;object-fit:contain}
    .cq-sign-preview-tools{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-top:10px}
    .cq-sign-preview-tools button{border:1px solid rgba(10,110,110,.24);background:#fff;color:#08746f;border-radius:8px;padding:7px 10px;font:inherit;font-size:10.5px;font-weight:700;cursor:pointer}
    .cq-sign-preview-tools button:hover{background:#eaf6f4}.cq-sign-preview-tools button:disabled{opacity:.45;cursor:wait}
    .cq-sign-preview-note{font-size:10px;line-height:1.45;color:var(--muted,#70817f);text-align:center;margin-top:8px}
    @media(max-width:520px){.cq-sign-preview-head{align-items:flex-start;flex-direction:column}.cq-sign-preview-tools button{flex:1 1 calc(50% - 8px)}}`;
  const oldCss=document.getElementById(css.id); if(oldCss) oldCss.remove();
  document.head.appendChild(css);

  let tries=0;
  (function bind(){
    /* ensure our stronger processor wins even if another script initialized first */
    window.processTeacherSignatureImage=cleanSignature;
    wrapHandler();
    if(++tries<120 && (!window.handleTeacherSignatureSelect || !window.handleTeacherSignatureSelect.__cqPreviewWrapped)) setTimeout(bind,100);
  })();
})();
