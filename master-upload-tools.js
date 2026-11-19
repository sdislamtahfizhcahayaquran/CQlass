/* CQlass — Upload tools shared by Admin and Akademik.
   1) Upload TP: two slots, Bahasa Indonesia (add/update TP text) and English (fill the English TP for the English report).
   2) Upload Jadwal Pelajaran: replaces the active class schedule of the active semester.
   Exposes window.cqTpUploadPanel(el, {onDone}) and window.cqScheduleUploadPanel(el, {onDone}). */
(function(){
  'use strict';
  if(window.__cqMasterUploadTools) return;
  window.__cqMasterUploadTools=true;

  const ROOT=(typeof SUPABASE_URL!=='undefined'?SUPABASE_URL:'https://lmglkxzemtvxcgktiord.supabase.co')+'/functions/v1/';
  const KEY=(typeof SUPABASE_ANON_KEY!=='undefined'&&SUPABASE_ANON_KEY)?SUPABASE_ANON_KEY:'sb_publishable_3HyNVUYXakILMKo2SK-DJw_ka7-Yx93';
  const esc=v=>String(v==null?'':v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const nk=v=>String(v==null?'':v).toLowerCase().replace(/[^a-z0-9]/g,'');
  const num=v=>{const m=String(v==null?'':v).match(/\d+/);return m?+m[0]:0};

  async function call(fn,body){
    const t=localStorage.getItem('cqlass_session_token')||'';
    if(!t) throw Error('Sesi CQlass tidak ditemukan. Silakan login ulang.');
    const r=await fetch(ROOT+fn,{method:'POST',headers:{'Content-Type':'application/json','apikey':KEY,'Authorization':'Bearer '+KEY,'x-session-token':t},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||j.success===false){const e=Error(j.error||'Proses gagal.');e.payload=j;throw e}
    return j;
  }
  function loadXLSX(){return new Promise((ok,no)=>{if(window.XLSX)return ok();const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=ok;s.onerror=()=>no(Error('Library Excel gagal dimuat. Periksa koneksi internet.'));document.head.appendChild(s)})}

  function css(){
    if(document.getElementById('cqup-css'))return;
    const x=document.createElement('style');x.id='cqup-css';x.textContent=`
    .cqup{background:#fff;border:1px solid #dfe9e8;border-radius:15px;padding:14px;margin-bottom:14px;color:#17343a}
    .cqup-top{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:10px}
    .cqup-title{font-size:15px;font-weight:900}.cqup-sub{font-size:10.5px;color:#71868a;margin-top:3px;line-height:1.5}
    .cqup-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .cqup-slot{border:1px dashed #b9d3d0;border-radius:12px;padding:11px;background:#f8fbfb}
    .cqup-slot.en{border-color:#d9c6ef;background:#fbf8fe}
    .cqup-slot h4{margin:0 0 3px;font-size:12.5px;display:flex;gap:6px;align-items:center}
    .cqup-flag{font-size:9px;font-weight:900;border-radius:999px;padding:2px 7px;background:#e3f1ef;color:#0b6d69}.cqup-slot.en .cqup-flag{background:#efe4fa;color:#6b3fa0}
    .cqup-note{font-size:10px;color:#6f8487;line-height:1.5;margin-bottom:8px}
    .cqup-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
    .cqup input[type=file]{font-size:10.5px;max-width:100%;flex:1;min-width:170px}
    .cqup-btn{border:0;border-radius:8px;background:#0b7773;color:#fff;font-weight:800;font-size:11px;padding:8px 11px;cursor:pointer}
    .cqup-btn.alt{background:#e8f3f2;color:#0b6d69}.cqup-slot.en .cqup-btn{background:#6b3fa0}.cqup-slot.en .cqup-btn.alt{background:#efe4fa;color:#6b3fa0}
    .cqup-btn:disabled{opacity:.45;cursor:not-allowed}
    .cqup-sel{height:32px;border:1px solid #cad9d8;border-radius:8px;padding:0 8px;font-size:11px;background:#fff}
    .cqup-msg{font-size:10.5px;margin-top:8px;line-height:1.55;white-space:pre-line}.cqup-msg.err{color:#9b3030}.cqup-msg.ok{color:#0b6d69}
    .cqup-res{margin-top:10px}.cqup-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:7px}
    .cqup-chip{font-size:10px;font-weight:800;border-radius:999px;padding:4px 9px;background:#eef5f4}.cqup-chip.new{background:#e2f4e9;color:#1d7a43}.cqup-chip.upd{background:#fff4dd;color:#8a5a00}.cqup-chip.bad{background:#fde8e8;color:#9b3030}
    .cqup-tw{max-height:320px;overflow:auto;border:1px solid #e1eae9;border-radius:9px}
    .cqup table{width:100%;border-collapse:collapse;min-width:620px}.cqup th,.cqup td{font-size:10px;text-align:left;padding:6px 7px;border-bottom:1px solid #edf2f1;vertical-align:top}
    .cqup th{position:sticky;top:0;background:#eef5f4}.cqup-old{color:#9a6b6b;text-decoration:line-through;margin-bottom:3px}
    .cqup-errs{font-size:10.5px;color:#9b3030;line-height:1.6;background:#fff6f6;border-radius:9px;padding:8px 10px;max-height:220px;overflow:auto}
    .cqup-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.cqup-tabs button{border:1px solid #d6e5e2;background:#f2f6f5;color:#435d60;border-radius:9px;padding:7px 11px;font-size:11.5px;font-weight:800;cursor:pointer}.cqup-tabs button[aria-selected=true]{background:#0b7773;color:#fff;border-color:#0b7773}
    .cqup-lbl{display:flex;flex-direction:column;gap:3px;font-size:10px;font-weight:800;color:#657c80}
    .cqup,.cqup *{box-sizing:border-box}.cqup-ta{width:100%;min-height:150px;border:1px solid #cad9d8;border-radius:9px;padding:9px 10px;font:inherit;font-size:12px;line-height:1.5;resize:vertical}
    .cqup-mt td,.cqup-mt th{text-align:left}.cqup-mt .c{text-align:center}.cqup-chk{display:inline-flex;flex-direction:column;align-items:center;gap:2px;font-size:11px;cursor:pointer}.cqup-chk small{font-size:9px;color:#71868a}.cqup-chk input{width:16px;height:16px}
    .cqup-warn{font-size:10.5px;background:#fff7e6;color:#7a5200;border-radius:9px;padding:8px 10px;margin-bottom:8px;line-height:1.5}
    @media(max-width:900px){.cqup-grid{grid-template-columns:1fr}}`;
    document.head.appendChild(x);
  }

  /* ---------------- TP upload ---------------- */
  const LANG={
    id:{label:'TP Bahasa Indonesia',flag:'ID',note:'Menambah TP baru atau memperbarui teks/topik TP yang sudah ada. ID TP tetap sehingga nilai siswa tidak terputus. Tidak ada TP yang dihapus.'},
    en:{label:'TP English',flag:'EN',note:'Mengisi terjemahan English untuk TP yang sudah ada, dipakai di rapor bahasa Inggris. Template berisi teks Indonesia sebagai acuan.'}
  };
  function headerMap(row){const m={};Object.keys(row).forEach(k=>{m[nk(k)]=k});return m}
  function pickBy(row,map,keys){for(const k of keys){if(map[k]!=null&&String(row[map[k]]).trim()!=='')return row[map[k]]}return ''}
  function enKey(map){return Object.keys(map).find(k=>k.includes('english')||k.includes('inggris')||k==='descriptionen')}
  function idKey(map){return ['tujuanpembelajaran','tujuanpembelajaranindonesia','tujuanpembelajaranid','tpindonesia','deskripsi','description'].find(k=>map[k]!=null)}

  async function parseTpFile(file,lang){
    await loadXLSX();
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:false});
    const out=[];let sawText=false;
    for(const sn of wb.SheetNames){
      const rows=XLSX.utils.sheet_to_json(wb.Sheets[sn],{defval:''});if(!rows.length)continue;
      const map=headerMap(rows[0]);const tk=lang==='en'?enKey(map):idKey(map);if(!tk)continue;sawText=true;
      rows.forEach((r,i)=>{
        const text=String(r[map[tk]]??'').trim();if(!text)return;
        const it={sheet_name:sn,row_no:i+2,subject_name:String(pickBy(r,map,['mapel','matapelajaran','subject'])||sn).trim(),grade_level:num(pickBy(r,map,['kelas','grade','gradelevel'])),semester_no:num(pickBy(r,map,['semester','sem','semesterno'])),sort_order:num(pickBy(r,map,['urutantp','urutan','tpke','nomortp','sortorder','tp']))};
        if(lang==='en')it.description_en=text;else{it.description=text;it.topic=String(pickBy(r,map,['topikmateri','topik','materi','topic'])).trim()}
        out.push(it);
      });
    }
    if(!sawText)throw Error(lang==='en'?'Kolom "Tujuan Pembelajaran (English)" tidak ditemukan. Gunakan template English.':'Kolom "Tujuan Pembelajaran" tidak ditemukan. Gunakan template Indonesia.');
    if(!out.length)throw Error('Tidak ada TP yang terisi di file.');
    return out;
  }

  async function downloadTemplate(lang,sem){
    await loadXLSX();
    const [boot,ex]=await Promise.all([call('academic-master-tp',{action:'bootstrap'}),call('academic-master-tp',{action:'export_objectives',semester_no:sem})]);
    const items=ex.items||[],groups=new Map();
    const add=(name)=>{if(!groups.has(name))groups.set(name,[]);return groups.get(name)};
    items.forEach(x=>add(x.subject_name).push(x));
    const wb=XLSX.utils.book_new();
    if(lang==='id'){
      for(const s of boot.subjects||[]){const list=add(s.name);for(const g of s.grades||[]){if(!list.some(x=>+x.grade_level===+g.grade_level))for(let i=1;i<=5;i++)list.push({grade_level:+g.grade_level,semester_no:sem,sort_order:i,topic:'',description:'',blank:true})}}
    }
    const names=[...groups.keys()].filter(n=>groups.get(n).length).sort((a,b)=>a.localeCompare(b,'id'));
    if(!names.length)throw Error(lang==='en'?`Belum ada TP semester ${sem}. Upload TP Indonesia dulu.`:'Mapel belum tersedia.');
    for(const n of names){
      const list=groups.get(n).sort((a,b)=>a.grade_level-b.grade_level||a.sort_order-b.sort_order);
      const rows=lang==='en'
        ?list.map(x=>({'Kelas':x.grade_level,'Semester':x.semester_no,'Urutan TP':'TP'+x.sort_order,'Tujuan Pembelajaran (Indonesia)':x.description||'','Tujuan Pembelajaran (English)':x.description_en||''}))
        :list.map(x=>({'Kelas':x.grade_level,'Semester':x.semester_no,'Urutan TP':'TP'+x.sort_order,'Topik/Materi':x.topic||'','Tujuan Pembelajaran':x.description||''}));
      const ws=XLSX.utils.json_to_sheet(rows);
      ws['!cols']=lang==='en'?[{wch:8},{wch:10},{wch:10},{wch:70},{wch:70}]:[{wch:8},{wch:10},{wch:10},{wch:28},{wch:85}];
      XLSX.utils.book_append_sheet(wb,ws,n.replace(/[\\\/?*\[\]:]/g,' ').slice(0,31));
    }
    const yr=String(boot.academic_year||'').replace(/\//g,'-');
    XLSX.writeFile(wb,`TP_${lang==='en'?'English':'Indonesia'}_${yr}_S${sem}.xlsx`);
  }

  function drawResult(box,lang,j){
    const L=LANG[lang],chips=[];
    if(j.insert_count)chips.push(`<span class="cqup-chip new">${j.insert_count} TP baru</span>`);
    if(j.update_count)chips.push(`<span class="cqup-chip upd">${j.update_count} ${lang==='en'?'terjemahan diisi/diubah':'TP diubah'}</span>`);
    chips.push(`<span class="cqup-chip">${j.unchanged||0} tidak berubah</span>`);
    if(j.error_count)chips.push(`<span class="cqup-chip bad">${j.error_count} baris bermasalah</span>`);
    const errs=j.error_count?`<div class="cqup-errs">${(j.errors||[]).map(e=>'• '+esc(e)).join('<br>')}${j.error_count>(j.errors||[]).length?'<br>…':''}</div>`:'';
    const rows=(j.preview||[]);
    const table=rows.length?`<div class="cqup-tw"><table><thead><tr><th>Status</th><th>Mapel</th><th>Kls</th><th>Sem</th><th>TP</th><th>${lang==='en'?'English (TP Indonesia sebagai acuan)':'Tujuan Pembelajaran'}</th></tr></thead><tbody>${rows.map(x=>`<tr><td>${esc(x.status)}</td><td>${esc(x.subject_name)}</td><td>${x.grade_level}</td><td>${x.semester_no}</td><td>TP${x.sort_order}</td><td>${x.old?`<div class="cqup-old">${esc(x.old)}</div>`:''}${esc(x.text)}${lang==='en'&&x.ref?`<div class="cqup-note" style="margin:3px 0 0">ID: ${esc(x.ref)}</div>`:''}</td></tr>`).join('')}</tbody></table></div>`:'';
    box.innerHTML=`<div class="cqup-chips"><b style="font-size:11px;align-self:center">Preview ${esc(L.label)}:</b>${chips.join('')}</div>${errs}${table}`;
  }

  // Tempel TP: satu baris = satu TP; nomor 'TP1.'/'1.' di depan atau kolom Urutan dari Excel dipakai sebagai urutan.
  function parsePaste(text,start){const out=[];let next=start;
      String(text||'').replace(/\r/g,'').split('\n').forEach((raw,i)=>{const line=raw.replace(/ /g,' ').trim();if(!line)return;
        let cells=line.split('\t').map(x=>x.trim());let order=0,topic='',desc='';
        const num=v=>{const m=String(v).match(/^(?:tp\s*)?(\d{1,2})[.):\-]?$/i);return m?+m[1]:0};
        if(cells.length>1){if(num(cells[0])){order=num(cells[0]);cells=cells.slice(1)}cells=cells.filter(Boolean);desc=cells[cells.length-1]||'';if(cells.length>1)topic=cells[cells.length-2]}
        else{const m=line.match(/^(?:tp\s*)?(\d{1,2})\s*[.):\-]\s+(.+)$/i)||line.match(/^tp\s*(\d{1,2})\s+(.+)$/i);if(m){order=+m[1];desc=m[2]}else desc=line.replace(/^[-•●▪◦*]\s+/,'')}
        if(!desc)return;if(!order)order=next;next=order+1;out.push({row_no:i+1,order,topic,desc})});return out}
  window.__cqMasterUploadInternals={parsePaste};
  /* ---------------- Alat Master TP: tab Tempel TP | Upload Excel | Mapel per Kelas | KKM ---------------- */
  const TOOL_TABS=[['paste','Tempel TP'],['excel','Upload Excel'],['mapel','Mapel per Kelas'],['kkm','KKM'],['koku','Rubrik Kokurikuler']];

  /* ---------------- Rubrik kokurikuler (format = file "Rubrik_PjBL_Dimensi_Profil_Lulusan.xlsx") ----------------
     Satu sheet per kelas bernama "PjBL <kelas> ...". Sel yang dibaca: A1 judul, A2 tujuan, baris 6-10 indikator,
     B12/B15 nama dimensi A/B, B13/B16 frasa kekuatan, B14/B17 frasa perlu berlatih; kolom C = English (opsional). */
  const KOKU_LEVELS=['4 – Sangat Baik','3 – Baik','2 – Cukup','1 – Perlu Bimbingan'];
  function kokuSheetRows(g,r){const A=r.dims[0],B=r.dims[1],rows=[];
    rows[0]=[`RUBRIK PENILAIAN: ${r.id}`,'',r.en||''];rows[1]=[`Tujuan: ${r.tujuan||''}`];rows[2]=[`Dimensi terpilih: ${A.id} dan ${B.id}`];rows[3]=[`Kelas: ${g}`];
    rows[4]=['Dimensi','Indikator',...KOKU_LEVELS];
    const ind=[...(A.indicators||[]).map(x=>[A.id,x]),...(B.indicators||[]).map(x=>[B.id,x])];
    const fill=ind.length?ind:[[A.id,{}],[A.id,{}],[B.id,{}],[B.id,{}]];fill.slice(0,5).forEach(([d,x],i)=>{rows[5+i]=[d,x.indikator||'',x.l4||'',x.l3||'',x.l2||'',x.l1||'']});
    rows[10]=['Frasa untuk komentar (dapat diedit)','','English (opsional, untuk rapor bahasa Inggris)'];
    rows[11]=['Dimensi A',A.id,A.en||''];rows[12]=['Kekuatan A (…dengan mampu …)',A.kuat,A.kuat_en||''];rows[13]=['Perlu berlatih A (…perlu berlatih dalam …)',A.latih,A.latih_en||''];
    rows[14]=['Dimensi B',B.id,B.en||''];rows[15]=['Kekuatan B (…dengan mampu …)',B.kuat,B.kuat_en||''];rows[16]=['Perlu berlatih B (…perlu berlatih dalam …)',B.latih,B.latih_en||''];
    for(let i=0;i<17;i++)rows[i]=rows[i]||[''];return rows}
  function parseKokuWorkbook(wb){const out=[],errs=[];
    for(const sn of wb.SheetNames){const ws=wb.Sheets[sn],cell=a=>String(ws[a]?.v??'').replace(/\s+/g,' ').trim();
      const m=sn.match(/^pjbl\s*(\d)/i);const kel=cell('A4').match(/kelas\s*:?\s*(\d)/i);const g=m?+m[1]:kel?+kel[1]:0;
      if(!g)continue;if(g<1||g>6){errs.push(`Sheet "${sn}": kelas harus 1–6.`);continue}
      const title=cell('A1').replace(/^rubrik penilaian\s*:\s*/i,''),tujuan=cell('A2').replace(/^tujuan\s*:\s*/i,'');
      const dims=[['B12','B13','B14','C12','C13','C14'],['B15','B16','B17','C15','C16','C17']].map(([n,k,l,ne,ke,le])=>({id:cell(n),kuat:cell(k),latih:cell(l),en:cell(ne),kuat_en:cell(ke),latih_en:cell(le),indicators:[]}));
      for(let r=6;r<=10;r++){const d=cell('A'+r),ind=cell('B'+r);if(!d||!ind)continue;const t=dims.find(x=>x.id.toLowerCase()===d.toLowerCase()||x.id.toLowerCase().startsWith(d.toLowerCase())||d.toLowerCase().startsWith(x.id.toLowerCase()));if(t)t.indicators.push({indikator:ind,l4:cell('C'+r),l3:cell('D'+r),l2:cell('E'+r),l1:cell('F'+r)})}
      const miss=[];if(!title)miss.push('judul (A1)');dims.forEach((d,i)=>{const s=i?'B':'A';if(!d.id)miss.push(`nama dimensi ${s} (B${i?15:12})`);if(!d.kuat)miss.push(`kekuatan ${s} (B${i?16:13})`);if(!d.latih)miss.push(`perlu berlatih ${s} (B${i?17:14})`)});
      if(miss.length){errs.push(`Sheet "${sn}" (kelas ${g}): belum diisi ${miss.join(', ')}.`);continue}
      if(out.some(x=>x.grade_level===g)){errs.push(`Kelas ${g} muncul di lebih dari satu sheet.`);continue}
      out.push({grade_level:g,data:{id:title,en:cell('C1'),tujuan,dims}})}
    return{items:out.sort((a,b)=>a.grade_level-b.grade_level),errors:errs}}
  window.__cqMasterUploadInternals=Object.assign(window.__cqMasterUploadInternals||{},{kokuSheetRows,parseKokuWorkbook});
  window.cqTpUploadPanel=function(el,opts){
    if(!el)return;css();opts=opts||{};
    const T={tab:'paste',boot:null,sem:+(opts.semester||0)||0};
    const done=(kind,j)=>{try{opts.onDone&&opts.onDone(kind,j)}catch(_){}};
    const shell=()=>{el.innerHTML=`<div class="cqup"><div class="cqup-top"><div><div class="cqup-title">Alat Master TP</div><div class="cqup-sub">Tempel TP dari Excel/Word, upload file Excel (Indonesia & English), atur mapel tiap kelas, dan KKM. Untuk Admin dan Akademik.</div></div></div><div class="cqup-tabs">${TOOL_TABS.map(([k,l])=>`<button type="button" data-tt="${k}" aria-selected="${T.tab===k}">${l}</button>`).join('')}</div><div data-act="body"></div></div>`;
      el.querySelectorAll('[data-tt]').forEach(b=>b.onclick=()=>{T.tab=b.dataset.tt;shell()});
      const body=el.querySelector('[data-act=body]');({paste:renderPaste,excel:renderExcel,mapel:renderMapel,kkm:renderKkm,koku:renderKoku})[T.tab](body)};

    /* -- Rubrik kokurikuler: download template (isi rubrik saat ini), upload, preview, simpan per semester -- */
    async function renderKoku(box){const K=T.koku=T.koku||{sem:0,parsed:null};box.innerHTML='<div class="cqup-note">Memuat rubrik…</div>';
      let b;try{b=await boot();if(!K.sem)K.sem=T.sem||+b.active_semester||1}catch(e){box.innerHTML=`<div class="cqup-msg err">${esc(e.message)}</div>`;return}
      let cur;try{cur=await call('academic-master-tp',{action:'koku_list',semester_no:K.sem})}catch(e){box.innerHTML=`<div class="cqup-msg err">${esc(e.message)}</div>`;return}
      const stored=new Map((cur.items||[]).map(x=>[+x.grade_level,x])),builtin=(window.CQ_SEMESTER_CATALOG||{}).KOKURIKULER||{};
      const rubricOf=g=>stored.get(g)?.data||builtin[g]||null;
      box.innerHTML=`<div class="cqup-note">Rubrik dipakai walas di tab Kokurikuler dan di Rapor IKM bagian B. Rubrik disimpan <b>per tahun ajaran dan semester</b>, jadi rapor semester lain tidak ikut berubah. Formatnya sama dengan file "Rubrik PjBL Dimensi Profil Lulusan": satu sheet per kelas (nama sheet diawali <b>PjBL 1</b> … <b>PjBL 6</b>). Kolom C (English) boleh dikosongkan.</div>
<div class="cqup-row" style="gap:8px;margin-bottom:8px"><label class="cqup-lbl">Semester<select class="cqup-sel" data-k="sem"><option value="1">Semester 1</option><option value="2">Semester 2</option></select></label><button class="cqup-btn alt" data-k="tpl">Download Template (isi rubrik saat ini)</button></div>
<div class="cqup-tw"><table><thead><tr><th>Kelas</th><th>Proyek</th><th>Dimensi A</th><th>Dimensi B</th><th>Sumber</th></tr></thead><tbody>${[1,2,3,4,5,6].map(g=>{const r=rubricOf(g),s=stored.get(g);return`<tr><td>${g}</td><td>${esc(r?.id||'-')}</td><td>${esc(r?.dims?.[0]?.id||'-')}</td><td>${esc(r?.dims?.[1]?.id||'-')}</td><td>${s?`Upload ${new Date(s.updated_at).toLocaleDateString('id-ID')}${s.source_file?` · ${esc(s.source_file)}`:''}`:'Bawaan CQlass'}</td></tr>`}).join('')}</tbody></table></div>
<div class="cqup-row" style="margin-top:10px"><input type="file" accept=".xlsx,.xls" data-k="file"><button class="cqup-btn alt" data-k="preview" disabled>Preview</button><button class="cqup-btn" data-k="apply" disabled>Simpan Rubrik</button></div><div class="cqup-msg" data-k="msg"></div><div class="cqup-res" data-k="res"></div>`;
      const q=k=>box.querySelector(`[data-k=${k}]`),msg=(t,k)=>{q('msg').textContent=t||'';q('msg').className='cqup-msg'+(k?' '+k:'')};
      q('sem').value=String(K.sem);q('sem').onchange=()=>{K.sem=+q('sem').value;K.parsed=null;renderKoku(box)};
      q('tpl').onclick=async()=>{try{await loadXLSX();const wb=XLSX.utils.book_new();
        const sum=[['RUBRIK KOKURIKULER (PjBL) — '+(b.academic_year||'')+' Semester '+K.sem],['Isi atau ubah sheet PjBL 1–6, lalu upload kembali di Alat Master TP > Rubrik Kokurikuler.'],[],['Kelas','Tema PjBL','Tujuan','Dimensi Lulusan 1','Dimensi Lulusan 2']];
        for(let g=1;g<=6;g++){const r=rubricOf(g);if(r)sum.push([g,r.id,r.tujuan||'',r.dims[0].id,r.dims[1].id])}
        sum.push([],['Skala Penilaian'],['',4,'Sangat Baik'],['',3,'Baik'],['',2,'Cukup'],['',1,'Perlu Bimbingan'],['','Komentar dibuat otomatis: skor 3–4 = kekuatan, skor 1–2 = perlu berlatih.']);
        const s0=XLSX.utils.aoa_to_sheet(sum);s0['!cols']=[{wch:8},{wch:45},{wch:60},{wch:24},{wch:24}];XLSX.utils.book_append_sheet(wb,s0,'Ringkasan');
        for(let g=1;g<=6;g++){const r=rubricOf(g);if(!r)continue;const ws=XLSX.utils.aoa_to_sheet(kokuSheetRows(g,r));ws['!cols']=[{wch:40},{wch:60},{wch:45},{wch:40},{wch:40},{wch:40}];
          const nm=(`PjBL ${g} `+String(r.id).split(/[(/]/)[0]).replace(/[\\\/?*\[\]:]/g,' ').trim().slice(0,31);XLSX.utils.book_append_sheet(wb,ws,nm)}
        XLSX.writeFile(wb,`Rubrik_Kokurikuler_${String(b.academic_year||'').replace(/\//g,'-')}_S${K.sem}.xlsx`);msg('Template terunduh. Ubah isinya bila perlu, lalu upload di sini.','ok')}catch(e){msg(e.message,'err')}};
      q('file').onchange=()=>{K.parsed=null;q('apply').disabled=true;q('preview').disabled=!q('file').files[0];q('res').innerHTML='';msg(q('file').files[0]?'Klik Preview untuk memeriksa isi file.':'')};
      q('preview').onclick=async()=>{const f=q('file').files[0];if(!f)return;K.parsed=null;q('apply').disabled=true;
        try{await loadXLSX();const p=parseKokuWorkbook(XLSX.read(await f.arrayBuffer(),{type:'array'}));const C=window.CQ_SEMESTER_CATALOG||{};
          q('res').innerHTML=(p.errors.length?`<div class="cqup-errs">${p.errors.map(e=>'• '+esc(e)).join('<br>')}</div>`:'')+(p.items.length?`<div class="cqup-tw"><table><thead><tr><th>Kelas</th><th>Proyek & dimensi</th><th>Contoh komentar (skor A=4, B=2)</th></tr></thead><tbody>${p.items.map(it=>`<tr><td>${it.grade_level}</td><td><b>${esc(it.data.id)}</b><div class="cqup-note" style="margin:2px 0 0">A: ${esc(it.data.dims[0].id)} · B: ${esc(it.data.dims[1].id)} · ${it.data.dims[0].indicators.length+it.data.dims[1].indicators.length} indikator${it.data.dims.every(d=>d.kuat_en&&d.latih_en&&d.en)?' · ada English':''}</div></td><td>${esc(C.kokuComment?C.kokuComment('Putra',it.grade_level,{a:4,b:2},'id',it.data):'')}</td></tr>`).join('')}</tbody></table></div>`:'');
          if(!p.items.length){msg(p.errors.length?'File perlu diperbaiki.':'Tidak ada sheet "PjBL 1"–"PjBL 6" yang terbaca.','err');return}
          if(p.errors.length){msg(`${p.errors.length} sheet perlu diperbaiki sebelum disimpan.`,'err');return}
          K.parsed={items:p.items,file:f.name};q('apply').disabled=false;msg(`Siap disimpan: rubrik kelas ${p.items.map(x=>x.grade_level).join(', ')} untuk semester ${K.sem}.`,'ok')}catch(e){msg(e.message,'err')}};
      q('apply').onclick=async()=>{if(!K.parsed)return;if(!confirm(`Simpan rubrik kokurikuler kelas ${K.parsed.items.map(x=>x.grade_level).join(', ')} untuk ${b.academic_year} semester ${K.sem}? Rubrik lama untuk kelas tersebut di semester ini akan diganti.`))return;
        try{q('apply').disabled=true;msg('Menyimpan…');const j=await call('academic-master-tp',{action:'koku_save',semester_no:K.sem,items:K.parsed.items,file_name:K.parsed.file});K.parsed=null;await renderKoku(box);box.querySelector('[data-k=msg]').className='cqup-msg ok';box.querySelector('[data-k=msg]').textContent=`Rubrik kelas ${j.saved.join(', ')} tersimpan untuk semester ${j.semester_no}.`;done('koku',j)}catch(e){msg(e.message,'err');q('apply').disabled=false}}}
    async function boot(force){if(!T.boot||force){T.boot=await call('academic-master-tp',{action:'bootstrap'});if(!T.sem)T.sem=+T.boot.active_semester||1}return T.boot}

    /* -- Tempel TP: banyak baris sekaligus atau satu baris, langsung jadi TP1, TP2, ... -- */
    async function renderPaste(box){box.innerHTML='<div class="cqup-note">Memuat mapel…</div>';let b;try{b=await boot()}catch(e){box.innerHTML=`<div class="cqup-msg err">${esc(e.message)}</div>`;return}
      const P=T.paste=T.paste||{grade:1,subject:'',lang:'id',text:'',start:0,items:null};
      const subjects=g=>(b.subjects||[]).map(x=>({name:x.name,g:(x.grades||[]).find(y=>+y.grade_level===+g)})).filter(x=>x.g).sort((a,c)=>a.name.localeCompare(c.name,'id'));
      const list=subjects(P.grade);if(!list.some(x=>x.name===P.subject))P.subject=list[0]?.name||'';
      box.innerHTML=`<div class="cqup-row" style="gap:8px;margin-bottom:8px"><label class="cqup-lbl">Semester<select class="cqup-sel" data-p="sem"><option value="1">Semester 1</option><option value="2">Semester 2</option></select></label><label class="cqup-lbl">Kelas<select class="cqup-sel" data-p="grade">${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${n===+P.grade?'selected':''}>Kelas ${n}</option>`).join('')}</select></label><label class="cqup-lbl">Mapel<select class="cqup-sel" data-p="subject">${list.map(x=>`<option ${x.name===P.subject?'selected':''}>${esc(x.name)}</option>`).join('')}</select></label><label class="cqup-lbl">Bahasa<select class="cqup-sel" data-p="lang"><option value="id" ${P.lang==='id'?'selected':''}>Indonesia (tambah/ubah TP)</option><option value="en" ${P.lang==='en'?'selected':''}>English (terjemahan TP yang ada)</option></select></label><label class="cqup-lbl">Mulai dari TP<input class="cqup-sel" style="width:70px" data-p="start" inputmode="numeric"></label></div>
<div class="cqup-note" data-p="info">Memeriksa TP yang sudah ada…</div>
<textarea class="cqup-ta" data-p="text" placeholder="Tempel dari Excel atau Word. Satu baris = satu TP.&#10;Contoh:&#10;Memahami rukun Islam&#10;Menyebutkan rukun iman&#10;&#10;Boleh diawali nomor (TP1. / 1.) — nomor itu yang dipakai. Dari Excel boleh 2–3 kolom: Urutan | Topik | Tujuan Pembelajaran.">${esc(P.text)}</textarea>
<div class="cqup-row" style="margin-top:7px"><button class="cqup-btn alt" data-p="preview">Preview</button><button class="cqup-btn" data-p="apply" disabled>Simpan ke CQlass</button><span class="cqup-note" style="margin:0">TP yang nomornya sudah ada akan diperbarui teksnya (nilai siswa tetap aman); nomor baru ditambahkan.</span></div><div class="cqup-msg" data-p="msg"></div><div class="cqup-res" data-p="res"></div>`;
      const q=k=>box.querySelector(`[data-p=${k}]`),msg=(t,k)=>{q('msg').textContent=t||'';q('msg').className='cqup-msg'+(k?' '+k:'')};
      q('sem').value=String(T.sem);let existing=[];
      const subjectId=()=>{const x=list.find(y=>y.name===P.subject);return x?x.g.subject_id:''};
      async function loadExisting(){q('info').textContent='Memeriksa TP yang sudah ada…';try{const sid=subjectId();existing=sid?(await call('academic-master-tp',{action:'list_objectives',semester_no:T.sem,grade_level:P.grade,subject_id:sid})).items||[]:[];const orders=existing.map(x=>+x.sort_order).sort((a,c)=>a-c);const enOk=existing.filter(x=>String(x.description_en||'').trim()).length;
        q('info').innerHTML=existing.length?`Sudah ada <b>${existing.length} TP</b> (TP${orders[0]}–TP${orders[orders.length-1]}), ${enOk} sudah punya English.`:'Belum ada TP untuk pilihan ini.';
        if(!P.start||P._auto){P.start=P.lang==='en'?1:(orders.length?orders[orders.length-1]+1:1);P._auto=true}q('start').value=String(P.start)}catch(e){q('info').textContent=e.message}}
      const reset=()=>{P.items=null;q('apply').disabled=true;q('res').innerHTML=''};
      q('sem').onchange=()=>{T.sem=+q('sem').value;P._auto=true;reset();loadExisting()};
      q('grade').onchange=()=>{P.grade=+q('grade').value;P.subject='';P._auto=true;renderPaste(box)};
      q('subject').onchange=()=>{P.subject=q('subject').value;P._auto=true;reset();loadExisting()};
      q('lang').onchange=()=>{P.lang=q('lang').value;P._auto=true;reset();loadExisting()};
      q('start').oninput=()=>{P.start=Math.max(1,parseInt(q('start').value,10)||1);P._auto=false;reset()};
      q('text').oninput=()=>{P.text=q('text').value;reset()};
      q('preview').onclick=async()=>{reset();const rows=parsePaste(P.text,P.start||1);if(!rows.length){msg('Tempel minimal satu baris TP.','err');return}if(!P.subject){msg('Pilih mapel dulu.','err');return}
        const items=rows.map(r=>({sheet_name:'Tempel',row_no:r.row_no,subject_name:P.subject,grade_level:P.grade,semester_no:T.sem,sort_order:r.order,topic:r.topic,[P.lang==='en'?'description_en':'description']:r.desc}));
        try{q('preview').disabled=true;msg(`Memeriksa ${items.length} TP…`);const j=await call('academic-master-tp',{action:'upload_preview',lang:P.lang,items});drawResult(q('res'),P.lang,j);const ch=(j.insert_count||0)+(j.update_count||0);P.items=!j.error_count&&ch?items:null;q('apply').disabled=!P.items;msg(j.error_count?`${j.error_count} baris perlu diperbaiki.`:ch?`Siap disimpan: ${ch} perubahan.`:'Tidak ada perubahan dibanding data CQlass.',j.error_count?'err':'ok')}catch(e){msg(e.message,'err')}finally{q('preview').disabled=false}};
      q('apply').onclick=async()=>{if(!P.items)return;if(!confirm(`Simpan ${P.items.length} TP ${P.lang==='en'?'English':'Indonesia'} untuk ${P.subject} kelas ${P.grade} semester ${T.sem}?`))return;
        try{q('apply').disabled=true;msg('Menyimpan…');const j=await call('academic-master-tp',{action:'upload_apply',lang:P.lang,items:P.items});msg(P.lang==='en'?`Berhasil: ${j.updated} terjemahan tersimpan.`:`Berhasil: ${j.inserted} TP baru, ${j.updated} TP diperbarui.`,'ok');P.text='';q('text').value='';P.items=null;q('res').innerHTML='';P._auto=true;await loadExisting();done('tp',j)}catch(e){const errs=e.payload?.errors;msg(e.message+(errs?.length?'\n'+errs.slice(0,8).map(x=>'• '+x).join('\n'):''),'err');q('apply').disabled=false}};
      loadExisting()}

    /* -- Mapel per kelas: centang kelas yang memakai mapel; tambah mapel baru. -- */
    async function renderMapel(box){box.innerHTML='<div class="cqup-note">Memuat mapel…</div>';let items;try{items=(await call('academic-master-tp',{action:'subjects_list'})).items||[]}catch(e){box.innerHTML=`<div class="cqup-msg err">${esc(e.message)}</div>`;return}
      const M=T.mapel=T.mapel||{showOff:false};const byName=new Map();for(const s of items){const k=s.name.trim().toLowerCase();if(!byName.has(k))byName.set(k,{name:s.name,group:s.subject_group||'',sort:+s.sort_order||999,g:{}});const r=byName.get(k);r.sort=Math.min(r.sort,+s.sort_order||999);if(!r.g[s.grade_level]||s.is_active)r.g[s.grade_level]=s}
      let rows=[...byName.values()].sort((a,c)=>a.name.localeCompare(c.name,'id'));const hidden=rows.filter(r=>!Object.values(r.g).some(s=>s.is_active)).length;if(!M.showOff)rows=rows.filter(r=>Object.values(r.g).some(s=>s.is_active));
      box.innerHTML=`<div class="cqup-note">Centang = mapel dipakai di kelas itu (muncul di Master TP, Legger, dan rapor). Mapel yang sudah punya nilai tahun ini tidak bisa dimatikan. Angka kecil = jumlah TP.</div>
<div class="cqup-tw"><table class="cqup-mt"><thead><tr><th>Mapel</th>${[1,2,3,4,5,6].map(n=>`<th class="c">Kelas ${n}</th>`).join('')}</tr></thead><tbody>${rows.map((r,ri)=>`<tr><td><b>${esc(r.name)}</b><div class="cqup-note" style="margin:0">${esc(r.group||'')}</div></td>${[1,2,3,4,5,6].map(n=>{const s=r.g[n];return`<td class="c"><label class="cqup-chk"><input type="checkbox" data-row="${ri}" data-grade="${n}" ${s&&s.is_active?'checked':''}>${s&&s.is_active&&s.tp_count?`<small>${s.tp_count} TP</small>`:''}</label></td>`}).join('')}</tr>`).join('')||'<tr><td colspan="7" class="c">Belum ada mapel.</td></tr>'}</tbody></table></div>
<label class="cqup-note" style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" data-m="off" ${M.showOff?'checked':''}> Tampilkan mapel lama yang tidak dipakai (${hidden})</label>
<div class="cqup-slot" style="margin-top:10px"><h4>+ Tambah mapel baru</h4><div class="cqup-row" style="gap:8px"><label class="cqup-lbl">Nama mapel<input class="cqup-sel" style="width:200px" data-m="name" placeholder="Contoh: Coding"></label><label class="cqup-lbl">Kelompok<select class="cqup-sel" data-m="group"><option>Umum</option><option>Diniyyah</option><option>Muatan Lokal</option></select></label><label class="cqup-lbl">Kode singkat (opsional)<input class="cqup-sel" style="width:110px" data-m="code" maxlength="8" placeholder="COD"></label></div><div class="cqup-row" style="gap:10px;margin-top:6px">${[1,2,3,4,5,6].map(n=>`<label class="cqup-chk"><input type="checkbox" data-m="g" value="${n}"> Kelas ${n}</label>`).join('')}<button class="cqup-btn" data-m="add">Tambah</button></div></div><div class="cqup-msg" data-m="msg"></div>`;
      const msg=(t,k)=>{const m=box.querySelector('[data-m=msg]');m.textContent=t||'';m.className='cqup-msg'+(k?' '+k:'')};
      box.querySelector('[data-m=off]').onchange=e=>{M.showOff=e.target.checked;renderMapel(box)};
      box.querySelectorAll('input[data-row]').forEach(cb=>cb.onchange=async()=>{const r=rows[+cb.dataset.row],g=+cb.dataset.grade,s=r.g[g],on=cb.checked;cb.disabled=true;
        try{if(on){if(s)await call('academic-master-tp',{action:'subject_set_active',subject_id:s.id,active:true});else await call('academic-master-tp',{action:'add_subject',name:r.name,subject_group:r.group||'Umum',grades:[g]});msg(`${r.name} dipakai di kelas ${g}.`,'ok')}
          else{try{await call('academic-master-tp',{action:'subject_set_active',subject_id:s.id,active:false})}catch(e){if(e.payload?.warning&&confirm(e.message+'\n\nTetap nonaktifkan?'))await call('academic-master-tp',{action:'subject_set_active',subject_id:s.id,active:false,force:true});else throw e}msg(`${r.name} tidak dipakai lagi di kelas ${g}.`,'ok')}
          T.boot=null;done('subjects');renderMapel(box)}catch(e){cb.checked=!on;cb.disabled=false;msg(e.message,'err')}});
      box.querySelector('[data-m=add]').onclick=async()=>{const name=box.querySelector('[data-m=name]').value.trim(),grades=[...box.querySelectorAll('input[data-m=g]:checked')].map(x=>+x.value);if(name.length<2||!grades.length){msg('Isi nama mapel dan pilih minimal satu kelas.','err');return}
        try{const j=await call('academic-master-tp',{action:'add_subject',name,subject_group:box.querySelector('[data-m=group]').value,code_prefix:box.querySelector('[data-m=code]').value.trim(),grades});const parts=[j.created?.length?`ditambahkan ke kelas ${j.created.join(', ')}`:'',j.reactivated?.length?`diaktifkan lagi di kelas ${j.reactivated.join(', ')}`:'',j.skipped?.length?`sudah ada di kelas ${j.skipped.join(', ')}`:''].filter(Boolean);T.boot=null;done('subjects');await renderMapel(box);msg(`${name}: ${parts.join('; ')}.`,'ok')}catch(e){msg(e.message,'err')}}}

    /* -- KKM satuan pendidikan per tahun ajaran -- */
    async function renderKkm(box){box.innerHTML='<div class="cqup-note">Memuat KKM…</div>';let k;try{k=await call('academic-master-tp',{action:'kkm_get'})}catch(e){box.innerHTML=`<div class="cqup-msg err">${esc(e.message)}</div>`;return}
      box.innerHTML=`<div class="cqup-note">KKM satuan pendidikan tahun ajaran <b>${esc(k.academic_year||'')}</b>. Dipakai di Rapor IKM ("Kriteria Ketuntasan Minimal Satuan Pendidikan = …") dan sebagai KKTP di rapor Nilai bila TP belum punya KKTP sendiri.${k.configured?'':' Saat ini memakai bawaan 70.'}</div><div class="cqup-row" style="gap:8px"><label class="cqup-lbl">KKM<input class="cqup-sel" style="width:90px" data-k="v" inputmode="numeric" value="${esc(k.kkm)}"></label><button class="cqup-btn" data-k="save">Simpan KKM</button></div><div class="cqup-msg" data-k="msg"></div>`;
      const m=box.querySelector('[data-k=msg]');box.querySelector('[data-k=save]').onclick=async()=>{const v=Number(box.querySelector('[data-k=v]').value);if(!Number.isInteger(v)||v<0||v>100){m.className='cqup-msg err';m.textContent='KKM harus angka bulat 0–100.';return}
        try{const j=await call('academic-master-tp',{action:'kkm_save',kkm:v});m.className='cqup-msg ok';m.textContent=`KKM ${j.kkm} tersimpan untuk ${j.academic_year}.`;done('kkm',j)}catch(e){m.className='cqup-msg err';m.textContent=e.message}}}

    function renderExcel(body){renderExcelUpload(body,T,done)}
    shell();
  };
  function renderExcelUpload(el,T,done){
    const st={sem:T.sem||1,parsed:{id:null,en:null},ok:{id:false,en:false}};const opts={onDone:(lang,j)=>done('tp',j),semester:T.sem};
    const slot=lang=>`<div class="cqup-slot ${lang}" data-lang="${lang}"><h4><span class="cqup-flag">${LANG[lang].flag}</span>${LANG[lang].label}</h4><div class="cqup-note">${LANG[lang].note}</div><div class="cqup-row"><button class="cqup-btn alt" data-act="tpl">Download Template</button><input type="file" accept=".xlsx,.xls" data-act="file"></div><div class="cqup-row" style="margin-top:7px"><button class="cqup-btn alt" data-act="preview" disabled>Preview</button><button class="cqup-btn" data-act="apply" disabled>Simpan ke CQlass</button></div><div class="cqup-msg" data-act="msg"></div></div>`;
    el.innerHTML=`<div class="cqup-x"><div class="cqup-top"><div class="cqup-sub">Dua tempat upload: versi Indonesia dan versi English. Satu sheet = satu mapel, kolom Kelas · Semester · Urutan TP. Download template dulu agar format dan TP yang sudah ada ikut terisi.</div><label style="font-size:10.5px;font-weight:800;color:#657c80">Template semester <select class="cqup-sel" data-act="sem"><option value="1">Semester 1</option><option value="2">Semester 2</option></select></label></div><div class="cqup-grid">${slot('id')}${slot('en')}</div><div class="cqup-res" data-act="res"></div></div>`;
    const root=el.querySelector('.cqup-x'),res=root.querySelector('[data-act=res]'),semSel=root.querySelector('[data-act=sem]');
    semSel.value=String(st.sem);semSel.onchange=()=>{st.sem=+semSel.value;T.sem=st.sem};
    root.querySelectorAll('.cqup-slot').forEach(box=>{
      const lang=box.dataset.lang,q=a=>box.querySelector(`[data-act=${a}]`),msg=(t,k)=>{const m=q('msg');m.textContent=t||'';m.className='cqup-msg'+(k?' '+k:'')};
      const reset=()=>{st.parsed[lang]=null;st.ok[lang]=false;q('apply').disabled=true};
      q('tpl').onclick=async()=>{try{q('tpl').disabled=true;msg('Menyiapkan template...');await downloadTemplate(lang,st.sem);msg('Template terunduh. Isi lalu upload kembali di sini.','ok')}catch(e){msg(e.message,'err')}finally{q('tpl').disabled=false}};
      q('file').onchange=()=>{reset();q('preview').disabled=!q('file').files[0];msg(q('file').files[0]?'Klik Preview untuk memeriksa isi file.':'')};
      q('preview').onclick=async()=>{
        const f=q('file').files[0];if(!f)return;reset();
        try{q('preview').disabled=true;msg('Membaca file...');const items=await parseTpFile(f,lang);msg(`Memeriksa ${items.length} baris...`);
          const j=await call('academic-master-tp',{action:'upload_preview',lang,items});st.parsed[lang]=items;drawResult(res,lang,j);
          const changes=(j.insert_count||0)+(j.update_count||0);st.ok[lang]=!j.error_count&&changes>0;q('apply').disabled=!st.ok[lang];
          msg(j.error_count?`${j.error_count} baris perlu diperbaiki di Excel, lalu upload ulang.`:changes?`Siap disimpan: ${changes} perubahan.`:'Tidak ada perubahan dibanding data CQlass.',j.error_count?'err':'ok');
        }catch(e){msg(e.message,'err');res.innerHTML=''}finally{q('preview').disabled=!q('file').files[0]}};
      q('apply').onclick=async()=>{
        const items=st.parsed[lang];if(!items||!st.ok[lang])return;
        if(!confirm(lang==='en'?'Simpan terjemahan English ke CQlass?':'Simpan TP Indonesia ke CQlass? TP baru ditambahkan dan teks TP yang berbeda diperbarui. Tidak ada TP yang dihapus.'))return;
        try{q('apply').disabled=true;msg('Menyimpan...');const j=await call('academic-master-tp',{action:'upload_apply',lang,items});
          msg(lang==='en'?`Berhasil: ${j.updated} terjemahan tersimpan.`:`Berhasil: ${j.inserted} TP baru, ${j.updated} TP diperbarui.`,'ok');reset();q('file').value='';q('preview').disabled=true;res.innerHTML='';
          try{opts.onDone&&opts.onDone(lang,j)}catch(_){}
        }catch(e){const errs=e.payload?.errors;msg(e.message+(errs?.length?'\n'+errs.slice(0,8).map(x=>'• '+x).join('\n'):''),'err');q('apply').disabled=false}};
    });
  };

  /* ---------------- Jadwal pelajaran upload ---------------- */
  const SCHED_ERR=e=>{const m=String(e||'');
    if(m.startsWith('schedule_mapping_incomplete:'))return 'Ada pelajaran di file yang belum punya guru di Penugasan Guru, atau nama kelas/mapel tidak dikenali: '+m.split(':').slice(1).join(':')+'. Lengkapi Penugasan dulu lalu upload ulang. Jadwal lama tidak diubah.';
    if(m==='schedule_parse_failed')return 'Format jadwal tidak terbaca (terlalu sedikit sesi). Gunakan format file jadwal sekolah: blok per kelas dengan baris hari Senin–Jumat. Jadwal lama tidak diubah.';
    if(m==='schedule_class_coverage_incomplete')return 'File harus berisi jadwal untuk minimal 10 kelas. Jadwal lama tidak diubah.';
    if(m==='admin_only')return 'Akun ini belum punya akses upload jadwal.';
    if(m==='file_too_large')return 'File terlalu besar.';
    return m||'Upload gagal.'};
  window.cqScheduleUploadPanel=async function(el,opts){
    if(!el)return;css();opts=opts||{};
    el.innerHTML=`<div class="cqup"><div class="cqup-top"><div><div class="cqup-title">Upload Jadwal Pelajaran</div><div class="cqup-sub" data-act="info">Memuat status jadwal...</div></div></div><div class="cqup-warn">Upload akan <b>mengganti seluruh jadwal aktif</b> semester ini dengan isi file. Pastikan Penugasan Guru (guru–mapel–kelas) sudah lengkap. Jika ada yang tidak cocok, upload dibatalkan dan jadwal lama tetap dipakai.</div><div class="cqup-row"><input type="file" accept=".xlsx,.xls" data-act="file"><button class="cqup-btn" data-act="go" disabled>Upload &amp; Terapkan</button></div><div class="cqup-msg" data-act="msg"></div></div>`;
    const q=a=>el.querySelector(`[data-act=${a}]`),msg=(t,k)=>{const m=q('msg');m.textContent=t||'';m.className='cqup-msg'+(k?' '+k:'')};
    let info=null;
    async function refresh(){try{info=await call('master-data-admin',{action:'jadwal_status'});const last=(info.files||[])[0];
      q('info').innerHTML=`Tahun ${esc(info.academic_year||'')} · Semester ${esc(info.semester_no)} · ${info.active_entries} sesi jadwal aktif.`+(last?` File terakhir: <b>${esc(last.file_name)}</b> (${new Date(last.created_at).toLocaleDateString('id-ID')}, ${last.import_status==='imported'?esc(last.imported_rows)+' sesi':last.import_status==='failed'?'gagal':esc(last.import_status)})`:' Belum ada file jadwal yang diupload.');
    }catch(e){q('info').textContent=SCHED_ERR(e.message)}}
    q('file').onchange=()=>{q('go').disabled=!q('file').files[0];msg('')};
    q('go').onclick=async()=>{
      const f=q('file').files[0];if(!f)return;
      if(f.size>12*1024*1024){msg('File maksimal 12 MB.','err');return}
      if(!confirm(`Ganti seluruh jadwal aktif Semester ${info?.semester_no||''} dengan isi file "${f.name}"?`))return;
      try{q('go').disabled=true;msg('Membaca dan menerapkan jadwal...');
        const b64=await new Promise((ok,no)=>{const r=new FileReader();r.onerror=no;r.onload=()=>ok(String(r.result||'').split(',').pop());r.readAsDataURL(f)});
        const d=await call('master-data-admin',{action:'upload_file',master_type:'jadwal_pelajaran',file_name:f.name,mime_type:f.type||'',file_base64:b64});
        msg(`Berhasil: ${d.imported_rows} sesi jadwal diterapkan.`,'ok');q('file').value='';await refresh();try{opts.onDone&&opts.onDone(d)}catch(_){}
      }catch(e){msg(SCHED_ERR(e.message),'err');await refresh()}finally{q('go').disabled=!q('file').files[0]}};
    await refresh();
  };
})();
