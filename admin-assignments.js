/* CQlass Admin — Multi Penugasan Operasional. Role akun tidak diubah. */
(function(){'use strict';
if(window.__cqAdminAssignmentsV2)return;
window.__cqAdminAssignmentsV2=true;
const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/master-data-admin';
const S={boot:null};
const T=v=>String(v??'').trim(),E=v=>T(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function token(){try{return typeof getAuthToken==='function'?getAuthToken():localStorage.getItem('cqlass_session_token')}catch(_){return''}}
async function api(action,p={}){const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';const r=await fetch(BASE,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()||''},body:JSON.stringify({action,...p})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw Error(d.error||d.message||'Gagal memproses penugasan');return d}
function css(){if(document.getElementById('cqaa2-css'))return;const s=document.createElement('style');s.id='cqaa2-css';s.textContent=`
.cqaa2{max-width:1180px;margin:auto}.cqaa2-head{display:flex;justify-content:space-between;align-items:end;gap:10px;flex-wrap:wrap}.cqaa2-title{font-size:20px;font-weight:900;color:#153e3b}.cqaa2-sub{font-size:10px;color:#68817f;margin-top:2px}.cqaa2-note{margin-top:8px;padding:7px 9px;border:1px solid #c5e3df;background:#eef8f7;border-radius:9px;font-size:10px;color:#315d59;line-height:1.4}.cqaa2-grid{display:grid;grid-template-columns:380px 1fr;gap:10px;margin-top:10px}.cqaa2-card{background:#fff;border:1px solid #d8e7e5;border-radius:12px;padding:11px}.cqaa2-field{margin-bottom:9px}.cqaa2-field label{display:block;font-size:9.5px;font-weight:850;color:#55706d;margin-bottom:4px}.cqaa2-field select,.cqaa2-field input,.cqaa2-field textarea{width:100%;box-sizing:border-box;border:1px solid #bfd3d0;border-radius:8px;padding:7px 8px;background:#fff;font:inherit;font-size:11px}.cqaa2-types{display:flex;flex-wrap:wrap;gap:5px}.cqaa2-type{border:1px solid #d7e6e4;border-radius:8px;padding:5px 7px;display:flex!important;gap:5px;align-items:center;font-size:9.5px!important;font-weight:800;white-space:nowrap}.cqaa2-type input,.cqaa2-chip input{appearance:auto!important;-webkit-appearance:checkbox!important;width:14px!important;height:14px!important;min-width:14px!important;min-height:14px!important;margin:0!important;padding:0!important}.cqaa2-panel{display:none;margin:6px 0 8px;padding:8px;border:1px solid #e1ecea;border-radius:9px;background:#fbfdfd;font-size:10px}.cqaa2-panel.on{display:block}.cqaa2-chips{display:flex;flex-wrap:wrap;gap:4px;max-height:120px;overflow:auto;padding:2px}.cqaa2-chip{border:1px solid #d5e5e2;border-radius:999px;padding:3px 6px;font-size:9px!important;display:flex!important;align-items:center;gap:4px;background:#fff}.cqaa2-actions{display:flex;justify-content:flex-end;gap:6px}.cqaa2-btn{border:1px solid #bfd3d0;background:#fff;border-radius:8px;padding:6px 9px;font-size:9.5px;font-weight:850;cursor:pointer}.cqaa2-btn.pri{background:#0b7773;color:#fff;border-color:#0b7773}.cqaa2-search{width:100%;box-sizing:border-box;border:1px solid #bfd3d0;border-radius:8px;padding:7px 8px;margin-bottom:7px;font-size:11px}.cqaa2-table{width:100%;border-collapse:collapse;font-size:9.5px}.cqaa2-table th,.cqaa2-table td{padding:7px 6px;border-bottom:1px solid #e4edeb;text-align:left;vertical-align:top}.cqaa2-table th{font-size:8.5px;text-transform:uppercase;color:#6d817f}.cqaa2-badge{display:inline-block;padding:2px 6px;border-radius:999px;background:#eaf6f4;border:1px solid #c8e3df;color:#225e59;font-size:8.5px;font-weight:850}.cqaa2-empty{text-align:center;padding:18px;color:#829390;font-size:10px}.cqaa2-muted{font-size:8.8px;color:#7d908d;margin-top:3px}@media(max-width:900px){.cqaa2-grid{grid-template-columns:1fr}.cqaa2-table{min-width:680px}.cqaa2-scroll{overflow:auto}}
`;document.head.appendChild(s)}
const typeLabel=v=>({wali_kelas:'Wali Kelas',guru_partner:'Guru Partner',guru_mapel:'Guru Mapel',guru_tahfizh:'Guru Tahfizh',tugas_tambahan:'Tugas Tambahan'})[v]||v;
function classChecks(prefix){return (S.boot?.classes||[]).map(x=>'<label class="cqaa2-chip"><input type="checkbox" data-'+prefix+'-class value="'+E(x.id)+'"> '+E(x.name)+'</label>').join('')}
function subjectChecks(){return (S.boot?.subjects||[]).map(x=>'<label class="cqaa2-chip"><input type="checkbox" data-mapel-subject value="'+E(x.id)+'"> '+E(x.name)+'</label>').join('')}
function render(){
 const c=document.getElementById('content');if(!c)return;css();
 const teachers=(S.boot?.teachers||[]).map(x=>'<option value="'+E(x.id)+'">'+E(x.full_name)+'</option>').join('');
 c.innerHTML=`<div class="cqaa2"><div class="cqaa2-head"><div><div class="cqaa2-title">Penugasan Guru</div><div class="cqaa2-sub">${E(S.boot?.academic_year||'')} · Semester ${E(S.boot?.semester_no||'')}</div></div></div>
 <div class="cqaa2-note"><b>Multi-pilih aktif.</b> Satu guru dapat memiliki beberapa jenis penugasan sekaligus. Penugasan disinkronkan ke tabel operasional asli CQlass, tetapi <b>role akun tidak diubah</b>.</div>
 <div class="cqaa2-grid"><div class="cqaa2-card">
 <div class="cqaa2-field"><label>Guru</label><select id="cqaa2-teacher"><option value="">— Pilih guru —</option>${teachers}</select></div>
 <div class="cqaa2-field"><label>Pilih jenis penugasan</label><div class="cqaa2-types">
   <label class="cqaa2-type"><input type="checkbox" data-type="wali_kelas"> Wali Kelas</label>
   <label class="cqaa2-type"><input type="checkbox" data-type="guru_partner"> Guru Partner</label>
   <label class="cqaa2-type"><input type="checkbox" data-type="guru_mapel"> Guru Mapel</label>
   <label class="cqaa2-type"><input type="checkbox" data-type="guru_tahfizh"> Guru Tahfizh</label>
   <label class="cqaa2-type"><input type="checkbox" data-type="tugas_tambahan"> Tugas Tambahan</label>
 </div></div>
 <div id="p-wali" class="cqaa2-panel"><b>Wali Kelas</b><div class="cqaa2-muted">Boleh pilih lebih dari satu kelas.</div><div class="cqaa2-chips">${classChecks('wali')}</div></div>
 <div id="p-partner" class="cqaa2-panel"><b>Guru Partner</b><div class="cqaa2-muted">Maksimal 3 partner aktif per kelas.</div><div class="cqaa2-chips">${classChecks('partner')}</div></div>
 <div id="p-mapel" class="cqaa2-panel"><b>Guru Mapel</b><div class="cqaa2-muted">Setiap kombinasi kelas × mapel akan dibuat sebagai penugasan.</div><div class="cqaa2-field"><label>Kelas</label><div class="cqaa2-chips">${classChecks('mapel')}</div></div><div class="cqaa2-field"><label>Mata Pelajaran</label><div class="cqaa2-chips">${subjectChecks()}</div></div></div>
 <div id="p-tahfizh" class="cqaa2-panel"><b>Guru Tahfizh</b><div class="cqaa2-muted">Pilih kelas yang menjadi cakupan Tahfizh.</div><div class="cqaa2-chips">${classChecks('tahfizh')}</div><div class="cqaa2-field" style="margin-top:9px"><label>Nama tim/halaqah (opsional)</label><input id="cqaa2-team" placeholder="Contoh: Halaqah 4 / Tim A"></div></div>
 <div id="p-extra" class="cqaa2-panel"><b>Tugas Tambahan</b><div class="cqaa2-field"><label>Nama tugas</label><input id="cqaa2-title" placeholder="Contoh: PIC UKS, jaga gerbang, koordinator kegiatan"></div></div>
 <div class="cqaa2-field"><label>Catatan umum (opsional)</label><textarea id="cqaa2-notes" rows="3"></textarea></div>
 <div id="cqaa2-status" class="cqaa2-muted"></div><div class="cqaa2-actions"><button class="cqaa2-btn" onclick="adminAssignmentResetV2()">Bersihkan</button><button class="cqaa2-btn pri" id="cqaa2-save" onclick="adminAssignmentSaveV2()">Simpan Semua Penugasan</button></div>
 </div><div class="cqaa2-card"><input id="cqaa2-search" class="cqaa2-search" placeholder="Cari guru, kelas, mapel, jenis tugas..." oninput="adminAssignmentDrawV2()"><div id="cqaa2-list"></div></div></div></div>`;
 document.querySelectorAll('[data-type]').forEach(x=>x.addEventListener('change',toggle));const ts=document.getElementById('cqaa2-teacher');if(ts)ts.addEventListener('change',applyExisting);draw();
}
function applyExisting(){
  reset(false);
  const tid=document.getElementById('cqaa2-teacher')?.value||'';
  if(!tid)return;
  const op=S.boot?.operational||{};
  const checkType=t=>{const e=document.querySelector('[data-type="'+t+'"]');if(e)e.checked=true};
  const checkClasses=(rows,attr)=>{for(const r of rows||[]){if(T(r.teacher_id)!==tid)continue;const e=document.querySelector('['+attr+'][value="'+CSS.escape(T(r.class_id))+'"]');if(e)e.checked=true}};
  const partners=(op.partner||[]).filter(x=>T(x.teacher_id)===tid);
  if(partners.length){checkType('guru_partner');checkClasses(partners,'data-partner-class')}
  const tah=(op.tahfizh||[]).filter(x=>T(x.teacher_id)===tid);
  if(tah.length){checkType('guru_tahfizh');checkClasses(tah,'data-tahfizh-class');const team=tah.map(x=>T(x.team_name)).find(Boolean);if(team&&document.getElementById('cqaa2-team'))document.getElementById('cqaa2-team').value=team}
  const wal=(op.walas||[]).filter(x=>T(x.homeroom_teacher_id)===tid);
  if(wal.length){checkType('wali_kelas');for(const r of wal){const e=document.querySelector('[data-wali-class][value="'+CSS.escape(T(r.class_id))+'"]');if(e)e.checked=true}}
  const map=(op.mapel||[]).filter(x=>T(x.teacher_id)===tid);
  if(map.length){const e=document.querySelector('[data-type="guru_mapel"]');if(e)e.dataset.existing='1'}
  toggle();
}
function toggle(){const m={wali_kelas:'p-wali',guru_partner:'p-partner',guru_mapel:'p-mapel',guru_tahfizh:'p-tahfizh',tugas_tambahan:'p-extra'};document.querySelectorAll('[data-type]').forEach(x=>document.getElementById(m[x.dataset.type])?.classList.toggle('on',x.checked))}
function vals(sel){return [...document.querySelectorAll(sel+':checked')].map(x=>x.value)}
function buildItems(){
 const notes=T(document.getElementById('cqaa2-notes')?.value),out=[];
 const on=t=>document.querySelector('[data-type="'+t+'"]')?.checked;
 if(on('wali_kelas')) vals('[data-wali-class]').forEach(class_id=>out.push({assignment_type:'wali_kelas',class_id,notes}));
 if(on('guru_partner')) vals('[data-partner-class]').forEach(class_id=>out.push({assignment_type:'guru_partner',class_id,notes}));
 if(on('guru_tahfizh')) {const team_name=T(document.getElementById('cqaa2-team')?.value);vals('[data-tahfizh-class]').forEach(class_id=>out.push({assignment_type:'guru_tahfizh',class_id,team_name,notes}))}
 if(on('guru_mapel')) {const cs=vals('[data-mapel-class]'),ss=vals('[data-mapel-subject]');cs.forEach(class_id=>ss.forEach(subject_id=>out.push({assignment_type:'guru_mapel',class_id,subject_id,notes})))}
 if(on('tugas_tambahan')) out.push({assignment_type:'tugas_tambahan',title:T(document.getElementById('cqaa2-title')?.value),notes});
 return out;
}
async function save(){
 const teacher_id=document.getElementById('cqaa2-teacher')?.value||'',items=buildItems(),st=document.getElementById('cqaa2-status'),btn=document.getElementById('cqaa2-save');
 if(!teacher_id){st.textContent='Pilih guru terlebih dahulu.';return}
 if(!items.length){st.textContent='Pilih jenis tugas dan scope kelas/mapel yang diperlukan.';return}
 if(items.some(x=>x.assignment_type==='tugas_tambahan'&&!x.title)){st.textContent='Nama tugas tambahan wajib diisi.';return}
 btn.disabled=true;st.textContent='Menyimpan dan menyinkronkan penugasan...';
 try{await api('assignment_save_many',{teacher_id,items});S.boot=await api('assignment_bootstrap');render();showToast?.('Penugasan berhasil disimpan dan disinkronkan');}
 catch(e){st.textContent=e.message||'Gagal menyimpan';btn.disabled=false}
}
function reset(clearTeacher=true){document.querySelectorAll('[data-type], [data-wali-class], [data-partner-class], [data-mapel-class], [data-mapel-subject], [data-tahfizh-class]').forEach(x=>x.checked=false);['cqaa2-team','cqaa2-title','cqaa2-notes'].forEach(id=>{const e=document.getElementById(id);if(e)e.value=''});if(clearTeacher){const t=document.getElementById('cqaa2-teacher');if(t)t.value=''}toggle()}
function draw(){const root=document.getElementById('cqaa2-list');if(!root)return;const q=T(document.getElementById('cqaa2-search')?.value).toLowerCase(),tm=new Map((S.boot?.teachers||[]).map(x=>[x.id,x.full_name])),cm=new Map((S.boot?.classes||[]).map(x=>[x.id,x.name])),sm=new Map((S.boot?.subjects||[]).map(x=>[x.id,x.name]));const rows=(S.boot?.assignments||[]).filter(x=>[tm.get(x.teacher_id),typeLabel(x.assignment_type),cm.get(x.class_id),sm.get(x.subject_id),x.title,x.team_name,x.notes].join(' ').toLowerCase().includes(q));if(!rows.length){root.innerHTML='<div class="cqaa2-empty">Belum ada penugasan aktif.</div>';return}root.innerHTML='<div class="cqaa2-scroll"><table class="cqaa2-table"><thead><tr><th>Guru</th><th>Jenis</th><th>Scope</th><th>Sinkron</th><th>Aksi</th></tr></thead><tbody>'+rows.map(x=>{const scope=x.assignment_type==='tugas_tambahan'?(x.title||'-'):[cm.get(x.class_id)||'-',x.assignment_type==='guru_mapel'?sm.get(x.subject_id):'',x.assignment_type==='guru_tahfizh'?x.team_name:''].filter(Boolean).join(' · ');return '<tr><td><b>'+E(tm.get(x.teacher_id)||'Guru')+'</b></td><td><span class="cqaa2-badge">'+E(typeLabel(x.assignment_type))+'</span></td><td>'+E(scope)+'</td><td>'+E(x.operational_table||'internal')+'</td><td><button class="cqaa2-btn" onclick="adminAssignmentDeactivateV2(\''+E(x.id)+'\')">Nonaktifkan</button></td></tr>'}).join('')+'</tbody></table></div>'}
async function deactivate(id){if(!confirm('Nonaktifkan penugasan ini? Role akun tidak akan berubah.'))return;await api('assignment_deactivate',{id});S.boot=await api('assignment_bootstrap');render()}
async function load(){const c=document.getElementById('content');if(!c)return;css();c.innerHTML='<div class="card"><span class="spinner"></span> Memuat Penugasan...</div>';try{S.boot=await api('assignment_bootstrap');render()}catch(e){c.innerHTML='<div class="card">Penugasan belum dapat dimuat: '+E(e.message)+'</div>'}}
window.renderAdminAssignments=load;window.adminAssignmentSaveV2=save;window.adminAssignmentResetV2=reset;window.adminAssignmentDrawV2=draw;window.adminAssignmentDeactivateV2=deactivate;
})();