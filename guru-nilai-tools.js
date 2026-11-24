/* CQlass — "Download & Cek Nilai" untuk guru mapel / bidang studi (juga walas yang mengajar mapel).
   1) Download legger mapel yang diampu, untuk semua kelas yang diajar (1 file, 1 sheet per kelas; format legger sekolah).
   2) Cek Deskripsi Rapor: narasi Rapor IKM yang akan tercetak per siswa + peringatan:
      - nilai belum lengkap (huruf per TP dan narasi baru muncul setelah Tugas 1-5, TP, WWP, ASAS terisi);
      - huruf TP terbaik = huruf TP terendah (harus ada minimal 1 TP terbaik dan 1 TP terendah dengan huruf berbeda, mis. A dan B).
   Data dari academic-scores (bootstrap = penugasan guru sendiri, load = nilai per penugasan). Rumus dari cq-scoring.js. */
(function(){
'use strict';
const MOD='guru-nilai-tools',ROLES=['guru','walas','guru_partner','partner','tahfizh','pengabdian'];
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
const S=()=>window.CQ_SCORE;
const TASKS=['TUGAS_1','TUGAS_2','TUGAS_3','TUGAS_4','TUGAS_5'];
function user(){try{return typeof currentUser!=='undefined'?currentUser:null}catch(_){return null}}
function allowed(){const u=user();return!!u&&ROLES.includes(norm(u.role))}
function isActive(){try{return activeModule===MOD}catch(_){return false}}
async function api(action,payload={}){const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),45000);try{const r=await fetch(`${SUPABASE_URL}/functions/v1/academic-scores`,{method:'POST',headers:{'Content-Type':'application/json',apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':getAuthToken()},body:JSON.stringify({action,...payload}),signal:ctl.signal});const j=await r.json().catch(()=>({}));if(!r.ok||j.success===false)throw Error(j.message||j.error||'Nilai belum dapat dimuat.');return j}finally{clearTimeout(timer)}}

/* ---------- Hitungan (tanpa DOM, dites di tests/guru-nilai-tools.test.cjs) ---------- */
// Satu siswa dari hasil load -> komponen nilai.
function parts(st){return{tasks:TASKS.map(k=>st?.components?.[k]?.score??null),tp:(st?.tp||[]).map(x=>x?.score??null),wwp:st?.components?.WWP?.score??null,asas:st?.components?.ASAS?.score??null}}
function missingOf(p){const m=[];const n=v=>S().num(v)===null;if(p.tasks.every(n))m.push('Tugas (minimal 1)');const tp=p.tp.filter(n).length;if(tp)m.push(`${tp} TP`);if(n(p.wwp))m.push('WWP');if(n(p.asas))m.push('ASAS');return m}
const WORD={A:'sangat baik dalam',B:'baik dalam',C:'cukup baik dalam',D:'kurang baik dalam'};
function phrase(t){const I=window.__cqSemesterInternals;if(I&&I.tpPhrase)return I.tpPhrase(t,'id');let s=String(t||'').trim().replace(/[.\s]+$/,'').replace(/^peserta\s+didik\s+/i,'').replace(/^(mampu|dapat)\s+/i,'');return s?s.charAt(0).toLowerCase()+s.slice(1):s}
/* Cek satu siswa untuk satu mapel. objectives: [{description}] urut TP. */
function checkStudent(st,objectives){const p=parts(st);const missing=missingOf(p);const scores=objectives.map((_,i)=>S().tpScore(p.tasks,p.tp[i],p.wwp,p.asas));const L=S().tpLetter;
 const raw=S().raw(p.tasks,p.tp,p.wwp,p.asas),rapor=S().rapor(raw);
 if(missing.length||!objectives.length)return{name:st.name,raw,rapor,status:'incomplete',missing,letters:scores.map(L),text:'',warn:objectives.length?`Nilai belum lengkap: ${missing.join(', ')}.`:'Belum ada TP aktif.'};
 let hi=null,lo=null;scores.forEach((v,i)=>{if(v==null)return;if(!hi||v>hi.v)hi={v,i};if(!lo||v<lo.v)lo={v,i}});
 const a=L(hi.v),b=L(lo.v),nm=String(st.name||'').trim();
 const text=hi.i===lo.i?`Ananda ${nm} ${WORD[a]} ${phrase(objectives[hi.i].description)}.`:`Ananda ${nm} ${WORD[a]} ${phrase(objectives[hi.i].description)} dan ${WORD[b]} ${phrase(objectives[lo.i].description)}.`;
 const same=a===b;
 return{name:st.name,raw,rapor,status:same?'same':'ok',missing:[],letters:scores.map(L),best:{tp:hi.i+1,letter:a,score:hi.v},worst:{tp:lo.i+1,letter:b,score:lo.v},text,
  warn:same?(objectives.length<2?'Hanya 1 TP: tidak ada TP terbaik dan terendah yang berbeda.':`Huruf TP terbaik dan terendah sama (${a}). Harus ada minimal 1 TP terbaik dan 1 TP terendah dengan huruf berbeda (misalnya A dan B).`):''}}
function checkLoad(load){const objectives=load?.components?.tp||[];return(load?.students||[]).map(st=>checkStudent(st,objectives))}
// Legger: beberapa penugasan (mapel x kelas) -> satu sheet per kelas.
function leggerModels(loads){const byClass=new Map();for(const l of loads){const a=l.assignment||{};const k=a.class_id||a.class_name;if(!byClass.has(k))byClass.set(k,{cls:a.class_name||'Kelas',items:[]});byClass.get(k).items.push(l)}
 return[...byClass.values()].sort((x,y)=>String(x.cls).localeCompare(String(y.cls),'id',{numeric:true})).map(({cls,items})=>{
  items.sort((x,y)=>String(x.assignment?.subject_name).localeCompare(String(y.assignment?.subject_name),'id'));
  const roster=new Map();for(const l of items)for(const st of l.students||[]){const id=st.id||st.student_id||st.name;if(!roster.has(id))roster.set(id,{nis:st.nis||'',name:st.name||'',by:new Map()});roster.get(id).by.set(items.indexOf(l),st)}
  const students=[...roster.values()].sort((a,b)=>String(a.name).localeCompare(String(b.name),'id'));
  return window.CQ_LEGGER.sheetModel(cls,items.map(l=>({name:l.assignment?.subject_name||'Mapel',tpCount:(l.components?.tp||[]).length})),students.map(s=>({nis:s.nis,name:s.name,scores:items.map((_,j)=>{const st=s.by.get(j);return st?parts(st):null})})))})}
window.__cqGuruNilaiTools={parts,missingOf,checkStudent,checkLoad,leggerModels};

/* ---------- Sidebar ---------- */
function ensureMenu(){const sb=document.getElementById('sidebar');if(!sb)return;const old=sb.querySelector('[data-cq-guru-nilai]');
 if(!allowed()){if(old)old.remove();return}
 if(old){old.classList.toggle('active',isActive());return}
 const item=document.createElement('div');item.className='nav-item'+(isActive()?' active':'');item.dataset.cqGuruNilai='1';item.innerHTML='<span>Download &amp; Cek Nilai</span>';item.onclick=open;sb.appendChild(item)}
function open(){try{activeModule=MOD}catch(_){}try{if(typeof renderSidebar==='function')renderSidebar()}catch(_){}ensureMenu();const c=document.getElementById('content');if(c)render(c)}
window.openGuruNilaiTools=open;
(function watch(){const sb=document.getElementById('sidebar');if(!sb){document.addEventListener('DOMContentLoaded',watch,{once:true});return}
 new MutationObserver(()=>ensureMenu()).observe(sb,{childList:true});ensureMenu()})();

/* ---------- Halaman ---------- */
async function render(content){
 if(!allowed()){content.textContent='Menu ini untuk guru mapel.';return}
 const mount=String(Date.now())+Math.random();content.dataset.guruNilaiMount=mount;const alive=()=>content.isConnected&&content.dataset.guruNilaiMount===mount&&isActive();
 content.innerHTML='<div class="card"><span class="spinner"></span> Memuat mapel yang Anda ampu…</div>';
 let boot;try{boot=await api('bootstrap');if(!alive())return}catch(e){if(alive())content.innerHTML=`<div class="card">${esc(e.message)}</div>`;return}
 const list=(boot.assignments||[]).slice().sort((a,b)=>String(a.subject_name).localeCompare(String(b.subject_name),'id')||String(a.class_name).localeCompare(String(b.class_name),'id',{numeric:true}));
 const period={academic_year:boot.academic_year,semester_no:boot.semester_no};
 let tab='download',pick=new Set(list.map(a=>a.id)),cekId=list[0]?.id||'',cek=null,msg='';
 const load=id=>api('load',{assignment_id:id,...period});
 function draw(){if(!alive())return;const counts=cek?{ok:cek.filter(x=>x.status==='ok').length,same:cek.filter(x=>x.status==='same').length,inc:cek.filter(x=>x.status==='incomplete').length}:null;
  content.innerHTML=`<div id="cq-gnt"><style>
#cq-gnt{font-family:Tahoma,sans-serif;color:#193b40;max-width:1100px}#cq-gnt *{box-sizing:border-box}
#cq-gnt .card{padding:18px;border:1px solid #dcebe8;border-radius:14px;background:#fff;margin-bottom:14px}
#cq-gnt .t{font-size:22px;font-weight:800;color:#0d7377}#cq-gnt .sub{font-size:13px;color:#5f756d;margin:4px 0 14px;line-height:1.5}
#cq-gnt .tabs{display:flex;gap:8px;margin-bottom:12px}#cq-gnt .tabs button{border:1px solid #d6e5e2;background:#f2f6f5;border-radius:10px;padding:9px 14px;cursor:pointer;font:inherit}
#cq-gnt .tabs button[aria-selected=true]{background:#0d7377;color:#fff;border-color:#0d7377}
#cq-gnt .list{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px 14px;margin:10px 0}#cq-gnt .list label{display:flex;gap:8px;align-items:center;font-size:13px}
#cq-gnt select{font:inherit;border:1px solid #cededa;border-radius:10px;padding:9px;min-width:260px}
#cq-gnt .row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}#cq-gnt .msg{font-size:13px;color:#305877}
#cq-gnt .chips span{display:inline-block;border-radius:20px;padding:5px 11px;font-size:12px;margin-right:6px}
#cq-gnt .ok{background:#e8f6ee;color:#1d7a46}#cq-gnt .same{background:#fff4e0;color:#8a5a00}#cq-gnt .inc{background:#fdecea;color:#a3352b}
#cq-gnt table{border-collapse:collapse;width:100%;font-size:12.5px}#cq-gnt th,#cq-gnt td{border-bottom:1px solid #e3ece9;padding:7px 8px;text-align:left;vertical-align:top}
#cq-gnt th{background:#eef5f3;position:sticky;top:0}#cq-gnt .wrap{max-height:62vh;overflow:auto;border:1px solid #dcebe8;border-radius:10px}
#cq-gnt .lt{font-family:monospace;letter-spacing:1px}#cq-gnt tr.same td{background:#fffaf0}#cq-gnt tr.incomplete td{background:#fff6f5}#cq-gnt .w{font-size:12px;font-weight:600}
</style>
<div class="t">Download &amp; Cek Nilai</div><div class="sub">${esc(boot.academic_year)} · Semester ${esc(boot.semester_no)} · ${list.length} kelas-mapel yang Anda ampu. Rumus: ${esc(S()?.text||'')}.</div>
<div class="tabs" role="tablist"><button type="button" role="tab" aria-selected="${tab==='download'}" data-tab="download">Download Legger</button><button type="button" role="tab" aria-selected="${tab==='cek'}" data-tab="cek">Cek Deskripsi Rapor</button></div>
${!list.length?'<div class="card">Belum ada mapel yang ditugaskan kepada Anda pada semester ini.</div>':tab==='download'?`<div class="card"><div class="row"><b>Pilih kelas dan mapel</b><label><input type="checkbox" id="gnt-all" ${pick.size===list.length?'checked':''}> Pilih semua</label></div>
<div class="list">${list.map(a=>`<label><input type="checkbox" data-pick="${esc(a.id)}" ${pick.has(a.id)?'checked':''}> ${esc(a.subject_name)} — ${esc(a.class_name)}</label>`).join('')}</div>
<div class="row"><button type="button" class="btn btn-primary" id="gnt-dl" ${pick.size?'':'disabled'}>Download Excel (${pick.size})</button><span class="msg" id="gnt-msg">${esc(msg)}</span></div>
<div class="sub" style="margin:10px 0 0">Satu sheet per kelas, kolom per mapel: Tugas 1–5, Rata Tugas, TP, Rata KD, WWP, Asas, Nilai Murni, Nilai Rapor, Predikat.</div></div>`
:`<div class="card"><div class="row"><select id="gnt-cek">${list.map(a=>`<option value="${esc(a.id)}" ${a.id===cekId?'selected':''}>${esc(a.subject_name)} — ${esc(a.class_name)}</option>`).join('')}</select><button type="button" class="btn" id="gnt-run">Cek</button><span class="msg">${esc(msg)}</span></div>
${counts?`<div class="chips" style="margin-top:12px"><span class="ok">${counts.ok} siap</span><span class="same">${counts.same} huruf TP terbaik = terendah</span><span class="inc">${counts.inc} belum lengkap</span></div>`:''}</div>
${cek?`<div class="card wrap"><table><thead><tr><th>Siswa</th><th>Huruf per TP</th><th>Nilai Rapor</th><th>Narasi yang akan tercetak di Rapor IKM</th></tr></thead><tbody>${cek.map(r=>`<tr class="${r.status}"><td>${esc(r.name)}</td><td class="lt">${r.letters.map((l,i)=>`TP${i+1}:${l||'–'}`).join(' ')}</td><td>${r.rapor??'–'}${r.raw!=null?` <small>(murni ${r.raw})</small>`:''}</td><td>${r.text?esc(r.text):''}${r.warn?`<div class="w ${r.status==='incomplete'?'inc':'same'}" style="padding:4px 8px;border-radius:6px;margin-top:4px">⚠ ${esc(r.warn)}</div>`:''}</td></tr>`).join('')}</tbody></table></div>`:''}`}</div>`;
  bind()}
 function bind(){const q=x=>content.querySelector(x);
  content.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;msg='';draw()});
  content.querySelectorAll('[data-pick]').forEach(el=>el.onchange=()=>{el.checked?pick.add(el.dataset.pick):pick.delete(el.dataset.pick);draw()});
  const all=q('#gnt-all');if(all)all.onchange=()=>{pick=all.checked?new Set(list.map(a=>a.id)):new Set();draw()};
  const dl=q('#gnt-dl');if(dl)dl.onclick=async()=>{dl.disabled=true;const chosen=list.filter(a=>pick.has(a.id));const out=[];
   try{for(let i=0;i<chosen.length;i++){q('#gnt-msg').textContent=`Memuat ${i+1}/${chosen.length}: ${chosen[i].subject_name} — ${chosen[i].class_name}…`;out.push(await load(chosen[i].id));if(!alive())return}
    const subjects=[...new Set(chosen.map(a=>a.subject_name))];const name=`Legger_${subjects.length===1?subjects[0]:'Mapel'}_${String(boot.academic_year).replace('/','-')}_Sem${boot.semester_no}.xlsx`.replace(/[^\w.-]+/g,'_');
    await window.CQ_LEGGER.download(name,leggerModels(out));msg=`Excel diunduh: ${out.length} kelas-mapel.`}
   catch(e){msg='Download gagal: '+(e.name==='AbortError'?'waktu tunggu habis, coba lagi.':e.message)}finally{if(alive())draw()}};
  const sel=q('#gnt-cek');if(sel)sel.onchange=()=>{cekId=sel.value;cek=null;msg='';draw()};
  const run=q('#gnt-run');if(run)run.onclick=async()=>{run.disabled=true;msg='Memuat nilai…';draw();try{const l=await load(cekId);if(!alive())return;cek=checkLoad(l);msg=''}catch(e){msg=e.message}finally{if(alive())draw()}};
 }
 draw();
}
window.renderGuruNilaiTools=render;
})();
