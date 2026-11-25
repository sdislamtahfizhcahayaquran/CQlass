/* CQlass — Upload Form Wawancara Siswa (Word .docx) untuk Kabid Kesiswaan
   File dibaca langsung di browser (JSZip), dikenali per bagian form wawancara Kesiswaan
   (identitas, masalah dilaporkan, tanya-jawab, temuan & tingkat, rencana penanganan, evaluasi),
   lalu disimpan sebagai catatan "kasus" di student_affairs_records sehingga otomatis
   masuk ke Pendampingan Siswa dan Laporan Kesiswaan (Pembinaan & Kasus).
   File Word tidak diunggah ke server; hanya isi teksnya yang disimpan. */
(function(){
'use strict';
if(window.__cqKesInterview)return;window.__cqKesInterview=true;

const T=v=>String(v??'').replace(/\s+/g,' ').trim();
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g,'').replace(/\([^)]*\)/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
const W='http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const MONTHS={januari:1,februari:2,maret:3,april:4,mei:5,juni:6,juli:7,agustus:8,september:9,oktober:10,november:11,desember:12};

/* ---------- membaca document.xml ---------- */
function kids(el,name){return [...el.childNodes].filter(n=>n.nodeType===1&&n.namespaceURI===W&&n.localName===name)}
function paraText(p){
  let s='';
  const walk=n=>{for(const c of n.childNodes){if(c.nodeType!==1)continue;
    if(c.namespaceURI===W&&c.localName==='t')s+=c.textContent;
    else if(c.namespaceURI===W&&(c.localName==='tab'))s+=' ';
    else if(c.namespaceURI===W&&(c.localName==='br'||c.localName==='cr'))s+='\n';
    else if(c.namespaceURI===W&&c.localName==='sym'){const ch=c.getAttributeNS(W,'char')||'';s+=/^(F0FE|00FE|2611)$/i.test(ch)?'☑':/^(F0A8|00A8|2610|F06F)$/i.test(ch)?'☐':''}
    else walk(c)}};
  walk(p);return s;
}
function cellText(tc){
  const out=[];
  for(const c of tc.childNodes){if(c.nodeType!==1||c.namespaceURI!==W)continue;
    if(c.localName==='p')out.push(paraText(c));
    else if(c.localName==='tbl')out.push(tableRows(c).map(r=>r.join(' | ')).join('\n'));}
  return out.join('\n').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function tableRows(tbl){
  return kids(tbl,'tr').map(tr=>kids(tr,'tc').filter(tc=>{
    const vm=tc.getElementsByTagNameNS(W,'vMerge')[0];
    return !(vm&&!vm.getAttributeNS(W,'val'));     // sel lanjutan merge vertikal dilewati
  }).map(cellText));
}
/** Urutan blok body: {type:'p',text} / {type:'tbl',rows} */
function blocks(xml){
  const doc=new DOMParser().parseFromString(xml,'application/xml');
  const body=doc.getElementsByTagNameNS(W,'body')[0];if(!body)throw Error('File Word tidak dikenali.');
  const out=[];
  for(const n of body.childNodes){if(n.nodeType!==1||n.namespaceURI!==W)continue;
    if(n.localName==='p'){const t=paraText(n).trim();if(t)out.push({type:'p',text:t})}
    else if(n.localName==='tbl')out.push({type:'tbl',rows:tableRows(n)});
    else if(n.localName==='sdt'){for(const p of n.getElementsByTagNameNS(W,'p')){const t=paraText(p).trim();if(t)out.push({type:'p',text:t})}}}
  return out;
}

/* ---------- mengenali bagian form ---------- */
const checked=s=>[...String(s||'').matchAll(/☑\s*([^☐☑\n]+)/g)].map(m=>T(m[1])).filter(Boolean);
const stripBoxes=s=>String(s||'').split('\n').filter(l=>!/[☐☑]/.test(l)).join('\n').trim();
const freeText=s=>String(s||'').split('\n').map(l=>l.replace(/[☐☑][^☐☑]*/g,'').trim()).filter(Boolean).join(' ');
function idDate(s){const m=String(s||'').toLowerCase().match(/(\d{1,2})\s+([a-z]+)\s+(\d{4})/);if(!m||!MONTHS[m[2]])return'';return `${m[3]}-${String(MONTHS[m[2]]).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`}
const head=rows=>(rows[0]||[]).map(x=>T(x).toLowerCase());

function parseInterview(xml){
  const bl=blocks(xml),r={info:{},reported:[],qa:[],temuan:[],sikap:{},rencana:[],komitmen:[],lain:[],analisis:'',evaluasi:'',nomor:'',judul:'',form:''};
  let section='',sub='';
  bl.forEach((b,i)=>{
    if(b.type==='p'){
      const t=T(b.text);
      if(/^FORM\s+WAWANCARA/i.test(t)){r.form=t;const nx=bl[i+1];if(nx&&nx.type==='p'&&!/^No\.?\s/i.test(nx.text))r.judul=T(nx.text)}
      else if(/^No\.?\s*[\w./-]+/i.test(t)&&!r.nomor)r.nomor=t.replace(/^No\.?\s*/i,'');
      else if(/^[A-J]\.\d*\s/.test(t)){if(/^[A-J]\.\s/.test(t)){section=t;sub=''}else sub=t}
      return;
    }
    const rows=b.rows;if(!rows.length)return;
    const h=head(rows),hs=h.join(' | ');
    if(!Object.keys(r.info).length&&rows.every(x=>x.length===2)&&rows.some(x=>/nama\s+siswa/i.test(x[0]))){
      for(const [k,v] of rows)r.info[T(k)]=T(v);return;
    }
    if(hs.includes('masalah yang dilaporkan')){r.reported=rows.slice(1).map(x=>({masalah:T(x[1]),sumber:T(x[2])})).filter(x=>x.masalah);return}
    if(hs.includes('temuan utama')){r.temuan=rows.slice(1).map(x=>({aspek:T(x[0]),temuan:T(x[1]),tingkat:checked(x[2])[0]||T(x[2]),pemicu:T(x[3])})).filter(x=>x.aspek);return}
    if(hs.includes('langkah penanganan')){r.rencana=rows.slice(1).map(x=>({aspek:T(x[0]),langkah:String(x[1]||'').trim(),pj:T(x[2]),waktu:T(x[3]),indikator:T(x[4])})).filter(x=>x.aspek);return}
    if(hs.includes('langkah kecil')){r.komitmen=rows.slice(1).map(x=>({aspek:T(x[0]),langkah:T(x[1]),dukungan:T(x[2])})).filter(x=>x.aspek);return}
    if(hs.includes('pertanyaan')||hs.includes('lengkapi kalimat')){
      for(const x of rows.slice(1)){const q=stripBoxes(x[1])||T(x[1]),a=String(x[2]||'').trim();if(q)r.qa.push({bagian:sub||section,q:T(q),a,pilihan:checked(x[1])})}
      return;
    }
    if(rows.every(x=>x.length===2)&&rows.some(x=>/sikap selama|tindak lanjut|konsistensi/i.test(x[0]))){
      for(const [k,v] of rows)r.sikap[T(k)]={pilihan:checked(v),teks:freeText(v)};return;
    }
    if(rows.length===1&&rows[0].length===1){
      const t=String(rows[0][0]||'').trim();
      if(/^I\.1/.test(sub))r.analisis=t;else if(/^I\.3/.test(sub))r.evaluasi=t;else r.lain.push({bagian:sub||section,teks:t});
      return;
    }
    if(rows.length>1&&h.length>=3&&!/^(pewawancara|siswa)/i.test(h[0]))r.lain.push({bagian:sub||section,teks:rows.map(x=>x.map(T).join(' | ')).join('\n')});
  });
  return r;
}

/* ---------- menyusun laporan ---------- */
const LEVEL={berat:3,sedang:2,ringan:1};
function buildRecord(p){
  const info=k=>{const key=Object.keys(p.info).find(x=>x.toLowerCase().startsWith(k));return key?p.info[key]:''};
  const lines=[];
  lines.push(`Form: ${[p.form,p.judul].filter(Boolean).join(' — ')}${p.nomor?` (No. ${p.nomor})`:''}`);
  lines.push(`Waktu: ${info('tanggal')||'-'} · Tempat: ${info('tempat')||'-'} · Pewawancara: ${info('pewawancara')||'-'}`);
  if(p.reported.length){lines.push('','DASAR WAWANCARA (laporan awal)');p.reported.forEach((x,i)=>lines.push(`${i+1}. ${x.masalah}${x.sumber?` — sumber: ${x.sumber}`:''}`))}
  if(p.temuan.length){lines.push('','TEMUAN & TINGKAT');p.temuan.forEach(x=>lines.push(`- ${x.aspek} [${x.tingkat||'-'}]: ${x.temuan}${x.pemicu?` (Dugaan pemicu: ${x.pemicu})`:''}`))}
  const sk=Object.entries(p.sikap);
  if(sk.length){lines.push('','SIKAP & CATATAN PEWAWANCARA');sk.forEach(([k,v])=>lines.push(`- ${k}: ${[v.pilihan.join(', '),v.teks].filter(Boolean).join(' — ')}`))}
  if(p.analisis){lines.push('','ANALISIS',p.analisis)}
  if(p.qa.length){
    lines.push('','CATATAN WAWANCARA');let last='';
    for(const x of p.qa){if(x.bagian!==last){lines.push(`[${x.bagian||'Wawancara'}]`);last=x.bagian}lines.push(`• ${x.q}${x.pilihan.length?` (${x.pilihan.join(', ')})`:''}`,`  → ${String(x.a||'-').replace(/\n+/g,' ')}`)}
  }
  p.lain.forEach(x=>{lines.push('',`[${x.bagian||'Catatan'}]`,x.teks)});
  const fu=[];
  if(p.rencana.length){fu.push('RENCANA PENANGANAN');p.rencana.forEach(x=>fu.push(`- ${x.aspek}: ${String(x.langkah).replace(/\n+/g,' ')}${x.pj?` | PJ: ${x.pj}`:''}${x.waktu?` | Waktu: ${x.waktu}`:''}${x.indikator?` | Indikator: ${x.indikator}`:''}`))}
  if(p.komitmen.length){fu.push('','KOMITMEN SISWA');p.komitmen.forEach(x=>fu.push(`- ${x.aspek}: ${x.langkah}${x.dukungan?` (dukungan: ${x.dukungan})`:''}`))}
  const tl=p.sikap['Tindak lanjut'];if(tl&&tl.pilihan.length)fu.push('',`TINDAK LANJUT: ${tl.pilihan.join(', ')}`);
  const pi=p.sikap['Pihak yang diinformasikan'];if(pi&&pi.teks)fu.push(`PIHAK DIINFORMASIKAN: ${pi.teks}`);
  const ev=p.sikap['Tanggal evaluasi lanjutan'];if(ev&&ev.teks)fu.push(`JADWAL EVALUASI: ${ev.teks}`);
  if(p.evaluasi)fu.push('','PENILAIAN ULANG',p.evaluasi);
  const top=p.temuan.reduce((m,x)=>Math.max(m,LEVEL[String(x.tingkat).toLowerCase()]||0),0);
  const attention=(p.sikap['Tanda yang perlu perhatian khusus']?.pilihan||[]).some(x=>/^ada/i.test(x));
  const title=T(`Wawancara${p.nomor?` ${p.nomor}`:''}: ${p.judul||p.reported.map(x=>x.masalah).join(', ')||'Pembinaan siswa'}`).slice(0,180);
  return {
    title,
    record_date:idDate(info('tanggal'))||idDate(p.nomor)||'',
    description:lines.join('\n').trim(),
    follow_up:fu.join('\n').trim(),
    priority:top>=3?'tinggi':top===2||attention?'normal':'rendah',
    status:'dalam_penanganan',
    student_name:T(info('nama siswa')).replace(/\s*\([^)]*\)\s*$/,''),
    class_name:T(info('kelas')),
  };
}
function matchStudent(roster,name,cls){
  const n=norm(name),c=norm(cls);
  let m=roster.filter(s=>norm(s.name)===n);
  if(m.length>1&&c)m=m.filter(s=>norm(s.class_name)===c);
  if(!m.length&&n){const parts=n.split(' ');m=roster.filter(s=>{const sn=norm(s.name);return parts.length>1&&parts.every(p=>sn.includes(p))});if(m.length>1&&c)m=m.filter(s=>norm(s.class_name)===c)}
  return m.length===1?m[0]:null;
}
window.cqKesInterviewParse=(xml)=>{const p=parseInterview(xml);return {parsed:p,record:buildRecord(p)}};
window.cqKesInterviewMatch=matchStudent;

/* ---------- jaringan ---------- */
const BASE=()=>typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co';
const KEY=()=>typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';
const token=()=>{try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}};
async function call(url,body){
  const r=await fetch(url,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json',apikey:KEY(),Authorization:'Bearer '+KEY(),'x-session-token':token()},body:JSON.stringify(body)});
  let d={};try{d=await r.json()}catch(_){}
  if(!r.ok||d?.success===false)throw Error(d?.message||d?.error||'Gagal memproses.');
  return d;
}
let rosterCache=null;
async function roster(){if(!rosterCache)rosterCache=call(BASE()+'/rest/v1/rpc/kesiswaan_roster',{p_token:token()}).then(d=>d.students||[]).catch(e=>{rosterCache=null;throw e});return rosterCache}
async function readDocx(file){
  if(!/\.docx$/i.test(file.name))throw Error('Pilih file Word berformat .docx (bukan .doc / PDF).');
  if(file.size>15*1024*1024)throw Error('File terlalu besar (maks 15 MB).');
  const JSZip=await (typeof rpLoadScript==='function'?rpLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','JSZip'):Promise.resolve(window.JSZip));
  const zip=await (JSZip||window.JSZip).loadAsync(await file.arrayBuffer());
  const xml=await zip.file('word/document.xml')?.async('string');
  if(!xml)throw Error('Isi dokumen Word tidak ditemukan.');
  return xml;
}

/* ---------- tampilan (modal di halaman yang sama) ---------- */
function css(){
  if(document.getElementById('cqi-css'))return;
  const s=document.createElement('style');s.id='cqi-css';
  s.textContent=`.cqi-ov{position:fixed;inset:0;background:rgba(15,40,40,.45);z-index:9999;display:grid;place-items:center;padding:16px;font-family:'Plus Jakarta Sans',Inter,system-ui,sans-serif}
.cqi{background:#fff;border-radius:16px;width:min(880px,100%);max-height:92vh;display:flex;flex-direction:column;box-shadow:0 20px 50px rgba(0,0,0,.25);color:#16343a}
.cqi-h{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:14px 18px;border-bottom:1px solid #e6efee}
.cqi-h h2{margin:0;font-size:17px}.cqi-b{padding:16px 18px;overflow:auto}.cqi-f{padding:12px 18px;border-top:1px solid #e6efee;display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}
.cqi-drop{border:2px dashed #b9d6d2;border-radius:14px;padding:30px;text-align:center;color:#4e6b6a;cursor:pointer;background:#f6fbfa}
.cqi-drop.over{border-color:#0a6e6e;background:#e9f6f3}
.cqi-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-bottom:12px}
@media(max-width:640px){.cqi-grid{grid-template-columns:1fr}}
.cqi label{display:block;font-size:11.5px;font-weight:800;color:#5f7a79;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px}
.cqi input,.cqi select,.cqi textarea{width:100%;box-sizing:border-box;border:1px solid #cfe2df;border-radius:9px;padding:8px 10px;font:inherit;font-size:13px;color:#16343a;background:#fff}
.cqi textarea{min-height:150px;font-family:inherit;line-height:1.45}
.cqi-t{width:100%;border-collapse:collapse;font-size:12.5px;margin:4px 0 12px}.cqi-t th,.cqi-t td{border:1px solid #e3ecea;padding:6px 8px;text-align:left;vertical-align:top}.cqi-t th{background:#f4f9f8}
.cqi-lv{display:inline-block;border-radius:999px;padding:2px 8px;font-weight:800;font-size:11px}.lv-berat{background:#fdecec;color:#b03a2e}.lv-sedang{background:#fff5df;color:#94610f}.lv-ringan{background:#e3f5ea;color:#1e7a46}
.cqi-note{font-size:12.5px;color:#5f7a79;margin:0 0 10px}.cqi-err{color:#9b2c22;background:#fdf3f2;border:1px solid #f3cfcb;border-radius:10px;padding:10px;margin-bottom:10px;font-size:13px}
.cqi-ok{color:#1e7a46;background:#e9f7ee;border:1px solid #bfe5cc;border-radius:10px;padding:10px;margin-bottom:10px;font-size:13px}
.cqi-btn{border:1px solid #cfe2df;background:#fff;color:#0a6e6e;border-radius:10px;padding:9px 14px;font:700 13px/1 inherit;cursor:pointer}.cqi-btn.primary{background:#0a6e6e;border-color:#0a6e6e;color:#fff}.cqi-btn:disabled{opacity:.55;cursor:wait}`;
  document.head.appendChild(s);
}
const ic=n=>typeof window.cqKesIcon==='function'?window.cqKesIcon(n,16):'';

/**
 * Buka modal upload wawancara. opts.student_id (opsional) mengunci siswa dari kartu Pengingat.
 * opts.onSaved(row, studentId) dipanggil setelah tersimpan.
 */
window.cqKesInterviewImport=function(opts={}){
  css();
  const ov=document.createElement('div');ov.className='cqi-ov';
  ov.innerHTML=`<div class="cqi" role="dialog" aria-modal="true" aria-label="Upload hasil wawancara"><div class="cqi-h"><h2>${ic('clipboard')} Upload Hasil Wawancara (Word)</h2><button class="cqi-btn" data-x>Tutup</button></div><div class="cqi-b" data-body></div><div class="cqi-f" data-foot></div></div>`;
  document.body.appendChild(ov);
  const body=ov.querySelector('[data-body]'),foot=ov.querySelector('[data-foot]');
  const close=()=>ov.remove();
  ov.querySelector('[data-x]').onclick=close;ov.addEventListener('click',e=>{if(e.target===ov)close()});
  const onKey=e=>{if(e.key==='Escape'){close();document.removeEventListener('keydown',onKey)}};document.addEventListener('keydown',onKey);

  function pick(){
    body.innerHTML=`<p class="cqi-note">Pilih file form wawancara (.docx). Isinya dibaca otomatis: identitas, masalah, jawaban siswa, temuan, rencana penanganan, dan jadwal evaluasi. Anda bisa memeriksa dan mengubahnya sebelum disimpan.</p>
      <div class="cqi-drop" tabindex="0" data-drop>${ic('upload')}<div style="margin-top:8px;font-weight:700">Klik atau seret file Word ke sini</div><div style="font-size:12px;margin-top:4px">Format .docx</div></div><input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden data-file><div data-msg></div>`;
    foot.innerHTML='';
    const drop=body.querySelector('[data-drop]'),inp=body.querySelector('[data-file]');
    drop.onclick=()=>inp.click();drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' ')inp.click()};
    drop.ondragover=e=>{e.preventDefault();drop.classList.add('over')};drop.ondragleave=()=>drop.classList.remove('over');
    drop.ondrop=e=>{e.preventDefault();drop.classList.remove('over');if(e.dataTransfer.files[0])handle(e.dataTransfer.files[0])};
    inp.onchange=()=>{if(inp.files[0])handle(inp.files[0])};
  }
  async function handle(file){
    const msg=body.querySelector('[data-msg]');msg.innerHTML='<p class="cqi-note"><span class="spinner"></span> Membaca file…</p>';
    try{
      const [xml,list]=await Promise.all([readDocx(file),roster()]);
      const {parsed,record}=window.cqKesInterviewParse(xml);
      if(!parsed.qa.length&&!parsed.temuan.length&&!parsed.reported.length)throw Error('Form wawancara tidak dikenali. Pastikan memakai template Form Wawancara Siswa Kesiswaan.');
      const locked=opts.student_id?list.find(s=>s.id===opts.student_id):null;
      review(parsed,record,list,locked||matchStudent(list,record.student_name,record.class_name),file.name,!!locked);
    }catch(e){msg.innerHTML=`<div class="cqi-err">${E(e.message)}</div>`}
  }
  function review(p,rec,list,student,fname,locked){
    const opt=s=>`<option value="${E(s.id)}" ${student&&s.id===student.id?'selected':''}>${E(s.name)} — ${E(s.class_name)}</option>`;
    const nameMismatch=locked&&rec.student_name&&norm(rec.student_name)!==norm(student.name);
    body.innerHTML=`${student?`<div class="cqi-ok">${ic('check')} Siswa dikenali: <b>${E(student.name)}</b> (${E(student.class_name)}) dari file <i>${E(fname)}</i>.</div>`:`<div class="cqi-err">Nama "${E(rec.student_name||'-')}" ${rec.class_name?`kelas ${E(rec.class_name)} `:''}tidak ditemukan pasti di data siswa aktif. Pilih siswanya di bawah.</div>`}
      ${nameMismatch?`<div class="cqi-err">Perhatian: nama di file ("${E(rec.student_name)}") berbeda dengan siswa yang dipilih. Pastikan filenya benar.</div>`:''}
      <div class="cqi-grid"><div><label>Siswa</label><select data-student ${locked?'disabled':''}><option value="">— pilih siswa —</option>${list.map(opt).join('')}</select></div>
      <div><label>Tanggal wawancara</label><input type="date" data-date value="${E(rec.record_date)}"></div></div>
      <div><label>Judul laporan</label><input data-title maxlength="180" value="${E(rec.title)}"></div>
      ${p.temuan.length?`<div style="margin-top:12px"><label>Temuan & tingkat</label><table class="cqi-t"><tr><th>Aspek</th><th>Tingkat</th><th>Temuan utama</th></tr>${p.temuan.map(x=>`<tr><td>${E(x.aspek)}</td><td><span class="cqi-lv lv-${E(String(x.tingkat).toLowerCase())}">${E(x.tingkat||'-')}</span></td><td>${E(x.temuan)}</td></tr>`).join('')}</table></div>`:''}
      ${p.rencana.length?`<div><label>Rencana penanganan</label><table class="cqi-t"><tr><th>Aspek</th><th>Penanggung jawab</th><th>Waktu</th></tr>${p.rencana.map(x=>`<tr><td>${E(x.aspek)}</td><td>${E(x.pj||'-')}</td><td>${E(x.waktu||'-')}</td></tr>`).join('')}</table></div>`:''}
      <div class="cqi-grid"><div><label>Prioritas</label><select data-priority>${['rendah','normal','tinggi','darurat'].map(x=>`<option ${x===rec.priority?'selected':''}>${x}</option>`).join('')}</select></div>
      <div><label>Status</label><select data-status><option value="dalam_penanganan" selected>Dalam penanganan</option><option value="selesai">Selesai</option></select></div></div>
      <div><label>Isi laporan (otomatis dari file, boleh diedit)</label><textarea data-desc>${E(rec.description)}</textarea></div>
      <div style="margin-top:10px"><label>Tindak lanjut / rencana (otomatis, boleh diedit)</label><textarea data-fu style="min-height:110px">${E(rec.follow_up)}</textarea></div>
      <p class="cqi-note" style="margin-top:8px">${p.qa.length} jawaban wawancara · ${p.temuan.length} temuan · ${p.rencana.length} rencana penanganan terbaca. Disimpan sebagai catatan Pendampingan Siswa dan otomatis masuk Laporan Kesiswaan.</p><div data-msg></div>`;
    foot.innerHTML=`<button class="cqi-btn" data-again>Ganti file</button><button class="cqi-btn primary" data-save>${ic('check')} Simpan ke laporan</button>`;
    foot.querySelector('[data-again]').onclick=pick;
    foot.querySelector('[data-save]').onclick=async e=>{
      const btn=e.currentTarget,msg=body.querySelector('[data-msg]');
      const sid=locked?student.id:body.querySelector('[data-student]').value,st=list.find(s=>s.id===sid);
      if(!st){msg.innerHTML='<div class="cqi-err">Pilih siswa terlebih dahulu.</div>';return}
      const title=T(body.querySelector('[data-title]').value);if(!title){msg.innerHTML='<div class="cqi-err">Judul tidak boleh kosong.</div>';return}
      btn.disabled=true;btn.textContent='Menyimpan…';
      try{
        const d=await call(BASE()+'/functions/v1/student-affairs-center',{action:'save_affairs',record_type:'kasus',student_id:st.id,class_id:st.class_id,
          record_date:body.querySelector('[data-date]').value,title,description:body.querySelector('[data-desc]').value,follow_up:body.querySelector('[data-fu]').value,
          status:body.querySelector('[data-status]').value,priority:body.querySelector('[data-priority]').value});
        body.innerHTML=`<div class="cqi-ok">${ic('check')} Laporan wawancara <b>${E(st.name)}</b> tersimpan. Sudah masuk ke Pendampingan Siswa dan Laporan Kesiswaan.</div>`;
        foot.innerHTML=`<button class="cqi-btn" data-more>Upload file lain</button><button class="cqi-btn primary" data-done>Selesai</button>`;
        foot.querySelector('[data-more]').onclick=pick;foot.querySelector('[data-done]').onclick=close;
        if(typeof showToast==='function')showToast('Laporan wawancara tersimpan.');
        try{opts.onSaved?.(d.row,st.id,title)}catch(_){}
      }catch(err){btn.disabled=false;btn.innerHTML=`${ic('check')} Simpan ke laporan`;msg.innerHTML=`<div class="cqi-err">${E(err.message)}</div>`}
    };
  }
  pick();
};
})();
