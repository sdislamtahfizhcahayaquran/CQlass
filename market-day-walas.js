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

#cq-market-day .md-sheet-wrap{overflow:auto;max-height:70vh;border:1px solid #ccdfd9;border-radius:10px;margin-top:12px}
#cq-market-day .md-sheet{width:100%;min-width:1330px;border-collapse:separate;border-spacing:0;table-layout:fixed;font-size:13px}
#cq-market-day .md-sheet caption{text-align:left;padding:12px;background:#f1f8f5;font-weight:500}
#cq-market-day .md-sheet th,#cq-market-day .md-sheet td{border-right:1px solid #dce8e3;border-bottom:1px solid #dce8e3;padding:0;background:#fff}
#cq-market-day .md-sheet thead th{position:sticky;top:0;z-index:3;background:#e7f2ed;padding:10px 6px;text-align:center;font-weight:600;width:100px}
#cq-market-day .md-sheet .md-scorehead{width:86px}#cq-market-day .md-scorehead span{display:block;color:#668177;font-size:11px;margin-bottom:5px}
#cq-market-day .md-sheet .md-rownum{width:45px;text-align:center;background:#f0f6f3;color:#5f756d}
#cq-market-day .md-sheet .md-namecol{position:sticky;left:0;width:220px;z-index:2;background:#f9fcfa;padding:10px 12px;line-height:1.5;font-weight:500;text-align:left}
#cq-market-day .md-sheet thead .md-namecol{z-index:4;background:#e7f2ed}
#cq-market-day .md-sheet thead th:nth-child(3){width:160px}#cq-market-day .md-sheet thead th:last-child{width:240px}
#cq-market-day .md-sheet input:not([type=checkbox]),#cq-market-day .md-sheet select{margin:0;padding:9px 5px;min-height:42px;border:0;border-radius:0;background:transparent;font-size:13px;box-shadow:none}
#cq-market-day .md-sheet input[data-score-col]{text-align:center;font-weight:600;font-size:15px}
#cq-market-day .md-sheet input:disabled{background:#f1f3f2;color:#8e9c95}
#cq-market-day .md-sheet input[aria-invalid=true]{background:#fff0ef;outline:2px solid #b54545;outline-offset:-2px}
#cq-market-day .md-sheet input:focus,#cq-market-day .md-sheet select:focus{outline:2px solid #18846c;outline-offset:-2px;background:#edfaf5}
#cq-market-day .md-sheet tbody tr:hover .md-namecol{background:#e9f6ef}
#cq-market-day .md-sheet .md-avg-cell{background:#edf7f1;text-align:center;font-weight:600;color:#176949}
#cq-market-day .md-sheet-heading h3{margin:0 0 8px}#cq-market-day .md-sheet-heading p{margin:0 0 12px;color:#547174}
#cq-market-day .md-sheet{min-width:1895px}
#cq-market-day .md-sheet thead{position:sticky;top:0;z-index:5}
#cq-market-day .md-sheet thead th{position:static;width:auto!important;background:#d9efeb;vertical-align:middle;line-height:1.5;padding:10px 8px}
#cq-market-day .md-sheet thead .md-namecol{position:sticky;left:0}
#cq-market-day .md-sheet thead .md-entrepreneurship{background:#0d7377;color:#fff;font-size:16px;font-weight:600}
#cq-market-day .md-sheet thead tr:nth-child(2) th{background:#c7e7df}
#cq-market-day .md-sheet thead tr:nth-child(3) th{font-weight:400;background:#e9f6f1}
#cq-market-day .md-category{text-align:center;color:#698077;background:#f6f9f7}
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
 function refreshRow(row){const a=data.assessments.find(x=>x.student_id===students[row].id),tr=q(`[data-student-row="${row}"]`);if(!a||!tr)return;tr.querySelectorAll('[data-score-col]').forEach(input=>{input.disabled=a.attendance!=='present';input.value=a.scores[Number(input.dataset.scoreCol)]??'';input.setCustomValidity('');input.setAttribute('aria-invalid','false')});tr.querySelector('[data-row-average]').textContent=a.attendance==='present'&&a.scores.every(n=>Number.isInteger(n)&&n>=1&&n<=4)?(a.scores.reduce((x,y)=>x+y,0)/7).toFixed(2):'—';}
 content.querySelectorAll('[data-row-attendance]').forEach(el=>el.onchange=()=>{const row=Number(el.dataset.rowAttendance);data.assessments.find(a=>a.student_id===students[row].id).attendance=el.value;dirty=true;refreshRow(row)});
 content.querySelectorAll('[data-row-note]').forEach(el=>el.oninput=()=>{data.assessments.find(a=>a.student_id===students[Number(el.dataset.rowNote)].id).note=el.value;dirty=true});
 content.querySelectorAll('[data-score-col]').forEach(el=>{
   el.oninput=()=>{const row=Number(el.dataset.scoreRow),col=Number(el.dataset.scoreCol),value=el.value.trim(),a=data.assessments.find(x=>x.student_id===students[row].id);const valid=value===''||/^[1-4]$/.test(value);el.setCustomValidity(valid?'':'Isi skor 1 sampai 4.');el.setAttribute('aria-invalid',String(!valid));if(valid){a.scores[col]=value===''?null:Number(value);dirty=true;const avg=q(`[data-student-row="${row}"] [data-row-average]`);avg.textContent=a.scores.every(n=>Number.isInteger(n)&&n>=1&&n<=4)?(a.scores.reduce((x,y)=>x+y,0)/7).toFixed(2):'—';}else q('#md-grid-message').textContent='Skor hanya boleh 1–4. Kosongkan jika belum dinilai.';};
   el.onkeydown=e=>{if(!['Enter','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const direction=e.key==='ArrowUp'||e.shiftKey?-1:1;let row=Number(el.dataset.scoreRow)+direction;while(row>=0&&row<students.length){const next=q(`[data-score-row="${row}"][data-score-col="${el.dataset.scoreCol}"]`);if(next&&!next.disabled){next.focus();next.select();break}row+=direction}};
   el.onpaste=e=>{const raw=e.clipboardData.getData('text');if(!/[\t\n\r]/.test(raw))return;e.preventDefault();const matrix=raw.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(line=>line.split('\t'));const startRow=Number(el.dataset.scoreRow),startCol=Number(el.dataset.scoreCol);const updates=[];for(let r=0;r<matrix.length;r++){const row=startRow+r;if(row>=students.length){q('#md-grid-message').textContent='Tempelan melebihi jumlah siswa. Tidak ada nilai diubah.';return}const a=data.assessments.find(x=>x.student_id===students[row].id);if(a.attendance!=='present'){q('#md-grid-message').textContent='Semua baris tujuan harus berstatus Hadir · dinilai. Tidak ada nilai diubah.';return}for(let c=0;c<matrix[r].length;c++){const value=matrix[r][c].trim();if(startCol+c>6||value!==''&&!/^[1-4]$/.test(value)){q('#md-grid-message').textContent='Tempel hanya 7 kolom skor 1–4 atau kosong. Tidak ada nilai diubah.';return}updates.push({a,row,col:startCol+c,value:value===''?null:Number(value)})}}for(const u of updates){u.a.scores[u.col]=u.value;refreshRow(u.row)}dirty=true;q('#md-grid-message').textContent=updates.length+' sel berhasil ditempel.';};
 });
 async function save(submit){if(busy)return;const invalid=content.querySelector('[aria-invalid="true"]');if(invalid){invalid.reportValidity();invalid.focus();return;}busy=true;content.querySelectorAll('input,select,textarea,button').forEach(e=>e.disabled=true);q('#md-message').textContent='Menyimpan…';try{const result=await api('save',{class_id:classId,academic_year_id:boot.academic_year_id,semester_no:boot.semester_no,version:report?.version||0,data,submit});if(!alive())return;report=result.report;dirty=false;draw();q('#md-message').textContent=submit?'Penilaian berhasil dikirim.':'Draf berhasil disimpan.'}catch(e){if(alive()){draw();q('#md-message').textContent=e.name==='AbortError'?'Waktu tunggu habis. Muat ulang untuk memeriksa hasil penyimpanan sebelum mencoba lagi.':e.message}}finally{busy=false}}
 q('#md-save').onclick=()=>save(false);q('#md-submit').onclick=()=>save(true);
 }
 let selected='';
 function panel(){if(step===0)return `<div class="md-grid"><label>Status kegiatan<select id="md-event">${[['not_scheduled','Belum dijadwalkan'],['scheduled','Menunggu pelaksanaan'],['completed','Sudah dilaksanakan']].map(([v,t])=>`<option value="${v}" ${data.event_status===v?'selected':''}>${t}</option>`).join('')}</select></label><label>Tanggal pelaksanaan<input id="md-date" type="date" value="${esc(data.date||'')}"></label><label>Modal kelas (Rp)<input id="md-capital" type="number" min="0" value="${data.capital}"></label></div>`;
 if(step===1)return `${data.groups.map((g,i)=>`<div class="md-group"><div class="md-grid">${[['name','Nama kelompok'],['product','Produk yang ditawarkan'],['profit','Keuntungan bersih (Rp; boleh minus jika rugi)'],['documentation','Link dokumentasi foto / folder']].map(([f,l])=>`<label>${l}<input data-group="${i}" data-field="${f}" type="${f==='profit'?'number':f==='documentation'?'url':'text'}" value="${esc(g[f])}"></label>`).join('')}</div><div class="md-member-head"><span>Anggota kelompok</span><span class="md-count" data-count="${i}">${g.members.length} siswa dipilih</span></div><div class="md-members">${students.map(s=>{const other=data.groups.some((x,j)=>j!==i&&x.members.includes(s.id));return `<label class="md-member"><input type="checkbox" data-member="${i}" value="${s.id}" ${g.members.includes(s.id)?'checked':''} ${other?'disabled':''}><span class="md-member-text"><span class="md-member-name">${esc(s.full_name)}</span><span class="md-member-status">${other?'Sudah di kelompok lain':g.members.includes(s.id)?'Terpilih':'Klik untuk memilih'}</span></span></label>`}).join('')}</div><button class="btn" data-remove="${i}" type="button">Hapus kelompok</button></div>`).join('')}<button class="btn" id="md-add" type="button">Tambah kelompok</button><p>Total keuntungan: Rp${data.groups.reduce((n,g)=>n+Number(g.profit||0),0).toLocaleString('id-ID')}</p>`;
 if(!students.length)return '<p>Daftar siswa belum tersedia untuk kelas dan semester ini.</p>';
 const titles=indicators;
 return `<div class="md-sheet-heading"><div><h3>Penilaian seluruh siswa</h3><p>Ketik skor 1–4 · Tab ke samping · Enter ke bawah · Bisa tempel 7 kolom skor dari Excel.</p></div></div><details><summary>Panduan indikator dan skor</summary><p>1: Perlu banyak bimbingan · 2: Berkembang dengan bantuan · 3: Mandiri · 4: Konsisten dan berinisiatif</p><p>Kategori menunggu penetapan rentang nilai sekolah. Nilai kosong tidak dihitung sebagai nol.</p><ol>${indicators.map(t=>`<li>${t}</li>`).join('')}</ol></details><p id="md-grid-message" role="status" aria-live="polite"></p><div class="md-sheet-wrap"><table class="md-sheet"><caption>Penilaian Market Day · ${esc(boot.classes.find(c=>c.id===classId)?.name)} · Semester ${boot.semester_no}</caption><colgroup><col style="width:45px"><col style="width:220px"><col style="width:160px">${indicators.map(()=>'<col style="width:140px">').join('')}<col style="width:100px"><col style="width:150px"><col style="width:240px"></colgroup><thead><tr><th rowspan="3" scope="col" class="md-rownum">No.</th><th rowspan="3" scope="col" class="md-namecol">Nama siswa</th><th rowspan="3" scope="col">Keikutsertaan</th><th colspan="7" scope="colgroup" class="md-entrepreneurship">Perkembangan Karakter Entrepreneurship</th><th rowspan="3" scope="col">Rata-rata</th><th rowspan="3" scope="col">Kategori</th><th rowspan="3" scope="col">Catatan</th></tr><tr><th colspan="2" scope="colgroup">Keaktifan &amp; Keberanian</th><th colspan="2" scope="colgroup">Usaha &amp; Inovatif</th><th colspan="2" scope="colgroup">Tanggung Jawab &amp; Kerja Sama</th><th scope="colgroup">Bilingual</th></tr><tr>${titles.map(t=>`<th scope="col" class="md-scorehead">${esc(t)}</th>`).join('')}</tr></thead><tbody>${students.map((student,row)=>{const a=data.assessments.find(x=>x.student_id===student.id);return `<tr data-student-row="${row}"><td class="md-rownum">${row+1}</td><th scope="row" class="md-namecol">${esc(student.full_name)}</th><td><select data-row-attendance="${row}" aria-label="Keikutsertaan ${esc(student.full_name)}">${[['pending','Belum dinilai'],['present','Hadir · dinilai'],['absent','Tidak hadir']].map(([v,t])=>`<option value="${v}" ${a.attendance===v?'selected':''}>${t}</option>`).join('')}</select></td>${indicators.map((t,col)=>`<td><input type="text" inputmode="numeric" autocomplete="off" data-score-row="${row}" data-score-col="${col}" value="${a.scores[col]??''}" aria-label="${esc(student.full_name)}: ${esc(t)}" ${a.attendance!=='present'?'disabled':''}></td>`).join('')}<td class="md-avg-cell" data-row-average>${a.attendance==='present'&&a.scores.every(n=>Number.isInteger(n)&&n>=1&&n<=4)?(a.scores.reduce((x,y)=>x+y,0)/7).toFixed(2):'—'}</td><td class="md-category" title="Batas kategori belum ditetapkan sekolah">—</td><td><input data-row-note="${row}" type="text" maxlength="2000" value="${esc(a.note)}" aria-label="Catatan ${esc(student.full_name)}"></td></tr>`}).join('')}</tbody></table></div>`;

 }
 await load();
};
})();
