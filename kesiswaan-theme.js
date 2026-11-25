/* CQlass — Tema "Ruang Pantau Cahaya" khusus role Kabid Kesiswaan.
   Hanya aktif saat role kesiswaan/kabid_kesiswaan (body.cq-kes-ui); role lain tidak tersentuh.
   Lexend (mudah dibaca) untuk teks & isian, Space Grotesk untuk judul & angka.
   Dokumen cetak (surat keterlambatan, cover rapor) tidak diubah: tetap Tahoma. */
(function(){
'use strict';
if(window.__cqKesTheme)return;window.__cqKesTheme=true;

function role(){
  let r='';
  try{r=currentUser?.role||currentUser?.primary_role||currentUser?.role_code||''}catch(_){}
  if(!r)try{const u=JSON.parse(localStorage.getItem('cqlass_user')||'{}');r=u.role||u.primary_role||u.role_code||''}catch(_){}
  return String(r).trim().toLowerCase().replace(/[\s-]+/g,'_');
}
const isKes=()=>['kesiswaan','kabid_kesiswaan'].includes(role())&&!!(document.getElementById('app-screen')&&getComputedStyle(document.getElementById('app-screen')).display!=='none');

function fonts(){
  if(document.getElementById('cq-kes-fonts'))return;
  const pre=document.createElement('link');pre.rel='preconnect';pre.href='https://fonts.gstatic.com';pre.crossOrigin='';document.head.appendChild(pre);
  const l=document.createElement('link');l.id='cq-kes-fonts';l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap';
  document.head.appendChild(l);
}

const P='body.cq-kes-ui';           // awalan agar hanya role Kesiswaan
const C=P+' #content';
const PRINT=':not(.cv-page *):not(.letter-sheet *):not([data-draft] *)';

function css(){
  if(document.getElementById('cq-kes-theme'))return;
  const s=document.createElement('style');s.id='cq-kes-theme';
  s.textContent=`
${P}{
  --k-malam:#0C2830;--k-malam-2:#123642;--k-malam-3:#1B4651;
  --k-zamrud:#0B7A64;--k-zamrud-2:#09624F;--k-cahaya:#2DD4BF;--k-cahaya-soft:rgba(45,212,191,.22);
  --k-kertas:#F2F6F6;--k-tinta:#12302F;--k-tinta-2:#4A6766;--k-garis:#D9E5E4;--k-garis-2:#E7EFEE;
  --k-amber:#D9911A;--k-merah:#C8432F;
  --k-font:'Lexend','Plus Jakarta Sans',system-ui,sans-serif;--k-display:'Space Grotesk','Lexend',system-ui,sans-serif;
  background:var(--k-kertas);
}
/* ---------- kerangka: topbar + rel navigasi ---------- */
${P} .topbar{background:var(--k-malam)!important;border-bottom:1px solid rgba(45,212,191,.18)!important;box-shadow:0 1px 0 rgba(0,0,0,.2)!important;color:#E6F4F2!important;font-family:var(--k-font)!important}
${P} .topbar .topbar-title{color:#fff!important;font-family:var(--k-display)!important;letter-spacing:-.01em}
${P} .topbar .topbar-title span{color:#8FB8B4!important;font-family:var(--k-font)!important}
${P} .topbar #user-name{color:#E6F4F2!important;font-weight:500}
${P} .topbar .role-badge{background:rgba(45,212,191,.12)!important;color:var(--k-cahaya)!important;border:1px solid rgba(45,212,191,.35)!important;font-family:var(--k-font)!important;font-weight:600!important;text-transform:none!important;letter-spacing:0!important}
${P} .topbar .account-btn,${P} .topbar .logout-btn,${P} .topbar .bell-btn{background:transparent!important;color:#CFE6E3!important;border:1px solid rgba(207,230,227,.25)!important;border-radius:9px!important;font-family:var(--k-font)!important}
${P} .topbar .account-btn:hover,${P} .topbar .logout-btn:hover,${P} .topbar .bell-btn:hover{border-color:var(--k-cahaya)!important;color:#fff!important}
${P} #sidebar,${P} .sidebar{background:linear-gradient(180deg,var(--k-malam) 0%,#0A222A 100%)!important;background-image:linear-gradient(180deg,var(--k-malam) 0%,#0A222A 100%)!important;border-right:1px solid rgba(45,212,191,.14)!important;color:#CFE3E1}
@media (min-width:861px){${P} .sidebar{width:252px!important;flex:none}}
${P} #sidebar .cqk-side{font-family:var(--k-font);padding:16px 12px 28px}
${P} #sidebar .cqk-nav{position:relative;color:#BFD6D3;font-family:var(--k-font);font-weight:400;font-size:14px;border-radius:10px;min-height:42px}
${P} #sidebar .cqk-nav .cqk-i{opacity:.75}
${P} #sidebar .cqk-nav:hover{background:rgba(45,212,191,.08);color:#fff}
${P} #sidebar .cqk-nav:focus-visible{outline:2px solid var(--k-cahaya);outline-offset:1px}
${P} #sidebar .cqk-nav.active{background:linear-gradient(90deg,rgba(45,212,191,.20),rgba(45,212,191,.04));color:#fff;font-weight:600;box-shadow:none}
${P} #sidebar .cqk-nav.active .cqk-i{opacity:1;color:var(--k-cahaya)}
/* garis cahaya: satu-satunya efek "menyala", menandai posisi Anda */
${P} #sidebar .cqk-nav.active::before{content:'';position:absolute;left:0;top:8px;bottom:8px;width:3px;border-radius:0 3px 3px 0;background:var(--k-cahaya);box-shadow:0 0 12px 2px rgba(45,212,191,.75)}
@media (prefers-reduced-motion:no-preference){${P} #sidebar .cqk-nav.active::before{animation:cqk-lamp .7s ease-out 1}}
@keyframes cqk-lamp{from{opacity:0;transform:scaleY(.3)}to{opacity:1;transform:none}}
${P} #sidebar .cqk-sec{color:#6F9793;font-size:12px;font-weight:500;letter-spacing:.02em;text-transform:none;margin:18px 12px 6px}
${P} #sidebar .cqk-more{color:#6F9793}${P} #sidebar .cqk-more span{text-transform:none;letter-spacing:.02em;font-size:12px;font-weight:500}
${P} #sidebar .cqk-badge{background:var(--k-merah)!important;color:#fff!important;font-family:var(--k-display)}
${P} #sidebar .cqk-nav.active .cqk-badge{background:#fff!important;color:var(--k-merah)!important}

/* ---------- area kerja ---------- */
${P} .content,${P} #content{background-color:var(--k-kertas)!important;background-image:radial-gradient(rgba(11,122,100,.07) 1px,transparent 1px)!important;background-size:22px 22px!important;color:var(--k-tinta);font-family:var(--k-font);font-size:15px;line-height:1.55}
${C} :is(div,span,p,li,td,th,label,small,b,strong,a,button,input,select,textarea,h1,h2,h3,h4,h5)${PRINT}{font-family:var(--k-font)}
${C} :is(h1,h2)${PRINT}{font-family:var(--k-display)!important;letter-spacing:-.015em;color:var(--k-tinta)}
${C} h1${PRINT}{font-size:clamp(22px,2.2vw,28px)!important;font-weight:700!important;line-height:1.2}
${C} h2${PRINT}{font-size:18px!important;font-weight:600!important}
${C} :is(h3,h4)${PRINT}{color:var(--k-tinta)}
${C} :is(.kd-title,.kd-boxhead b,.krek-boxhead b,.kcv-title,.sac-head h2,.cqir-panel h2,.walas-card-head h2,.pr-card h2,.rd-card-title){font-family:var(--k-display)!important;font-weight:600!important;letter-spacing:-.01em;color:var(--k-tinta)!important}
${C} :is(.kd-sub,.krek-sub,.ksr2-sub,.kcv-sub,.rd-card-sub){color:var(--k-tinta-2)!important;font-size:13.5px!important}
/* label & judul kecil: tidak lagi HURUF KAPITAL semua */
${C} :is(label,.cqk-panel-d h4,.cqk-form label,.kd-field label,.krek-field label,.pia-field label,.sac-field label,.ksr2-eyebrow,.cqi label,th)${PRINT}{text-transform:none!important;letter-spacing:0!important}
${C} :is(label,.kd-field label,.krek-field label,.pia-field label,.sac-field label,.cqk-form label)${PRINT}{font-size:13px!important;font-weight:500!important;color:var(--k-tinta-2)!important}
${C} .cqk-panel-d h4{font-size:13px;font-weight:600;color:var(--k-zamrud)}

/* panel & kartu: satu radius untuk panel (14), satu untuk kontrol (10) */
${C} :is(.card,.kd-card,.kd-box,.sac-card,.sac-box,.krek-card,.krek-box,.ksr2-grid>div,.kcv-card,.kc-card,.cqir-panel,.pr-card,.cdp-panel,.walas-card,.cqk-panel,.cqk-strip,.kd-filter,.krek-filter,.pia-filter,.ksr2-filter,.late-filters){background:#fff!important;border:1px solid var(--k-garis)!important;border-radius:14px!important;box-shadow:0 1px 0 rgba(12,40,48,.04)!important}
${C} :is(.kd-kpi,.ksr2-kpi,.pia-kpi,.cqir-stat,.cqk-card){background:#fff!important;border:1px solid var(--k-garis)!important;border-radius:14px!important;box-shadow:none!important}
/* angka besar: Space Grotesk, tabular */
${C} :is(.kd-kpi b,.ksr2-kpi b,.ksr2-kpi strong,.pia-kpi b,.pia-kpi strong,.cqir-stat b,.cqir-stat strong,.cqk-card b,.cqk-strip-i b,.rd-kpis b){font-family:var(--k-display)!important;font-weight:600!important;font-variant-numeric:tabular-nums;letter-spacing:-.02em;color:var(--k-tinta)}

/* kolom isian: tinggi 44px, teks 15px, sorot cahaya saat aktif */
${C} :is(input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]),select,textarea)${PRINT},
${P} :is(.cqi,.sac-modal,.kd-modal,.krek-modal,.kcv-modal) :is(input:not([type=checkbox]):not([type=radio]):not([type=file]),select,textarea){
  font-family:var(--k-font)!important;font-size:15px!important;color:var(--k-tinta)!important;background:#fff!important;
  border:1.5px solid #CDDDDB!important;border-radius:10px!important;min-height:44px;padding:10px 12px!important;box-sizing:border-box;
  transition:border-color .15s,box-shadow .15s}
${C} textarea${PRINT},${P} :is(.cqi,.sac-modal,.kd-modal,.krek-modal,.kcv-modal) textarea{line-height:1.55!important;min-height:96px}
${C} :is(input,select,textarea)${PRINT}:hover{border-color:#A9C7C3!important}
${C} :is(input,select,textarea)${PRINT}:focus,${P} :is(.cqi,.sac-modal,.kd-modal,.krek-modal,.kcv-modal) :is(input,select,textarea):focus{outline:none!important;border-color:var(--k-zamrud)!important;box-shadow:0 0 0 4px var(--k-cahaya-soft)!important}
${C} ::placeholder{color:#8AA3A1!important;opacity:1}
${C} :is(input[type=checkbox],input[type=radio]){accent-color:var(--k-zamrud);width:18px;height:18px}

${C} .cqk-search{border:1.5px solid #CDDDDB!important;border-radius:10px!important;background:#fff!important;min-height:44px;padding:0 12px!important}
${C} .cqk-search:focus-within{border-color:var(--k-zamrud)!important;box-shadow:0 0 0 4px var(--k-cahaya-soft)!important}
${C} .cqk-search.cqk-search.cqk-search input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=range]):not([type=color]):not(.x):not(.y):not(.z){border:0!important;box-shadow:none!important;min-height:40px!important;padding:0!important;background:transparent!important}
/* tombol */
${C} :is(.btn,.sac-btn,.kd-load,.krek-btn,.ksr2-btn,.kcv-btn,.cqk-btn,.cqi-btn,.late-primary,.bi-btn)${PRINT},${P} :is(.cqi-btn,.sac-modal .sac-btn,.kcv-modal .kcv-btn){
  font-family:var(--k-font)!important;font-weight:500!important;font-size:14px!important;border-radius:10px!important;min-height:40px;padding:0 16px!important;
  display:inline-flex;align-items:center;justify-content:center;gap:7px;transition:background .15s,border-color .15s,box-shadow .15s}
${C} :is(.btn,.kd-load,.late-primary,.sac-btn.primary,.krek-btn.primary,.ksr2-btn.primary,.kcv-btn.primary,.cqk-btn.primary)${PRINT},${P} :is(.cqi-btn.primary,.sac-modal .sac-btn.primary){
  background:var(--k-zamrud)!important;border:1px solid var(--k-zamrud)!important;color:#fff!important}
${C} :is(.btn,.kd-load,.late-primary,.sac-btn.primary,.krek-btn.primary,.ksr2-btn.primary,.kcv-btn.primary,.cqk-btn.primary):hover,${P} .cqi-btn.primary:hover{background:var(--k-zamrud-2)!important}
${C} :is(button,a,[tabindex]):focus-visible{outline:2px solid var(--k-cahaya)!important;outline-offset:2px}

/* tab */
${C} :is(.ksr2-tab,.cqir-tabs button,.late-tabs button,.bi-tab){font-family:var(--k-font)!important;font-size:14px!important;font-weight:500!important;border-radius:999px!important}
${C} :is(.ksr2-tab.active,.ksr2-tab[aria-selected=true],.cqir-tabs button.active,.late-tabs button[aria-selected=true],.late-tabs button.active){background:var(--k-malam)!important;color:#fff!important;border-color:var(--k-malam)!important}

/* tabel: lega, header jelas, baris menyala saat disorot */
${C} table${PRINT}{border-collapse:separate!important;border-spacing:0!important;font-size:14px!important;font-variant-numeric:tabular-nums}
${C} table${PRINT} th{background:#EBF3F2!important;color:#2C4C4A!important;font-weight:600!important;font-size:13px!important;padding:10px 12px!important;border-bottom:1px solid var(--k-garis)!important;text-align:left}
${C} table${PRINT} :is(th,td){border-left:0!important;border-right:0!important;border-top:0!important}
${C} table${PRINT} td{padding:10px 12px!important;border-bottom:1px solid var(--k-garis-2)!important;color:var(--k-tinta);vertical-align:top}
${C} table${PRINT} tbody tr:hover td{background:#F3FAF9}
${C} :is(.ksr2-table,.pia-table-wrap,.krek-wrap,.sac-table){border-radius:12px;overflow:auto}

/* chip / badge / status */
${C} :is(.sac-badge,.kc-pill,.cqk-chip,.kd-status,.krek-status,.pr-status){font-family:var(--k-font)!important;font-weight:500!important;letter-spacing:0!important;text-transform:none!important}

/* modal */
${P} :is(.sac-modal,.kd-modal,.krek-modal,.kcv-modal,.cqi-ov){backdrop-filter:blur(3px)}
${P} :is(.sac-box,.kcv-modal-box,.cqi){border-radius:16px!important;font-family:var(--k-font)!important;color:var(--k-tinta)}
${P} :is(.sac-box h2,.cqi-h h2){font-family:var(--k-display)!important;font-weight:600!important}

/* Pengingat & strip dashboard memakai palet yang sama */
${C} .cqk-head h1 .cqk-hico{background:var(--k-malam);color:var(--k-cahaya)}
${C} .cqk-card.active{border-color:var(--k-zamrud)!important;box-shadow:0 0 0 3px var(--k-cahaya-soft)!important}
${C} .cqk-row:hover{background:#FAFDFC}
${C} .cqk-name-btn{font-family:var(--k-font);font-weight:600;font-size:15px}
${C} .cqk-detail{font-size:14px}
${C} .cqk-meta{font-size:13px}

/* hero gedung bawaan dashboard disembunyikan agar langsung ke data */
${C} .cq-role-hero,${C} .rd-hero{display:none!important}


/* ---------- baris tab menu (subnav) ---------- */
${C} > .cqk-subnav{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:14px;flex-wrap:wrap;
  margin:-4px 0 18px;padding:10px 12px;border-radius:14px;background:rgba(12,40,48,.94);backdrop-filter:blur(8px);
  border:1px solid rgba(45,212,191,.22);box-shadow:0 10px 24px -14px rgba(12,40,48,.6)}
${C} > .cqk-subnav .cqk-subnav-title{display:flex;align-items:center;gap:8px;color:#fff;font-family:var(--k-display);font-size:15px;padding:0 6px 0 4px}
${C} > .cqk-subnav .cqk-subnav-title .cqk-i{color:var(--k-cahaya)}
${C} > .cqk-subnav .cqk-subnav-tabs{display:flex;gap:6px;flex-wrap:wrap}
${C} > .cqk-subnav .cqk-subtab{position:relative;border:1px solid rgba(207,230,227,.18);background:transparent;color:#BFD6D3;border-radius:999px;
  padding:8px 16px;font:500 14px/1 var(--k-font);cursor:pointer;min-height:38px;transition:background .15s,color .15s,border-color .15s,box-shadow .15s}
${C} > .cqk-subnav .cqk-subtab:hover{color:#fff;border-color:rgba(45,212,191,.55);background:rgba(45,212,191,.08)}
${C} > .cqk-subnav .cqk-subtab.active{color:var(--k-malam);background:var(--k-cahaya);border-color:var(--k-cahaya);font-weight:600;box-shadow:0 0 16px rgba(45,212,191,.55)}
${C} > .cqk-subnav .cqk-subtab:focus-visible{outline:2px solid var(--k-cahaya);outline-offset:2px}
@media (max-width:640px){${C} > .cqk-subnav{gap:8px}${C} > .cqk-subnav .cqk-subnav-tabs{overflow-x:auto;flex-wrap:nowrap;width:100%}${C} > .cqk-subnav .cqk-subtab{white-space:nowrap}}

/* ================= interaksi futuristik (palet tetap: Malam · Zamrud · Cahaya) ================= */
/* garis cahaya di bawah header: gradasi tetap, satu sapuan saat halaman dibuka */
${P} .topbar{position:relative}
${P} .topbar::after{content:'';position:absolute;left:0;right:0;bottom:-1px;height:2px;background:linear-gradient(90deg,transparent,var(--k-zamrud) 20%,var(--k-cahaya) 50%,var(--k-zamrud) 80%,transparent);background-size:200% 100%;opacity:.9;pointer-events:none}
@media (prefers-reduced-motion:no-preference){${P} .topbar::after{animation:cqk-sweep 2.4s ease-out 1}}
@keyframes cqk-sweep{from{background-position:100% 0;opacity:0}to{background-position:0 0;opacity:.9}}

/* riak cahaya saat diklik (dibuat oleh JS di bawah) */
${P} .cqk-fx{position:relative;overflow:hidden;isolation:isolate}
${P} .cqk-ripple{position:absolute;border-radius:50%;pointer-events:none;z-index:0;transform:scale(0);opacity:.55;
  background:radial-gradient(circle,rgba(45,212,191,.55) 0%,rgba(45,212,191,.18) 45%,transparent 70%);animation:cqk-ripple .6s ease-out forwards}
@keyframes cqk-ripple{to{transform:scale(1);opacity:0}}
${P} .cqk-fx>*:not(.cqk-ripple){position:relative;z-index:1}

/* tekan: sedikit mengecil */
${P} :is(.cqk-btn,.btn,.sac-btn,.kd-load,.krek-btn,.ksr2-btn,.kcv-btn,.cqi-btn,.late-primary,.cqk-card,.cqk-strip-i,#sidebar .cqk-nav):active{transform:scale(.97)}
${P} :is(.cqk-btn,.btn,.sac-btn,.kd-load,.krek-btn,.ksr2-btn,.kcv-btn,.cqi-btn,.late-primary,.cqk-card,.cqk-strip-i,#sidebar .cqk-nav){transition:transform .12s ease,box-shadow .2s ease,border-color .2s ease,background .2s ease}

/* tombol utama: gradasi zamrud → cahaya, berpendar saat disorot */
${C} :is(.btn,.kd-load,.late-primary,.sac-btn.primary,.krek-btn.primary,.ksr2-btn.primary,.kcv-btn.primary,.cqk-btn.primary)${PRINT},${P} :is(.cqi-btn.primary,.sac-modal .sac-btn.primary){
  background:linear-gradient(135deg,var(--k-zamrud) 0%,#0E8F78 55%,#14A892 100%)!important;border-color:transparent!important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 2px 8px rgba(11,122,100,.25)!important}
${C} :is(.btn,.kd-load,.late-primary,.sac-btn.primary,.krek-btn.primary,.ksr2-btn.primary,.kcv-btn.primary,.cqk-btn.primary):hover,${P} .cqi-btn.primary:hover{
  background:linear-gradient(135deg,var(--k-zamrud-2) 0%,var(--k-zamrud) 55%,#12A08B 100%)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 0 0 3px var(--k-cahaya-soft),0 6px 18px rgba(11,122,100,.35)!important}
/* tombol sekunder: tepi menyala saat disorot */
${C} :is(.cqk-btn:not(.primary):not(.ghost),.sac-btn:not(.primary),.krek-btn:not(.primary),.ksr2-btn:not(.primary),.kcv-btn:not(.primary)):hover{border-color:var(--k-cahaya)!important;box-shadow:0 0 0 3px var(--k-cahaya-soft)!important;color:var(--k-zamrud)!important}

/* kartu angka & kartu pengingat: terangkat + tepi cahaya saat disorot */
${C} :is(.cqk-card,.cqk-strip-i,.kd-kpi,.ksr2-kpi,.pia-kpi,.cqir-stat){position:relative}
${C} :is(.cqk-card,.cqk-strip-i,.kd-kpi,.ksr2-kpi,.pia-kpi,.cqir-stat):hover{transform:translateY(-2px);border-color:rgba(45,212,191,.7)!important;box-shadow:0 0 0 1px rgba(45,212,191,.35),0 10px 24px -10px rgba(11,122,100,.45)!important}
/* kartu yang dipilih: garis cahaya di atas + latar gelap tipis */
${C} .cqk-card.active{background:linear-gradient(180deg,#F3FFFC,#fff 60%)!important}
${C} .cqk-card.active::before{content:'';position:absolute;left:14px;right:14px;top:0;height:3px;border-radius:0 0 3px 3px;background:var(--k-cahaya);box-shadow:0 0 12px 1px rgba(45,212,191,.8)}
${C} .cqk-card .ico{transition:transform .2s ease}${C} .cqk-card:hover .ico{transform:scale(1.08)}

/* baris siswa yang sedang dibuka: garis cahaya di kiri */
${C} .cqk-row{position:relative}
${C} .cqk-row:has(.cqk-panel-d){background:linear-gradient(90deg,rgba(45,212,191,.06),transparent 40%)}
${C} .cqk-row:has(.cqk-panel-d)::before{content:'';position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--k-cahaya);box-shadow:0 0 10px rgba(45,212,191,.7)}
${C} .cqk-panel-d{border-color:rgba(45,212,191,.35)!important;background:linear-gradient(180deg,#F5FCFB,#FAFDFD)!important}

/* judul panel: aksen garis gradasi pendek */
${C} .cqk-ph h2::after{content:'';display:block;width:36px;height:3px;border-radius:3px;margin-top:6px;background:linear-gradient(90deg,var(--k-zamrud),var(--k-cahaya))}

/* menu samping: tepi cahaya halus saat disorot */
${P} #sidebar .cqk-nav:hover{box-shadow:inset 0 0 0 1px rgba(45,212,191,.22)}

/* tab aktif: menyala */
${C} :is(.ksr2-tab.active,.ksr2-tab[aria-selected=true],.cqir-tabs button.active,.late-tabs button[aria-selected=true],.late-tabs button.active){box-shadow:0 0 0 3px var(--k-cahaya-soft)!important}

/* baris tabel: sorot dengan garis cahaya tipis */
${C} table${PRINT} tbody tr:hover td:first-child{box-shadow:inset 3px 0 0 var(--k-cahaya)}

/* avatar inisial: cincin cahaya */
${C} .cqk-av{box-shadow:0 0 0 2px #fff,0 0 0 3px rgba(45,212,191,.35)}
${C} .cqk-row.urgent .cqk-av{box-shadow:0 0 0 2px #fff,0 0 0 3px rgba(200,67,47,.35)}

@media (prefers-reduced-motion:reduce){${P} *{animation:none!important;transition:none!important}${C} :is(.cqk-card,.cqk-strip-i,.kd-kpi,.ksr2-kpi,.pia-kpi,.cqir-stat):hover{transform:none}}

@media (max-width:760px){${C}{font-size:15px}}
`;
  document.head.appendChild(s);
}


/* riak cahaya pada klik — hanya di role Kesiswaan */
const FX_SEL='.cqk-subtab,.cqk-btn,.btn,.sac-btn,.kd-load,.krek-btn,.ksr2-btn,.kcv-btn,.cqi-btn,.late-primary,.cqk-card,.cqk-strip-i,#sidebar .cqk-nav,.ksr2-tab,.cqir-tabs button,.late-tabs button';
document.addEventListener('pointerdown',e=>{
  if(!document.body.classList.contains('cq-kes-ui'))return;
  if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const el=e.target.closest?.(FX_SEL);if(!el||el.disabled)return;
  el.classList.add('cqk-fx');
  const r=el.getBoundingClientRect(),size=Math.max(r.width,r.height)*2.2;
  const dot=document.createElement('span');dot.className='cqk-ripple';
  dot.style.cssText=`width:${size}px;height:${size}px;left:${e.clientX-r.left-size/2}px;top:${e.clientY-r.top-size/2}px`;
  el.appendChild(dot);setTimeout(()=>dot.remove(),650);
},{passive:true});

function apply(){
  const on=isKes();
  document.body.classList.toggle('cq-kes-ui',on);
  if(on){fonts();css()}
}
// ikuti login/logout & pergantian halaman tanpa mengganggu role lain
const prevEnter=typeof enterApp==='function'?enterApp:null;
if(prevEnter&&!prevEnter.__cqKesTheme){const w=function(){const r=prevEnter.apply(this,arguments);try{apply()}catch(_){}return r};w.__cqKesTheme=true;try{enterApp=w}catch(_){}}
const prevLogout=typeof logout==='function'?logout:null;
if(prevLogout&&!prevLogout.__cqKesTheme){const w=function(){document.body.classList.remove('cq-kes-ui');return prevLogout.apply(this,arguments)};w.__cqKesTheme=true;try{logout=w}catch(_){}}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
setTimeout(apply,800);
new MutationObserver(()=>{const want=isKes();if(want!==document.body.classList.contains('cq-kes-ui'))apply()}).observe(document.getElementById('app-screen')||document.body,{attributes:true,attributeFilter:['style','class']});
})();
