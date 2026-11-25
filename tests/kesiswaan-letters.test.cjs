const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
const A='11111111-1111-4111-8111-111111111111',B='22222222-2222-4222-8222-222222222222',C='33333333-3333-4333-8333-333333333333';
function setup(){
 const dom=new JSDOM('<div id="content"></div>',{url:'https://example.invalid/',runScripts:'outside-only'}),w=dom.window,req=[],pages=[];
 w.getAuthToken=()=>'tok';w.SUPABASE_URL='https://x.supabase.co';w.SUPABASE_PUBLISHABLE_KEY='pk';w.showToast=()=>{};
 w.cqKesIcon=()=>'<svg></svg>';
 let seq=7;
 w.fetch=async(url,o)=>{const b=JSON.parse(o.body);req.push({url,b,h:o.headers});let d={success:true};
  if(url.endsWith('/student-profiles')){
   if(b.action==='cover_bootstrap')d={success:true,academic_year:'2026/2027',signers:{current_id:'k1',list:[{id:'k1',name:'Kepala Uji',position:'Kepala Sekolah',signature_url:'https://x/ttd.png'}]}};
   else d={success:true,students:[{student_id:A,nama:'Siswa Satu',nis:'262701',nisn:'0123',ttl:'Depok, 1 Januari 2018',alamat:'Jl. Uji',kota:'Depok',has_profile:true},{student_id:B,nama:'Siswa Dua',nis:'262702',nisn:'-',ttl:'-',alamat:'-',kota:'-',has_profile:false}]};
  }else if(url.endsWith('/kesiswaan_roster'))d={success:true,students:[{id:A,name:'Siswa Satu',nis:'262701',class_id:'c5',class_name:'5B Banat'},{id:B,name:'Siswa Dua',nis:'262702',class_id:'c5',class_name:'5B Banat'},{id:C,name:'Siswa Tiga',nis:'252601',class_id:'c4',class_name:'4A'}]};
  else if(url.endsWith('/kesiswaan_letter_next'))d={success:true,next:seq,label:'x'};
  else if(url.endsWith('/kesiswaan_letter_list'))d={success:true,letters:[]};
  else if(url.endsWith('/kesiswaan_letter_issue'))d={success:true,letters:b.p_items.map((it,i)=>({id:'L'+i,kind:b.p_kind,issued_on:b.p_date,student_id:it.student_id,payload:it.payload,number_label:String((b.p_start||seq)+i).padStart(3,'0')+'/SK/SDCQ/XI/2026'}))};
  return{ok:true,json:async()=>JSON.parse(JSON.stringify(d))}};
 w.open=()=>{const p=new JSDOM('').window;pages.push(p);return p};
 w.eval(fs.readFileSync('kesiswaan-letters.js','utf8'));
 return{dom,w,req,pages};
}
const tick=async(n=4)=>{for(let i=0;i<n;i++)await new Promise(r=>setTimeout(r,0))};
const type=(w,el,v)=>{el.value=v;el.dispatchEvent(new w.Event('input'))};

test('Buat Surat: tambah satu kelas, pratinjau berisi biodata, terbit memakai nomor mulai & cetak', async()=>{
 const{w,req,pages,dom}=setup();const c=w.document.getElementById('content');
 await w.renderKesiswaanLetters(c);
 assert.equal(c.querySelectorAll('[data-kl-kind]').length,4);
 assert.equal(c.querySelector('#kl-start').value,'7');
 type(w,c.querySelector('#kl-q'),'5b banat');
 c.querySelector('[data-kl-class]').click();await tick();
 assert.equal(c.querySelectorAll('[data-kl-rm]').length,2);
 assert.ok(c.querySelector('.kl-chip.warn'),'siswa tanpa biodata ditandai');
 const prev=c.querySelector('.kl-paper').textContent;
 assert.match(prev,/Siswa Satu/);assert.match(prev,/Depok, 1 Januari 2018/);assert.match(prev,/2026\/2027/);assert.match(prev,/Kepala Uji/);
 type(w,c.querySelector('#kl-start'),'50');
 c.querySelector('#kl-issue').click();await tick(8);
 const iss=req.find(r=>r.url.endsWith('/kesiswaan_letter_issue'));
 assert.equal(iss.b.p_token,'tok');assert.equal(iss.b.p_kind,'aktif');assert.equal(iss.b.p_start,50);assert.equal(iss.b.p_items.length,2);
 assert.equal(iss.b.p_items[0].payload.signature_url,'https://x/ttd.png');assert.equal(iss.b.p_items[1].payload.nisn,'');
 assert.ok(req.some(r=>r.url.endsWith('/kesiswaan_letter_printed')&&r.b.p_ids.length===2));
 const html=pages[0].document.body.innerHTML;
 assert.equal(pages[0].document.querySelectorAll('.letter').length,2);assert.match(html,/050\/SK\/SDCQ\/XI\/2026/);assert.match(html,/051\/SK\/SDCQ\/XI\/2026/);
 assert.equal(c.querySelectorAll('[data-kl-rm]').length,0,'daftar siswa dikosongkan setelah terbit');
 dom.window.close();
});

test('Dispensasi wajib tanggal & keperluan; teks hari/tanggal dan keperluan masuk ke surat', async()=>{
 const{w,req,pages,dom}=setup();const c=w.document.getElementById('content');
 await w.renderKesiswaanLetters(c);
 c.querySelector('[data-kl-kind="dispensasi"]').click();await tick();
 type(w,c.querySelector('#kl-q'),'Tiga');c.querySelector('[data-kl-add]').click();await tick();
 c.querySelector('#kl-issue').click();await tick();
 assert.match(c.querySelector('.kl-err').textContent,/tanggal dispensasi/);
 assert.ok(!req.some(r=>r.url.endsWith('/kesiswaan_letter_issue')));
 type(w,c.querySelector('#kl-from'),'2026-11-27');type(w,c.querySelector('#kl-to'),'2026-11-28');type(w,c.querySelector('#kl-purpose'),'Lomba Panahan');
 c.querySelector('#kl-issue').click();await tick(8);
 const txt=pages[0].document.body.textContent;
 assert.match(txt,/Jumat, 27 November 2026 s\.d\. Sabtu, 28 November 2026/);assert.match(txt,/Lomba Panahan/);assert.match(txt,/SURAT DISPENSASI|Surat Dispensasi/);
 dom.window.close();
});

test('Isi surat teguran & SKKB mengikuti template sekolah', ()=>{
 const{w,dom}=setup();const p={nama:'X',kelas:'3C',nis:'1',nisn:'2',ttl:'-',tahun_pelajaran:'2026/2027',signer:{name:'K'},issued_on:'2026-11-25',number_label:'001'};
 const t=w.__cqKesLetterBody('teguran_ekskul',p);assert.match(t,/minimal 1 \(satu\) kegiatan ekstrakurikuler/);assert.match(t,/2 \(dua\) minggu/);
 const s=w.__cqKesLetterBody('skkb',p);assert.match(s,/jenjang kelas 3 \(Tiga\)/);assert.match(s,/NPSN: 70004670/);
 dom.window.close();
});
