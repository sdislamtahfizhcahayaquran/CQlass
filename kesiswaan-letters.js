/* CQlass — Buat Surat Kesiswaan
   Keterangan Siswa Aktif · Surat Keterangan Siswa · Dispensasi · Teguran Ekskul.
   Isi surat mengikuti template sekolah (folder SURAT MENYURAT), data siswa diambil dari biodata
   (sama dengan Cover Rapor), nomor otomatis per jenis surat per tahun, cetak A4 dengan kop resmi (Tahoma).
   Khusus role Kesiswaan. */
(function(){
'use strict';
if(window.__cqKesLetters)return;window.__cqKesLetters=true;

const BASE=()=>typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
const KEY=()=>typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}};
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ic=(n,s=16)=>typeof window.cqKesIcon==='function'?window.cqKesIcon(n,s):'';
const SCHOOL='SD Islam Tahfizh Cahaya Qur’an';
const SCHOOL_ADDR='Jl. H. Dimun, Gg. Merah Delima, Kp. Sidamukti 01/01, Sukmajaya Depok, Jawa Barat';
const NPSN='70004670';
const MONTHS=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const DAYS=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const WORDS=['nol','satu','dua','tiga','empat','lima','enam'];

const KINDS={
  aktif:{label:'Keterangan Siswa Aktif',short:'Menerangkan siswa masih aktif bersekolah (untuk keperluan administrasi orang tua).',icon:'idCard',multi:true},
  skkb:{label:'Surat Keterangan Siswa',short:'Keterangan resmi siswa aktif pada jenjang kelas, lengkap dengan NPSN sekolah.',icon:'report',multi:true},
  dispensasi:{label:'Surat Dispensasi',short:'Izin tidak mengikuti KBM untuk lomba/kegiatan; kehadiran dicatat dispensasi.',icon:'calendar',multi:true},
  teguran_ekskul:{label:'Teguran Ekskul',short:'Teguran bagi siswa yang belum mengikuti ekstrakurikuler apa pun.',icon:'alertList',multi:true},
};
const S={kind:'aktif',date:'',students:[],roster:null,boot:null,bio:{},next:null,start:'',signerId:'',useSig:true,
  nrks:'',from:'',to:'',purpose:'',q:'',history:null,busy:false,msg:''};

const iso=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta'}).format(d||new Date());
function longDate(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m?`${m[3]} ${MONTHS[+m[2]-1]} ${m[1]}`:''}
function dayDate(v){const m=String(v||'').match(/^(\d{4})-(\d{2})-(\d{2})/);if(!m)return'';const d=new Date(Date.UTC(+m[1],+m[2]-1,+m[3]));return `${DAYS[d.getUTCDay()]}, ${longDate(v)}`}
function gradeOf(cls){const g=parseInt(String(cls||'').match(/\d+/)?.[0]||'',10);return g?`${g} (${WORDS[g]||g})`:String(cls||'-')}
function gradeCap(cls){const g=parseInt(String(cls||'').match(/\d+/)?.[0]||'',10);return g?`${g} (${(WORDS[g]||'').replace(/^./,c=>c.toUpperCase())})`:String(cls||'-')}

async function rpc(name,body){
  const r=await fetch(BASE()+'/rest/v1/rpc/'+name,{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY(),Authorization:'Bearer '+KEY()},body:JSON.stringify({p_token:token(),...body})});
  let d={};try{d=await r.json()}catch(_){}
  if(!r.ok||d?.success===false)throw Error(d?.message||d?.error||'Gagal memproses surat.');
  return d;
}
async function cover(action,body={}){
  const r=await fetch(BASE()+'/functions/v1/admin-academic-period/student-profiles',{method:'POST',headers:{'Content-Type':'application/json',apikey:KEY(),Authorization:'Bearer '+KEY(),'x-session-token':token()},body:JSON.stringify({action,...body})});
  let d={};try{d=await r.json()}catch(_){}
  if(!r.ok||d?.success===false)throw Error(d?.error||'Biodata siswa belum dapat dimuat.');
  return d;
}
const toast=(m,err)=>{if(typeof showToast==='function')showToast(m,err);else if(err)alert(m)};
const signer=()=>(S.boot?.signers?.list||[]).find(x=>x.id===S.signerId)||null;

