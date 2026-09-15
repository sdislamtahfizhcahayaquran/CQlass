(function(){
  'use strict';

  const ENDPOINT=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/kesiswaan-point-recap';
  const STATE={cache:{},pending:{},filters:{}};

  function esc(v){
    if(typeof escapeHtml==='function')return escapeHtml(v);
    return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function isKesiswaan(){
    const r=String((typeof currentUser!=='undefined'&&currentUser&&currentUser.role)||'').toLowerCase();
    return r.includes('kesiswaan');
  }
  function jakartaParts(){
    const f=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'});
    const p=Object.fromEntries(f.formatToParts(new Date()).map(x=>[x.type,x.value]));
    return {year:Number(p.year),month:Number(p.month),day:Number(p.day),iso:`${p.year}-${p.month}-${p.day}`};
  }
  function academicPeriod(){const p=jakartaParts(),y=p.month>=7?p.year:p.year-1;return {start:`${y}-07-01`,end:`${y+1}-06-30`,label:`${y}/${y+1}`}}
  function defaultFilter(kind){
    if(STATE.filters[kind])return STATE.filters[kind];
    const p=academicPeriod();STATE.filters[kind]={start:p.start,end:p.end};return STATE.filters[kind];
  }
  function fmt(n){return Number(n||0).toLocaleString('id-ID')}
  function pct(n){return `${Number(n||0).toLocaleString('id-ID',{maximumFractionDigits:1})}%`}
  function dateLabel(start,end){
    const f=v=>{if(!v)return '-';const d=new Date(v+'T00:00:00');return d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})};
    return start===end?f(start):`${f(start)} – ${f(end)}`;
  }
  function injectStyles(){
    if(document.getElementById('kpr-styles'))return;
    const s=document.createElement('style');s.id='kpr-styles';s.textContent=`
      .kpr-wrap{display:grid;gap:18px}.kpr-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}.kpr-title{font-size:24px;font-weight:800;color:#18322d}.kpr-sub{margin-top:5px;color:#66756f;font-size:13px}.kpr-actions{display:flex;gap:8px;flex-wrap:wrap}.kpr-btn{border:1px solid #d6e3df;background:#fff;border-radius:10px;padding:9px 13px;font-weight:700;cursor:pointer;color:#24574d}.kpr-btn:hover{background:#f4faf8}.kpr-btn.primary{background:#245f53;color:#fff;border-color:#245f53}.kpr-filter{background:#fff;border:1px solid #e4ece9;border-radius:16px;padding:14px 16px;display:flex;align-items:end;gap:10px;flex-wrap:wrap}.kpr-field{display:grid;gap:5px}.kpr-field label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#72817c}.kpr-field input{border:1px solid #d9e4e0;border-radius:9px;padding:9px 10px;font:inherit;color:#25463f;background:#fff}.kpr-quick{display:flex;gap:6px;flex-wrap:wrap}.kpr-quick button{border:0;background:#eef6f3;color:#2b6559;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;cursor:pointer}.kpr-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:12px}.kpr-stat{background:#fff;border:1px solid #e4ece9;border-radius:16px;padding:16px;box-shadow:0 6px 18px rgba(31,70,61,.05)}.kpr-stat strong{display:block;font-size:27px;line-height:1.1;color:#173e36}.kpr-stat span{display:block;margin-top:6px;font-size:12px;color:#73817c}.kpr-card{background:#fff;border:1px solid #e4ece9;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(31,70,61,.04)}.kpr-card-head{padding:15px 17px;border-bottom:1px solid #edf2f0;display:flex;align-items:center;justify-content:space-between;gap:12px}.kpr-card-head b{font-size:15px;color:#23463f}.kpr-table-wrap{overflow:auto}.kpr-table{width:100%;border-collapse:collapse;min-width:820px}.kpr-table th,.kpr-table td{padding:12px 13px;border-bottom:1px solid #edf2f0;text-align:left;font-size:12px;vertical-align:top}.kpr-table th{background:#f7faf9;color:#60706a;font-size:11px;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}.kpr-table td strong{color:#203f39}.kpr-num{text-align:right!important;font-variant-numeric:tabular-nums}.kpr-rank{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.kpr-rank-list{padding:5px 15px 13px}.kpr-rank-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #edf2f0}.kpr-rank-row:last-child{border-bottom:0}.kpr-rank-no{width:28px;height:28px;border-radius:9px;background:#eef6f3;display:flex;align-items:center;justify-content:center;font-weight:800;color:#2b6559}.kpr-rank-name{font-size:13px;font-weight:800;color:#203f39}.kpr-rank-meta{font-size:11px;color:#7b8884;margin-top:2px}.kpr-rank-score{text-align:right}.kpr-rank-score b{display:block;font-size:14px;color:#23463f}.kpr-rank-score span{font-size:10px;color:#7b8884;white-space:nowrap}.kpr-empty{padding:28px;text-align:center;color:#7a8783;font-size:13px}.kpr-pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;background:#eef6f3;color:#2b6559;font-size:10px;font-weight:800}.kpr-error{padding:18px;border-radius:14px;background:#fff3f3;color:#a23e3e;border:1px solid #f0cdcd}.kpr-loader{padding:28px;text-align:center;color:#687772}.kpr-topcell{max-width:200px}.kpr-topcell small{display:block;color:#8a9692;margin-top:2px}
      @media(max-width:900px){.kpr-rank{grid-template-columns:1fr}}
      @media(max-width:560px){.kpr-stats{grid-template-columns:1fr 1fr}.kpr-stat{padding:13px}.kpr-stat strong{font-size:23px}.kpr-title{font-size:21px}.kpr-filter{align-items:stretch}.kpr-field{flex:1 1 140px}}
    `;document.head.appendChild(s);
  }
  async function fetchRecap(start,end,force){
    const key=`${start}|${end}`,cached=STATE.cache[key];
    if(!force&&cached&&Date.now()-cached.at<60000)return cached.data;
    if(STATE.pending[key])return STATE.pending[key];
    STATE.pending[key]=(async()=>{
      const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||'';
      const apiKey=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
      const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':apiKey,'x-session-token':token},body:JSON.stringify({action:'summary',start_date:start,end_date:end})});
      const raw=await res.text();let data={};try{data=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons rekap tidak valid.');}
      if(!res.ok||!data.success)throw new Error(data.message||data.error||'Gagal memuat rekap.');
      STATE.cache[key]={data,at:Date.now()};return data;
    })();
    try{return await STATE.pending[key]}finally{delete STATE.pending[key]}
  }
  function filterHtml(kind,filter){return `<div class="kpr-filter"><div class="kpr-field"><label>Dari tanggal</label><input type="date" id="kpr-start-${kind}" value="${esc(filter.start)}"></div><div class="kpr-field"><label>Sampai tanggal</label><input type="date" id="kpr-end-${kind}" value="${esc(filter.end)}"></div><button class="kpr-btn primary" id="kpr-apply-${kind}">Terapkan</button><div class="kpr-quick"><button data-kpr-range="today">Hari Ini</button><button data-kpr-range="month">Bulan Ini</button><button data-kpr-range="year">Tahun Ajaran</button></div></div>`}
  function bindFilter(kind,content){
    const start=document.getElementById(`kpr-start-${kind}`),end=document.getElementById(`kpr-end-${kind}`);
    document.getElementById(`kpr-apply-${kind}`)?.addEventListener('click',()=>{if(!start?.value||!end?.value)return;STATE.filters[kind]={start:start.value,end:end.value};render(kind,content,true)});
    content.querySelectorAll('[data-kpr-range]').forEach(btn=>btn.addEventListener('click',()=>{
      const mode=btn.getAttribute('data-kpr-range'),p=academicPeriod(),now=jakartaParts();let a=p.start,b=p.end;
      if(mode==='today'){a=now.iso;b=now.iso}else if(mode==='month'){a=`${now.year}-${String(now.month).padStart(2,'0')}-01`;b=now.iso}
      STATE.filters[kind]={start:a,end:b};render(kind,content,true);
    }));
  }
  function topCell(x,kind){if(!x)return '<span style="color:#9aa5a1">Belum ada</span>';return `<div class="kpr-topcell"><strong>${esc(x.student_name)}</strong><small>${fmt(x.count)} ${kind==='violation'?'kejadian':'reward'} · ${fmt(x.points)} poin</small></div>`}
  function pointRank(rows,kind){
    if(!rows||!rows.length)return '<div class="kpr-empty">Belum ada data pada periode ini.</div>';
    return `<div class="kpr-rank-list">${rows.map((x,i)=>`<div class="kpr-rank-row"><div class="kpr-rank-no">${i+1}</div><div><div class="kpr-rank-name">${esc(x.student_name)}</div><div class="kpr-rank-meta">${esc(x.class_name||'-')}</div></div><div class="kpr-rank-score"><b>${fmt(x.count)}</b><span>${kind==='violation'?'kejadian':'reward'} · ${fmt(x.points)} poin</span></div></div>`).join('')}</div>`;
  }
  function attendanceRank(rows,kind){
    if(!rows||!rows.length)return '<div class="kpr-empty">Belum ada data pada periode ini.</div>';
    return `<div class="kpr-rank-list">${rows.map((x,i)=>`<div class="kpr-rank-row"><div class="kpr-rank-no">${i+1}</div><div><div class="kpr-rank-name">${esc(x.student_name)}</div><div class="kpr-rank-meta">${esc(x.class_name||'-')}</div></div><div class="kpr-rank-score"><b>${fmt(x.count)}</b><span>${kind==='late'?'terlambat':`tidak hadir · S ${fmt(x.sakit)} · I ${fmt(x.izin)} · A ${fmt(x.alfa)}`}</span></div></div>`).join('')}</div>`;
  }
  function pointTable(rows,kind){
    const violation=kind==='violation';
    if(!rows||!rows.length)return '<div class="kpr-empty">Belum ada kelas aktif.</div>';
    return `<div class="kpr-table-wrap"><table class="kpr-table"><thead><tr><th>Kelas</th><th class="kpr-num">Jumlah Siswa</th><th class="kpr-num">Siswa Tercatat</th><th class="kpr-num">${violation?'Kejadian':'Reward'}</th><th class="kpr-num">Total Poin</th><th>${violation?'Pelanggaran Terbanyak':'Reward Terbanyak'}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.class_name)}</strong></td><td class="kpr-num">${fmt(r.total_students)}</td><td class="kpr-num">${fmt(violation?r.violation_students:r.reward_students)}</td><td class="kpr-num">${fmt(violation?r.violation_records:r.reward_records)}</td><td class="kpr-num">${fmt(violation?r.violation_points:r.reward_points)}</td><td>${topCell(violation?r.top_violation:r.top_reward,kind)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function attendanceTable(rows){
    if(!rows||!rows.length)return '<div class="kpr-empty">Belum ada kelas aktif.</div>';
    return `<div class="kpr-table-wrap"><table class="kpr-table"><thead><tr><th>Kelas</th><th class="kpr-num">Siswa</th><th class="kpr-num">Sesi</th><th class="kpr-num">Hadir</th><th class="kpr-num">Sakit</th><th class="kpr-num">Izin</th><th class="kpr-num">Alfa</th><th class="kpr-num">Terlambat</th><th class="kpr-num">Kehadiran</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.class_name)}</strong></td><td class="kpr-num">${fmt(r.total_students)}</td><td class="kpr-num">${fmt(r.sessions)}</td><td class="kpr-num">${fmt(r.hadir)}</td><td class="kpr-num">${fmt(r.sakit)}</td><td class="kpr-num">${fmt(r.izin)}</td><td class="kpr-num">${fmt(r.alfa)}</td><td class="kpr-num">${fmt(r.terlambat)}</td><td class="kpr-num"><strong>${pct(r.attendance_rate)}</strong></td></tr>`).join('')}</tbody></table></div>`;
  }
  function classRank(rows,kind){
    const violation=kind==='violation';
    const list=rows.slice().sort((a,b)=>(violation?b.violation_records-a.violation_records:b.reward_records-a.reward_records)).slice(0,3).map(r=>({student_name:r.class_name,class_name:`${fmt(r.total_students)} siswa`,count:violation?r.violation_records:r.reward_records,points:violation?r.violation_points:r.reward_points}));
    return pointRank(list,kind);
  }
  async function render(kind,content,force){
    injectStyles();const filter=defaultFilter(kind);
    const title=kind==='attendance'?'Rekap Kehadiran':kind==='violation'?'Rekap Kedisiplinan':'Rekap Reward Siswa';
    const sub=kind==='attendance'?'Rekap Morning Talk seluruh kelas. Pilih satu tanggal atau rentang tanggal.':'Khusus akun Kesiswaan · rekap seluruh kelas tanpa form input. Bisa ditarik per tanggal atau periode.';
    content.innerHTML=`<div class="kpr-wrap"><div class="kpr-head"><div><div class="kpr-title">${title}</div><div class="kpr-sub">${sub}</div></div><div class="kpr-actions"><button class="kpr-btn" id="kpr-refresh-${kind}">Muat Ulang</button></div></div>${filterHtml(kind,filter)}<div id="kpr-body-${kind}" class="kpr-loader"><span class="spinner"></span> Memuat rekap...</div></div>`;
    bindFilter(kind,content);document.getElementById(`kpr-refresh-${kind}`)?.addEventListener('click',()=>render(kind,content,true));
    const body=document.getElementById(`kpr-body-${kind}`);
    try{
      const d=await fetchRecap(filter.start,filter.end,!!force),label=dateLabel(d.range?.start||filter.start,d.range?.end||filter.end);
      body.className='';
      if(kind==='attendance'){
        const a=d.attendance||{},tot=a.totals||{},rows=a.classes||[];
        body.innerHTML=`<div class="kpr-wrap"><div><span class="kpr-pill">${esc(label)}</span></div><div class="kpr-stats"><div class="kpr-stat"><strong>${pct(tot.attendance_rate)}</strong><span>Tingkat kehadiran</span></div><div class="kpr-stat"><strong>${fmt(tot.hadir)}</strong><span>Hadir</span></div><div class="kpr-stat"><strong>${fmt(tot.sakit)}</strong><span>Sakit</span></div><div class="kpr-stat"><strong>${fmt(tot.izin)}</strong><span>Izin</span></div><div class="kpr-stat"><strong>${fmt(tot.alfa)}</strong><span>Alfa</span></div><div class="kpr-stat"><strong>${fmt(tot.terlambat)}</strong><span>Terlambat</span></div></div><div class="kpr-card"><div class="kpr-card-head"><b>Rekap Kehadiran per Kelas</b><span class="kpr-pill">${fmt(tot.sessions)} sesi kelas</span></div>${attendanceTable(rows)}</div><div class="kpr-rank"><div class="kpr-card"><div class="kpr-card-head"><b>Siswa Paling Sering Tidak Hadir</b><span class="kpr-pill">Top 10</span></div>${attendanceRank(a.top_absence||[],'absence')}</div><div class="kpr-card"><div class="kpr-card-head"><b>Siswa Paling Sering Terlambat</b><span class="kpr-pill">Top 10</span></div>${attendanceRank(a.top_late||[],'late')}</div></div></div>`;
      }else{
        const violation=kind==='violation',tot=d.totals||{},rows=d.classes||[],top=violation?(d.top_violations||[]):(d.top_rewards||[]),stat1=violation?tot.violation_students:tot.reward_students,stat2=violation?tot.violation_records:tot.reward_records,stat3=violation?tot.violation_points:tot.reward_points;
        body.innerHTML=`<div class="kpr-wrap"><div><span class="kpr-pill">${esc(label)}</span></div><div class="kpr-stats"><div class="kpr-stat"><strong>${fmt(stat1)}</strong><span>Siswa tercatat</span></div><div class="kpr-stat"><strong>${fmt(stat2)}</strong><span>${violation?'Total kejadian':'Total reward'}</span></div><div class="kpr-stat"><strong>${fmt(stat3)}</strong><span>Total poin</span></div><div class="kpr-stat"><strong>${fmt(tot.classes)}</strong><span>Kelas direkap</span></div></div><div class="kpr-card"><div class="kpr-card-head"><b>Rekap per Kelas</b><span class="kpr-pill">${fmt(tot.students)} siswa aktif</span></div>${pointTable(rows,kind)}</div><div class="kpr-rank"><div class="kpr-card"><div class="kpr-card-head"><b>${violation?'Siswa dengan Pelanggaran Terbanyak':'Siswa dengan Reward Terbanyak'}</b><span class="kpr-pill">Top 10</span></div>${pointRank(top,kind)}</div><div class="kpr-card"><div class="kpr-card-head"><b>${violation?'3 Kelas dengan Kejadian Terbanyak':'3 Kelas dengan Reward Terbanyak'}</b></div>${classRank(rows,kind)}</div></div></div>`;
      }
    }catch(e){body.className='kpr-error';body.textContent=e&&e.message?e.message:'Gagal memuat rekap.';}
  }
  function patch(){
    if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    const group=MODULE_GROUPS.find(g=>g&&g.id==='kesiswaan');if(!group||!Array.isArray(group.items))return false;
    [['absensi','attendance'],['kedisiplinan','violation'],['reward','reward']].forEach(([id,kind])=>{
      const item=group.items.find(x=>x&&x.id===id);if(!item||item.__kprPatched)return;
      const original=item.render;item.__kprPatched=true;item.__kprOriginalRender=original;
      item.render=function(content){if(isKesiswaan())return render(kind,content,false);return typeof original==='function'?original(content):null;};
    });
    return true;
  }
  if(!patch()){
    let n=0;const timer=setInterval(()=>{n++;if(patch()||n>40)clearInterval(timer)},250);
  }
})();
