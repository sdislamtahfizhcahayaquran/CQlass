/* CQlass HRD — Soft Futuristic Dashboard Charts */
(function(){
  'use strict';
  if(window.__cqHrdFuturisticCharts) return;
  window.__cqHrdFuturisticCharts=true;

  const BASE=typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
  const KEY=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
  const ADMIN_URL=BASE+'/functions/v1/hrd-administration';
  const STUDENT_URL=BASE+'/functions/v1/hrd-student-affairs-trends';
  const PERF_URL=BASE+'/functions/v1/hrd-performance-range';
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const num=v=>Number(v||0).toLocaleString('id-ID');
  const pct=v=>Math.max(0,Math.min(100,Number(v||0)));

  function isHRD(){
    try{
      if(typeof currentUser!=='undefined'&&String(currentUser?.role||'').toLowerCase()==='hrd') return true;
      const u=JSON.parse(localStorage.getItem('cqlass_user')||'{}');
      return String(u.role||u.primary_role||u.role_code||'').toLowerCase()==='hrd';
    }catch(_){return false}
  }
  async function api(url,payload){
    const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||'';
    const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),45000);
    try{
      const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':token},body:JSON.stringify(payload||{}),signal:ctrl.signal});
      const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw Error('Respons grafik tidak valid.')}
      if(!r.ok||d.success===false)throw Error(d.message||d.error||'Data grafik gagal dimuat.');
      return d;
    }finally{clearTimeout(timer)}
  }
  function fmtShort(v){
    if(!v)return'';
    try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short'}).format(new Date(v+'T00:00:00+07:00'))}catch(_){return v}
  }
  function css(){
    if(document.getElementById('cq-hrd-future-chart-css'))return;
    const s=document.createElement('style');s.id='cq-hrd-future-chart-css';s.textContent=`
      .cq-hf-wrap{margin:0 0 18px;position:relative}
      .cq-hf-head{display:flex;align-items:end;justify-content:space-between;gap:12px;margin:2px 2px 10px}
      .cq-hf-head h2{margin:0;font:800 15px/1.25 'Plus Jakarta Sans',Inter,sans-serif;color:#173f3f}
      .cq-hf-head p{margin:4px 0 0;font-size:10.5px;color:#789090}
      .cq-hf-live{display:inline-flex;align-items:center;gap:6px;font-size:9px;font-weight:850;letter-spacing:.08em;color:#0a6e6e;text-transform:uppercase}
      .cq-hf-live:before{content:'';width:7px;height:7px;border-radius:999px;background:#55b9aa;box-shadow:0 0 0 5px rgba(85,185,170,.11)}
      .cq-hf-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}
      .cq-hf-card{position:relative;overflow:hidden;min-height:255px;padding:16px;border-radius:20px;background:linear-gradient(160deg,rgba(255,255,255,.98),rgba(244,251,250,.96));border:1px solid rgba(205,229,225,.95);box-shadow:0 10px 30px rgba(20,83,80,.055)}
      .cq-hf-card:before{content:'';position:absolute;width:140px;height:140px;border-radius:50%;right:-58px;top:-65px;background:radial-gradient(circle,rgba(88,190,173,.13),rgba(88,190,173,0) 70%);pointer-events:none}
      .cq-hf-card:after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(16,112,105,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(16,112,105,.025) 1px,transparent 1px);background-size:24px 24px;mask-image:linear-gradient(to bottom,rgba(0,0,0,.55),transparent 80%);pointer-events:none}
      .cq-hf-top{position:relative;z-index:1;display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .cq-hf-title{font-size:11px;font-weight:850;color:#577271;text-transform:uppercase;letter-spacing:.06em}
      .cq-hf-value{margin-top:5px;font:800 25px/1 'Plus Jakarta Sans',Inter,sans-serif;color:#123f3e}
      .cq-hf-sub{margin-top:5px;font-size:9.5px;color:#819493}
      .cq-hf-chip{border:1px solid #d3e8e4;background:rgba(236,248,246,.92);color:#0a6e6e;border-radius:999px;padding:6px 8px;font-size:8.5px;font-weight:850;white-space:nowrap}
      .cq-hf-chart{position:relative;z-index:1;margin-top:14px;height:135px}
      .cq-hf-chart svg{display:block;width:100%;height:100%;overflow:visible}
      .cq-hf-axis{display:flex;justify-content:space-between;margin-top:2px;font-size:8.5px;color:#91a2a1}
      .cq-hf-bars{display:grid;gap:8px;margin-top:14px;position:relative;z-index:1}
      .cq-hf-row{display:grid;grid-template-columns:94px 1fr 35px;gap:8px;align-items:center}
      .cq-hf-row span{font-size:9.5px;color:#607878;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .cq-hf-track{height:8px;background:#e8f2f0;border-radius:999px;overflow:hidden;box-shadow:inset 0 1px 2px rgba(26,86,83,.05)}
      .cq-hf-fill{height:100%;border-radius:inherit;background:linear-gradient(90deg,#90d4c7,#45a99a);box-shadow:0 0 14px rgba(69,169,154,.15)}
      .cq-hf-row b{font-size:9.5px;color:#1c5552;text-align:right}
      .cq-hf-dist{display:flex;align-items:flex-end;gap:7px;height:126px;margin-top:16px;position:relative;z-index:1}
      .cq-hf-col{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:5px;height:100%}
      .cq-hf-col i{display:block;width:min(34px,72%);min-height:5px;border-radius:10px 10px 4px 4px;background:linear-gradient(180deg,#62b9ab,#b5dfd7);box-shadow:0 5px 13px rgba(61,157,145,.12)}
      .cq-hf-col b{font-size:9px;color:#426b68}
      .cq-hf-col span{font-size:7.7px;color:#879a98;text-align:center;line-height:1.15;min-height:18px}
      .cq-hf-loading{display:grid;place-items:center;height:120px;color:#829694;font-size:10px}
      .cq-hf-note{position:relative;z-index:1;margin-top:9px;font-size:8.5px;line-height:1.45;color:#8a9c9b}
      @media(max-width:980px){.cq-hf-grid{grid-template-columns:1fr}}
      @media(max-width:620px){.cq-hf-card{min-height:235px;padding:14px}.cq-hf-row{grid-template-columns:82px 1fr 31px}.cq-hf-head{align-items:flex-start}.cq-hf-live{display:none}}
    `;document.head.appendChild(s);
  }
  function lineSvg(rows,key,id){
    const vals=(rows||[]).map(x=>Number(x[key]||0));
    const max=Math.max(1,...vals),w=520,h=120,p=8;
    if(!vals.length)return '<div class="cq-hf-loading">Belum ada data pada periode ini.</div>';
    const pts=vals.map((v,i)=>{const x=vals.length===1?w/2:p+i*(w-2*p)/(vals.length-1);const y=h-p-(v/max)*(h-2*p);return [x,y]}),line=pts.map(x=>x.join(',')).join(' '),area=[[p,h-p],...pts,[w-p,h-p]].map(x=>x.join(',')).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}a" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#55b9aa" stop-opacity=".30"/><stop offset="100%" stop-color="#55b9aa" stop-opacity="0"/></linearGradient><linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#9cd8cd"/><stop offset="100%" stop-color="#379b90"/></linearGradient></defs><line x1="${p}" y1="${h-p}" x2="${w-p}" y2="${h-p}" stroke="#dcebea" stroke-width="1"/><line x1="${p}" y1="${h*.55}" x2="${w-p}" y2="${h*.55}" stroke="#edf4f3" stroke-width="1" stroke-dasharray="4 5"/><polygon points="${area}" fill="url(#${id}a)"/><polyline points="${line}" fill="none" stroke="url(#${id}l)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>${pts.map((x,i)=>vals[i]?`<circle cx="${x[0]}" cy="${x[1]}" r="2.7" fill="#fff" stroke="#389d91" stroke-width="2" vector-effect="non-scaling-stroke"/>`:'').join('')}</svg>`;
  }
  function learningRows(admin){
    const keys=[['academic','Capaian'],['rpp','RPP'],['timesheet','Timesheet'],['bilingual','Bilingual'],['pjbl','PBL']];
    return keys.map(([key,label])=>{
      let total=0,score=0;
      for(const t of admin?.teachers||[]){const c=(t.categories||[]).find(x=>x.key===key);if(!c||!c.applicable)continue;total++;if(c.status==='present')score+=1;else if(c.status==='partial')score+=.5}
      return{label,value:total?Math.round(score/total*100):0,total};
    });
  }
  function learnCard(admin){
    const rows=learningRows(admin),withData=rows.filter(x=>x.total),avg=withData.length?Math.round(withData.reduce((n,x)=>n+x.value,0)/withData.length):0;
    return `<article class="cq-hf-card"><div class="cq-hf-top"><div><div class="cq-hf-title">Grafik Pembelajaran</div><div class="cq-hf-value">${avg}%</div><div class="cq-hf-sub">rata-rata keterisian indikator pembelajaran</div></div><div class="cq-hf-chip">LIVE</div></div><div class="cq-hf-bars">${rows.map(x=>`<div class="cq-hf-row"><span>${esc(x.label)}</span><div class="cq-hf-track"><div class="cq-hf-fill" style="width:${pct(x.value)}%"></div></div><b>${x.total?x.value+'%':'—'}</b></div>`).join('')}</div><div class="cq-hf-note">Mengikuti granularity sumber masing-masing laporan; tidak memaksa data semester menjadi data harian.</div></article>`;
  }
  function trendCard(title,total,rows,key,start,end,kind){
    const id='cq'+kind+Math.random().toString(36).slice(2,7),active=(rows||[]).filter(x=>Number(x[key]||0)>0).length;
    return `<article class="cq-hf-card"><div class="cq-hf-top"><div><div class="cq-hf-title">${esc(title)}</div><div class="cq-hf-value">${num(total)}</div><div class="cq-hf-sub">${active} hari memiliki catatan</div></div><div class="cq-hf-chip">${esc(fmtShort(start))}—${esc(fmtShort(end))}</div></div><div class="cq-hf-chart">${lineSvg(rows,key,id)}</div><div class="cq-hf-axis"><span>${esc(fmtShort(start))}</span><span>${esc(fmtShort(end))}</span></div></article>`;
  }
  function perfCard(perf){
    const d=perf?.distribution||{},labels=[['Unggul','Unggul'],['Kuat','Kuat'],['Stabil','Stabil'],['Perlu perhatian','Perhatian'],['Data awal','Data awal']],vals=labels.map(x=>Number(d[x[0]]||0)),max=Math.max(1,...vals);
    return `<article class="cq-hf-card"><div class="cq-hf-top"><div><div class="cq-hf-title">Grafik Performa Guru</div><div class="cq-hf-value">${perf?.summary?.average_score==null?'—':Math.round(Number(perf.summary.average_score))}</div><div class="cq-hf-sub">rata-rata indeks dari guru yang memiliki denominator data</div></div><div class="cq-hf-chip">${num(perf?.summary?.scored||0)} guru terukur</div></div><div class="cq-hf-dist">${labels.map((x,i)=>`<div class="cq-hf-col"><b>${vals[i]}</b><i style="height:${Math.max(6,Math.round(vals[i]/max*88))}px"></i><span>${esc(x[1])}</span></div>`).join('')}</div><div class="cq-hf-note">Akademik masih agregat semester karena tanggal asesmen belum tersedia; dimensi harian tetap mengikuti periode pilihan.</div></article>`;
  }
  async function mount(){
    if(!isHRD())return;
    const root=document.getElementById('hrd-root');if(!root)return;
    const start=document.getElementById('hrd-date-start')?.value||'',end=document.getElementById('hrd-date-end')?.value||'';
    if(!start||!end)return;
    const key=start+'|'+end;
    const old=document.getElementById('cq-hrd-futuristic-charts');if(old?.dataset.key===key)return;
    if(old)old.remove();
    const anchor=document.getElementById('cq-hrd-periodbar')||root.querySelector('.hrd-kpis');if(!anchor)return;
    css();
    const section=document.createElement('section');section.id='cq-hrd-futuristic-charts';section.dataset.key=key;section.className='cq-hf-wrap';section.innerHTML=`<div class="cq-hf-head"><div><h2>Visual Overview</h2><p>Grafik ringkas periode terpilih.</p></div><div class="cq-hf-live">Live dashboard</div></div><div class="cq-hf-grid"><article class="cq-hf-card"><div class="cq-hf-loading">Menyiapkan grafik pembelajaran…</div></article><article class="cq-hf-card"><div class="cq-hf-loading">Menyiapkan grafik kedisiplinan…</div></article><article class="cq-hf-card"><div class="cq-hf-loading">Menyiapkan grafik reward…</div></article><article class="cq-hf-card"><div class="cq-hf-loading">Menyiapkan grafik performa…</div></article></div>`;
    anchor.insertAdjacentElement('afterend',section);
    try{
      const [admin,student,perf]=await Promise.all([api(ADMIN_URL,{action:'administration',start,end}),api(STUDENT_URL,{start,end}),api(PERF_URL,{start,end})]);
      if(!document.body.contains(section)||section.dataset.key!==key)return;
      const grid=section.querySelector('.cq-hf-grid');
      grid.innerHTML=learnCard(admin)+trendCard('Grafik Kedisiplinan',student?.summary?.discipline_count||0,student?.series||[],'discipline',start,end,'d')+trendCard('Grafik Reward',student?.summary?.reward_count||0,student?.series||[],'reward',start,end,'r')+perfCard(perf);
    }catch(e){
      const grid=section.querySelector('.cq-hf-grid');if(grid)grid.innerHTML=`<article class="cq-hf-card" style="grid-column:1/-1;min-height:120px"><div class="cq-hf-loading">Grafik belum dapat dimuat: ${esc(e?.message||'terjadi kendala')}</div></article>`;
    }
  }
  const host=document.getElementById('content')||document.body;
  const obs=new MutationObserver(()=>{clearTimeout(window.__cqHrdFutureTimer);window.__cqHrdFutureTimer=setTimeout(mount,90)});
  obs.observe(host,{childList:true,subtree:true});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(mount,250));
  setTimeout(mount,800);
})();