async function ensureBio(students){
  const need=[...new Set(students.filter(s=>!S.bio[s.id]).map(s=>s.class_id).filter(Boolean))];
  for(const cid of need){const d=await cover('cover_class',{class_id:cid});for(const b of d.students||[])S.bio[b.student_id]=b}
}
async function refreshNext(){
  try{const d=await rpc('kesiswaan_letter_next',{p_kind:S.kind,p_date:S.date});S.next=d.next;S.start=String(d.next)}catch(e){S.next=null}
}

/* ---------- isi surat (mengikuti template sekolah) ---------- */
function body(kind,p){
  const sig=p.signer||{};
  const signBlock=`<div class="ls-sign"><p>Depok, ${E(longDate(p.issued_on))}<br>${kind==='dispensasi'?'Hormat kami,<br>':''}Kepala Sekolah</p>
    <div class="ls-wet">${p.signature_url?`<img src="${E(p.signature_url)}" alt="">`:''}</div>
    <strong>${E(sig.name||'')}</strong>${p.nrks?`<br>NRKS. ${E(p.nrks)}`:''}</div>`;
  const row=(k,v)=>`<tr><td>${E(k)}</td><td>:</td><td>${v}</td></tr>`;
  if(kind==='aktif')return `<h1>Surat Keterangan</h1><div class="ls-no">${E(p.number_label)}</div>
    <p>Assalamu’alaikum Warahmatullahi Wabarakatuh.</p><p>Yang bertanda tangan di bawah ini:</p>
    <table class="ls-kv">${row('Nama',E(sig.name))}${row('Jabatan','Kepala Sekolah '+SCHOOL)}${row('Alamat',SCHOOL_ADDR)}</table>
    <p>Dengan ini menerangkan bahwa:</p>
    <table class="ls-kv">${row('Nama',`<strong>${E(p.nama)}</strong>`)}${row('NIS/NISN',E(`${p.nis||'-'}/${p.nisn||'-'}`))}${row('Tempat, Tanggal Lahir',E(p.ttl))}${row('Kelas',E(p.kelas))}${row('Alamat',E(p.alamat))}</table>
    <p>Adalah benar masih aktif menjadi peserta didik ${SCHOOL} Tahun Pelajaran ${E(p.tahun_pelajaran)} dan saat ini masih terdaftar serta mengikuti kegiatan dengan baik.</p>
    <p>Demikian surat keterangan ini kami buat untuk dipergunakan sebagaimana mestinya.</p>
    <p>Wassalamu’alaikum Warahmatullahi Wabarakatuh.</p>${signBlock}`;
  if(kind==='skkb')return `<h1>Surat Keterangan Siswa</h1><div class="ls-no">Nomor: ${E(p.number_label)}</div>
    <p>Yang bertanda tangan di bawah ini:</p>
    <table class="ls-kv">${row('Nama',E(sig.name))}${row('Jabatan','Kepala Sekolah')}</table>
    <p>Menerangkan dengan sebenarnya bahwa peserta didik berikut ini:</p>
    <table class="ls-kv">${row('Nama',`<strong>${E(p.nama)}</strong>`)}${row('NIS',E(p.nis||'-'))}${row('NISN',E(p.nisn||'-'))}${row('Tempat, Tanggal Lahir',E(p.ttl))}${row('Kelas',E(gradeOf(p.kelas)))}</table>
    <p>Adalah benar nama siswa tersebut di atas tercatat sebagai siswa aktif pada jenjang kelas ${E(gradeCap(p.kelas))} Tahun Pelajaran ${E(p.tahun_pelajaran)} di ${SCHOOL} NPSN: ${NPSN} Kota Depok Provinsi Jawa Barat.</p>
    <p>Demikian surat keterangan ini diberikan dengan sebenar-benarnya kepada yang bersangkutan untuk dipergunakan sebagaimana mestinya.</p>${signBlock}`;
  if(kind==='dispensasi'){
    const when=p.date_to&&p.date_to!==p.date_from?`${dayDate(p.date_from)} s.d. ${dayDate(p.date_to)}`:dayDate(p.date_from);
    return `<h1>Surat Dispensasi</h1><div class="ls-no">Nomor: ${E(p.number_label)}</div>
    <p>Yang bertanda tangan di bawah ini:</p>
    <table class="ls-kv">${row('Nama',E(sig.name))}${row('Jabatan','Kepala '+SCHOOL)}</table>
    <p>Dengan ini memberikan dispensasi kepada:</p>
    <table class="ls-kv">${row('Nama siswa',`<strong>${E(p.nama)}</strong>`)}${row('NISN',E(p.nisn||'-'))}${row('Kelas',E(p.kelas))}</table>
    <p>Untuk tidak mengikuti kegiatan belajar mengajar di sekolah pada:</p>
    <table class="ls-kv">${row('Hari/Tanggal',E(when))}${row('Keperluan',E(p.purpose))}</table>
    <p>Selama masa dispensasi, ananda tetap berkewajiban menyelesaikan materi dan tugas yang tertinggal dengan berkoordinasi bersama wali kelas. Kehadiran ananda pada hari-hari tersebut dicatat sebagai dispensasi, bukan alpa.</p>
    <p>Demikian surat dispensasi ini dibuat agar dapat dipergunakan sebagaimana mestinya. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih. Semoga Allah Subhanahu wa Ta’ala senantiasa memudahkan urusan kita semua.</p>${signBlock}`;
  }
  return `<h1>Surat Teguran</h1><div class="ls-no">Nomor: ${E(p.number_label)}</div>
    <p>Sehubungan dengan pelaksanaan program kegiatan ekstrakurikuler di ${SCHOOL}, dengan ini kami sampaikan bahwa setiap siswa/i diwajibkan mengikuti minimal 1 (satu) kegiatan ekstrakurikuler yang diselenggarakan oleh sekolah sebagai bagian dari pengembangan bakat, minat, dan karakter siswa.</p>
    <p>Berdasarkan pemantauan kami, siswa/i berikut belum tercatat mengikuti kegiatan ekstrakurikuler apa pun di sekolah:</p>
    <table class="ls-kv">${row('Nama Siswa',`<strong>${E(p.nama)}</strong>`)}${row('Kelas',E(p.kelas))}</table>
    <p>Melalui surat ini, kami mengimbau sekaligus menegur Bapak/Ibu selaku orang tua/wali. Sebagai konsekuensi, siswa/i wajib memenuhi ketentuan berikut:</p>
    <ol><li>Siswa/i wajib mengikuti kegiatan ekstrakurikuler di luar sekolah (lembaga/sanggar/klub resmi) yang sejenis dengan bidang minat dan bakatnya, sebagai pengganti ekstrakurikuler sekolah.</li>
    <li>Siswa/i wajib menyertakan Surat Keterangan Keikutsertaan/Aktif dari lembaga penyelenggara ekstrakurikuler di luar sekolah tersebut, yang diserahkan kepada Bidang Kegiatan sebagai bukti pemenuhan kewajiban.</li>
    <li>Surat keterangan tersebut wajib diserahkan paling lambat 2 (dua) minggu setelah surat teguran ini diterima.</li></ol>
    <p>Apabila hingga batas waktu tersebut siswa/i belum mengikuti ekstrakurikuler (baik di sekolah maupun di luar sekolah) dan/atau belum menyerahkan surat keterangan, maka akan ditindaklanjuti sesuai dengan ketentuan tata tertib sekolah yang berlaku.</p>
    <p>Demikian surat teguran ini kami sampaikan untuk menjadi perhatian dan ditindaklanjuti sebagaimana mestinya. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.</p>${signBlock}`;
}
const LETTER_CSS=`.ls-sheet{font:11pt/1.45 Tahoma,Arial,sans-serif;color:#17202a}
.ls-sheet h1{text-align:center;font-size:14pt;margin:0;text-transform:uppercase;text-decoration:underline;text-underline-offset:2px}
.ls-sheet .ls-no{text-align:center;margin:1mm 0 6mm}
.ls-sheet p{margin:0 0 3mm;text-align:justify}
.ls-sheet .ls-kv{border-collapse:collapse;margin:0 0 3.5mm 8mm}
.ls-sheet .ls-kv td{padding:.6mm 1.5mm;vertical-align:top;border:0}
.ls-sheet .ls-kv td:first-child{width:46mm;padding-left:0}.ls-sheet .ls-kv td:nth-child(2){width:3mm}
.ls-sheet ol{margin:0 0 3mm 4mm;padding-left:5mm}.ls-sheet li{margin-bottom:1.5mm;text-align:justify}
.ls-sheet .ls-sign{margin-left:58%;margin-top:6mm;break-inside:avoid}
.ls-sheet .ls-sign p{text-align:left;margin:0}
.ls-sheet .ls-wet{height:22mm;display:flex;align-items:center}.ls-sheet .ls-wet img{max-height:24mm;max-width:52mm;margin:-2mm 0}`;

