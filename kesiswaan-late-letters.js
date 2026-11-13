(function () {
  'use strict';

  const kinds = { sp1: [5, 'Surat Peringatan Keterlambatan I'], sp2: [10, 'Surat Peringatan Keterlambatan II'],
    sp3: [15, 'Surat Peringatan Keterlambatan III'], spo: [15, 'Surat Pemanggilan Orang Tua/Wali'] };
  const roman = 'I II III IV V VI VII VIII IX X XI XII'.split(' ');
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const dateLabel = value => new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long', timeZone: 'Asia/Jakarta'
  }).format(new Date(value + 'T12:00:00+07:00'));
  const numberLabel = letter => {
    const [year, month] = letter.issued_on.split('-');
    return [letter.number, letter.kind === 'spo' ? 'SPO' : 'SP', 'KES', roman[Number(month) - 1], year].join('/');
  };

  function allowed() {
    return ['kesiswaan', 'kabid_kesiswaan'].includes(String(
      currentUser?.role || currentUser?.primary_role || currentUser?.role_code || ''
    ).toLowerCase().replace(/[ -]+/g, '_'));
  }

  async function api({ action, ...body }) {
    if (!allowed()) throw Error('Khusus Kabid Kesiswaan.');
    const response = await fetch(SUPABASE_URL + '/functions/v1/student-affairs-center', {
      method: 'POST', cache: 'no-store',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer ' + SUPABASE_PUBLISHABLE_KEY, 'x-session-token': getAuthToken() },
      body: JSON.stringify({ ...body, action: 'late_letters', operation: action })
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Surat keterlambatan belum dapat diproses.');
    return data;
  }

  function content(letter, signature) {
    const p = letter.payload;
    const meeting = letter.kind === 'spo';
    const agenda = meeting ? `<p>Kami mengundang Bapak/Ibu untuk membahas kendala kedatangan Ananda dan menyepakati langkah perbaikan bersama.</p>
      <p>Tanggal pertemuan <strong>${p.meeting_date ? esc(dateLabel(p.meeting_date)) : '[Tanggal]'}</strong><br>
      Waktu <strong>${esc(p.meeting_time || '[Jam]')} WIB</strong><br>Tempat <strong>${esc(p.meeting_place || '[Tempat]')}</strong></p>`
      : '<p>Kami memohon kerja sama Bapak/Ibu untuk mendampingi Ananda agar datang tepat waktu. Jika ada kendala, silakan sampaikan kepada wali kelas agar sekolah dan keluarga dapat mencari solusi bersama.</p>';
    const next = { sp1: 'Pada akumulasi 10 kali dalam semester yang sama, sekolah menerbitkan Surat Peringatan II.',
      sp2: 'Pada akumulasi 15 kali dalam semester yang sama, sekolah menerbitkan Surat Peringatan III dan Surat Pemanggilan Orang Tua/Wali.',
      sp3: 'Bidang Kesiswaan akan mengundang Bapak/Ibu untuk membahas tindak lanjut pembinaan.' }[letter.kind];
    return `<h1>${kinds[letter.kind][1]}</h1><div class="letter-number">Nomor ${letter.number ? esc(numberLabel(letter)) : 'ditetapkan saat terbit'}</div>
      <p>Yth. Bapak/Ibu Orang Tua/Wali dari <strong>${esc(p.student_name)}</strong><br>Kelas ${esc(p.class_name)}</p>
      <p>Assalamu’alaikum warahmatullahi wabarakatuh.</p>
      <p>Berdasarkan rekap kehadiran SD Islam Tahfizh Cahaya Qur’an, Ananda <strong>${esc(p.student_name)}</strong> tercatat terlambat <strong>${p.dates.length} kali</strong> pada Semester ${p.semester_no === 1 ? 'Ganjil' : 'Genap'} Tahun Pelajaran ${esc(p.year_name)}.</p>
      <p>Tanggal keterlambatan: ${p.dates.map(x => esc(dateLabel(x.date))).join(', ')}.</p>
      ${agenda}${next ? `<p>${next}</p>` : ''}
      <p>Terima kasih atas perhatian dan kerja sama Bapak/Ibu.</p>
      <p>Wassalamu’alaikum warahmatullahi wabarakatuh.</p>
      <div class="letter-sign"><p>Depok, ${esc(dateLabel(letter.issued_on))}<br>Kepala Bidang Kesiswaan<br>SD Islam Tahfizh Cahaya Qur’an</p>
      ${signature && /^[a-z0-9+/=]+$/i.test(signature) ? `<img class="signature" alt="Tanda tangan" src="data:image/png;base64,${signature}">` : '<div class="signature"></div>'}
      <strong>Khoerunnisa, S.Kom.</strong></div>`;
  }

  // Letterhead geometry in mm on an A4 page, measured from KOP_SURAT.docx.
  const LETTER_ART = { headerX: 6.7, headerY: -1.46, headerWidth: 205.3, footerX: 18, footerWidth: 178.8, footerGap: 0.3 };

  async function downloadPdf(doc, filename) {
    const { jsPDF } = await rpLoadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', 'jspdf');
    const [header, footer, signature] = await Promise.all(
      ['.kop', '.footer', 'img.signature'].map(async selector => {
        const image = doc.querySelector(selector);
        if (!image) return null;
        const response = await fetch(image.src);
        if (!response.ok) throw Error('Gambar surat belum dapat dimuat.');
        return new Uint8Array(await response.arrayBuffer());
      })
    );
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    const margin = 18;
    const textWidth = width - 2 * margin;
    const bottom = height - 29;
    let y;

    function imageHeight(bytes, imageWidth) {
      const size = pdf.getImageProperties(bytes);
      return imageWidth * size.height / size.width;
    }

    function letterhead() {
      // Same placement as the KOP_SURAT.docx template (A4, mm): header bleeds off the top and right edges,
      // footer is 178.8 mm wide, starts 18 mm from the left and sits 0.3 mm above the bottom edge.
      const footerHeight = imageHeight(footer, LETTER_ART.footerWidth);
      pdf.addImage(header, 'PNG', LETTER_ART.headerX, LETTER_ART.headerY, LETTER_ART.headerWidth, imageHeight(header, LETTER_ART.headerWidth), 'letterhead');
      pdf.addImage(footer, 'PNG', LETTER_ART.footerX, height - footerHeight - LETTER_ART.footerGap, LETTER_ART.footerWidth, footerHeight, 'letterfooter');
      y = 46;
    }

    function nextPage() {
      pdf.addPage();
      letterhead();
    }

    function lines(text, maxWidth, fontSize, weight = 'normal') {
      pdf.setFont('helvetica', weight);
      pdf.setFontSize(fontSize);
      return pdf.splitTextToSize(text, maxWidth);
    }

    const lineHeight = 5.3;
    letterhead();
    for (const [index, main] of [...doc.querySelectorAll('main')].entries()) {
      if (index) nextPage();
      for (const block of main.children) {
        if (block.matches('.letter-sign')) {
          const x = width * .56;
          const signatureLines = lines(block.querySelector('p').innerText, width - margin - x, 11);
          const name = block.querySelector('strong').textContent;
          if (y + signatureLines.length * lineHeight + 22 > bottom) nextPage();
          for (const line of signatureLines) {
            pdf.text(line, x, y);
            y += lineHeight;
          }
          if (signature) {
            const props = pdf.getImageProperties(signature);
            pdf.addImage(signature, 'PNG', x, y - 3, 14 * props.width / props.height, 14);
          }
          pdf.setFont('helvetica', 'bold');
          pdf.text(name, x, y + 14);
          break;
        }

        const heading = block.matches('h1');
        const centered = heading || block.matches('.letter-number');
        const text = heading ? block.innerText.toUpperCase() : block.innerText;
        for (const line of lines(text, textWidth, heading ? 14 : 11, heading ? 'bold' : 'normal')) {
          if (y > bottom) nextPage();
          pdf.text(line, centered ? width / 2 : margin, y, { align: centered ? 'center' : 'left' });
          y += lineHeight;
        }
        y += centered && !heading ? 4 : 2;
      }
    }

    pdf.save(filename.replaceAll('/', '_') + '.pdf');
  }

  async function print(numbers, confirmed, download = false) {
    const page = window.open('', '_blank');
    if (!page) throw Error('Izinkan tab baru untuk membuka surat.');
    page.opener = null;
    page.document.body.textContent = 'Memuat surat…';
    try {
      const { letters, signature } = await api({ action: 'print_batch', numbers });
      const filename = letters.length === 1 ? numberLabel(letters[0]) : 'Surat_Keterlambatan_' + letters.length + '_Surat';
      const header = new URL('kesiswaan-kop-header.png', location.href);
      const footer = new URL('kesiswaan-kop-footer.png', location.href);
      page.document.open();
      page.document.write(`<!doctype html><html lang="id"><meta charset="utf-8"><title>${esc(filename)}</title>
        <style>
        @page{size:A4;margin:44mm 18mm 29mm}
        body{font:11pt/1.4 Tahoma,Arial,sans-serif;color:#17202a;margin:0 auto;max-width:174mm}
        .kop,.footer{display:block;height:auto;max-width:none;margin:0}
        .kop{width:205.3mm}.footer{width:178.8mm}
        h1{text-align:center;font-size:14pt;margin:0;text-transform:uppercase}
        .letter-number{text-align:center;margin:1mm 0 6mm}.letter-sign{margin-left:55%;break-inside:avoid}
        .signature{display:block;height:14mm;width:auto;object-fit:contain}
        @media screen{
          body{padding:8mm;max-width:none}.print{margin-bottom:5mm}
          .letter-sheet{box-sizing:border-box;position:relative;clip-path:inset(0);width:210mm;min-height:297mm;margin:0 auto;padding:46mm 18mm 29mm;background:#fff;box-shadow:0 0 0 1px #d0d5dd}
          .kop,.footer{position:absolute}
          .kop{left:6.7mm;top:-1.46mm}.footer{left:18mm;bottom:.3mm}
        }
        @media print{
          .print,.print-status{display:none}.letter-sheet + .letter-sheet{break-before:page}
          /* Body space is reserved by @page margins (44/29 mm); artwork is pinned to the A4 page edges
             exactly like KOP_SURAT.docx: header x 6.7 mm / y -1.46 mm, footer x 18 mm / 0.3 mm from bottom. */
          .kop,.footer{position:fixed}
          .kop{left:-11.3mm;top:-45.46mm}.footer{left:0;bottom:-28.7mm}
        }
        </style>
        <button type="button" class="print" id="print-letter">Unduh PDF A4</button> <button type="button" class="print" id="confirm-print" disabled>Konfirmasi sudah dicetak</button><span class="print-status" id="pdf-status" role="status"></span>
        ${letters.map(letter => `<div class="letter-sheet">
          <img class="kop" alt="Kop sekolah" src="${esc(header.href)}">
          <main>${content(letter, signature)}</main>
          <img class="footer" alt="Footer sekolah" src="${esc(footer.href)}">
        </div>`).join('')}</html>`);
      page.document.close();
      const button = page.document.getElementById('print-letter');
      const status = page.document.getElementById('pdf-status');
      const confirmButton = page.document.getElementById('confirm-print');
      confirmButton.onclick = async () => {
        confirmButton.disabled = true;
        try {
          await api({ action: 'confirm_print', numbers });
          status.textContent = ' Status cetak tersimpan.';
          confirmed();
        } catch (error) {
          status.textContent = ' ' + error.message;
          confirmButton.disabled = false;
        }
      };
      button.onclick = async () => {
        button.disabled = true;
        status.textContent = ' Menyiapkan PDF…';
        try {
          await downloadPdf(page.document, filename);
          confirmButton.disabled = false;
          status.textContent = ' Buka PDF untuk mencetak. Konfirmasi setelah selesai.';
        } catch (error) {
          status.textContent = ' ' + error.message;
        } finally {
          button.disabled = false;
        }
      };
      if (download) await button.onclick();
    } catch (error) {
      page.close();
      throw error;
    }
  }

  function preview(root, row, kind, period, issued) {
    const dialog = document.createElement('dialog');
    dialog.style.cssText = 'width:min(680px,90vw);max-height:85vh;padding:20px;border:1px solid #cbd5e1;border-radius:12px';
    dialog.innerHTML = `<form><div style="text-align:right"><button type="button" data-close>Tutup</button></div>
      ${kind === 'spo' ? `<fieldset><legend>Jadwal Pertemuan</legend>
      <label>Tanggal <input name="meeting_date" type="date" min="${esc(period.today)}" required></label>
      <label>Jam <input name="meeting_time" type="time" required></label>
      <label>Tempat <input name="meeting_place" maxlength="160" required></label></fieldset>` : ''}
      <div data-draft></div><p role="alert"></p><button class="btn" type="submit">Terbitkan Surat</button></form>`;
    root.appendChild(dialog);
    const form = dialog.querySelector('form');
    const submit = form.querySelector('[type=submit]');
    const status = form.querySelector('[role=alert]');
    const inputs = () => Object.fromEntries(new FormData(form));
    const refresh = () => {
      dialog.querySelector('[data-draft]').innerHTML = content({
        kind, issued_on: period.today, payload: { ...row, ...inputs() }
      });
    };
    form.addEventListener('input', refresh);
    dialog.querySelector('[data-close]').onclick = () => dialog.close();
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    form.onsubmit = async event => {
      event.preventDefault();
      submit.disabled = true;
      status.textContent = 'Menerbitkan surat…';
      try {
        const { number } = await api({ ...inputs(), action: 'issue', kind, student_id: row.student_id, semester_id: period.id });
        dialog.close();
        issued(number);
      } catch (error) {
        status.textContent = error.message;
        submit.disabled = false;
      }
    };
    refresh();
    dialog.showModal();
  }

  const shortKind = { sp1: 'SP 1', sp2: 'SP 2', sp3: 'SP 3', spo: 'Pemanggilan' };
  const printDate = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta'
  });

  window.renderKesiswaanLateLetters = function (container) {
    if (!allowed()) return;
    container.innerHTML = `<section class="card late-letters">
      <style>
        .late-letters{--late-teal:#0b696c;--late-line:#d7e7e5;--late-soft:#eff8f6;--late-muted:#486265;display:grid;gap:18px}
        .late-letters h1{font-size:clamp(24px,3vw,34px);margin:0 0 5px}
        .late-letters p{margin:0;color:var(--late-muted)}
        .late-letters :is(.late-tabs,.late-filters,.late-actions,.late-summary){display:flex;flex-wrap:wrap;align-items:end;gap:9px}
        .late-letters button,.late-letters input:not([type=checkbox]),.late-letters select{font:inherit;font-size:.9rem;border:1px solid var(--late-line);border-radius:9px;padding:8px 11px;background:#fff;color:#16484b}
        .late-letters button{cursor:pointer;font-weight:650}
        .late-letters button:hover:not(:disabled){border-color:var(--late-teal)}
        .late-letters button:is([aria-pressed=true],.late-primary){background:var(--late-teal);border-color:var(--late-teal);color:white}
        .late-letters button:disabled{opacity:.55;cursor:default}
        .late-letters input[type=checkbox]{accent-color:var(--late-teal);width:16px;height:16px}
        .late-letters label{display:grid;gap:5px;font-size:.82rem;font-weight:650;color:#31575a}
        .late-letters .late-filters{background:var(--late-soft);padding:13px;border-radius:12px}
        .late-letters .late-summary button{flex:1;min-width:110px;text-align:left}
        .late-letters .late-summary strong{display:block;font-size:1.35rem}
        .late-letters .late-table{overflow:auto;border:1px solid var(--late-line);border-radius:12px}
        .late-letters table{border-collapse:collapse;width:100%;font-size:.9rem}
        .late-letters :is(th,td){padding:10px 12px;text-align:left;border-bottom:1px solid var(--late-line);vertical-align:top}
        .late-letters th{background:var(--late-soft);white-space:nowrap;color:#31575a}
        .late-letters tr:last-child td{border-bottom:0}
        .late-letters tbody tr:hover{background:#f6fbfa}
        .late-letters .late-tag{display:inline-block;white-space:nowrap;border-radius:999px;padding:3px 8px;background:#fff2d8;color:#774e08;font-size:.8rem;font-weight:650}
        .late-letters .late-done{background:#dff5ec;color:#165a43}
        .late-letters small{display:block;margin-top:4px;color:var(--late-muted)}
        .late-letters details summary{cursor:pointer;white-space:nowrap}
        .late-letters details ul{padding-left:18px;min-width:150px}
        .late-letters dialog{color:#182e31;background:white}
        .late-letters dialog form{display:grid;gap:12px}
        .late-letters dialog fieldset{display:flex;flex-wrap:wrap;gap:9px;border:1px solid var(--late-line);border-radius:9px}
      </style>
      <header><h1>Rekap Keterlambatan</h1><p>Ambang surat per semester · SP 1: 5 kali · SP 2: 10 kali · SP 3 dan pemanggilan: 15 kali</p></header>
      <div class="late-tabs"><button type="button" data-tab="recap">Rekap Semester</button><button type="button" data-tab="history">Riwayat Surat</button></div>
      <form class="late-filters">
        <label>Dari tanggal<input type="date" name="from"></label>
        <label>Sampai tanggal<input type="date" name="to"></label>
        <label>Cari siswa atau kelas<input type="search" name="search" placeholder="Nama siswa atau kelas"></label>
        <label data-print-filter>Status cetak<select name="printed"><option value="">Semua status</option><option value="yes">Sudah Dicetak</option><option value="no">Belum Dicetak</option></select></label>
        <button type="submit" class="late-primary">Terapkan</button><button type="button" data-reset>Reset</button>
      </form>
      <p data-scope></p><div class="late-summary"></div><p role="status" aria-live="polite"></p><div data-body></div>
    </section>`;
    const root = container.querySelector('.late-letters');
    const filters = root.querySelector('form');
    const summary = root.querySelector('.late-summary');
    const body = root.querySelector('[data-body]');
    const status = root.querySelector('[role=status]');
    const scope = root.querySelector('[data-scope]');
    const selected = new Set();
    let mode = 'recap';
    let kind = '';
    let data;
    let requestId = 0;
    let page = 0;
    const pageSize = 25;

    const open = async (numbers, download) => {
      try {
        await print(numbers, () => {
          for (const number of numbers) selected.delete(number);
          if (root.isConnected && mode === 'history') load();
        }, download);
      } catch (error) {
        status.textContent = error.message;
      }
    };

    function render() {
      if (!data) return;
      const { from, to, search, printed } = filters.elements;
      if (from.value && to.value && from.value > to.value) {
        status.textContent = 'Tanggal akhir harus sama dengan atau setelah tanggal awal.';
        return;
      }
      status.textContent = '';
      const inRange = date => (!from.value || date >= from.value) && (!to.value || date <= to.value);
      const query = search.value.trim().toLowerCase();
      const matches = row => [row.student_name, row.class_name].join(' ').toLowerCase().includes(query);
      const history = mode === 'history';
      const eligible = (row, key) => Boolean(row.issued?.[key]) || row.dates.length >= kinds[key][0];
      const base = history
        ? data.letters.filter(row => inRange(row.issued_on) && matches(row) && (!printed.value || Boolean(row.printed_at) === (printed.value === 'yes')))
        : data.rows.filter(matches).map(row => ({ ...row, filteredDates: row.dates.filter(x => inRange(x.date)) })).filter(row => row.filteredDates.length);
      const hasKind = (row, key) => history ? row.kind === key : eligible(row, key);
      const rows = kind ? base.filter(row => hasKind(row, kind)) : base;
      summary.innerHTML = [['', 'Semua'], ...Object.entries(shortKind)].map(([key, label]) => {
        const total = key ? base.filter(row => hasKind(row, key)).length : base.length;
        return `<button type="button" data-filter-kind="${key}" aria-pressed="${key === kind}">${label}<strong>${total}</strong></button>`;
      }).join('');
      if (!rows.length) {
        body.innerHTML = '<p>Tidak ada data yang sesuai dengan filter.</p>';
        return;
      }
      page = Math.min(page, Math.ceil(rows.length / pageSize) - 1);
      const visible = rows.slice(page * pageSize, (page + 1) * pageSize);
      const selection = history
        ? '<div class="late-actions"><button type="button" class="late-primary" data-batch></button><p data-selection></p></div>'
        : '';
      const columns = history
        ? '<th scope="col"><input type="checkbox" data-all aria-label="Pilih semua surat di halaman ini"></th><th scope="col">Nomor / Terbit</th><th scope="col">Siswa / Kelas</th><th scope="col">Jenis</th><th scope="col">Status cetak</th><th scope="col">Aksi</th>'
        : '<th scope="col">Siswa / Kelas</th><th scope="col">Dalam rentang</th><th scope="col">Total semester</th><th scope="col">Surat</th>';
      const student = row => `<strong>${esc(row.student_name)}</strong><small>${esc(row.class_name)}</small>`;
      const cells = history ? visible.map(row => `<tr>
        <td><input type="checkbox" data-select="${row.number}" aria-label="Pilih ${esc(numberLabel(row))}"></td>
        <td><strong>${esc(numberLabel(row))}</strong><small>${esc(dateLabel(row.issued_on))}</small></td><td>${student(row)}</td>
        <td>${shortKind[row.kind]}</td>
        <td><span class="late-tag ${row.printed_at ? 'late-done' : ''}">${row.printed_at ? 'Sudah Dicetak' : 'Belum Dicetak'}</span>
        ${row.printed_at ? `<small>${esc(printDate.format(new Date(row.printed_at)))} WIB</small>` : ''}</td>
        <td><div class="late-actions"><button type="button" data-open="${row.number}">Lihat</button><button type="button" data-download="${row.number}">Cetak PDF</button></div></td></tr>`)
        : visible.map((row, index) => `<tr><td>${student(row)}</td>
        <td><details><summary>${row.filteredDates.length} kali</summary><ul>${row.filteredDates.map(x =>
          `<li>${esc(dateLabel(x.date))}${x.note ? ' · ' + esc(x.note) : ''}</li>`).join('')}</ul></details></td>
        <td>${row.dates.length} kali</td><td><div class="late-actions">${Object.keys(kinds).filter(key => eligible(row, key)).map(key =>
          `<button type="button" data-kind="${key}" data-index="${index}">${row.issued?.[key] ? 'Lihat' : 'Buat'} ${shortKind[key]}</button>`).join('') || '—'}</div></td></tr>`);
      body.innerHTML = `${selection}<div class="late-table"><table><thead><tr>${columns}</tr></thead>
        <tbody>${cells.join('')}</tbody></table></div><div class="late-actions">
        <button type="button" data-prev ${page === 0 ? 'disabled' : ''}>Sebelumnya</button>
        <p>${page * pageSize + 1}–${Math.min((page + 1) * pageSize, rows.length)} dari ${rows.length}</p>
        <button type="button" data-next ${(page + 1) * pageSize >= rows.length ? 'disabled' : ''}>Berikutnya</button></div>`;
      body.querySelector('[data-prev]').onclick = () => { page--; render(); };
      body.querySelector('[data-next]').onclick = () => { page++; render(); };

      if (history) {
        const all = body.querySelector('[data-all]');
        const boxes = [...body.querySelectorAll('[data-select]')];
        const batch = body.querySelector('[data-batch]');
        const update = () => {
          for (const box of boxes) box.checked = selected.has(Number(box.dataset.select));
          const checked = boxes.filter(box => box.checked).length;
          all.checked = checked === boxes.length;
          all.indeterminate = checked > 0 && !all.checked;
          batch.disabled = selected.size === 0;
          batch.textContent = `Cetak PDF terpilih (${selected.size})`;
          body.querySelector('[data-selection]').textContent = 'Maksimal 50 surat per PDF.';
        };
        const select = (numbers, checked) => {
          if (checked && new Set([...selected, ...numbers]).size > 50) {
            status.textContent = 'Maksimal 50 surat per PDF.';
          } else {
            status.textContent = '';
            for (const number of numbers) checked ? selected.add(number) : selected.delete(number);
          }
          update();
        };
        all.onchange = () => select(visible.map(row => row.number), all.checked);
        for (const box of boxes) box.onchange = () => select([Number(box.dataset.select)], box.checked);
        batch.onclick = () => open([...selected], true);
        for (const button of body.querySelectorAll('[data-open]')) button.onclick = () => open([Number(button.dataset.open)]);
        for (const button of body.querySelectorAll('[data-download]')) button.onclick = () => open([Number(button.dataset.download)], true);
        update();
      } else {
        for (const button of body.querySelectorAll('[data-kind]')) button.onclick = () => {
          const row = visible[Number(button.dataset.index)];
          const key = button.dataset.kind;
          if (row.issued?.[key]) return open([row.issued[key]]);
          preview(root, row, key, data.period, number => {
            (data.rows.find(x => x.student_id === row.student_id).issued ||= {})[key] = number;
            render();
            status.textContent = 'Surat diterbitkan. Buka surat untuk melihat PDF.';
          });
        };
      }
    }

    async function load() {
      const id = ++requestId;
      data = null;
      body.replaceChildren();
      summary.replaceChildren();
      scope.textContent = '';
      status.textContent = 'Memuat…';
      const history = mode === 'history';
      filters.elements.printed.disabled = !history;
      root.querySelector('[data-print-filter]').style.display = history ? '' : 'none';
      for (const tab of root.querySelectorAll('[data-tab]')) tab.setAttribute('aria-pressed', tab.dataset.tab === mode);
      try {
        const result = await api({ action: mode });
        if (id !== requestId || !root.isConnected || !allowed()) return;
        if (history) {
          for (let offset = 50; result.letters.length === offset; offset += 50) {
            const next = await api({ action: 'history', offset });
            if (id !== requestId || !root.isConnected || !allowed()) return;
            result.letters.push(...next.letters);
          }
        }
        data = result;
        scope.textContent = history ? 'Rentang berdasarkan tanggal terbit surat.'
          : `Rentang berdasarkan tanggal kejadian · Semester aktif ${dateLabel(data.period.start_date)}–${dateLabel(data.period.end_date)}`;
        render();
      } catch (error) {
        if (id === requestId) status.textContent = error.message;
      }
    }

    const apply = () => {
      selected.clear();
      page = 0;
      body.replaceChildren();
      summary.replaceChildren();
      render();
    };
    filters.onsubmit = event => { event.preventDefault(); apply(); };
    filters.elements.printed.onchange = apply;
    filters.querySelector('[data-reset]').onclick = () => { filters.reset(); kind = ''; apply(); };
    summary.onclick = event => {
      const button = event.target.closest('[data-filter-kind]');
      if (!button) return;
      kind = button.dataset.filterKind;
      apply();
    };
    for (const tab of root.querySelectorAll('[data-tab]')) tab.onclick = () => {
      if (mode !== tab.dataset.tab) {
        mode = tab.dataset.tab;
        filters.reset();
        kind = '';
        selected.clear();
        page = 0;
      }
      load();
    };
    load();
  };
})();
