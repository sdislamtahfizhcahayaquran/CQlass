/* CQlass — Legger Nilai (Excel), format sama dengan legger sekolah:
   per kelas satu sheet "LEGGER NILAI KELAS <kelas>", per mapel: Tugas 1..n (sebanyak TP, minimal 1, maksimal 10; Tugas yang terisi tetap ikut), Rata Tugas, TP1..n, Rata KD, WWP, Asas, Nilai Murni, Nilai Rapor, Predikat.
   Dipakai walas (semua mapel kelasnya) dan guru mapel (mapel yang diampu, semua kelas yang diajar). Rumus dari cq-scoring.js. */
(function(){
'use strict';
const S=()=>window.CQ_SCORE;
const v2=v=>{const n=S().num(v);return n===null?'':Math.round(n*100)/100};
const mean=a=>{const v=a.map(x=>S().num(x)).filter(x=>x!==null);return v.length?Math.round(v.reduce((s,x)=>s+x,0)/v.length*100)/100:''};
const COMP=(n,t=5)=>[...Array.from({length:t},(_,i)=>'Tugas '+(i+1)),'Rata Tugas',...Array.from({length:n},(_,i)=>'TP'+(i+1)),'Rata KD','WWP','Asas','Nilai Murni','Nilai Rapor','Predikat'];
/* cls: nama kelas; subjects: [{name, tpCount}]; students: [{nis,name,scores:[{tasks:[..],tp:[n],wwp,asas}|null per mapel]}] */
function sheetModel(cls,subjects,students){
 const tc=subjects.map((s,j)=>S().taskCount?S().taskCount(s.tpCount,S().highestTask(students.map(st=>((st.scores||[])[j]||{}).tasks))):5);
 const groups=[];let col=3;for(const [j,s] of subjects.entries()){const w=COMP(s.tpCount,tc[j]).length;groups.push({name:String(s.name||'').toUpperCase(),from:col+1,width:w,naCol:col+w-2,raporCol:col+w-1});col+=w}
 const comp=['','',''];subjects.forEach((s,j)=>comp.push(...COMP(s.tpCount,tc[j])));
 const rows=students.map((st,i)=>{const r=[i+1,st.name||'',st.nis||''];subjects.forEach((s,j)=>{const a=(st.scores||[])[j]||{};const t=Array.from({length:tc[j]},(_,k)=>v2((a.tasks||[])[k])),p=Array.from({length:s.tpCount},(_,k)=>v2((a.tp||[])[k]));
  const raw=S().raw(a.tasks||[],a.tp||[],a.wwp,a.asas),rap=S().rapor(raw);r.push(...t,mean(t),...p,mean(p),v2(a.wwp),v2(a.asas),raw===null?'':raw,rap===null?'':rap,rap===null?'':S().letter(rap))});return r});
 return{title:`LEGGER NILAI KELAS ${cls}`,note:`Nilai Murni = (Rata-rata Tugas yang terisi x 10%) + (Rata-rata TP x 30%) + (WWP x 20%) + (Asas x 40%)   |   Nilai Rapor = dibulatkan, akhiran 4/9 naik 1, minimal 77, maksimal 96   |   Predikat: A 89-96, B 82-88, C 75-81, D < 75`,
  sheetName:String(cls||'Kelas').replace(/[\\/?*[\]:]/g,' ').slice(0,31),groups,comp,rows,width:col};
}
async function excel(){if(window.ExcelJS)return window.ExcelJS;await new Promise((ok,bad)=>{const x=document.createElement('script');x.src='https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js';x.onload=ok;x.onerror=()=>bad(Error('Pustaka Excel gagal dimuat.'));document.head.appendChild(x)});return window.ExcelJS}
function addLeggerSheet(wb,m,used){
 let name=m.sheetName||'Kelas',base=name,i=2;while(used.has(name))name=(base.slice(0,27)+' '+i++).slice(0,31);used.add(name);
 const ws=wb.addWorksheet(name,{views:[{state:'frozen',xSplit:3,ySplit:5}],pageSetup:{paperSize:9,orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}});
 ws.getCell(1,1).value=m.title;ws.getCell(1,1).font={bold:true,size:14};ws.getCell(2,1).value=m.note;ws.getCell(2,1).font={italic:true,size:9,color:{argb:'FF555555'}};
 const thin={style:'thin',color:{argb:'FFB7C4C0'}},box={top:thin,bottom:thin,left:thin,right:thin},fill=c=>({type:'pattern',pattern:'solid',fgColor:{argb:'FF'+c}});
 const pal=['EAF4F3','F0F0FA','FFF5E9','EEF4FC','F7EEF3','F0F6EA','F6F2EB'];
 ['No','Nama Siswa','NIS'].forEach((h,k)=>{ws.getCell(4,k+1).value=h;ws.mergeCells(4,k+1,5,k+1)});
 m.groups.forEach((g,gi)=>{ws.getCell(4,g.from).value=g.name;ws.mergeCells(4,g.from,4,g.from+g.width-1);for(let c=g.from;c<g.from+g.width;c++){ws.getCell(4,c).fill=fill(pal[gi%pal.length]);ws.getCell(5,c).fill=fill(pal[gi%pal.length])}});
 m.comp.forEach((h,k)=>{if(k>2)ws.getCell(5,k+1).value=h});
 for(let c=1;c<=m.width;c++)for(const r of [4,5]){const x=ws.getCell(r,c);x.font={bold:true,size:9};x.alignment={horizontal:'center',vertical:'middle',wrapText:true};x.border=box;if(c<=3)x.fill=fill('DDEBE7')}
 ws.getRow(5).height=30;
 m.rows.forEach((r,ri)=>{const row=ws.getRow(6+ri);r.forEach((v,k)=>{const x=row.getCell(k+1);x.value=v;x.border=box;x.font={size:9};if(k!==1)x.alignment={horizontal:'center'}});
  // Nilai murni di bawah 75 ditandai merah (nilai rapor sudah minimal 77).
  for(const g of m.groups){const na=row.getCell(g.naCol);if(typeof na.value==='number'&&na.value<75)na.font={size:9,bold:true,color:{argb:'FFB3261E'}};row.getCell(g.raporCol).font={size:9,bold:true}}});
 ws.getColumn(1).width=5;ws.getColumn(2).width=Math.min(42,Math.max(22,...m.rows.map(r=>String(r[1]||'').length+2)));ws.getColumn(3).width=11;for(let c=4;c<=m.width;c++)ws.getColumn(c).width=8.5;
 return ws;
}
/* models: daftar sheetModel; extra(wb): tambahan sheet opsional. */
async function download(filename,models,extra){const ExcelJS=await excel();const wb=new ExcelJS.Workbook(),used=new Set();if(extra)await extra(wb,ExcelJS);for(const m of models)addLeggerSheet(wb,m,used);
 const blob=new Blob([await wb.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},5000);return blob}
window.CQ_LEGGER={sheetModel,download,excel,COMP};
})();
