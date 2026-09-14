/* CQlass — Admin UKS Schedule Manager
   Admin can manage UKS roster without editing code/database manually.
   Two shifts per day; teachers and times are editable.
*/
(function(){
  'use strict';
  if(window.__cqAdminUksSchedule) return;
  window.__cqAdminUksSchedule=true;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co');
  const KEY=(typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'');
  const API=BASE+'/functions/v1/uks-duty';
  const DAYS=[
    {n:1,label:'Senin'},{n:2,label:'Selasa'},{n:3,label:'Rabu'},{n:4,label:'Kamis'},
    {n:5,label:'Jumat'},{n:6,label:'Sabtu'}
  ];
  const DEFAULTS={1:{start:'08:00',end:'10:00'},2:{start:'10:00',end:'11:50'}};
  const state={teachers:[],schedule:[],drafts:{},picker:null,busy:false};

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const role=()=>{try{return String(currentUser?.role||'').toLowerCase()}catch(_){return ''}};
  const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return ''}};
  const toast=(m,e)=>{try{if(typeof showToast==='function')return showToast(m,!!e)}catch(_){ } alert(m)};
  const key=(d,s)=>`${d}-${s}`;

  function headers(){
    const h={'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY};
    const t=token();if(t)h['x-session-token']=t;return h;
  }
  async function req(action,payload={}){
    const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),30000);
    try{
      const r=await fetch(API,{method:'POST',headers:headers(),body:JSON.stringify({action,...payload}),signal:ctl.signal});
      const d=await r.json().catch(()=>({}));
      if(!r.ok||d.success===false){const e=new Error(d.error||'request_failed');e.data=d;throw e}return d;
    }catch(e){if(e?.name==='AbortError')throw new Error('Server UKS terlalu lama merespons.');throw e}
    finally{clearTimeout(tm)}
  }

  function ensureCss(){
    if(document.getElementById('cq-admin-uks-css'))return;
    const s=document.createElement('style');s.id='cq-admin-uks-css';
    s.textContent=`
      .cq-auks{max-width:1180px;margin:0 auto;padding:0 0 32px;color:#173b39}.cq-auks-hero{background:linear-gradient(135deg,#0b6f6a,#148f86);color:#fff;border-radius:22px;padding:24px 28px;margin-bottom:16px;box-shadow:0 11px 32px rgba(12,108,103,.14)}
      .cq-auks-hero h1{font-size:28px;margin:3px 0 6px}.cq-auks-hero p{font-size:13px;margin:0;opacity:.87}.cq-auks-kicker{font-size:10px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;opacity:.72}
      .cq-auks-info{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 15px}.cq-auks-chip{background:#edf8f6;border:1px solid #d5ebe7;color:#35645f;padding:7px 10px;border-radius:999px;font-size:11px;font-weight:800}
      .cq-auks-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:13px}.cq-auks-card{background:#fff;border:1px solid #dceae8;border-radius:18px;padding:17px;box-shadow:0 7px 23px rgba(29,86,82,.055)}
      .cq-auks-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:13px}.cq-auks-day{font-size:15px;font-weight:900;color:#183f3c}.cq-auks-shift{font-size:11px;color:#6e8885;margin-top:3px}.cq-auks-count{font-size:10px;font-weight:900;padding:5px 8px;border-radius:999px;background:#e9f7f4;color:#18756e}
      .cq-auks-time{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:10px}.cq-auks-field label{display:block;font-size:10px;font-weight:800;color:#66807d;margin-bottom:5px}.cq-auks-field input{width:100%;box-sizing:border-box;border:1px solid #d7e6e4;border-radius:11px;padding:9px 10px;font:700 12px/1.2 Inter,system-ui,sans-serif;color:#173d3b;background:#fbfdfd;outline:none}.cq-auks-field input:focus{border-color:#4cab9f;box-shadow:0 0 0 3px rgba(76,171,159,.10)}
      .cq-auks-teachers{display:flex;gap:6px;flex-wrap:wrap;min-height:32px;margin-bottom:11px}.cq-auks-teacher{display:inline-flex;align-items:center;gap:5px;background:#f0f7f6;border:1px solid #deebe9;border-radius:999px;padding:6px 8px;font-size:10.5px;font-weight:800;color:#355d5a}.cq-auks-empty{font-size:11px;color:#8aa09d;padding:5px 0}
      .cq-auks-actions{display:flex;gap:8px;flex-wrap:wrap}.cq-auks-btn{border:0;border-radius:11px;padding:9px 12px;font:800 11px/1.2 Inter,system-ui,sans-serif;cursor:pointer}.cq-auks-btn.primary{background:#0e8178;color:#fff}.cq-auks-btn.soft{background:#edf7f5;color:#1b6c66}.cq-auks-btn.danger{background:#fff0f0;color:#a94747}.cq-auks-btn:disabled{opacity:.5;cursor:not-allowed}
      .cq-auks-picker-backdrop{position:fixed;inset:0;background:rgba(16,40,39,.38);z-index:9000;display:flex;align-items:center;justify-content:center;padding:18px}.cq-auks-picker{width:min(560px,96vw);max-height:82vh;background:#fff;border-radius:19px;box-shadow:0 24px 70px rgba(8,52,48,.25);display:flex;flex-direction:column;overflow:hidden}.cq-auks-picker-head{padding:17px 18px 12px;border-bottom:1px solid #e7efee}.cq-auks-picker-title{font-size:16px;font-weight:900;color:#173d3b;margin-bottom:9px}.cq-auks-search{width:100%;box-sizing:border-box;border:1px solid #d7e6e4;border-radius:11px;padding:10px 12px;font:600 12px Inter,system-ui,sans-serif}.cq-auks-picker-list{overflow:auto;padding:8px 12px 12px}.cq-auks-option{display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid #eef3f2;font-size:12px;color:#2e5552}.cq-auks-option:last-child{border-bottom:0}.cq-auks-option input{width:16px;height:16px}.cq-auks-option b{display:block}.cq-auks-option small{display:block;color:#869a98;margin-top:2px}.cq-auks-picker-foot{display:flex;justify-content:flex-end;gap:8px;padding:12px 14px;border-top:1px solid #e7efee;background:#fbfdfd}
      .cq-auks-loading{background:#fff;border:1px solid #dce9e7;border-radius:16px;padding:22px;color:#68817e}
      @media(max-width:850px){.cq-auks-grid{grid-template-columns:1fr}.cq-auks-hero{padding:20px;border-radius:17px}.cq-auks-hero h1{font-size:24px}}
    `;document.head.appendChild(s);
  }

  function hydrateDrafts(){
    state.drafts={};
    for(const d of DAYS)for(const shift of [1,2]){
      const rows=state.schedule.filter(r=>Number(r.weekday)===d.n&&Number(r.shift_no)===shift&&r.is_active!==false);
      state.drafts[key(d.n,shift)]={weekday:d.n,shift,start:rows[0]?.start_time||DEFAULTS[shift].start,end:rows[0]?.end_time||DEFAULTS[shift].end,teacherIds:rows.map(r=>r.teacher_id)};
    }
  }
  function teacherName(id){return state.teachers.find(t=>t.id===id)?.name||'Guru'}
  function slotHtml(d,shift){
    const x=state.drafts[key(d.n,shift)],names=x.teacherIds.map(id=>teacherName(id));
    return `<div class="cq-auks-card" data-slot="${d.n}-${shift}">
      <div class="cq-auks-card-head"><div><div class="cq-auks-day">${esc(d.label)}</div><div class="cq-auks-shift">Shift ${shift}</div></div><span class="cq-auks-count">${names.length} guru</span></div>
      <div class="cq-auks-time"><div class="cq-auks-field"><label>Mulai</label><input type="time" id="auks-start-${d.n}-${shift}" value="${esc(x.start)}"></div><div class="cq-auks-field"><label>Selesai</label><input type="time" id="auks-end-${d.n}-${shift}" value="${esc(x.end)}"></div></div>
      <div class="cq-auks-teachers">${names.length?names.map(n=>`<span class="cq-auks-teacher">${esc(n)}</span>`).join(''):'<span class="cq-auks-empty">Belum ada guru bertugas.</span>'}</div>
      <div class="cq-auks-actions"><button type="button" class="cq-auks-btn soft" onclick="cqAdminUksPick(${d.n},${shift})">Pilih Guru</button><button type="button" class="cq-auks-btn primary" onclick="cqAdminUksSave(${d.n},${shift})">Simpan</button>${names.length?`<button type="button" class="cq-auks-btn danger" onclick="cqAdminUksClear(${d.n},${shift})">Kosongkan</button>`:''}</div>
    </div>`;
  }

  function renderBody(content){
    const total=state.schedule.filter(x=>x.is_active!==false).length;
    content.innerHTML=`<div class="cq-auks"><div class="cq-auks-hero"><div class="cq-auks-kicker">Admin · Pengaturan UKS</div><h1>Jadwal Jaga UKS</h1><p>Atur guru piket dan jam shift langsung dari sini. Perubahan otomatis dipakai pada sidebar UKS guru.</p></div><div class="cq-auks-info"><span class="cq-auks-chip">2 shift per hari</span><span class="cq-auks-chip">${total} penugasan aktif</span><span class="cq-auks-chip">Foto laporan tetap realtime</span></div><div class="cq-auks-grid">${DAYS.flatMap(d=>[slotHtml(d,1),slotHtml(d,2)]).join('')}</div></div>`;
  }

  async function load(content){
    ensureCss();content.innerHTML='<div class="cq-auks"><div class="cq-auks-loading"><span class="spinner"></span> Memuat jadwal UKS...</div></div>';
    try{
      const d=await req('admin_bootstrap');state.teachers=d.teachers||[];state.schedule=d.schedule||[];hydrateDrafts();renderBody(content);
    }catch(e){content.innerHTML=`<div class="cq-auks"><div class="cq-auks-loading">Jadwal UKS gagal dimuat.<br><small>${esc(e?.message||'')}</small></div></div>`}
  }

  function openPicker(day,shift){
    const draft=state.drafts[key(day,shift)];if(!draft)return;
    state.picker={day,shift,selected:new Set(draft.teacherIds)};
    document.getElementById('cq-auks-picker-backdrop')?.remove();
    const wrap=document.createElement('div');wrap.id='cq-auks-picker-backdrop';wrap.className='cq-auks-picker-backdrop';
    wrap.innerHTML=`<div class="cq-auks-picker" role="dialog" aria-modal="true"><div class="cq-auks-picker-head"><div class="cq-auks-picker-title">Pilih Guru · ${esc(DAYS.find(d=>d.n===day)?.label||'')} Shift ${shift}</div><input class="cq-auks-search" id="cq-auks-search" placeholder="Cari nama guru..." oninput="cqAdminUksFilterTeachers(this.value)"></div><div class="cq-auks-picker-list" id="cq-auks-picker-list">${teacherOptionsHtml('')}</div><div class="cq-auks-picker-foot"><button type="button" class="cq-auks-btn soft" onclick="cqAdminUksClosePicker()">Batal</button><button type="button" class="cq-auks-btn primary" onclick="cqAdminUksApplyPicker()">Gunakan Pilihan</button></div></div>`;
    document.body.appendChild(wrap);setTimeout(()=>document.getElementById('cq-auks-search')?.focus(),20);
  }
  function teacherOptionsHtml(q){
    const search=String(q||'').toLowerCase().trim(),selected=state.picker?.selected||new Set();
    return state.teachers.filter(t=>!search||String(t.name||'').toLowerCase().includes(search)||String(t.code||'').toLowerCase().includes(search)).map(t=>`<label class="cq-auks-option"><input type="checkbox" value="${esc(t.id)}" ${selected.has(t.id)?'checked':''} onchange="cqAdminUksToggleTeacher('${esc(t.id)}',this.checked)"><span><b>${esc(t.name)}</b><small>${esc(t.code||'')}</small></span></label>`).join('')||'<div class="cq-auks-empty">Guru tidak ditemukan.</div>';
  }
  function toggleTeacher(id,checked){if(!state.picker)return;if(checked)state.picker.selected.add(id);else state.picker.selected.delete(id)}
  function filterTeachers(q){const list=document.getElementById('cq-auks-picker-list');if(list)list.innerHTML=teacherOptionsHtml(q)}
  function closePicker(){document.getElementById('cq-auks-picker-backdrop')?.remove();state.picker=null}
  function applyPicker(){if(!state.picker)return;const {day,shift,selected}=state.picker;state.drafts[key(day,shift)].teacherIds=[...selected];closePicker();const c=document.getElementById('content');if(c)renderBody(c)}

  async function saveSlot(day,shift){
    if(state.busy)return;const draft=state.drafts[key(day,shift)];if(!draft)return;
    const start=document.getElementById(`auks-start-${day}-${shift}`)?.value||draft.start,end=document.getElementById(`auks-end-${day}-${shift}`)?.value||draft.end;
    if(!start||!end||start>=end){toast('Jam mulai harus lebih awal dari jam selesai.',true);return}
    state.busy=true;
    try{
      const d=await req('admin_save_slot',{weekday:day,shift_no:shift,start_time:start,end_time:end,teacher_ids:draft.teacherIds});state.schedule=d.schedule||[];state.teachers=d.teachers||state.teachers;hydrateDrafts();const c=document.getElementById('content');if(c)renderBody(c);toast('Jadwal UKS berhasil disimpan.');
    }catch(e){toast(e?.message==='invalid_slot'?'Data shift tidak valid.':'Gagal menyimpan jadwal UKS.',true)}finally{state.busy=false}
  }
  async function clearSlot(day,shift){
    if(state.busy)return;if(!confirm('Kosongkan semua guru pada shift ini?'))return;state.busy=true;
    try{const d=await req('admin_clear_slot',{weekday:day,shift_no:shift});state.schedule=d.schedule||[];state.teachers=d.teachers||state.teachers;hydrateDrafts();const c=document.getElementById('content');if(c)renderBody(c);toast('Shift UKS dikosongkan.')}catch(e){toast('Gagal mengosongkan shift UKS.',true)}finally{state.busy=false}
  }

  window.cqAdminUksPick=openPicker;window.cqAdminUksToggleTeacher=toggleTeacher;window.cqAdminUksFilterTeachers=filterTeachers;window.cqAdminUksClosePicker=closePicker;window.cqAdminUksApplyPicker=applyPicker;window.cqAdminUksSave=saveSlot;window.cqAdminUksClear=clearSlot;
  window.renderAdminUksSchedule=function(content){if(role()!=='admin')return;return load(content)};
})();
