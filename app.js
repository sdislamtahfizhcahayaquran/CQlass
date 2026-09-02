/* ==========================================================
   CQLASS — RAPOR SAFE PATCH
   TIDAK MENGUBAH STRUKTUR / FORMAT RAPOR.
   Tempelkan BLOK INI PALING BAWAH app.js yang sekarang.
   ========================================================== */
(function(){
  const KKTP_BY_NAME = Object.freeze([
    [['aqidah','akidah','islamic creed'], '78 - 81'],
    [['fiqh','fikih','islamic jurisprudence'], '79 - 82'],
    [['adab','islamic manners'], '79 - 82'],
    [['hadith','hadits'], '82 - 85'],
    [['pancasila'], '79 - 82'],
    [['bahasa indonesia'], '77 - 80'],
    [['mathematics','matematika'], '76 - 79'],
    [['natural sciences','sains','ipa'], '75 - 78'],
    [['social sciences','sosial','ips'], '76 - 79'],
    [['arts, culture','seni budaya','prakarya','sbdp'], '78 - 81'],
    [['physical education','pjok','penjas'], '78 - 81'],
    [['arabic language','bahasa arab'], '77 - 80'],
    [['english','bahasa inggris'], '77 - 80'],
    [['sundanese','bahasa sunda'], '76 - 79'],
    [['seerah','sirah','siroh'], '78 - 81'],
    [['tajweed','tajwid'], '77 - 80']
  ]);

  function kktpUntukNama(nama){
    const n = String(nama || '').toLowerCase();
    for(const [aliases, nilai] of KKTP_BY_NAME){
      if(aliases.some(a => n.includes(a))) return nilai;
    }
    return '';
  }

  // Simpan fungsi render asli agar SELURUH FORMAT lama tetap dipakai.
  const renderRaporPreviewAsli = renderRaporPreview;

  renderRaporPreview = function(){
    const r = raporPreviewState?.report;

    if(r){
      // 1. Nama Kepala Sekolah: tetap prioritaskan backend.
      r.teachers = r.teachers || {};
      if(!String(r.teachers.principal || '').trim()){
        r.teachers.principal = 'Achmad Jumadi, M.Pd.';
      }

      // 2. KKTP: hanya isi bila backend masih kosong / "-".
      if(Array.isArray(r.academic)){
        r.academic.forEach(item => {
          const lama = String(item?.kktp ?? '').trim();
          if(!lama || lama === '-'){
            const nilai = kktpUntukNama(item?.name);
            if(nilai) item.kktp = nilai;
          }
        });
      }
    }

    // Pakai render ASLI. Tidak mengganti tabel, ukuran, margin, layout, atau halaman.
    renderRaporPreviewAsli();

    // 3. Hanya penyesuaian underline tanda tangan.
    if(!document.getElementById('rpv-safe-signature-fix')){
      const style = document.createElement('style');
      style.id = 'rpv-safe-signature-fix';
      style.textContent = `
        /* Walmur dibiarkan seperti format asli — ini menjadi patokan ketebalan. */

        /* Kepsek + Walas: garis 1px, mengikuti panjang nama. */
        .rpv-signatures .name{
          text-decoration:none !important;
          display:block !important;
          width:max-content !important;
          min-width:0 !important;
          max-width:100% !important;
          border-bottom:1px solid #111 !important;
          white-space:nowrap !important;
          text-align:center !important;
          align-self:center !important;

          /* Garis bawah nama dibuat sejajar dengan garis Walmur. */
          margin-top:27mm !important;
          height:4mm !important;
          line-height:4mm !important;
          padding:0 !important;
        }
      `;
      document.head.appendChild(style);
    }
  };
})();