function payloadFor(st){
  const b=S.bio[st.id]||{};const sig=signer();
  const alamat=[b.alamat&&b.alamat!=='-'?b.alamat:'',b.kota&&b.kota!=='-'?b.kota:''].filter(Boolean).join(', ');
  return {nama:b.nama||st.name,nis:b.nis||st.nis||'',nisn:b.nisn&&b.nisn!=='-'?b.nisn:'',ttl:b.ttl||'-',kelas:st.class_name,alamat:alamat||'-',
    tahun_pelajaran:S.boot?.academic_year||'',signer:{name:sig?.name||'',position:sig?.position||''},signature_url:S.useSig?(sig?.signature_url||''):'',nrks:S.nrks.trim(),
    issued_on:S.date,date_from:S.from,date_to:S.to,purpose:S.purpose.trim(),has_profile:!!b.has_profile};
}
function printLetters(page,letters){
  const header=new URL('kesiswaan-kop-header.png',location.href).href,footer=new URL('kesiswaan-kop-footer.png',location.href).href;
  const title=letters.length===1?letters[0].number_label:`${KINDS[letters[0].kind]?.label||'Surat'} (${letters.length} surat)`;
  page.document.open();
  page.document.write(`<!doctype html><html lang="id"><meta charset="utf-8"><title>${E(title)}</title><style>
    @page{size:A4;margin:52mm 20mm 29mm}
    body{margin:0 auto;max-width:174mm}
    .kop,.footer{display:block;height:auto;max-width:none;margin:0}.kop{width:205.3mm}.footer{width:178.8mm}
    ${LETTER_CSS}
    .bar{font:14px system-ui;margin-bottom:5mm;display:flex;gap:8px;align-items:center}.bar button{font:600 14px system-ui;padding:8px 14px;border-radius:8px;border:1px solid #0A6E6E;background:#0A6E6E;color:#fff;cursor:pointer}
    @media screen{body{padding:8mm;max-width:none;background:#eef2f3}.letter{box-sizing:border-box;position:relative;clip-path:inset(0);width:210mm;min-height:297mm;margin:0 auto 6mm;padding:52mm 20mm 29mm;background:#fff;box-shadow:0 0 0 1px #d0d5dd}.kop,.footer{position:absolute}.kop{left:6.7mm;top:-1.46mm}.footer{left:18mm;bottom:.3mm}}
    @media print{.bar{display:none}.letter+.letter{break-before:page}.kop,.footer{position:fixed}.kop{left:-13.3mm;top:-53.46mm}.footer{left:-2mm;bottom:-28.7mm}}
  </style><div class="bar"><button onclick="print()">Cetak / Simpan PDF</button><span>${letters.length} surat · ukuran A4</span></div>
  ${letters.map(l=>`<div class="letter"><img class="kop" alt="" src="${E(header)}"><main class="ls-sheet">${body(l.kind,{...l.payload,number_label:l.number_label,issued_on:l.issued_on})}</main><img class="footer" alt="" src="${E(footer)}"></div>`).join('')}
  </html>`);
  page.document.close();
}

