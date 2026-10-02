/* CQlass — REKAPAN Kabid Kesiswaan
   Isolated/read-only. Does not alter any other role or input workflow. */
(function(){
  'use strict';
  if(window.__cqKesiswaanRekapanV2)return;
  window.__cqKesiswaanRekapanV2=true;

  const MODULE_ID='kesiswaan-rekapan';
  const GROUP_ID='kesiswaan-rekapan-group';
  const API=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/student-affairs-center';
  const WALAS={
    '03985f8c-bec2-4d14-b64f-da1452bd5857':'Adek Afrisilia, S.Hum.',
    '3227ac78-8c2f-4b41-a33e-8a9feadedb2f':'Muhammad Ilham, M.Pd.',
    '0954658b-1145-47c7-80e2-72a0266c6dd4':'Desyifa Fauziah, S.Kom.',
    '74fcd604-75a4-432b-8a78-ab7a2c68d9fa':'Dimas Hudda Satriani, S.Pd.',
    'd9c1b839-1141-40c1-beab-56f7bd46aa30':'Mulya Widianti, S.Hum',
    '23a912da-5497-4b58-b079-425d09f77371':'Hafizh Maulana S., S.Sos',
    '29ee5d4b-0c58-4f36-971e-e59bec30a088':'Devita Irmayani, S.Pd.',
    '177e4442-72e0-4f26-a0b3-4ce194731523':'M. Faris Aufarinsan, Lc',
    '4ab7c126-94fe-44e3-8fae-1b22d2735d18':'Karina Vega Irawan, S.Pd.',
    '8db93779-b0c1-47d6-a67e-f8632d93d4b6':'Yazid Abdurrohman, S.Pd.',
    'd4dd18d2-1582-4c0a-8354-10e2b7e9ce60':'Najwa Azka Khairani, S.Pd.',
    '31c7c96f-c0f2-49a8-95ab-6bba7e8e6acf':'Faaruq Ibrahim, S.Pd.',
    'd6d00d82-3c49-41b5-976f-27b8398f8b2a':'Dianita Priliasari, S.Pd.',
    '0e91ad73-707c-454f-81c1-b15b77356a31':'M. Luthfi Taufiqurrahman, S.H',
    '02e8083c-eb84-4ead-95c0-4fa20c35969a':'Salma Khoirunisa, S.Pd.',
    '2739e845-671e-4d6b-bc7d-9c346551a548':'Arif Hidayat',
    'ab5dcf6d-fa2a-4b4a-8a98-48c0fb0992d1':'Aghista Putri Amelia, S.Pd.',
    '2bd4fe85-c28e-452f-988b-7b339d53bf64':'Ahmad Naufal Ekasukma, S.Ag.',
    'f962edc7-f012-4914-9675-0a89738a94bf':'Zeni Hardiyanita, S.Pd.',
    'a654db89-312e-480b-9acc-6068fc2cdfe2':"Muhammad Sa'ad Salim, S.Sos.",
    '2272ba1a-9a4e-447a-9996-8a4232b4d792':'Dila Nur Azizah, S.Pd.',
    '4fa0f6ad-e5b2-4a13-bf64-fd798c8e4da5':'Abdurrokhman, M.Pd.'
  };
  const S={from:'',to:'',data:null,selected:null};

  const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const N=v=>String(v??'').trim().toLowerCase().replace(/[\s.,]/g,'');
  function role(){
    try{return String(currentUser?.role||currentUser?.primary_role||currentUser?.role_code||'').trim().toLowerCase().replace(/[\s-]+/g,'_')}
    catch(_){return''}
  }
  function isKesiswaan(){const r=role();return r==='kesiswaan'||r==='kabid_kesiswaan'}
  function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}}
  function today(){try{return typeof jakartaTodayISO==='function'?jakartaTodayISO():new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}catch(_){return new Date().toISOString().slice(0,10)}}
  async function post(body){
    const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
    const r=await fetch(API,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()},body:JSON.stringify(body)});
    const raw=await r.text();let d={};try{d=raw?JSON.parse(raw):{}}catch(_){throw Error('Respons server tidak valid.')}
    if(!r.ok||d.success===false)throw Error(d.message||d.error||'Gagal memuat data.');
    return d;
  }
  function css(){
    if(document.getElementById('cq-kesiswaan-rekapan-css-v2'))return;
    const s=document.createElement('style');s.id='cq-kesiswaan-rekapan-css-v2';s.textContent=`
      .krek{max-width:1380px;margin:0 auto;color:#18334d}.krek *{box-sizing:border-box}
      .krek h1{font-size:24px;margin:0}.krek-sub{font-size:12px;color:#6b7f91;margin:5px 0 14px}
      .krek-filter{display:flex;align-items:end;gap:10px;flex-wrap:wrap;background:#fff;border:1px solid #dfe7ef;border-radius:14px;padding:12px;margin-bottom:12px}
      .krek-field{display:flex;flex-direction:column;gap:5px}.krek-field label{font-size:10px;font-weight:900;color:#607488;text-transform:uppercase}.krek-field input{border:1px solid #d8e3ed;border-radius:9px;padding:9px 10px;font:inherit}
      .krek-btn{border:0;border-radius:9px;padding:9px 13px;background:#173e69;color:#fff;font-weight:800;cursor:pointer}
      .krek-card{background:#fff;border:1px solid #dfe7ef;border-radius:14px;overflow:hidden}.krek-wrap,.krek-modal .krek-wrap{overflow:auto}
      .krek table,.krek-modal table{width:100%;border-collapse:collapse;table-layout:fixed;background:#fff;border:1px solid #d9e2ea}
      .krek table{min-width:1000px}.krek-modal table{min-width:720px}
      .krek th,.krek td,.krek-modal th,.krek-modal td{border:1px solid #d9e2ea;padding:6px 8px;font-size:10px;line-height:1.35;vertical-align:middle}
      .krek th,.krek-modal th{background:#f5f7fa;color:#44576b;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.02em;text-align:center;white-space:nowrap;position:sticky;top:0;z-index:1}
      .krek td,.krek-modal td{color:#18334d}.krek tbody tr:nth-child(even),.krek-modal tbody tr:nth-child(even){background:#fbfcfd}.krek tbody tr:hover,.krek-modal tbody tr:hover{background:#f3f8fc}
      .krek-modal th:nth-child(1),.krek-modal td:nth-child(1){width:48px;text-align:center}
      .krek-modal th:nth-child(2),.krek-modal td:nth-child(2){width:320px;text-align:left}
      .krek-modal th:nth-child(3),.krek-modal td:nth-child(3),.krek-modal th:nth-child(4),.krek-modal td:nth-child(4),.krek-modal th:nth-child(5),.krek-modal td:nth-child(5){width:118px;text-align:center}
      .krek-modal td:nth-child(2) b{font-size:10.5px;font-weight:700}
      .krek-modal .krek-count{font-size:10px;line-height:1;font-weight:800;min-width:24px;text-align:center}
      .krek-status{display:inline-flex;align-items:center;padding:5px 8px;border-radius:999px;font-size:9px;font-weight:900;white-space:nowrap}.krek-status.done{background:#def4e8;color:#236d47}.krek-status.pending{background:#ffe6e8;color:#9b2f38}.krek-status.na{background:#edf1f4;color:#6b7782}
      .krek-detail{border:1px solid #cfdae6;background:#fff;border-radius:8px;padding:6px 9px;font-size:10px;font-weight:800;color:#24557f;cursor:pointer}
      .krek-count,.krek-modal .krek-count{border:0;background:transparent;color:#24557f;font-size:10px;font-weight:800;text-decoration:underline;text-underline-offset:2px;cursor:pointer;padding:2px 4px}
      .krek-empty,.krek-loading{padding:34px;text-align:center;color:#718294}.krek-error{padding:14px;color:#9b2730;background:#fff0f1;border:1px solid #f2c8cc;border-radius:12px}
      .krek-modal{position:fixed;inset:0;background:rgba(18,37,54,.48);z-index:99999;display:none;align-items:center;justify-content:center;padding:18px}.krek-modal.open{display:flex}
      .krek-box{width:min(900px,96vw);max-height:88vh;overflow:auto;background:#fff;border-radius:16px;box-shadow:0 24px 70px rgba(0,0,0,.22);font-size:10px;color:#18334d}
      .krek-boxhead{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px 18px;border-bottom:1px solid #e5ebf0;position:sticky;top:0;background:#fff;z-index:2}.krek-boxhead h2{font-size:17px;margin:0}.krek-boxhead p{font-size:10px;color:#718294;margin:3px 0 0}.krek-close{border:0;background:#eef3f7;width:32px;height:32px;border-radius:50%;font-size:20px;cursor:pointer}.krek-boxbody{padding:14px 18px 18px}
      .krek-break{display:grid;gap:7px}.krek-breakrow{display:flex;justify-content:space-between;gap:15px;padding:8px 10px;background:#f7f9fc;border-radius:9px;font-size:11px}.krek-breakrow b{font-weight:900}
      @media(max-width:700px){.krek-filter{display:grid;grid-template-columns:1fr 1fr}.krek-btn{grid-column:1/-1}.krek-box{width:100%;max-height:92vh}}
    `;
    document.head.appendChild(s);
  }
  function status(kind,count,grade,walas,uksRows){
    if(kind==='uks'){
      if(!(grade>=1&&grade<=3))return '<span class="krek-status na">—</span>';
      const hit=(uksRows||[]).some(x=>N(x.teacher_name)===N(walas));
      return hit?'<span class="krek-status done">Sudah</span>':'<span class="krek-status pending">Belum</span>';
    }
    return Number(count)>0?'<span class="krek-status done">Sudah</span>':'<span class="krek-status pending">Belum</span>';
  }
  function classRows(){
    const d=S.data||{},classes=d.classes||[],roster=d.roster||[],att=d.attendance||[],rw=d.rewards||[],vi=d.violations||[],uks=d.uks||[];
    return classes.map(c=>{
      const cid=String(c.id),students=roster.filter(x=>String(x.class_id)===cid),a=att.filter(x=>String(x.class_id)===cid),r=rw.filter(x=>String(x.class_id)===cid),v=vi.filter(x=>String(x.class_id)===cid);
      return{...c,walas:WALAS[cid]||'Belum ditetapkan',students,a,r,v,uks};
    }).sort((a,b)=>Number(a.grade_level)-Number(b.grade_level)||String(a.name).localeCompare(String(b.name),'id',{numeric:true}));
  }
  function renderTable(){
    const body=document.getElementById('krek-body');if(!body)return;
    const rows=classRows();
    body.innerHTML=rows.length?`<div class="krek-card"><div class="krek-wrap"><table><thead><tr><th>No.</th><th>Kelas</th><th>Nama Walas</th><th>Kehadiran</th><th>Kedisiplinan</th><th>Reward</th><th>UKS</th><th>Detail</th></tr></thead><tbody>${rows.map((x,i)=>`<tr><td>${i+1}</td><td><b>${E(x.name)}</b></td><td>${E(x.walas)}</td><td>${status('attendance',x.a.length,x.grade_level,x.walas,x.uks)}</td><td>${status('discipline',x.v.length,x.grade_level,x.walas,x.uks)}</td><td>${status('reward',x.r.length,x.grade_level,x.walas,x.uks)}</td><td>${status('uks',0,x.grade_level,x.walas,x.uks)}</td><td><button class="krek-detail" data-class="${E(x.id)}">Lihat Detail</button></td></tr>`).join('')}</tbody></table></div></div>`:'<div class="krek-empty">Belum ada data kelas.</div>';
    body.querySelectorAll('.krek-detail').forEach(btn=>btn.addEventListener('click',()=>openDetail(btn.dataset.class||'')));
  }
  function countsBy(arr,key,labeler){
    const out={};
    arr.filter(x=>String(x.student_id)===String(key)).forEach(x=>{const k=labeler(x)||'Lainnya';out[k]=(out[k]||0)+1});
    return Object.entries(out).sort((a,b)=>b[1]-a[1]||String(a[0]).localeCompare(String(b[0]),'id'));
  }
  function attLabel(x){const s=String(x.status||'').toLowerCase();if(/hadir|present/.test(s))return'Hadir';if(/sakit|sick/.test(s))return'Sakit';if(/izin|excused/.test(s))return'Izin';if(/alpha|alpa|unexcused|tanpa/.test(s))return'Alfa';return x.status||'Lainnya'}
  function openDetail(classId){
    const row=classRows().find(x=>String(x.id)===String(classId));if(!row)return;
    S.selected=row;
    const modal=document.getElementById('krek-modal'),title=document.getElementById('krek-modal-title'),sub=document.getElementById('krek-modal-sub'),box=document.getElementById('krek-modal-body');
    title.textContent='Detail '+row.name;sub.textContent=row.walas+' · '+S.from+' s.d. '+S.to;
    box.innerHTML=`<div class="krek-wrap"><table><thead><tr><th>No</th><th>Nama Siswa</th><th>Kehadiran</th><th>Kedisiplinan</th><th>Reward</th></tr></thead><tbody>${row.students.map((s,i)=>{
      const a=row.a.filter(x=>String(x.student_id)===String(s.student_id)),v=row.v.filter(x=>String(x.student_id)===String(s.student_id)),r=row.r.filter(x=>String(x.student_id)===String(s.student_id));
      return`<tr><td>${i+1}</td><td><b>${E(s.student_name)}</b></td><td><button class="krek-count" data-kind="attendance" data-student="${E(s.student_id)}">${a.length}</button></td><td><button class="krek-count" data-kind="discipline" data-student="${E(s.student_id)}">${v.length}</button></td><td><button class="krek-count" data-kind="reward" data-student="${E(s.student_id)}">${r.length}</button></td></tr>`;
    }).join('')}</tbody></table></div>`;
    box.querySelectorAll('.krek-count').forEach(b=>b.addEventListener('click',()=>openBreakdown(b.dataset.student||'',b.dataset.kind||'')));
    modal.classList.add('open');
  }
  function openBreakdown(studentId,kind){
    const row=S.selected;if(!row)return;
    const st=row.students.find(x=>String(x.student_id)===String(studentId));if(!st)return;
    let items=[],label='';
    if(kind==='attendance'){label='Kehadiran';items=countsBy(row.a,studentId,attLabel)}
    if(kind==='discipline'){label='Kedisiplinan';items=countsBy(row.v,studentId,x=>x.violation_name||x.category||'Pelanggaran')}
    if(kind==='reward'){label='Reward';items=countsBy(row.r,studentId,x=>x.reward_name||x.category||'Reward')}
    const body=document.getElementById('krek-modal-body');
    body.innerHTML=`<button type="button" class="krek-detail" id="krek-back" style="margin-bottom:12px">← Kembali</button><h3 style="margin:0 0 4px;font-size:15px">${E(st.student_name)}</h3><div style="font-size:11px;color:#718294;margin-bottom:12px">${E(label)} · ${E(row.name)}</div><div class="krek-break">${items.length?items.map(([n,c])=>`<div class="krek-breakrow"><span>${E(n)}</span><b>${c}</b></div>`).join(''):'<div class="krek-empty">Tidak ada data pada periode ini.</div>'}</div>`;
    document.getElementById('krek-back')?.addEventListener('click',()=>openDetail(row.id));
  }
  function ensureModal(){
    if(document.getElementById('krek-modal'))return;
    const m=document.createElement('div');m.id='krek-modal';m.className='krek-modal';m.innerHTML=`<div class="krek-box"><div class="krek-boxhead"><div><h2 id="krek-modal-title">Detail</h2><p id="krek-modal-sub"></p></div><button type="button" class="krek-close" aria-label="Tutup">×</button></div><div class="krek-boxbody" id="krek-modal-body"></div></div>`;
    document.body.appendChild(m);m.querySelector('.krek-close').addEventListener('click',()=>m.classList.remove('open'));m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')});
  }
  async function load(){
    const body=document.getElementById('krek-body');if(!body)return;
    body.innerHTML='<div class="krek-loading">Memuat rekapan Kesiswaan…</div>';
    try{S.data=await post({action:'report',start_date:S.from,end_date:S.to});renderTable()}
    catch(e){body.innerHTML='<div class="krek-error"><b>Rekapan belum dapat dimuat.</b><br>'+E(e.message||'Gagal memuat data.')+'</div>'}
  }
  function render(content){
    if(!isKesiswaan()){content.innerHTML='<div class="krek-error">Menu ini khusus Kabid Kesiswaan.</div>';return}
    css();ensureModal();const t=today();if(!S.to){S.to=t;S.from=t.slice(0,8)+'01'}
    content.innerHTML=`<div class="krek"><h1>REKAPAN</h1><div class="krek-sub">Monitoring input Kehadiran, Kedisiplinan, Reward, dan Jaga UKS. UKS ditampilkan untuk kelas 1–3.</div><div class="krek-filter"><div class="krek-field"><label>Dari tanggal</label><input id="krek-from" type="date" value="${E(S.from)}"></div><div class="krek-field"><label>Sampai tanggal</label><input id="krek-to" type="date" value="${E(S.to)}"></div><button type="button" class="krek-btn" id="krek-apply">Tampilkan</button></div><div id="krek-body"></div></div>`;
    document.getElementById('krek-apply').addEventListener('click',()=>{const f=document.getElementById('krek-from').value,t2=document.getElementById('krek-to').value;if(!f||!t2||f>t2){document.getElementById('krek-body').innerHTML='<div class="krek-error">Rentang tanggal tidak valid.</div>';return}S.from=f;S.to=t2;load()});
    load();
  }
  function install(){
    if(!isKesiswaan())return false;
    if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;
    let g=MODULE_GROUPS.find(x=>x&&x.id===GROUP_ID);
    if(!g){g={id:GROUP_ID,label:'REKAPAN',roles:['kesiswaan'],items:[]};MODULE_GROUPS.push(g)}
    g.roles=['kesiswaan'];
    if(!Array.isArray(g.items))g.items=[];
    let it=g.items.find(x=>x&&x.id===MODULE_ID);
    if(!it){g.items.push({id:MODULE_ID,label:'Rekapan',roles:['kesiswaan'],built:true,render})}
    else Object.assign(it,{label:'Rekapan',roles:['kesiswaan'],built:true,render});
    return true;
  }
  function hook(){
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqKesiswaanRekapanV2){
      const base=renderSidebar;const wrapped=function(){install();return base.apply(this,arguments)};wrapped.__cqKesiswaanRekapanV2=true;renderSidebar=wrapped;
    }
    if(install()&&typeof renderSidebar==='function')try{renderSidebar()}catch(_){}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook);else hook();
  let tries=0;const timer=setInterval(()=>{tries++;hook();if(tries>20||!isKesiswaan())clearInterval(timer)},250);
})();