/* CQlass — Kabid Kesiswaan: Cover Rapor (BIODATA SISWA) per kelas, dari Biodata Siswa yang diunggah Admin. */
(function(){
'use strict';
if(window.__cqKesiswaanCoverRapor)return;window.__cqKesiswaanCoverRapor=true;
const API=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/admin-academic-period/student-profiles';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ERR={unauthorized:'Sesi berakhir. Silakan login ulang.',forbidden:'Menu ini khusus Kabid Kesiswaan dan Admin.',class_not_found:'Kelas tidak ditemukan pada periode aktif.',active_academic_year_not_found:'Periode aktif belum ditetapkan Admin.'};
const BULAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const HIJRI=['Muharram','Safar','Rabiul Awal','Rabiul Akhir','Jumadil Awal','Jumadil Akhir','Rajab','Syaban','Ramadhan','Syawal','Dzulqaidah','Dzulhijjah'];
function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}}
async function api(action,p={}){const k=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',apikey:k,Authorization:'Bearer '+k,'x-session-token':token()},body:JSON.stringify({action,...p})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw Error(ERR[d.error]||d.error||'Data cover belum dapat dimuat.');return d}
function todayIso(){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta'}).format(new Date())}
function masehi(iso){const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${Number(m[3])} ${BULAN[Number(m[2])-1]} ${m[1]}`:''}
function hijri(iso){const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);if(!m)return'';try{const p=new Intl.DateTimeFormat('en-US-u-ca-islamic-umalqura',{day:'numeric',month:'numeric',year:'numeric',timeZone:'Asia/Jakarta'}).formatToParts(new Date(`${iso}T12:00:00+07:00`)),g=t=>Number(p.find(x=>x.type===t)?.value||0);const d=g('day'),mo=g('month'),y=g('year');return d&&mo&&y?`${d} ${HIJRI[mo-1]} ${y}`:''}catch(_){return''}}
const S={boot:null,classId:'',data:null,date:'',place:'Depok',hijri:'',signerId:'',photo:true,selected:new Set(),busy:false};
function signer(){const l=S.boot?.signers?.list||[];return l.find(x=>x.id===S.signerId)||null}

function page(st,o){const row=(no,label,val,cls='')=>`<tr class="${cls}"><td class="no">${no}</td><td class="lb">${label}</td><td class="cl">:</td><td class="vl">${esc(val)}</td></tr>`;
 const sub=(label,val)=>`<tr class="sub"><td class="no"></td><td class="lb">${label}</td><td class="cl">:</td><td class="vl">${esc(val)}</td></tr>`;
 const photo=o.photo&&st.photo_url?`<img src="${esc(st.photo_url)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">`:'';
 return `<section class="cv-page"><img class="cv-kop" src="${o.header}" alt=""><h1>BIODATA SISWA</h1>
 <table class="cv-t">
  <tr class="sec"><td class="no">A</td><td colspan="3">IDENTITAS ANAK</td></tr>
  <tr><td class="no">1</td><td class="lb" colspan="3">Nama</td></tr>
  ${sub('1.1&nbsp; Nama Lengkap',st.nama)}${sub('1.2&nbsp; NISN',st.nisn)}
  ${row(2,'Jenis Kelamin',st.jenis_kelamin)}${row(3,'Tempat/Tanggal Lahir',st.ttl)}${row(4,'Golongan Darah',st.golongan_darah)}${row(5,'Suku',st.suku)}${row(6,'Agama',st.agama)}${row(7,'Alamat Domisili',st.alamat)}
  <tr class="kota"><td class="no"></td><td class="lb"></td><td class="cl"></td><td class="vl"><span>Kota/Kabupaten :</span><b>${esc(st.kota)}</b><span>Provinsi :</span><b>${esc(st.provinsi)}</b></td></tr>
  <tr class="sec gap"><td class="no">B</td><td colspan="3">IDENTITAS ORANG TUA/WALI</td></tr>
  <tr><td class="no">1</td><td class="lb" colspan="3">Ayah Kandung/Wali</td></tr>
  ${sub('1.1&nbsp; Nama Lengkap',st.ayah.nama)}${sub('1.2&nbsp; Tempat/Tanggal Lahir',st.ayah.ttl)}${sub('1.3&nbsp; Agama',st.ayah.agama)}${sub('1.4&nbsp; Warga Negara',st.ayah.warga_negara)}
  <tr class="gap"><td class="no">2</td><td class="lb" colspan="3">Ibu Kandung/Wali</td></tr>
  ${sub('2.1&nbsp; Nama Lengkap',st.ibu.nama)}${sub('2.2&nbsp; Tempat/Tanggal Lahir',st.ibu.ttl)}${sub('2.3&nbsp; Agama',st.ibu.agama)}${sub('2.4&nbsp; Warga Negara',st.ibu.warga_negara)}
 </table>
 <div class="cv-bottom"><div class="cv-photo"><span>Pas foto<br>( 3 x 4 )</span>${photo}</div>
  <div class="cv-sign"><div class="d1">${esc(o.place)}, ${esc(o.hijri)} H</div><div class="d2">${esc(o.masehi)} M</div><div class="sch">SD Islam Tahfizh Cahaya Quran</div><div class="ttd">${o.sig?`<img src="${esc(o.sig)}" alt="">`:''}</div><div class="nm">(${esc(o.principal)})</div><div class="jb">Kepala Sekolah</div></div></div>
 <img class="cv-foot" src="${o.footer}" alt=""></section>`}
const PRINT_CSS=`@page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#e9eef0}body{font-family:Tahoma,Verdana,'DejaVu Sans',sans-serif;color:#111;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.cv-page{position:relative;width:210mm;height:297mm;margin:0 auto 8mm;background:#fff;padding:38mm 22mm 28mm 26mm;overflow:hidden;page-break-after:always;break-after:page}
.cv-kop{position:absolute;left:8mm;top:4mm;width:197mm}.cv-foot{position:absolute;left:0;bottom:4mm;width:210mm}
h1{margin:0 0 5mm;text-align:center;font-size:16pt;font-weight:700;letter-spacing:.02em}
.cv-t{width:100%;border-collapse:collapse;font-size:9.4pt;line-height:1.3}.cv-t td{padding:1.15mm 0 .9mm;vertical-align:bottom}
.cv-t .no{width:8mm;padding-left:3mm}.cv-t .lb{width:58mm}.cv-t .cl{width:4mm}.cv-t .vl{border-bottom:.3mm solid #222}
.cv-t tr.sub .lb{padding-left:6mm}.cv-t tr.sec td{font-weight:700;padding-top:1.5mm}.cv-t tr.sec .no{padding-left:0}.cv-t tr.gap td{padding-top:3.5mm}
.cv-t tr:not(.sub):not(.sec):not(.kota) td.vl:empty{border:0}.cv-t tr td[colspan]{border:0}
.cv-t tr.kota .vl{display:flex;gap:2mm;align-items:flex-end}.cv-t tr.kota .vl span{white-space:nowrap}.cv-t tr.kota .vl b{font-weight:400;flex:1;text-align:center}
.cv-bottom{display:flex;justify-content:space-between;align-items:flex-start;margin-top:7mm}
.cv-photo{position:relative;width:30mm;height:40mm;border:.35mm solid #222;display:flex;align-items:center;justify-content:center;text-align:center;font-size:8.5pt;line-height:1.7;overflow:hidden}.cv-photo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#fff}
.cv-sign{width:78mm;text-align:center;font-size:9.6pt;margin-right:8mm}.cv-sign .d1{display:inline-block;border-bottom:.3mm solid #222;padding:0 2mm}.cv-sign .d2{margin-top:1mm}.cv-sign .sch{margin-top:2.5mm;font-weight:700}.cv-sign .ttd{height:20mm;display:flex;align-items:center;justify-content:center}.cv-sign .ttd img{max-height:22mm;max-width:46mm}.cv-sign .nm{font-weight:700;text-decoration:underline}
@media print{html,body{background:#fff}.cv-page{margin:0}}`;
function opts(){return{place:S.place||'Depok',hijri:S.hijri,masehi:masehi(S.date),principal:signer()?.name||'Kepala Sekolah',sig:signer()?.signature_url||'',photo:S.photo,header:new URL('cover-kop-header.png',location.href).href,footer:new URL('kesiswaan-kop-footer.png',location.href).href}}
function printPages(list){const w=window.open('','_blank');if(!w){toast('Izinkan pop-up / tab baru untuk mencetak cover.',true);return}w.opener=null;const o=opts();const cls=S.data?.class?.name||'';
 w.document.open();w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Cover Rapor ${esc(cls)}</title><style>${PRINT_CSS}</style></head><body>${list.map(st=>page(st,o)).join('')}<script>(function(){var imgs=[].slice.call(document.images),left=imgs.length,done=false;function go(){if(done)return;done=true;setTimeout(function(){window.focus();window.print()},250)}if(!left)go();imgs.forEach(function(i){if(i.complete){if(--left<=0)go()}else{i.addEventListener('load',function(){if(--left<=0)go()});i.addEventListener('error',function(){if(--left<=0)go()})}});setTimeout(go,8000)})();<\/script></body></html>`);w.document.close()}
function toast(m,bad){if(typeof showToast==='function')showToast(m,bad);const el=document.getElementById('kcv-msg');if(el){el.hidden=!m;el.textContent=m;el.className='kcv-msg '+(bad?'bad':'ok')}}
function view(){const b=S.boot,d=S.data,list=d?.students||[];const noProf=list.filter(s=>!s.has_profile).length,withPhoto=list.filter(s=>s.photo_url).length;
 return `<div class="kcv"><div class="kcv-head"><div><div class="kcv-eye">Administrasi Kesiswaan</div><div class="kcv-title">Cover Rapor</div><div class="kcv-sub">Lembar BIODATA SISWA per kelas · ${esc(b?.academic_year||'')} Semester ${esc(b?.semester_no||'')}. Data diambil dari Biodata Siswa yang diunggah Admin.</div></div></div>
 <div class="kcv-card"><div class="kcv-grid">
  <label><span>Kelas</span><select id="kcv-class" onchange="cqKcvClass(this.value)"><option value="">Pilih kelas…</option>${(b?.classes||[]).map(c=>`<option value="${esc(c.id)}" ${c.id===S.classId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label>
  <label><span>Tanggal Masehi</span><input type="date" id="kcv-date" value="${esc(S.date)}" onchange="cqKcvDate(this.value)"></label>
  <label><span>Tanggal Hijriah <button type="button" class="kcv-link" onclick="cqKcvCalcHijri()">hitung dari Masehi</button></span><input id="kcv-hijri" value="${esc(S.hijri)}" oninput="cqKcvHijri(this.value)" placeholder="mis. 28 Jumadil Akhir 1447"></label>
  <label><span>Tempat</span><input id="kcv-place" value="${esc(S.place)}" oninput="cqKcvPlace(this.value)"></label>
 </div>
 <div class="kcv-signer"><label><span>Penanda tangan (Kepala Sekolah)</span><select onchange="cqKcvSigner(this.value)">${(b?.signers?.list||[]).map(x=>`<option value="${esc(x.id)}" ${x.id===S.signerId?'selected':''}>${esc(x.name)}${x.position?' — '+esc(x.position):''}${x.id===b.signers.current_id?' (kepala sekolah saat ini)':''}</option>`).join('')||'<option value="">Belum ada kepala sekolah</option>'}</select></label><div class="kcv-sig">${signer()?.signature_url?`<img src="${esc(signer().signature_url)}" alt="Tanda tangan">`:'<span>Tanda tangan belum tersimpan</span>'}</div></div>
 <p class="kcv-note">Tanggal diisi manual sesuai tanggal penandatanganan cover. Jika kepala sekolah berganti, pilih nama kepala sekolah yang menandatangani pada tanggal tersebut. Tanda tangan diambil dari menu <b>Tanda Tangan Rapor</b> di akun masing-masing.</p>
 <div class="kcv-row"><label class="kcv-switch"><input type="checkbox" ${S.photo?'checked':''} onchange="cqKcvPhoto(this.checked)"><span>Cetak pas foto dari biodata (jika ada). Jika tidak dicentang, kotak foto dibiarkan kosong.</span></label></div>
 <div id="kcv-msg" class="kcv-msg" hidden></div></div>
 ${S.busy?'<div class="kcv-card kcv-loading">Memuat data kelas…</div>':''}
 ${d?`<div class="kcv-card"><div class="kcv-listhead"><div><b>${esc(d.class?.name)}</b> · ${list.length} siswa${noProf?` · <span class="warn">${noProf} belum ada biodata</span>`:''} · ${withPhoto} dengan foto</div><div class="kcv-actions"><button class="kcv-btn ghost" onclick="cqKcvAll(true)">Pilih semua</button><button class="kcv-btn ghost" onclick="cqKcvAll(false)">Kosongkan</button><button class="kcv-btn" onclick="cqKcvPrint()" ${S.selected.size?'':'disabled'}>Cetak ${S.selected.size} cover</button></div></div>
  ${list.length?`<div class="kcv-list">${list.map((s,i)=>`<label class="kcv-item ${s.has_profile?'':'miss'}"><input type="checkbox" ${S.selected.has(s.student_id)?'checked':''} onchange="cqKcvPick('${esc(s.student_id)}',this.checked)"><span class="n">${i+1}</span><span class="t"><b>${esc(s.nama)}</b><small>NISN ${esc(s.nisn)} · ${s.has_profile?'Biodata lengkap':'Biodata belum diunggah'}${s.photo_url?' · Foto ✓':''}</small></span><button type="button" class="kcv-btn sm ghost" onclick="event.preventDefault();cqKcvPrintOne('${esc(s.student_id)}')">Cetak</button></label>`).join('')}</div>`:'<div class="kcv-empty">Belum ada siswa di kelas ini.</div>'}
 </div>`:''}
 </div>`}
function draw(){const c=document.getElementById('content');if(c&&c.querySelector('.kcv'))c.innerHTML=view()}
window.cqKcvClass=async id=>{S.classId=id;S.data=null;S.selected=new Set();if(!id)return draw();S.busy=true;draw();try{S.data=await api('cover_class',{class_id:id});S.data.students.forEach(s=>S.selected.add(s.student_id))}catch(e){toast(e.message,true)}S.busy=false;draw()};
window.cqKcvDate=v=>{S.date=v};
window.cqKcvHijri=v=>{S.hijri=v};window.cqKcvCalcHijri=()=>{if(!S.date)return toast('Isi tanggal Masehi dahulu.',true);S.hijri=hijri(S.date);const h=document.getElementById('kcv-hijri');if(h)h.value=S.hijri};window.cqKcvSigner=id=>{S.signerId=id;draw()};window.cqKcvPlace=v=>{S.place=v};window.cqKcvPhoto=v=>{S.photo=!!v};
window.cqKcvPick=(id,on)=>{on?S.selected.add(id):S.selected.delete(id);const b=document.querySelector('.kcv-actions .kcv-btn:not(.ghost)');if(b){b.textContent=`Cetak ${S.selected.size} cover`;b.disabled=!S.selected.size}};
window.cqKcvAll=on=>{S.selected=new Set(on?(S.data?.students||[]).map(s=>s.student_id):[]);draw()};
window.cqKcvPrint=()=>{const list=(S.data?.students||[]).filter(s=>S.selected.has(s.student_id));if(!list.length)return toast('Pilih minimal satu siswa.',true);if(!ready())return;printPages(list)};
window.cqKcvPrintOne=id=>{const s=(S.data?.students||[]).find(x=>x.student_id===id);if(s&&ready())printPages([s])};
function ready(){if(!S.date){toast('Isi tanggal Masehi terlebih dahulu.',true);return false}if(!S.hijri.trim()){toast('Isi tanggal Hijriah terlebih dahulu.',true);return false}if(!signer()){toast('Pilih kepala sekolah penanda tangan.',true);return false}if(!signer().signature_url&&!confirm('Tanda tangan kepala sekolah belum tersimpan. Cetak tanpa tanda tangan?'))return false;return true}
window.renderKesiswaanCoverRapor=async function(c){c=c||document.getElementById('content');if(!c)return;css();c.innerHTML='<div class="kcv"><div class="kcv-card kcv-loading">Memuat Cover Rapor…</div></div>';try{S.boot=await api('cover_bootstrap');if(!S.signerId||!(S.boot.signers?.list||[]).some(x=>x.id===S.signerId))S.signerId=S.boot.signers?.current_id||S.boot.signers?.list?.[0]?.id||''}catch(e){c.innerHTML=`<div class="kcv"><div class="kcv-card">${esc(e.message)}</div></div>`;return}c.innerHTML=view();if(S.classId)cqKcvClass(S.classId)};
window.__cqCoverPageHtml=page;window.__cqHijri=hijri;window.__cqCoverPrintCss=PRINT_CSS;
function css(){if(document.getElementById('kcv-css'))return;const s=document.createElement('style');s.id='kcv-css';s.textContent=`
.kcv{max-width:1040px;margin:0 auto;color:#123634}.kcv *{box-sizing:border-box}.kcv-head{margin-bottom:14px}.kcv-eye{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#58718a}.kcv-title{font-size:clamp(21px,2.3vw,25px);font-weight:800;margin-top:4px}.kcv-sub{font-size:12.5px;color:#5f7775;margin-top:4px;line-height:1.5}
.kcv-card{background:#fff;border:1px solid #dbe8e6;border-radius:18px;padding:18px 20px;margin-bottom:14px;box-shadow:0 6px 22px rgba(10,80,76,.05)}.kcv-loading{color:#5f7775}
.kcv-grid{display:grid;grid-template-columns:1.2fr 1fr 1.3fr .8fr;gap:12px}.kcv-grid label span{display:block;font-size:12px;font-weight:700;color:#3d5856;margin-bottom:6px}.kcv-grid select,.kcv-grid input{width:100%;height:42px;border:1px solid #cddfdc;border-radius:10px;padding:0 12px;font:inherit;font-size:13px;background:#fff;color:#123634}
.kcv-row{margin-top:12px}.kcv-link{border:0;background:none;color:#0a6e6e;font:inherit;font-size:11.5px;font-weight:700;text-decoration:underline;cursor:pointer;padding:0;margin-left:6px}.kcv-signer{display:grid;grid-template-columns:minmax(0,1fr) 180px;gap:12px;align-items:end;margin-top:12px}.kcv-signer label span{display:block;font-size:12px;font-weight:700;color:#3d5856;margin-bottom:6px}.kcv-signer select{width:100%;height:42px;border:1px solid #cddfdc;border-radius:10px;padding:0 12px;font:inherit;font-size:13px;background:#fff}.kcv-sig{height:64px;border:1px dashed #cddfdc;border-radius:10px;display:flex;align-items:center;justify-content:center;background:#fafcfc;font-size:11.5px;color:#a86a12}.kcv-sig img{max-height:58px;max-width:170px}.kcv-note{font-size:12px;color:#5f7775;line-height:1.5;margin:10px 0 0}.kcv-switch{display:flex;gap:9px;align-items:flex-start;font-size:12.5px;color:#3d5856;cursor:pointer}.kcv-switch input{width:17px;height:17px;margin-top:1px;accent-color:#0a6e6e}
.kcv-msg{margin-top:12px;padding:10px 13px;border-radius:11px;font-size:13px;font-weight:600}.kcv-msg.ok{background:#e5f5ee;color:#155f45}.kcv-msg.bad{background:#fbeceb;color:#8d2f27}
.kcv-listhead{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;font-size:13px}.kcv-listhead .warn{color:#a86a12;font-weight:700}.kcv-actions{display:flex;gap:8px;flex-wrap:wrap}
.kcv-btn{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:0 15px;border-radius:10px;border:1px solid #0a6e6e;background:#0a6e6e;color:#fff;font:inherit;font-size:12.5px;font-weight:700;cursor:pointer}.kcv-btn:disabled{opacity:.5;cursor:not-allowed}.kcv-btn.ghost{background:#fff;color:#123634;border-color:#c9dbd9}.kcv-btn.sm{min-height:32px;padding:0 12px}
.kcv-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.kcv-item{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e1eceb;border-radius:12px;cursor:pointer}.kcv-item:hover{background:#f8fcfb}.kcv-item.miss{background:#fffaf1;border-color:#f1e0bb}.kcv-item input{width:17px;height:17px;accent-color:#0a6e6e;flex:none}.kcv-item .n{flex:none;width:24px;font-size:12px;color:#7a908e;text-align:right}.kcv-item .t{flex:1;min-width:0}.kcv-item b{display:block;font-size:13px}.kcv-item small{display:block;font-size:11.5px;color:#5f7775}
.kcv-empty{padding:20px;text-align:center;color:#5f7775;background:#f6faf9;border-radius:12px}
@media(max-width:860px){.kcv-signer{grid-template-columns:1fr}.kcv-grid{grid-template-columns:1fr 1fr}.kcv-list{grid-template-columns:1fr}}@media(max-width:520px){.kcv-grid{grid-template-columns:1fr}}
`;document.head.appendChild(s)}
})();