/* ---------- tampilan ---------- */
function css(){
  if(document.getElementById('kl-css'))return;
  const s=document.createElement('style');s.id='kl-css';
  s.textContent=`.kl{max-width:1180px;margin:0 auto;color:#12302F}
.kl h1.kl-title{margin:0 0 4px;font-size:26px}.kl .kl-sub{margin:0 0 16px;color:#4A6766;font-size:14px}
.kl-kinds{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:14px}
@media(max-width:900px){.kl-kinds{grid-template-columns:repeat(2,minmax(0,1fr))}}
.kl-kind{all:unset;cursor:pointer;background:#fff;border:1px solid #D9E5E4;border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:6px;position:relative;transition:box-shadow .2s,border-color .2s,transform .12s}
.kl-kind:hover{border-color:rgba(45,212,191,.7);box-shadow:0 10px 22px -12px rgba(10,110,110,.45)}
.kl-kind.active{border-color:#0A6E6E;box-shadow:0 0 0 3px rgba(45,212,191,.22)}
.kl-kind.active::before{content:'';position:absolute;left:14px;right:14px;top:0;height:3px;border-radius:0 0 3px 3px;background:#2DD4BF;box-shadow:0 0 12px rgba(45,212,191,.8)}
.kl-kind .ico{width:36px;height:36px;border-radius:10px;display:grid;place-items:center;background:#E4F4F1;color:#0A6E6E}
.kl-kind b{font-size:15px}.kl-kind span{font-size:12.5px;color:#4A6766;line-height:1.4}
.kl-grid{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:14px;align-items:start}
@media(max-width:1000px){.kl-grid{grid-template-columns:1fr}}
.kl-card{background:#fff;border:1px solid #D9E5E4;border-radius:14px;padding:16px}
.kl-card h2{margin:0 0 10px;font-size:17px}
.kl-field{display:block;margin-bottom:12px}.kl-field>span{display:block;font-size:13px;font-weight:500;color:#4A6766;margin-bottom:5px}
.kl-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.kl-search{position:relative}.kl-results{position:absolute;z-index:30;left:0;right:0;top:100%;margin-top:4px;background:#fff;border:1px solid #CFE2DF;border-radius:12px;box-shadow:0 14px 30px -12px rgba(10,60,60,.35);max-height:300px;overflow:auto}
.kl-results button{all:unset;display:flex;justify-content:space-between;gap:8px;width:100%;box-sizing:border-box;padding:9px 12px;cursor:pointer;font-size:14px}
.kl-results button:hover,.kl-results button:focus{background:#EEF8F6}.kl-results small{color:#6B8584}
.kl-chips{display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 2px}.kl-chip{display:inline-flex;align-items:center;gap:6px;background:#E8F5F2;color:#0B5E5A;border-radius:999px;padding:5px 6px 5px 11px;font-size:13px}
.kl-chip.warn{background:#FFF5DF;color:#94610F}.kl-chip button{all:unset;cursor:pointer;width:20px;height:20px;border-radius:50%;display:grid;place-items:center;background:rgba(0,0,0,.06)}
.kl-chip button:hover{background:rgba(200,67,47,.15);color:#B03A2E}
.kl-note{font-size:12.5px;color:#6B8584;margin:4px 0 0}
.kl-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.kl-btn{all:unset;cursor:pointer;display:inline-flex;align-items:center;gap:7px;border-radius:10px;padding:10px 16px;font-weight:500;font-size:14px;border:1px solid #CFE2DF;background:#fff;color:#0A6E6E}
.kl-btn.primary{background:linear-gradient(135deg,#0A6E6E,#0E8F84 60%,#14A89A);color:#fff;border-color:transparent;box-shadow:0 6px 16px -6px rgba(10,110,110,.55)}
.kl-btn[disabled]{opacity:.5;cursor:not-allowed}
.kl-preview{background:#EEF2F3;border-radius:12px;padding:12px;overflow:auto;max-height:640px}
.kl-paper{background:#fff;width:174mm;margin:0 auto;padding:10mm 12mm;box-shadow:0 0 0 1px #d0d5dd}
.kl input:not([type=checkbox]),.kl select,.kl textarea{width:100%;box-sizing:border-box;min-height:40px;border:1px solid #CFE2DF;border-radius:10px;padding:8px 11px;font:inherit;font-size:14px;background:#fff;color:#12302F}
.kl textarea{min-height:70px;resize:vertical}.kl input:focus,.kl select:focus,.kl textarea:focus{outline:none;border-color:#0A6E6E;box-shadow:0 0 0 3px rgba(45,212,191,.25)}
.kl-hist table{width:100%}.kl-err{color:#9B2C22;background:#FDF3F2;border:1px solid #F3CFCB;border-radius:10px;padding:10px;margin-bottom:10px;font-size:13px}
${LETTER_CSS}`;
  document.head.appendChild(s);
}

