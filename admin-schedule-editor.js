/* CQlass — Admin Schedule Editor
   Satu pintu perubahan master jadwal: Admin. */
(function(){
  'use strict';
  if(window.__CQ_ADMIN_SCHEDULE_EDITOR__) return;

  const BASE=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/admin-schedule-editor';
  const S={boot:null,classId:'',day:'',items:[],editing:null};
  const DAYS={1:'Senin',2:'Selasa',3:'Rabu',4:'Kamis',5:'Jumat',6:'Sabtu',7:'Ahad'};
  const esc=v=>typeof escapeHtml==='function'?escapeHtml(String(v??'')):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const t5=v=>String(v||'').slice(0,5);

  function isAdmin(){try{return String(currentUser?.role||'').toLowerCase()==='admin'}catch(_){return false}}
  function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}}
  async function api(action,p={}){
    const key=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
    const r=await fetch(BASE,{method:'POST',headers:{'Content-Type':'application/json','apikey':key,'Authorization':'Bearer '+key,'x-session-token':token()},body:JSON.stringify({action,...p})});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.success===false){const e=new Error(d.error||'Gagal memproses jadwal.');e.data=d;throw e}
    return d;
  }
  function msg(e){
    const m=String(e?.message||e||'');
    const map={
      admin_only:'Akses perubahan jadwal hanya untuk Admin.',
      invalid_input:'Lengkapi semua data jadwal.',
      invalid_time_range:'Jam selesai harus lebih besar dari jam mulai.',
      schedule_not_found:'Slot jadwal tidak ditemukan.',
      master_reference_invalid:'Data kelas, mapel, atau guru tidak valid.',
      subject_grade_mismatch:'Mapel tidak sesuai dengan jenjang kelas.',
      teacher_conflict:'Guru tersebut sudah memiliki jadwal lain pada jam yang sama.',
      class_conflict:'Kelas tersebut sudah memiliki jadwal lain pada jam yang sama.'
    };
    return map[m]||m||'Terjadi kendala.';
  }
  function css(){
    if(document.getElementById('cq-admin-schedule-css'))return;
    const s=document.createElement('style');s.id='cq-admin-schedule-css';s.textContent=`
      .ase{max-width:1480px;margin:auto;color:#173b39}.ase *{box-sizing:border-box}.aseh{padding:18px 20px;border-radius:18px;background:linear-gradient(100deg,#fff,#eff9f6);border:1px solid #d8eae6;margin-bottom:12px}.aseh h2{margin:0;font:800 26px/1.1 Poppins,sans-serif}.aseh h2 span{color:#239b78}.aseh p{margin:7px 0 0;font-size:10px;color:#667d78}.asecard{background:#fff;border:1px solid #dceae7;border-radius:15px;padding:13px;box-shadow:0 7px 20px rgba(18,61,57,.04)}.asefilters{display:grid;grid-template-columns:1.2fr .7fr auto;gap:9px;align-items:end}.asefield label{display:block;font-size:8px;font-weight:900;color:#6b817c;text-transform:uppercase;margin-bottom:5px}.asefield select,.asefield input,.asefield textarea{width:100%;min-height:38px;border:1px solid #bfd5d1;border-radius:9px;background:#fff;padding:0 10px;font:500 10px Inter,sans-serif}.asefield textarea{height:62px;padding:8px;resize:vertical}.asebtn{border:0;border-radius:9px;padding:10px 13px;background:#0c7b71;color:#fff;font-size:9px;font-weight:900;cursor:pointer}.asebtn.sec{background:#edf7f4;color:#0c7369;border:1px solid #cfe4df}.asebtn.danger{background:#fff1f1;color:#aa4545;border:1px solid #f0cccc}.asewrap{overflow:auto;margin-top:12px;border:1px solid #e1ece9;border-radius:11px}.asetable{width:100%;border-collapse:collapse;min-width:900px}.asetable th,.asetable td{padding:9px 10px;border-bottom:1px solid #edf2f0;font-size:9px;text-align:left}.asetable th{background:#f3f8f7;font-size:8px;color:#667c77;text-transform:uppercase}.asepill{display:inline-block;padding:4px 7px;border-radius:99px;background:#eaf6f2;color:#0d766b;font-size:8px;font-weight:850}.aseempty{padding:24px;text-align:center;color:#7c8f8b;font-size:10px}.aseedit{margin-top:12px;padding:13px;border:1px solid #cfe3df;border-radius:13px;background:#f7fbfa}.aseedit h3{margin:0 0 10px;font-size:12px}.asegrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.asegrid2{display:grid;grid-template-columns:1.3fr 1fr auto;gap:9px;align-items:end;margin-top:9px}.asewarn{margin-top:8px;font-size:9px;color:#a34b3f;min-height:14px}.asehint{margin-top:7px;font-size:8px;color:#778b86}.asebar{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:10px}.asebar b{font-size:10px}.asehist{font-size:8px;color:#718681}
      @media(max-width:900px){.asefilters,.asegrid,.asegrid2{grid-template-columns:1fr 1fr}.asegrid2 .asebtn{grid-column:1/-1}}@media(max-width:600px){.asefilters,.asegrid,.asegrid2{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }
  function subjectOptions(selected,classId){
    const cl=(S.boot?.classes||[]).find(x=>String(x.id)===String(classId));
    const grade=cl?.grade_level;
    return (S.boot?.subjects||[]).filter(x=>grade==null||x.grade_level==null||Number(x.grade_level)===Number(grade)).map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selected)?'selected':''}>${esc(x.name)}</option>`).join('');
  }
  function teacherOptions(selected){return (S.boot?.teachers||[]).map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selected)?'selected':''}>${esc(x.name)}</option>`).join('')}
  function classOptions(selected){return (S.boot?.classes||[]).map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(selected)?'selected':''}>${esc(x.name)}</option>`).join('')}
  function editor(){
    const x=S.editing;if(!x)return'';
    const cl=x.class_id||S.classId;
    return `<div class="aseedit"><h3>Edit Slot Jadwal</h3><div class="asegrid">
      <div class="asefield"><label>Kelas</label><select id="ase-e-class">${classOptions(cl)}</select></div>
      <div class="asefield"><label>Hari</label><select id="ase-e-day">${Object.entries(DAYS).map(([k,v])=>`<option value="${k}" ${Number(k)===Number(x.day_of_week)?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="asefield"><label>Jam Mulai</label><input id="ase-e-start" type="time" value="${esc(t5(x.start_time))}"></div>
      <div class="asefield"><label>Jam Selesai</label><input id="ase-e-end" type="time" value="${esc(t5(x.end_time))}"></div>
      <div class="asefield"><label>Mapel</label><select id="ase-e-subject">${subjectOptions(x.subject_id,cl)}</select></div>
      <div class="asefield"><label>Guru</label><select id="ase-e-teacher">${teacherOptions(x.teacher_id)}</select></div>
      <div class="asefield" style="grid-column:span 2"><label>Alasan Koreksi</label><input id="ase-e-reason" placeholder="Contoh: koreksi bentrok jadwal / salah input kelas"></div>
    </div><div class="asebar"><span class="asehist">Perubahan disimpan ke riwayat audit jadwal.</span><div><button class="asebtn sec" onclick="adminScheduleCancelEdit()">Batal</button> <button class="asebtn" onclick="adminScheduleSave()">Simpan Perubahan</button></div></div><div id="ase-msg" class="asewarn"></div></div>`;
  }
  function rows(){
    if(!S.classId)return'<tr><td colspan="7" class="aseempty">Pilih kelas untuk melihat jadwal.</td></tr>';
    if(!S.items.length)return'<tr><td colspan="7" class="aseempty">Tidak ada jadwal pada filter ini.</td></tr>';
    return S.items.map(x=>`<tr><td><b>${esc(DAYS[x.day_of_week]||x.day_of_week)}</b></td><td>${esc(t5(x.start_time))}–${esc(t5(x.end_time))}</td><td><span class="asepill">${esc(x.classes?.name||'—')}</span></td><td><b>${esc(x.subjects?.name||x.subject_name_raw||'—')}</b></td><td>${esc(x.teachers?.full_name||x.teacher_name_raw||'—')}</td><td>${esc(x.slot_label||'')}</td><td><button class="asebtn sec" onclick="adminScheduleEdit('${esc(x.id)}')">Edit</button></td></tr>`).join('');
  }
  function draw(){
    const c=document.getElementById('content');if(!c)return;
    c.innerHTML=`<div class="ase"><div class="aseh"><h2>Edit <span>Jadwal Pelajaran</span></h2><p>Satu pintu perubahan master jadwal melalui Admin. Perubahan langsung dipakai Badal Guru dan modul lain yang membaca jadwal master.</p></div><div class="asecard"><div class="asefilters"><div class="asefield"><label>Kelas</label><select id="ase-class"><option value="">Pilih kelas...</option>${classOptions(S.classId)}</select></div><div class="asefield"><label>Hari</label><select id="ase-day"><option value="">Semua hari</option>${Object.entries(DAYS).slice(0,5).map(([k,v])=>`<option value="${k}" ${String(k)===String(S.day)?'selected':''}>${v}</option>`).join('')}</select></div><button class="asebtn" id="ase-load">Muat Jadwal</button></div><div class="asehint">Sistem menolak penyimpanan jika kelas atau guru masih bentrok pada jam yang sama.</div>${editor()}<div class="asewrap"><table class="asetable"><thead><tr><th>Hari</th><th>Jam</th><th>Kelas</th><th>Mapel</th><th>Guru</th><th>Slot</th><th>Aksi</th></tr></thead><tbody>${rows()}</tbody></table></div></div></div>`;
    wire();
  }
  function wire(){
    const c=document.getElementById('content');if(!c)return;
    const cls=c.querySelector('#ase-class'),day=c.querySelector('#ase-day');
    c.querySelector('#ase-load')?.addEventListener('click',async()=>{S.classId=cls?.value||'';S.day=day?.value||'';S.editing=null;await loadItems()});
    const ecl=c.querySelector('#ase-e-class');
    ecl?.addEventListener('change',()=>{const sel=c.querySelector('#ase-e-subject');if(sel)sel.innerHTML=subjectOptions('',ecl.value)});
  }
  async function loadItems(){
    const c=document.getElementById('content');if(c)c.innerHTML='<div class="ase"><div class="asecard aseempty">Memuat jadwal...</div></div>';
    try{const d=await api('list_schedule',{class_id:S.classId,day_of_week:S.day});S.items=d.items||[];draw()}catch(e){if(c)c.innerHTML=`<div class="ase"><div class="asecard aseempty">${esc(msg(e))}</div></div>`}
  }
  async function render(c){
    if(!isAdmin()){c.innerHTML='<div class="card">Akses hanya untuk Admin.</div>';return}
    css();c.innerHTML='<div class="ase"><div class="asecard aseempty">Memuat editor jadwal...</div></div>';
    try{S.boot=await api('bootstrap');draw()}catch(e){c.innerHTML=`<div class="ase"><div class="asecard aseempty">${esc(msg(e))}</div></div>`}
  }
  window.renderAdminScheduleEditor=render;
  window.adminScheduleEdit=id=>{S.editing=(S.items||[]).find(x=>String(x.id)===String(id))||null;draw()};
  window.adminScheduleCancelEdit=()=>{S.editing=null;draw()};
  window.adminScheduleSave=async()=>{
    if(!S.editing)return;
    const c=document.getElementById('content'),m=c?.querySelector('#ase-msg');
    const payload={id:S.editing.id,class_id:c?.querySelector('#ase-e-class')?.value||'',day_of_week:Number(c?.querySelector('#ase-e-day')?.value||0),start_time:c?.querySelector('#ase-e-start')?.value||'',end_time:c?.querySelector('#ase-e-end')?.value||'',subject_id:c?.querySelector('#ase-e-subject')?.value||'',teacher_id:c?.querySelector('#ase-e-teacher')?.value||'',reason:c?.querySelector('#ase-e-reason')?.value||''};
    try{
      const d=await api('save_schedule',payload);
      if(typeof showToast==='function')showToast('Jadwal berhasil diperbarui.');
      S.classId=payload.class_id;S.day=String(payload.day_of_week);S.editing=null;await loadItems();
    }catch(e){if(m)m.textContent=msg(e)}
  };
  window.__CQ_ADMIN_SCHEDULE_EDITOR__=true;
})();
