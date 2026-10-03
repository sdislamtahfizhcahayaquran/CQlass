/* CQlass — Badal Guru V2
   Semua jadwal tampil lebih dahulu; filter guru bersifat opsional.
   Kandidat pembadal berasal dari semua guru aktif + seluruh Kabid. */
(function(){
  'use strict';
  if(window.__CQ_BADAL_V2__) return;

  const BASE=(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL)||'https://lmglkxzemtvxcgktiord.supabase.co';
  const ENDPOINT=BASE+'/functions/v1/academic-badal-v2';
  let STATE=null;
  let SELECTED_ORIGINAL='';

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  function ensureStyles(){
    if(document.getElementById('cq-academic-badal-v2-style')) return;
    const s=document.createElement('style');
    s.id='cq-academic-badal-v2-style';
    s.textContent=`
      .akv2{font-family:inherit;color:#173f3b;max-width:100%;padding:4px 2px 22px}
      .akv2 *{box-sizing:border-box}
      .akv2 .av-hero{padding:4px 2px 14px}
      .akv2 .av-title{font-size:26px;line-height:1.15;font-weight:800;letter-spacing:-.4px;color:#123f3b}
      .akv2 .av-title span{color:#0c7b70}
      .akv2 .av-sub{margin-top:5px;max-width:980px;font-size:12.5px;line-height:1.55;color:#5f7774}
      .akv2 .av-card{background:#fff;border:1px solid #d9ebe7;border-radius:16px;box-shadow:0 8px 24px rgba(16,91,82,.06);padding:16px}
      .akv2 .av-tools{display:grid;grid-template-columns:190px minmax(260px,1fr) auto;gap:12px;align-items:end;margin-bottom:14px}
      .akv2 .av-field{min-width:0}
      .akv2 .av-field label{display:block;margin:0 0 6px;font-size:10.5px;font-weight:800;letter-spacing:.04em;color:#456762}
      .akv2 .av-field input,.akv2 .av-field select,.akv2 .av-field textarea{width:100%;min-height:40px;border:1px solid #cfe2de;border-radius:10px;background:#fbfefd;color:#173f3b;padding:9px 11px;font:inherit;font-size:12px;outline:none;transition:.15s}
      .akv2 .av-field input:focus,.akv2 .av-field select:focus,.akv2 .av-field textarea:focus{border-color:#198f82;box-shadow:0 0 0 3px rgba(25,143,130,.10);background:#fff}
      .akv2 .av-field textarea{min-height:72px;resize:vertical}
      .akv2 .av-btn{min-height:38px;border:0;border-radius:10px;background:#117c70;color:#fff;padding:9px 14px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap;box-shadow:none}
      .akv2 .av-btn:hover{filter:brightness(.97)}
      .akv2 .av-btn.sec{background:#eef8f6;color:#0f6f65;border:1px solid #cbe6e1}
      .akv2 .av-btn.danger{background:#fff3f1;color:#a5483a;border:1px solid #f0d1cb}
      .akv2 .av-wrap{overflow:auto;border:1px solid #e3efec;border-radius:12px}
      .akv2 .av-table{width:100%;border-collapse:separate;border-spacing:0;min-width:820px;background:#fff;font-size:11.5px}
      .akv2 .av-table th{position:sticky;top:0;z-index:1;background:#f3faf8;color:#466963;text-align:left;font-size:10px;letter-spacing:.035em;text-transform:uppercase;padding:10px 12px;border-bottom:1px solid #dcebe7}
      .akv2 .av-table td{padding:10px 12px;border-bottom:1px solid #edf4f2;vertical-align:middle;color:#244a46}
      .akv2 .av-table tr:last-child td{border-bottom:0}
      .akv2 .av-table tbody tr:hover td{background:#fbfefd}
      .akv2 .av-table td:first-child,.akv2 .av-table th:first-child{white-space:nowrap;width:112px}
      .akv2 .av-table td:nth-child(2),.akv2 .av-table th:nth-child(2){width:88px}
      .akv2 .av-table td:nth-child(6),.akv2 .av-table th:nth-child(6){width:130px}
      .akv2 .av-badge{display:inline-flex;align-items:center;min-height:26px;border-radius:999px;background:#e8f7f3;color:#116d62;padding:5px 9px;font-size:10.5px;font-weight:800;white-space:nowrap}
      .akv2 .av-badge.warn{background:#fff6e8;color:#9a6715}
      .akv2 .av-editor{margin:0 0 14px;padding:13px;border:1px solid #d6e9e5;border-radius:12px;background:#f8fcfb}
      .akv2 .av-form{display:grid;grid-template-columns:minmax(220px,.9fr) minmax(280px,1.4fr) auto;gap:12px;align-items:end}
      .akv2 .av-note{margin-top:7px;font-size:11px}
      .akv2 .av-empty{text-align:center;padding:26px 14px;color:#6b817e}
      @media(max-width:900px){
        .akv2 .av-tools,.akv2 .av-form{grid-template-columns:1fr}
        .akv2 .av-btn{width:100%}
      }
    `;
    document.head.appendChild(s);
  }
  function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}}
  function headers(){
    const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
    return {'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()};
  }
  async function req(action,payload={}){
    const r=await fetch(ENDPOINT,{method:'POST',headers:headers(),body:JSON.stringify({action,...payload})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.success===false) throw new Error(d.error||d.message||'Data badal belum dapat dimuat.');
    return d;
  }
  function errMsg(m){
    return {
      teacher_conflict_schedule:'Guru pengganti masih memiliki jadwal mengajar pada jam tersebut.',
      teacher_conflict_badal:'Guru pengganti sudah menjadi badal pada jam tersebut.',
      same_teacher:'Guru asal dan guru badal tidak boleh sama.',
      schedule_not_found:'Jadwal tidak ditemukan.',
      substitute_not_allowed:'Guru tersebut tidak termasuk daftar guru/Kabid yang dapat menjadi badal.',
      forbidden:'Akun ini tidak memiliki akses untuk mengatur badal.'
    }[String(m||'')]||String(m||'Terjadi kendala.');
  }
  function teacherOptions(d){
    const map=new Map();
    (d.slots||[]).forEach(s=>{if(s.teacher_id&&!map.has(s.teacher_id))map.set(s.teacher_id,s.teacher_name||'Tanpa nama')});
    return [...map.entries()].sort((a,b)=>String(a[1]).localeCompare(String(b[1]),'id'));
  }
  function substituteOptions(originalId){
    const all=(STATE?.teachers||[]).filter(t=>String(t.id)!==String(originalId));
    const gurus=all.filter(t=>t.kind!=='kabid');
    const kabids=all.filter(t=>t.kind==='kabid');
    const mk=arr=>arr.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}${t.role_label&&t.role_label!=='Guru'?' · '+esc(t.role_label):''}</option>`).join('');
    return `${gurus.length?`<optgroup label="Guru">${mk(gurus)}</optgroup>`:''}${kabids.length?`<optgroup label="Kabid">${mk(kabids)}</optgroup>`:''}`;
  }
  async function load(c,date,keepTeacher=true){
    ensureStyles();
    const prev=keepTeacher?SELECTED_ORIGINAL:'';
    c.innerHTML='<div class="akv2"><div class="av-card av-empty">Memuat jadwal badal...</div></div>';
    STATE=await req('bootstrap',{work_date:date});
    const available=new Set(teacherOptions(STATE).map(x=>String(x[0])));
    SELECTED_ORIGINAL=prev&&available.has(String(prev))?prev:'';
    paint(c);
  }
  function paint(c){
    const d=STATE||{date:'',slots:[],substitutions:[],teachers:[]};
    const originals=teacherOptions(d);
    const sm=new Map((d.substitutions||[]).map(x=>[String(x.schedule_entry_id),x]));
    const rows=SELECTED_ORIGINAL
      ?(d.slots||[]).filter(s=>String(s.teacher_id)===String(SELECTED_ORIGINAL))
      :(d.slots||[]);
    const originalName=(originals.find(x=>String(x[0])===String(SELECTED_ORIGINAL))||[])[1]||'';

    c.innerHTML=`<div class="akv2">
      <section class="av-hero">
        <div class="av-title">Badal <span>Guru</span></div>
        <div class="av-sub">Semua jadwal pada tanggal terpilih langsung ditampilkan. Pilih guru hanya jika ingin memfilter jadwal, lalu tentukan pembadal pada baris yang diperlukan. Kandidat pembadal mencakup semua guru aktif dan seluruh Kabid; bentrok jadwal tetap dicek otomatis.</div>
      </section>
      <section class="av-card">
        <div class="av-tools">
          <div class="av-field"><label>TANGGAL</label><input id="av2-date" type="date" value="${esc(d.date)}"></div>
          <div class="av-field"><label>FILTER GURU YANG DIBADAL</label><select id="av2-original"><option value="">Semua guru / semua kelas</option>${originals.map(([id,name])=>`<option value="${esc(id)}" ${String(id)===String(SELECTED_ORIGINAL)?'selected':''}>${esc(name)}</option>`).join('')}</select></div>
          <button class="av-btn sec" id="av2-load">Muat Jadwal</button>
        </div>
        <div id="av2-editor"></div>
        <div class="av-wrap">
          <table class="av-table">
            <thead><tr><th>Jam</th><th>Kelas</th><th>Mapel</th><th>Guru Asal</th><th>Guru Badal</th><th>Aksi</th></tr></thead>
            <tbody>${rows.length
              ?rows.map(s=>{const q=sm.get(String(s.id));return`<tr><td><b>${esc(String(s.start_time||'').slice(0,5))}–${esc(String(s.end_time||'').slice(0,5))}</b></td><td>${esc(s.class_name||'—')}</td><td>${esc(s.subject_name||'—')}</td><td><b>${esc(s.teacher_name||originalName||'—')}</b></td><td>${q?`<span class="av-badge">${esc(q.substitute_teacher_name||'—')}</span>`:'<span class="av-badge warn">Belum dibadalkan</span>'}</td><td>${q?`<button class="av-btn danger" data-av2-cancel="${esc(q.id)}">Batalkan</button>`:`<button class="av-btn" data-av2-slot="${esc(s.id)}">Tentukan Badal</button>`}</td></tr>`}).join('')
              :'<tr><td colspan="6" class="av-empty">Tidak ada jadwal mengajar pada tanggal tersebut.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    </div>`;
    wire(c);
  }
  function wire(c){
    const date=c.querySelector('#av2-date');
    const original=c.querySelector('#av2-original');
    c.querySelector('#av2-load')?.addEventListener('click',()=>load(c,date?.value||STATE?.date||'',true).catch(e=>showError(c,e)));
    original?.addEventListener('change',()=>{SELECTED_ORIGINAL=original.value;paint(c)});

    c.querySelectorAll('[data-av2-slot]').forEach(btn=>btn.addEventListener('click',()=>{
      const slot=(STATE?.slots||[]).find(x=>String(x.id)===String(btn.dataset.av2Slot));
      if(!slot)return;
      const editor=c.querySelector('#av2-editor');
      editor.className='av-editor';
      editor.innerHTML=`<div style="font-size:12px;line-height:1.45;color:#456762"><b>${esc(slot.teacher_name)}</b> · ${esc(slot.subject_name)} · ${esc(slot.class_name)} · ${esc(String(slot.start_time||'').slice(0,5))}–${esc(String(slot.end_time||'').slice(0,5))}</div>
        <div class="av-form" style="margin-top:9px">
          <div class="av-field"><label>GURU BADAL</label><select id="av2-sub"><option value="">Pilih guru/Kabid pengganti...</option>${substituteOptions(slot.teacher_id)}</select></div>
          <div class="av-field"><label>ALASAN / CATATAN</label><textarea id="av2-reason" placeholder="Contoh: sakit, izin, tugas dinas"></textarea></div>
          <button class="av-btn" id="av2-save">Simpan Badal</button>
        </div>
        <div id="av2-msg" class="av-note" style="color:#a14a3d"></div>`;
      editor.querySelector('#av2-save')?.addEventListener('click',async()=>{
        const sub=editor.querySelector('#av2-sub')?.value||'';
        const msg=editor.querySelector('#av2-msg');
        if(!sub){if(msg)msg.textContent='Pilih guru/Kabid badal terlebih dahulu.';return}
        try{
          await req('assign',{work_date:STATE.date,schedule_entry_id:slot.id,substitute_teacher_id:sub,reason:editor.querySelector('#av2-reason')?.value||''});
          if(typeof showToast==='function')showToast('Guru badal berhasil ditetapkan.');
          await load(c,STATE.date,true);
        }catch(e){if(msg)msg.textContent=errMsg(e.message)}
      });
    }));

    c.querySelectorAll('[data-av2-cancel]').forEach(btn=>btn.addEventListener('click',async()=>{
      if(!confirm('Batalkan penugasan badal ini?'))return;
      try{
        await req('cancel',{id:btn.dataset.av2Cancel});
        if(typeof showToast==='function')showToast('Penugasan badal dibatalkan.');
        await load(c,STATE.date,true);
      }catch(e){if(typeof showToast==='function')showToast(errMsg(e.message),true)}
    }));
  }
  function showError(c,e){c.innerHTML=`<div class="akv2"><div class="av-card av-empty">${esc(errMsg(e?.message))}</div></div>`}
  async function render(c){
    ensureStyles();
    try{await load(c,'',false)}catch(e){showError(c,e)}
  }
  function patch(){
    try{
      if(typeof MODULE_GROUPS!=='undefined'){
        for(const g of MODULE_GROUPS){
          const item=(g.items||[]).find(x=>x&&x.id==='akd-badal');
          if(item)item.render=render;
        }
      }
      window.renderAcademicBadal=render;
      return true;
    }catch(_){return false}
  }
  function install(){
    // Register the renderer first. The previous bootstrap waited for this
    // function to exist before install(), creating a circular wait when the
    // module was loaded normally from the Kabid Akademik route.
    window.renderAcademicBadal=render;
    patch();
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqBadalV2){
      const old=renderSidebar;
      renderSidebar=function(){const out=old.apply(this,arguments);patch();return out};
      renderSidebar.__cqBadalV2=true;
    }
    window.__CQ_BADAL_V2__=true;
  }
  let tries=0;(function wait(){
    // MODULE_GROUPS may arrive after this deferred script, but the renderer
    // itself does not depend on it. Install as soon as the app module registry
    // is available; do not wait on our own renderer registration.
    if(typeof MODULE_GROUPS!=='undefined'){install();return}
    window.renderAcademicBadal=render;
    if(++tries<100)setTimeout(wait,150);
  })();
})();
