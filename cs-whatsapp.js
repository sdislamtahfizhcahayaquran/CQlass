/* CQlass — Tombol Salam CQ (kanan bawah): Laporan & Masukan
   Alur: klik ikon CS -> isi form di web -> tersimpan ke database (internal_reports, ada nomor tiket)
         -> tombol "Lanjut ke WhatsApp" membuka chat WA dengan ringkasan + nomor tiket.
   Rekap: window.renderCsReportRecap(content) — dipakai menu Admin "Rekap Laporan & Masukan".
   GANTI nomor di bawah (format internasional tanpa + / spasi, contoh 6281234567890).
*/
(function(){
  'use strict';
  if(window.__cqCsWhatsapp) return;
  window.__cqCsWhatsapp=true;

  const SAPRAS_WA_NUMBER='62881010520788'; // WA petugas Sapras (+62 881-0105-20788)

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
  const API=BASE+'/functions/v1/internal-reporting';

  const TOPICS={
    SAPRAS:{label:'Laporan Kerusakan / Sapras',hint:'Fasilitas rusak, hilang, atau perlu ditambah',icon:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4Z"/>',desc:'Jelaskan kerusakan/kondisi dan lokasinya...',ask:'Perbaikan atau tindak lanjut yang diharapkan...'},
    SARAN_MASUKAN:{label:'Keluhan, Saran & Masukan',hint:'Sampaikan keluhan, saran, atau masukan',icon:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z"/>',desc:'Tuliskan saran, masukan, atau kendala Anda...',ask:'Solusi yang diharapkan (opsional)...'}
  };
  const STATUS={DILAPORKAN:['Menunggu','new'],TERKIRIM:['Menunggu','new'],DIPROSES:['Diproses','process'],SELESAI:['Selesai','done'],TIDAK_DITINDAKLANJUTI:['Tidak ditindaklanjuti','muted']};
  const statusOf=s=>STATUS[String(s||'').toUpperCase()]||[String(s||'-'),'muted'];

  const user=()=>{try{return typeof currentUser!=='undefined'&&currentUser?currentUser:null}catch(_){return null}};
  const role=()=>String(user()?.role||'').toLowerCase();
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}};
  const toast=(m,e)=>{try{if(typeof showToast==='function')return showToast(m,!!e)}catch(_){ } alert(m)};
  const fmtDate=v=>{try{return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(v))}catch(_){return String(v||'')}};
  const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  async function req(action,payload={}){
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),45000);
    try{
      const h={'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY};const tk=token();if(tk)h['x-session-token']=tk;
      const r=await fetch(API,{method:'POST',headers:h,body:JSON.stringify({action,...payload}),signal:ctrl.signal});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.success===false){const er=new Error(d.error||'request_failed');er.data=d;throw er}
      return d;
    }finally{clearTimeout(timer)}
  }

  async function compressImage(file){
    if(!/^image\/(jpeg|png|webp)$/i.test(file?.type||''))throw new Error('Gunakan foto JPG, PNG, atau WebP.');
    const url=URL.createObjectURL(file);
    try{
      const img=new Image();img.src=url;await img.decode();
      const max=1600;let w=img.naturalWidth,h=img.naturalHeight;
      if(w>max||h>max){const k=Math.min(max/w,max/h);w=Math.round(w*k);h=Math.round(h*k)}
      const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{alpha:false});x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(img,0,0,w,h);
      let q=.84,blob=null;for(let i=0;i<5;i++){blob=await new Promise(r=>c.toBlob(r,'image/jpeg',q));if(blob&&blob.size<=1800000)break;q=Math.max(.55,q-.08)}
      if(!blob)throw new Error('Foto gagal diproses.');
      const data=await new Promise((res,rej)=>{const fr=new FileReader();fr.onload=()=>res(fr.result);fr.onerror=()=>rej(new Error('Foto gagal dibaca.'));fr.readAsDataURL(blob)});
      return{base64:String(data).split(',')[1]||'',mime:'image/jpeg',preview:String(data)};
    }finally{URL.revokeObjectURL(url)}
  }

  function waLink(report){
    const u=user()||{},t=TOPICS[report.report_type]||TOPICS.SARAN_MASUKAN;
    const who=[report.reporter_name||u.nama||u.name||u.username||'',u.role?String(u.role).toUpperCase():''].filter(Boolean).join(' · ');
    const detail=[`No. Tiket: *${report.ticket_no||'-'}*`,who&&`Dari: ${who}`,report.location&&`Lokasi: ${report.location}`,`Isi: ${report.description||''}`,report.requested_action&&`Harapan: ${report.requested_action}`,(report.photo_share_url||report.photo_signed_url)&&`Foto: ${report.photo_share_url||report.photo_signed_url}`].filter(Boolean);
    const text=`Assalamu'alaikum, Tim Sapras.\nSaya baru mengirim *${t.label}* lewat CQlass.\n\n${detail.join('\n')}`;
    return `https://wa.me/${SAPRAS_WA_NUMBER}?text=${encodeURIComponent(text)}`;
  }

  /* ---------------- CSS ---------------- */
  function css(){
    if(document.getElementById('cq-cs-wa-css'))return;
    const s=document.createElement('style');s.id='cq-cs-wa-css';
    s.textContent=`
      #cq-cs-wa{position:fixed;right:20px;bottom:20px;z-index:150;font-family:Inter,system-ui,sans-serif;color:#163b3b}
      #cq-cs-wa .cq-cs-fab{height:54px;padding:0 20px 0 14px;border-radius:999px;border:0;cursor:pointer;background:#0c8279;color:#fff;display:flex;align-items:center;gap:9px;font:800 14px/1 Inter,system-ui,sans-serif;letter-spacing:.01em;box-shadow:0 10px 28px rgba(9,101,96,.32);transition:transform .15s,background .15s;margin-left:auto}
      #cq-cs-wa .cq-cs-fab:hover{transform:translateY(-2px);background:#0a6f68}
      #cq-cs-wa svg{width:20px;height:20px}#cq-cs-wa .cq-cs-fab-ic{width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.16);display:grid;place-items:center}#cq-cs-wa .cq-cs-fab svg{width:18px;height:18px}
      #cq-cs-wa .cq-cs-panel{position:absolute;right:0;bottom:68px;width:350px;max-width:calc(100vw - 28px);max-height:min(620px,calc(100vh - 110px));display:none;flex-direction:column;background:#fff;border:1px solid rgba(18,105,101,.14);border-radius:18px;box-shadow:0 18px 44px rgba(20,60,58,.2);overflow:hidden}
      #cq-cs-wa.open .cq-cs-panel{display:flex}
      #cq-cs-wa .cq-cs-head{background:linear-gradient(135deg,#0d6663,#148f86);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px;flex:none}
      #cq-cs-wa .cq-cs-head b{display:block;font-size:14px}#cq-cs-wa .cq-cs-head span{font-size:11.5px;opacity:.88}
      #cq-cs-wa .cq-cs-back{border:0;background:rgba(255,255,255,.16);color:#fff;width:30px;height:30px;border-radius:9px;cursor:pointer;display:grid;place-items:center;flex:none}
      #cq-cs-wa .cq-cs-body{padding:10px;overflow:auto}
      #cq-cs-wa .cq-cs-item{display:flex;gap:11px;align-items:center;padding:10px;border-radius:12px;border:0;background:none;width:100%;text-align:left;cursor:pointer;color:inherit;font:inherit}
      #cq-cs-wa .cq-cs-item:hover{background:#f0faf8}
      #cq-cs-wa .cq-cs-ic{width:36px;height:36px;border-radius:11px;background:#e4f4f1;color:#0c7670;display:grid;place-items:center;flex:none}
      #cq-cs-wa .cq-cs-item b{display:block;font-size:13px}#cq-cs-wa .cq-cs-item small{font-size:11px;color:#718987}
      #cq-cs-wa .cq-cs-sep{height:1px;background:#edf3f2;margin:6px 4px}
      #cq-cs-wa .cq-cs-f{display:flex;flex-direction:column;gap:5px;margin:4px 4px 11px}
      #cq-cs-wa .cq-cs-f label{font-size:12px;font-weight:700;color:#244a49}#cq-cs-wa .cq-cs-f label i{font-style:normal;color:#d74d4d}#cq-cs-wa .cq-cs-f label small{font-weight:500;color:#82999a}
      #cq-cs-wa input[type=text],#cq-cs-wa textarea{border:1px solid #d7e7e4;border-radius:10px;padding:9px 11px;font:500 13px/1.45 Inter,system-ui,sans-serif;background:#fbfefd;color:#173d3b;outline:none;width:100%;box-sizing:border-box}
      #cq-cs-wa textarea{min-height:78px;resize:vertical}#cq-cs-wa input:focus,#cq-cs-wa textarea:focus{border-color:#35a79e;box-shadow:0 0 0 3px rgba(53,167,158,.11)}
      #cq-cs-wa .cq-cs-up{display:flex;align-items:center;gap:10px;border:1.5px dashed #b9dcd6;border-radius:11px;padding:9px;background:#f8fcfb;cursor:pointer;font-size:12px}
      #cq-cs-wa .cq-cs-up img{width:54px;height:44px;object-fit:cover;border-radius:8px}
      #cq-cs-wa .cq-cs-btn{border:0;border-radius:11px;padding:11px 14px;font:800 13px/1.2 Inter,system-ui,sans-serif;cursor:pointer;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;box-sizing:border-box}
      #cq-cs-wa .cq-cs-btn.primary{background:#0c8279;color:#fff}#cq-cs-wa .cq-cs-btn.primary:disabled{opacity:.55;cursor:wait}
      #cq-cs-wa .cq-cs-btn.wa{background:#1fa855;color:#fff}#cq-cs-wa .cq-cs-btn.soft{background:#edf7f5;color:#176b66;margin-top:8px}
      #cq-cs-wa .cq-cs-note{font-size:11px;color:#718987;margin:8px 4px 2px;line-height:1.45}
      #cq-cs-wa .cq-cs-done{text-align:center;padding:10px 6px 4px}#cq-cs-wa .cq-cs-done .ok{width:52px;height:52px;border-radius:50%;background:#e8f6ec;color:#257349;display:grid;place-items:center;margin:4px auto 10px}
      #cq-cs-wa .cq-cs-done h4{margin:0 0 4px;font-size:15px}#cq-cs-wa .cq-cs-ticket{display:inline-block;margin:6px 0 12px;padding:6px 12px;border-radius:9px;background:#f0faf8;font:800 13px/1.2 ui-monospace,monospace;color:#0c6c66}
      #cq-cs-wa .cq-cs-row{border:1px solid #e1ecea;border-radius:12px;padding:10px 11px;margin:0 2px 8px;font-size:12px}
      #cq-cs-wa .cq-cs-row-top{display:flex;justify-content:space-between;gap:8px;margin-bottom:4px}#cq-cs-wa .cq-cs-row b{font-size:12px}#cq-cs-wa .cq-cs-row p{margin:3px 0 0;color:#456664;line-height:1.4}
      .cq-cs-badge{display:inline-flex;align-items:center;border-radius:999px;padding:3px 8px;font-size:10px;font-weight:800;white-space:nowrap}.cq-cs-badge.new{background:#e9f5ff;color:#286c9e}.cq-cs-badge.process{background:#fff3d9;color:#946b16}.cq-cs-badge.done{background:#e8f6ec;color:#297149}.cq-cs-badge.muted{background:#eef2f2;color:#61797a}
      #cq-cs-wa .cq-cs-fab{position:relative}
      #cq-cs-wa .cq-cs-mascot{position:absolute;left:50%;bottom:calc(100% - 10px);width:88px;height:78px;transform:translateX(-50%);pointer-events:none;z-index:-1;transition:opacity .15s,transform .2s}
      #cq-cs-wa .cq-cs-mascot svg{width:88px;height:78px;display:block;overflow:visible}
      #cq-cs-wa .cq-cs-fab:hover .cq-cs-mascot{transform:translateX(-50%) translateY(-3px)}
      #cq-cs-wa.open .cq-cs-mascot{opacity:0}
      #cq-cs-wa .cq-m-head{transform-origin:37px 58px;animation:cqMBob 3.2s ease-in-out infinite}
      #cq-cs-wa .cq-m-wave{transform-origin:12px 50px;animation:cqMWave 2.4s ease-in-out infinite}
      @keyframes cqMBob{0%,100%{transform:rotate(0)}50%{transform:rotate(-4deg)}}
      @keyframes cqMWave{0%,55%,100%{transform:rotate(0)}65%{transform:rotate(-22deg)}75%{transform:rotate(8deg)}85%{transform:rotate(-18deg)}}
      @media(prefers-reduced-motion:reduce){#cq-cs-wa .cq-m-head,#cq-cs-wa .cq-m-wave{animation:none}}
      @media(max-width:560px){#cq-cs-wa{right:14px;bottom:14px}#cq-cs-wa .cq-cs-fab{height:50px;padding:0 14px 0 10px;font-size:13px}#cq-cs-wa .cq-cs-mascot,#cq-cs-wa .cq-cs-mascot svg{width:72px;height:64px}}
      @media print{#cq-cs-wa{display:none!important}}
      .cq-csr{max-width:1240px;margin:0 auto;color:#163b3b}
      .cq-csr-title{font-size:clamp(21px,2.3vw,25px);font-weight:800;color:#123634}.cq-csr-sub{font-size:12.5px;color:#5f7775;margin:4px 0 14px}
      .cq-csr-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:end;background:#fff;border:1px solid #dbe8e6;border-radius:14px;padding:12px;margin-bottom:12px}
      .cq-csr-bar label{display:grid;gap:4px;font-size:10px;font-weight:800;color:#6b8381;text-transform:uppercase;letter-spacing:.04em}
      .cq-csr-bar input,.cq-csr-bar select{height:36px;border:1px solid #d3e3e0;border-radius:9px;padding:0 10px;font:500 12.5px Inter,system-ui,sans-serif;background:#fff;color:#173d3b}
      .cq-csr-bar .grow{flex:1;min-width:180px}.cq-csr-bar .grow input{width:100%;box-sizing:border-box}
      .cq-csr-btn{height:36px;border:1px solid #bdd2ce;border-radius:9px;background:#fff;color:#0a6e6e;padding:0 14px;font:700 12.5px Inter,system-ui,sans-serif;cursor:pointer}.cq-csr-btn.primary{background:#0a6e6e;border-color:#0a6e6e;color:#fff}
      .cq-csr-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}
      .cq-csr-kpi{background:#fff;border:1px solid #dbe8e6;border-radius:14px;padding:12px 14px}.cq-csr-kpi b{display:block;font-size:24px;color:#0c5f5b}.cq-csr-kpi span{font-size:11.5px;font-weight:700;color:#5f7775}
      .cq-csr-wrap{background:#fff;border:1px solid #dbe8e6;border-radius:14px;overflow:auto;max-height:calc(100vh - 330px);min-height:240px}
      .cq-csr table{width:100%;border-collapse:collapse;min-width:1050px}.cq-csr th,.cq-csr td{padding:9px 10px;border-bottom:1px solid #edf3f2;font-size:12px;text-align:left;vertical-align:top}
      .cq-csr th{position:sticky;top:0;background:#f1f7f5;color:#526b70;font-size:10.5px;text-transform:uppercase;letter-spacing:.03em;z-index:1}
      .cq-csr td.txt{min-width:220px;max-width:340px;white-space:pre-wrap;line-height:1.45}.cq-csr .tk{font:800 11.5px ui-monospace,monospace;color:#0c6c66;white-space:nowrap}
      .cq-csr .act{display:flex;gap:6px;flex-wrap:wrap}.cq-csr .act button{border:0;border-radius:8px;padding:6px 9px;font:700 11px Inter,system-ui,sans-serif;cursor:pointer;background:#edf7f5;color:#176b66}.cq-csr .act button.d{background:#e9f7ee;color:#257349}
      .cq-csr a{color:#087970;font-weight:700;text-decoration:none}.cq-csr-empty{padding:30px;text-align:center;color:#7d9491;font-size:13px}
      @media(max-width:800px){.cq-csr-kpis{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(s);
  }

  /* ---------------- Floating widget ---------------- */
  const svg=inner=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
  const ICON_CS=svg('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>'); // gagang telepon
  /* Maskot Salam CQ: anak berpeci tanpa wajah (faceless), hanya rona pipi. */
  const MASCOT=`<svg viewBox="0 0 74 66" aria-hidden="true">
    <path d="M13 66 Q15 49 37 49 Q59 49 61 66 Z" fill="#f4fbf9" stroke="#0b5753" stroke-width="1.3"/>
    <path d="M37 50 V66" stroke="#12a594" stroke-width="1.4"/><circle cx="37" cy="56" r="1.1" fill="#12a594"/><circle cx="37" cy="61" r="1.1" fill="#12a594"/>
    <path d="M31 50 Q37 54 43 50" fill="none" stroke="#12a594" stroke-width="1.4"/>
    <g class="cq-m-head">
      <circle cx="20.5" cy="35" r="3.6" fill="#f2c9a3" stroke="#c98f6a" stroke-width=".8"/><circle cx="53.5" cy="35" r="3.6" fill="#f2c9a3" stroke="#c98f6a" stroke-width=".8"/>
      <circle cx="37" cy="34" r="17" fill="#f7d6b5" stroke="#c98f6a" stroke-width="1"/>
      <path d="M19.6 27.5 Q20 12.5 37 12.5 Q54 12.5 54.4 27.5 Z" fill="#0b5753"/>
      <rect x="19.6" y="24" width="34.8" height="3.6" rx="1" fill="#e3b23c"/>
      <path d="M24 25.8h2M29 25.8h2M34 25.8h2M39 25.8h2M44 25.8h2M49 25.8h2" stroke="#0b5753" stroke-width="1"/>



      <ellipse cx="27" cy="39" rx="3.4" ry="2" fill="#f29a9a" opacity=".65"/><ellipse cx="47" cy="39" rx="3.4" ry="2" fill="#f29a9a" opacity=".65"/>

    </g>
    <g class="cq-m-wave"><path d="M17 57 L11.5 46" stroke="#f4fbf9" stroke-width="6.5" stroke-linecap="round"/><circle cx="10.5" cy="42.5" r="4.4" fill="#f7d6b5" stroke="#c98f6a" stroke-width=".9"/></g>
    <circle cx="58" cy="58.5" r="4" fill="#f7d6b5" stroke="#c98f6a" stroke-width=".9"/>
    <path d="M65 9l1.2 2.8 2.8 1.2-2.8 1.2L65 17l-1.2-2.8L61 13l2.8-1.2Z" fill="#e3b23c"/><circle cx="8" cy="20" r="1.6" fill="#7fd1c4"/>
  </svg>`;
  const ICON_X=svg('<path d="M18 6 6 18M6 6l12 12"/>');
  const ICON_BACK=svg('<path d="m15 18-6-6 6-6"/>');
  const ICON_OK=svg('<path d="m20 6-11 11-5-5"/>');
  const ICON_HIST=svg('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>');
  const ICON_WA=svg('<path d="M3 21l1.7-5A8.5 8.5 0 1 1 8 19.3Z"/><path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 1c-1-.5-1.5-1-2-2l1-1-1-2Z"/>');

  const ui={root:null,view:'menu',type:'SAPRAS',location:'',description:'',requested:'',photo:null,busy:false,last:null,mine:null};

  function head(title,sub,back){return `<div class="cq-cs-head">${back?`<button class="cq-cs-back" data-cs-go="menu" aria-label="Kembali">${ICON_BACK}</button>`:''}<div><b>${esc(title)}</b><span>${esc(sub)}</span></div></div>`}

  function viewMenu(){
    return head('Salam CQ','Ada yang bisa kami bantu?')+
      `<div class="cq-cs-body">${Object.entries(TOPICS).map(([k,t])=>`<button class="cq-cs-item" data-cs-topic="${k}"><span class="cq-cs-ic">${svg(t.icon)}</span><span><b>${esc(t.label)}</b><small>${esc(t.hint)}</small></span></button>`).join('')}
      <div class="cq-cs-sep"></div><button class="cq-cs-item" data-cs-go="history"><span class="cq-cs-ic">${ICON_HIST}</span><span><b>Riwayat laporan saya</b><small>Lihat status laporan Anda</small></span></button></div>`;
  }
  function viewForm(){
    const t=TOPICS[ui.type];
    return head(t.label,'Ceritakan sejelas mungkin, ya.',true)+
      `<div class="cq-cs-body">
        <div class="cq-cs-f"><label>Lokasi <small>(opsional)</small></label><input type="text" id="cq-cs-loc" maxlength="200" placeholder="Contoh: Kelas 4A, Toilet lantai 2" value="${esc(ui.location)}"></div>
        <div class="cq-cs-f"><label>Deskripsi <i>*</i></label><textarea id="cq-cs-desc" maxlength="4000" placeholder="${esc(t.desc)}">${esc(ui.description)}</textarea></div>
        <div class="cq-cs-f"><label>Harapan <small>(opsional)</small></label><textarea id="cq-cs-req" maxlength="2000" style="min-height:58px" placeholder="${esc(t.ask)}">${esc(ui.requested)}</textarea></div>
        <div class="cq-cs-f"><label>Foto <small>(opsional)</small></label><input id="cq-cs-file" type="file" accept="image/jpeg,image/png,image/webp" hidden>
          <label class="cq-cs-up" for="cq-cs-file">${ui.photo?`<img src="${ui.photo.preview}" alt="">`:`<span class="cq-cs-ic">${svg('<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="12" cy="12" r="3"/>')}</span>`}<span>${ui.photo?'<b>Foto siap dikirim</b><br><small>Klik untuk ganti</small>':'Pilih / ambil foto'}</span></label></div>
        <button class="cq-cs-btn primary" id="cq-cs-send" ${ui.busy?'disabled':''}>${ui.busy?'Menyimpan...':(ui.type==='SAPRAS'?'Kirim & Lanjut ke WhatsApp':'Kirim')}</button>
        
      </div>`;
  }
  function viewDone(){
    const r=ui.last||{};
    const sapras=r.report_type==='SAPRAS';
    return head('Laporan terkirim',sapras?'Satu langkah lagi, ya.':'Terima kasih atas masukannya.',true)+
      `<div class="cq-cs-body"><div class="cq-cs-done"><div class="ok">${ICON_OK}</div><h4>Terima kasih!</h4><div style="font-size:12px;color:#5f7775">Laporan Anda sudah kami terima.</div><div class="cq-cs-ticket">${esc(r.ticket_no||'-')}</div>
        ${sapras?`<a class="cq-cs-btn wa" href="${esc(waLink(r))}" target="_blank" rel="noopener" data-cs-wa>${ICON_WA} Lanjut ke WhatsApp Sapras</a>`:'<div class="cq-cs-note" style="margin-bottom:6px">Insyaallah segera kami tindak lanjuti.</div>'}
        <button class="cq-cs-btn soft" data-cs-go="menu">Selesai</button></div></div>`;
  }
  function viewHistory(){
    const rows=ui.mine;
    const body=rows==null?'<div class="cq-cs-note" style="text-align:center;padding:18px">Memuat riwayat...</div>':
      !rows.length?'<div class="cq-cs-note" style="text-align:center;padding:18px">Belum ada laporan yang dikirim.</div>':
      rows.map(r=>{const[l,c]=statusOf(r.status);return `<div class="cq-cs-row"><div class="cq-cs-row-top"><b>${esc(r.ticket_no||'Laporan')}</b><span class="cq-cs-badge ${c}">${esc(l)}</span></div><div style="font-size:10.5px;color:#7a908e">${esc(fmtDate(r.created_at))} · ${esc((TOPICS[r.report_type]||{}).label||r.report_type)}</div><p>${esc(r.description)}</p>${r.resolution_note?`<p><b>Tindak lanjut:</b> ${esc(r.resolution_note)}</p>`:''}</div>`}).join('');
    return head('Riwayat laporan saya','Laporan yang pernah Anda kirim.',true)+`<div class="cq-cs-body">${body}</div>`;
  }

  function syncDraft(){
    const p=ui.root;if(!p)return;
    const g=id=>p.querySelector('#'+id);
    if(g('cq-cs-loc'))ui.location=g('cq-cs-loc').value;
    if(g('cq-cs-desc'))ui.description=g('cq-cs-desc').value;
    if(g('cq-cs-req'))ui.requested=g('cq-cs-req').value;
  }

  function render(){
    const panel=ui.root.querySelector('.cq-cs-panel');
    panel.innerHTML=ui.view==='form'?viewForm():ui.view==='done'?viewDone():ui.view==='history'?viewHistory():viewMenu();
    panel.querySelectorAll('[data-cs-topic]').forEach(b=>b.onclick=()=>{
      if(ui.type!==b.dataset.csTopic){ui.description='';ui.requested='';ui.photo=null}
      ui.type=b.dataset.csTopic;ui.view='form';render();
    });
    panel.querySelectorAll('[data-cs-go]').forEach(b=>b.onclick=()=>{syncDraft();ui.view=b.dataset.csGo;if(ui.view==='history')loadMine();render()});
    const f=panel.querySelector('#cq-cs-file');
    if(f)f.onchange=async()=>{const file=f.files?.[0];if(!file)return;syncDraft();try{ui.photo=await compressImage(file);render()}catch(e){toast(e.message||'Foto gagal diproses.',true)}};
    const send=panel.querySelector('#cq-cs-send');if(send)send.onclick=submit;
    const wa=panel.querySelector('[data-cs-wa]');if(wa)wa.addEventListener('click',()=>setTimeout(()=>{ui.view='menu';ui.last=null;setOpen(false)},300));
  }

  async function loadMine(){
    ui.mine=null;
    try{const d=await req('mine');ui.mine=d.reports||[]}catch(_){ui.mine=[];toast('Riwayat laporan gagal dimuat.',true)}
    if(ui.view==='history')render();
  }

  async function submit(){
    if(ui.busy)return;syncDraft();
    const description=ui.description.trim();
    if(description.length<5)return toast('Mohon isi deskripsi dengan lebih jelas.',true);
    ui.busy=true;render();
    try{
      const d=await req('create',{report_type:ui.type,location:ui.location.trim(),description,requested_action:ui.requested.trim(),photo_base64:ui.photo?.base64||'',photo_mime:ui.photo?.mime||''});
      ui.last=d.report||{};ui.description='';ui.requested='';ui.photo=null;ui.view='done';
    }catch(e){
      const map={photo_too_large:'Foto terlalu besar. Coba foto lain.',forbidden:'Sesi berakhir. Silakan login kembali.',description_required:'Mohon isi deskripsi dengan lebih jelas.'};
      toast(map[e.message]||'Laporan gagal disimpan. Silakan coba lagi.',true);
    }finally{ui.busy=false;render()}
  }

  function setOpen(open){
    if(!ui.root)return;
    ui.root.classList.toggle('open',open);
    ui.root.querySelector('.cq-cs-fab-ic').innerHTML=open?ICON_X:ICON_CS;
    if(open)render();
  }

  function build(){
    css();
    const root=document.createElement('div');root.id='cq-cs-wa';
    root.innerHTML=`<div class="cq-cs-panel" role="dialog" aria-label="Salam CQ"></div><button class="cq-cs-fab" type="button" aria-label="Salam CQ" title="Salam CQ — Laporan & Masukan"><span class="cq-cs-mascot">${MASCOT}</span><span class="cq-cs-fab-ic">${ICON_CS}</span><span class="cq-cs-fab-lb">Salam CQ</span></button>`;
    ui.root=root;
    root.querySelector('.cq-cs-fab').onclick=e=>{e.stopPropagation();syncDraft();setOpen(!root.classList.contains('open'))};
    document.addEventListener('click',e=>{if(root.classList.contains('open')&&!root.contains(e.target)&&document.body.contains(e.target)){syncDraft();setOpen(false)}});
    document.body.appendChild(root);
  }

  let lastUserKey='';
  function sync(){
    const u=user(),key=u?String(u.username||u.id||u.nama||'1'):'';
    if(u&&!ui.root)build();
    if(key!==lastUserKey){Object.assign(ui,{view:'menu',location:'',description:'',requested:'',photo:null,last:null,mine:null});lastUserKey=key;if(ui.root)setOpen(false)}
    if(ui.root)ui.root.style.display=u?'':'none';
  }

  /* ---------------- Rekap (Admin) ---------------- */
  const rec={start:'',end:'',type:'',status:'',q:'',rows:[],loading:false};

  function recFiltered(){
    const q=rec.q.trim().toLowerCase();
    return rec.rows.filter(r=>(!rec.type||r.report_type===rec.type)&&(!rec.status||String(r.status).toUpperCase()===rec.status||(rec.status==='DILAPORKAN'&&String(r.status).toUpperCase()==='TERKIRIM'))&&(!q||[r.ticket_no,r.reporter_name,r.location,r.description,r.requested_action].join(' ').toLowerCase().includes(q)));
  }

  function recTable(content){
    const rows=recFiltered(),all=rec.rows,cnt=s=>all.filter(r=>String(r.status).toUpperCase()===s).length;
    content.querySelector('#csr-kpis').innerHTML=`<div class="cq-csr-kpi"><b>${all.length}</b><span>Total periode ini</span></div><div class="cq-csr-kpi"><b>${cnt('DILAPORKAN')+cnt('TERKIRIM')}</b><span>Menunggu</span></div><div class="cq-csr-kpi"><b>${cnt('DIPROSES')}</b><span>Diproses</span></div><div class="cq-csr-kpi"><b>${cnt('SELESAI')}</b><span>Selesai</span></div>`;
    const wrap=content.querySelector('#csr-table');
    if(rec.loading){wrap.innerHTML='<div class="cq-csr-empty">Memuat rekap...</div>';return}
    if(!rows.length){wrap.innerHTML='<div class="cq-csr-empty">Tidak ada laporan/masukan pada filter ini.</div>';return}
    wrap.innerHTML=`<table><thead><tr><th>Tiket</th><th>Tanggal</th><th>Pelapor</th><th>Jenis</th><th>Lokasi</th><th>Deskripsi</th><th>Harapan</th><th>Foto</th><th>Status</th><th>Tindak Lanjut</th><th>Aksi</th></tr></thead><tbody>${rows.map(r=>{const st=String(r.status).toUpperCase(),[l,c]=statusOf(st);return `<tr><td class="tk">${esc(r.ticket_no||'-')}</td><td style="white-space:nowrap">${esc(fmtDate(r.created_at))}</td><td>${esc(r.reporter_name||'-')}</td><td style="white-space:nowrap">${r.report_type==='SAPRAS'?'Sapras':'Saran & Masukan'}</td><td>${esc(r.location||'-')}</td><td class="txt">${esc(r.description)}</td><td class="txt">${esc(r.requested_action||'-')}</td><td>${r.photo_signed_url?`<a href="${esc(r.photo_signed_url)}" target="_blank" rel="noopener">Lihat ↗</a>`:'-'}</td><td><span class="cq-cs-badge ${c}">${esc(l)}</span></td><td class="txt" style="min-width:160px">${esc(r.resolution_note||'-')}</td><td><div class="act">${['DILAPORKAN','TERKIRIM'].includes(st)?`<button data-csr-proc="${esc(r.id)}">Proses</button>`:''}${st!=='SELESAI'?`<button class="d" data-csr-done="${esc(r.id)}">Selesai</button>`:''}</div></td></tr>`}).join('')}</tbody></table>`;
    wrap.querySelectorAll('[data-csr-proc]').forEach(b=>b.onclick=()=>recUpdate(content,b.dataset.csrProc,'DIPROSES'));
    wrap.querySelectorAll('[data-csr-done]').forEach(b=>b.onclick=()=>{const note=window.prompt('Catatan tindak lanjut (opsional):','');if(note===null)return;recUpdate(content,b.dataset.csrDone,'SELESAI',note)});
  }

  async function recLoad(content){
    rec.loading=true;recTable(content);
    try{const d=await req('inbox',{start:rec.start,end:rec.end,limit:1000});rec.rows=d.reports||[]}
    catch(e){rec.rows=[];toast(e.message==='forbidden'?'Anda tidak memiliki akses ke rekap ini.':'Rekap gagal dimuat.',true)}
    finally{rec.loading=false;if(document.body.contains(content))recTable(content)}
  }

  async function recUpdate(content,id,status,note=''){
    try{await req('update_status',{id,status,resolution_note:note});toast(status==='SELESAI'?'Ditandai selesai.':'Mulai diproses.');await recLoad(content)}
    catch(_){toast('Status gagal diperbarui.',true)}
  }

  function recCsv(){
    const rows=recFiltered();if(!rows.length)return toast('Tidak ada data untuk diunduh.',true);
    const cell=v=>`"${String(v??'').replace(/"/g,'""')}"`;
    const head=['Tiket','Tanggal','Pelapor','Jenis','Lokasi','Deskripsi','Harapan','Status','Tindak Lanjut','Tanggal Selesai'];
    const lines=[head.map(cell).join(';')].concat(rows.map(r=>[r.ticket_no,fmtDate(r.created_at),r.reporter_name,r.report_type==='SAPRAS'?'Sapras':'Saran & Masukan',r.location,r.description,r.requested_action,statusOf(r.status)[0],r.resolution_note,r.resolved_at?fmtDate(r.resolved_at):''].map(cell).join(';')));
    const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`rekap-laporan-masukan_${rec.start||'awal'}_${rec.end||'akhir'}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
  }

  function renderRecap(content){
    if(!content)return;css();
    const now=new Date();if(!rec.start)rec.start=ymd(new Date(now.getFullYear(),now.getMonth(),1));if(!rec.end)rec.end=ymd(now);
    content.innerHTML=`<div class="cq-csr"><div class="cq-csr-title">Rekap Laporan & Masukan</div><div class="cq-csr-sub">Semua laporan kerusakan/Sapras dan saran & masukan yang dikirim lewat tombol Salam CQ.</div>
      <div class="cq-csr-bar"><label>Dari<input type="date" id="csr-start" value="${rec.start}"></label><label>Sampai<input type="date" id="csr-end" value="${rec.end}"></label><button class="cq-csr-btn primary" id="csr-load">Tampilkan</button>
        <label>Jenis<select id="csr-type"><option value="">Semua</option><option value="SAPRAS">Sapras</option><option value="SARAN_MASUKAN">Saran & Masukan</option></select></label>
        <label>Status<select id="csr-status"><option value="">Semua</option><option value="DILAPORKAN">Menunggu</option><option value="DIPROSES">Diproses</option><option value="SELESAI">Selesai</option></select></label>
        <label class="grow">Cari<input type="text" id="csr-q" placeholder="Tiket, pelapor, lokasi, isi..." value="${esc(rec.q)}"></label><button class="cq-csr-btn" id="csr-csv">Unduh Excel (CSV)</button></div>
      <div class="cq-csr-kpis" id="csr-kpis"></div><div class="cq-csr-wrap" id="csr-table"></div></div>`;
    const $=id=>content.querySelector('#'+id);
    $('csr-type').value=rec.type;$('csr-status').value=rec.status;
    $('csr-load').onclick=()=>{rec.start=$('csr-start').value;rec.end=$('csr-end').value;recLoad(content)};
    $('csr-type').onchange=e=>{rec.type=e.target.value;recTable(content)};
    $('csr-status').onchange=e=>{rec.status=e.target.value;recTable(content)};
    $('csr-q').oninput=e=>{rec.q=e.target.value;recTable(content)};
    $('csr-csv').onclick=recCsv;
    recLoad(content);
  }
  window.renderCsReportRecap=renderRecap;

  function start(){sync();setInterval(sync,1500)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