function studentsHtml(){
  return S.students.map(st=>{const b=S.bio[st.id];const miss=b&&!b.has_profile;return `<span class="kl-chip ${miss?'warn':''}" title="${miss?'Biodata belum diunggah Admin':''}">${E(st.name)} · ${E(st.class_name)}<button type="button" aria-label="Hapus ${E(st.name)}" data-kl-rm="${E(st.id)}">×</button></span>`}).join('')||'<p class="kl-note">Belum ada siswa. Ketik nama, NIS, atau kelas.</p>';
}
function resultsHtml(){
  const q=S.q.trim().toLowerCase();if(!q||!S.roster)return'';
  const chosen=new Set(S.students.map(s=>s.id));
  const rows=S.roster.filter(s=>!chosen.has(s.id)&&(String(s.name).toLowerCase().includes(q)||String(s.nis||'').startsWith(q)||String(s.class_name).toLowerCase()===q)).slice(0,30);
  const cls=S.roster.filter(s=>String(s.class_name).toLowerCase()===q&&!chosen.has(s.id));
  return `<div class="kl-results" role="listbox">${cls.length>1?`<button type="button" data-kl-class="${E(cls[0].class_name)}"><b>Tambah semua siswa ${E(cls[0].class_name)}</b><small>${cls.length} siswa</small></button>`:''}${rows.map(s=>`<button type="button" role="option" data-kl-add="${E(s.id)}"><span>${E(s.name)}</span><small>${E(s.class_name)} · NIS ${E(s.nis||'-')}</small></button>`).join('')||'<button type="button" disabled><small>Tidak ditemukan</small></button>'}</div>`;
}
function previewHtml(){
  const st=S.students[0];
  if(!st)return '<p class="kl-note">Pratinjau muncul setelah siswa dipilih.</p>';
  const p=payloadFor(st);const label=S.next?`${String(Number(S.start||S.next)).padStart(3,'0')}/… (nomor final dibuat saat terbit)`:'nomor dibuat saat terbit';
  return `<div class="kl-paper ls-sheet">${body(S.kind,{...p,number_label:label})}</div>`;
}
function historyHtml(){
  const h=S.history;if(!h)return '<p class="kl-note"><span class="spinner"></span> Memuat riwayat…</p>';
  if(!h.length)return '<p class="kl-note">Belum ada surat yang diterbitkan dari CQlass.</p>';
  return `<table><thead><tr><th>Nomor</th><th>Jenis</th><th>Siswa</th><th>Tanggal</th><th></th></tr></thead><tbody>${h.slice(0,60).map(l=>`<tr><td>${E(l.number_label)}</td><td>${E(KINDS[l.kind]?.label||l.kind)}</td><td>${E(l.payload?.nama||'-')} <small style="color:#6B8584">${E(l.payload?.kelas||'')}</small></td><td>${E(longDate(l.issued_on))}</td><td><button type="button" class="kl-btn" data-kl-reprint="${E(l.id)}">${ic('printer',15)} Cetak ulang</button></td></tr>`).join('')}</tbody></table>`;
}
function view(){
  const k=KINDS[S.kind],signers=S.boot?.signers?.list||[];
  const missing=S.students.filter(s=>S.bio[s.id]&&!S.bio[s.id].has_profile).length;
  return `<div class="kl"><h1 class="kl-title">Buat Surat</h1><p class="kl-sub">Pilih jenis surat dan siswa, periksa pratinjau, lalu terbitkan. Nomor surat dibuat otomatis dan surat langsung terbuka untuk dicetak.</p>
  <div class="kl-kinds" role="radiogroup" aria-label="Jenis surat">${Object.entries(KINDS).map(([id,x])=>`<button type="button" role="radio" aria-checked="${id===S.kind}" class="kl-kind ${id===S.kind?'active':''}" data-kl-kind="${id}"><span class="ico">${ic(x.icon,18)}</span><b>${E(x.label)}</b><span>${E(x.short)}</span></button>`).join('')}</div>
  ${S.msg?`<div class="kl-err">${E(S.msg)}</div>`:''}
  <div class="kl-grid"><div>
   <div class="kl-card"><h2>Siswa</h2>
    <div class="kl-search"><label class="kl-field" style="margin:0"><span>Cari nama, NIS, atau ketik nama kelas (mis. 5B Banat)</span><input id="kl-q" autocomplete="off" value="${E(S.q)}" placeholder="Ketik minimal 2 huruf"></label>${resultsHtml()}</div>
    <div class="kl-chips">${studentsHtml()}</div>
    ${missing?`<p class="kl-note">${missing} siswa ditandai kuning: biodata belum diunggah Admin, isian tempat/tanggal lahir & alamat akan berisi "-".</p>`:''}
   </div>
   <div class="kl-card" style="margin-top:14px"><h2>Detail surat</h2>
    <div class="kl-row"><label class="kl-field"><span>Tanggal surat</span><input type="date" id="kl-date" value="${E(S.date)}"></label>
    <label class="kl-field"><span>Nomor urut mulai${S.next?` (berikutnya: ${S.next})`:''}</span><input type="number" min="1" max="9999" id="kl-start" value="${E(S.start)}"></label></div>
    ${S.kind==='dispensasi'?`<div class="kl-row"><label class="kl-field"><span>Tanggal dispensasi</span><input type="date" id="kl-from" value="${E(S.from)}"></label><label class="kl-field"><span>Sampai tanggal (bila lebih dari sehari)</span><input type="date" id="kl-to" value="${E(S.to)}"></label></div>
    <label class="kl-field"><span>Keperluan</span><textarea id="kl-purpose" maxlength="400" placeholder="mis. Perlombaan Panahan EOSTA yang diselenggarakan oleh SMP An Nahl Islamic School">${E(S.purpose)}</textarea></label>`:''}
    <div class="kl-row"><label class="kl-field"><span>Penanda tangan</span><select id="kl-signer">${signers.map(x=>`<option value="${E(x.id)}" ${x.id===S.signerId?'selected':''}>${E(x.name)}</option>`).join('')||'<option value="">Belum ada kepala sekolah</option>'}</select></label>
    <label class="kl-field"><span>NRKS</span><input id="kl-nrks" value="${E(S.nrks)}" placeholder="NRKS kepala sekolah"></label></div>
    <label class="kl-field" style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="kl-sig" ${S.useSig?'checked':''} ${signer()?.signature_url?'':'disabled'}><span style="margin:0">${signer()?.signature_url?'Pakai tanda tangan digital kepala sekolah':'Tanda tangan digital belum ada (diisi tanda tangan basah)'}</span></label>
    <div class="kl-actions"><button type="button" class="kl-btn primary" id="kl-issue" ${S.students.length&&!S.busy?'':'disabled'}>${ic('printer',16)} Terbitkan & cetak ${S.students.length||''} surat</button></div>
    <p class="kl-note">Nomor format: ${E({aktif:'050/SK/SDCQ/VIII/2026',skkb:'018/SK-K/SDCQ/III/2026',dispensasi:'001/DSP/SDIT-CQ/X/2026',teguran_ekskul:'051/STG/SDITCQ/VIII/2026'}[S.kind])} — urutan per jenis surat per tahun. Ubah "nomor urut mulai" bila ingin melanjutkan nomor surat manual.</p>
   </div>
  </div>
  <div class="kl-card"><h2>Pratinjau ${S.students.length>1?`(surat 1 dari ${S.students.length})`:''}</h2><div class="kl-preview">${previewHtml()}</div></div></div>
  <div class="kl-card kl-hist" style="margin-top:14px"><h2>Riwayat surat</h2>${historyHtml()}</div></div>`;
}

