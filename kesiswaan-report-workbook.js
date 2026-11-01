/* CQlass: shared, read-only report tables and styled XLSX export. */
(function(root){
'use strict';
const text=v=>String(v??'');
const day=v=>text(v).slice(0,10);
const compare=(a,b)=>text(a).localeCompare(text(b),'id',{numeric:true});
function attendanceStatus(v){
  const s=text(v).trim().toLowerCase();
  if(/^(hadir|present)$/.test(s))return 'Hadir';
  if(/^(sakit|sick)$/.test(s))return 'Sakit';
  if(/^(alpha|alpa|alfa|unexcused|tanpa keterangan)$/.test(s))return 'Alpa';
  if(/^(izin|excused)$/.test(s))return 'Izin';
  return 'Lainnya';
}
function dates(from,to){
  const out=[];
  for(let d=new Date(from+'T12:00:00Z');d<=new Date(to+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+1))out.push(d.toISOString().slice(0,10));
  return out;
}
function tables(data,filter){
  const {from,to,classId=''}=filter;
  const scoped=rows=>(rows||[]).filter(x=>(!classId||text(x.class_id)===classId)&&day(x.date)>=from&&day(x.date)<=to);
  const att=scoped(data.attendance),violations=scoped(data.violations),rewards=scoped(data.rewards);
  const roster=(data.roster||[]).filter(x=>!classId||text(x.class_id)===classId);
  const classes=new Map((data.classes||[]).filter(x=>!classId||text(x.id)===classId).map(x=>[text(x.id),x.name]));
  [...att,...violations,...rewards,...roster].forEach(x=>{if(x.class_id&&!classes.has(text(x.class_id)))classes.set(text(x.class_id),x.class_name||'Kelas arsip')});
  const students=new Map();
  const studentKey=x=>text(x.class_id)+'|'+text(x.student_id);
  const addStudent=x=>{const key=studentKey(x);if(!students.has(key))students.set(key,{...x,Hadir:0,Sakit:0,Izin:0,Alpa:0,Lainnya:0,total:0});return students.get(key)};
  roster.forEach(addStudent);
  att.forEach(x=>{const s=addStudent(x);s[attendanceStatus(x.status)]++;s.total++});
  const studentRows=[...students.values()].sort((a,b)=>compare(a.class_name,b.class_name)||compare(a.student_name,b.student_name));
  const daily=new Map();
  const key=x=>text(x.class_id)+'|'+day(x.date);
  const entry=x=>{const k=key(x);if(!daily.has(k))daily.set(k,{attendance:false,discipline:false,reward:false,v:0,r:0});return daily.get(k)};
  scoped(data.attendance_days).forEach(x=>entry(x).attendance=true);
  att.forEach(x=>entry(x).attendance=true);
  scoped(data.point_confirmations).forEach(x=>{if(x.kind==='discipline'||x.kind==='reward')entry(x)[x.kind]=true});
  violations.forEach(x=>entry(x).v++);rewards.forEach(x=>entry(x).r++);
  const classList=[...classes].sort((a,b)=>compare(a[1],b[1]));
  const monitoring=[];
  for(const date of dates(from,to))for(const [id,name]of classList){
    const x=daily.get(id+'|'+date)||{};
    const discipline=x.v?`${x.v} kejadian`:x.discipline?'Nihil':'Belum dilaporkan';
    const reward=x.r?`${x.r} catatan`:x.reward?'Nihil':'Belum dilaporkan';
    monitoring.push([date,name,x.attendance?'Sudah dilaporkan':'Belum dilaporkan',discipline,reward,x.attendance&&(x.v||x.discipline)&&(x.r||x.reward)?'Lengkap':'Belum lengkap']);
  }
  const pointRows=(rows,title)=>rows.slice().sort((a,b)=>compare(a.date,b.date)||compare(a.class_name,b.class_name)||compare(a.student_name,b.student_name)).map(x=>[day(x.date),x.class_name,x.student_name,x[title]||'—',x.category||'—',Number(x.points)||0,x.note||'—']);
  const summary=classList.map(([id,name])=>{
    const a=att.filter(x=>text(x.class_id)===id),counts={Hadir:0,Sakit:0,Izin:0,Alpa:0,Lainnya:0};
    a.forEach(x=>counts[attendanceStatus(x.status)]++);
    const daysReported=new Set(scoped(data.attendance_days).filter(x=>text(x.class_id)===id).map(x=>day(x.date)));
    a.forEach(x=>daysReported.add(day(x.date)));
    return [name,roster.filter(x=>text(x.class_id)===id).length,daysReported.size,a.length,counts.Hadir,counts.Sakit,counts.Izin,counts.Alpa,counts.Lainnya,a.length?counts.Hadir/a.length:null,violations.filter(x=>text(x.class_id)===id).length,rewards.filter(x=>text(x.class_id)===id).length];
  });
  const notes=[...scoped(data.cases).map(x=>({...x,source:'Wali kelas',title:x.main_problem||x.category,description:x.summary,follow_up:x.student_affairs_follow_up||x.final_suggestion,status:x.student_affairs_status||x.status})),...scoped(data.affairs).filter(x=>['pembinaan','kasus','catatan_siswa','kedisiplinan','masalah_kelas'].includes(x.record_type)).map(x=>({...x,source:'Kesiswaan'}))].sort((a,b)=>compare(a.date,b.date)).map(x=>[day(x.date),x.class_name,x.student_name||'—',x.source,x.title||'—',x.description||'—',x.follow_up||'Belum dicatat',x.status||'Belum ada status']);
  return [
    {id:'ringkasan',name:'Ringkasan',headers:['Kelas','Siswa aktif','Hari absensi tercatat','Catatan absensi','Hadir','Sakit','Izin','Alpa','Lainnya','Kehadiran','Pelanggaran','Reward'],rows:summary,percent:[9],note:'Kehadiran = hadir ÷ catatan absensi yang tersedia. Data kosong bukan nol kehadiran. Siswa aktif mengikuti penempatan saat ini; rincian mengikuti tanggal kejadian.'},
    {id:'absensi',name:'Absensi',headers:['Kelas','Nama siswa','NIS','Hadir','Sakit','Izin','Alpa','Lainnya','Total tercatat','Kehadiran'],rows:studentRows.map(x=>[x.class_name,x.student_name,text(x.nis),x.Hadir,x.Sakit,x.Izin,x.Alpa,x.Lainnya,x.total,x.total?x.Hadir/x.total:null]),percent:[9],note:'Rekap per siswa. Persentase dihitung hanya dari absensi yang tercatat; tidak menganggap hari tanpa laporan sebagai hadir atau alpa.'},
    {id:'detail-absensi',name:'Detail Absensi',headers:['Tanggal','Kelas','Nama siswa','Status','Catatan'],rows:att.slice().sort((a,b)=>compare(a.date,b.date)||compare(a.class_name,b.class_name)||compare(a.student_name,b.student_name)).map(x=>[day(x.date),x.class_name,x.student_name,attendanceStatus(x.status),x.note||'—']),note:'Rincian absensi harian. Catatan live dan arsip dideduplikasi per siswa, kelas, dan tanggal.'},
    {id:'kedisiplinan',name:'Kedisiplinan',headers:['Tanggal','Kelas','Nama siswa','Pelanggaran','Kategori','Poin','Catatan'],rows:pointRows(violations,'violation_name'),note:'Hanya kejadian yang tercatat. Konfirmasi nihil dan hari belum dilaporkan ada pada sheet Pemantauan.'},
    {id:'reward',name:'Reward',headers:['Tanggal','Kelas','Nama siswa','Penghargaan','Kategori','Poin','Catatan'],rows:pointRows(rewards,'reward_name'),note:'Reward terverifikasi. Konfirmasi nihil dan hari belum dilaporkan ada pada sheet Pemantauan.'},
    {id:'pemantauan',name:'Pemantauan',headers:['Tanggal','Kelas','Absensi','Kedisiplinan','Reward','Kelengkapan'],rows:monitoring,note:'Nihil = ada konfirmasi pemeriksaan tanpa kejadian. Belum dilaporkan = tidak ada catatan/konfirmasi. Semua tanggal kalender ditampilkan, termasuk hari libur; bukan penilaian kewajiban guru.'},
    {id:'catatan-siswa',name:'Catatan Siswa',headers:['Tanggal','Kelas','Nama siswa','Sumber','Masalah','Catatan','Tindak lanjut','Status'],rows:notes,note:'Catatan pemantauan dan pembinaan siswa/kelas yang tersedia pada periode terpilih.'}
  ];
}
async function workbook(ExcelJS,data,filter){
  const wb=new ExcelJS.Workbook();wb.creator='CQlass — SD Islam Tahfizh Cahaya Qur’an';wb.created=new Date();
  for(const spec of tables(data,filter)){
    const ws=wb.addWorksheet(spec.name,{views:[{state:'frozen',ySplit:6,xSplit:spec.id==='ringkasan'?1:2}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:6'}});
    const n=spec.headers.length;
    const widths=spec.headers.map(h=>/Nama|Masalah|Penghargaan|Pelanggaran/.test(h)?30:/Catatan|Tindak/.test(h)?48:/Kelas/.test(h)?19:/Tanggal/.test(h)?16:Math.min(26,Math.max(14,h.length+3)));
    ws.columns=widths.map(width=>({width}));
    const scope=filter.classId?(data.classes||[]).find(x=>text(x.id)===filter.classId)?.name||filter.classId:'Semua kelas';
    ["SD ISLAM TAHFIZH CAHAYA QUR'AN",'LAPORAN KESISWAAN · '+spec.name.toUpperCase(),`${filter.from} s.d. ${filter.to}  |  ${scope}`,spec.note].forEach((v,i)=>{ws.mergeCells(i+1,1,i+1,n);ws.getCell(i+1,1).value=v});
    ws.getRow(1).height=23;ws.getRow(2).height=29;ws.getRow(3).height=24;ws.getRow(4).height=42;
    ws.getRow(6).values=spec.headers;ws.getRow(6).height=34;
    spec.rows.forEach(values=>ws.addRow(values.map(v=>v==null?'—':v)));
    if(!spec.rows.length){ws.mergeCells(7,1,7,n);ws.getCell(7,1).value='Tidak ada catatan pada periode dan kelas terpilih.';ws.getRow(7).height=28}
    ws.eachRow((row,i)=>{
      if(i>=7){const longest=Math.max(...row.values.slice(1).map((v,j)=>Math.ceil(text(v).length/(widths[j]||25))));row.height=Math.max(25,longest*15+10)}
      row.eachCell({includeEmpty:true},(cell,j)=>{
        cell.font={name:'Tahoma',size:i===2?15:i<=3?11:10,color:{argb:'FF374151'},bold:i<=3||i===6};
        cell.alignment={vertical:'middle',wrapText:true};
        if(i===2||i===6){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:i===2?'FF374151':'FFE5E7EB'}};if(i===2)cell.font.color={argb:'FFFFFFFF'}}
        if(i>=7){cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:i%2?'FFFFFFFF':'FFF7F8FA'}};cell.border={bottom:{style:'hair',color:{argb:'FFE5E7EB'}}};if(typeof cell.value==='number'){cell.numFmt=(spec.percent||[]).includes(j-1)?'0.0%':'0';cell.alignment.horizontal='right'}
          if(['Nihil','Lengkap','Sudah dilaporkan'].includes(cell.value))cell.font.color={argb:'FF166534'};
          if(text(cell.value).startsWith('Belum'))cell.font.color={argb:'FF9A6700'};
        }
      });
    });
    ws.autoFilter={from:{row:6,column:1},to:{row:Math.max(6,6+spec.rows.length),column:n}};
    ws.headerFooter={oddFooter:'CQlass | &A     Halaman &P / &N'};
  }
  return wb;
}
const api={tables,workbook,attendanceStatus};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.CQKesiswaanReport=api;
})(typeof window!=='undefined'?window:globalThis);
