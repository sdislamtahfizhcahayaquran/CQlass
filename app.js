/* ==========================================================
   CQLASS RAPOR — PATCH KKTP + KEPALA SEKOLAH + GARIS TTD
   Tempelkan blok ini PALING BAWAH app.js.
   Hanya mengubah:
   1) KKTP rapor
   2) fallback nama Kepala Sekolah
   3) panjang/posisi garis tanda tangan Parent/Principal/Homeroom
   ========================================================== */
(function(){
  const RP_KKTP_FINAL = Object.freeze({
    'a. Aqidah (Islamic Creed)': '78 - 81',
    'b. Fiqh (Islamic Jurisprudence)': '79 - 82',
    'c. Adab (Islamic Manners)': '79 - 82',
    'd. Hadith': '82 - 85',
    'Pancasila Education': '79 - 82',
    'Bahasa Indonesia': '77 - 80',
    'Mathematics': '76 - 79',
    'Natural Sciences': '75 - 78',
    'Social Sciences': '76 - 79',
    'Arts, Culture, and Crafts Education': '78 - 81',
    'Physical Education, Sports, and Health': '78 - 81',
    'a. Arabic Language': '77 - 80',
    'b. English': '77 - 80',
    'c. Sundanese Language': '76 - 79',
    'd. Seerah (Prophetic Biography)': '78 - 81',
    "e. Tajweed (Qur'anic Recitation)": '77 - 80'
  });

  // Gunakan KKTP dari backend bila tersedia.
  // Jika backend belum mengirim KKTP, gunakan nilai MASTER_KKTP yang sudah disepakati.
  rpAcademicRows = function(rows){
    const list = Array.isArray(rows) ? rows : [];
    let groupNo = 0, subIndex = 0;

    return RP_SUBJECT_TEMPLATE.map(slot => {
      if(slot.group){
        groupNo = slot.group === 'Islamic Studies' ? 1 : 9;
        subIndex = 0;
        return `<tr class="rpv-group-row"><td class="rpv-center">${groupNo}</td><td colspan="8">${escapeHtml(slot.group)}</td></tr>`;
      }

      const isSub = !slot.no;
      const no = slot.no || '';
      const r = rpFindAcademic(list, slot.aliases) || {};
      const sg4 = Boolean(r.starting_grade_4) || Boolean(slot.forceSg4);
      const cls = sg4 ? ' class="rpv-center rpv-start4"' : ' class="rpv-center"';

      const kktpBackend = String(r.kktp ?? '').trim();
      const kktpMaster = RP_KKTP_FINAL[slot.label] || '-';
      const kktp = sg4 ? '' : escapeHtml(kktpBackend || kktpMaster);

      const los = [0,1,2,3,4]
        .map(x => `<td${cls}>${sg4 ? '' : rpScore(r.lo?.[x])}</td>`)
        .join('');

      const remarks = sg4 ? 'Starting Grade 4' : escapeHtml(r.remarks || '-');

      return `<tr>
        <td class="rpv-center">${no}</td>
        <td${isSub ? ' class="rpv-sub"' : ''}>${escapeHtml(slot.label)}</td>
        <td${cls}>${kktp}</td>
        ${los}
        <td${cls}>${remarks}</td>
      </tr>`;
    }).join('');
  };

  const _renderRaporPreviewBeforeKktpFix = renderRaporPreview;

  renderRaporPreview = function(){
    const r = raporPreviewState && raporPreviewState.report
      ? raporPreviewState.report
      : null;

    if(r){
      r.teachers = r.teachers || {};

      // Tetap prioritaskan nama dari backend/Master Guru.
      // Fallback dipakai agar nama Kepala Sekolah tidak kosong pada rapor.
      if(!String(r.teachers.principal || '').trim()){
        r.teachers.principal = 'Achmad Jumadi, M.Pd.';
      }
    }

    _renderRaporPreviewBeforeKktpFix();

    if(!document.getElementById('rpv-signature-align-fix')){
      const style = document.createElement('style');
      style.id = 'rpv-signature-align-fix';
      style.textContent = `
        .rpv-signatures .blank-line{
          margin-top:31mm !important;
          width:44mm !important;
          min-width:44mm !important;
          max-width:44mm !important;
          height:5mm !important;
          display:block !important;
          border-bottom:1px solid #111 !important;
          text-decoration:none !important;
          line-height:4.5mm !important;
          padding:0 !important;
          white-space:nowrap !important;
          text-align:center !important;
          margin-left:auto !important;
          margin-right:auto !important;
        }

        .rpv-signatures .name{
          margin-top:31mm !important;
          width:max-content !important;
          min-width:0 !important;
          max-width:100% !important;
          height:5mm !important;
          display:block !important;
          border-bottom:1px solid #111 !important;
          text-decoration:none !important;
          line-height:4.5mm !important;
          padding:0 !important;
          white-space:nowrap !important;
          text-align:center !important;
          margin-left:auto !important;
          margin-right:auto !important;
        }
      `;
      document.head.appendChild(style);
    }
  };
})();
