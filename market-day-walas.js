/* Market Day: isolated renderer. Server enforces role, assignment and period. */
(function(){
'use strict';
const indicators=['Aktif / cekatan menawarkan produk','Berani dan percaya diri saat berjualan','Tetap berjualan meskipun sepi','Kreatif dalam promosi produk','Menjaga dan menghitung uang / produk','Bekerja sama dengan teman','Penerapan bahasa Inggris / Arab'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(action,payload={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);try{const r=await fetch(`${SUPABASE_URL}/functions/v1/admin-academic-period/market-day`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':getAuthToken()},body:JSON.stringify({action,...payload}),signal:controller.signal});const j=await r.json();if(!r.ok||!j.success)throw Error(j.error||'Gagal memproses laporan.');return j}finally{clearTimeout(timer)}}
window.renderMarketDayWalas=async function(content){
 if(typeof currentUser==='undefined'||currentUser?.role!=='walas'){content.textContent='Akses khusus wali kelas.';return}
 const mountId=String(Date.now())+Math.random();content.dataset.marketDayMount=mountId;
 const identity=currentUser.username;const alive=()=>content.isConnected&&currentUser?.role==='walas'&&currentUser.username===identity&&content.dataset.marketDayMount===mountId&&activeModule==='market-day';
 content.innerHTML='<div class="card"><span class="spinner"></span> Memuat Penilaian Market Day…</div>';
 let boot,students=[],report=null,data,step=0,busy=false,dirty=false;
 try{boot=await api('bootstrap');if(!alive())return}catch(e){if(alive())content.textContent=e.message;return}
 let classId=boot.classes[0]?.id;
 const empty=()=>({event_status:'not_scheduled',date:'',capital:0,groups:[],assessments:students.map(s=>({student_id:s.id,attendance:'pending',scores:Array(7).fill(null),note:''}))});
 async function load(){busy=true;try{const r=await api('load',{class_id:classId});if(!alive())return;students=r.students;selected='';report=r.report;data=report?.data||empty();for(const s of students)if(!data.assessments.some(a=>a.student_id===s.id))data.assessments.push({student_id:s.id,attendance:'pending',scores:Array(7).fill(null),note:''});dirty=false;draw()}catch(e){if(alive())content.textContent=e.message}finally{busy=false}}
 function draw(){if(!alive())return;content.innerHTML=`<div id="cq-market-day"><style>
#cq-market-day{font-family:Tahoma,sans-serif;--md-ink:#193b40;--md-teal:#0d7377;--md-soft:#edf8f6;color:var(--md-ink)}
#cq-market-day *{box-sizing:border-box}
#cq-market-day .card{padding:22px;border:1px solid #dcebe8;border-radius:16px;box-shadow:0 4px 18px #163d3910;background:#fff;margin-bottom:18px}
#cq-market-day .page-title{color:var(--md-teal);margin-bottom:8px}
#cq-market-day .page-sub{margin-bottom:20px}
#cq-market-day .md-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(220px,100%),1fr));gap:16px}
#cq-market-day label{display:block;margin:8px 0;color:var(--md-ink)}
#cq-market-day input:not([type=checkbox]),#cq-market-day select,#cq-market-day textarea{display:block;width:100%;padding:12px;margin-top:7px;font:inherit;border:1px solid #cededa;border-radius:10px;min-height:44px;background:#fbfdfd;color:var(--md-ink)}
#cq-market-day input:focus-visible,#cq-market-day select:focus-visible,#cq-market-day textarea:focus-visible{outline:3px solid #b3dcda;outline-offset:2px}
#cq-market-day button{margin:4px;min-height:42px;border-radius:10px}
#cq-market-day .md-tabs{display:flex;flex-wrap:wrap;gap:8px;border-bottom:1px solid #e3eeeb;padding-bottom:16px;margin-bottom:20px}
#cq-market-day .md-tabs button{flex:1 1 150px;margin:0;background:#f2f6f5;color:#435d60;border:1px solid transparent;padding:12px 16px}
#cq-market-day .md-tabs button.btn-primary{background:var(--md-teal);color:#fff;box-shadow:0 3px 9px #0d737725}
#cq-market-day .md-table{overflow:auto}#cq-market-day table{border-collapse:collapse;width:100%}
#cq-market-day th,#cq-market-day td{padding:13px;text-align:left;border-bottom:1px solid #e4eeeb}
#cq-market-day th{background:var(--md-soft)}#cq-market-day .md-score{min-width:85px}
#cq-market-day .md-group{padding:20px;margin:18px 0;background:#fff;border:1px solid #d6e5e2;border-radius:14px;border-top:4px solid var(--md-teal)}
#cq-market-day .md-member-head{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin:22px 0 12px;font-weight:600}
#cq-market-day .md-count{font-size:12px;font-weight:400;background:var(--md-soft);color:#28595b;padding:6px 10px;border-radius:20px}
#cq-market-day .md-members{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(230px,100%),1fr));gap:10px;align-items:stretch}
#cq-market-day .md-members label.md-member{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:10px!important;margin:0!important;padding:12px!important;min-height:66px;height:auto!important;width:auto!important;border:1px solid #dae6e3;border-radius:10px;background:#fafcfb;cursor:pointer;font-size:13px;line-height:1.5;transition:background .15s,border-color .15s}
#cq-market-day .md-members input[type=checkbox]{appearance:auto!important;display:inline-block!important;flex:0 0 19px!important;width:19px!important;height:19px!important;min-width:19px!important;min-height:19px!important;max-width:19px!important;margin:0!important;padding:0!important;border-radius:4px;accent-color:var(--md-teal);position:static!important;vertical-align:middle}
#cq-market-day .md-member-text{min-width:0;overflow-wrap:anywhere}
#cq-market-day .md-member-name{display:block;font-weight:500}
#cq-market-day .md-member-status{display:block;font-size:11px;color:#657b7e;margin-top:3px}
#cq-market-day .md-members label:has(input:checked){background:#e5f5f0;border-color:#58a99a;box-shadow:inset 3px 0 #168676}
#cq-market-day .md-members label:has(input:disabled){background:#f3f4f4;border-color:#e4e8e7;color:#7e8b8d;cursor:not-allowed;box-shadow:none}
#cq-market-day .md-actions{display:flex;align-items:center;flex-wrap:wrap;gap:8px}
#cq-market-day #md-state{display:inline-block;background:#edf4fb;color:#305877;padding:7px 12px;border-radius:20px;font-size:13px}
#cq-market-day #md-average{padding:14px 16px;border-radius:10px;background:var(--md-soft);font-weight:600;color:var(--md-teal)}
#cq-market-day #md-panel>p{color:#547174}
@media(max-width:600px){#cq-market-day .card{padding:15px}#cq-market-day .md-group{padding:13px}#cq-market-day .md-members{grid-template-columns:1fr}#cq-market-day .md-tabs button{flex-basis:100%}}
</style>
 <div class="page-title">Penilaian Market Day</div><div class="page-sub">${esc(boot.academic_year)} · Semester ${boot.semester_no} · Satu laporan per kelas setiap semester</div>
 <div class="card"><label>Kelas<select id="md-class">${boot.classes.map(c=>`<option value="${esc(c.id)}" ${c.id===classId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><p id="md-state">${report?.status==='submitted'?'Sudah dikirim · dapat diperbaiki pada laporan yang sama':report?'Draf tersimpan':'Belum diisi'}</p><p>Kelas yang belum mendapat jadwal tidak dianggap terlambat mengisi.</p></div>
 <div class="card"><div class="md-tabs">${['Kegiatan','Kelompok','Penilaian Siswa'].map((s,i)=>`<button class="btn ${step===i?'btn-primary':''}" data-tab="${i}" type="button">${s}</button>`).join('')}</div><div id="md-panel">${panel()}</div></div>
 <div class="card md-actions"><button type="button" class="btn" id="md-save">Simpan Draf</button><button type="button" class="btn btn-primary" id="md-submit">Kirim Penilaian</button><span id="md-message" role="status" aria-live="polite"></span></div></div>`;
 const q=s=>content.querySelector(s);q('#md-class').onchange=async e=>{if(dirty&&!confirm('Ada perubahan belum disimpan. Pindah kelas tanpa menyimpan?')){e.target.value=classId;return}classId=e.target.value;await load()};content.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{step=Number(b.dataset.tab);draw()});
 const bind=(id,key,convert=v=>v)=>{const el=q(id);if(el)el.onchange=()=>{data[key]=convert(el.value);dirty=true}};bind('#md-event','event_status');bind('#md-date','date');bind('#md-capital','capital',Number);
 const add=q('#md-add');if(add)add.onclick=()=>{data.groups.push({name:'Kelompok '+(data.groups.length+1),product:'',profit:0,documentation:'',members:[]});dirty=true;draw()};
 content.querySelectorAll('[data-group]').forEach(el=>el.onchange=()=>{const g=data.groups[Number(el.dataset.group)];g[el.dataset.field]=el.dataset.field==='profit'?Number(el.value):el.value;dirty=true});
 content.querySelectorAll('[data-member]').forEach(el=>el.onchange=()=>{const g=data.groups[Number(el.dataset.member)];g.members=el.checked?[...g.members,el.value]:g.members.filter(id=>id!==el.value);dirty=true;
 content.querySelectorAll('[data-member]').forEach(box=>{const index=Number(box.dataset.member),own=data.groups[index].members.includes(box.value),other=data.groups.some((group,j)=>j!==index&&group.members.includes(box.value));box.disabled=other;box.checked=own;box.closest('label').querySelector('.md-member-status').textContent=other?'Sudah di kelompok lain':own?'Terpilih':'Klik untuk memilih';});
 content.querySelectorAll('[data-count]').forEach(count=>count.textContent=data.groups[Number(count.dataset.count)].members.length+' siswa dipilih');
 });
 content.querySelectorAll('[data-remove]').forEach(el=>el.onclick=()=>{if(confirm('Hapus kelompok ini dari laporan?')){data.groups.splice(Number(el.dataset.remove),1);dirty=true;draw()}});
 const student=q('#md-student');if(student)student.onchange=()=>{selected=student.value;draw()};const a=data.assessments.find(x=>x.student_id===(selected||students[0]?.id));if(a){const att=q('#md-attendance');if(att)att.onchange=()=>{a.attendance=att.value;dirty=true;draw()};content.querySelectorAll('[data-score]').forEach(el=>el.onchange=()=>{a.scores[Number(el.dataset.score)]=el.value?Number(el.value):null;dirty=true;average()});const note=q('#md-note');if(note)note.oninput=()=>{a.note=note.value;dirty=true}}
 function average(){if(!a||!q('#md-average'))return;q('#md-average').textContent=a.attendance==='present'&&a.scores.every(n=>Number.isInteger(n)&&n>=1&&n<=4)?'Rata-rata: '+(a.scores.reduce((x,y)=>x+y,0)/7).toFixed(2)+' / 4':'Rata-rata: —';}average();
 async function save(submit){if(busy)return;busy=true;content.querySelectorAll('input,select,textarea,button').forEach(e=>e.disabled=true);q('#md-message').textContent='Menyimpan…';try{const result=await api('save',{class_id:classId,academic_year_id:boot.academic_year_id,semester_no:boot.semester_no,version:report?.version||0,data,submit});if(!alive())return;report=result.report;dirty=false;draw();q('#md-message').textContent=submit?'Penilaian berhasil dikirim.':'Draf berhasil disimpan.'}catch(e){if(alive()){draw();q('#md-message').textContent=e.name==='AbortError'?'Waktu tunggu habis. Muat ulang untuk memeriksa hasil penyimpanan sebelum mencoba lagi.':e.message}}finally{busy=false}}
 q('#md-save').onclick=()=>save(false);q('#md-submit').onclick=()=>save(true);
 }
 let selected='';
 function panel(){if(step===0)return `<div class="md-grid"><label>Status kegiatan<select id="md-event">${[['not_scheduled','Belum dijadwalkan'],['scheduled','Menunggu pelaksanaan'],['completed','Sudah dilaksanakan']].map(([v,t])=>`<option value="${v}" ${data.event_status===v?'selected':''}>${t}</option>`).join('')}</select></label><label>Tanggal pelaksanaan<input id="md-date" type="date" value="${esc(data.date||'')}"></label><label>Modal kelas (Rp)<input id="md-capital" type="number" min="0" value="${data.capital}"></label></div>`;
 if(step===1)return `${data.groups.map((g,i)=>`<div class="md-group"><div class="md-grid">${[['name','Nama kelompok'],['product','Produk yang ditawarkan'],['profit','Keuntungan bersih (Rp; boleh minus jika rugi)'],['documentation','Link dokumentasi foto / folder']].map(([f,l])=>`<label>${l}<input data-group="${i}" data-field="${f}" type="${f==='profit'?'number':f==='documentation'?'url':'text'}" value="${esc(g[f])}"></label>`).join('')}</div><div class="md-member-head"><span>Anggota kelompok</span><span class="md-count" data-count="${i}">${g.members.length} siswa dipilih</span></div><div class="md-members">${students.map(s=>{const other=data.groups.some((x,j)=>j!==i&&x.members.includes(s.id));return `<label class="md-member"><input type="checkbox" data-member="${i}" value="${s.id}" ${g.members.includes(s.id)?'checked':''} ${other?'disabled':''}><span class="md-member-text"><span class="md-member-name">${esc(s.full_name)}</span><span class="md-member-status">${other?'Sudah di kelompok lain':g.members.includes(s.id)?'Terpilih':'Klik untuk memilih'}</span></span></label>`}).join('')}</div><button class="btn" data-remove="${i}" type="button">Hapus kelompok</button></div>`).join('')}<button class="btn" id="md-add" type="button">Tambah kelompok</button><p>Total keuntungan: Rp${data.groups.reduce((n,g)=>n+Number(g.profit||0),0).toLocaleString('id-ID')}</p>`;
 const id=selected||students[0]?.id,a=data.assessments.find(x=>x.student_id===id);if(!a)return '<p>Daftar siswa belum tersedia untuk kelas dan semester ini.</p>';
 return `<label>Nama siswa<select id="md-student">${students.map(s=>`<option value="${s.id}" ${s.id===id?'selected':''}>${esc(s.full_name)}</option>`).join('')}</select></label><label>Keikutsertaan<select id="md-attendance">${[['pending','Belum dinilai'],['present','Hadir · dinilai'],['absent','Tidak hadir']].map(([v,t])=>`<option value="${v}" ${a.attendance===v?'selected':''}>${t}</option>`).join('')}</select></label><details><summary>Panduan skor 1–4</summary><p>1: Perlu banyak bimbingan · 2: Berkembang dengan bantuan · 3: Mandiri · 4: Konsisten dan berinisiatif</p><p>Kategori belum ditetapkan sekolah; sistem hanya menghitung rata-rata.</p></details><div class="md-table"><table><thead><tr><th>Indikator</th><th>Skor</th></tr></thead><tbody>${indicators.map((t,i)=>`<tr><td>${t}</td><td><select class="md-score" data-score="${i}" aria-label="${esc(t)}" ${a.attendance!=='present'?'disabled':''}><option value="">—</option>${[1,2,3,4].map(n=>`<option ${a.scores[i]===n?'selected':''}>${n}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div><p id="md-average"></p><label>Catatan siswa (opsional)<textarea id="md-note" maxlength="2000">${esc(a.note)}</textarea></label>`;
 }
 await load();
};
})();
