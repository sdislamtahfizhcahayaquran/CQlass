/* CQlass — Timesheet gap assistant: show only unrecorded work slots */
(function(){
'use strict';
if(window.__cqTimesheetGapAssistant20261003V3)return;
window.__cqTimesheetGapAssistant20261003V3=true;
const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
const KEY=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
const EP={
  core:BASE+'/functions/v1/teacher-timesheet',
  work:BASE+'/functions/v1/teacher-work-schedule',
  recurring:BASE+'/functions/v1/teacher-recurring-schedule',
  special:BASE+'/functions/v1/teacher-timesheet-special-overlay'
};
const token=()=>typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'');
const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const mins=v=>{const s=String(v||'');if(!/^\d{2}:\d{2}/.test(s))return null;const a=s.slice(0,5).split(':').map(Number);return a[0]*60+a[1]};
const tm=n=>String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');
const fd=v=>{try{return new Intl.DateTimeFormat('id-ID',{weekday:'short',day:'2-digit',month:'short'}).format(new Date(v+'T00:00:00'))}catch{return v}};
const todayLocal=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
let G={key:'',loading:false,data:null,showAll:false};

function style(){
  if(document.getElementById('cq-ts-gap-css'))return;
  const s=document.createElement('style');s.id='cq-ts-gap-css';s.textContent=`
  .tsgap-card{border-left:3px solid #0b7e78!important}
  .tsgap-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
  .tsgap-title{font-size:15px;font-weight:900;color:#173d3b}
  .tsgap-count{display:inline-flex;align-items:center;height:24px;padding:0 9px;border-radius:999px;background:#fff3d9;color:#93610d;font-size:9px;font-weight:900}
  .tsgap-ok{background:#e9f6f4;color:#12645f}
  .tsgap-list{display:grid;gap:6px;margin-top:10px}
  .tsgap-row{display:grid;grid-template-columns:120px 110px minmax(160px,1fr) auto;gap:8px;align-items:center;padding:8px 9px;border:1px solid #e5eeec;border-radius:10px;background:#fbfdfd}
  .tsgap-date{font-size:10px;font-weight:900;color:#173d3b}.tsgap-time{font-size:10px;font-weight:900;color:#08746f}
  .tsgap-note{font-size:9px;color:#718481}.tsgap-actions{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end}.tsgap-btn{min-height:32px!important;height:32px!important;padding:0 10px!important;font-size:9px!important}
  .tsgap-more{margin-top:8px}
  @media(max-width:700px){.tsgap-row{grid-template-columns:1fr 1fr}.tsgap-note{grid-column:1/-1}.tsgap-actions{grid-column:1/-1;justify-content:stretch}.tsgap-actions .tsv2-btn{flex:1}}
  `;document.head.appendChild(s);
}
function ctx(){
  const root=document.querySelector('.tsv2');if(!root)return null;
  const month=root.querySelector('.tsv2-tools input[type="month"]')?.value||'';
  if(!/^\d{4}-\d{2}$/.test(month))return null;
  const teacherId=root.querySelector('.tsv2-tools select')?.value||'';
  return{root,month,teacherId,key:month+'|'+teacherId};
}
async function call(url,body){
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':token()},body:JSON.stringify(body)});
  const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw new Error(d.error||'timesheet_gap_failed');return d;
}
function dates(month){const[y,m]=month.split('-').map(Number),last=new Date(y,m,0).getDate(),out=[];for(let d=1;d<=last;d++)out.push(month+'-'+String(d).padStart(2,'0'));return out}
function merge(rows){
  const a=rows.map(x=>[mins(x.start_time),mins(x.end_time)]).filter(x=>x[0]!=null&&x[1]!=null&&x[1]>x[0]).sort((x,y)=>x[0]-y[0]),out=[];
  for(const x of a){const p=out[out.length-1];if(!p||x[0]>p[1])out.push([x[0],x[1]]);else p[1]=Math.max(p[1],x[1])}return out
}
function gaps(start,end,busy){
  const b=merge(busy),out=[];let cur=start;
  for(const[s,e]of b){if(e<=start||s>=end)continue;const a=Math.max(start,s),z=Math.min(end,e);if(a>cur&&a-cur>=15)out.push([cur,a]);cur=Math.max(cur,z)}
  if(end>cur&&end-cur>=15)out.push([cur,end]);return out
}
function specialDates(items){
  const set=new Set();(items||[]).forEach(x=>set.add(String(x.work_date||'')));return set
}
async function load(){
  const c=ctx();if(!c||G.loading)return;
  G.loading=true;G.key=c.key;
  try{
    const base={month:c.month,teacher_id:c.teacherId||undefined};
    const [core,work,rec,special]=await Promise.all([
      call(EP.core,{action:'bootstrap',...base}),
      call(EP.work,base),
      call(EP.recurring,{action:'bootstrap',...base}),
      call(EP.special,base)
    ]);
    const spSet=specialDates(special.items);
    const all=[];
    const today=todayLocal();
    for(const date of dates(c.month)){if(c.month===today.slice(0,7)&&date>today)continue;
      const day=new Date(date+'T12:00:00Z').getUTCDay();if(day===0)continue;
      const busy=[];
      const isSpecial=spSet.has(date);
      const grades=(work.grades||[]).map(Number).filter(Boolean);
      const hasUpper=grades.some(g=>g>=4);
      const hasLower=grades.some(g=>g<=3);
      // Fallback rutinitas inti sekolah. Ini sengaja hanya menjadi blocker,
      // tidak tampil sebagai baris Timesheet dan mencegah jeda palsu.
      if(day>=1&&day<=4){
        busy.push({start_time:'07:00:00',end_time:'08:00:00',_fallback:'morning-routine'});
        busy.push({start_time:'11:50:00',end_time:'13:10:00',_fallback:'ishoma-literasi'});
        // Snack 09.40–10.10 sekarang dibaca dari backend berdasarkan kelas: seluruh Banin + seluruh kelas 1.
      }
      if(day===5){
        // Gunakan blocker Jumat resmi dari backend bila tersedia agar level 4–6
        // tidak pernah salah terbaca kosong mulai 10.40.
        busy.push({start_time:'07:00:00',end_time:'08:00:00',_fallback:'friday-morning'});
        const fridayBlock=(work.items||[]).find(x=>x.work_date===date&&x.activity_code==='friday_activity'&&x.start_time&&x.end_time);
        if(fridayBlock)busy.push(fridayBlock);
        else busy.push({start_time:'08:00:00',end_time:hasUpper?'12:30:00':'10:40:00',_fallback:'friday-routine'});
      }
      if(isSpecial){
        (special.items||[]).filter(x=>x.work_date===date).forEach(x=>busy.push(x));
      }else{
        (work.items||[]).filter(x=>x.work_date===date).forEach(x=>busy.push(x));
        (core.teaching||[]).filter(x=>x.work_date===date&&x.source!=='digantikan').forEach(x=>busy.push(x));
        if(day===6)(core.saturdays||[]).filter(x=>x.event_date===date&&x.configured!==false).forEach(x=>busy.push({start_time:x.start_time,end_time:x.end_time}));
      }
      (core.activities||[]).filter(x=>x.work_date===date).forEach(x=>busy.push(x));
      (rec.items||[]).filter(x=>x.work_date===date).forEach(x=>busy.push(x));
      if(day===6){
        const hasSaturdayAgenda=(core.saturdays||[]).some(x=>x.event_date===date&&x.configured!==false&&x.start_time&&x.end_time);
        if(!hasSaturdayAgenda)continue;
      }
      const ws=day===6?450:420,we=day===6?720:960;
      for(const g of gaps(ws,we,busy))all.push({work_date:date,start_time:tm(g[0]),end_time:tm(g[1]),minutes:g[1]-g[0],special:isSpecial});
    }
    G.data={items:all,profile:work.profile||null};render();
  }catch(e){console.warn('Timesheet gap assistant',e);G.data={items:[],error:true};render()}
  finally{G.loading=false}
}
function lockInputs(){
  const form=document.querySelector('.tsv2-form');if(form){['tsv2-date','tsv2-start','tsv2-end'].forEach(id=>{const el=document.getElementById(id);if(el){el.readOnly=true;el.setAttribute('aria-readonly','true')}})}
  const rs=document.getElementById('cqrec-start'),re=document.getElementById('cqrec-end');if(rs){rs.readOnly=true;rs.setAttribute('aria-readonly','true')}if(re){re.readOnly=true;re.setAttribute('aria-readonly','true')}
}
function pick(d,s,e){
  const a=document.getElementById('tsv2-date'),b=document.getElementById('tsv2-start'),c=document.getElementById('tsv2-end'),form=document.querySelector('.tsv2-form'),card=document.querySelector('.tsv2-slot-editor');
  if(a)a.value=d;if(b)b.value=s;if(c)c.value=e;if(form)form.dataset.gapSelected='1';if(card)card.hidden=false;lockInputs();
  card?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('tsv2-act')?.focus();
}
function patternPick(d,s,e){
  const rs=document.getElementById('cqrec-start'),re=document.getElementById('cqrec-end');
  if(typeof window.cqRecurringReveal==='function')window.cqRecurringReveal();
  if(!rs||!re){const rec=document.querySelector('.cqrec-card');rec?.scrollIntoView({behavior:'smooth',block:'center'});return}
  rs.value=s;re.value=e;const rec=document.querySelector('.cqrec-card');if(rec)rec.dataset.gapPatternSelected='1';const day=new Date(d+'T12:00:00Z').getUTCDay();document.querySelectorAll('input[name="cqrec-day"]').forEach(x=>x.checked=Number(x.value)===day);
  lockInputs();document.querySelector('.cqrec-card')?.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('cqrec-name')?.focus();
}
function render(){
  const c=ctx();if(!c||!G.data)return;style();
  const host=c.root.querySelector('#tsv2-gap-host')||c.root.querySelector('#tsv2-body');if(!host)return;
  let card=c.root.querySelector('.tsgap-card');if(!card){card=document.createElement('div');card.className='tsv2-card tsgap-card';host.appendChild(card)}
  const xs=G.data.items||[],show=G.showAll?xs:xs.slice(0,18);
  card.innerHTML=`${G.data.error?'<div class="tsv2-help" style="margin-bottom:8px">Daftar waktu belum tercatat belum dapat dimuat. Tekan Muat ulang.</div>':''}<div class="tsgap-head"><div><div class="tsgap-title">Slot yang Perlu Diisi</div><div class="tsv2-help">Yang tampil hanya waktu kerja yang benar-benar belum punya kegiatan. Mengajar, briefing, penyambutan, istirahat, Ishoma, kegiatan Jumat, UKS, agenda Sabtu HRD, dan pola berulang tidak ditampilkan sebagai slot kosong.</div></div><span class="tsgap-count ${xs.length?'':'tsgap-ok'}">${xs.length?xs.length+' slot belum tercatat':'Semua slot tercatat ✓'}</span></div>${xs.length?`<div class="tsgap-list">${show.map(x=>`<div class="tsgap-row"><div class="tsgap-date">${esc(fd(x.work_date))}</div><div class="tsgap-time">${esc(x.start_time)}–${esc(x.end_time)}</div><div class="tsgap-note">${x.special?'Hari/kegiatan khusus':'Pilih aktivitas untuk waktu ini'}</div><div class="tsgap-actions"><button class="tsv2-btn alt tsgap-btn" onclick="cqTsGapPick('${esc(x.work_date)}','${esc(x.start_time)}','${esc(x.end_time)}')">Isi Sekali</button><button class="tsv2-btn alt tsgap-btn" onclick="cqTsGapPatternPick('${esc(x.work_date)}','${esc(x.start_time)}','${esc(x.end_time)}')">Jadikan Pola</button></div></div>`).join('')}</div>${xs.length>18?`<button class="tsv2-btn alt tsgap-more" onclick="cqTsGapToggle()">${G.showAll?'Tampilkan ringkas':'Tampilkan semua ('+xs.length+')'}</button>`:''}`:''}`;
}
window.cqTsGapPick=pick;
window.cqTsGapPatternPick=patternPick;
window.cqTsGapToggle=()=>{G.showAll=!G.showAll;render()};
window.cqTsGapRefresh=()=>{G.key='';G.data=null;load()};
function ensure(){const c=ctx();if(!c)return;lockInputs();if(G.key!==c.key||!G.data){load();return}if(!c.root.querySelector('.tsgap-card'))render()}
let t=0;const mo=new MutationObserver(()=>{clearTimeout(t);t=setTimeout(ensure,350)});
function start(){style();mo.observe(document.body,{childList:true,subtree:true});setTimeout(ensure,700)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
