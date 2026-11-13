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
    for (const block of doc.querySelector('main').children) {
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

    pdf.save(filename.replaceAll('/', '_') + '.pdf');
  }

  async function print(number) {
    const page = window.open('', '_blank');
    if (!page) throw Error('Izinkan tab baru untuk membuka surat.');
    page.opener = null;
    page.document.body.textContent = 'Memuat surat…';
    try {
      const { letter, signature } = await api({ action: 'print', number });
      const header = new URL('kesiswaan-kop-header.png', location.href);
      const footer = new URL('kesiswaan-kop-footer.png', location.href);
      page.document.open();
      page.document.write(`<!doctype html><html lang="id"><meta charset="utf-8"><title>${esc(numberLabel(letter))}</title>
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
          .print{display:none}
          /* Body space is reserved by @page margins (44/29 mm); artwork is pinned to the A4 page edges
             exactly like KOP_SURAT.docx: header x 6.7 mm / y -1.46 mm, footer x 18 mm / 0.3 mm from bottom. */
          .kop,.footer{position:fixed}
          .kop{left:-11.3mm;top:-45.46mm}.footer{left:0;bottom:-28.7mm}
        }
        </style>
        <button type="button" class="print" id="print-letter">Unduh PDF</button><span id="pdf-status" role="status"></span>
        <div class="letter-sheet">
          <img class="kop" alt="Kop sekolah" src="${esc(header.href)}">
          <main>${content(letter, signature)}</main>
          <img class="footer" alt="Footer sekolah" src="${esc(footer.href)}">
        </div></html>`);
      page.document.close();
      const button = page.document.getElementById('print-letter');
      const status = page.document.getElementById('pdf-status');
      button.onclick = async () => {
        button.disabled = true;
        status.textContent = ' Menyiapkan PDF…';
        try {
          await downloadPdf(page.document, numberLabel(letter));
          status.textContent = '';
        } catch (error) {
          status.textContent = ' ' + error.message;
        } finally {
          button.disabled = false;
        }
      };
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

  window.renderKesiswaanLateLetters = function (container) {
    if (!allowed()) return;
    container.innerHTML = `<section class="card"><h1>Rekap Keterlambatan</h1>
      <p>Surat mengikuti jumlah keterlambatan dalam satu semester. Peringatan I pada 5 kali, Peringatan II pada 10 kali, serta Peringatan III dan pemanggilan pada 15 kali.</p>
      <button type="button" data-recap>Rekap Semester</button> <button type="button" data-history>Riwayat Surat</button>
      <p role="status"></p><div data-body style="overflow:auto"></div></section>`;
    const root = container.querySelector('section');
    const body = root.querySelector('[data-body]');
    const status = root.querySelector('[role=status]');
    let requestId = 0;
    const open = async number => {
      try { await print(number); } catch (error) { status.textContent = error.message; }
    };

    async function show(action, offset = 0) {
      const id = ++requestId;
      body.replaceChildren();
      status.textContent = 'Memuat…';
      try {
        const data = await api({ action, offset });
        if (id !== requestId || !root.isConnected || !allowed()) return;
        status.textContent = '';
        if (action === 'history') {
          const { letters } = data;
          body.innerHTML = letters.length ? `<table><thead><tr><th>Nomor</th><th>Siswa</th><th>Kelas</th><th>Jenis surat</th><th>Aksi</th></tr></thead>
          <tbody>${letters.map(x => `<tr><td>${esc(numberLabel(x))}</td><td>${esc(x.student_name)}</td><td>${esc(x.class_name)}</td>
          <td>${kinds[x.kind][1]}</td><td><button type="button" data-print="${x.number}">Buka surat</button></td></tr>`).join('')}</tbody></table>`
            : '<p>Belum ada surat di halaman ini.</p>';
          if (offset) body.insertAdjacentHTML('beforeend', '<button type="button" data-prev>Sebelumnya</button> ');
          if (letters.length === 50) body.insertAdjacentHTML('beforeend', '<button type="button" data-next>Berikutnya</button>');
          body.querySelectorAll('[data-print]').forEach(button => button.onclick = () => open(Number(button.dataset.print)));
          body.querySelector('[data-prev]')?.addEventListener('click', () => show('history', offset - 50));
          body.querySelector('[data-next]')?.addEventListener('click', () => show('history', offset + 50));
          return;
        }

        const { rows, period } = data;
        status.textContent = `${dateLabel(period.start_date)} sampai ${dateLabel(period.end_date)}`;
        body.innerHTML = rows.length ? `<label>Cari siswa atau kelas <input type="search" data-search></label>
          <table><thead><tr><th>Siswa</th><th>Kelas</th><th>Bulan Ini</th><th>Semester Ini</th><th>Surat</th></tr></thead>
          <tbody>${rows.map((row, index) => `<tr data-row="${index}"><td>${esc(row.student_name)}</td><td>${esc(row.class_name)}</td>
          <td>${row.dates.filter(x => x.date.slice(0, 7) === period.today.slice(0, 7)).length}</td>
          <td><details><summary>${row.dates.length} kali</summary><ul>${row.dates.map(x =>
            `<li>${esc(dateLabel(x.date))}${x.note ? ' · ' + esc(x.note) : ''}</li>`).join('')}</ul></details></td>
          <td>${Object.entries(kinds).filter(([, [threshold]]) => row.dates.length >= threshold).map(([kind, [, label]]) =>
            `<button type="button" data-kind="${kind}" data-index="${index}">${row.issued?.[kind] ? 'Buka ' : 'Buat '}${label}</button> `).join('') || '—'}</td>
          </tr>`).join('')}</tbody></table>` : '<p>Belum ada keterlambatan tercatat pada semester ini.</p>';
        body.querySelector('[data-search]')?.addEventListener('input', event => {
          const query = event.target.value.trim().toLowerCase();
          body.querySelectorAll('[data-row]').forEach(tr => {
            const row = rows[Number(tr.dataset.row)];
            tr.hidden = ![row.student_name, row.class_name].join(' ').toLowerCase().includes(query);
          });
        });
        body.querySelectorAll('[data-kind]').forEach(button => button.onclick = () => {
          const row = rows[Number(button.dataset.index)];
          const kind = button.dataset.kind;
          if (row.issued?.[kind]) return open(row.issued[kind]);
          preview(root, row, kind, period, number => {
            (row.issued ||= {})[kind] = number;
            button.textContent = 'Buka ' + kinds[kind][1];
            status.textContent = 'Surat diterbitkan. Klik tombol Buka untuk melihat atau menyimpan PDF.';
          });
        });
      } catch (error) {
        if (id === requestId) status.textContent = error.message;
      }
    }

    root.querySelector('[data-recap]').onclick = () => show('recap');
    root.querySelector('[data-history]').onclick = () => show('history');
    show('recap');
  };
})();
