/* CQlass — preview & rotate tanda tangan sebelum disimpan */
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

  function render(){
    const url=current();
    const preview=document.getElementById('teacher-signature-preview');
    if(!preview || !url) return;
    preview.innerHTML=`
      <div class="cq-sign-preview-shell">
        <div class="cq-sign-preview-head">
          <strong>Preview sebelum disimpan</strong>
          <span>Pastikan posisi tanda tangan sudah benar</span>
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
      </div>`;
  }

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
      msg('Periksa preview. Jika sudah benar, klik Simpan Tanda Tangan.');
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
        msg('Preview siap. Jika terbalik/miring, putar dulu. Setelah benar klik Simpan Tanda Tangan.');
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
    .cq-sign-preview-stage{min-height:130px;border:1px dashed rgba(10,110,110,.25);border-radius:12px;background:linear-gradient(45deg,#f7fbfa 25%,transparent 25%),linear-gradient(-45deg,#f7fbfa 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f7fbfa 75%),linear-gradient(-45deg,transparent 75%,#f7fbfa 75%);background-size:18px 18px;background-position:0 0,0 9px,9px -9px,-9px 0;display:flex;align-items:center;justify-content:center;padding:12px;overflow:hidden}
    .cq-sign-preview-stage img{display:block;max-width:100%;max-height:160px;object-fit:contain}
    .cq-sign-preview-tools{display:flex;gap:7px;flex-wrap:wrap;justify-content:center;margin-top:10px}
    .cq-sign-preview-tools button{border:1px solid rgba(10,110,110,.24);background:#fff;color:#08746f;border-radius:8px;padding:7px 10px;font:inherit;font-size:10.5px;font-weight:700;cursor:pointer}
    .cq-sign-preview-tools button:hover{background:#eaf6f4}.cq-sign-preview-tools button:disabled{opacity:.45;cursor:wait}
    @media(max-width:520px){.cq-sign-preview-head{align-items:flex-start;flex-direction:column}.cq-sign-preview-tools button{flex:1 1 calc(50% - 8px)}}`;
  if(!document.getElementById(css.id)) document.head.appendChild(css);

  let tries=0;
  (function bind(){
    wrapHandler();
    if(++tries<120 && (!window.handleTeacherSignatureSelect || !window.handleTeacherSignatureSelect.__cqPreviewWrapped)) setTimeout(bind,100);
  })();
})();
