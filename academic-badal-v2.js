/* CQlass — Badal Guru Mapel
   UI sengaja mengikuti pola Badal Tahfizh milik Kabid Qur'an,
   tetapi seluruh selector/style tetap scoped ke .akv2 dan endpoint akademik. */
(function(){
  'use strict';
  if(window.__CQ_BADAL_V2__) return;

  const BASE=(typeof SUPABASE_URL!=='undefined'&&SUPABASE_URL)||'https://lmglkxzemtvxcgktiord.supabase.co';
  const ENDPOINT=BASE+'/functions/v1/academic-badal-v2';
  let STATE=null;
  let SELECTED_ORIGINAL='';
  let ROWS=[];

  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  function ensureStyles(){
    if(document.getElementById('cq-academic-badal-v2-style')) return;
    const s=document.createElement('style');
    s.id='cq-academic-badal-v2-style';
    s.textContent=`
      .akv2{font-family:inherit;color:#173f3b;max-width:100%;padding:2px 0 24px}
      .akv2 *{box-sizing:border-box}
      .akv2 .av-hero{padding:2px 2px 12px}
      .akv2 .av-title{margin:0;font-size:25px;line-height:1.18;font-weight:800;letter-spacing:-.35px;color:#143f3b}
      .akv2 .av-title span{color:#0d7a70}
      .akv2 .av-sub{margin-top:5px;max-width:940px;font-size:12px;line-height:1.5;color:#647b77}
      .akv2 .av-card{background:#fff;border:1px solid #dceae7;border-radius:14px;padding:14px;box-shadow:0 4px 14px rgba(18,88,79,.045)}
      .akv2 .av-tools{display:grid;grid-template-columns:150px minmax(210px,1fr) 108px minmax(190px,1fr) minmax(210px,1.15fr);gap:10px;align-items:end}
      .akv2 .av-field{min-width:0}
      .akv2 .av-field label{display:block;margin:0 0 5px;font-size:10.5px;font-weight:800;color:#536d68}
      .akv2 .av-field input,.akv2 .av-field select{width:100%;height:38px;border:1px solid #cfdeda;border-radius:9px;background:#fff;padding:0 10px;font:inherit;font-size:12px;color:#173f3b;outline:none}
      .akv2 .av-field input:focus,.akv2 .av-field select:focus{border-color:#198c80;box-shadow:0 0 0 3px rgba(25,140,128,.09)}
      .akv2 .av-btn{height:38px;border:0;border-radius:9px;background:#117b70;color:#fff;padding:0 13px;font:inherit;font-size:11.5px;font-weight:800;cursor:pointer;white-space:nowrap}
      .akv2 .av-btn.sec{background:#edf7f5;color:#0d6f65;border:1px solid #cce3df}
      .akv2 .av-btn.danger{height:30px;background:#fff2ef;color:#9f493b;border:1px solid #efd1ca;padding:0 10px;font-size:10.5px}
      .akv2 .av-btn:disabled{opacity:.48;cursor:not-allowed}
      .akv2 .av-meta{margin:9px 2px 0;color:#718481;font-size:11.5px;min-height:17px}
      .akv2 .av-wrap{margin-top:12px;overflow:auto;border:1px solid #e0ebe8;border-radius:13px;background:#fff}
      .akv2 .av-table{width:100%;min-width:980px;border-collapse:collapse;background:#fff}
      .akv2 .av-table th,.akv2 .av-table td{padding:9px 10px;border-bottom:1px solid #e8f0ee;text-align:left;font-size:11.5px;vertical-align:middle}
      .akv2 .av-table th{background:#eef7f5;color:#496963;font-size:10.5px;font-weight:800;position:sticky;top:0;z-index:1}
      .akv2 .av-table tr:last-child td{border-bottom:0}
      .akv2 .av-check{text-align:center!important;width:48px}
      .akv2 .av-check input{width:16px;height:16px;accent-color:#117b70;cursor:pointer}
      .akv2 .av-time{white-space:nowrap;font-weight:800}
      .akv2 .av-replacement{min-width:185px;width:100%;height:34px;border:1px solid #cfdeda;border-radius:8px;background:#fff;padding:0 8px;font:inherit;font-size:11px;color:#173f3b}
      .akv2 .av-reason{min-width:180px;width:100%;height:34px;border:1px solid #cfdeda;border-radius:8px;background:#fff;padding:0 9px;font:inherit;font-size:11px;color:#173f3b}
      .akv2 .av-active{font-weight:800;color:#087b70}
      .akv2 .av-pending{color:#8a6a2c}
      .akv2 .av-empty{text-align:center!important;color:#718481;padding:24px!important}
      .akv2 .av-save{margin-top:12px;min-width:190px}
      @media(max-width:1000px){
        .akv2 .av-tools{grid-template-columns:140px minmax(200px,1fr) 105px}
        .akv2 .av-tools .av-default-sub{grid-column:1/2}
        .akv2 .av-tools .av-default-reason{grid-column:2/4}
      }
      @media(max-width:720px){
        .akv2 .av-card{padding:11px}
        .akv2 .av-tools{grid-template-columns:1fr 1fr}
        .akv2 .av-tools .av-load{grid-column:1/2}
        .akv2 .av-tools .av-default-sub{grid-column:2/3}
        .akv2 .av-tools .av-default-reason{grid-column:1/3}
        .akv2 .av-save{width:100%}
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
      teacher_conflict_tahfizh_badal:'Guru pengganti sedang menjadi badal Tahfizh pada jam tersebut.',
      same_teacher:'Guru asal dan guru badal tidak boleh sama.',
      schedule_not_found:'Jadwal tidak ditemukan.',
      substitute_not_allowed:'Guru tersebut tidak termasuk daftar guru/Kabid yang dapat menjadi badal.',
      forbidden:'Akun ini tidak memiliki akses untuk mengatur badal.'
    }[String(m||'')]||String(m||'Terjadi kendala.');
  }

  function teacherOptions(d){
    const map=new Map();
    (d.slots||[]).forEach(x=>{
      if(x.teacher_id&&!map.has(String(x.teacher_id)))map.set(String(x.teacher_id),String(x.teacher_name||'Tanpa nama'));
    });
    return [...map].map(([id,name])=>({id,name})).sort((a,b)=>a.name.localeCompare(b.name,'id'));
  }
  function candidates(){
    const origin=SELECTED_ORIGINAL;
    return (STATE?.teachers||[])
      .filter(x=>String(x.id)!==String(origin))
      .map(x=>({id:String(x.id),name:String(x.name||'Tanpa nama'),role_label:String(x.role_label||'')}))
      .sort((a,b)=>a.name.localeCompare(b.name,'id'));
  }
  function candidateOptions(selected=''){
    return candidates().map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selected)?'selected':''}>${esc(x.name)}${x.role_label&&x.role_label!=='Guru'?' · '+esc(x.role_label):''}</option>`).join('');
  }

  async function load(c,date,keepTeacher=true){
    ensureStyles();
    const prev=keepTeacher?SELECTED_ORIGINAL:'';
    c.innerHTML='<div class="akv2"><div class="av-card av-empty">Memuat jadwal badal...</div></div>';
    STATE=await req('bootstrap',{work_date:date});
    const available=new Set(teacherOptions(STATE).map(x=>x.id));
    SELECTED_ORIGINAL=prev&&available.has(String(prev))?String(prev):'';
    paint(c);
  }

  function paint(c){
    const d=STATE||{date:'',slots:[],substitutions:[],teachers:[]};
    const teachers=teacherOptions(d);
    const substitutions=new Map((d.substitutions||[]).map(x=>[String(x.schedule_entry_id),x]));
    ROWS=SELECTED_ORIGINAL?(d.slots||[]).filter(x=>String(x.teacher_id)===String(SELECTED_ORIGINAL)):[];
    c.innerHTML=`<div class="akv2">
      <section class="av-hero">
        <div class="av-title">Badal <span>Guru Mapel</span></div>
        <div class="av-sub">Pilih guru yang dibadal, centang jam yang diperlukan, lalu tentukan guru pengganti dan alasan. Pengganti default dan alasan default dapat dipakai sekaligus untuk beberapa jam.</div>
      </section>
      <section class="av-card">
        <div class="av-tools">
          <div class="av-field"><label>Tanggal</label><input id="av2-date" type="date" value="${esc(d.date)}"></div>
          <div class="av-field"><label>Guru yang dibadal</label><select id="av2-original"><option value="">— Pilih guru —</option>${teachers.map(x=>`<option value="${esc(x.id)}" ${x.id===String(SELECTED_ORIGINAL)?'selected':''}>${esc(x.name)}</option>`).join('')}</select></div>
          <button class="av-btn sec av-load" id="av2-load">Muat Jam</button>
          <div class="av-field av-default-sub"><label>Pengganti Default</label><select id="av2-default-sub"><option value="">— Pilih pengganti —</option>${candidateOptions()}</select></div>
          <div class="av-field av-default-reason"><label>Alasan Default</label><input id="av2-default-reason" placeholder="Contoh: izin / sakit / tugas"></div>
        </div>
        <div id="av2-meta" class="av-meta">${SELECTED_ORIGINAL?(ROWS.length+' jadwal · '+esc(ROWS[0]?.teacher_name||'guru terpilih')):''}</div>
        <div class="av-wrap">
          <table class="av-table">
            <thead><tr><th class="av-check">Pilih</th><th>Jam</th><th>Kelas</th><th>Mapel</th><th>Guru Asal</th><th>Guru Pengganti</th><th>Alasan</th><th>Status</th><th>Aksi</th></tr></thead>
            <tbody>${!SELECTED_ORIGINAL
              ?'<tr><td colspan="9" class="av-empty">Pilih guru untuk melihat jam mengajarnya.</td></tr>'
              :ROWS.length
                ?ROWS.map((x,i)=>{
                  const sub=substitutions.get(String(x.id));
                  return `<tr>
                    <td class="av-check">${sub?'✓':`<input class="av-slot" type="checkbox" data-i="${i}">`}</td>
                    <td class="av-time">${esc(String(x.start_time||'').slice(0,5))}–${esc(String(x.end_time||'').slice(0,5))}</td>
                    <td>${esc(x.class_name||'—')}</td>
                    <td>${esc(x.subject_name||'—')}</td>
                    <td><b>${esc(x.teacher_name||'—')}</b></td>
                    <td>${sub?`<b>${esc(sub.substitute_teacher_name||'—')}</b>`:`<select class="av-replacement" id="av2-sub-${i}"><option value="">— Pilih —</option>${candidateOptions()}</select>`}</td>
                    <td>${sub?esc(sub.reason||'—'):`<input class="av-reason" id="av2-reason-${i}" placeholder="Alasan badal">`}</td>
                    <td>${sub?'<span class="av-active">Aktif</span>':'<span class="av-pending">Belum ditetapkan</span>'}</td>
                    <td>${sub?`<button class="av-btn danger" data-av2-cancel="${esc(sub.id)}">Batalkan</button>`:'—'}</td>
                  </tr>`;
                }).join('')
                :'<tr><td colspan="9" class="av-empty">Tidak ada jadwal guru ini pada tanggal tersebut.</td></tr>'}
            </tbody>
          </table>
        </div>
        <button class="av-btn av-save" id="av2-save" disabled>Simpan Badal Terpilih</button>
      </section>
    </div>`;
    wire(c);
  }

  function applyDefaultSub(c){
    const v=c.querySelector('#av2-default-sub')?.value||'';
    if(!v)return;
    c.querySelectorAll('.av-slot:checked').forEach(ch=>{
      const s=c.querySelector('#av2-sub-'+ch.dataset.i);if(s)s.value=v;
    });
  }
  function applyDefaultReason(c){
    const v=(c.querySelector('#av2-default-reason')?.value||'').trim();
    if(!v)return;
    c.querySelectorAll('.av-slot:checked').forEach(ch=>{
      const r=c.querySelector('#av2-reason-'+ch.dataset.i);if(r)r.value=v;
    });
  }

  function wire(c){
    const date=c.querySelector('#av2-date');
    const original=c.querySelector('#av2-original');
    const save=c.querySelector('#av2-save');
    c.querySelector('#av2-load')?.addEventListener('click',()=>load(c,date?.value||STATE?.date||'',true).catch(e=>showError(c,e)));
    date?.addEventListener('change',()=>load(c,date.value,false).catch(e=>showError(c,e)));
    original?.addEventListener('change',()=>{SELECTED_ORIGINAL=original.value;paint(c)});
    c.querySelector('#av2-default-sub')?.addEventListener('change',()=>applyDefaultSub(c));
    c.querySelector('#av2-default-reason')?.addEventListener('input',()=>applyDefaultReason(c));

    c.querySelectorAll('.av-slot').forEach(ch=>ch.addEventListener('change',()=>{
      if(save)save.disabled=!c.querySelectorAll('.av-slot:checked').length;
      if(ch.checked){
        const i=ch.dataset.i;
        const defSub=c.querySelector('#av2-default-sub')?.value||'';
        const defReason=(c.querySelector('#av2-default-reason')?.value||'').trim();
        const sub=c.querySelector('#av2-sub-'+i),reason=c.querySelector('#av2-reason-'+i);
        if(defSub&&sub)sub.value=defSub;
        if(defReason&&reason)reason.value=defReason;
      }
    }));

    save?.addEventListener('click',async()=>{
      const chosen=[...c.querySelectorAll('.av-slot:checked')].map(x=>Number(x.dataset.i));
      if(!chosen.length)return;
      for(const i of chosen){
        const row=ROWS[i];
        const sub=c.querySelector('#av2-sub-'+i)?.value||'';
        const reason=(c.querySelector('#av2-reason-'+i)?.value||'').trim();
        if(!sub){if(typeof showToast==='function')showToast('Pilih guru pengganti untuk jam '+String(row?.start_time||'').slice(0,5),true);return}
        if(!reason){if(typeof showToast==='function')showToast('Isi alasan badal untuk jam '+String(row?.start_time||'').slice(0,5),true);return}
      }
      const oldText=save.textContent;
      try{
        save.disabled=true;save.textContent='Menyimpan...';
        for(const i of chosen){
          const row=ROWS[i];
          await req('assign',{
            work_date:STATE.date,
            schedule_entry_id:row.id,
            substitute_teacher_id:c.querySelector('#av2-sub-'+i)?.value||'',
            reason:(c.querySelector('#av2-reason-'+i)?.value||'').trim()
          });
        }
        if(typeof showToast==='function')showToast('Badal terpilih berhasil disimpan.');
        await load(c,STATE.date,true);
      }catch(e){
        if(typeof showToast==='function')showToast(errMsg(e.message),true);
        save.disabled=false;save.textContent=oldText;
      }
    });

    c.querySelectorAll('[data-av2-cancel]').forEach(btn=>btn.addEventListener('click',async()=>{
      if(!confirm('Batalkan penugasan badal ini?'))return;
      try{
        await req('cancel',{id:btn.dataset.av2Cancel});
        if(typeof showToast==='function')showToast('Penugasan badal dibatalkan.');
        await load(c,STATE.date,true);
      }catch(e){if(typeof showToast==='function')showToast(errMsg(e.message),true)}
    }));
  }

  function showError(c,e){
    ensureStyles();
    c.innerHTML=`<div class="akv2"><div class="av-card av-empty">${esc(errMsg(e?.message))}</div></div>`;
  }
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
    if(typeof MODULE_GROUPS!=='undefined'){install();return}
    window.renderAcademicBadal=render;
    if(++tries<100)setTimeout(wait,150);
  })();
})();