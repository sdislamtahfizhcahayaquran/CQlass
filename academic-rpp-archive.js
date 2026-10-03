/* CQlass — RPP & LP unified viewer for Kabid Akademik/Kurikulum only */
(function(){
  'use strict';
  if(window.__CQ_ACADEMIC_RPP_ARCHIVE__) return;

  const BASE=(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL)||'https://lmglkxzemtvxcgktiord.supabase.co';
  const ENDPOINT=BASE+'/functions/v1/rpp-lp-manager';
  let RPP={rows:[],summary:{},academic_year:'',semester_no:1};
  let LP={rows:[],summary:{},academic_year:'',semester_no:1};
  let TAB='rpp';

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  function isAcademic(){
    let u={};try{u=(typeof currentUser!=='undefined'&&currentUser)||{}}catch(_){}
    const vals=[u.role,u.role_code,u.primary_role].concat(Array.isArray(u.roles)?u.roles:[]).map(norm);
    return vals.some(r=>r==='akademik'||r==='kabid_akademik');
  }
  function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}}
  function headers(){
    const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
    return {'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()};
  }
  async function req(action,payload={}){
    const r=await fetch(ENDPOINT,{method:'POST',headers:headers(),body:JSON.stringify({action,...payload})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.success===false)throw new Error(d.error||'Data RPP & LP belum dapat dimuat.');
    return d;
  }
  function styles(){
    if(document.getElementById('cq-ak-rpp-style'))return;
    const s=document.createElement('style');s.id='cq-ak-rpp-style';
    s.textContent=`
      .akrpp{padding:2px 0 24px;color:#173f3b}.akrpp *{box-sizing:border-box}
      .akrpp .hero{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:10px}
      .akrpp h1{margin:0;font-size:25px;line-height:1.2}.akrpp .sub{margin-top:5px;font-size:12px;color:#6b807c}
      .akrpp .tabs{display:flex;gap:7px;margin:0 0 12px}.akrpp .tab{border:1px solid #cfe2de;background:#fff;color:#496a64;border-radius:10px;padding:8px 14px;font:inherit;font-size:11px;font-weight:800;cursor:pointer}
      .akrpp .tab.active{background:#117b70;color:#fff;border-color:#117b70}
      .akrpp .stats{display:flex;gap:8px;flex-wrap:wrap}.akrpp .stat{background:#fff;border:1px solid #dceae7;border-radius:12px;padding:10px 13px;min-width:120px}
      .akrpp .stat b{display:block;font-size:18px}.akrpp .stat span{font-size:10.5px;color:#718481}
      .akrpp .card{background:#fff;border:1px solid #dceae7;border-radius:14px;padding:13px}
      .akrpp .filters{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:8px;margin-bottom:10px}
      .akrpp input,.akrpp select{width:100%;height:36px;border:1px solid #cfdeda;border-radius:9px;background:#fff;padding:0 9px;font:inherit;font-size:11.5px;color:#173f3b}
      .akrpp .wrap{overflow:auto;border:1px solid #e1ece9;border-radius:12px}.akrpp table{width:100%;min-width:960px;border-collapse:collapse}
      .akrpp th,.akrpp td{padding:8px 9px;border-bottom:1px solid #edf2f1;text-align:left;font-size:11px;vertical-align:middle}
      .akrpp th{position:sticky;top:0;background:#eef7f5;color:#4f6d67;font-size:10px;z-index:1}.akrpp tr:last-child td{border-bottom:0}
      .akrpp .btn{height:29px;border:1px solid #cce3df;border-radius:8px;background:#edf7f5;color:#0d6f65;padding:0 10px;font:inherit;font-size:10.5px;font-weight:800;cursor:pointer}
      .akrpp .muted{color:#778985}.akrpp .empty{text-align:center;padding:26px;color:#718481}.akrpp .pill{display:inline-block;padding:4px 7px;border-radius:999px;background:#f1f6f5;font-size:9.5px;font-weight:800}
      .akrpp .ok{background:#e8f6f1;color:#14705f}.akrpp .warn{background:#fff6dc;color:#8b6814}
      @media(max-width:900px){.akrpp .filters{grid-template-columns:1fr 1fr}}@media(max-width:560px){.akrpp .filters{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function fmtBytes(n){n=Number(n)||0;if(n<1024)return n+' B';if(n<1048576)return (n/1024).toFixed(1)+' KB';return (n/1048576).toFixed(1)+' MB'}
  function fmtDate(v){if(!v)return '—';try{return new Date(v).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}catch(_){return String(v).slice(0,10)}}
  function uniq(rows,key){return [...new Set((rows||[]).map(x=>String(x[key]||'')).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'id'))}

  function rppFiltered(){
    const q=(document.getElementById('akrpp-q')?.value||'').toLowerCase().trim();
    const t=document.getElementById('akrpp-teacher')?.value||'';
    const c=document.getElementById('akrpp-class')?.value||'';
    const s=document.getElementById('akrpp-subject')?.value||'';
    return (RPP.rows||[]).filter(x=>{
      if(t&&x.teacher_name!==t)return false;if(c&&x.class_name!==c)return false;if(s&&x.subject_name!==s)return false;
      return !q||[x.original_filename,x.teacher_name,x.class_name,x.subject_name].join(' ').toLowerCase().includes(q);
    });
  }
  function rppRows(){
    const rows=rppFiltered();const meta=document.getElementById('akrpp-meta');if(meta)meta.textContent=rows.length+' file tampil';
    return rows.length?rows.map((x,i)=>`<tr><td>${i+1}</td><td><b>${esc(x.original_filename||'—')}</b><div class="muted">${esc(fmtBytes(x.file_size))}</div></td><td>${esc(x.teacher_name||'—')}</td><td>${esc(x.class_name||'—')}</td><td>${esc(x.subject_name||'—')}</td><td>${esc(fmtDate(x.uploaded_at||x.created_at))}</td><td><span class="pill">${esc(x.content_status||'pending_review')}</span></td><td><button class="btn" data-view="${esc(x.id)}">Lihat</button></td></tr>`).join(''):'<tr><td colspan="8" class="empty">Tidak ada RPP sesuai filter.</td></tr>';
  }
  function wireViews(c){c.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',async()=>{try{b.disabled=true;b.textContent='Membuka...';const d=await req('view_file',{submission_id:b.dataset.view});window.open(d.url,'_blank','noopener')}catch(e){if(typeof showToast==='function')showToast(e.message||'Gagal membuka file.',true)}finally{b.disabled=false;b.textContent='Lihat'}}))}
  function paintRpp(c){
    const sm=RPP.summary||{};
    c.querySelector('#akrpp-panel').innerHTML=`
      <div class="hero"><div><div class="sub">File RPP tersimpan private. Tombol Lihat menggunakan tautan sementara.</div></div>
      <div class="stats"><div class="stat"><b>${Number(sm.files||RPP.rows.length)}</b><span>Total RPP</span></div><div class="stat"><b>${esc(fmtBytes(sm.bytes||0))}</b><span>Penyimpanan</span></div><div class="stat"><b>${Number(sm.pending_review||0)}</b><span>Perlu ditinjau</span></div></div></div>
      <div class="card"><div class="filters">
        <input id="akrpp-q" placeholder="Cari file / guru / kelas / mapel">
        <select id="akrpp-teacher"><option value="">Semua Guru</option>${uniq(RPP.rows,'teacher_name').map(v=>`<option>${esc(v)}</option>`).join('')}</select>
        <select id="akrpp-class"><option value="">Semua Kelas</option>${uniq(RPP.rows,'class_name').map(v=>`<option>${esc(v)}</option>`).join('')}</select>
        <select id="akrpp-subject"><option value="">Semua Mapel</option>${uniq(RPP.rows,'subject_name').map(v=>`<option>${esc(v)}</option>`).join('')}</select>
      </div><div id="akrpp-meta" class="muted" style="font-size:10.5px;margin:0 0 8px">${RPP.rows.length} file tampil</div>
      <div class="wrap"><table><thead><tr><th>No</th><th>File</th><th>Guru</th><th>Kelas</th><th>Mapel</th><th>Upload</th><th>Status</th><th>Aksi</th></tr></thead><tbody id="akrpp-body">${rppRows()}</tbody></table></div></div>`;
    ['akrpp-q','akrpp-teacher','akrpp-class','akrpp-subject'].forEach(id=>c.querySelector('#'+id)?.addEventListener(id==='akrpp-q'?'input':'change',()=>{const tb=c.querySelector('#akrpp-body');if(tb)tb.innerHTML=rppRows();wireViews(c)}));
    wireViews(c);
  }
  function lpFiltered(){
    const q=(document.getElementById('aklp-q')?.value||'').toLowerCase().trim();
    const t=document.getElementById('aklp-teacher')?.value||'';const c=document.getElementById('aklp-class')?.value||'';const s=document.getElementById('aklp-subject')?.value||'';
    return (LP.rows||[]).filter(x=>{if(t&&x.teacher_name!==t)return false;if(c&&x.class_name!==c)return false;if(s&&x.subject_name!==s)return false;return !q||[x.teacher_name,x.class_name,x.subject_name,x.target_text,x.period_label].join(' ').toLowerCase().includes(q)});
  }
  function lpRows(){
    const rows=lpFiltered();const meta=document.getElementById('aklp-meta');if(meta)meta.textContent=rows.length+' target tampil';
    return rows.length?rows.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.teacher_name||'—')}</td><td>${esc(x.class_name||'—')}</td><td>${esc(x.subject_name||'—')}</td><td><b>${esc(x.period_label||('Minggu '+(x.week_no||''))||'—')}</b><div class="muted">${esc(x.target_text||'')}</div></td><td>${Number(x.progress_percent||0)}%</td><td><span class="pill ${x.rpp_status==='sudah_upload'?'ok':'warn'}">${esc(x.rpp_status||'—')}</span></td><td>${esc(x.execution_status||'not_started')}</td></tr>`).join(''):'<tr><td colspan="8" class="empty">Tidak ada LP sesuai filter.</td></tr>';
  }
  function paintLp(c){
    const sm=LP.summary||{};
    c.querySelector('#akrpp-panel').innerHTML=`
      <div class="hero"><div><div class="sub">Rekap target LP dan progres pelaksanaan per guru, kelas, dan mapel.</div></div>
      <div class="stats"><div class="stat"><b>${Number(sm.rows||LP.rows.length)}</b><span>Total target</span></div><div class="stat"><b>${Number(sm.submitted||0)}</b><span>RPP masuk</span></div><div class="stat"><b>${Number(sm.missing||0)}</b><span>Belum upload</span></div></div></div>
      <div class="card"><div class="filters">
        <input id="aklp-q" placeholder="Cari guru / kelas / mapel / target">
        <select id="aklp-teacher"><option value="">Semua Guru</option>${uniq(LP.rows,'teacher_name').map(v=>`<option>${esc(v)}</option>`).join('')}</select>
        <select id="aklp-class"><option value="">Semua Kelas</option>${uniq(LP.rows,'class_name').map(v=>`<option>${esc(v)}</option>`).join('')}</select>
        <select id="aklp-subject"><option value="">Semua Mapel</option>${uniq(LP.rows,'subject_name').map(v=>`<option>${esc(v)}</option>`).join('')}</select>
      </div><div id="aklp-meta" class="muted" style="font-size:10.5px;margin:0 0 8px">${LP.rows.length} target tampil</div>
      <div class="wrap"><table><thead><tr><th>No</th><th>Guru</th><th>Kelas</th><th>Mapel</th><th>Target LP</th><th>Progres</th><th>RPP</th><th>Pelaksanaan</th></tr></thead><tbody id="aklp-body">${lpRows()}</tbody></table></div></div>`;
    ['aklp-q','aklp-teacher','aklp-class','aklp-subject'].forEach(id=>c.querySelector('#'+id)?.addEventListener(id==='aklp-q'?'input':'change',()=>{const tb=c.querySelector('#aklp-body');if(tb)tb.innerHTML=lpRows()}));
  }
  function paint(c){
    styles();
    c.innerHTML=`<div class="akrpp"><div class="hero"><div><h1>RPP & LP</h1><div class="sub">Kurikulum · Tahun Ajaran ${esc(RPP.academic_year||LP.academic_year||'—')} · Semester ${esc(RPP.semester_no||LP.semester_no||1)}</div></div></div>
      <div class="tabs"><button class="tab ${TAB==='rpp'?'active':''}" data-tab="rpp">RPP</button><button class="tab ${TAB==='lp'?'active':''}" data-tab="lp">LP</button></div><div id="akrpp-panel"></div></div>`;
    c.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{TAB=b.dataset.tab||'rpp';paint(c)}));
    if(TAB==='lp')paintLp(c);else paintRpp(c);
  }
  async function render(c){
    if(!isAcademic()){c.innerHTML='<div class="card">Menu ini khusus Kabid Akademik.</div>';return}
    styles();c.innerHTML='<div class="akrpp"><div class="card empty">Memuat RPP & LP...</div></div>';
    try{[RPP,LP]=await Promise.all([req('archive_report'),req('report')]);paint(c)}catch(e){c.innerHTML='<div class="akrpp"><div class="card empty">'+esc(e.message||'Gagal memuat RPP & LP.')+'</div></div>'}
  }
  function patch(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
      let g=MODULE_GROUPS.find(x=>x&&x.id==='akademik');
      if(!g){g={id:'akademik',label:'Akademik',roles:['akademik'],items:[]};MODULE_GROUPS.push(g)}
      if(!Array.isArray(g.roles))g.roles=[];if(!g.roles.includes('akademik'))g.roles.push('akademik');
      if(!Array.isArray(g.items))g.items=[];
      g.items=g.items.filter(x=>x&&x.id!=='arsip-rpp-akademik'&&x.id!=='rpp-lp-akademik');
      const shared=g.items.find(x=>x&&x.id==='rpp-lp');
      if(shared&&Array.isArray(shared.roles))shared.roles=shared.roles.filter(r=>norm(r)!=='akademik'&&norm(r)!=='kabid_akademik');
      g.items.push({id:'rpp-lp-akademik',label:'RPP & LP',roles:['akademik'],built:true,render});
      return true;
    }catch(_){return false}
  }
  function install(){
    window.renderAcademicRppArchive=render;window.renderAcademicRppLp=render;patch();
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqAkRppArchive){const old=renderSidebar;renderSidebar=function(){patch();return old.apply(this,arguments)};renderSidebar.__cqAkRppArchive=true}
    window.__CQ_ACADEMIC_RPP_ARCHIVE__=true;
    try{if(typeof renderSidebar==='function')renderSidebar()}catch(_){}
  }
  let tries=0;(function wait(){if(typeof MODULE_GROUPS!=='undefined'){install();return}window.renderAcademicRppArchive=render;if(++tries<100)setTimeout(wait,150)})();
})();