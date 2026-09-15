(function(){
  'use strict';

  const ENDPOINT=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/kesiswaan-point-recap';
  const STATE={data:null,loadedAt:0,promise:null};

  function esc(v){
    if(typeof escapeHtml==='function')return escapeHtml(v);
    return String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }
  function isKesiswaan(){
    const r=String((typeof currentUser!=='undefined'&&currentUser&&currentUser.role)||'').toLowerCase();
    return r.includes('kesiswaan');
  }
  function injectStyles(){
    if(document.getElementById('kpr-styles'))return;
    const s=document.createElement('style');s.id='kpr-styles';s.textContent=`
      .kpr-wrap{display:grid;gap:18px}.kpr-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap}.kpr-title{font-size:24px;font-weight:800;color:#18322d}.kpr-sub{margin-top:5px;color:#66756f;font-size:13px}.kpr-btn{border:1px solid #d6e3df;background:#fff;border-radius:10px;padding:9px 13px;font-weight:700;cursor:pointer;color:#24574d}.kpr-btn:hover{background:#f4faf8}.kpr-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.kpr-stat{background:#fff;border:1px solid #e4ece9;border-radius:16px;padding:16px;box-shadow:0 6px 18px rgba(31,70,61,.05)}.kpr-stat strong{display:block;font-size:27px;line-height:1.1;color:#173e36}.kpr-stat span{display:block;margin-top:6px;font-size:12px;color:#73817c}.kpr-card{background:#fff;border:1px solid #e4ece9;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(31,70,61,.04)}.kpr-card-head{padding:15px 17px;border-bottom:1px solid #edf2f0;display:flex;align-items:center;justify-content:space-between;gap:12px}.kpr-card-head b{font-size:15px;color:#23463f}.kpr-table-wrap{overflow:auto}.kpr-table{width:100%;border-collapse:collapse;min-width:760px}.kpr-table th,.kpr-table td{padding:12px 13px;border-bottom:1px solid #edf2f0;text-align:left;font-size:12px;vertical-align:top}.kpr-table th{background:#f7faf9;color:#60706a;font-size:11px;text-transform:uppercase;letter-spacing:.03em;white-space:nowrap}.kpr-table td strong{color:#203f39}.kpr-num{text-align:right!important;font-variant-numeric:tabular-nums}.kpr-rank{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.kpr-rank-list{padding:5px 15px 13px}.kpr-rank-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:10px;padding:11px 0;border-bottom:1px solid #edf2f0}.kpr-rank-row:last-child{border-bottom:0}.kpr-rank-no{width:28px;height:28px;border-radius:9px;background:#eef6f3;display:flex;align-items:center;justify-content:center;font-weight:800;color:#2b6559}.kpr-rank-name{font-size:13px;font-weight:800;color:#203f39}.kpr-rank-meta{font-size:11px;color:#7b8884;margin-top:2px}.kpr-rank-score{text-align:right}.kpr-rank-score b{display:block;font-size:14px;color:#23463f}.kpr-rank-score span{font-size:10px;color:#7b8884}.kpr-empty{padding:28px;text-align:center;color:#7a8783;font-size:13px}.kpr-pill{display:inline-flex;align-items:center;border-radius:999px;padding:4px 8px;background:#eef6f3;color:#2b6559;font-size:10px;font-weight:800}.kpr-error{padding:18px;border-radius:14px;background:#fff3f3;color:#a23e3e;border:1px solid #f0cdcd}.kpr-loader{padding:28px;text-align:center;color:#687772}.kpr-topcell{max-width:200px}.kpr-topcell small{display:block;color:#8a9692;margin-top:2px}
      @media(max-width:900px){.kpr-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.kpr-rank{grid-template-columns:1fr}}
      @media(max-width:560px){.kpr-stats{grid-template-columns:1fr 1fr}.kpr-stat{padding:13px}.kpr-stat strong{font-size:23px}.kpr-title{font-size:21px}}
    `;document.head.appendChild(s);
  }
  async function fetchRecap(force){
    const now=Date.now();
    if(!force&&STATE.data&&now-STATE.loadedAt<60000)return STATE.data;
    if(STATE.promise)return STATE.promise;
    STATE.promise=(async()=>{
      const token=typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')||'';
      const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
      const res=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'x-session-token':token},body:JSON.stringify({action:'summary'})});
      const raw=await res.text();let data={};try{data=raw?JSON.parse(raw):{}}catch(_){throw new Error('Respons rekap tidak valid.');}
      if(!res.ok||!data.success)throw new Error(data.message||data.error||'Gagal memuat rekap.');
      STATE.data=data;STATE.loadedAt=Date.now();return data;
    })();
    try{return await STATE.promise}finally{STATE.promise=null}
  }
  function fmt(n){return Number(n||0).toLocaleString('id-ID')}
  function topCell(x,kind){if(!x)return '<span style="color:#9aa5a1">Belum ada</span>';return `<div class="kpr-topcell"><strong>${esc(x.student_name)}</strong><small>${fmt(x.count)} ${kind==='violation'?'kejadian':'reward'} · ${fmt(x.points)} poin</small></div>`}
  function rankList(rows,kind){
    if(!rows||!rows.length)return '<div class="kpr-empty">Belum ada data.</div>';
    return `<div class="kpr-rank-list">${rows.map((x,i)=>`<div class="kpr-rank-row"><div class="kpr-rank-no">${i+1}</div><div><div class="kpr-rank-name">${esc(x.student_name)}</div><div class="kpr-rank-meta">${esc(x.class_name||'-')}</div></div><div class="kpr-rank-score"><b>${fmt(x.count)}</b><span>${kind==='violation'?'kejadian':'reward'} · ${fmt(x.points)} poin</span></div></div>`).join('')}</div>`;
  }
  function renderTable(rows,kind){
    const violation=kind==='violation';
    if(!rows||!rows.length)return '<div class="kpr-empty">Belum ada kelas aktif.</div>';
    return `<div class="kpr-table-wrap"><table class="kpr-table"><thead><tr><th>Kelas</th><th class="kpr-num">Jumlah Siswa</th><th class="kpr-num">Siswa Tercatat</th><th class="kpr-num">${violation?'Kejadian':'Reward'}</th><th class="kpr-num">Total Poin</th><th>${violation?'Pelanggaran Terbanyak':'Reward Terbanyak'}</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${esc(r.class_name)}</strong></td><td class="kpr-num">${fmt(r.total_students)}</td><td class="kpr-num">${fmt(violation?r.violation_students:r.reward_students)}</td><td class="kpr-num">${fmt(violation?r.violation_records:r.reward_records)}</td><td class="kpr-num">${fmt(violation?r.violation_points:r.reward_points)}</td><td>${topCell(violation?r.top_violation:r.top_reward,kind)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  async function render(kind,content,force){
    injectStyles();
    const violation=kind==='violation';
    content.innerHTML=`<div class="kpr-wrap"><div class="kpr-head"><div><div class="kpr-title">${violation?'Rekap Kedisiplinan':'Rekap Reward Siswa'}</div><div class="kpr-sub">Khusus akun Kesiswaan · rekap seluruh kelas, tanpa form input wali kelas.</div></div><button class="kpr-btn" id="kpr-refresh">Muat Ulang</button></div><div id="kpr-body" class="kpr-loader"><span class="spinner"></span> Memuat rekap...</div></div>`;
    document.getElementById('kpr-refresh')?.addEventListener('click',()=>render(kind,content,true));
    const body=document.getElementById('kpr-body');
    try{
      const d=await fetchRecap(!!force),tot=d.totals||{},rows=d.classes||[],top=violation?(d.top_violations||[]):(d.top_rewards||[]);
      const stat1=violation?tot.violation_students:tot.reward_students,stat2=violation?tot.violation_records:tot.reward_records,stat3=violation?tot.violation_points:tot.reward_points;
      body.className='';
      body.innerHTML=`<div class="kpr-wrap"><div><span class="kpr-pill">Tahun Ajaran ${esc(d.period?.label||'-')}</span></div><div class="kpr-stats"><div class="kpr-stat"><strong>${fmt(stat1)}</strong><span>Siswa tercatat</span></div><div class="kpr-stat"><strong>${fmt(stat2)}</strong><span>${violation?'Total kejadian':'Total reward'}</span></div><div class="kpr-stat"><strong>${fmt(stat3)}</strong><span>Total poin</span></div><div class="kpr-stat"><strong>${fmt(tot.classes)}</strong><span>Kelas direkap</span></div></div><div class="kpr-card"><div class="kpr-card-head"><b>Rekap per Kelas</b><span class="kpr-pill">${fmt(tot.students)} siswa aktif</span></div>${renderTable(rows,kind)}</div><div class="kpr-rank"><div class="kpr-card"><div class="kpr-card-head"><b>${violation?'Siswa dengan Pelanggaran Terbanyak':'Siswa dengan Reward Terbanyak'}</b><span class="kpr-pill">Top 10</span></div>${rankList(top,kind)}</div><div class="kpr-card"><div class="kpr-card-head"><b>${violation?'3 Kelas dengan Kejadian Terbanyak':'3 Kelas dengan Reward Terbanyak'}</b></div>${rankList(rows.slice().sort((a,b)=>(violation?b.violation_records-a.violation_records:b.reward_records-a.reward_records)).slice(0,3).map(r=>({student_name:r.class_name,class_name:`${fmt(r.total_students)} siswa`,count:violation?r.violation_records:r.reward_records,points:violation?r.violation_points:r.reward_points})),kind)}</div></div></div>`;
    }catch(e){body.className='kpr-error';body.textContent=e&&e.message?e.message:'Gagal memuat rekap.';}
  }
  function patch(){
    if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    const group=MODULE_GROUPS.find(g=>g&&g.id==='kesiswaan');if(!group||!Array.isArray(group.items))return false;
    [['kedisiplinan','violation'],['reward','reward']].forEach(([id,kind])=>{
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