let root=null;
function draw(keepFocus){
  if(!root||!root.isConnected)return;
  const active=document.activeElement?.id,pos=document.activeElement?.selectionStart;
  const wrap=root.querySelector('.kl');if(wrap)wrap.outerHTML=view();else root.insertAdjacentHTML('beforeend',view());
  bind();fit();
  if(keepFocus&&active){const el=document.getElementById(active);if(el){el.focus();try{el.setSelectionRange(pos,pos)}catch(_){}}}
}
function fit(){const box=root.querySelector('.kl-preview'),pp=box?.querySelector('.kl-paper');if(!pp)return;pp.style.zoom='';const z=Math.min(1,(box.clientWidth-24)/pp.offsetWidth);if(z>0)pp.style.zoom=z.toFixed(3)}
window.addEventListener('resize',()=>{if(root?.isConnected)fit()});
function bind(){
  root.querySelectorAll('[data-kl-kind]').forEach(b=>b.onclick=async()=>{S.kind=b.dataset.klKind;S.msg='';await refreshNext();draw()});
  const q=document.getElementById('kl-q');if(q)q.oninput=()=>{S.q=q.value;draw(true)};
  if(q)q.onkeydown=e=>{if(e.key==='Escape'){S.q='';draw(true)}};
  root.querySelectorAll('[data-kl-add]').forEach(b=>b.onclick=()=>add(S.roster.filter(s=>s.id===b.dataset.klAdd)));
  root.querySelectorAll('[data-kl-class]').forEach(b=>b.onclick=()=>add(S.roster.filter(s=>s.class_name===b.dataset.klClass)));
  root.querySelectorAll('[data-kl-rm]').forEach(b=>b.onclick=()=>{S.students=S.students.filter(s=>s.id!==b.dataset.klRm);draw()});
  const bindVal=(id,key,redraw)=>{const el=document.getElementById(id);if(el)el.oninput=el.onchange=()=>{S[key]=el.value;if(key==='nrks')try{localStorage.setItem('cq_kes_nrks',el.value)}catch(_){};if(redraw)draw(true)}};
  bindVal('kl-from','from',true);bindVal('kl-to','to',true);bindVal('kl-purpose','purpose',true);bindVal('kl-nrks','nrks',true);bindVal('kl-start','start',true);
  const d=document.getElementById('kl-date');if(d)d.onchange=async()=>{S.date=d.value;await refreshNext();draw()};
  const sg=document.getElementById('kl-signer');if(sg)sg.onchange=()=>{S.signerId=sg.value;draw()};
  const cb=document.getElementById('kl-sig');if(cb)cb.onchange=()=>{S.useSig=cb.checked;draw()};
  const go=document.getElementById('kl-issue');if(go)go.onclick=issue;
  root.querySelectorAll('[data-kl-reprint]').forEach(b=>b.onclick=()=>{const l=(S.history||[]).find(x=>x.id===b.dataset.klReprint);if(!l)return;const page=window.open('','_blank');if(!page)return toast('Izinkan pop-up untuk mencetak.',true);page.opener=null;printLetters(page,[l])});
}
async function add(list){
  S.q='';S.students=[...S.students,...list.filter(s=>!S.students.some(x=>x.id===s.id))].slice(0,60);S.msg='';draw();
  try{await ensureBio(S.students);draw()}catch(e){S.msg=e.message;draw()}
}
async function issue(){
  S.msg='';
  if(!S.students.length)return;
  if(!S.date){S.msg='Isi tanggal surat.';return draw()}
  if(S.kind==='dispensasi'&&(!S.from||!S.purpose.trim())){S.msg='Isi tanggal dispensasi dan keperluannya.';return draw()}
  if(S.kind==='dispensasi'&&S.to&&S.to<S.from){S.msg='Tanggal "sampai" harus sama atau setelah tanggal dispensasi.';return draw()}
  if(!signer()){S.msg='Pilih kepala sekolah penanda tangan.';return draw()}
  const page=window.open('','_blank');if(page){page.opener=null;page.document.body.textContent='Menerbitkan surat…'}
  S.busy=true;draw();
  try{
    await ensureBio(S.students);
    const start=parseInt(S.start,10);
    const d=await rpc('kesiswaan_letter_issue',{p_kind:S.kind,p_date:S.date,p_items:S.students.map(st=>({student_id:st.id,payload:payloadFor(st)})),p_start:Number.isFinite(start)?start:null});
    if(page)printLetters(page,d.letters);
    try{await rpc('kesiswaan_letter_printed',{p_ids:d.letters.map(l=>l.id)})}catch(_){}
    toast(`${d.letters.length} surat terbit: ${d.letters[0].number_label}${d.letters.length>1?' s.d. '+d.letters.at(-1).number_label:''}.`);
    S.students=[];S.history=null;await Promise.all([refreshNext(),loadHistory()]);
  }catch(e){if(page)page.close();S.msg=e.message}
  S.busy=false;draw();
}
async function loadHistory(){try{const d=await rpc('kesiswaan_letter_list',{p_limit:100});S.history=d.letters||[]}catch(e){S.history=[]}}

window.renderKesiswaanLetters=async function(content){
  if(!content)return;css();root=content;S.date=S.date||iso();S.msg='';
  try{S.nrks=S.nrks||localStorage.getItem('cq_kes_nrks')||'21023L0010266221229613'}catch(_){S.nrks='21023L0010266221229613'}
  content.innerHTML='<div class="kl"><div class="kl-card"><span class="spinner"></span> Menyiapkan surat…</div></div>';
  try{
    const [boot,roster]=await Promise.all([S.boot?Promise.resolve(S.boot):cover('cover_bootstrap'),S.roster?Promise.resolve({students:S.roster}):rpc('kesiswaan_roster',{})]);
    S.boot=boot;S.roster=roster.students||[];
    if(!S.signerId)S.signerId=boot.signers?.current_id||boot.signers?.list?.[0]?.id||'';
    await Promise.all([refreshNext(),loadHistory()]);
    if(!root.isConnected)return;
    root.innerHTML='';draw();
  }catch(e){content.innerHTML=`<div class="kl"><div class="kl-err">${E(e.message)}</div></div>`}
};
window.__cqKesLetterBody=body;
})();
