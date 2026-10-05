/* CQlass — Timesheet Jumat & Sabtu fleksibel */
(function(){
'use strict';
if(window.__cqTimesheetFriSatFlex20261005)return;
window.__cqTimesheetFriSatFlex20261005=true;

const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
const KEY=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
const EP={
  core:BASE+'/functions/v1/teacher-timesheet',
  work:BASE+'/functions/v1/teacher-work-schedule',
  special:BASE+'/functions/v1/teacher-timesheet-special-overlay'
};
const tok=()=>typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'');
const E=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const T=v=>String(v??'').trim();
const mins=v=>{const s=T(v);if(!/^\d{2}:\d{2}/.test(s))return null;const [h,m]=s.slice(0,5).split(':').map(Number);return h*60+m};
const dow=d=>new Date(d+'T12:00:00Z').getUTCDay();
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let X={key:'',loading:false,data:null};

async function call(url,body){
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':tok()},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw Error(d.error||'timesheet_flex_failed');return d
}
function context(){
  const root=document.querySelector('.tsv2');if(!root)return null;
  const month=root.querySelector('.tsv2-tools input[type="month"]')?.value||'';
  if(!/^\d{4}-\d{2}$/.test(month))return null;
  const teacherId=root.querySelector('.tsv2-tools select')?.value||'';
  return {root,month,teacherId,key:month+'|'+teacherId};
}
function dates(month){
  const [y,m]=month.split('-').map(Number),last=new Date(y,m,0).getDate(),out=[],td=today();
  for(let d=1;d<=last;d++){const x=month+'-'+String(d).padStart(2,'0');if(month===td.slice(0,7)&&x>td)continue;if([5,6].includes(dow(x)))out.push(x)}
  return out
}
function overlaps(a,b,c,d){return a<d&&b>c}
function busyFor(date){
  const z=X.data||{},rows=[];
  (z.work?.items||[]).filter(x=>x.work_date===date).forEach(x=>rows.push({s:x.start_time,e:x.end_time,t:x.activity||'Jadwal otomatis'}));
  (z.core?.teaching||[]).filter(x=>x.work_date===date&&x.source!=='digantikan').forEach(x=>rows.push({s:x.start_time,e:x.end_time,t:x.subject_name||'Mengajar'}));
  (z.core?.activities||[]).filter(x=>x.work_date===date).forEach(x=>rows.push({s:x.start_time,e:x.end_time,t:x.activity||'Aktivitas tersimpan'}));
  (z.special?.items||[]).filter(x=>x.work_date===date).forEach(x=>rows.push({s:x.start_time,e:x.end_time,t:x.activity_name||'Kegiatan khusus'}));
  if(dow(date)===6)(z.core?.saturdays||[]).filter(x=>x.event_date===date&&x.configured!==false).forEach(x=>rows.push({s:x.start_time,e:x.end_time,t:x.activity_name||'Agenda Sabtu'}));
  return rows.filter(x=>mins(x.s)!=null&&mins(x.e)!=null);
}
function style(){
  if(document.getElementById('cq-frisat-css'))return;
  const s=document.createElement('style');s.id='cq-frisat-css';s.textContent=`
  .cqfs-card{border-left:3px solid #2e6f9e!important;background:linear-gradient(180deg,#fff,#fbfdff)}
  .cqfs-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}
  .cqfs-title{font-size:15px;font-weight:900;color:#173d3b}.cqfs-pill{font-size:8px;font-weight:900;border-radius:999px;padding:5px 8px;background:#eaf3fb;color:#315f88}
  .cqfs-form{display:grid;grid-template-columns:1.1fr 95px 95px 1.4fr 1.4fr auto;gap:8px;align-items:end;margin-top:11px}
  .cqfs-field label{display:block;font-size:9px;font-weight:800;color:var(--muted);margin-bottom:4px}.cqfs-field .tsv2-in,.cqfs-field .tsv2-sel{width:100%;box-sizing:border-box}
  .cqfs-note{font-size:9px;color:#718481;margin-top:8px;line-height:1.5}.cqfs-status{font-size:9px;margin-top:7px}
  @media(max-width:900px){.cqfs-form{grid-template-columns:1fr 1fr}}@media(max-width:560px){.cqfs-form{grid-template-columns:1fr}}
  `;document.head.appendChild(s)
}
function render(){
  const c=context();if(!c||!X.data)return;style();
  const host=c.root.querySelector('#tsv2-gap-host');if(!host)return;
  let card=host.querySelector('.cqfs-card');if(!card){card=document.createElement('div');card.className='tsv2-card cqfs-card';host.prepend(card)}
  const ds=dates(c.month),opts=ds.map(d=>`<option value="${E(d)}">${E(d)} — ${dow(d)===5?'Jumat':'Sabtu'}</option>`).join('');
  const master=X.data.core?.activity_master||[];
  card.innerHTML=`<div class="cqfs-head"><div><div class="cqfs-title">Jumat & Sabtu — Aktivitas Fleksibel</div><div class="tsv2-help">Untuk kegiatan nyata di luar jadwal otomatis. Guru menentukan jam sendiri; sistem menolak waktu yang bertabrakan dengan jadwal otomatis/agenda Sabtu yang sudah tercatat.</div></div><span class="cqfs-pill">Jam diisi sendiri</span></div>
  <div class="cqfs-form">
    <div class="cqfs-field"><label>Tanggal Jumat/Sabtu</label><select id="cqfs-date" class="tsv2-sel"><option value="">Pilih tanggal</option>${opts}</select></div>
    <div class="cqfs-field"><label>Mulai</label><input id="cqfs-start" class="tsv2-in" type="time"></div>
    <div class="cqfs-field"><label>Selesai</label><input id="cqfs-end" class="tsv2-in" type="time"></div>
    <div class="cqfs-field"><label>Kegiatan</label><select id="cqfs-act" class="tsv2-sel"><option value="">Pilih kegiatan</option>${master.map(x=>`<option value="${E(x.id)}">${E(x.name)}</option>`).join('')}</select></div>
    <div class="cqfs-field"><label>Catatan (opsional)</label><input id="cqfs-note" class="tsv2-in" placeholder="Contoh: rapat tim / administrasi"></div>
    <button id="cqfs-save" class="tsv2-btn" onclick="cqFriSatSave()">Simpan</button>
  </div>
  <div id="cqfs-status" class="cqfs-status"></div>
  <div class="cqfs-note"><b>Jumat:</b> kegiatan wajib tetap otomatis; isi hanya waktu setelah/di luar kegiatan tersebut. <b>Sabtu:</b> jika HRD sudah membuat agenda, agenda itu tetap otomatis; guru hanya mengisi kegiatan lain yang benar-benar dikerjakan.</div>`
}
async function load(){
  const c=context();if(!c||X.loading)return;X.loading=true;X.key=c.key;
  try{
    const base={month:c.month,teacher_id:c.teacherId||undefined};
    const [core,work,special]=await Promise.all([
      call(EP.core,{action:'bootstrap',...base}),
      call(EP.work,base),
      call(EP.special,base)
    ]);
    X.data={core,work,special};render()
  }catch(e){console.warn('FriSat flex',e)}
  finally{X.loading=false}
}
async function save(){
  const date=T(document.getElementById('cqfs-date')?.value),start=T(document.getElementById('cqfs-start')?.value),end=T(document.getElementById('cqfs-end')?.value),mid=T(document.getElementById('cqfs-act')?.value),note=T(document.getElementById('cqfs-note')?.value),st=document.getElementById('cqfs-status'),btn=document.getElementById('cqfs-save');
  const sm=mins(start),em=mins(end);
  if(!date||![5,6].includes(dow(date))||sm==null||em==null||em<=sm||!mid){if(st)st.innerHTML='<span style="color:#b42318">Lengkapi tanggal Jumat/Sabtu, jam, dan kegiatan.</span>';return}
  const hit=busyFor(date).find(x=>overlaps(sm,em,mins(x.s),mins(x.e)));
  if(hit){if(st)st.innerHTML='<span style="color:#b42318">Jam bertabrakan dengan '+E(hit.t)+' ('+E(T(hit.s).slice(0,5))+'–'+E(T(hit.e).slice(0,5))+'). Pilih jam lain.</span>';return}
  if(btn)btn.disabled=true;if(st)st.textContent='Menyimpan...';
  try{
    const c=context();await call(EP.core,{action:'save_activity',month:c?.month,teacher_id:c?.teacherId||undefined,work_date:date,start_time:start,end_time:end,activity_master_id:mid,note});
    if(st)st.innerHTML='<span style="color:#08746f;font-weight:800">Aktivitas tersimpan.</span>';
    setTimeout(()=>{if(typeof window.tsv2Reload==='function')window.tsv2Reload();else {X.key='';X.data=null;load()}},350)
  }catch(e){if(st)st.innerHTML='<span style="color:#b42318">'+E(e.message)+'</span>';if(btn)btn.disabled=false}
}
window.cqFriSatSave=save;
window.cqFriSatRefresh=()=>{X.key='';X.data=null;load()};
function ensure(){const c=context();if(!c)return;if(X.key!==c.key||!X.data){load();return}if(!c.root.querySelector('.cqfs-card'))render()}
let t=0;const mo=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(ensure,350)});
function start(){style();mo.observe(document.body,{childList:true,subtree:true});setTimeout(ensure,850)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();