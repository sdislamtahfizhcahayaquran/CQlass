/* CQlass — Input Rapor Semester (Walas): kepribadian, sikap, psikomotorik, komentar, kesehatan, prestasi.
   Server memeriksa sesi, penugasan walas, periode aktif, dan versi data. */
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function api(action,payload={}){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),30000);try{const r=await fetch(`${SUPABASE_URL}/functions/v1/admin-academic-period/semester-report`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':getAuthToken()},body:JSON.stringify({action,...payload}),signal:ctl.signal});const j=await r.json().catch(()=>({}));if(!r.ok||!j.success){const e=Error(j.error||'Gagal memproses Rapor Semester.');e.status=r.status;throw e}return j}finally{clearTimeout(timer)}}
async function catalog(){if(window.CQ_SEMESTER_CATALOG)return window.CQ_SEMESTER_CATALOG;await new Promise((res,rej)=>{const s=document.createElement('script');s.src='semester-report-print.js?v=20261118-semester1';s.onload=res;s.onerror=()=>rej(Error('Katalog Rapor Semester gagal dimuat.'));document.head.appendChild(s)});if(!window.CQ_SEMESTER_CATALOG)throw Error('Katalog Rapor Semester belum siap.');return window.CQ_SEMESTER_CATALOG}

/* Bagian grid: tiap bagian punya daftar kolom {key,label} di dalam data[section]. */
function sectionsOf(C){
 const out=[{id:'kepribadian',tab:'kepribadian',label:'Kepribadian',legend:C.LEGEND.kepribadian.id,cols:C.KEPRIBADIAN.map(k=>({key:k.key,label:k.id}))}];
 for(const c of C.SIKAP)out.push({id:'sikap_'+c.code,tab:'sikap',store:'sikap',label:`${c.code}. ${c.id}`,legend:C.LEGEND.sikap.id,cols:c.items.map(([key,label])=>({key,label}))});
 for(const c of C.PSIKOMOTOR)for(const g of c.groups)out.push({id:'psik_'+g.items[0][0],tab:'psikomotor',store:'psikomotor',label:`${c.id} · ${g.id}`,legend:C.LEGEND.psikomotor.id,cols:g.items.map(([key,label])=>({key,label}))});
 return out.map(s=>({...s,store:s.store||s.id}));
}
const TABS=[['kepribadian','Kepribadian'],['sikap','Sikap'],['psikomotor','Psikomotorik'],['komentar','Komentar'],['kokurikuler','Kokurikuler'],['kesehatan','Kesehatan'],['prestasi','Prestasi']];
// Rapor IKM: tinggi/berat badan dan kondisi kesehatan diisi walas.
const KES=[['tb','Tinggi badan (cm)','num',30,250],['bb','Berat badan (kg)','num',5,200],['pendengaran','Pendengaran','text'],['penglihatan','Penglihatan','text'],['gigi','Gigi','text']];

window.renderSemesterReportWalas=async function(content){
 if(typeof currentUser==='undefined'||currentUser?.role!=='walas'){content.textContent='Akses khusus wali kelas.';return}
 const mountId=String(Date.now())+Math.random();content.dataset.semesterMount=mountId;
 const identity=currentUser.username;const alive=()=>content.isConnected&&currentUser?.role==='walas'&&currentUser.username===identity&&content.dataset.semesterMount===mountId&&activeModule==='semester-report';
 content.innerHTML='<div class="card"><span class="spinner"></span> Memuat Input Rapor Semester…</div>';
 let C,boot;try{[C,boot]=await Promise.all([catalog(),api('bootstrap')]);if(!alive())return}catch(e){if(alive())content.textContent=e.message;return}
 const SECTIONS=sectionsOf(C);
 let classId=boot.classes[0]?.id||'',students=[],entries=new Map(),dirty=new Set(),tab='kepribadian',section='kepribadian',busy=false,message='';
 const blank=()=>({kepribadian:{},sikap:{},psikomotor:{},komentar:'',kesehatan:{},prestasi:[],kokurikuler:{}});
 const gradeOf=()=>{const c=boot.classes.find(x=>x.id===classId);const m=String(c?.name||'').match(/\d/);return m?+m[0]:0};
 const sem2=Number(boot.semester_no)===2;
 const dataOf=sid=>{if(!entries.has(sid))entries.set(sid,{version:0,data:blank()});const e=entries.get(sid);e.data={...blank(),...(e.data||{})};return e.data};
 async function load(){busy=true;try{const r=await api('load',{class_id:classId});if(!alive())return;students=r.students||[];entries=new Map((r.entries||[]).map(e=>[e.student_id,{version:Number(e.version)||0,data:e.data||blank()}]));dirty=new Set();message='';draw()}catch(e){if(alive())content.innerHTML=`<div class="card">${esc(e.message)}</div>`}finally{busy=false}}
 const totalCols=SECTIONS.reduce((n,s)=>n+s.cols.length,0);
 function progress(sid){const d=dataOf(sid);let n=0;for(const s of SECTIONS)for(const c of s.cols)if(d[s.store]?.[c.key])n++;return{n,ok:n===totalCols&&!!String(d.komentar||'').trim()}}
 function draw(){if(!alive())return;const sec=SECTIONS.find(s=>s.id===section)||SECTIONS[0];const complete=students.filter(s=>progress(s.id).ok).length;
 content.innerHTML=`<div id="cq-semester"><style>
#cq-semester{font-family:Tahoma,sans-serif;color:#193b40}#cq-semester *{box-sizing:border-box}
#cq-semester .card{padding:20px;border:1px solid #dcebe8;border-radius:16px;background:#fff;margin-bottom:16px;box-shadow:0 4px 18px #163d3910}
#cq-semester .page-title{color:#0d7377;margin-bottom:6px}#cq-semester .page-sub{margin-bottom:16px}
#cq-semester .sr-row{display:flex;flex-wrap:wrap;gap:12px;align-items:end}#cq-semester label.sr-field{display:block;min-width:220px}
#cq-semester select,#cq-semester textarea{font:inherit;border:1px solid #cededa;border-radius:10px;padding:10px;background:#fbfdfd;color:#193b40;width:100%}
#cq-semester .sr-chip{display:inline-block;background:#edf8f6;color:#28595b;padding:7px 12px;border-radius:20px;font-size:13px}
#cq-semester .sr-tabs,#cq-semester .sr-subtabs{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
#cq-semester .sr-tabs button,#cq-semester .sr-subtabs button{border:1px solid #d6e5e2;background:#f2f6f5;color:#435d60;border-radius:10px;padding:10px 14px;min-height:42px;cursor:pointer;font:inherit}
#cq-semester .sr-subtabs button{padding:7px 11px;min-height:36px;font-size:13px}
#cq-semester .sr-tabs button[aria-selected=true],#cq-semester .sr-subtabs button[aria-selected=true]{background:#0d7377;color:#fff;border-color:#0d7377}
#cq-semester .sr-wrap{overflow:auto;max-height:68vh;border:1px solid #ccdfd9;border-radius:10px}
#cq-semester table{border-collapse:separate;border-spacing:0;font-size:13px;min-width:100%}
#cq-semester th,#cq-semester td{border-right:1px solid #dce8e3;border-bottom:1px solid #dce8e3;background:#fff;padding:0}
#cq-semester thead th{position:sticky;top:0;z-index:3;background:#e7f2ed;padding:8px 6px;font-weight:600;font-size:12px;line-height:1.35;min-width:96px;max-width:150px;vertical-align:bottom;text-align:center}
#cq-semester .sr-no{width:42px;min-width:42px;text-align:center;background:#f0f6f3;color:#5f756d;padding:8px 4px}
#cq-semester .sr-name{position:sticky;left:0;z-index:2;min-width:210px;max-width:260px;background:#f9fcfa;padding:8px 10px;text-align:left;font-weight:500}
#cq-semester thead .sr-name{z-index:4;background:#e7f2ed}
#cq-semester .sr-fill{display:block;margin-top:6px;padding:4px;border-radius:6px;font-size:11px;min-height:28px}
#cq-semester input.sr-g{width:100%;min-width:60px;border:0;background:transparent;text-align:center;font:inherit;font-weight:700;font-size:15px;padding:9px 4px;text-transform:uppercase;color:#193b40}
#cq-semester input.sr-k{width:100%;min-width:60px;border:0;background:transparent;text-align:center;font:inherit;font-weight:700;font-size:15px;padding:9px 4px;color:#193b40}
#cq-semester input.sr-k:focus{outline:2px solid #18846c;outline-offset:-2px;background:#edfaf5}#cq-semester input.sr-k[aria-invalid=true]{background:#fff0ef;outline:2px solid #b54545;outline-offset:-2px}
#cq-semester input.sr-g:focus{outline:2px solid #18846c;outline-offset:-2px;background:#edfaf5}
#cq-semester input.sr-g[aria-invalid=true]{background:#fff0ef;outline:2px solid #b54545;outline-offset:-2px}
#cq-semester .sr-prog{font-size:11px;color:#657b7e;display:block;margin-top:2px}.sr-prog.ok{color:#176949!important}
#cq-semester .sr-comments{display:grid;gap:12px}#cq-semester .sr-comment label{font-weight:600;display:block;margin-bottom:6px}
#cq-semester .sr-comment textarea{min-height:84px;resize:vertical}#cq-semester .sr-count{font-size:11px;color:#657b7e;text-align:right}
#cq-semester .sr-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;position:sticky;bottom:0;z-index:5}
#cq-semester .sr-msg{font-size:13px;color:#305877}
#cq-semester input.sr-h,#cq-semester input.sr-p{width:100%;border:0;background:transparent;font:inherit;padding:9px 8px;color:#193b40}
#cq-semester input.sr-h.num{text-align:center;min-width:80px}#cq-semester input.sr-h.txt{min-width:130px}
#cq-semester input.sr-h:focus,#cq-semester input.sr-p:focus{outline:2px solid #18846c;outline-offset:-2px;background:#edfaf5}
#cq-semester input.sr-h[aria-invalid=true]{background:#fff0ef;outline:2px solid #b54545;outline-offset:-2px}
#cq-semester .sr-fillbtn{display:block;margin:6px auto 0;border:1px solid #cfe2dd;background:#fff;border-radius:6px;font-size:11px;padding:3px 7px;cursor:pointer}
#cq-semester .sr-pres{display:grid;gap:12px}#cq-semester .sr-pcard{border:1px solid #dce8e3;border-radius:12px;padding:10px 12px}
#cq-semester .sr-pcard h4{margin:0 0 8px;font-size:14px}#cq-semester .sr-prow{display:grid;grid-template-columns:28px 1fr 1.4fr;gap:6px;align-items:center;margin-bottom:6px}
#cq-semester .sr-prow input{border:1px solid #cededa;border-radius:8px;background:#fbfdfd}
#cq-semester .sr-kp{display:flex;gap:8px;align-items:center;margin-top:6px;font-size:13px}#cq-semester .sr-kp select{width:auto}
@media(max-width:600px){#cq-semester .card{padding:14px}#cq-semester .sr-name{min-width:150px}}
</style>
<div class="page-title">Input Rapor Semester</div><div class="page-sub">${esc(boot.academic_year)} · Semester ${esc(boot.semester_no)} · Nilai akademik dan kognitif diambil otomatis dari nilai guru mapel.</div>
<div class="card"><div class="sr-row"><label class="sr-field">Kelas<select id="sr-class">${boot.classes.map(c=>`<option value="${esc(c.id)}" ${c.id===classId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label><span class="sr-chip">${complete} dari ${students.length} siswa lengkap</span></div></div>
<div class="card"><div class="sr-tabs" role="tablist">${TABS.map(([id,l])=>`<button type="button" role="tab" aria-selected="${tab===id}" data-tab="${id}">${l}</button>`).join('')}</div>
${tab==='komentar'?commentsHtml():tab==='kokurikuler'?kokuHtml():tab==='kesehatan'?kesehatanHtml():tab==='prestasi'?prestasiHtml():gridHtml(sec)}</div>
<div class="card sr-actions"><button type="button" class="btn btn-primary" id="sr-save" ${busy?'disabled':''}>Simpan${dirty.size?` (${dirty.size} siswa)`:''}</button><span class="sr-msg" id="sr-msg" role="status" aria-live="polite">${esc(message||(dirty.size?'Ada perubahan yang belum disimpan.':'Semua perubahan sudah tersimpan.'))}</span></div></div>`;
 bind(sec)}
 function subtabs(){const list=SECTIONS.filter(s=>s.tab===tab);if(list.length<2)return'';return`<div class="sr-subtabs">${list.map(s=>`<button type="button" aria-selected="${s.id===section}" data-section="${s.id}">${esc(s.label)}</button>`).join('')}</div>`}
 function gridHtml(sec){if(!students.length)return'<p>Daftar siswa belum tersedia untuk kelas dan semester ini.</p>';
  return`${subtabs()}<p style="margin:0 0 10px;font-size:13px;color:#547174">Ketik A, B, C, atau D · Enter pindah ke bawah · Bisa tempel dari Excel · ${esc(sec.legend)}</p><div class="sr-wrap"><table><thead><tr><th class="sr-no">No</th><th class="sr-name">Nama siswa</th>${sec.cols.map((c,ci)=>`<th scope="col">${esc(c.label)}<select class="sr-fill" data-fill="${ci}" aria-label="Isi semua: ${esc(c.label)}"><option value="">Isi semua…</option>${C.GRADES.map(g=>`<option>${g}</option>`).join('')}<option value="-">Kosongkan</option></select></th>`).join('')}</tr></thead><tbody>${students.map((s,ri)=>{const d=dataOf(s.id),p=progress(s.id);return`<tr><td class="sr-no">${ri+1}</td><th scope="row" class="sr-name">${esc(s.name)}<span class="sr-prog${p.ok?' ok':''}">${p.ok?'Lengkap':`${p.n}/${totalCols} isian${String(d.komentar||'').trim()?'':' · komentar kosong'}`}</span></th>${sec.cols.map((c,ci)=>`<td><input class="sr-g" maxlength="1" autocomplete="off" data-r="${ri}" data-c="${ci}" value="${esc(d[sec.store]?.[c.key]||'')}" aria-label="${esc(s.name)}: ${esc(c.label)}"></td>`).join('')}</tr>`}).join('')}</tbody></table></div>`}
 function commentsHtml(){if(!students.length)return'<p>Daftar siswa belum tersedia untuk kelas dan semester ini.</p>';return`<div class="sr-comments">${students.map((s,ri)=>{const v=String(dataOf(s.id).komentar||'');return`<div class="sr-comment"><label for="sr-k-${ri}">${ri+1}. ${esc(s.name)}</label><textarea id="sr-k-${ri}" data-k="${ri}" maxlength="1500" placeholder="Komentar umum wali kelas untuk rapor">${esc(v)}</textarea><div class="sr-count" data-kc="${ri}">${v.length}/1500</div></div>`}).join('')}</div>`}
 function kesehatanHtml(){if(!students.length)return'<p>Daftar siswa belum tersedia untuk kelas dan semester ini.</p>';
  return`<p style="margin:0 0 10px;font-size:13px;color:#547174">Untuk Rapor IKM bagian Tinggi/Berat Badan dan Kondisi Kesehatan. Angka boleh desimal (contoh 125,5). Kondisi diisi singkat, misalnya <b>Baik</b>.${sem2?' Tinggi/berat semester 1 diambil dari isian semester 1.':''}</p><datalist id="sr-kes-opt"><option value="Baik"><option value="Cukup baik"><option value="Perlu pemeriksaan"><option value="Memakai kacamata"></datalist><div class="sr-wrap"><table><thead><tr><th class="sr-no">No</th><th class="sr-name">Nama siswa</th>${KES.map(([k,l,t])=>`<th scope="col">${esc(l)}${t==='text'?`<button type="button" class="sr-fillbtn" data-kfill="${k}">Isi semua: Baik</button>`:''}</th>`).join('')}</tr></thead><tbody>${students.map((s,ri)=>{const h=dataOf(s.id).kesehatan||{};return`<tr><td class="sr-no">${ri+1}</td><th scope="row" class="sr-name">${esc(s.name)}</th>${KES.map(([k,l,t])=>`<td><input class="sr-h ${t==='num'?'num':'txt'}" data-r="${ri}" data-h="${k}" ${t==='num'?'inputmode="decimal"':'list="sr-kes-opt" maxlength="80"'} autocomplete="off" value="${esc(h[k]||'')}" aria-label="${esc(s.name)}: ${esc(l)}"></td>`).join('')}</tr>`}).join('')}</tbody></table></div>`}
 function prestasiHtml(){if(!students.length)return'<p>Daftar siswa belum tersedia untuk kelas dan semester ini.</p>';
  return`<p style="margin:0 0 10px;font-size:13px;color:#547174">Untuk Rapor IKM bagian Prestasi (maksimal 3). Kosongkan bila tidak ada.${sem2?' Pilih juga keputusan akhir tahun: bawaannya naik kelas (kelas 6: lulus).':''}</p><div class="sr-pres">${students.map((s,ri)=>{const d=dataOf(s.id),pr=Array.isArray(d.prestasi)?d.prestasi:[];return`<div class="sr-pcard"><h4>${ri+1}. ${esc(s.name)}</h4><div class="sr-prow" style="font-size:11px;color:#657b7e"><span></span><span>Jenis prestasi</span><span>Keterangan (tingkat, juara, penyelenggara)</span></div>${[0,1,2].map(i=>`<div class="sr-prow"><span>${i+1}.</span><input class="sr-p" data-r="${ri}" data-pi="${i}" data-pf="jenis" maxlength="150" value="${esc(pr[i]?.jenis||'')}" aria-label="${esc(s.name)} prestasi ${i+1}: jenis"><input class="sr-p" data-r="${ri}" data-pi="${i}" data-pf="keterangan" maxlength="250" value="${esc(pr[i]?.keterangan||'')}" aria-label="${esc(s.name)} prestasi ${i+1}: keterangan"></div>`).join('')}${sem2?`<label class="sr-kp">Keputusan: <select data-kp="${ri}"><option value="naik" ${d.keputusan!=='tinggal'?'selected':''}>Naik kelas / Lulus</option><option value="tinggal" ${d.keputusan==='tinggal'?'selected':''}>Tinggal di kelas / Belum lulus</option></select></label>`:''}</div>`}).join('')}</div>`}
 function kokuHtml(){if(!students.length)return'<p>Daftar siswa belum tersedia untuk kelas dan semester ini.</p>';const g=gradeOf(),P=(C.KOKURIKULER||{})[g];
  if(!P)return'<p>Rubrik kokurikuler untuk kelas ini belum tersedia.</p>';const sc=C.KOKU_SCALE||{};
  return`<p style="margin:0 0 6px;font-size:13px;color:#304f52"><b>Proyek: ${esc(P.id)}</b></p><p style="margin:0 0 10px;font-size:12.5px;color:#547174">Isi skor 1–4 untuk dua dimensi: ${[4,3,2,1].map(n=>`${n} = ${esc(sc[n]?.id||'')}`).join(' · ')}. Komentar di Rapor IKM dibuat otomatis dari skor ini.</p><div class="sr-wrap"><table><thead><tr><th class="sr-no">No</th><th class="sr-name">Nama siswa</th>${P.dims.map((d,i)=>`<th scope="col">${i?'B':'A'}. ${esc(d.id)}<select class="sr-fill" data-kfillk="${i?'b':'a'}" aria-label="Isi semua ${esc(d.id)}"><option value="">Isi semua…</option>${[4,3,2,1].map(n=>`<option>${n}</option>`).join('')}<option value="-">Kosongkan</option></select></th>`).join('')}<th scope="col" style="min-width:320px;max-width:none;text-align:left">Komentar otomatis</th></tr></thead><tbody>${students.map((s,ri)=>{const k=dataOf(s.id).kokurikuler||{};return`<tr><td class="sr-no">${ri+1}</td><th scope="row" class="sr-name">${esc(s.name)}</th>${['a','b'].map(x=>`<td><input class="sr-k" maxlength="1" inputmode="numeric" autocomplete="off" data-r="${ri}" data-kk="${x}" value="${esc(k[x]??'')}" aria-label="${esc(s.name)}: dimensi ${x.toUpperCase()}"></td>`).join('')}<td class="sr-kc" data-kc="${ri}" style="padding:7px 9px;font-size:12px;line-height:1.45;text-align:left">${esc(C.kokuComment?C.kokuComment(s.name,g,k,'id'):'')||'<span style="color:#8a9a9c">Isi kedua skor</span>'}</td></tr>`}).join('')}</tbody></table></div>`}
 function setKoku(ri,key,v){const s=students[ri],d=dataOf(s.id);d.kokurikuler={...(d.kokurikuler||{})};if(v)d.kokurikuler[key]=Number(v);else delete d.kokurikuler[key];markDirty(s.id);const cell=content.querySelector(`[data-kc="${ri}"]`);if(cell){const t=C.kokuComment?C.kokuComment(s.name,gradeOf(),d.kokurikuler,'id'):'';cell.innerHTML=t?esc(t):'<span style="color:#8a9a9c">Isi kedua skor</span>'}}
 function markDirty(sid){dirty.add(sid);const m=content.querySelector('#sr-msg'),b=content.querySelector('#sr-save');if(m)m.textContent='Ada perubahan yang belum disimpan.';if(b)b.textContent=`Simpan (${dirty.size} siswa)`}
 function setKes(ri,k,v){const s=students[ri],d=dataOf(s.id);d.kesehatan={...(d.kesehatan||{})};if(v)d.kesehatan[k]=v;else delete d.kesehatan[k];markDirty(s.id)}
 function kesValid(k,v){const def=KES.find(x=>x[0]===k);if(!def||def[2]!=='num'||!v)return true;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)&&n>=def[3]&&n<=def[4]}
 function setGrade(ri,sec,ci,value){const s=students[ri],d=dataOf(s.id),k=sec.cols[ci].key;d[sec.store]={...(d[sec.store]||{})};if(value)d[sec.store][k]=value;else delete d[sec.store][k];dirty.add(s.id)}
 function bind(sec){const q=x=>content.querySelector(x);
  q('#sr-class').onchange=async e=>{if(dirty.size&&!confirm('Ada perubahan belum disimpan. Pindah kelas tanpa menyimpan?')){e.target.value=classId;return}classId=e.target.value;await load()};
  content.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;section=(SECTIONS.find(s=>s.tab===tab)||{}).id||section;draw()});
  content.querySelectorAll('[data-section]').forEach(b=>b.onclick=()=>{section=b.dataset.section;draw()});
  content.querySelectorAll('[data-fill]').forEach(el=>el.onchange=()=>{const v=el.value==='-'?'':el.value;if(el.value==='')return;students.forEach((_,ri)=>setGrade(ri,sec,Number(el.dataset.fill),v));message='';draw()});
  content.querySelectorAll('input.sr-g').forEach(el=>{
   el.oninput=()=>{const v=el.value.trim().toUpperCase();const ok=v===''||C.GRADES.includes(v);el.value=v;el.setAttribute('aria-invalid',String(!ok));if(!ok){q('#sr-msg').textContent='Isi hanya A, B, C, atau D.';return}setGrade(Number(el.dataset.r),sec,Number(el.dataset.c),v);q('#sr-msg').textContent='Ada perubahan yang belum disimpan.';q('#sr-save').textContent=`Simpan (${dirty.size} siswa)`};
   el.onkeydown=e=>{if(e.key!=='Enter'&&e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;e.preventDefault();const d=e.key==='ArrowUp'||e.shiftKey?-1:1;const n=q(`input.sr-g[data-r="${Number(el.dataset.r)+d}"][data-c="${el.dataset.c}"]`);if(n){n.focus();n.select()}};
   el.onpaste=e=>{const raw=e.clipboardData.getData('text');if(!/[\t\n\r]/.test(raw))return;e.preventDefault();const m=raw.replace(/\r/g,'').replace(/\n$/,'').split('\n').map(l=>l.split('\t').map(x=>x.trim().toUpperCase()));const r0=Number(el.dataset.r),c0=Number(el.dataset.c);
    if(r0+m.length>students.length||m.some(r=>c0+r.length>sec.cols.length)){q('#sr-msg').textContent='Tempelan melebihi tabel. Tidak ada isian diubah.';return}
    if(m.some(r=>r.some(v=>v&&!C.GRADES.includes(v)))){q('#sr-msg').textContent='Tempelan hanya boleh berisi A, B, C, D, atau kosong. Tidak ada isian diubah.';return}
    m.forEach((r,i)=>r.forEach((v,j)=>setGrade(r0+i,sec,c0+j,v)));message=`${m.reduce((n,r)=>n+r.length,0)} sel berhasil ditempel.`;draw()};
  });
  content.querySelectorAll('textarea[data-k]').forEach(el=>el.oninput=()=>{const s=students[Number(el.dataset.k)];dataOf(s.id).komentar=el.value.slice(0,1500);dirty.add(s.id);const c=q(`[data-kc="${el.dataset.k}"]`);if(c)c.textContent=`${el.value.length}/1500`;q('#sr-msg').textContent='Ada perubahan yang belum disimpan.';q('#sr-save').textContent=`Simpan (${dirty.size} siswa)`});
  content.querySelectorAll('input.sr-k').forEach(el=>{el.oninput=()=>{const v=el.value.trim();const ok=v===''||/^[1-4]$/.test(v);el.setAttribute('aria-invalid',String(!ok));if(!ok){q('#sr-msg').textContent='Skor kokurikuler hanya 1, 2, 3, atau 4.';return}setKoku(Number(el.dataset.r),el.dataset.kk,v)};
   el.onkeydown=e=>{if(e.key!=='Enter'&&e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;e.preventDefault();const d=e.key==='ArrowUp'||e.shiftKey?-1:1;const n=q(`input.sr-k[data-r="${Number(el.dataset.r)+d}"][data-kk="${el.dataset.kk}"]`);if(n){n.focus();n.select()}}});
  content.querySelectorAll('[data-kfillk]').forEach(el=>el.onchange=()=>{if(el.value==='')return;const v=el.value==='-'?'':el.value;students.forEach((_,ri)=>setKoku(ri,el.dataset.kfillk,v));message='';draw()});
  content.querySelectorAll('input.sr-h').forEach(el=>{el.oninput=()=>{const k=el.dataset.h,v=el.value.trim();const ok=kesValid(k,v);el.setAttribute('aria-invalid',String(!ok));if(!ok){q('#sr-msg').textContent=k==='tb'?'Tinggi badan harus angka 30–250 cm.':'Berat badan harus angka 5–200 kg.';return}setKes(Number(el.dataset.r),k,v)};
   el.onkeydown=e=>{if(e.key!=='Enter')return;e.preventDefault();const n=q(`input.sr-h[data-r="${Number(el.dataset.r)+(e.shiftKey?-1:1)}"][data-h="${el.dataset.h}"]`);if(n){n.focus();n.select()}}});
  content.querySelectorAll('[data-kfill]').forEach(b=>b.onclick=()=>{const k=b.dataset.kfill;students.forEach((s,ri)=>{if(!String(dataOf(s.id).kesehatan?.[k]||'').trim())setKes(ri,k,'Baik')});message='Kolom kosong diisi "Baik".';draw()});
  content.querySelectorAll('input.sr-p').forEach(el=>el.oninput=()=>{const s=students[Number(el.dataset.r)],d=dataOf(s.id),i=Number(el.dataset.pi);const pr=[0,1,2].map(j=>({jenis:'',keterangan:'',...((Array.isArray(d.prestasi)?d.prestasi:[])[j]||{})}));pr[i][el.dataset.pf]=el.value;d.prestasi=pr;markDirty(s.id)});
  content.querySelectorAll('select[data-kp]').forEach(el=>el.onchange=()=>{const s=students[Number(el.dataset.kp)];dataOf(s.id).keputusan=el.value;markDirty(s.id)});
  q('#sr-save').onclick=save;
 }
 async function save(){if(busy)return;if(content.querySelector('input.sr-g[aria-invalid="true"],input.sr-h[aria-invalid="true"],input.sr-k[aria-invalid="true"]')){message='Perbaiki sel berwarna merah dulu.';draw();return}if(!dirty.size){message='Tidak ada perubahan untuk disimpan.';draw();return}
  busy=true;const btn=content.querySelector('#sr-save');if(btn){btn.disabled=true;btn.textContent='Menyimpan…'}
  try{const list=[...dirty].map(sid=>({student_id:sid,version:entries.get(sid)?.version||0,data:dataOf(sid)}));const r=await api('save',{class_id:classId,academic_year_id:boot.academic_year_id,semester_no:boot.semester_no,entries:list});if(!alive())return;
   entries=new Map((r.entries||[]).map(e=>[e.student_id,{version:Number(e.version)||0,data:e.data||blank()}]));dirty=new Set();message=`Tersimpan (${r.saved} siswa).`}
  catch(e){message=e.name==='AbortError'?'Waktu tunggu habis. Muat ulang untuk memeriksa hasil sebelum mencoba lagi.':e.message}
  finally{busy=false;if(alive())draw()}}
 await load();
};
})();
