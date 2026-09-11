/* CQlass — Laporan Saran & Masukan / Sapras
   Reporter (Walas): Laporan > Timesheet + Saran & Masukan
   Routing: SAPRAS -> role sapras, SARAN_MASUKAN -> role kesiswaan
*/
(function(){
  'use strict';
  if(window.__cqInternalReportCenter) return;
  window.__cqInternalReportCenter=true;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
  const API=BASE+'/functions/v1/internal-reporting';
  const REPORTER_ROLES=['walas'];
  const RECEIVER_ROLES=['sapras','kesiswaan'];
  const state={type:'SAPRAS',photo:null,preview:'',busy:false,mine:[],inbox:[]};

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const role=()=>{try{return String(currentUser?.role||'').toLowerCase()}catch(_){return ''}};
  const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}};
  const toast=(m,e)=>{try{if(typeof showToast==='function')return showToast(m,!!e)}catch(_){ } alert(m)};
  const formatDate=v=>{try{return new Intl.DateTimeFormat('id-ID',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Jakarta'}).format(new Date(v))+' WIB'}catch(_){return String(v||'')}};
  const typeLabel=t=>t==='SAPRAS'?'Sapras':'Saran & Masukan';
  const targetLabel=t=>t==='SAPRAS'?'Sapras':'Kesiswaan';
  const statusLabel=s=>({TERKIRIM:'Terkirim',DILAPORKAN:'Terkirim',DIPROSES:'Diproses',SELESAI:'Selesai'}[String(s||'').toUpperCase()]||String(s||'-'));
  const statusClass=s=>String(s||'').toUpperCase()==='SELESAI'?'done':String(s||'').toUpperCase()==='DIPROSES'?'process':'new';

  function headers(){
    const h={'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY};
    const t=token(); if(t) h['x-session-token']=t;
    return h;
  }
  async function req(action,payload={}){
    const ctrl=new AbortController(); const timer=setTimeout(()=>ctrl.abort(),30000);
    try{
      const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify({action,...payload}),signal:ctrl.signal});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.success===false){const er=new Error(d.error||'request_failed');er.data=d;throw er}
      return d;
    }finally{clearTimeout(timer)}
  }

  function injectCss(){
    if(document.getElementById('cq-internal-report-css')) return;
    const s=document.createElement('style'); s.id='cq-internal-report-css';
    s.textContent=`
      .cq-ir{max-width:1180px;margin:0 auto;padding:2px 0 30px;color:#163b3b}
      .cq-ir-hero{background:linear-gradient(135deg,#0d6663,#148f86);color:#fff;border-radius:24px;padding:28px 32px;margin-bottom:18px;box-shadow:0 12px 34px rgba(9,101,96,.14)}
      .cq-ir-eyebrow{font-size:12px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;opacity:.75;margin-bottom:8px}
      .cq-ir-hero h1{margin:0 0 7px;font-size:30px;line-height:1.15}.cq-ir-hero p{margin:0;opacity:.88;font-size:14px}
      .cq-ir-card{background:#fff;border:1px solid rgba(18,105,101,.12);border-radius:20px;padding:22px;box-shadow:0 8px 30px rgba(34,94,89,.07);margin-bottom:16px}
      .cq-ir-tabs{display:grid;grid-template-columns:1fr 1fr;gap:8px;background:#eef8f6;border-radius:14px;padding:5px;margin-bottom:20px}
      .cq-ir-tab{border:0;border-radius:10px;padding:11px 14px;background:transparent;color:#54706f;font:800 14px/1.2 inherit;cursor:pointer}
      .cq-ir-tab.active{background:#fff;color:#0c7670;box-shadow:0 3px 12px rgba(23,101,95,.12)}
      .cq-ir-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.cq-ir-field{display:flex;flex-direction:column;gap:7px}.cq-ir-field.full{grid-column:1/-1}
      .cq-ir-field label{font-size:13px;font-weight:800;color:#244a49}.cq-ir-field textarea{min-height:118px;resize:vertical;border:1px solid #d7e7e4;border-radius:13px;padding:13px 14px;font:500 14px/1.55 inherit;outline:none;background:#fbfefd;color:#173d3b}
      .cq-ir-field textarea:focus{border-color:#35a79e;box-shadow:0 0 0 3px rgba(53,167,158,.11)}
      .cq-ir-help{font-size:12px;color:#718987}.cq-ir-required{color:#d74d4d}.cq-ir-route{display:flex;align-items:center;gap:9px;background:#f0faf8;border:1px solid #d5efea;padding:10px 12px;border-radius:12px;font-size:12px;color:#416866;margin:2px 0 4px}
      .cq-ir-upload{border:1.5px dashed #b9dcd6;border-radius:14px;padding:15px;background:#f8fcfb;display:flex;align-items:center;gap:14px;cursor:pointer;min-height:78px}.cq-ir-upload:hover{background:#f2faf8}
      .cq-ir-upload-preview{width:72px;height:58px;border-radius:10px;object-fit:cover;background:#e7f3f1;flex:none}.cq-ir-upload-icon{width:42px;height:42px;border-radius:12px;background:#e4f4f1;display:grid;place-items:center;font-size:20px;flex:none}
      .cq-ir-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:20px}.cq-ir-btn{border:0;border-radius:12px;padding:11px 17px;font:800 13px/1.2 inherit;cursor:pointer}.cq-ir-btn.primary{background:#0c8279;color:#fff}.cq-ir-btn.primary:disabled{opacity:.52;cursor:not-allowed}.cq-ir-btn.soft{background:#edf7f5;color:#176b66}.cq-ir-btn.done{background:#e9f7ee;color:#257349}
      .cq-ir-section-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:13px}.cq-ir-section-title h2{font-size:17px;margin:0}.cq-ir-muted{font-size:12px;color:#78908e}
      .cq-ir-list{display:grid;gap:11px}.cq-ir-row{border:1px solid #e1ecea;border-radius:15px;padding:14px 15px;background:#fff}.cq-ir-row-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:8px}.cq-ir-ticket{font-weight:900;font-size:13px;color:#163f3d}.cq-ir-meta{font-size:11px;color:#79908e;margin-top:3px}.cq-ir-badge{display:inline-flex;align-items:center;border-radius:999px;padding:5px 9px;font-size:10px;font-weight:900}.cq-ir-badge.new{background:#e9f5ff;color:#286c9e}.cq-ir-badge.process{background:#fff3d9;color:#946b16}.cq-ir-badge.done{background:#e8f6ec;color:#297149}
      .cq-ir-row p{font-size:13px;line-height:1.5;margin:5px 0;color:#355a58}.cq-ir-row strong{color:#1b4341}.cq-ir-photo{display:inline-flex;margin-top:8px;font-size:12px;font-weight:800;color:#087970;text-decoration:none}.cq-ir-row-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:10px;border-top:1px solid #edf3f2;padding-top:10px}
      .cq-ir-empty{text-align:center;padding:30px 15px;color:#7d9491;font-size:13px}.cq-ir-count{background:#edf8f6;color:#16736c;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:900}
      @media(max-width:760px){.cq-ir{padding:0}.cq-ir-hero{border-radius:18px;padding:22px 20px}.cq-ir-hero h1{font-size:24px}.cq-ir-card{padding:16px;border-radius:16px}.cq-ir-grid{grid-template-columns:1fr}.cq-ir-field.full{grid-column:auto}.cq-ir-row-head{flex-direction:column}.cq-ir-row-actions{justify-content:stretch}.cq-ir-row-actions .cq-ir-btn{flex:1}}
    `;
    document.head.appendChild(s);
  }

  function removeWalasRequestMenu(){
    if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS)) return;
    for(const g of MODULE_GROUPS){
      if(!g) continue;
      const gt=(String(g.id||'')+' '+String(g.label||'')).toLowerCase();
      const isRequestGroup=gt.includes('request')&&gt.includes('laporan');
      if(isRequestGroup&&Array.isArray(g.roles)) g.roles=g.roles.filter(r=>r!=='walas');
      if(Array.isArray(g.items)) for(const it of g.items){
        if(!it) continue;
        const tx=(String(it.id||'')+' '+String(it.label||'')).toLowerCase();
        if((isRequestGroup||(tx.includes('request')&&tx.includes('laporan')))&&Array.isArray(it.roles)) it.roles=it.roles.filter(r=>r!=='walas');
      }
    }
  }

  function ensureMenus(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS)) return false;
      removeWalasRequestMenu();
      let g=MODULE_GROUPS.find(x=>x&&x.id==='laporan');
      if(!g){g={id:'laporan',label:'Laporan',roles:[],items:[]};MODULE_GROUPS.push(g)}
      if(!Array.isArray(g.roles))g.roles=[]; if(!Array.isArray(g.items))g.items=[];
      ['walas','sapras','kesiswaan'].forEach(r=>{if(!g.roles.includes(r))g.roles.push(r)});

      // WALAS hanya melihat Timesheet + Saran & Masukan di grup Laporan.
      for(const it of g.items){
        if(!it||!Array.isArray(it.roles))continue;
        if(!['timesheet','internal-feedback'].includes(String(it.id||''))) it.roles=it.roles.filter(r=>r!=='walas');
      }
      let feedback=g.items.find(x=>x&&x.id==='internal-feedback');
      if(!feedback){feedback={id:'internal-feedback',label:'Saran & Masukan',roles:['walas'],built:true,render:renderReporter};g.items.push(feedback)}
      else Object.assign(feedback,{label:'Saran & Masukan',roles:['walas'],built:true,render:renderReporter});

      let inbox=g.items.find(x=>x&&x.id==='internal-report-inbox');
      if(!inbox){inbox={id:'internal-report-inbox',label:'Laporan Masuk',roles:['sapras','kesiswaan'],built:true,render:renderInbox};g.items.push(inbox)}
      else Object.assign(inbox,{label:'Laporan Masuk',roles:['sapras','kesiswaan'],built:true,render:renderInbox});

      // Pastikan urutan WALAS: Timesheet lalu Saran & Masukan.
      const ts=g.items.findIndex(x=>x&&x.id==='timesheet'); const fb=g.items.findIndex(x=>x&&x.id==='internal-feedback');
      if(ts>=0&&fb>=0&&fb!==ts+1){const [x]=g.items.splice(fb,1);const nts=g.items.findIndex(i=>i&&i.id==='timesheet');g.items.splice(nts+1,0,x)}

      if(typeof DASHBOARD_MODULE!=='undefined'&&Array.isArray(DASHBOARD_MODULE.roles)&&!DASHBOARD_MODULE.roles.includes('sapras')) DASHBOARD_MODULE.roles.push('sapras');
      return true;
    }catch(e){console.warn('Internal report menu patch gagal:',e);return false}
  }

  async function compressImage(file){
    if(!file) return null;
    if(!/^image\/(jpeg|png|webp)$/i.test(file.type||'')) throw new Error('Gunakan foto JPG, PNG, atau WebP.');
    const url=URL.createObjectURL(file);
    try{
      const img=new Image(); img.decoding='async'; img.src=url; await img.decode();
      const max=1600; let w=img.naturalWidth||img.width,h=img.naturalHeight||img.height;
      if(w>max||h>max){const scale=Math.min(max/w,max/h);w=Math.round(w*scale);h=Math.round(h*scale)}
      const canvas=document.createElement('canvas'); canvas.width=w; canvas.height=h;
      const ctx=canvas.getContext('2d',{alpha:false}); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h); ctx.drawImage(img,0,0,w,h);
      let quality=.84,blob=null;
      for(let i=0;i<5;i++){
        blob=await new Promise(res=>canvas.toBlob(res,'image/jpeg',quality));
        if(blob&&blob.size<=1800000)break;
        quality=Math.max(.55,quality-.08);
      }
      if(!blob) throw new Error('Foto gagal diproses.');
      const data=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(fr.result);fr.onerror=()=>reject(new Error('Foto gagal dibaca.'));fr.readAsDataURL(blob)});
      return {base64:String(data).split(',')[1]||'',mime:'image/jpeg',preview:String(data),size:blob.size};
    }finally{URL.revokeObjectURL(url)}
  }

  function reporterShell(){
    const name=esc(currentUser?.nama||currentUser?.name||'Wali Kelas'); const kelas=esc(currentUser?.kelas||'');
    return `<div class="cq-ir">
      <div class="cq-ir-hero"><div class="cq-ir-eyebrow">Wali Kelas · Laporan Internal</div><h1>Saran & Masukan</h1><p>Kirim laporan Sapras atau saran umum. Tujuan laporan ditentukan otomatis oleh sistem.</p></div>
      <div class="cq-ir-card">
        <div class="cq-ir-tabs">
          <button class="cq-ir-tab ${state.type==='SAPRAS'?'active':''}" data-ir-type="SAPRAS">Sapras</button>
          <button class="cq-ir-tab ${state.type==='SARAN_MASUKAN'?'active':''}" data-ir-type="SARAN_MASUKAN">Saran & Masukan</button>
        </div>
        <div class="cq-ir-route"><span>●</span><span>${state.type==='SAPRAS'?'Laporan fasilitas/sarana-prasarana':'Saran atau masukan non-sapras'} akan otomatis masuk ke <strong>${targetLabel(state.type)}</strong>.</span></div>
        <div style="font-size:12px;color:#718987;margin:11px 0 17px">Pengirim: <strong>${name}</strong>${kelas?' · '+kelas:''} · Tanggal/jam direkam otomatis oleh sistem saat dikirim.</div>
        <div class="cq-ir-grid">
          <div class="cq-ir-field full"><label>${state.type==='SAPRAS'?'Deskripsi masalah/kondisi':'Deskripsi saran atau masukan'} <span class="cq-ir-required">*</span></label><textarea id="cq-ir-description" placeholder="${state.type==='SAPRAS'?'Jelaskan kerusakan, kondisi, lokasi, atau masalah secara detail...':'Jelaskan saran, masukan, atau hal yang perlu diperhatikan secara jelas...'}"></textarea></div>
          <div class="cq-ir-field full"><label>Harapan yang diinginkan <span class="cq-ir-required">*</span></label><textarea id="cq-ir-requested" placeholder="Tuliskan perbaikan, solusi, atau tindak lanjut yang diharapkan..."></textarea></div>
          <div class="cq-ir-field full"><label>${state.type==='SAPRAS'?'Foto kondisi/kerusakan':'Foto pendukung'} ${state.type==='SAPRAS'?'<span class="cq-ir-required">*</span>':'<span class="cq-ir-help">(opsional)</span>'}</label>
            <input id="cq-ir-file" type="file" accept="image/jpeg,image/png,image/webp" hidden>
            <label class="cq-ir-upload" for="cq-ir-file">${state.preview?`<img class="cq-ir-upload-preview" src="${state.preview}" alt="Preview foto">`:'<span class="cq-ir-upload-icon">📷</span>'}<span><strong>${state.preview?'Foto siap dikirim':'Pilih / ambil foto'}</strong><br><span class="cq-ir-help">Foto otomatis diperkecil agar ringan sebelum dikirim.</span></span></label>
          </div>
        </div>
        <div class="cq-ir-actions"><button class="cq-ir-btn primary" id="cq-ir-submit" ${state.busy?'disabled':''}>${state.busy?'Mengirim...':'Kirim Laporan'}</button></div>
      </div>
      <div class="cq-ir-card"><div class="cq-ir-section-title"><h2>Riwayat Laporan Saya</h2><span class="cq-ir-count">${state.mine.length}</span></div><div id="cq-ir-mine">${renderMineRows()}</div></div>
    </div>`;
  }

  function renderMineRows(){
    if(!state.mine.length)return '<div class="cq-ir-empty">Belum ada laporan yang dikirim.</div>';
    return `<div class="cq-ir-list">${state.mine.map(r=>`<div class="cq-ir-row"><div class="cq-ir-row-head"><div><div class="cq-ir-ticket">${esc(r.ticket_no||'Laporan')} · ${typeLabel(r.report_type)}</div><div class="cq-ir-meta">${formatDate(r.created_at)}${r.location?' · '+esc(r.location):''} · Tujuan: ${targetLabel(r.report_type)}</div></div><span class="cq-ir-badge ${statusClass(r.status)}">${statusLabel(r.status)}</span></div><p><strong>Deskripsi:</strong> ${esc(r.description)}</p><p><strong>Harapan:</strong> ${esc(r.requested_action)}</p>${r.photo_signed_url?`<a class="cq-ir-photo" href="${esc(r.photo_signed_url)}" target="_blank" rel="noopener">Lihat foto ↗</a>`:''}${r.resolution_note?`<p><strong>Catatan penyelesaian:</strong> ${esc(r.resolution_note)}</p>`:''}</div>`).join('')}</div>`;
  }

  function bindReporter(content){
    content.querySelectorAll('[data-ir-type]').forEach(b=>b.onclick=()=>{state.type=b.dataset.irType;state.photo=null;state.preview='';renderReporter(content)});
    const f=content.querySelector('#cq-ir-file'); if(f)f.onchange=async()=>{const file=f.files?.[0];if(!file)return;try{state.photo=await compressImage(file);state.preview=state.photo.preview;renderReporter(content)}catch(e){toast(e.message||'Foto gagal diproses.',true)}};
    const submit=content.querySelector('#cq-ir-submit'); if(submit)submit.onclick=()=>submitReport(content);
  }

  async function loadMine(content){
    try{const d=await req('mine');state.mine=d.reports||[];const host=content.querySelector('#cq-ir-mine');if(host)host.innerHTML=renderMineRows();const count=content.querySelector('.cq-ir-count');if(count)count.textContent=String(state.mine.length)}catch(e){console.warn('Riwayat laporan gagal:',e)}
  }

  async function submitReport(content){
    if(state.busy)return;
    const description=String(content.querySelector('#cq-ir-description')?.value||'').trim();
    const requested=String(content.querySelector('#cq-ir-requested')?.value||'').trim();
    if(description.length<5)return toast('Mohon isi deskripsi laporan dengan lebih jelas.',true);
    if(requested.length<3)return toast('Mohon isi harapan yang diinginkan.',true);
    if(state.type==='SAPRAS'&&!state.photo)return toast('Foto wajib untuk laporan Sapras.',true);
    state.busy=true; const btn=content.querySelector('#cq-ir-submit');if(btn){btn.disabled=true;btn.textContent='Mengirim...'}
    try{
      await req('create',{report_type:state.type,description,requested_action:requested,photo_base64:state.photo?.base64||'',photo_mime:state.photo?.mime||''});
      toast(`Laporan berhasil dikirim ke ${targetLabel(state.type)}.`);
      state.photo=null;state.preview='';state.busy=false;renderReporter(content);
    }catch(e){state.busy=false;const map={photo_required:'Foto wajib untuk laporan Sapras.',photo_too_large:'Foto masih terlalu besar. Coba gunakan foto lain.',forbidden:'Sesi tidak memiliki izin untuk mengirim laporan.'};toast(map[e.message]||'Laporan gagal dikirim. Silakan coba lagi.',true);if(btn){btn.disabled=false;btn.textContent='Kirim Laporan'}}
  }

  function renderReporter(content){
    injectCss(); if(!content)return; content.innerHTML=reporterShell(); bindReporter(content); loadMine(content);
  }

  function inboxType(){return role()==='sapras'?'SAPRAS':role()==='kesiswaan'?'SARAN_MASUKAN':''}
  function inboxShell(){
    const t=inboxType();const title=t==='SAPRAS'?'Laporan Masuk Sapras':'Saran & Masukan Masuk';
    return `<div class="cq-ir"><div class="cq-ir-hero"><div class="cq-ir-eyebrow">${role()==='sapras'?'Sapras':'Kesiswaan'} · Kotak Masuk</div><h1>${title}</h1><p>${t==='SAPRAS'?'Laporan fasilitas dari wali kelas masuk otomatis ke sini.':'Saran dan masukan non-sapras dari wali kelas masuk otomatis ke sini.'}</p></div><div class="cq-ir-card"><div class="cq-ir-section-title"><h2>Daftar Laporan</h2><span class="cq-ir-count">${state.inbox.length}</span></div><div id="cq-ir-inbox">${renderInboxRows()}</div></div></div>`;
  }
  function renderInboxRows(){
    if(!state.inbox.length)return '<div class="cq-ir-empty">Belum ada laporan masuk.</div>';
    return `<div class="cq-ir-list">${state.inbox.map(r=>`<div class="cq-ir-row"><div class="cq-ir-row-head"><div><div class="cq-ir-ticket">${esc(r.ticket_no||'Laporan')} · ${esc(r.reporter_name||'Pengguna')}</div><div class="cq-ir-meta">${formatDate(r.created_at)}${r.location?' · '+esc(r.location):''}</div></div><span class="cq-ir-badge ${statusClass(r.status)}">${statusLabel(r.status)}</span></div><p><strong>Deskripsi:</strong> ${esc(r.description)}</p><p><strong>Harapan:</strong> ${esc(r.requested_action)}</p>${r.photo_signed_url?`<a class="cq-ir-photo" href="${esc(r.photo_signed_url)}" target="_blank" rel="noopener">Lihat foto laporan ↗</a>`:''}${r.resolution_note?`<p><strong>Catatan penyelesaian:</strong> ${esc(r.resolution_note)}</p>`:''}<div class="cq-ir-row-actions">${String(r.status).toUpperCase()==='TERKIRIM'||String(r.status).toUpperCase()==='DILAPORKAN'?`<button class="cq-ir-btn soft" data-ir-process="${esc(r.id)}">Proses</button>`:''}${String(r.status).toUpperCase()!=='SELESAI'?`<button class="cq-ir-btn done" data-ir-done="${esc(r.id)}">Selesaikan</button>`:''}</div></div>`).join('')}</div>`;
  }
  function bindInbox(content){
    content.querySelectorAll('[data-ir-process]').forEach(b=>b.onclick=()=>updateStatus(content,b.dataset.irProcess,'DIPROSES'));
    content.querySelectorAll('[data-ir-done]').forEach(b=>b.onclick=()=>{const note=window.prompt('Catatan penyelesaian (opsional):','');updateStatus(content,b.dataset.irDone,'SELESAI',note||'')});
  }
  async function loadInbox(content){
    const t=inboxType(); if(!t)return;
    try{const d=await req('inbox',{report_type:t});state.inbox=d.reports||[];const h=content.querySelector('#cq-ir-inbox');if(h)h.innerHTML=renderInboxRows();const c=content.querySelector('.cq-ir-count');if(c)c.textContent=String(state.inbox.length);bindInbox(content)}catch(e){toast('Laporan masuk gagal dimuat.',true)}
  }
  async function updateStatus(content,id,status,note=''){
    try{await req('update_status',{id,status,resolution_note:note});toast(status==='SELESAI'?'Laporan ditandai selesai.':'Laporan mulai diproses.');await loadInbox(content)}catch(e){toast('Status laporan gagal diperbarui.',true)}
  }
  function renderInbox(content){injectCss();if(!content)return;content.innerHTML=inboxShell();bindInbox(content);loadInbox(content)}

  function install(){
    ensureMenus();
    // Sapras langsung mendapat dashboard berupa kotak masuk agar akun tidak berakhir di dashboard kosong.
    try{
      if(typeof DASHBOARD_MODULE!=='undefined'&&!DASHBOARD_MODULE.__cqSaprasDashboard){
        const base=DASHBOARD_MODULE.render;
        DASHBOARD_MODULE.render=function(content){if(role()==='sapras')return renderInbox(content);return typeof base==='function'?base.apply(this,arguments):undefined};
        DASHBOARD_MODULE.__cqSaprasDashboard=true;
      }
    }catch(_){ }
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqInternalReports){
      const base=renderSidebar;const wrapped=function(){ensureMenus();return base.apply(this,arguments)};wrapped.__cqInternalReports=true;renderSidebar=wrapped;
    }
    try{if(typeof currentUser!=='undefined'&&currentUser&&typeof renderSidebar==='function')renderSidebar()}catch(_){ }
  }

  window.renderInternalFeedback=renderReporter;
  window.renderInternalReportInbox=renderInbox;
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
