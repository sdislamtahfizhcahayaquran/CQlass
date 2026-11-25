const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),{JSDOM}=require('jsdom');
// Form wawancara rekaan (bukan data siswa asli) dengan struktur template Kesiswaan.
const p=t=>`<w:p><w:r><w:t xml:space="preserve">${t}</w:t></w:r></w:p>`;
const cell=t=>`<w:tc>${String(t).split('\n').map(p).join('')}</w:tc>`;
const tbl=rows=>`<w:tbl>${rows.map(r=>`<w:tr>${r.map(cell).join('')}</w:tr>`).join('')}</w:tbl>`;
const xml=`<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
${p('FORM WAWANCARA SISWA')}${p('Pembinaan Kedisiplinan')}${p('No. 099/FORM-WWC/KSW/SDITCQ/XI/2026')}
${tbl([['Nama siswa','Budi Contoh (Budi)'],['Kelas','4A Banin'],['Tanggal / waktu wawancara','Senin, 2 November 2026 / pukul 08.00'],['Tempat','Ruang Kesiswaan'],['Pewawancara','Ustadzah Uji']])}
${p('DASAR WAWANCARA')}${tbl([['No','Masalah yang dilaporkan','Sumber laporan'],['1','Sering terlambat','Wali kelas 4A']])}
${p('A. PEMBUKAAN')}${tbl([['No','Pertanyaan','Jawaban siswa / catatan pewawancara'],['1','Bagaimana perasaanmu?\n ☐ Senang ☑ Cemas','Cemas karena ujian.']])}
${p('F. MELENGKAPI KALIMAT')}${tbl([['No','Lengkapi kalimat','Jawaban siswa / catatan pewawancara'],['1','Kalau aku kesal ...','Diam.']])}
${p('I. ANALISIS')}${tbl([['Aspek','Temuan utama','Tingkat','Dugaan pemicu'],['Kedisiplinan','Terlambat 3x sepekan','☐ Ringan\n☐ Sedang\n☑ Berat','Bangun kesiangan']])}
${tbl([['Sikap selama wawancara','☑ Kooperatif ☐ Defensif'],['Tanda yang perlu perhatian khusus','☑ Tidak ada ☐ Ada'],['Tindak lanjut','☑ Pembinaan oleh kesiswaan ☐ Rujuk konselor yayasan ☑ Pemantauan berkala'],['Tanggal evaluasi lanjutan','Jumat, 20 November 2026']])}
${p('I.1 Catatan hasil analisis')}${tbl([['Keterangan siswa konsisten.']])}
${p('I.2 Rencana penanganan')}${tbl([['Aspek','Langkah penanganan','Penanggung jawab','Waktu','Indikator'],['Kedisiplinan','Alarm pagi bersama orang tua','Orang tua; walas','2-20 Nov','Tidak terlambat 2 pekan']])}
${p('I.3 Penilaian ulang')}${tbl([['Evaluasi 20 November 2026.']])}
</w:body></w:document>`;
function load(){const w=new JSDOM('',{runScripts:'outside-only'}).window;w.eval(fs.readFileSync('kesiswaan-interview.js','utf8'));return w}

test('form wawancara Word dibaca per bagian dan disusun menjadi laporan',()=>{
  const w=load(),{parsed,record}=JSON.parse(JSON.stringify(w.cqKesInterviewParse(xml)));
  assert.equal(parsed.nomor,'099/FORM-WWC/KSW/SDITCQ/XI/2026');assert.equal(parsed.judul,'Pembinaan Kedisiplinan');
  assert.equal(parsed.reported.length,1);assert.equal(parsed.qa.length,2);
  assert.deepEqual(parsed.qa[0].pilihan,['Cemas']);assert.equal(parsed.qa[0].q,'Bagaimana perasaanmu?');
  assert.equal(parsed.temuan[0].tingkat,'Berat');assert.equal(parsed.rencana[0].pj,'Orang tua; walas');
  assert.deepEqual(parsed.sikap['Tindak lanjut'].pilihan,['Pembinaan oleh kesiswaan','Pemantauan berkala']);
  assert.equal(parsed.analisis,'Keterangan siswa konsisten.');assert.equal(parsed.evaluasi,'Evaluasi 20 November 2026.');
  assert.equal(record.student_name,'Budi Contoh');assert.equal(record.class_name,'4A Banin');
  assert.equal(record.record_date,'2026-11-02');assert.equal(record.priority,'tinggi');assert.equal(record.status,'dalam_penanganan');
  assert.match(record.title,/^Wawancara 099\/FORM-WWC.*Pembinaan Kedisiplinan$/);
  assert.match(record.description,/Kedisiplinan \[Berat\]: Terlambat 3x sepekan/);assert.match(record.description,/Cemas karena ujian/);
  assert.match(record.follow_up,/Alarm pagi bersama orang tua \| PJ: Orang tua; walas/);assert.match(record.follow_up,/TINDAK LANJUT: Pembinaan oleh kesiswaan, Pemantauan berkala/);
});

test('pencocokan siswa: nama persis, nama sama dibedakan kelas, tidak menebak bila ragu',()=>{
  const w=load(),R=[{id:'1',name:'Budi Contoh',class_name:'4A Banin'},{id:'2',name:'Budi Contoh',class_name:'5A Banin'},{id:'3',name:'Siti Uji',class_name:'1A Banat'}];
  assert.equal(w.cqKesInterviewMatch(R,'Budi Contoh','4A Banin').id,'1');
  assert.equal(w.cqKesInterviewMatch(R,'Budi Contoh',''),null);
  assert.equal(w.cqKesInterviewMatch(R,'siti  uji','').id,'3');
  assert.equal(w.cqKesInterviewMatch(R,'Orang Lain','1A Banat'),null);
});
