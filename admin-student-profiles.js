/* CQlass — Admin: Biodata Siswa (impor dari Excel master data siswa). Hanya role admin. */
(function(){
'use strict';
if(window.__cqAdminStudentProfiles)return;window.__cqAdminStudentProfiles=true;
const API=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/admin-academic-period/student-profiles';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ERR={unauthorized:'Sesi berakhir. Silakan login ulang.',forbidden:'Akses khusus Admin.',rows_required:'Tidak ada baris siswa yang terbaca di file.',too_many_rows:'Terlalu banyak baris dalam satu kiriman.'};
function token(){try{return typeof getAuthToken==='function'?getAuthToken():(localStorage.getItem('cqlass_session_token')||'')}catch(_){return''}}
async function api(action,p={}){const k=typeof SUPABASE_PUBLISHABLE_KEY!=='undefined'?SUPABASE_PUBLISHABLE_KEY:'';const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json',apikey:k,Authorization:'Bearer '+k,'x-session-token':token()},body:JSON.stringify({action,...p})});const d=await r.json().catch(()=>({}));if(!r.ok||d.success===false)throw Error(ERR[d.error]||d.error||'Gagal memproses biodata siswa.');return d}
function loadXLSX(){return new Promise((ok,no)=>{if(window.XLSX)return ok();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=ok;s.onerror=()=>no(Error('Library Excel gagal dimuat. Periksa koneksi internet.'));document.head.appendChild(s)})}
const slug=h=>String(h??'').toLowerCase().replace(/:/g,'').replace(/\(([^)]*)\)/g,' $1').replace(/[^a-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const SKIP=/^(foto_scan_|no$)/;
function iso(v){if(typeof v==='number'&&v>0&&v<80000&&window.XLSX?.SSF){const d=XLSX.SSF.parse_date_code(v);if(d&&d.y)return `${d.y}-${String(d.m).padStart(2,'0')}-${String(d.d).padStart(2,'0')}`}if(v instanceof Date&&!isNaN(v)){const y=v.getFullYear(),m=v.getMonth()+1,d=v.getDate();return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}return v}
function text(v){if(v==null)return '';if(v instanceof Date)return iso(v);if(typeof v==='number')return Number.isInteger(v)?String(v):String(v);return String(v).trim()}
/* Membaca sheet data siswa (format seperti MASTER_ONLINE: DATA SISWA). Kolom ayah/ibu/wali dikenali dari "Nama Ayah", "Nama Ibu", "Nama Wali". */
function parseWorkbook(wb){
 const names=wb.SheetNames;const pick=names.find(n=>/data\s*siswa/i.test(n))||names[0];const ws=wb.Sheets[pick];
 const grid=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:null,blankrows:false});
 const hi=grid.findIndex(r=>Array.isArray(r)&&r.some(c=>/^nama\s*siswa$/i.test(String(c||'').trim()))&&r.some(c=>/^nis$/i.test(String(c||'').trim())));
 if(hi<0)throw Error(`Kolom "Nama siswa" dan "NIS" tidak ditemukan di sheet "${pick}".`);
 const head=grid[hi].map(slug);const range=XLSX.utils.decode_range(ws['!ref']);
 let block='siswa';const cols=[];let photoCol=-1;
 for(let c=0;c<head.length;c++){const h=head[c];if(!h)continue;
  if(h==='nama_ayah'){block='ayah';cols.push([c,block,'nama']);continue}
  if(h==='nama_ibu'){block='ibu';cols.push([c,block,'nama']);continue}
  if(h==='nama_wali'){block='wali';cols.push([c,block,'nama']);continue}
  if(h==='foto_siswa_resmi'||h==='foto'||h==='foto_siswa'||h==='pas_foto'){photoCol=c;continue}
  if(h==='foto_siswa_gaya_bebas')break;
  if(SKIP.test(h))continue;
  if(block!=='siswa'&&block!=='lainnya'&&/^e_mail/.test(h))block='lainnya';
  cols.push([c,block,h]);
  if(block!=='siswa'&&block!=='lainnya'&&h==='no_hp')block='lainnya';
 }
 const idx=k=>head.indexOf(k);const cNis=idx('nis'),cNisn=idx('nisn'),cName=idx('nama_siswa'),cClass=idx('kelas');
 const out=[];
 for(let r=hi+1;r<grid.length;r++){const row=grid[r]||[];const name=text(row[cName]);if(!name)continue;
  const profile={siswa:{},ayah:{},ibu:{},wali:{},lainnya:{}};
  for(const[c,b,k]of cols){let v=row[c];if(v==null||v==='')continue;v=/tanggal/.test(k)?iso(v):text(v);if(v==='')continue;if(profile[b][k]==null)profile[b][k]=v}
  let photo='';if(photoCol>=0){const cell=ws[XLSX.utils.encode_cell({r:r+range.s.r,c:photoCol+range.s.c})];photo=cell?.l?.Target||(/^https?:/i.test(text(cell?.v))?text(cell.v):'')}
  out.push({nis:text(row[cNis]),nisn:text(row[cNisn]),full_name:name,class_name:text(row[cClass]),profile,photo_url:photo});
 }
 return {sheet:pick,rows:out,columns:cols.length,has_photo_col:photoCol>=0};
}
const S={summary:null,result:null,busy:false,file:''};
function fmtDate(v){try{return new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jakarta'}).format(new Date(v))}catch(_){return v||''}}
function view(){const s=S.summary,r=S.result;
 const pct=s&&s.active_students?Math.round(s.profiles/s.active_students*100):0;
 return `<div class="asp">
 <div class="asp-head"><div><div class="asp-title">Biodata Siswa</div><div class="asp-sub">Data lengkap siswa (identitas, alamat, orang tua/wali) untuk Cover Rapor dan administrasi. Diperbarui dengan upload file Excel.</div></div></div>
 <div class="asp-kpis">
  <div class="asp-kpi"><b>${s?s.profiles.toLocaleString('id-ID'):'—'}<small> / ${s?s.active_students.toLocaleString('id-ID'):'—'}</small></b><span>Siswa aktif yang sudah punya biodata</span><i style="width:${pct}%"></i></div>
  <div class="asp-kpi"><b>${s?s.with_photo.toLocaleString('id-ID'):'—'}</b><span>Siswa dengan link pas foto</span></div>
  <div class="asp-kpi"><b class="sm">${s?.last_import_at?esc(fmtDate(s.last_import_at)):'Belum pernah'}</b><span>${s?.last_file?'File: '+esc(s.last_file):'Upload terakhir'}</span></div>
 </div>
 <div class="asp-card"><div class="asp-card-title">Upload file Excel</div>
  <ol class="asp-steps"><li>Gunakan file master data siswa (contoh: <b>MASTER_ONLINE.xlsx</b>, sheet <b>DATA SISWA</b>).</li><li>Siswa dicocokkan dengan <b>NIS</b>, lalu NISN, lalu nama. Data lama siswa yang sama akan diganti dengan isi file terbaru.</li><li>Kolom <b>FOTO SISWA RESMI</b> berisi link Google Drive akan dipakai sebagai pas foto di Cover Rapor (file Drive harus dibagikan "siapa saja yang memiliki link"). Kosong pun tidak apa-apa.</li></ol>
  <label class="asp-drop ${S.busy?'busy':''}"><input type="file" id="asp-file" accept=".xlsx,.xls,.xlsb" ${S.busy?'disabled':''} onchange="cqAspPick(this)"><span class="asp-drop-ic">⬆</span><b>${S.busy?'Memproses '+esc(S.file)+'…':'Pilih file Excel'}</b><small>${S.busy?'Jangan tutup halaman ini.':'.xlsx / .xlsb — data dibaca di perangkat ini lalu dikirim ke CQlass'}</small></label>
  <div id="asp-msg" class="asp-msg" hidden></div>
 </div>
 ${r?`<div class="asp-card"><div class="asp-card-title">Hasil upload terakhir</div><div class="asp-res"><div class="ok"><b>${r.saved}</b><span>siswa tersimpan</span></div><div><b>${r.with_photo}</b><span>dengan link foto</span></div><div class="${r.unmatched.length?'warn':''}"><b>${r.unmatched.length}</b><span>baris tidak cocok</span></div></div>${r.unmatched.length?`<p class="asp-sub">Baris berikut tidak ditemukan di data siswa CQlass (periksa NIS/nama, atau tambahkan siswanya di Data Master terlebih dahulu):</p><div class="asp-table"><table><thead><tr><th>Kelas</th><th>NIS</th><th>Nama</th><th>Keterangan</th></tr></thead><tbody>${r.unmatched.map(u=>`<tr><td>${esc(u.class_name)}</td><td>${esc(u.nis)}</td><td>${esc(u.full_name)}</td><td>${esc(u.reason)}</td></tr>`).join('')}</tbody></table></div>`:''}</div>`:''}
 </div>`}
function msg(t,bad){const el=document.getElementById('asp-msg');if(!el)return;el.hidden=!t;el.textContent=t||'';el.className='asp-msg '+(bad?'bad':'ok');if(typeof showToast==='function'&&t)showToast(t,bad)}
function draw(){const c=document.getElementById('content');if(!c||!c.querySelector('.asp'))return;c.innerHTML=view()}
window.cqAspPick=async function(input){const f=input.files?.[0];if(!f||S.busy)return;S.busy=true;S.file=f.name;draw();
 try{await loadXLSX();const buf=await f.arrayBuffer();const wb=XLSX.read(buf,{type:'array',cellDates:false,cellStyles:false});const p=parseWorkbook(wb);if(!p.rows.length)throw Error('Tidak ada baris siswa yang terbaca.');
  const total={received:0,saved:0,with_photo:0,unmatched:[]};
  for(let i=0;i<p.rows.length;i+=120){const d=await api('import_rows',{file_name:f.name,rows:p.rows.slice(i,i+120)});total.received+=d.received;total.saved+=d.saved;total.with_photo+=d.with_photo;total.unmatched.push(...(d.unmatched||[]))}
  S.result=total;S.summary=await api('summary');S.busy=false;draw();msg(`Biodata ${total.saved} siswa tersimpan dari sheet "${p.sheet}".${total.unmatched.length?` ${total.unmatched.length} baris tidak cocok.`:''}`,false)}
 catch(e){S.busy=false;draw();msg(e.message,true)}};
window.renderAdminStudentProfiles=async function(c){if(!c)return;css();S.result=null;c.innerHTML='<div class="asp"><div class="asp-card">Memuat biodata siswa…</div></div>';try{S.summary=await api('summary')}catch(e){S.summary=null;c.innerHTML=view();msg(e.message,true);return}c.innerHTML=view()};
function css(){if(document.getElementById('asp-css'))return;const s=document.createElement('style');s.id='asp-css';s.textContent=`
.asp{max-width:1040px;margin:0 auto;color:#123634}.asp *{box-sizing:border-box}
.asp-head{margin-bottom:16px}.asp-title{font-size:clamp(21px,2.3vw,25px);font-weight:800;letter-spacing:-.02em}.asp-sub{font-size:12.5px;color:#5f7775;margin-top:4px;line-height:1.55}
.asp-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}.asp-kpi{position:relative;overflow:hidden;padding:16px 18px;background:#fff;border:1px solid #dbe8e6;border-radius:16px}.asp-kpi b{display:block;font-size:24px;font-weight:800}.asp-kpi b.sm{font-size:15px;line-height:1.3}.asp-kpi b small{font-size:14px;color:#7a908e;font-weight:700}.asp-kpi span{display:block;font-size:12px;color:#5f7775;margin-top:3px}.asp-kpi i{position:absolute;left:0;bottom:0;height:4px;background:linear-gradient(90deg,#0a6e6e,#2ab394)}
.asp-card{background:#fff;border:1px solid #dbe8e6;border-radius:18px;padding:20px 22px;margin-bottom:16px;box-shadow:0 6px 22px rgba(10,80,76,.05)}.asp-card-title{font-size:16px;font-weight:800;margin-bottom:10px}
.asp-steps{margin:0 0 16px;padding-left:20px;font-size:12.5px;line-height:1.7;color:#3d5856}
.asp-drop{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:28px;border:2px dashed #b9d8d2;border-radius:16px;background:#f6fbfa;cursor:pointer;text-align:center;transition:background .15s,border-color .15s}.asp-drop:hover{background:#eef8f6;border-color:#0a6e6e}.asp-drop input{display:none}.asp-drop.busy{cursor:wait;opacity:.8}.asp-drop-ic{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;background:#0a6e6e;color:#fff;font-size:20px;margin-bottom:6px}.asp-drop b{font-size:14px}.asp-drop small{font-size:12px;color:#5f7775}
.asp-msg{margin-top:12px;padding:11px 14px;border-radius:12px;font-size:13px;font-weight:600}.asp-msg.ok{background:#e5f5ee;color:#155f45}.asp-msg.bad{background:#fbeceb;color:#8d2f27}
.asp-res{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:10px}.asp-res div{padding:14px;border-radius:14px;background:#f3f8f7;text-align:center}.asp-res div.ok{background:#e9f7f0}.asp-res div.warn{background:#fff6e6}.asp-res b{display:block;font-size:22px}.asp-res span{font-size:12px;color:#5f7775}
.asp-table{max-height:360px;overflow:auto;border:1px solid #e1eceb;border-radius:12px;margin-top:8px}.asp-table table{width:100%;border-collapse:collapse;font-size:12.5px}.asp-table th{position:sticky;top:0;background:#f4f8f8;text-align:left;padding:9px 12px;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#5f7775}.asp-table td{padding:9px 12px;border-top:1px solid #edf3f3}
@media(max-width:700px){.asp-kpis,.asp-res{grid-template-columns:1fr}.asp-card{padding:16px}}
`;document.head.appendChild(s)}
window.__cqParseStudentWorkbook=parseWorkbook;
})();
