(() => {
  'use strict';
  const menus = {
    dashboard: ['Ringkasan', '◈'],
    'yayasan-mt': ['Morning Talk', '◷'],
    'yayasan-sapras': ['Sapras', '▤'],
    'yayasan-tp': ['Capaian TP', '◎'],
    'yayasan-nilai': ['Nilai Akademik', '▥'],
  };
  const statuses = {achieved:'Tercapai', below:'Belum tercapai', pending:'Belum dinilai'};
  const saprasStatuses = {DILAPORKAN:'Menunggu', TERKIRIM:'Menunggu', DIPROSES:'Diproses', SELESAI:'Selesai'};
  const number = new Intl.NumberFormat('id-ID', {maximumFractionDigits: 2});
  const date = new Intl.DateTimeFormat('id-ID', {dateStyle:'medium', timeZone:'Asia/Jakarta'});
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => (
    {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]
  ));
  const dateLabel = value => date.format(new Date(value));
  const option = (value, label, selected) =>
    `<option value="${esc(value)}"${value === selected ? ' selected' : ''}>${esc(label)}</option>`;
  const tag = (label, tone) => `<span class="yay-tag ${tone}">${esc(label)}</span>`;
  const metric = (label, value, hint) =>
    `<div class="yay-metric"><span>${esc(label)}</span><strong>${number.format(value)}</strong><small>${esc(hint)}</small></div>`;
  const table = (heads, body, empty) => body.length ?
    `<div class="yay-table" tabindex="0" role="region" aria-label="Tabel hasil"><table><thead><tr>${heads.map(h => `<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${body.join('')}</tbody></table></div>` :
    `<p class="yay-empty">${esc(empty)}</p>`;
  const tr = (...cells) => '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
  let view;
  let session;
  let overview;
  let mtDetailsAt = 0;
  let saprasPhotosAt = 0;
  let academic;
  let controller;
  let classId = '';
  let academicClass = '';
  let mtClass = '';
  let subjectId = '';
  let status = '';
  let search = '';
  let page = 0;
  let error = '';

  function route(id) { return Object.hasOwn(menus, id) ? id : 'dashboard'; }

  function sidebar(element, active) {
    const nav = document.createElement('nav');
    nav.className = 'yay-nav';
    nav.setAttribute('aria-label', 'Menu Yayasan');
    for (const [id, [label, icon]] of Object.entries(menus)) {
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = `<span aria-hidden="true">${icon}</span>${label}`;
      if (id === active) button.setAttribute('aria-current', 'page');
      button.addEventListener('click', () => setActiveModule(id));
      nav.append(button);
    }
    element.replaceChildren(nav);
  }

  function filters() {
    const classOptions = (overview?.classes || []).map(c => option(c.id, c.name, view === 'yayasan-mt' ? mtClass : classId)).join('');
    if (view === 'yayasan-tp' || view === 'yayasan-nilai') {
      const subjects = (academic?.subjects || []).map(s => option(s.id, s.name, subjectId)).join('');
      return `<div class="yay-filters">
        <label>Kelas<select data-filter="class">${classOptions}</select></label>
        <label>Mata pelajaran<select data-filter="subject">${(view === 'yayasan-tp' ? option('', 'Semua mapel', subjectId) : '')}${subjects}</select></label>
        ${view === 'yayasan-tp'
          ? `<label>Status TP<select data-filter="status">${option('', 'Semua status', status)}${Object.entries(statuses).map(([id,label]) => option(id,label,status)).join('')}</select></label>`
          : '<label>Nama siswa<input type="search" data-filter="search" placeholder="Cari nama siswa"></label>'}
      </div>`;
    }
    return `<form class="yay-filters" data-dates>
      <label>Dari tanggal<input name="start" type="date" required value="${esc(overview.start)}"></label>
      <label>Sampai tanggal<input name="end" type="date" required value="${esc(overview.end)}"></label>
      <button type="submit" class="yay-action">Tampilkan</button>
      ${view === 'yayasan-mt' ? `<label>Kelas<select data-filter="mt-class">${option('', 'Semua kelas', mtClass)}${classOptions}</select></label>` : ''}
    </form>`;
  }

  function summary() {
    const done = overview.sapras.filter(r => r.status === 'SELESAI').length;
    return `<div class="yay-metrics">
      ${metric('Catatan Morning Talk', overview.mt.length, 'Kegiatan tercatat per kelas')}
      ${metric('Laporan Sapras', overview.sapras.length, number.format(done) + ' selesai ditangani')}
      ${metric('Kelas aktif', overview.classes.length, 'Semester berjalan')}
    </div>
    <div class="yay-links">${Object.entries(menus).slice(1).map(([id,[label,icon]], i) =>
      `<button type="button" data-route="${id}"><span class="yay-icon" aria-hidden="true">${icon}</span><span><strong>${label}</strong><small>${[
        'Tema kegiatan per kelas dan tanggal', 'Laporan fasilitas dan tindak lanjut',
        'Hasil penilaian per TP dan kelas', 'Nilai siswa per kelas dan mata pelajaran',
      ][i]}</small></span><span aria-hidden="true">→</span></button>`).join('')}</div>`;
  }

  function saprasPhoto(url, label) {
    if (!/^https:\/\//i.test(url || '')) return '';
    return `<a class="yay-sapras-photo" href="${esc(url)}" target="_blank" rel="noopener noreferrer">
      <img loading="lazy" src="${esc(url)}" alt=""><span>${esc(label)}</span>
    </a>`;
  }

  function content() {
    if (view === 'dashboard') return summary();
    if (view === 'yayasan-mt') {
      const names = new Map(overview.classes.map(c => [c.id, c.name]));
      const records = overview.mt.filter(r => !mtClass || r.class_id === mtClass);
      return paginate(records, batch => batch.length ? `<div class="yay-mt-grid">${batch.map(r => {
        const name = names.get(r.class_id);
        const photo = /^https:\/\//i.test(r.photo_url || '') ?
          `<a class="yay-mt-photo" href="${esc(r.photo_url)}" target="_blank" rel="noopener noreferrer"><img loading="lazy" referrerpolicy="no-referrer" src="${esc(r.photo_url)}" alt="Foto Morning Talk ${esc(name)}"></a>` :
          '<div class="yay-mt-photo yay-mt-placeholder">Foto belum tersedia</div>';
        return `<article class="yay-mt-card">${photo}<div class="yay-mt-body">
          <div class="yay-mt-meta"><h2>${esc(name)}</h2><time datetime="${esc(r.date)}">${esc(dateLabel(r.date))}</time></div>
          <dl class="yay-mt-counts">${[['present','Masuk'],['sick','Sakit'],['excused','Izin'],['unexcused','Alfa']].map(([key,label]) =>
            `<div><dt>${label}</dt><dd>${r.counts?.[key] == null ? '—' : number.format(r.counts[key])}</dd></div>`).join('')}</dl>
          <h3>Kegiatan hari itu</h3><p>${esc(r.theme || r.note || 'Kegiatan belum dicatat')}</p>
          ${r.theme && r.note ? `<p>${esc(r.note)}</p>` : ''}
        </div></article>`;
      }).join('')}</div>` : '<p class="yay-empty">Belum ada kegiatan Morning Talk pada periode ini.</p>', 12);
    }
    if (view === 'yayasan-sapras') {
      return paged(overview.sapras, ['Laporan', 'Lokasi dan kebutuhan', 'Status', 'Tindak lanjut'],
        r => tr(`<strong>${esc(r.ticket_no || 'Laporan Sapras')}</strong><small>${esc(dateLabel(r.created_at))}</small>`,
          `<strong>${esc(r.location || 'Lokasi belum dicatat')}</strong><small>${esc(r.description)}</small>${saprasPhoto(r.photo_url, 'Lihat foto laporan')}`,
          tag(saprasStatuses[r.status] || r.status || 'Belum ada status', r.status === 'SELESAI' ? 'green' : r.status === 'DIPROSES' ? 'blue' : 'amber'),
          esc(r.resolution_note || '—') + saprasPhoto(r.resolution_photo_url, 'Lihat foto tindak lanjut')), 'Belum ada laporan Sapras pada periode ini.');
    }
    if (!academic) return '<p class="yay-empty">Belum ada data akademik untuk kelas ini.</p>';
    if (view === 'yayasan-tp') {
      const objectives = academic.tp.filter(o => !subjectId || subjectId === o.subject_id);
      const className = overview.classes.find(c => c.id === classId)?.name || '';
      const visible = objectives.filter(o => !status || status === o.status);
      const grouped = academic.subjects.map(subject => ({
        name: subject.name, rows: visible.filter(o => o.subject_id === subject.id),
      })).filter(group => group.rows.length);
      return `<h2 class="yay-section-heading">Capaian TP · ${esc(className)}</h2>
        <div class="yay-metrics">${Object.entries(statuses).map(([id,label]) =>
        metric(label, objectives.filter(o => o.status === id).length, 'Tujuan pembelajaran')).join('')}</div>
        <p class="yay-note">Status TP mengikuti rata-rata kelas terhadap KKTP. Ambang 75 dipakai jika KKTP belum diatur.</p>` +
        (grouped.length ? grouped.map(group => `<section class="yay-tp-group"><h3>${esc(group.name)}</h3>
          ${table(['TP', 'Tujuan pembelajaran', 'KKTP', 'Rata-rata kelas', 'Siswa mencapai KKTP', 'Status'],
            group.rows.map(o => tr(`<strong>${esc(o.code)}</strong>`, esc(o.description || '—'),
              number.format(o.target), o.average == null ? '—' : number.format(o.average),
              o.assessed ? number.format(o.achieved) + ' dari ' + number.format(o.assessed) + ' dinilai' : '—',
              tag(statuses[o.status], o.status === 'achieved' ? 'green' : o.status === 'below' ? 'amber' : 'blue'))),
            '')}</section>`).join('') : '<p class="yay-empty">Belum ada TP yang sesuai dengan pilihan ini.</p>');
    }
    return gradeGrid();
  }

  function gradeGrid() {
    const subject = academic.subjects.find(s => s.id === subjectId);
    if (!subject) return '<p class="yay-empty">Belum ada mata pelajaran pada kelas ini.</p>';
    const objectives = academic.tp.filter(o => o.subject_id === subjectId);
    const scores = new Map();
    for (const grade of academic.grades) {
      if (grade.subject_id !== subjectId) continue;
      if (!scores.has(grade.student_id)) scores.set(grade.student_id, {components:{},tp:[]});
      const student = scores.get(grade.student_id);
      if (grade.type === 'TP') student.tp.push({learning_objective_id:grade.objective_id,score:grade.score});
      else student.components[grade.type] = {score:grade.score};
    }
    const students = academic.students.map((student,index) => ({...student,no:index + 1}))
      .filter(student => student.name.toLocaleLowerCase('id-ID').includes(search.trim().toLocaleLowerCase('id-ID')));
    const headers = ['No','Nama Siswa',...ACADEMIC_COMPONENTS.map((_,i) => 'T' + (i + 1)),
      'RT',...objectives.map(o => o.code),'RTP','WWP','ASAS','NA','Pred.','Status'];
    const className = overview.classes.find(c => c.id === classId)?.name;
    return `<section class="yay-tp-group yay-grade-grid"><h3>${esc(className)} · ${esc(subject.name)}</h3>` +
      paged(students, headers, row => {
        const student = scores.get(row.id);
        const final = academicFinalScore(student, objectives);
        const cells = [
          ...ACADEMIC_COMPONENTS.map(type => academicComponentScore(student,type)),
          academicTaskAverage(student),
          ...objectives.map(o => academicTPScore(student,o.id)),
          academicTPAverage(student,objectives),
          academicComponentScore(student,'WWP'),
          academicComponentScore(student,'ASAS'),
          final,
        ];
        return tr(row.no, `<strong>${esc(row.name)}</strong>`, ...cells.map(academicFormatScore), academicPredicate(final),
          final === null ? '—' : tag(final >= 75 ? 'Tuntas' : 'Belum', final >= 75 ? 'green' : 'amber'));
      }, 'Belum ada siswa yang sesuai dengan pilihan ini.') +
      '<p class="yay-note">RT = rata-rata tugas · RTP = rata-rata TP · NA = nilai akhir. NA tampil setelah seluruh komponen terisi.</p></section>';
  }

  function paged(records, headers, row, empty) {
    return paginate(records, batch => table(headers, batch.map(row), empty), 25);
  }

  function paginate(records, render, size) {
    const start = page * size;
    return render(records.slice(start, start + size)) + (records.length > size ?
      `<div class="yay-pages"><span>${start + 1}–${Math.min(start + size, records.length)} dari ${number.format(records.length)}</span>
        <button type="button" data-page="-1" ${page === 0 ? 'disabled' : ''}>Sebelumnya</button>
        <button type="button" data-page="1" ${start + size >= records.length ? 'disabled' : ''}>Berikutnya</button></div>` : '');
  }

  function draw(busy = false) {
    const node = document.getElementById('content');
    const heading = view === 'dashboard' ? 'Dashboard Yayasan' : menus[view][0];
    const period = overview ? `${overview.year} · Semester ${overview.semester}` : '';
    node.innerHTML = `<section class="yay-shell">
      <header class="yay-header${view === 'dashboard' ? ' yay-header-home' : ''}"><div><div class="yay-kicker">SD Islam Tahfizh Cahaya Qur’an</div><h1>${heading}</h1>
        ${period ? `<p>${esc(period)}</p>` : ''}</div><span class="yay-read">Akses baca</span></header>
      ${busy ? '<p class="yay-empty" role="status">Memuat data CQlass…</p>' :
        error ? `<p class="yay-empty" role="alert">${esc(error)}</p>${overview ? filters() : ''}<button class="yay-action" type="button" data-retry>Muat ulang</button>` :
        filters() + '<div data-results>' + content() + '</div>'}
      </section>`;
    const shell = node.firstElementChild;
    const refresh = () => {
      const results = shell.querySelector('[data-results]');
      if (results) results.innerHTML = content();
    };
    shell.querySelector('[data-retry]')?.addEventListener('click', () => load(true));
    shell.querySelector('[data-dates]')?.addEventListener('submit', event => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      load(true, {start:form.get('start'), end:form.get('end')});
    });
    shell.querySelectorAll('select[data-filter]').forEach(el => el.addEventListener('change', () => {
      page = 0;
      if (el.dataset.filter === 'class') {
        classId = el.value;
        subjectId = '';
        load();
        return;
      }
      if (el.dataset.filter === 'subject') subjectId = el.value;
      if (el.dataset.filter === 'mt-class') mtClass = el.value;
      if (el.dataset.filter === 'status') status = el.value;
      refresh();
    }));
    const searchBox = shell.querySelector('[data-filter="search"]');
    if (searchBox) {
      searchBox.value = search;
      searchBox.addEventListener('input', () => { search = searchBox.value; page = 0; refresh(); });
    }
    shell.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button?.dataset.route) setActiveModule(button.dataset.route);
      if (button?.dataset.page) {
        page += Number(button.dataset.page);
        refresh();
        const controls = shell.querySelector('.yay-pages');
        (controls.querySelector(`[data-page="${button.dataset.page}"]:enabled`) || controls.querySelector('button:enabled'))?.focus();
      }
    });
  }

  async function request(action, params, signal) {
    const response = await fetch(SUPABASE_URL + '/functions/v1/role-dashboard', {
      method:'POST', signal, cache:'no-store',
      headers:{'Content-Type':'application/json', apikey:SUPABASE_PUBLISHABLE_KEY, 'x-session-token':session},
      body:JSON.stringify({action:"yayasan_" + action, ...params}),
    });
    if (response.status === 401) throw new Error('Sesi berakhir. Silakan keluar lalu masuk kembali.');
    if (response.status === 403) throw new Error('Akses Yayasan belum aktif untuk akun ini.');
    const result = await response.json();
    if (result.error === 'invalid_dates') throw new Error('Periksa rentang tanggal. Pilih periode hingga hari ini dengan durasi maksimal satu tahun.');
    if (!response.ok) throw new Error('Data CQlass gagal dimuat. Coba lagi.');
    return result;
  }

  async function load(force = false, range) {
    controller?.abort();
    controller = new AbortController();
    const {signal} = controller;
    const token = session;
    const current = () => !signal.aborted && currentUser?.role === 'yayasan' && getAuthToken() === token;
    error = '';
    page = 0;
    try {
      const wantsMt = view === 'yayasan-mt';
      const wantsSapras = view === 'yayasan-sapras';
      const photoMaxAge = 50 * 60000;
      if (!overview || force || (wantsMt && Date.now() - mtDetailsAt > photoMaxAge) ||
          (wantsSapras && Date.now() - saprasPhotosAt > photoMaxAge)) {
        draw(true);
        const result = await request('overview', {...(range || {start:overview?.start, end:overview?.end}), mt_details:wantsMt, sapras_photos:wantsSapras}, signal);
        if (!current()) return;
        overview = result;
        mtDetailsAt = wantsMt ? Date.now() : 0;
        saprasPhotosAt = wantsSapras ? Date.now() : 0;
        if (!overview.classes.some(c => c.id === classId)) classId = overview.classes[0]?.id || '';
        if (force) { academic = null; academicClass = ''; subjectId = ''; }
      }
      if (['yayasan-tp', 'yayasan-nilai'].includes(view) && classId && academicClass !== classId) {
        draw(true);
        const result = await request('academics', {class_id:classId}, signal);
        if (!current()) return;
        academic = result;
        academicClass = classId;
      }
    } catch (err) {
      if (!current()) return;
      error = err instanceof TypeError || err instanceof SyntaxError ? 'Koneksi ke CQlass terganggu. Coba lagi.' : err.message;
    }
    if (current()) {
      if (view === 'yayasan-nilai' && !academic?.subjects.some(s => s.id === subjectId)) {
        subjectId = academic?.subjects[0]?.id || '';
      }
      draw();
    }
  }

  function render(id) {
    const token = getAuthToken();
    if (session !== token) {
      overview = academic = null;
      mtDetailsAt = saprasPhotosAt = 0;
      classId = academicClass = mtClass = subjectId = status = search = '';
      session = token;
    }
    view = route(id);
    load();
  }

  window.cqYayasan = {route, sidebar, render};
})();
