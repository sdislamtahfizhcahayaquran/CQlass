/* CQlass — background request fix
   Request non-kritis tidak boleh memunculkan toast error global.
   Error penting pada aksi pengguna tetap ditangani oleh callApi utama/caller. */
(function(){
  'use strict';
  if(window.__cqBackgroundApiFixInstalled || typeof callApi !== 'function') return;

  const originalCallApi = callApi;
  const silentActions = new Set([
    'logAktivitas',
    'getMyPendingTasks',
    'getKeterlambatanBelumDicatat',
    'getFotoProfil'
  ]);

  async function callBackgroundApi(action, params={}){
    const body = JSON.stringify({ action, secret: APP_SECRET, ...params });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let res;
    try{
      res = await fetch(APPS_SCRIPT_URL, {
        method:'POST',
        headers:{ 'Content-Type':'text/plain;charset=utf-8' },
        body,
        redirect:'follow',
        signal:controller.signal
      });
    }catch(err){
      if(err?.name === 'AbortError') throw new Error('Server terlalu lama merespons.');
      throw new Error('Request latar belakang belum dapat diproses.');
    }finally{
      clearTimeout(timeoutId);
    }

    const raw = await res.text();
    let data;
    try{
      data = JSON.parse(raw);
    }catch(_){
      throw new Error('Respons request latar belakang tidak valid.');
    }
    return data || {};
  }

  callApi = function(action, params={}){
    if(silentActions.has(String(action || ''))){
      return callBackgroundApi(action, params);
    }
    return originalCallApi(action, params);
  };

  window.__cqBackgroundApiFixInstalled = true;
})();

/* CQlass Login Pixel-Match v3
   Visual-only layer. Tidak mengubah ID/form/login flow. */
