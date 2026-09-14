/* CQlass — UKS duty realtime camera report
   - Sidebar UKS only appears for teachers listed in the UKS duty roster.
   - Report contains photo only.
   - Photo must be captured from the live device camera (no gallery/file picker).
   - One report per teacher/shift/day; server time is the source of truth.
*/
(function(){
  'use strict';
  if(window.__cqUksDuty) return;
  window.__cqUksDuty=true;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
  const API=BASE+'/functions/v1/uks-duty';
  const GROUP_ID='uks-duty-group';
  const MODULE_ID='uks-duty-report';
  const state={boot:null,stream:null,captured:'',captureShiftNo:null,busy:false,timer:null,loading:false};

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const getUser=()=>{try{return typeof currentUser!=='undefined'?currentUser:null}catch(_){return null}};
  const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}};
  const toast=(m,e)=>{try{if(typeof showToast==='function')return showToast(m,!!e)}catch(_){ } if(e)console.error(m);else console.log(m)};
  const fmtTime=v=>String(v||'').slice(0,5).replace(':','.');
  const fmtCaptured=v=>{try{return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(v))+' WIB'}catch(_){return String(v||'')}};
  const dayName=n=>({1:'Senin',2:'Selasa',3:'Rabu',4:'Kamis',5:'Jumat',6:'Sabtu',7:'Ahad'}[Number(n)]||'');

  function headers(){
    const h={'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY};
    const t=token();if(t)h['x-session-token']=t;return h;
  }
  async function req(action,payload={}){
    const ctrl=new AbortController();const tm=setTimeout(()=>ctrl.abort(),35000);
    try{
      const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify({action,...payload}),signal:ctrl.signal});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.success===false){const e=new Error(d.error||'request_failed');e.data=d;e.status=r.status;throw e}
      return d;
    }catch(e){if(e?.name==='AbortError')throw new Error('Koneksi UKS terlalu lama. Coba lagi.');throw e}
    finally{clearTimeout(tm)}
  }

  function stopCamera(){
    try{state.stream?.getTracks?.().forEach(t=>t.stop())}catch(_){ }
    state.stream=null;
    const v=document.getElementById('cq-uks-video');if(v){try{v.srcObject=null}catch(_){ }}
  }
  function resetCapture(){stopCamera();state.captured='';state.captureShiftNo=null;}

  function removeMenu(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return;
      const i=MODULE_GROUPS.findIndex(g=>g&&g.id===GROUP_ID);
      if(i>=0)MODULE_GROUPS.splice(i,1);
    }catch(_){ }
  }
  function ensureMenu(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
      const u=getUser();if(!u||!state.boot?.assigned){removeMenu();return false}
      const role=String(u.role||'guru').toLowerCase();
      let g=MODULE_GROUPS.find(x=>x&&x.id===GROUP_ID);
      const item={id:MODULE_ID,label:'Laporan',roles:[role],built:true,render:renderUksPage};
      if(!g){
        g={id:GROUP_ID,label:'UKS',roles:[role],items:[item]};
        const k=MODULE_GROUPS.findIndex(x=>x&&x.id==='kesiswaan');
        MODULE_GROUPS.splice(k>=0?k+1:MODULE_GROUPS.length,0,g);
      }else{
        g.label='UKS';g.roles=[role];g.items=[item];
      }
      return true;
    }catch(e){console.warn('UKS menu:',e);return false}
  }
  function redrawSidebar(){try{if(typeof renderSidebar==='function')renderSidebar()}catch(_){ }}

  async function bootstrap(opts={}){
    if(state.loading||!getUser()||!token())return state.boot;
    state.loading=true;
    try{
      const data=await req('bootstrap');
      const previousAssigned=!!state.boot?.assigned;
      const previousActive=Number(state.boot?.active_shift?.shift_no||0);
      state.boot=data;
      if(data.assigned)ensureMenu();else removeMenu();
      const activeNow=Number(data.active_shift?.shift_no||0);
      if(previousAssigned!==!!data.assigned||previousActive!==activeNow||opts.redraw)redrawSidebar();
      if(opts.rerender&&isModuleActive()){
        const c=document.getElementById('content');if(c)renderUksPage(c,{skipRefresh:true});
      }
      return data;
    }catch(e){
      console.warn('UKS bootstrap gagal:',e);
      if(e?.message==='forbidden'||e?.message==='teacher_not_linked'){state.boot={assigned:false};removeMenu();redrawSidebar()}
      return state.boot;
    }finally{state.loading=false}
  }

  function isModuleActive(){
    try{if(typeof activeModule!=='undefined')return String(activeModule)===MODULE_ID}catch(_){ }
    return false;
  }

  function injectCss(){
    if(document.getElementById('cq-uks-css'))return;
    const s=document.createElement('style');s.id='cq-uks-css';
    s.textContent=`
      .cq-uks{max-width:860px;margin:0 auto;padding:2px 0 28px;color:#183d3b}
      .cq-uks-hero{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;background:linear-gradient(135deg,#0c6c69,#148f86);color:#fff;border-radius:22px;padding:22px 24px;margin-bottom:14px;box-shadow:0 10px 28px rgba(13,108,105,.13)}
      .cq-uks-hero h1{font-size:25px;margin:2px 0 5px;line-height:1.1}.cq-uks-hero p{margin:0;font-size:12px;opacity:.86}.cq-uks-eyebrow{font-size:10px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;opacity:.72}
      .cq-uks-shift{background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);border-radius:13px;padding:9px 12px;font-size:11px;font-weight:800;white-space:nowrap}
      .cq-uks-card{background:#fff;border:1px solid rgba(18,105,101,.13);border-radius:18px;padding:18px;box-shadow:0 7px 24px rgba(30,91,87,.06);margin-bottom:12px}
      .cq-uks-status{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.cq-uks-status-main{font-size:14px;font-weight:900;color:#193f3d}.cq-uks-status-sub{font-size:11px;color:#728b88;margin-top:4px;line-height:1.45}
      .cq-uks-pill{display:inline-flex;align-items:center;border-radius:999px;padding:6px 9px;font-size:10px;font-weight:900;background:#e9f7f4;color:#11756f}.cq-uks-pill.wait{background:#fff5df;color:#8a651d}.cq-uks-pill.done{background:#eaf7ee;color:#28734b}
      .cq-uks-camera{overflow:hidden;border-radius:16px;background:#0d1d1c;min-height:280px;display:grid;place-items:center;position:relative}.cq-uks-camera video,.cq-uks-camera img{display:block;width:100%;height:min(58vh,520px);object-fit:cover;background:#0d1d1c}.cq-uks-camera-empty{padding:38px 22px;text-align:center;color:#d9e7e5}.cq-uks-camera-empty strong{display:block;color:#fff;font-size:16px;margin-bottom:7px}.cq-uks-camera-empty span{font-size:11px;line-height:1.5;color:#a9bfbc}
      .cq-uks-actions{display:flex;gap:9px;justify-content:center;flex-wrap:wrap;margin-top:14px}.cq-uks-btn{border:0;border-radius:12px;padding:11px 15px;font:800 12px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.cq-uks-btn.primary{background:#0d8179;color:#fff}.cq-uks-btn.soft{background:#edf7f5;color:#176e68}.cq-uks-btn:disabled{opacity:.5;cursor:not-allowed}
      .cq-uks-note{text-align:center;font-size:10.5px;color:#7c9290;line-height:1.5;margin-top:10px}.cq-uks-error{margin-top:10px;padding:10px 12px;border-radius:11px;background:#fff0f0;color:#a64242;font-size:11px;font-weight:700;display:none}
      .cq-uks-proof{display:grid;grid-template-columns:145px 1fr;gap:14px;align-items:center}.cq-uks-proof img{width:145px;height:105px;border-radius:12px;object-fit:cover;background:#edf4f3}.cq-uks-proof strong{font-size:14px}.cq-uks-proof p{font-size:11px;color:#728986;line-height:1.5;margin:5px 0 0}
      .cq-uks-today{display:flex;gap:7px;flex-wrap:wrap;margin-top:8px}.cq-uks-today span{font-size:10px;font-weight:800;background:#f1f7f6;border-radius:999px;padding:5px 8px;color:#55726f}
      @media(max-width:700px){.cq-uks{padding:0}.cq-uks-hero{padding:18px;border-radius:17px}.cq-uks-hero h1{font-size:22px}.cq-uks-shift{white-space:normal}.cq-uks-card{padding:14px;border-radius:15px}.cq-uks-camera{min-height:230px;border-radius:13px}.cq-uks-camera video,.cq-uks-camera img{height:52vh;max-height:430px}.cq-uks-proof{grid-template-columns:110px 1fr}.cq-uks-proof img{width:110px;height:82px}.cq-uks-btn{flex:1;min-width:120px}}
    `;
    document.head.appendChild(s);
  }

  function activeReport(){
    const shift=Number(state.boot?.active_shift?.shift_no||0);
    return (state.boot?.today_reports||[]).find(r=>Number(r.shift_no)===shift)||null;
  }
  function latestTodayReport(){
    const a=[...(state.boot?.today_reports||[])];return a.sort((x,y)=>Number(y.shift_no)-Number(x.shift_no))[0]||null;
  }
  function todayScheduleHtml(){
    const rows=state.boot?.today_schedule||[];
    if(!rows.length)return '';
    return `<div class="cq-uks-today">${rows.map(r=>`<span>Shift ${Number(r.shift_no)} · ${fmtTime(r.start_time)}–${fmtTime(r.end_time)}</span>`).join('')}</div>`;
  }
  function cameraPlaceholder(active){
    if(!active)return `<div class="cq-uks-camera-empty"><strong>Kamera belum aktif</strong><span>Kamera hanya dibuka saat jam shift UKS Anda berlangsung.</span></div>`;
    return `<div class="cq-uks-camera-empty"><strong>Foto bukti piket UKS</strong><span>Tekan tombol di bawah untuk membuka kamera perangkat. Tidak ada pilihan upload dari galeri.</span></div>`;
  }
  function proofHtml(report){
    if(!report)return '';
    const src=esc(report.photo_signed_url||'');
    return `<div class="cq-uks-card"><div class="cq-uks-proof">${src?`<img src="${src}" alt="Foto laporan UKS">`:'<div></div>'}<div><span class="cq-uks-pill done">Sudah terkirim</span><div style="margin-top:8px"><strong>Laporan Shift ${Number(report.shift_no)}</strong><p>${fmtCaptured(report.captured_at||report.created_at)}<br>Foto tersimpan otomatis sebagai bukti piket UKS.</p></div></div></div></div>`;
  }

  async function renderUksPage(content,opts={}){
    injectCss();stopCamera();state.captured='';state.captureShiftNo=null;
    content.innerHTML=`<div class="cq-uks"><div class="cq-uks-card"><span class="spinner"></span> Memuat jadwal UKS...</div></div>`;
    if(!opts.skipRefresh)await bootstrap({redraw:false});
    const b=state.boot;
    if(!b?.assigned){content.innerHTML=`<div class="cq-uks"><div class="cq-uks-card"><div class="cq-uks-status-main">Akun ini tidak memiliki jadwal jaga UKS.</div></div></div>`;return}
    const u=getUser()||{};
    const active=b.active_shift||null;
    const report=activeReport();
    const latest=latestTodayReport();
    const titleShift=active?`Shift ${Number(active.shift_no)} · ${fmtTime(active.start_time)}–${fmtTime(active.end_time)}`:'Jadwal UKS';
    const scheduleInfo=(b.today_schedule||[]).length?`${dayName(b.server?.weekday)} · ${titleShift}`:`Hari ini tidak ada shift`;
    const statusText=report?'Laporan shift ini sudah dikirim':active?'Saatnya laporan foto UKS':(b.today_schedule||[]).length?'Kamera aktif saat jam shift Anda':'Hari ini Anda tidak bertugas UKS';
    const statusClass=report?'done':active?'':'wait';

    content.innerHTML=`<div class="cq-uks">
      <div class="cq-uks-hero"><div><div class="cq-uks-eyebrow">Piket UKS</div><h1>Laporan</h1><p>Foto realtime dari kamera perangkat · tanggal dan jam tercatat otomatis.</p></div><div class="cq-uks-shift">${esc(scheduleInfo)}</div></div>
      <div class="cq-uks-card"><div class="cq-uks-status"><div><div class="cq-uks-status-main">${esc(b.teacher?.name||u.nama||'Guru')}</div><div class="cq-uks-status-sub">${esc(statusText)}${todayScheduleHtml()}</div></div><span class="cq-uks-pill ${statusClass}">${report?'Terkirim':active?'Aktif':'Menunggu'}</span></div></div>
      ${report?proofHtml(report):active?`<div class="cq-uks-card"><div class="cq-uks-camera" id="cq-uks-camera">${cameraPlaceholder(true)}</div><div class="cq-uks-actions" id="cq-uks-actions"><button type="button" class="cq-uks-btn primary" onclick="cqUksStartCamera()">Buka Kamera</button></div><div class="cq-uks-error" id="cq-uks-error"></div><div class="cq-uks-note">Foto diambil langsung dari kamera. Galeri/file upload tidak tersedia.</div></div>`:(latest?proofHtml(latest):`<div class="cq-uks-card"><div class="cq-uks-camera">${cameraPlaceholder(false)}</div><div class="cq-uks-note">${(b.today_schedule||[]).length?'Silakan kembali pada jam shift yang tertera.':'Tidak ada laporan yang perlu dikirim hari ini.'}</div></div>`)}
    </div>`;
  }

  function showCameraError(msg){
    const el=document.getElementById('cq-uks-error');if(!el)return;el.textContent=String(msg||'Kamera tidak dapat dibuka.');el.style.display='block';
  }
  function clearCameraError(){const el=document.getElementById('cq-uks-error');if(el){el.textContent='';el.style.display='none'}}

  async function startCamera(){
    clearCameraError();
    if(!state.boot?.active_shift){showCameraError('Saat ini bukan jam shift UKS Anda.');return}
    if(activeReport()){showCameraError('Laporan shift ini sudah dikirim.');return}
    if(!navigator.mediaDevices?.getUserMedia){showCameraError('Browser/perangkat ini tidak mendukung kamera realtime. Buka CQlass melalui browser HP yang mengizinkan kamera.');return}
    stopCamera();state.captured='';state.captureShiftNo=null;
    const host=document.getElementById('cq-uks-camera'),actions=document.getElementById('cq-uks-actions');if(!host||!actions)return;
    actions.innerHTML=`<button type="button" class="cq-uks-btn primary" disabled>Meminta izin kamera...</button>`;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1920},height:{ideal:1080}}});
      state.stream=stream;
      host.innerHTML='<video id="cq-uks-video" autoplay muted playsinline></video>';
      const v=document.getElementById('cq-uks-video');v.srcObject=stream;await v.play().catch(()=>{});
      actions.innerHTML=`<button type="button" class="cq-uks-btn soft" onclick="cqUksStopCamera()">Tutup</button><button type="button" class="cq-uks-btn primary" onclick="cqUksCapture()">Ambil Foto</button>`;
    }catch(e){
      stopCamera();
      const m=e?.name==='NotAllowedError'?'Izin kamera ditolak. Izinkan kamera untuk situs CQlass lalu coba lagi.':e?.name==='NotFoundError'?'Kamera tidak ditemukan pada perangkat ini.':'Kamera tidak dapat dibuka. Pastikan izin kamera aktif.';
      host.innerHTML=cameraPlaceholder(true);actions.innerHTML=`<button type="button" class="cq-uks-btn primary" onclick="cqUksStartCamera()">Coba Lagi</button>`;showCameraError(m);
    }
  }

  function capturePhoto(){
    clearCameraError();
    const v=document.getElementById('cq-uks-video');const active=state.boot?.active_shift;
    if(!v||!state.stream||!active){showCameraError('Kamera belum aktif.');return}
    const sw=v.videoWidth||1280,sh=v.videoHeight||720;if(!sw||!sh){showCameraError('Kamera belum siap. Tunggu sebentar lalu coba lagi.');return}
    const max=1600,scale=Math.min(1,max/Math.max(sw,sh));const w=Math.max(1,Math.round(sw*scale)),h=Math.max(1,Math.round(sh*scale));
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d',{alpha:false});ctx.drawImage(v,0,0,w,h);
    const overlayH=Math.max(78,Math.round(h*.13));ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillRect(0,h-overlayH,w,overlayH);
    const user=getUser()||{};const teacher=state.boot?.teacher?.name||user.nama||'Guru';
    const nowText=(()=>{try{return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date()).replace(',', '')+' WIB'}catch(_){return ''}})();
    const pad=Math.max(14,Math.round(w*.018));const f1=Math.max(18,Math.round(w*.025));const f2=Math.max(15,Math.round(w*.020));
    ctx.fillStyle='#fff';ctx.font=`800 ${f1}px Inter,Arial,sans-serif`;ctx.textBaseline='top';ctx.fillText('UKS · '+teacher,pad,h-overlayH+Math.round(overlayH*.20),w-pad*2);
    ctx.fillStyle='rgba(255,255,255,.9)';ctx.font=`700 ${f2}px Inter,Arial,sans-serif`;ctx.fillText(`Shift ${Number(active.shift_no)} · ${nowText}`,pad,h-overlayH+Math.round(overlayH*.58),w-pad*2);
    state.captured=c.toDataURL('image/jpeg',.82);state.captureShiftNo=Number(active.shift_no);stopCamera();
    const host=document.getElementById('cq-uks-camera'),actions=document.getElementById('cq-uks-actions');if(host)host.innerHTML=`<img src="${state.captured}" alt="Preview foto UKS">`;if(actions)actions.innerHTML=`<button type="button" class="cq-uks-btn soft" onclick="cqUksRetake()">Ulangi Foto</button><button type="button" class="cq-uks-btn primary" id="cq-uks-submit" onclick="cqUksSubmit()">Kirim Laporan</button>`;
  }

  function retake(){state.captured='';state.captureShiftNo=null;const host=document.getElementById('cq-uks-camera'),actions=document.getElementById('cq-uks-actions');if(host)host.innerHTML=cameraPlaceholder(true);if(actions)actions.innerHTML=`<button type="button" class="cq-uks-btn primary" onclick="cqUksStartCamera()">Buka Kamera</button>`;startCamera()}
  function closeCamera(){stopCamera();const host=document.getElementById('cq-uks-camera'),actions=document.getElementById('cq-uks-actions');if(host)host.innerHTML=cameraPlaceholder(true);if(actions)actions.innerHTML=`<button type="button" class="cq-uks-btn primary" onclick="cqUksStartCamera()">Buka Kamera</button>`}

  async function submit(){
    clearCameraError();if(state.busy)return;
    if(!state.captured||!state.captureShiftNo){showCameraError('Ambil foto terlebih dahulu.');return}
    const btn=document.getElementById('cq-uks-submit');state.busy=true;if(btn){btn.disabled=true;btn.innerHTML='<span class="spinner"></span> Mengirim...'}
    try{
      const base64=String(state.captured).split(',')[1]||'';
      await req('submit',{shift_no:state.captureShiftNo,photo_base64:base64,photo_mime:'image/jpeg'});
      resetCapture();toast('Laporan foto UKS berhasil dikirim.');
      await bootstrap({redraw:true});
      const c=document.getElementById('content');if(c&&isModuleActive())renderUksPage(c,{skipRefresh:true});
    }catch(e){
      if(e?.message==='already_submitted'){
        resetCapture();toast('Laporan shift ini sudah tersimpan.');await bootstrap({redraw:true});const c=document.getElementById('content');if(c&&isModuleActive())renderUksPage(c,{skipRefresh:true});return;
      }
      const map={outside_shift_time:'Jam shift sudah berakhir atau belum dimulai.',not_scheduled_today:'Hari ini bukan jadwal UKS Anda.',photo_too_large:'Foto terlalu besar. Ambil ulang foto.',photo_required:'Foto belum tersedia.'};
      showCameraError(map[e?.message]||'Laporan gagal dikirim. Coba lagi.');toast(map[e?.message]||'Laporan UKS gagal dikirim.',true);
    }finally{state.busy=false;if(btn){btn.disabled=false;btn.textContent='Kirim Laporan'}}
  }

  window.cqUksStartCamera=startCamera;
  window.cqUksCapture=capturePhoto;
  window.cqUksRetake=retake;
  window.cqUksStopCamera=closeCamera;
  window.cqUksSubmit=submit;
  window.renderUksDutyReport=renderUksPage;

  function install(){
    if(typeof enterApp==='function'&&!enterApp.__cqUksDuty){
      const baseEnter=enterApp;
      const wrapped=function(){removeMenu();resetCapture();state.boot=null;const out=baseEnter.apply(this,arguments);setTimeout(()=>bootstrap({redraw:true}),140);return out};
      wrapped.__cqUksDuty=true;enterApp=wrapped;
    }
    if(typeof setActiveModule==='function'&&!setActiveModule.__cqUksDuty){
      const baseSet=setActiveModule;
      const wrapped=function(id){if(String(id)!==MODULE_ID)stopCamera();return baseSet.apply(this,arguments)};
      wrapped.__cqUksDuty=true;setActiveModule=wrapped;
    }
    if(typeof logout==='function'&&!logout.__cqUksDuty){
      const baseLogout=logout;
      const wrapped=function(){resetCapture();state.boot=null;removeMenu();return baseLogout.apply(this,arguments)};
      wrapped.__cqUksDuty=true;logout=wrapped;
    }
    if(state.timer)clearInterval(state.timer);
    state.timer=setInterval(()=>{if(getUser()&&token())bootstrap({rerender:isModuleActive()})},60000);
    if(getUser()&&token())setTimeout(()=>bootstrap({redraw:true}),80);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);
  else install();
})();
