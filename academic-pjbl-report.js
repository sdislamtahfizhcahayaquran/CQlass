/* CQlass — PjBL monitoring khusus Kabid Akademik.
   Isolated module: tidak mengubah role/menu selain Akademik dan tidak membuat database baru. */
(function(){
'use strict';
if(window.__cqAcademicPjblReport)return;
const API=()=>typeof PJBL_API_URL!=='undefined'?PJBL_API_URL:`${SUPABASE_URL}/functions/v1/pjbl`;
const E=v=>typeof escapeHtml==='function'?escapeHtml(v):String(v??'');
let state={rows:[],classes:[],filterClass:'',filterWeek:'',q:''};

async function req(action,payload={}){
 const token=getAuthToken(); if(!token)throw Error('Sesi login tidak ditemukan.');
 const r=await fetch(API(),{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':`Bearer ${SUPABASE_PUBLISHABLE_KEY}`,'x-session-token':token},body:JSON.stringify({action,...payload})});
 let d={};try{d=await r.json()}catch{}
 if(!r.ok||d.success===false)throw Error(d.message||d.error||`HTTP ${r.status}`);
 return d;
}
function style(){
 if(document.getElementById('ak-pjbl-style'))return;
 const s=document.createElement('style');s.id='ak-pjbl-style';s.textContent=`
 .akpj{display:grid;gap:14px}.akpj-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap}
 .akpj-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.akpj-metric{background:#fff;border:1px solid #e3e8ee;border-radius:14px;padding:14px}.akpj-metric b{display:block;font-size:22px}.akpj-metric span{font-size:12px;color:#667085}
 .akpj-filter{display:grid;grid-template-columns:1.1fr .7fr 1.4fr auto;gap:9px;background:#fff;border:1px solid #e3e8ee;border-radius:14px;padding:12px}.akpj-filter select,.akpj-filter input,.akpj-edit textarea{border:1px solid #d7dde5;border-radius:10px;padding:9px 11px;background:#fff;font:inherit;width:100%}
 .akpj-tablewrap{overflow:auto;background:#fff;border:1px solid #e3e8ee;border-radius:14px}.akpj-table{width:100%;border-collapse:collapse;min-width:980px}.akpj-table th,.akpj-table td{padding:10px;border-bottom:1px solid #edf0f2;text-align:left;vertical-align:top}.akpj-table th{font-size:11px;text-transform:uppercase;color:#667085;background:#f8fafb;position:sticky;top:0}.akpj-table td{font-size:13px}.akpj-muted{font-size:12px;color:#667085}.akpj-pill{display:inline-flex;border-radius:999px;padding:4px 8px;font-size:11px;font-weight:800;background:#eaf7f4;color:#08766d}.akpj-pill.miss{background:#fff1f0;color:#b42318}
 .akpj-edit{display:grid;gap:10px}.akpj-edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.akpj-actions{display:flex;gap:8px;flex-wrap:wrap}.akpj-btn{border:1px solid #d7dde5;border-radius:9px;padding:7px 10px;background:#fff;cursor:pointer;font-weight:700}.akpj-btn.primary{background:var(--primary,#0A6E6E);border-color:var(--primary,#0A6E6E);color:#fff}
 @media(max-width:800px){.akpj-metrics{grid-template-columns:1fr 1fr}.akpj-filter{grid-template-columns:1fr}.akpj-edit-grid{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}
function rows(){
 const q=state.q.toLowerCase();
 return state.rows.filter(r=>(!state.filterClass||r.class_id===state.filterClass)&&(!state.filterWeek||String(r.week_no)===String(state.filterWeek))&&(!q||[`${r.class_name}`,`${r.actual_activity}`,`${r.obstacle}`,`${r.suggestion}`,`${r.recorded_by_name}`].join(' ').toLowerCase().includes(q)));
}
function fmtDate(v){if(!v)return '—';const d=new Date(v);return isNaN(d)?E(v):d.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'});}
function renderTable(){
 const body=document.getElementById('akpj-body');if(!body)return;const rr=rows();
 body.innerHTML=rr.length?`<div class="akpj-tablewrap"><table class="akpj-table"><thead><tr><th>Tanggal</th><th>Kelas</th><th>Pekan</th><th>Realisasi</th><th>Kendala</th><th>Tindak Lanjut</th><th>Pencatat</th><th>Status</th><th>Aksi</th></tr></thead><tbody>${rr.map(r=>`<tr><td>${fmtDate(r.logged_at)}</td><td><b>${E(r.class_name)}</b></td><td>Pekan ${E(r.week_no)}</td><td>${E(r.actual_activity||'—')}</td><td>${E(r.obstacle||'—')}</td><td>${E(r.suggestion||'—')}</td><td>${E(r.recorded_by_name||'—')}</td><td><span class="akpj-pill ${r.actual_activity?'':'miss'}">${r.actual_activity?'Tercatat':'Belum lengkap'}</span></td><td><div class="akpj-actions"><button class="akpj-btn" data-edit="${E(r.id)}">Edit</button><button class="akpj-btn" data-score="${E(r.class_id)}" data-week="${E(r.week_no)}">Nilai</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="card"><div class="empty-state">Tidak ada data PjBL pada filter ini.</div></div>';
 body.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editRow(b.dataset.edit));
 body.querySelectorAll('[data-score]').forEach(b=>b.onclick=()=>showScores(b.dataset.score,Number(b.dataset.week)));
}
function updateMetrics(){
 const total=state.rows.length,classes=new Set(state.rows.map(x=>x.class_id)).size,weeks=new Set(state.rows.map(x=>x.week_no)).size,issues=state.rows.filter(x=>x.obstacle).length;
 const el=document.getElementById('akpj-metrics');if(el)el.innerHTML=[['Kelas Tercatat',classes,'kelas'],['Log PjBL',total,'kegiatan'],['Pekan Terisi',weeks,'pekan berbeda'],['Ada Kendala',issues,'log']].map(x=>`<div class="akpj-metric"><b>${x[1]}</b><span>${x[0]} · ${x[2]}</span></div>`).join('');
}
function bindFilters(){
 const c=document.getElementById('akpj-class'),w=document.getElementById('akpj-week'),q=document.getElementById('akpj-q');
 c.onchange=()=>{state.filterClass=c.value;renderTable()};w.onchange=()=>{state.filterWeek=w.value;renderTable()};q.oninput=()=>{state.q=q.value;renderTable()};
 document.getElementById('akpj-reset').onclick=()=>{state.filterClass='';state.filterWeek='';state.q='';c.value='';w.value='';q.value='';renderTable()};
}
async function load(){
 const [h,b]=await Promise.all([req('history'),req('bootstrap')]);state.rows=h.rows||[];state.classes=b.classes||[];
 const c=document.getElementById('akpj-class');c.innerHTML='<option value="">Semua kelas</option>'+state.classes.map(x=>`<option value="${E(x.id)}">${E(x.name)}</option>`).join('');
 const weeks=[...new Set(state.rows.map(x=>Number(x.week_no)).filter(Boolean))].sort((a,b)=>a-b);document.getElementById('akpj-week').innerHTML='<option value="">Semua pekan</option>'+weeks.map(x=>`<option value="${x}">Pekan ${x}</option>`).join('');
 updateMetrics();bindFilters();renderTable();
}
function editRow(id){
 const r=state.rows.find(x=>String(x.id)===String(id));if(!r)return;const host=document.getElementById('akpj-editor');
 host.innerHTML=`<div class="card akpj-edit"><div><b>Edit PjBL · ${E(r.class_name)} · Pekan ${E(r.week_no)}</b><div class="akpj-muted">Mengoreksi data yang sama; tidak membuat log duplikat.</div></div><label>Realisasi<textarea id="akpj-e-actual" rows="3">${E(r.actual_activity||'')}</textarea></label><div class="akpj-edit-grid"><label>Kendala<textarea id="akpj-e-obstacle" rows="3">${E(r.obstacle||'')}</textarea></label><label>Tindak lanjut<textarea id="akpj-e-suggestion" rows="3">${E(r.suggestion||'')}</textarea></label></div><div class="akpj-actions"><button class="akpj-btn primary" id="akpj-save">Simpan Perubahan</button><button class="akpj-btn" id="akpj-cancel">Batal</button></div></div>`;
 host.scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('akpj-cancel').onclick=()=>host.innerHTML='';
 document.getElementById('akpj-save').onclick=async()=>{const btn=document.getElementById('akpj-save');btn.disabled=true;try{const d=await req('update_log',{log_id:r.id,actual_activity:document.getElementById('akpj-e-actual').value.trim(),obstacle:document.getElementById('akpj-e-obstacle').value.trim(),suggestion:document.getElementById('akpj-e-suggestion').value.trim()});const i=state.rows.findIndex(x=>x.id===r.id);if(i>=0)state.rows[i]=d.row;host.innerHTML='';updateMetrics();renderTable();showToast('Data PjBL berhasil diperbarui.')}catch(e){showToast(e.message,true)}finally{if(btn)btn.disabled=false}};
}
async function showScores(classId,week){
 const host=document.getElementById('akpj-editor');host.innerHTML='<div class="card">Memuat nilai PjBL...</div>';
 try{const d=await req('load_scores',{class_id:classId,week_no:week});const cl=state.classes.find(x=>x.id===classId);const rr=d.students||[],graded=rr.filter(x=>x.score!=null);host.innerHTML=`<div class="card"><div class="akpj-head"><div><b>Nilai PjBL · ${E(cl?.name||'')} · Pekan ${week}</b><div class="akpj-muted">${graded.length} dari ${rr.length} siswa sudah memiliki nilai.</div></div><button class="akpj-btn" id="akpj-close-score">Tutup</button></div><div class="akpj-tablewrap" style="margin-top:10px"><table class="akpj-table" style="min-width:520px"><thead><tr><th>No</th><th>Siswa</th><th>Nilai</th></tr></thead><tbody>${rr.map((x,i)=>`<tr><td>${i+1}</td><td>${E(x.name)}</td><td>${x.score==null?'—':(['','D','C','B','A'][Number(x.score)]||E(x.score))}</td></tr>`).join('')}</tbody></table></div></div>`;document.getElementById('akpj-close-score').onclick=()=>host.innerHTML='';host.scrollIntoView({behavior:'smooth',block:'center'})}catch(e){host.innerHTML=`<div class="card">${E(e.message)}</div>`}
}
window.renderAcademicPjblReport=function(content){
 style();content.innerHTML=`<div class="akpj"><div class="akpj-head"><div><div class="page-title">Laporan PjBL</div><div class="page-sub">Monitoring PjBL seluruh kelas untuk Kabid Akademik. Data berasal dari PjBL yang sama dengan input Wali Kelas.</div></div></div><div id="akpj-metrics" class="akpj-metrics"></div><div class="akpj-filter"><select id="akpj-class"><option>Memuat kelas...</option></select><select id="akpj-week"><option value="">Semua pekan</option></select><input id="akpj-q" placeholder="Cari kegiatan, kendala, pencatat..."><button class="akpj-btn" id="akpj-reset">Reset</button></div><div id="akpj-editor"></div><div id="akpj-body"><div class="card"><span class="spinner"></span> Memuat laporan PjBL...</div></div></div>`;load().catch(e=>{document.getElementById('akpj-body').innerHTML=`<div class="card"><div class="empty-state">${E(e.message)}</div></div>`});
};
function install(){
 try{if(typeof MODULE_GROUPS==='undefined'||!Array.isArray(MODULE_GROUPS))return false;let g=MODULE_GROUPS.find(x=>x&&x.id==='akademik');if(!g)return false;if(!Array.isArray(g.items))g.items=[];let it=g.items.find(x=>x&&x.id==='academic-pjbl-report');const def={id:'academic-pjbl-report',label:'Laporan PjBL',roles:['akademik','kabid_akademik'],built:true,render:window.renderAcademicPjblReport};if(it)Object.assign(it,def);else{const pos=g.items.findIndex(x=>x&&x.id==='rapor');if(pos<0)g.items.push(def);else g.items.splice(pos,0,def)}if(typeof renderSidebar==='function'&&typeof currentUser!=='undefined'&&currentUser)renderSidebar();return true}catch(e){console.warn('Laporan PjBL Akademik gagal dipasang',e);return false}}
let n=0,t=setInterval(()=>{n++;if(install()||n>40)clearInterval(t)},100);install();window.__cqAcademicPjblReport=true;
})();