(function(){
  'use strict';
  if(document.getElementById('cq-login-pixel-v3')) return;
  const style = document.createElement('style');
  style.id = 'cq-login-pixel-v3';
  style.textContent = `
  html,body{min-height:100%;}
  html body #login-screen{
    min-height:100vh!important;
    height:100vh!important;
    display:grid!important;
    grid-template-columns:minmax(0,59%) minmax(420px,41%)!important;
    position:relative!important;
    overflow:hidden!important;
    isolation:isolate!important;
    background:url('gedung.png') center center/cover no-repeat!important;
    color:#0b3440!important;
  }
  html body #login-screen:before{
    content:''!important;
    display:block!important;
    position:absolute!important;
    inset:0!important;
    z-index:0!important;
    pointer-events:none!important;
    background:
      linear-gradient(90deg,rgba(248,255,254,.97) 0%,rgba(244,254,253,.94) 28%,rgba(237,252,250,.72) 46%,rgba(215,247,244,.36) 59%,rgba(4,104,105,.16) 72%,rgba(4,73,78,.46) 100%),
      radial-gradient(circle at 16% 13%,rgba(255,255,255,.94),transparent 30%),
      radial-gradient(circle at 78% 40%,rgba(63,239,219,.18),transparent 31%)!important;
  }
  html body #login-screen:after{
    content:''!important;
    display:block!important;
    position:absolute!important;
    left:-4%!important;
    right:-5%!important;
    bottom:-14%!important;
    height:30%!important;
    z-index:1!important;
    pointer-events:none!important;
    border-radius:50% 50% 0 0/85% 90% 0 0!important;
    transform:rotate(-2.5deg)!important;
    background:linear-gradient(96deg,rgba(4,116,107,.98),rgba(10,166,156,.96) 48%,rgba(26,191,172,.93) 72%,rgba(5,112,111,.98))!important;
    box-shadow:0 -18px 52px rgba(0,126,118,.12)!important;
  }
  html body #login-screen .login-hero,
  html body #login-screen .login-form-panel{
    position:relative!important;
    z-index:2!important;
    min-width:0!important;
    min-height:100vh!important;
    background:transparent!important;
  }
  html body #login-screen .login-hero{
    max-width:none!important;
    padding:clamp(34px,4.7vw,76px) clamp(34px,5.2vw,86px) clamp(74px,8vh,110px)!important;
    display:flex!important;
    flex-direction:column!important;
    justify-content:center!important;
    overflow:visible!important;
  }
  html body #login-screen .login-hero:before{
    content:''!important;
    display:block!important;
    position:absolute!important;
    width:520px!important;
    height:520px!important;
    left:-330px!important;
    top:-320px!important;
    border-radius:50%!important;
    background:radial-gradient(circle,rgba(255,255,255,.98),rgba(255,255,255,0) 70%)!important;
    pointer-events:none!important;
    z-index:-1!important;
  }
  html body #login-screen .login-hero:after{
    content:''!important;
    display:block!important;
    position:absolute!important;
    left:-13%!important;
    bottom:-10%!important;
    width:112%!important;
    height:21%!important;
    border-radius:50% 48% 0 0/100% 100% 0 0!important;
    transform:rotate(3deg)!important;
    background:linear-gradient(93deg,rgba(80,210,171,.93),rgba(18,183,170,.84),rgba(3,125,120,.72))!important;
    opacity:.92!important;
    z-index:0!important;
    pointer-events:none!important;
  }
  html body #login-screen .login-hero-brand{
    position:relative!important;
    z-index:3!important;
    display:flex!important;
    align-items:center!important;
    gap:22px!important;
    margin:0 0 34px!important;
  }
  html body #login-screen .login-hero-logo{
    width:104px!important;
    height:104px!important;
    object-fit:contain!important;
    filter:drop-shadow(0 10px 22px rgba(3,93,88,.17))!important;
  }
  html body #login-screen .login-hero-brand-text .l1{
    font:800 clamp(40px,4vw,62px)/.98 var(--cq-font-display,'Plus Jakarta Sans','Inter',sans-serif)!important;
    letter-spacing:-.06em!important;
    color:#0c3d48!important;
    text-transform:none!important;
  }
  html body #login-screen .login-hero-brand-text .l2{
    margin-top:8px!important;
    font:700 clamp(13px,1.2vw,18px)/1.35 var(--cq-font-display,'Plus Jakarta Sans','Inter',sans-serif)!important;
    letter-spacing:.005em!important;
    color:#077c77!important;
    text-transform:none!important;
  }
  html body #login-screen .login-eyebrow{
    position:relative!important;
    z-index:3!important;
    margin:0 0 13px!important;
    font:700 10px/1.4 var(--cq-font-display,'Plus Jakarta Sans','Inter',sans-serif)!important;
    letter-spacing:.30em!important;
    text-transform:uppercase!important;
    color:#0a7c79!important;
  }
  html body #login-screen .login-hero-rule{
    position:relative!important;
    z-index:3!important;
    width:48px!important;
    height:3px!important;
    margin:0 0 23px!important;
    border-radius:999px!important;
    background:linear-gradient(90deg,#0aa49b,#65d3a9)!important;
    box-shadow:none!important;
  }
  html body #login-screen .login-hero h1{
    position:relative!important;
    z-index:3!important;
    max-width:650px!important;
    margin:0 0 16px!important;
    font:800 clamp(42px,4.15vw,64px)/1.01 var(--cq-font-display,'Plus Jakarta Sans','Inter',sans-serif)!important;
    letter-spacing:-.06em!important;
    color:#0b3440!important;
  }
  html body #login-screen .login-hero h1 span{display:inline!important;color:#07958c!important;font-weight:800!important;}
  html body #login-screen .login-hero p.lead{
    position:relative!important;
    z-index:3!important;
    max-width:650px!important;
    margin:0 0 25px!important;
    font:500 14px/1.68 var(--cq-font-body,'Inter',sans-serif)!important;
    color:#315f69!important;
  }
  html body #login-screen .login-features{
    position:relative!important;
    z-index:3!important;
    width:min(645px,100%)!important;
    display:grid!important;
    grid-template-columns:repeat(3,minmax(0,1fr))!important;
    gap:12px!important;
  }
  html body #login-screen .login-feature{
    min-height:86px!important;
    padding:14px 15px!important;
    display:flex!important;
    gap:11px!important;
    align-items:center!important;
    border:1px solid rgba(255,255,255,.92)!important;
    border-radius:18px!important;
    background:rgba(255,255,255,.84)!important;
    box-shadow:0 12px 28px rgba(0,72,75,.065)!important;
    backdrop-filter:blur(4px)!important;
  }
  html body #login-screen .login-feature-icon{
    width:42px!important;
    height:42px!important;
    flex:0 0 42px!important;
    border-radius:13px!important;
    background:linear-gradient(145deg,#d9f9f4,#f5fffd)!important;
    color:#078078!important;
  }
  html body #login-screen .login-feature strong{
    display:block!important;
    margin:0 0 2px!important;
    font:700 12px/1.28 var(--cq-font-display,'Plus Jakarta Sans','Inter',sans-serif)!important;
    color:#123b45!important;
  }
  html body #login-screen .login-feature span{font:500 10px/1.32 var(--cq-font-body,'Inter',sans-serif)!important;color:#69858a!important;}
  html body #login-screen .login-quote{display:none!important;}
  html body #login-screen .login-form-panel{
    padding:clamp(28px,4vw,60px) clamp(28px,4.2vw,68px)!important;
    display:flex!important;
    align-items:center!important;
    justify-content:center!important;
    overflow:visible!important;
  }
  html body #login-screen .login-form-panel:before{
    content:''!important;
    display:block!important;
    position:absolute!important;
    inset:0!important;
    width:auto!important;
    height:auto!important;
    transform:none!important;
    border:0!important;
    border-radius:0!important;
    background:linear-gradient(155deg,rgba(6,104,103,.08),rgba(4,91,94,.34) 55%,rgba(3,73,78,.58))!important;
    pointer-events:none!important;
  }
  html body #login-screen .login-form-panel:after{
    content:''!important;
    display:block!important;
    position:absolute!important;
    width:380px!important;
    height:380px!important;
    right:-190px!important;
    top:-150px!important;
    border-radius:50%!important;
    background:radial-gradient(circle,rgba(102,244,222,.24),rgba(15,122,119,0) 70%)!important;
    border:0!important;
    transform:none!important;
    pointer-events:none!important;
  }
  html body #login-screen .login-card{
    position:relative!important;
    z-index:4!important;
    width:100%!important;
    max-width:500px!important;
    padding:40px 40px 34px!important;
    border-radius:31px!important;
    border:1px solid rgba(232,255,252,.92)!important;
    background:linear-gradient(155deg,rgba(255,255,255,.93),rgba(239,252,250,.91))!important;
    box-shadow:
      0 28px 72px rgba(0,48,52,.28),
      0 0 0 1px rgba(119,247,229,.10),
      0 0 38px rgba(55,233,211,.22),
      inset 0 1px 0 rgba(255,255,255,.98)!important;
    backdrop-filter:blur(16px) saturate(115%)!important;
    -webkit-backdrop-filter:blur(16px) saturate(115%)!important;
  }
  html body #login-screen .login-card:before{
    content:''!important;
    display:block!important;
    width:78px!important;
    height:78px!important;
    margin:0 auto 16px!important;
    border:0!important;
    border-radius:0!important;
    background:transparent url('logo_sd.png') center/contain no-repeat!important;
    box-shadow:none!important;
  }
  html body #login-screen .login-card:after{
    content:''!important;
    position:absolute!important;
    inset:10px!important;
    border:1px solid rgba(255,255,255,.70)!important;
    border-radius:24px!important;
    pointer-events:none!important;
    z-index:-1!important;
  }
  html body #login-screen .login-title{
    margin:0 0 7px!important;
    text-align:center!important;
    font:800 clamp(25px,2.15vw,32px)/1.12 var(--cq-font-display,'Plus Jakarta Sans','Inter',sans-serif)!important;
    letter-spacing:-.042em!important;
    color:#0a3440!important;
  }
  html body #login-screen .login-sub{
    margin:0 0 28px!important;
    text-align:center!important;
    font:500 12.5px/1.5 var(--cq-font-body,'Inter',sans-serif)!important;
    color:#6a858b!important;
  }
  html body #login-screen #login-form .field{margin-bottom:16px!important;}
  html body #login-screen .field label{
    display:block!important;
    margin:0 0 7px!important;
    font:700 11.5px/1.3 var(--cq-font-body,'Inter',sans-serif)!important;
    color:#244b55!important;
  }
  html body #login-screen .input-icon-wrap{
    min-height:53px!important;
    border:1px solid #bdd8d9!important;
    border-radius:13px!important;
    background:rgba(255,255,255,.94)!important;
    box-shadow:0 4px 15px rgba(0,69,73,.025)!important;
    transition:border-color .16s ease,box-shadow .16s ease!important;
  }
  html body #login-screen .input-icon-wrap:focus-within{
    border-color:#12a89e!important;
    background:#fff!important;
    box-shadow:0 0 0 4px rgba(17,180,168,.09)!important;
  }
  html body #login-screen .input-icon-wrap input{
    padding:14px 14px 14px 16px!important;
    min-height:51px!important;
    font:500 13.5px var(--cq-font-body,'Inter',sans-serif)!important;
    color:#173e48!important;
  }
  html body #login-screen .input-icon-wrap input::placeholder{color:#89a1a6!important;opacity:1!important;}
  html body #login-screen .toggle-pass{color:#527d85!important;padding-right:15px!important;}
  html body #login-screen #login-form .btn{
    min-height:54px!important;
    margin-top:7px!important;
    border-radius:14px!important;
    border:0!important;
    background:linear-gradient(95deg,#09aba1 0%,#07948d 48%,#4fc89e 100%)!important;
    color:#fff!important;
    box-shadow:0 12px 27px rgba(5,145,137,.25)!important;
    font:700 14.5px var(--cq-font-display,'Plus Jakarta Sans','Inter',sans-serif)!important;
    transition:transform .14s ease,box-shadow .14s ease,filter .14s ease!important;
  }
  html body #login-screen #login-form .btn:hover{filter:brightness(.98)!important;transform:translateY(-1px)!important;box-shadow:0 15px 31px rgba(5,145,137,.29)!important;}
  html body #login-screen #login-form .btn:active{transform:none!important;}
  html body #login-screen .login-error{border-radius:12px!important;font-size:12px!important;}
  html body #login-screen .login-help{
    margin-top:24px!important;
    padding-top:19px!important;
    border-top:1px solid #dceaea!important;
    text-align:center!important;
    font-size:11.5px!important;
    color:#6a858a!important;
  }
  html body #login-screen .login-footer{
    bottom:16px!important;
    z-index:5!important;
    color:rgba(238,255,252,.84)!important;
    font-size:10px!important;
  }
  @media(max-width:1100px){
    html body #login-screen{grid-template-columns:minmax(0,55%) minmax(410px,45%)!important;}
    html body #login-screen .login-hero{padding-left:40px!important;padding-right:30px!important;}
    html body #login-screen .login-hero-logo{width:82px!important;height:82px!important;}
    html body #login-screen .login-hero-brand-text .l1{font-size:44px!important;}
    html body #login-screen .login-feature{padding:12px!important;}
  }
  @media(max-width:900px){
    html body #login-screen{height:auto!important;min-height:100vh!important;grid-template-columns:1fr!important;background-position:center!important;overflow:auto!important;}
    html body #login-screen:after{height:16%!important;bottom:-8%!important;}
    html body #login-screen .login-hero{min-height:auto!important;padding:38px 28px 42px!important;background:linear-gradient(90deg,rgba(247,255,254,.97),rgba(237,252,250,.89))!important;}
    html body #login-screen .login-hero:after{display:none!important;}
    html body #login-screen .login-form-panel{min-height:auto!important;padding:42px 20px 70px!important;background:linear-gradient(155deg,rgba(6,100,100,.94),rgba(5,83,86,.96))!important;}
    html body #login-screen .login-features{grid-template-columns:repeat(3,1fr)!important;}
  }
  @media(max-width:620px){
    html body #login-screen .login-hero{padding:28px 18px 34px!important;}
    html body #login-screen .login-hero-brand{gap:14px!important;margin-bottom:26px!important;}
    html body #login-screen .login-hero-logo{width:66px!important;height:66px!important;}
    html body #login-screen .login-hero-brand-text .l1{font-size:34px!important;}
    html body #login-screen .login-hero-brand-text .l2{font-size:11px!important;}
    html body #login-screen .login-eyebrow{font-size:9px!important;letter-spacing:.20em!important;}
    html body #login-screen .login-hero h1{font-size:37px!important;}
    html body #login-screen .login-features{grid-template-columns:1fr!important;}
    html body #login-screen .login-feature{min-height:auto!important;}
    html body #login-screen .login-card{padding:32px 22px 28px!important;border-radius:25px!important;}
    html body #login-screen .login-card:before{width:64px!important;height:64px!important;}
    html body #login-screen .login-title{font-size:24px!important;}
  }
  @media(prefers-reduced-motion:reduce){
    html body #login-screen *{transition:none!important;animation:none!important;}
  }
  `;
  document.head.appendChild(style);
})();
