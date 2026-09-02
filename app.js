/* ==========================================================
   CQLASS — TANDA TANGAN GURU V1.1
   SAFE APPEND PATCH — tidak mengubah format Rapor.
   Tempel PALING BAWAH app.js.
   ========================================================== */
(function(){
  const SIGNATURE_URL = `${SUPABASE_URL}/functions/v1/teacher-signature`;
  let signatureProcessedPng = '';

  async function signatureRequest(method='GET', payload=null){
    const token = typeof getAuthToken === 'function'
      ? getAuthToken()
      : (localStorage.getItem('cqlass_session_token') || '');

    if(!token) throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');

    const ctl = new AbortController();
    const timer = setTimeout(()=>ctl.abort(), 30000);
    try{
      const res = await fetch(SIGNATURE_URL,{
        method,
        headers:{
          'Content-Type':'application/json',
          'apikey':SUPABASE_PUBLISHABLE_KEY,
          'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
          'x-session-token':token
        },
        body: payload ? JSON.stringify(payload) : undefined,
        signal:ctl.signal
      });
      const raw=await res.text();
      let data={};
      try{ data=raw?JSON.parse(raw):{}; }
      catch(_){ throw new Error(`Respons tanda tangan bukan JSON. HTTP ${res.status}.`); }
      if(!res.ok || data.ok===false){
        throw new Error(data.error || `Gagal memproses tanda tangan (HTTP ${res.status}).`);
      }
      return data;
    }catch(err){
      if(err?.name==='AbortError') throw new Error('Server tanda tangan terlalu lama merespons.');
      throw err;
    }finally{
      clearTimeout(timer);
    }
  }

  function signatureSvg(name,size=18){
    const a=`width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
    if(name==='pen') return `<svg ${a}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>`;
    if(name==='trash') return `<svg ${a}><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/></svg>`;
    return `<svg ${a}><path d="m20 6-11 11-5-5"/></svg>`;
  }

  function injectSignatureStyles(){
    if(document.getElementById('cq-signature-style')) return;
    const s=document.createElement('style');
    s.id='cq-signature-style';
    s.textContent=`
      .cq-sign-account-btn{
        display:inline-flex;align-items:center;justify-content:center;gap:7px;
        padding:9px 12px;border:1px solid var(--border,#dbe5e4);border-radius:10px;
        background:#fff;color:var(--primary,#0a6e6e);font:inherit;font-size:12px;font-weight:800;
        cursor:pointer;margin-top:10px
      }
      .cq-sign-account-btn:hover{background:#f0f8f7}
      .cq-sign-overlay{position:fixed;inset:0;background:rgba(17,45,44,.52);z-index:100000;display:flex;align-items:center;justify-content:center;padding:18px}
      .cq-sign-card{width:min(540px,100%);max-height:92vh;overflow:auto;background:#fff;border-radius:18px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.24)}
      .cq-sign-title{font-size:19px;font-weight:900;color:var(--text,#183332)}
      .cq-sign-sub{font-size:12px;line-height:1.55;color:var(--muted,#70817f);margin:5px 0 14px}
      .cq-sign-upload{display:block;border:1.5px dashed var(--border,#dbe5e4);border-radius:13px;padding:14px;text-align:center;background:#fbfdfd;cursor:pointer}
      .cq-sign-upload:hover{border-color:var(--primary,#0a6e6e)}
      .cq-sign-preview{margin-top:12px;min-height:150px;border:1px solid var(--border,#dbe5e4);border-radius:12px;background:#f8faf9;display:flex;align-items:center;justify-content:center;padding:12px}
      .cq-sign-preview img{max-width:95%;max-height:135px;object-fit:contain}
      .cq-sign-empty{font-size:12px;color:var(--muted,#7b8b89)}
      .cq-sign-msg{min-height:20px;margin-top:9px;font-size:12px;color:var(--muted,#70817f)}
      .cq-sign-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-top:14px}
      .cq-sign-actions button{display:inline-flex;align-items:center;gap:6px}
    `;
    document.head.appendChild(s);
  }

  function processSignatureImage(file){
    return new Promise((resolve,reject)=>{
      if(!file) return reject(new Error('Pilih foto tanda tangan terlebih dahulu.'));
      if(!['image/jpeg','image/png'].includes(file.type)){
        return reject(new Error('Gunakan file JPG, JPEG, atau PNG.'));
      }
      if(file.size > 8*1024*1024){
        return reject(new Error('Foto awal maksimal 8 MB.'));
      }

      const reader=new FileReader();
      reader.onerror=()=>reject(new Error('File tidak dapat dibaca.'));
      reader.onload=()=>{
        const img=new Image();
        img.onerror=()=>reject(new Error('Gambar tidak valid.'));
        img.onload=()=>{
          try{
            const maxDim=1800;
            const scale=Math.min(1,maxDim/Math.max(img.width,img.height));
            const w=Math.max(1,Math.round(img.width*scale));
            const h=Math.max(1,Math.round(img.height*scale));

            const src=document.createElement('canvas');
            src.width=w; src.height=h;
            const ctx=src.getContext('2d',{willReadFrequently:true});
            ctx.drawImage(img,0,0,w,h);

            const image=ctx.getImageData(0,0,w,h);
            const p=image.data;
            let minX=w,minY=h,maxX=-1,maxY=-1;

            for(let i=0;i<p.length;i+=4){
              const r=p[i],g=p[i+1],b=p[i+2];
              const max=Math.max(r,g,b), min=Math.min(r,g,b);
              const brightness=(r+g+b)/3;
              const chroma=max-min;

              // Kertas putih / abu sangat terang dibuat transparan.
              let alpha=255;
              if(brightness>=246 && chroma<18) alpha=0;
              else if(brightness>205 && chroma<28){
                alpha=Math.round(255*(246-brightness)/41);
              }
              p[i+3]=Math.max(0,Math.min(255,alpha));

              if(p[i+3]>35){
                const q=i/4, x=q%w, y=Math.floor(q/w);
                if(x<minX)minX=x;if(x>maxX)maxX=x;
                if(y<minY)minY=y;if(y>maxY)maxY=y;
              }
            }
            ctx.putImageData(image,0,0);

            if(maxX<0) throw new Error('Coretan tanda tangan tidak terdeteksi. Gunakan foto yang lebih jelas.');

            const pad=Math.max(10,Math.round(Math.max(w,h)*0.025));
            minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad);
            maxX=Math.min(w-1,maxX+pad); maxY=Math.min(h-1,maxY+pad);

            const cw=maxX-minX+1, ch=maxY-minY+1;
            const targetW=Math.min(950,cw);
            const ratio=targetW/cw;

            const out=document.createElement('canvas');
            out.width=Math.max(1,Math.round(cw*ratio));
            out.height=Math.max(1,Math.round(ch*ratio));
            out.getContext('2d').drawImage(src,minX,minY,cw,ch,0,0,out.width,out.height);

            resolve(out.toDataURL('image/png'));
          }catch(err){ reject(err); }
        };
        img.src=String(reader.result||'');
      };
      reader.readAsDataURL(file);
    });
  }

  function closeSignatureModal(){
    document.getElementById('cq-sign-overlay')?.remove();
    signatureProcessedPng='';
  }

  async function openSignatureModal(){
    injectSignatureStyles();
    closeSignatureModal();

    const overlay=document.createElement('div');
    overlay.className='cq-sign-overlay';
    overlay.id='cq-sign-overlay';
    overlay.innerHTML=`
      <div class="cq-sign-card" onclick="event.stopPropagation()">
        <div class="cq-sign-title">Tanda Tangan Digital</div>
        <div class="cq-sign-sub">
          Foto tanda tangan di atas kertas putih. CQlass akan menghapus background putih,
          crop area tanda tangan, lalu menyimpannya sebagai PNG transparan.
        </div>

        <label class="cq-sign-upload">
          <b>Pilih Foto Tanda Tangan</b><br>
          <span style="font-size:11px;color:var(--muted)">JPG / JPEG / PNG</span>
          <input id="cq-sign-file" type="file" accept="image/jpeg,image/png" hidden>
        </label>

        <div class="cq-sign-preview">
          <span class="cq-sign-empty" id="cq-sign-empty">Memuat tanda tangan tersimpan...</span>
          <img id="cq-sign-img" alt="Preview tanda tangan" style="display:none">
        </div>
        <div class="cq-sign-msg" id="cq-sign-msg"></div>

        <div class="cq-sign-actions">
          <button type="button" class="btn btn-sm" id="cq-sign-delete">${signatureSvg('trash',15)} Hapus</button>
          <button type="button" class="btn btn-sm" id="cq-sign-close">Tutup</button>
          <button type="button" class="btn" id="cq-sign-save">${signatureSvg('check',15)} Simpan Tanda Tangan</button>
        </div>
      </div>`;
    overlay.onclick=closeSignatureModal;
    document.body.appendChild(overlay);

    const file=document.getElementById('cq-sign-file');
    const img=document.getElementById('cq-sign-img');
    const empty=document.getElementById('cq-sign-empty');
    const msg=document.getElementById('cq-sign-msg');
    const save=document.getElementById('cq-sign-save');
    const del=document.getElementById('cq-sign-delete');

    document.getElementById('cq-sign-close').onclick=closeSignatureModal;

    file.onchange=async()=>{
      try{
        msg.textContent='Memproses foto dan menghapus background...';
        signatureProcessedPng=await processSignatureImage(file.files?.[0]);
        img.src=signatureProcessedPng;
        img.style.display='block';
        empty.style.display='none';
        msg.textContent='Preview siap. Klik Simpan Tanda Tangan.';
      }catch(err){
        signatureProcessedPng='';
        msg.textContent=err?.message||'Gagal memproses gambar.';
      }
    };

    save.onclick=async()=>{
      if(!signatureProcessedPng){
        msg.textContent='Pilih foto tanda tangan terlebih dahulu.';
        return;
      }
      const old=save.innerHTML;
      save.disabled=true; save.innerHTML='<span class="spinner"></span>Menyimpan...';
      try{
        const base64=signatureProcessedPng.split(',')[1]||'';
        const result=await signatureRequest('POST',{png_base64:base64});
        if(result.url){
          img.src=result.url;
          img.style.display='block';
          empty.style.display='none';
        }
        signatureProcessedPng='';
        msg.textContent='Tanda tangan berhasil disimpan.';
        if(typeof showToast==='function') showToast('Tanda tangan berhasil disimpan');
      }catch(err){
        msg.textContent=err?.message||'Gagal menyimpan tanda tangan.';
        if(typeof showToast==='function') showToast(msg.textContent,true);
      }finally{
        save.disabled=false;save.innerHTML=old;
      }
    };

    del.onclick=async()=>{
      if(!confirm('Hapus tanda tangan tersimpan?')) return;
      const old=del.innerHTML;del.disabled=true;del.innerHTML='<span class="spinner"></span>Menghapus...';
      try{
        await signatureRequest('DELETE');
        signatureProcessedPng='';
        img.removeAttribute('src');img.style.display='none';
        empty.style.display='inline';empty.textContent='Belum ada tanda tangan tersimpan.';
        msg.textContent='Tanda tangan berhasil dihapus.';
        if(typeof showToast==='function') showToast('Tanda tangan berhasil dihapus');
      }catch(err){
        msg.textContent=err?.message||'Gagal menghapus tanda tangan.';
      }finally{
        del.disabled=false;del.innerHTML=old;
      }
    };

    try{
      const result=await signatureRequest('GET');
      if(result.exists && result.url){
        img.src=result.url;img.style.display='block';empty.style.display='none';
        msg.textContent='Tanda tangan sudah tersimpan. Anda dapat menggantinya kapan saja.';
      }else{
        empty.textContent='Belum ada tanda tangan tersimpan.';
        msg.textContent='';
      }
    }catch(err){
      empty.textContent='Preview tanda tangan';
      msg.textContent=err?.message||'Belum dapat membaca tanda tangan.';
    }
  }

  window.openTeacherSignature=openSignatureModal;

  function addSignatureButtonToAccount(){
    const modal=document.getElementById('account-modal');
    if(!modal || !modal.classList.contains('open')) return;
    if(document.getElementById('cq-sign-account-btn')) return;

    const target =
      document.getElementById('pane-foto') ||
      modal.querySelector('.modal-content') ||
      modal.querySelector('.modal-card') ||
      modal.firstElementChild;

    if(!target) return;

    const wrap=document.createElement('div');
    wrap.id='cq-sign-account-btn';
    wrap.style.cssText='margin-top:12px;padding-top:12px;border-top:1px solid var(--border,#dbe5e4)';
    wrap.innerHTML=`
      <div style="font-size:12px;font-weight:800;margin-bottom:4px">Tanda Tangan Rapor</div>
      <div style="font-size:11px;color:var(--muted,#70817f);margin-bottom:8px">
        Upload foto tanda tangan. Background putih akan otomatis dihapus.
      </div>
      <button type="button" class="cq-sign-account-btn">${signatureSvg('pen',16)} Kelola Tanda Tangan</button>`;
    wrap.querySelector('button').onclick=openSignatureModal;
    target.appendChild(wrap);
  }

  // Hook aman: fungsi asli tetap dijalankan.
  if(typeof openAccountModal==='function'){
    const originalOpenAccountModal=openAccountModal;
    openAccountModal=function(){
      originalOpenAccountModal.apply(this,arguments);
      setTimeout(addSignatureButtonToAccount,50);
    };
  }

  // Fallback jika modal dibuka dengan mekanisme lain.
  const observer=new MutationObserver(()=>addSignatureButtonToAccount());
  observer.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
})();
