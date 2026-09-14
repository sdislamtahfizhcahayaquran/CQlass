/* CQlass — UKS camera compatibility
   Makes desktop use the normal webcam instead of forcing an environment camera,
   waits for a real video frame before enabling capture, and offers camera switching
   when the device exposes more than one camera.
*/
(function(){
  'use strict';
  if(window.__cqUksCameraCompat) return;
  window.__cqUksCameraCompat=true;

  const md=navigator.mediaDevices;
  if(!md||typeof md.getUserMedia!=='function') return;

  const nativeGetUserMedia=md.getUserMedia.bind(md);
  let cameras=[];
  let selectedIndex=0;
  let refreshing=false;

  const isMobile=()=>/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'') ||
    (/Macintosh/i.test(navigator.userAgent||'') && Number(navigator.maxTouchPoints||0)>1);
  const isUksCameraPage=()=>{
    const host=document.getElementById('cq-uks-camera');
    if(!host) return false;
    try{return typeof activeModule==='undefined'||String(activeModule)==='uks-duty-report'}catch(_){return true}
  };

  async function refreshCameras(){
    if(refreshing||typeof md.enumerateDevices!=='function') return cameras;
    refreshing=true;
    try{
      const devices=await md.enumerateDevices();
      cameras=(devices||[]).filter(d=>d.kind==='videoinput');
      if(selectedIndex>=cameras.length) selectedIndex=0;
      ensureSwitchButton();
      return cameras;
    }catch(_){return cameras}
    finally{refreshing=false}
  }

  function buildVideoConstraints(input){
    let video=input===true?{}:{...(input||{})};

    // On Windows/macOS a forced "environment" preference may select an IR/virtual
    // camera and produce a black preview. Desktop should use the browser's normal camera.
    if(!isMobile()) delete video.facingMode;

    // A user-selected camera always wins over facingMode.
    const selected=cameras[selectedIndex];
    if(selectedIndex>0&&selected?.deviceId){
      delete video.facingMode;
      video.deviceId={exact:selected.deviceId};
    }
    return video;
  }

  async function compatibleGetUserMedia(constraints){
    if(!isUksCameraPage()||!constraints||!constraints.video){
      return nativeGetUserMedia(constraints);
    }
    const next={...constraints,video:buildVideoConstraints(constraints.video)};
    try{
      const stream=await nativeGetUserMedia(next);
      setTimeout(refreshCameras,0);
      return stream;
    }catch(err){
      // If an explicitly selected camera disappeared, fall back to the default one.
      if(selectedIndex>0){
        selectedIndex=0;
        const fallback={...constraints,video:buildVideoConstraints(constraints.video)};
        const stream=await nativeGetUserMedia(fallback);
        setTimeout(refreshCameras,0);
        return stream;
      }
      throw err;
    }
  }

  try{md.getUserMedia=compatibleGetUserMedia}catch(_){
    try{Object.defineProperty(md,'getUserMedia',{configurable:true,writable:true,value:compatibleGetUserMedia})}catch(__){}
  }

  function captureButton(){
    const actions=document.getElementById('cq-uks-actions');
    if(!actions) return null;
    return [...actions.querySelectorAll('button')].find(b=>String(b.getAttribute('onclick')||'').includes('cqUksCapture'))||null;
  }
  function showHint(message,error=false){
    const el=document.getElementById('cq-uks-error');
    if(!el) return;
    el.textContent=message;
    el.style.display='block';
    if(!error){
      el.style.background='#fff8e8';
      el.style.color='#806018';
    }
  }
  function clearCompatHint(){
    const el=document.getElementById('cq-uks-error');
    if(!el) return;
    if(/preview kamera|ganti kamera|menyiapkan kamera/i.test(el.textContent||'')){
      el.textContent='';el.style.display='none';el.style.background='';el.style.color='';
    }
  }

  function ensureSwitchButton(){
    const actions=document.getElementById('cq-uks-actions');
    const video=document.getElementById('cq-uks-video');
    if(!actions||!video||cameras.length<2) return;
    if(actions.querySelector('[data-cq-uks-switch-camera]')) return;
    const capture=captureButton();
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='cq-uks-btn soft';
    btn.dataset.cqUksSwitchCamera='1';
    btn.textContent='Ganti Kamera';
    btn.onclick=()=>window.cqUksSwitchCamera?.();
    if(capture) actions.insertBefore(btn,capture); else actions.appendChild(btn);
  }

  function sampleLooksBlack(video){
    try{
      if(!video.videoWidth||!video.videoHeight||video.readyState<2) return false;
      const c=document.createElement('canvas');c.width=24;c.height=18;
      const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(video,0,0,c.width,c.height);
      const d=x.getImageData(0,0,c.width,c.height).data;
      let bright=0,almostBlack=0,pixels=0;
      for(let i=0;i<d.length;i+=4){
        const y=.299*d[i]+.587*d[i+1]+.114*d[i+2];
        bright+=y;if(y<5)almostBlack++;pixels++;
      }
      return pixels>0&&almostBlack/pixels>.985&&bright/pixels<4;
    }catch(_){return false}
  }

  function tuneVideo(video){
    if(!video||video.dataset.cqUksCompat==='1') return;
    video.dataset.cqUksCompat='1';
    video.autoplay=true;video.muted=true;video.playsInline=true;
    video.setAttribute('autoplay','');video.setAttribute('muted','');video.setAttribute('playsinline','');
    video.style.transform='translateZ(0)';

    const btn=captureButton();if(btn)btn.disabled=true;
    showHint('Menyiapkan preview kamera…');

    let done=false;
    const markReady=()=>{
      if(done) return;
      if(video.videoWidth>0&&video.videoHeight>0&&video.readyState>=2){
        done=true;
        const capture=captureButton();if(capture)capture.disabled=false;
        clearCompatHint();
        ensureSwitchButton();
        setTimeout(()=>{
          if(document.getElementById('cq-uks-video')!==video) return;
          if(sampleLooksBlack(video)){
            showHint(cameras.length>1?'Preview kamera terlihat hitam. Coba tombol Ganti Kamera.':'Preview kamera terlihat hitam. Pastikan penutup kamera terbuka dan kamera tidak sedang dipakai aplikasi lain.');
          }
        },1300);
      }
    };

    const play=()=>video.play().catch(()=>{});
    video.addEventListener('loadedmetadata',()=>{play();markReady()},{once:true});
    video.addEventListener('loadeddata',markReady);
    video.addEventListener('canplay',markReady);
    video.addEventListener('playing',markReady);
    play();

    let tries=0;
    const poll=setInterval(()=>{
      if(document.getElementById('cq-uks-video')!==video){clearInterval(poll);return}
      markReady();
      if(done||++tries>=50){
        clearInterval(poll);
        if(!done){
          const capture=captureButton();if(capture)capture.disabled=true;
          showHint(cameras.length>1?'Preview kamera belum terbaca. Coba Ganti Kamera.':'Preview kamera belum terbaca. Tutup kamera lalu buka lagi.');
          ensureSwitchButton();
        }
      }
    },100);
  }

  window.cqUksSwitchCamera=async function(){
    await refreshCameras();
    if(cameras.length<2){showHint('Perangkat ini hanya mendeteksi satu kamera.');return}
    selectedIndex=(selectedIndex+1)%cameras.length;
    try{window.cqUksStopCamera?.()}catch(_){ }
    setTimeout(()=>{try{window.cqUksStartCamera?.()}catch(_){}},120);
  };

  const observer=new MutationObserver(()=>{
    const video=document.getElementById('cq-uks-video');
    if(video)tuneVideo(video);
    ensureSwitchButton();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  document.addEventListener('visibilitychange',()=>{
    if(!document.hidden){
      const video=document.getElementById('cq-uks-video');
      if(video){video.play().catch(()=>{});setTimeout(()=>tuneVideo(video),0)}
    }
  });

  setTimeout(refreshCameras,300);
})();
