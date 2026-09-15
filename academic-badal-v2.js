/* CQlass — Badal Guru V2
   Alur: pilih tanggal -> pilih guru yang dibadal -> tentukan guru badal per jam.
   Kandidat pembadal berasal dari semua guru aktif + seluruh Kabid. */
(function(){
  'use strict';
  if(window.__CQ_BADAL_V2__) return;

  const BASE=(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL)||'https://lmglkxzemtvxcgktiord.supabase.co';
  const ENDPOINT=BASE+'/functions/v1/academic-badal-v2';
  let STATE=null;
  let SELECTED_ORIGINAL='';

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
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
    const rows=SELECTED_ORIGINAL?(d.slots||[]).filter(s=>String(s.teacher_id)===String(SELECTED_ORIGINAL)):[];
    const originalName=(originals.find(x=>String(x[0])===String(SELECTED_ORIGINAL))||[])[1]||'';

    c.innerHTML=`<div class="akv2">
      <section class="av-hero">
        <div class="av-title">Badal <span>Guru</span></div>
        <div class="av-sub">Pilih guru yang tidak hadir terlebih dahulu, lalu tentukan pembadal untuk tiap jam. Kandidat pembadal mencakup semua guru aktif dan seluruh Kabid; bentrok jadwal tetap dicek otomatis.</div>
      </section>
      <section class="av-card">
        <div class="av-tools">
          <div class="av-field"><label>TANGGAL</label><input id="av2-date" type="date" value="${esc(d.date)}"></div>
          <div class="av-field"><label>GURU YANG DIBADAL</label><select id="av2-original"><option value="">Pilih guru yang tidak hadir...</option>${originals.map(([id,name])=>`<option value="${esc(id)}" ${String(id)===String(SELECTED_ORIGINAL)?'selected':''}>${esc(name)}</option>`).join('')}</select></div>
          <button class="av-btn sec" id="av2-load">Muat Jadwal</button>
        </div>
        <div id="av2-editor"></div>
        <div class="av-wrap">
          <table class="av-table">
            <thead><tr><th>Jam</th><th>Kelas</th><th>Mapel</th><th>Guru Asal</th><th>Guru Badal</th><th>Aksi</th></tr></thead>
            <tbody>${!SELECTED_ORIGINAL
              ?'<tr><td colspan="6" class="av-empty">Pilih guru yang tidak hadir terlebih dahulu.</td></tr>'
              :rows.length
                ?rows.map(s=>{const q=sm.get(String(s.id));return`<tr><td><b>${esc(String(s.start_time||'').slice(0,5))}–${esc(String(s.end_time||'').slice(0,5))}</b></td><td>${esc(s.class_name||'—')}</td><td>${esc(s.subject_name||'—')}</td><td><b>${esc(s.teacher_name||originalName||'—')}</b></td><td>${q?`<span class="av-badge">${esc(q.substitute_teacher_name||'—')}</span>`:'<span class="av-badge warn">Belum dibadalkan</span>'}</td><td>${q?`<button class="av-btn danger" data-av2-cancel="${esc(q.id)}">Batalkan</button>`:`<button class="av-btn" data-av2-slot="${esc(s.id)}">Tentukan Badal</button>`}</td></tr>`}).join('')
                :'<tr><td colspan="6" class="av-empty">Guru ini tidak memiliki jadwal mengajar pada tanggal tersebut.</td></tr>'}
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
      editor.innerHTML=`<div style="font-size:9px"><b>${esc(slot.teacher_name)}</b> · ${esc(slot.subject_name)} · ${esc(slot.class_name)} · ${esc(String(slot.start_time||'').slice(0,5))}–${esc(String(slot.end_time||'').slice(0,5))}</div>
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
    patch();
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqBadalV2){
      const old=renderSidebar;
      renderSidebar=function(){const out=old.apply(this,arguments);patch();return out};
      renderSidebar.__cqBadalV2=true;
    }
    window.__CQ_BADAL_V2__=true;
  }
  let tries=0;(function wait(){if(typeof MODULE_GROUPS!=='undefined'&&typeof window.renderAcademicBadal==='function'){install();return}if(++tries<100)setTimeout(wait,150)})();
})();
