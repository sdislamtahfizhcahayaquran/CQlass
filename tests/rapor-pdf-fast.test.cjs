// Simpan PDF rapor: kualitas tetap (PNG lossless, skala 3.2), kompresi FAST, dan progres halaman di tombol. Tanpa request ke produksi.
const fs=require('node:fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
for(const f of ['rapor-pdf-preview-sync.js','rapor-attendance-effective-guard.js']){
 const s=fs.readFileSync(f,'utf8');
 assert(!s.includes("'SLOW'"),f+': no SLOW compression');
 assert(s.includes("scale:3.2"),f+': scale stays 3.2 (print quality)');
 assert(s.includes("toDataURL('image/png'),'PNG'"),f+': image stays lossless PNG');
}
const dom=new JSDOM('<button id="rpv-print-btn">Cetak PDF Per Siswa</button><div id="rpv-preview"><section class="rpv-paper">1</section><section class="rpv-paper">2</section><section class="rpv-paper">3</section></div><button class="rpv-print-btn"><svg></svg> Simpan PDF</button>',{runScripts:'outside-only',url:'https://x.invalid/'}),w=dom.window;
const added=[],seen=[];
w.eval(`var rpElementPdfBlob=async()=>null,rpEnsurePdfLibs=async()=>{},rpWaitForImages=async()=>{};`);
w.html2canvas=async(page,opt)=>{seen.push({scale:opt.scale,label:[...w.document.querySelectorAll('.rpv-print-btn')].map(b=>b.textContent).join('|')+'#'+w.document.getElementById('rpv-print-btn').textContent});return{width:10,height:10,toDataURL:t=>'data:'+t}};
w.jspdf={jsPDF:function(){return{addPage(){},addImage:(...a)=>added.push(a),output:()=>'blob'}}};
w.eval(fs.readFileSync('rapor-pdf-preview-sync.js','utf8'));
// app-core hanya untuk helper progres.
const core=fs.readFileSync('app-core.js','utf8'),m=core.match(/function rpPdfProgressStart\([\s\S]*?\n\}\n/);assert(m,'rpPdfProgressStart exists');w.eval(m[0]+';window.__p=rpPdfProgressStart;');
(async()=>{
 const stop=w.__p('Siswa 2/25 · ');
 const out=await w.rpElementPdfBlob(w.document.getElementById('rpv-preview'));stop();
 assert.equal(out,'blob');assert.equal(added.length,3);
 for(const a of added){assert.equal(a[1],'PNG');assert.equal(a[7],'FAST');assert.equal(a[0],'data:image/png')}
 assert(seen.every(x=>x.scale===3.2));
 // Saat halaman 2 dibuat, tombol sudah menunjukkan halaman 1 selesai.
 assert.equal(seen[1].label,'Siswa 2/25 · Halaman 1/3#Siswa 2/25 · Halaman 1/3');
 const b=w.document.querySelector('.rpv-print-btn');assert.equal(b.innerHTML,'<svg></svg> Simpan PDF');assert.equal(b.disabled,false);assert.equal(w.cqPdfProgress,null);
 assert(core.includes('const stop=rpPdfProgressStart();let blob;try{blob=await rpElementPdfBlob(el)}finally{stop()}'),'student PDF shows progress');
 assert(core.includes('rpPdfProgressStart(`Siswa ${i+1}/${reports.length} · `)'),'class PDF shows student + page progress');
 console.log('PASS rapor PDF: lossless PNG at 3.2x with FAST compression, page progress on buttons, buttons restored.');
 dom.window.close();
})().catch(e=>{console.error(e);process.exit(1)});
