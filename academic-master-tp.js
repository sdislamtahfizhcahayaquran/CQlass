/* CQlass — Kabid Akademik Master TP
   Akademik: lihat, tambah, edit TP. Tanpa import massal.
   Sekaligus keluarkan role Akademik dari grup sidebar Kesiswaan. */
(function(){
  'use strict';
  if(window.__cqAcademicMasterTp) return;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/academic-master-tp';
  const KEY=(typeof SUPABASE_ANON_KEY!=='undefined'&&SUPABASE_ANON_KEY)?SUPABASE_ANON_KEY:'sb_publishable_3HyNVUYXakILMKo2SK-DJw_ka7-Yx93';
  const S={boot:null,items:[],editing:null,semester:1,grade:1,subjectId:''};

  function norm(v){return String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_')}
  function isAcademic(){
    try{
      const u=currentUser||{};
      const vals=[u.role,u.role_code,u.primary_role].concat(Array.isArray(u.roles)?u.roles:[]).map(norm);
      return vals.some(r=>r==='akademik'||r==='kabid_akademik'||r.includes('kabid_akademik'));
    }catch(_){return false}
  }
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function token(){return localStorage.getItem('cqlass_session_token')||''}
  async function api(body){
    const t=token(); if(!t) throw Error('Sesi CQlass tidak ditemukan. Silakan login ulang.');
    const r=await fetch(BASE,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':t},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.success===false){const e=new Error(j.error||'Proses gagal.');e.payload=j;e.status=r.status;throw e}return j;
  }

  function enforceScope(){
    try{
      if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS)) return false;
      const kg=MODULE_GROUPS.find(g=>g&&g.id==='kesiswaan');
      if(kg){
        kg.roles=(Array.isArray(kg.roles)?kg.roles:[]).filter(r=>norm(r)!=='akademik'&&norm(r)!=='kabid_akademik');
        if(Array.isArray(kg.items)) kg.items.forEach(it=>{if(it&&Array.isArray(it.roles))it.roles=it.roles.filter(r=>norm(r)!=='akademik'&&norm(r)!=='kabid_akademik')});
      }
      let ag=MODULE_GROUPS.find(g=>g&&g.id==='akademik');
      if(!ag){ag={id:'akademik',label:'Akademik',roles:['akademik'],items:[]};MODULE_GROUPS.push(ag)}
      if(!Array.isArray(ag.roles))ag.roles=[]; if(!ag.roles.includes('akademik'))ag.roles.push('akademik');
      if(!Array.isArray(ag.items))ag.items=[];
      let it=ag.items.find(x=>x&&x.id==='master-tp-akademik');
      const def={id:'master-tp-akademik',label:'Master TP',roles:['akademik'],built:true,render:window.renderAcademicMasterTP};
      if(it)Object.assign(it,def); else{
        const rapor=ag.items.findIndex(x=>x&&x.id==='rapor');
        if(rapor>=0)ag.items.splice(rapor,0,def);else ag.items.push(def);
      }
      return true;
    }catch(e){console.warn('Scope Master TP Akademik:',e);return false}
  }

  function css(){
    if(document.getElementById('cq-ak-tp-css'))return;
    const x=document.createElement('style');x.id='cq-ak-tp-css';x.textContent=`
      .aktp{font-family:Inter,system-ui,sans-serif;color:#17343a}.aktp-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:14px}.aktp-head h2{margin:0;font-size:22px}.aktp-sub{font-size:11px;color:#71868a;margin-top:4px}.aktp-grid{display:grid;grid-template-columns:1.45fr .8fr;gap:14px}.aktp-card{background:#fff;border:1px solid #dfe9e8;border-radius:15px;padding:15px}.aktp-row{display:flex;gap:9px;flex-wrap:wrap;margin-bottom:12px}.aktp-field{flex:1;min-width:145px}.aktp-field label{display:block;font-size:10px;font-weight:800;color:#657c80;margin-bottom:5px}.aktp-field select,.aktp-field input,.aktp-field textarea{width:100%;border:1px solid #cad9d8;border-radius:9px;background:#fff;padding:9px 10px;font:inherit;font-size:12px}.aktp-field select,.aktp-field input{height:39px}.aktp-field textarea{min-height:118px;resize:vertical}.aktp-btn{border:0;border-radius:9px;background:#0b7773;color:white;font-weight:800;padding:10px 13px;cursor:pointer}.aktp-btn.alt{background:#e8f3f2;color:#0b6d69}.aktp-btn.warn{background:#a66f10}.aktp-note{font-size:10.5px;line-height:1.5;color:#73878a;background:#f5f9f9;border-radius:9px;padding:9px 10px;margin-bottom:11px}.aktp-table{overflow:auto;max-height:560px;border:1px solid #e1eae9;border-radius:10px}.aktp table{width:100%;border-collapse:collapse;min-width:650px}.aktp th,.aktp td{font-size:10.5px;text-align:left;padding:8px;border-bottom:1px solid #e8efee;vertical-align:top}.aktp th{position:sticky;top:0;background:#eef5f4;z-index:1}.aktp-badge{display:inline-block;padding:4px 7px;border-radius:999px;background:#e8f3f2;color:#0b6d69;font-weight:900}.aktp-status{font-size:11px;padding:9px 10px;border-radius:9px;background:#eef6f5;margin-bottom:11px}.aktp-status.err{background:#fff0f0;color:#9b3030}.aktp-empty{padding:24px;text-align:center;color:#829497;font-size:11px}@media(max-width:900px){.aktp-grid{grid-template-columns:1fr}}
    `;document.head.appendChild(x);
  }
  function subjectsForGrade(g){
    return (S.boot?.subjects||[]).map(x=>({name:x.name,grade:x.grades.find(y=>+y.grade_level===+g)})).filter(x=>x.grade).sort((a,b)=>a.name.localeCompare(b.name,'id'));
  }
  function status(msg,err){const el=document.getElementById('aktp-status');if(el){el.textContent=msg;el.className='aktp-status'+(err?' err':'')}}
  function fillSubjectOptions(){
    const sel=document.getElementById('aktp-subject');if(!sel)return;const list=subjectsForGrade(S.grade);
    if(!list.some(x=>x.grade.subject_id===S.subjectId))S.subjectId=list[0]?.grade.subject_id||'';
    sel.innerHTML=list.map(x=>`<option value="${x.grade.subject_id}"${x.grade.subject_id===S.subjectId?' selected':''}>${esc(x.name)}</option>`).join('');
  }
  async function loadList(){
    status('Memuat TP...',false);
    try{
      const j=await api({action:'list_objectives',semester_no:S.semester,grade_level:S.grade,subject_id:S.subjectId});S.items=j.items||[];drawTable();status(`${S.items.length} TP ditemukan.`,false);
    }catch(e){status(e.message,true)}
  }
  function drawTable(){
    const box=document.getElementById('aktp-list');if(!box)return;
    if(!S.items.length){box.innerHTML='<div class="aktp-empty">Belum ada TP pada pilihan ini.</div>';return}
    box.innerHTML='<table><thead><tr><th>TP</th><th>Topik / Materi</th><th>Tujuan Pembelajaran</th><th></th></tr></thead><tbody>'+S.items.map(x=>`<tr><td><span class="aktp-badge">TP${+x.sort_order||'-'}</span></td><td>${esc(x.topic||'-')}</td><td>${esc(x.description||'')}</td><td><button class="aktp-btn alt" data-edit="${x.id}">Edit</button></td></tr>`).join('')+'</tbody></table>';
    box.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));
  }
  function clearForm(){S.editing=null;document.getElementById('aktp-form-title').textContent='Tambah TP';document.getElementById('aktp-order').value='';document.getElementById('aktp-topic').value='';document.getElementById('aktp-desc').value='';document.getElementById('aktp-cancel').style.display='none'}
  function edit(id){const x=S.items.find(a=>a.id===id);if(!x)return;S.editing=x;document.getElementById('aktp-form-title').textContent=`Edit TP${x.sort_order}`;document.getElementById('aktp-order').value=x.sort_order||'';document.getElementById('aktp-topic').value=x.topic||'';document.getElementById('aktp-desc').value=x.description||'';document.getElementById('aktp-cancel').style.display='inline-block';document.getElementById('aktp-form').scrollIntoView({behavior:'smooth',block:'start'})}
  async function save(force){
    const body={action:'save_objective',id:S.editing?.id||'',semester_no:S.semester,grade_level:S.grade,subject_id:S.subjectId,sort_order:+document.getElementById('aktp-order').value,topic:document.getElementById('aktp-topic').value.trim(),description:document.getElementById('aktp-desc').value.trim(),force:Boolean(force)};
    if(!body.sort_order||!body.description){status('Urutan TP dan Tujuan Pembelajaran wajib diisi.',true);return}
    status('Menyimpan TP...',false);
    try{await api(body);clearForm();await loadList();status('TP berhasil disimpan.',false)}catch(e){
      if(e.payload?.warning&&e.payload?.warning_code==='order_has_scores'){
        const ok=confirm(`${e.message}\n\nTetap ubah urutan TP?`);if(ok)return save(true);
      }
      status(e.message,true);
    }
  }

  window.renderAcademicMasterTP=async function(container){
    if(!isAcademic()){if(container)container.innerHTML='<div class="card">Menu ini khusus Kabid Akademik.</div>';return}
    css();
    container=container||document.getElementById('content');if(!container)return;
    container.innerHTML=`<div class="aktp"><div class="aktp-head"><div><h2>Master Tujuan Pembelajaran</h2><div class="aktp-sub">Kelola TP kelas 1–6. Untuk perubahan tengah semester gunakan Tambah/Edit; import massal tetap khusus Admin.</div></div></div><div id="aktp-status" class="aktp-status">Memuat master TP...</div><div class="aktp-grid"><div class="aktp-card"><div class="aktp-row"><div class="aktp-field"><label>Semester</label><select id="aktp-sem"><option value="1">Semester 1</option><option value="2">Semester 2</option></select></div><div class="aktp-field"><label>Kelas</label><select id="aktp-grade">${[1,2,3,4,5,6].map(n=>`<option value="${n}">Kelas ${n}</option>`).join('')}</select></div><div class="aktp-field"><label>Mapel</label><select id="aktp-subject"></select></div></div><div id="aktp-list" class="aktp-table"><div class="aktp-empty">Memuat...</div></div></div><div id="aktp-form" class="aktp-card"><h3 id="aktp-form-title" style="margin:0 0 5px">Tambah TP</h3><div class="aktp-note">Edit teks/topik aman karena ID TP tetap. Jika urutan TP yang sudah memiliki nilai diubah, sistem akan memberi peringatan karena posisi TP di Legger ikut berubah.</div><div class="aktp-field"><label>Urutan TP</label><input id="aktp-order" inputmode="numeric" placeholder="Contoh: 5"></div><div class="aktp-field" style="margin-top:9px"><label>Topik / Materi</label><input id="aktp-topic" placeholder="Materi atau topik"></div><div class="aktp-field" style="margin-top:9px"><label>Tujuan Pembelajaran</label><textarea id="aktp-desc" placeholder="Tuliskan tujuan pembelajaran..."></textarea></div><div style="display:flex;gap:8px;margin-top:10px"><button id="aktp-save" class="aktp-btn">Simpan TP</button><button id="aktp-cancel" class="aktp-btn alt" style="display:none">Batal Edit</button></div></div></div></div>`;
    try{
      S.boot=await api({action:'bootstrap'});
      // Backend lama menyembunyikan Tajwid dari bootstrap. Pulihkan hanya master subject
      // yang memang sudah ada agar dapat dipilih untuk membuat TP; tidak mengubah nilai.
      const tajwidGrades=[
        {grade_level:4,subject_id:'f0079185-add0-4a91-8e3d-98c95bbc1ee2',subject_code:'TJW-4'},
        {grade_level:5,subject_id:'1754e09f-5bf3-4d0e-acf5-6c33ce9f1da0',subject_code:'TJW-5'},
        {grade_level:6,subject_id:'0b2407c6-8ef7-4b5b-a430-bb72205cccc4',subject_code:'TJW-6'}
      ];
      if(!Array.isArray(S.boot.subjects))S.boot.subjects=[];
      let tajwid=S.boot.subjects.find(x=>String(x.name||'').trim().toLowerCase()==='tajwid');
      if(!tajwid){tajwid={name:'Tajwid',grades:[]};S.boot.subjects.push(tajwid)}
      const have=new Set((tajwid.grades||[]).map(x=>+x.grade_level));
      tajwidGrades.forEach(x=>{if(!have.has(+x.grade_level))tajwid.grades.push(x)});
      tajwid.grades.sort((a,b)=>+a.grade_level-+b.grade_level);
      S.boot.subjects.sort((a,b)=>String(a.name||'').localeCompare(String(b.name||''),'id'));
      S.semester=+S.boot.active_semester||1;S.grade=1;document.getElementById('aktp-sem').value=String(S.semester);document.getElementById('aktp-grade').value='1';fillSubjectOptions();
      document.getElementById('aktp-sem').onchange=async e=>{S.semester=+e.target.value;clearForm();await loadList()};
      document.getElementById('aktp-grade').onchange=async e=>{S.grade=+e.target.value;S.subjectId='';fillSubjectOptions();clearForm();await loadList()};
      document.getElementById('aktp-subject').onchange=async e=>{S.subjectId=e.target.value;clearForm();await loadList()};
      document.getElementById('aktp-save').onclick=()=>save(false);document.getElementById('aktp-cancel').onclick=clearForm;
      await loadList();
    }catch(e){status(e.message,true)}
  };

  function install(){
    enforceScope();
    if(typeof renderSidebar==='function'&&!renderSidebar.__cqAcademicTpScope){
      const old=renderSidebar;renderSidebar=function(){enforceScope();return old.apply(this,arguments)};renderSidebar.__cqAcademicTpScope=true;
    }
    if(typeof setActiveModule==='function'&&!setActiveModule.__cqAcademicTp){
      const old=setActiveModule;setActiveModule=function(id){if(isAcademic()&&String(id)==='master-tp-akademik'){try{activeModule='master-tp-akademik'}catch(_){};if(typeof renderSidebar==='function')renderSidebar();return window.renderAcademicMasterTP(document.getElementById('content'))}return old.apply(this,arguments)};setActiveModule.__cqAcademicTp=true;
    }
    if(isAcademic()&&typeof renderSidebar==='function')setTimeout(()=>{enforceScope();renderSidebar()},50);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
  window.__cqAcademicMasterTp=true;
})();
