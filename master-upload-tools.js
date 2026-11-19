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

  window.cqTpUploadPanel=function(el,opts){
    if(!el)return;css();opts=opts||{};
    const st={sem:+(opts.semester||1),parsed:{id:null,en:null},ok:{id:false,en:false},busy:false};
    const slot=lang=>`<div class="cqup-slot ${lang}" data-lang="${lang}"><h4><span class="cqup-flag">${LANG[lang].flag}</span>${LANG[lang].label}</h4><div class="cqup-note">${LANG[lang].note}</div><div class="cqup-row"><button class="cqup-btn alt" data-act="tpl">Download Template</button><input type="file" accept=".xlsx,.xls" data-act="file"></div><div class="cqup-row" style="margin-top:7px"><button class="cqup-btn alt" data-act="preview" disabled>Preview</button><button class="cqup-btn" data-act="apply" disabled>Simpan ke CQlass</button></div><div class="cqup-msg" data-act="msg"></div></div>`;
    el.innerHTML=`<div class="cqup"><div class="cqup-top"><div><div class="cqup-title">Upload TP dari Excel</div><div class="cqup-sub">Dua tempat upload: versi Indonesia dan versi English. Satu sheet = satu mapel, kolom Kelas · Semester · Urutan TP. Download template dulu agar format dan TP yang sudah ada ikut terisi.</div></div><label style="font-size:10.5px;font-weight:800;color:#657c80">Template semester <select class="cqup-sel" data-act="sem"><option value="1">Semester 1</option><option value="2">Semester 2</option></select></label></div><div class="cqup-grid">${slot('id')}${slot('en')}</div><div class="cqup-res" data-act="res"></div></div>`;
    const root=el.querySelector('.cqup'),res=root.querySelector('[data-act=res]'),semSel=root.querySelector('[data-act=sem]');
    semSel.value=String(st.sem);semSel.onchange=()=>{st.sem=+semSel.value};
    if(!opts.semester)call('academic-master-tp',{action:'bootstrap'}).then(b=>{st.sem=+b.active_semester||1;semSel.value=String(st.sem)}).catch(()=>{});
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
