/* CQlass — Live Report Input PTS Tahfizh untuk Kabid Tahfizh */
(function(){
  'use strict';
  if(window.__CQ_TAHFIZH_INPUT_LIVE__) return;
  window.__CQ_TAHFIZH_INPUT_LIVE__=1;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/tahfizh-input-status';
  const REFRESH_MS=30000;
  let data=null,busy=false,lastLoad=0,filter='all';
  const E=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function role(){try{return String(currentUser?.role||'').toLowerCase().replace(/[\s-]+/g,'_')}catch(_){return''}}
  function isKabid(){const r=role();return r==='tahfizh'||r==='kabid_tahfizh'||(r.includes('kabid')&&(r.includes('tahfizh')||r.includes('quran')))}
  function token(){try{return getAuthToken()}catch(_){return localStorage.getItem('cqlass_session_token')||''}}
  async function api(){
    const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
    const res=await fetch(BASE,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()},body:JSON.stringify({})});
    const j=await res.json().catch(()=>({}));
    if(!res.ok||j.success===false) throw Error(j.error||'Gagal memuat live report Tahfizh');
    return j;
  }
  function css(){
    if(document.getElementById('ktd-live-css'))return;
    const s=document.createElement('style');s.id='ktd-live-css';s.textContent=`
      #ktd-live-input{margin-bottom:10px}
      .ktdl-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      .ktdl-title{font-size:14px;font-weight:900;color:#173b38}.ktdl-sub{font-size:9px;color:#71837f;margin-top:3px}
      .ktdl-refresh{border:1px solid #cfe1dc;background:#fff;border-radius:9px;padding:7px 10px;font-size:9px;font-weight:800;cursor:pointer;color:#08746f}
      .ktdl-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:10px 0}
      .ktdl-sum{border:1px solid #dceae6;background:#f8fbfa;border-radius:11px;padding:10px;text-align:left;cursor:pointer}
      .ktdl-sum.on{outline:2px solid #0b8b7e;outline-offset:-2px}.ktdl-sum b{display:block;font-size:18px}.ktdl-sum span{font-size:8px;color:#71837f}
      .ktdl-wrap{overflow:auto}.ktdl-table{width:100%;border-collapse:collapse;min-width:860px}.ktdl-table th,.ktdl-table td{padding:8px;border-bottom:1px solid #edf2f0;text-align:left;font-size:9px;vertical-align:top}
      .ktdl-teacher{font-weight:900;font-size:10px}.ktdl-class{color:#647b77;max-width:210px}.ktdl-progress{min-width:160px}.ktdl-bar{height:6px;background:#e7efed;border-radius:99px;overflow:hidden;margin-top:5px}.ktdl-bar i{display:block;height:100%;background:#0b8b7e;border-radius:99px}
      .ktdl-status{display:inline-block;border-radius:20px;padding:4px 8px;font-size:8px;font-weight:900;white-space:nowrap}.ktdl-done{background:#e5f7ef;color:#11704d}.ktdl-run{background:#fff3d9;color:#8b6200}.ktdl-none{background:#ffeaea;color:#a13737}
      .ktdl-missing{max-width:260px;color:#6c7f7c;line-height:1.45}.ktdl-time{white-space:nowrap;color:#647b77}
      @media(max-width:900px){.ktdl-summary{grid-template-columns:repeat(2,1fr)}}`;
    document.head.appendChild(s);
  }
  function fmtTime(v){
    if(!v)return '—';
    try{return new Intl.DateTimeFormat('id-ID',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}catch(_){return String(v)}
  }
  function statusLabel(s){return s==='selesai'?'Selesai':s==='sedang_input'?'Sedang Input':'Belum Mulai'}
  function statusClass(s){return s==='selesai'?'ktdl-done':s==='sedang_input'?'ktdl-run':'ktdl-none'}
  function currentRows(){
    const a=data?.teachers||[];
    return filter==='all'?a:a.filter(x=>x.status===filter);
  }
  function rowsHtml(){
    const a=currentRows();
    if(!a.length)return '<tr><td colspan="6">Tidak ada guru pada status ini.</td></tr>';
    return a.map(x=>{
      const miss=x.missing_students||[], shown=miss.slice(0,4), more=Math.max(0,miss.length-shown.length);
      return `<tr>
        <td><div class="ktdl-teacher">${E(x.teacher_name||'Tanpa Guru')}</div></td>
        <td class="ktdl-class">${E((x.classes||[]).join(', ')||'—')}</td>
        <td class="ktdl-progress"><b>${E(x.complete_students)} / ${E(x.total_students)} siswa lengkap</b><div class="ktdl-bar"><i style="width:${Math.max(0,Math.min(100,Number(x.progress_percent)||0))}%"></i></div><div style="margin-top:4px;color:#6f8581">${E(x.progress_percent||0)}%</div></td>
        <td><span class="ktdl-status ${statusClass(x.status)}">${statusLabel(x.status)}</span></td>
        <td class="ktdl-time">${fmtTime(x.last_update)}</td>
        <td class="ktdl-missing">${miss.length?E(shown.join(', '))+(more?` <b>+${more}</b>`:''):'—'}</td>
      </tr>`;
    }).join('');
  }
  function render(){
    if(!isKabid()||!data)return;
    const root=document.querySelector('#content .ktd');if(!root)return;
    css();
    let box=document.getElementById('ktd-live-input');
    if(!box){box=document.createElement('div');box.id='ktd-live-input';box.className='ktd-card';const anchor=root.querySelector('.ktd-stats')||root.querySelector('.ktd-hero');anchor?.insertAdjacentElement('afterend',box);if(!box.parentNode)root.prepend(box)}
    const s=data.summary||{};
    box.innerHTML=`<div class="ktdl-head"><div><div class="ktdl-title">Live Report Input PTS Tahfizh</div><div class="ktdl-sub">Kabid Qur’an · otomatis diperbarui setiap 30 detik · terakhir sinkron ${fmtTime(data.generated_at)}</div></div><button class="ktdl-refresh" onclick="ktdLiveRefresh()">↻ Perbarui</button></div>
      <div class="ktdl-summary">
        <button class="ktdl-sum ${filter==='all'?'on':''}" onclick="ktdLiveFilter('all')"><b>${E(s.teachers||0)}</b><span>Guru halaqah</span></button>
        <button class="ktdl-sum ${filter==='selesai'?'on':''}" onclick="ktdLiveFilter('selesai')"><b>${E(s.done||0)}</b><span>Selesai</span></button>
        <button class="ktdl-sum ${filter==='sedang_input'?'on':''}" onclick="ktdLiveFilter('sedang_input')"><b>${E(s.in_progress||0)}</b><span>Sedang input</span></button>
        <button class="ktdl-sum ${filter==='belum_mulai'?'on':''}" onclick="ktdLiveFilter('belum_mulai')"><b>${E(s.not_started||0)}</b><span>Belum mulai</span></button>
      </div>
      <div class="ktdl-wrap"><table class="ktdl-table"><thead><tr><th>Guru Halaqah</th><th>Kelas</th><th>Progres Input</th><th>Status</th><th>Update Terakhir</th><th>Siswa Belum Lengkap</th></tr></thead><tbody>${rowsHtml()}</tbody></table></div>`;
  }
  async function load(force=false){
    if(!isKabid()||busy)return;
    if(!force&&data&&Date.now()-lastLoad<REFRESH_MS)return render();
    busy=true;
    try{data=await api();lastLoad=Date.now();render()}catch(e){console.warn('Live report Tahfizh:',e)}finally{busy=false}
  }
  window.ktdLiveFilter=f=>{filter=String(f||'all');render()};
  window.ktdLiveRefresh=()=>load(true);

  function tick(){
    if(!isKabid())return;
    const hasDash=!!document.querySelector('#content .ktd');
    if(!hasDash)return;
    if(!data||Date.now()-lastLoad>=REFRESH_MS)load();else if(!document.getElementById('ktd-live-input'))render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(tick,700));else setTimeout(tick,700);
  setInterval(tick,2000);
})();
