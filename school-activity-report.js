/* CQlass — Rapor Kegiatan Matrix: langsung centang per jenis kegiatan */
(function(){
  'use strict';
  if(window.__cqSchoolActivityReportMatrixV2)return;
  window.__cqSchoolActivityReportMatrixV2=true;

  const URL=SUPABASE_URL+'/functions/v1/school-activity-report';
  const S={boot:null,data:null,classId:'',loading:false,editing:false};
  const esc=v=>escapeHtml(String(v==null?'':v));

  async function api(action,payload={}){
    const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLISHABLE_KEY,'Authorization':'Bearer '+SUPABASE_PUBLISHABLE_KEY,'x-session-token':getAuthToken()},body:JSON.stringify({action,...payload})});
    let d={};try{d=JSON.parse(await r.text()||'{}')}catch(_){throw new Error('Respons Rapor Kegiatan tidak valid.');}
    if(!r.ok||d.success===false){
      const m={session_invalid:'Sesi login berakhir. Silakan masuk ulang.',class_forbidden:'Kelas ini tidak dapat diakses akun Anda.',pramuka_readonly:'Pramuka hanya dapat diedit oleh akun Lutfi atau Bimo.',activity_readonly:'Kegiatan ini hanya dapat diedit wali kelas yang bersangkutan.',class_required:'Pilih kelas terlebih dahulu.'};
      throw new Error(m[d.error]||d.error||'Rapor Kegiatan belum berhasil diproses.');
    }
    return d;
  }

  function inject(){
    if(document.getElementById('sar-matrix-style'))return;
    document.getElementById('sar-style')?.remove();
    const st=document.createElement('style');st.id='sar-matrix-style';st.textContent=`
      #sar-root{max-width:1380px;margin:0 auto}.sar-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start;margin-bottom:12px}.sar-head h2{margin:0;font-size:25px}.sar-head p{margin:5px 0 0;color:var(--muted);font-size:10.5px;line-height:1.55;max-width:880px}.sar-card{background:#fff;border:1px solid var(--border);border-radius:15px;padding:13px;margin-bottom:11px}.sar-topbar{display:flex;justify-content:space-between;gap:10px;align-items:end;flex-wrap:wrap}.sar-class-wrap{min-width:280px;max-width:520px;flex:1}.sar-field label{display:block;font-size:8.7px;font-weight:850;color:var(--muted);margin:0 0 5px}.sar-field select{width:100%;box-sizing:border-box}.sar-actions{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.sar-info{font-size:9px;color:var(--muted);line-height:1.5;margin-top:9px}.sar-range{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}.sar-range span{display:inline-flex;padding:5px 8px;border-radius:999px;background:#eef6f5;color:#356d69;font-size:8px;font-weight:850}.sar-badge{display:inline-flex;padding:5px 8px;border-radius:999px;background:#eef6f5;color:#356d69;font-size:8px;font-weight:850}.sar-table-wrap{overflow:auto;border:1px solid var(--border);border-radius:12px;max-height:66vh}.sar-table{width:100%;border-collapse:separate;border-spacing:0;min-width:1120px}.sar-table th,.sar-table td{padding:10px 9px;border-bottom:1px solid #edf1f2;border-right:1px solid #f1f4f4;text-align:center;font-size:9.5px;white-space:nowrap;background:#fff}.sar-table thead th{position:sticky;top:0;z-index:5;background:#f5f9f9;color:#45615f;font-size:8.8px;font-weight:900}.sar-table th:first-child,.sar-table td:first-child{position:sticky;left:0;text-align:left;min-width:225px;max-width:260px;background:#fff;z-index:3;box-shadow:5px 0 8px -8px rgba(0,0,0,.35)}.sar-table thead th:first-child{z-index:8;background:#f5f9f9}.sar-table tbody tr:hover td{background:#fbfdfd}.sar-table tbody tr:hover td:first-child{background:#fbfdfd}.sar-name{font-size:10.4px;font-weight:850;color:#183332}.sar-sub{font-size:8px;color:var(--muted);margin-top:2px}.sar-check{width:19px;height:19px;accent-color:#0f766e;cursor:pointer}.sar-check:disabled{cursor:default;opacity:.72}.sar-check.editable:disabled{opacity:.9}.sar-act-head{min-width:115px}.sar-act-head.used{background:#eaf7f5!important;color:#17635e}.sar-act-head small{display:block;margin-top:3px;font-size:7.5px;font-weight:700;color:var(--muted)}.sar-grade{display:inline-flex;min-width:30px;height:27px;align-items:center;justify-content:center;border-radius:8px;background:#eaf7f5;color:#17635e;font-weight:900;font-size:11px}.sar-total,.sar-pct{font-weight:800;color:#3b5552}.sar-empty{padding:32px;text-align:center;color:var(--muted);font-size:10px}.sar-editing{background:#fff8e8;border:1px solid #ecd59d;color:#7d5a13;padding:8px 10px;border-radius:10px;font-size:8.7px;font-weight:750}.sar-lock{font-size:7.5px;color:#8b9694;margin-top:3px}.sar-save{min-width:88px}
      @media(max-width:760px){.sar-head{flex-direction:column}.sar-class-wrap{min-width:100%;max-width:none}.sar-topbar{align-items:stretch}.sar-actions{width:100%}.sar-actions .kv2-btn{flex:1}}
    `;document.head.appendChild(st);
  }

  function classList(){
    const a=(S.boot?.classes||[]).slice();
    a.sort((x,y)=>Number(y.can_edit_regular)-Number(x.can_edit_regular)||String(x.name||x.code).localeCompare(String(y.name||y.code),'id',{numeric:true}));
    return a;
  }
  function selectedClass(){return classList().find(x=>x.id===S.classId)||null}
  function grade(pct){if(pct==null)return'—';if(pct>=85)return'A';if(pct>=70)return'B';if(pct>=50)return'C';return'D'}

  async function loadData(){
    if(!S.classId){S.data=null;renderBody();return;}
    S.loading=true;renderBody();
    try{S.data=await api('matrix_data',{class_id:S.classId});}
    catch(e){S.data=null;showToast(e.message,true);}
    finally{S.loading=false;renderBody();}
  }

  function render(content){
    inject();
    const classes=classList();if(!S.classId&&classes.length)S.classId=classes[0].id;
    content.innerHTML=`<div id="sar-root">
      <div class="sar-head"><div><h2>Rapor Kegiatan</h2><p>Centang kegiatan yang diikuti siswa. Kegiatan yang tidak dilaksanakan oleh kelas cukup dibiarkan kosong dan tidak dihitung dalam predikat.</p></div><span class="sar-badge">${esc(S.boot?.academic_year||'')} · Semester ${esc(S.boot?.semester_no||'')}</span></div>
      <div class="sar-card"><div class="sar-topbar"><div class="sar-class-wrap sar-field"><label>KELAS</label><select id="sar-class" class="kv2-select" onchange="sarClassChanged()">${classes.map(c=>`<option value="${c.id}" ${c.id===S.classId?'selected':''}>${esc(c.name||c.code)}${c.can_edit_regular?' · Wali Kelas':''}${c.can_edit_pramuka?' · Akses Pramuka':''}</option>`).join('')}</select></div><div class="sar-actions" id="sar-actions"></div></div><div class="sar-range"><span>A · 85–100%</span><span>B · 70–84%</span><span>C · 50–69%</span><span>D · &lt;50%</span></div><div class="sar-info">Predikat dihitung dari jumlah kegiatan yang dicentang siswa ÷ jumlah jenis kegiatan yang benar-benar terisi pada kelas tersebut.</div></div>
      <div id="sar-body"></div>
    </div>`;
    loadData();
  }

  function renderActions(){
    const a=document.getElementById('sar-actions');if(!a)return;
    if(!S.data?.can_edit){a.innerHTML='<span class="sar-badge">Mode lihat</span>';return;}
    if(S.editing){a.innerHTML='<span class="sar-editing">Mode Edit aktif</span><button class="kv2-btn sar-save" onclick="sarSave()">Simpan</button>';}
    else a.innerHTML='<button class="kv2-btn" onclick="sarEdit()">Edit</button>';
  }

  function renderBody(){
    renderActions();
    const root=document.getElementById('sar-body');if(!root)return;
    if(S.loading){root.innerHTML='<div class="sar-card"><span class="spinner"></span> Memuat Rapor Kegiatan...</div>';return;}
    if(!S.data){root.innerHTML='<div class="sar-card sar-empty">Data kelas belum tersedia.</div>';return;}
    const acts=S.data.activities||S.boot?.activities||[],students=S.data.students||[],editable=new Set(S.data.editable_codes||[]),used=new Set(S.data.used_activity_codes||[]);
    const heads=acts.map(ac=>`<th class="sar-act-head ${used.has(ac.code)?'used':''}" data-head-code="${esc(ac.code)}">${esc(ac.name)}${ac.code==='PRAMUKA'&&!editable.has(ac.code)?'<small>Diisi Lutfi/Bimo</small>':''}</th>`).join('');
    const rows=students.map(st=>`<tr data-student="${st.id}"><td><div class="sar-name">${esc(st.name)}</div><div class="sar-sub">${esc(st.nis||'')}</div></td>${acts.map(ac=>{const can=editable.has(ac.code),checked=Boolean(st.marks?.[ac.code]);return`<td><input type="checkbox" class="sar-check ${can?'editable':''}" data-student="${st.id}" data-code="${esc(ac.code)}" ${checked?'checked':''} ${S.editing&&can?'':'disabled'} onchange="sarLive()" title="${can?'':'Tidak dapat diedit oleh akun ini'}"></td>`}).join('')}<td class="sar-total">${st.checked||0}/${st.total||0}</td><td class="sar-pct">${st.percentage==null?'—':st.percentage+'%'}</td><td><span class="sar-grade">${esc(st.grade||'—')}</span></td></tr>`).join('');
    root.innerHTML=`<div class="sar-card"><div class="sar-table-wrap"><table class="sar-table"><thead><tr><th>Nama Siswa</th>${heads}<th>Total</th><th>%</th><th>Predikat</th></tr></thead><tbody>${rows||'<tr><td colspan="11" class="sar-empty">Tidak ada siswa aktif.</td></tr>'}</tbody></table></div></div>`;
    if(S.editing)window.sarLive();
  }

  window.sarLive=function(){
    const root=document.getElementById('sar-root');if(!root)return;
    const acts=S.data?.activities||[],used=[];
    for(const ac of acts){if([...root.querySelectorAll(`.sar-check[data-code="${CSS.escape(ac.code)}"]`)].some(x=>x.checked))used.push(ac.code);}
    root.querySelectorAll('[data-head-code]').forEach(h=>h.classList.toggle('used',used.includes(h.dataset.headCode)));
    root.querySelectorAll('tbody tr[data-student]').forEach(tr=>{
      let checked=0;for(const code of used){const c=tr.querySelector(`.sar-check[data-code="${CSS.escape(code)}"]`);if(c?.checked)checked++;}
      const total=used.length,pct=total?Math.round(checked/total*100):null;
      const t=tr.querySelector('.sar-total'),p=tr.querySelector('.sar-pct'),g=tr.querySelector('.sar-grade');
      if(t)t.textContent=`${checked}/${total}`;if(p)p.textContent=pct==null?'—':pct+'%';if(g)g.textContent=grade(pct);
    });
  };

  window.sarEdit=function(){
    if(!S.data?.can_edit){showToast('Akun ini hanya dapat melihat Rapor Kegiatan.',true);return;}
    S.editing=true;renderBody();
  };

  window.sarSave=async function(){
    if(!S.data?.can_edit||!S.editing)return;
    const editable=new Set(S.data.editable_codes||[]),entries=[...document.querySelectorAll('#sar-root .sar-check')].filter(x=>editable.has(x.dataset.code)).map(x=>({student_id:x.dataset.student,activity_code:x.dataset.code,participated:x.checked}));
    try{
      const btn=document.querySelector('#sar-actions .sar-save');if(btn){btn.disabled=true;btn.textContent='Menyimpan...';}
      S.data=await api('save_matrix',{class_id:S.classId,entries});S.editing=false;showToast('Rapor Kegiatan berhasil disimpan.');renderBody();
    }catch(e){showToast(e.message,true);renderActions();}
  };

  window.sarClassChanged=function(){
    const next=document.getElementById('sar-class')?.value||'';
    if(S.editing&&!confirm('Perubahan yang belum disimpan akan dibatalkan. Ganti kelas?')){document.getElementById('sar-class').value=S.classId;return;}
    S.classId=next;S.editing=false;loadData();
  };

  window.renderSchoolActivityReport=async function(content){
    content.innerHTML='<div class="kv2"><div class="kv2-card"><span class="spinner"></span> Memuat Rapor Kegiatan...</div></div>';
    try{S.boot=await api('bootstrap');S.classId='';S.editing=false;render(content);}
    catch(e){content.innerHTML='<div class="kv2"><div class="kv2-card kv2-empty">'+esc(e.message)+'</div></div>';}
  };
})();