/* CQlass — click-to-zoom foto profil */
(function(){
  'use strict';
  if(window.__cqProfilePhotoZoom) return;
  window.__cqProfilePhotoZoom=true;

  let overlay=null;
  let lastFocus=null;

  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]});
  }
  function displayName(){
    try{
      const u=(typeof currentUser!=='undefined'&&currentUser)?currentUser:{};
      return u.nama||u.full_name||u.name||u.teacher_name||u.username||'Foto profil';
    }catch(_){return 'Foto profil';}
  }
  function ensureOverlay(){
    if(overlay&&document.body.contains(overlay)) return overlay;
    overlay=document.createElement('div');
    overlay.id='cq-profile-photo-zoom';
    overlay.className='cq-profile-photo-zoom';
    overlay.setAttribute('aria-hidden','true');
    overlay.innerHTML='<div class="cq-ppz-dialog" role="dialog" aria-modal="true" aria-label="Foto profil diperbesar"><button type="button" class="cq-ppz-close" aria-label="Tutup foto">&times;</button><img class="cq-ppz-image" alt="Foto profil"><div class="cq-ppz-name"></div></div>';
    document.body.appendChild(overlay);
    overlay.addEventListener('click',function(e){ if(e.target===overlay) closeZoom(); });
    overlay.querySelector('.cq-ppz-close').addEventListener('click',closeZoom);
    return overlay;
  }
  function openZoom(src,trigger){
    if(!src) return;
    const root=ensureOverlay();
    lastFocus=trigger||document.activeElement;
    const img=root.querySelector('.cq-ppz-image');
    const name=root.querySelector('.cq-ppz-name');
    img.src=src;
    name.textContent=displayName();
    root.classList.add('show');
    root.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('cq-ppz-open');
    setTimeout(function(){ root.querySelector('.cq-ppz-close')?.focus(); },0);
  }
  function closeZoom(){
    if(!overlay) return;
    overlay.classList.remove('show');
    overlay.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('cq-ppz-open');
    try{ if(lastFocus&&typeof lastFocus.focus==='function') lastFocus.focus(); }catch(_){ }
  }
  window.closeProfilePhotoZoom=closeZoom;

  function imageFromTarget(target){
    if(!target||!target.closest) return null;
    const slot=target.closest('.user-photo-slot');
    if(slot){
      const img=slot.querySelector('img');
      return img?{img,trigger:slot}:null;
    }
    const preview=target.closest('.foto-profil-preview');
    if(preview){
      const img=preview.querySelector('img');
      return img?{img,trigger:preview}:null;
    }
    return null;
  }

  document.addEventListener('click',function(e){
    const found=imageFromTarget(e.target);
    if(!found) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openZoom(found.img.currentSrc||found.img.src,found.trigger);
  },true);

  document.addEventListener('keydown',function(e){
    if(e.key==='Escape'&&overlay?.classList.contains('show')){ e.preventDefault(); closeZoom(); return; }
    if(e.key!=='Enter'&&e.key!==' ') return;
    const found=imageFromTarget(e.target);
    if(!found) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openZoom(found.img.currentSrc||found.img.src,found.trigger);
  },true);

  function decorate(){
    document.querySelectorAll('.user-photo-slot').forEach(function(slot){
      const hasPhoto=!!slot.querySelector('img');
      if(hasPhoto){
        slot.title='Klik untuk memperbesar foto profil';
        slot.setAttribute('aria-label','Perbesar foto profil');
        slot.style.cursor='zoom-in';
      }else{
        slot.title='Klik untuk mengganti foto profil';
        slot.setAttribute('aria-label','Ganti foto profil');
        slot.style.cursor='pointer';
      }
    });
    document.querySelectorAll('.foto-profil-preview').forEach(function(preview){
      if(preview.querySelector('img')){
        preview.title='Klik untuk memperbesar foto';
        preview.setAttribute('role','button');
        preview.setAttribute('tabindex','0');
        preview.style.cursor='zoom-in';
      }
    });
  }

  const css=document.createElement('style');
  css.id='cq-profile-photo-zoom-css';
  css.textContent=`
    .cq-ppz-open{overflow:hidden}
    .cq-profile-photo-zoom{position:fixed;inset:0;z-index:100000;background:rgba(4,22,22,.72);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:24px;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .18s ease,visibility .18s ease}
    .cq-profile-photo-zoom.show{opacity:1;visibility:visible;pointer-events:auto}
    .cq-ppz-dialog{position:relative;display:flex;flex-direction:column;align-items:center;gap:14px;max-width:min(88vw,520px);transform:scale(.94);transition:transform .18s ease}
    .cq-profile-photo-zoom.show .cq-ppz-dialog{transform:scale(1)}
    .cq-ppz-image{display:block;width:min(72vw,430px);height:min(72vw,430px);max-width:430px;max-height:430px;object-fit:cover;border-radius:50%;background:#eef8f6;box-shadow:0 26px 80px rgba(0,0,0,.36),0 0 0 6px rgba(255,255,255,.16)}
    .cq-ppz-name{color:#fff;font-weight:800;font-size:16px;text-align:center;text-shadow:0 2px 12px rgba(0,0,0,.28)}
    .cq-ppz-close{position:absolute;right:-14px;top:-14px;width:42px;height:42px;border:1px solid rgba(255,255,255,.34);border-radius:50%;background:rgba(9,62,59,.92);color:#fff;font:500 30px/1 Arial,sans-serif;display:grid;place-items:center;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.25)}
    .cq-ppz-close:hover{background:#0a7770}.cq-ppz-close:focus-visible{outline:3px solid rgba(255,255,255,.7);outline-offset:3px}
    .user-photo-slot:has(img),.foto-profil-preview:has(img){cursor:zoom-in!important}
    @media(max-width:600px){.cq-profile-photo-zoom{padding:18px}.cq-ppz-image{width:min(82vw,360px);height:min(82vw,360px)}.cq-ppz-close{right:-4px;top:-16px;width:40px;height:40px}.cq-ppz-name{font-size:14px}}
  `;
  document.head.appendChild(css);

  const observer=new MutationObserver(function(){ decorate(); });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',decorate,{once:true});
  else decorate();
})();
