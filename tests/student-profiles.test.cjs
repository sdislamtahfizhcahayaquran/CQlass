// Run with NODE_PATH containing jsdom and xlsx@0.18.5. No production requests.
const {JSDOM}=require('jsdom');const XLSX=require('xlsx');const fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
 // Parser: block detection (ayah/ibu/wali), dates from serials, photo hyperlinks, identity-document links skipped.
 let dom=new JSDOM('<div id="content"></div>',{url:'https://example.invalid/',runScripts:'outside-only'}),w=dom.window;w.XLSX=XLSX;
 w.eval(fs.readFileSync('admin-student-profiles.js','utf8'));
 const head=['No.','Kelas','NIS','NISN','Nama siswa','Tempat lahir','Tanggal lahir','Nama Jalan','RT','RW','Kelurahan','Kecamatan','Kota/Kabupaten','Provinsi:','Nama Ayah','Tempat Lahir','Tanggal Lahir','Kewarganegaraan','No. HP','Nama Ibu','Tempat Tanggal Lahir','Tanggal Lahir','No. HP','E-mail wali murid','FOTO/SCAN KTP AYAH','FOTO SISWA RESMI','FOTO SISWA GAYA BEBAS','KOTA LAHIR'];
 const row=[0,'1A Banat',262701006,'3192213355','Abidah Nuha Shabira','JAKARTA',43731,'Jl. Kopwani',4,11,'Kalibaru','Cilodong','Depok','Jawa Barat','Dhodi','Jakarta',32433,'Indonesia','0812','Miftahul','Jakarta',32055,'0813','a@b.c','Lihat Dokumen','foto.jpg','x','JAKARTA'];
 const ws=XLSX.utils.aoa_to_sheet([head,row]);ws['Z2'].l={Target:'https://drive.google.com/file/d/ABCDEFGHIJKLMN/view'};ws['Y2'].l={Target:'https://drive.google.com/open?id=KTP123456789'};
 const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'DATA SISWA');
 const p=w.__cqParseStudentWorkbook(XLSX.read(XLSX.write(wb,{type:'buffer',bookType:'xlsx'}),{type:'buffer'}));
 assert.equal(p.rows.length,1);const r=p.rows[0];
 assert.equal(r.nis,'262701006');assert.equal(r.profile.siswa.tanggal_lahir,'2019-09-23');assert.equal(r.profile.ayah.nama,'Dhodi');assert.equal(r.profile.ayah.tanggal_lahir,'1988-10-17');
 assert.equal(r.profile.ibu.nama,'Miftahul');assert.equal(r.profile.ibu.tempat_tanggal_lahir,'Jakarta');assert.equal(r.profile.lainnya.e_mail_wali_murid,'a@b.c');
 assert.match(r.photo_url,/ABCDEFGHIJKLMN/);assert(!JSON.stringify(r.profile).includes('KTP123456789'),'identity document links are not stored');assert(!('kota_lahir' in r.profile.lainnya),'helper columns after photos are ignored');
 w.close();
 // Cover page: Kesiswaan only page, uses provided data and leaves the photo box empty when disabled.
 dom=new JSDOM('<div id="content"></div>',{url:'https://example.invalid/',runScripts:'outside-only'});w=dom.window;
 w.eval(fs.readFileSync('kesiswaan-cover-rapor.js','utf8'));
 const st={student_id:'s',has_profile:true,photo_url:'https://x.invalid/p.jpg',nama:'A',nisn:'1',jenis_kelamin:'Perempuan',ttl:'Depok, 1 Januari 2019',golongan_darah:'-',suku:'-',agama:'Islam',alamat:'Jl',kota:'Depok',provinsi:'Jawa Barat',ayah:{nama:'B',ttl:'-',agama:'Islam',warga_negara:'Indonesia'},ibu:{nama:'C',ttl:'-',agama:'Islam',warga_negara:'Indonesia'}};
 const o={place:'Depok',hijri:'1 Muharram 1448',masehi:'1 Juli 2026',principal:'Kepsek',sig:'',photo:false,header:'h.png',footer:'f.png'};
 let html=w.__cqCoverPageHtml(st,o);assert(html.includes('BIODATA SISWA')&&html.includes('Depok, 1 Muharram 1448 H')&&html.includes('(Kepsek)'));assert(!html.includes('p.jpg'),'photo off leaves empty box');
 html=w.__cqCoverPageHtml(st,{...o,photo:true});assert(html.includes('p.jpg'));
 assert.equal(w.__cqHijri('2026-11-17').split(' ').pop(),'1448');
 w.close();console.log('PASS: biodata parser (blocks, dates, photo links, no ID documents) and cover page markup.');
})().catch(e=>{console.error(e);process.exitCode=1});
