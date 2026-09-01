/* ==========================================================
   AKADEMIK V7.2 — INPUT NILAI AKADEMIK SUPABASE
   - Backend: bootstrap / load / save_component / save_tp
   - Tugas 1-5 + TP dinamis + WWP + ASAS
   - Navigasi seperti Excel
   - Paste dari Excel
   - Drag/fill nilai ke bawah
   ========================================================== */

const academicGridState = {
  assignments: [],
  assignmentId: '',
  academicYear: '2026/2027',
  semester: 1,

  assignment: null,
  objectives: [],
  students: [],
  canEdit: false,

  dirty: new Map(),
  loadToken: 0,

  pickerOpen: false,

  fill: {
    active: false,
    startInput: null,
    lastInput: null
  }
};


/* ==========================================================
   REQUEST SUPABASE
   ========================================================== */
async function academicGridRequest(action, payload = {}, timeoutMs = 30000){
  const token = getAuthToken();

  if(!token){
    throw new Error('Sesi login tidak ditemukan. Silakan login kembali.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try{
    const response = await fetch(ACADEMIC_SCORES_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_PUBLISHABLE_KEY,
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'x-session-token': token
      },
      body: JSON.stringify({
        action,
        ...payload
      })
    });

    const raw = await response.text();
    let data = {};

    try{
      data = raw ? JSON.parse(raw) : {};
    }catch(_){
      throw new Error(`Respons akademik bukan JSON. HTTP ${response.status}`);
    }

    if(!response.ok || data.success === false){
      const messages = {
        unknown_action: 'Versi halaman nilai tidak sesuai dengan backend.',
        session_invalid: 'Sesi login sudah tidak berlaku.',
        session_expired: 'Sesi login telah berakhir.',
        assignment_not_found: 'Penugasan guru tidak ditemukan.',
        assignment_forbidden: 'Anda tidak memiliki akses ke pembelajaran ini.',
        read_only: 'Nilai hanya dapat diubah oleh guru pengampu.',
        scores_empty: 'Tidak ada nilai yang dikirim.',
        assessment_type_invalid: 'Komponen nilai tidak valid.',
        learning_objective_required: 'Tujuan Pembelajaran belum dipilih.',
        learning_objective_forbidden: 'TP tidak sesuai dengan mata pelajaran ini.'
      };

      throw new Error(
        messages[data.error] ||
        data.detail ||
        data.error ||
        `HTTP ${response.status}`
      );
    }

    return data;

  }catch(err){
    if(err?.name === 'AbortError'){
      throw new Error('Server akademik terlalu lama merespons.');
    }

    throw err;

  }finally{
    clearTimeout(timer);
  }
}


/* ==========================================================
   STYLE
   ========================================================== */
function injectAcademicGridStyles(){
  if(document.getElementById('academic-grid-v72-style')) return;

  const style = document.createElement('style');
  style.id = 'academic-grid-v72-style';

  style.textContent = `

    .ag-head{
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:14px;
      flex-wrap:wrap;
    }

    .ag-filter-card{
      padding:22px 26px;
    }

    .ag-filter-title{
      font-size:18px;
      font-weight:800;
      color:var(--text);
      margin-bottom:18px;
    }

    .ag-filter-grid{
      display:grid;
      grid-template-columns:minmax(300px,2.1fr) minmax(170px,.9fr) minmax(160px,.8fr);
      gap:16px;
      align-items:end;
    }

    .ag-field label{
      display:block;
      margin-bottom:7px;
      font-size:11px;
      font-weight:800;
      color:var(--muted);
      text-transform:uppercase;
      letter-spacing:.035em;
    }

    .ag-readonly{
      min-height:48px;
      display:flex;
      align-items:center;
      padding:0 15px;
      border:1.5px solid #d9e6e6;
      border-radius:12px;
      background:#f3f8f8;
      color:#075f5d;
      font-weight:800;
      font-size:14px;
    }

    .ag-select{
      width:100%;
      height:48px;
      padding:0 42px 0 14px;
      border:1.5px solid #d5e3e3;
      border-radius:12px;
      background:
        linear-gradient(45deg,transparent 50%,#567170 50%) calc(100% - 18px) 20px/5px 5px no-repeat,
        linear-gradient(135deg,#567170 50%,transparent 50%) calc(100% - 13px) 20px/5px 5px no-repeat,
        #fff;
      appearance:none;
      -webkit-appearance:none;
      font:inherit;
      font-weight:700;
      color:var(--text);
      outline:none;
      cursor:pointer;
    }

    .ag-select:focus{
      border-color:var(--primary);
      box-shadow:0 0 0 3px rgba(10,110,110,.10);
    }


    /* CUSTOM ASSIGNMENT DROPDOWN */

    .ag-picker{
      position:relative;
    }

    .ag-picker-button{
      width:100%;
      min-height:52px;
      border:1.5px solid #d5e3e3;
      border-radius:12px;
      background:#fff;
      padding:9px 14px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      text-align:left;
      cursor:pointer;
      font:inherit;
      color:var(--text);
      transition:.15s;
    }

    .ag-picker-button:hover{
      border-color:#a9cecc;
    }

    .ag-picker-button.open,
    .ag-picker-button:focus{
      border-color:var(--primary);
      box-shadow:0 0 0 3px rgba(10,110,110,.10);
      outline:none;
    }

    .ag-picker-main{
      display:flex;
      flex-direction:column;
      min-width:0;
      line-height:1.25;
    }

    .ag-picker-class{
      font-size:13.5px;
      font-weight:850;
      color:#153f3e;
    }

    .ag-picker-subject{
      font-size:11.5px;
      font-weight:600;
      color:var(--muted);
      margin-top:3px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .ag-picker-chevron{
      width:18px;
      height:18px;
      flex:0 0 auto;
      color:#567170;
      transition:.15s;
    }

    .ag-picker-button.open .ag-picker-chevron{
      transform:rotate(180deg);
    }

    .ag-picker-menu{
      position:absolute;
      top:calc(100% + 7px);
      left:0;
      right:0;
      z-index:80;
      background:#fff;
      border:1px solid #d7e5e4;
      border-radius:14px;
      box-shadow:0 18px 42px rgba(25,70,68,.15);
      overflow:hidden;
    }

    .ag-picker-search-wrap{
      padding:10px;
      border-bottom:1px solid var(--border);
      background:#f8fbfb;
    }

    .ag-picker-search{
      width:100%;
      height:39px;
      padding:0 12px;
      border:1px solid var(--border);
      border-radius:9px;
      font:inherit;
      outline:none;
    }

    .ag-picker-search:focus{
      border-color:var(--primary);
    }

    .ag-picker-options{
      max-height:290px;
      overflow:auto;
      padding:5px;
    }

    .ag-picker-option{
      width:100%;
      border:0;
      background:#fff;
      border-radius:9px;
      padding:10px 11px;
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:12px;
      cursor:pointer;
      text-align:left;
      font:inherit;
    }

    .ag-picker-option:hover{
      background:#eef8f7;
    }

    .ag-picker-option.active{
      background:#e4f4f2;
    }

    .ag-picker-option-left{
      min-width:0;
      display:flex;
      flex-direction:column;
    }

    .ag-picker-option-class{
      font-size:12.5px;
      font-weight:850;
    }

    .ag-picker-option-subject{
      font-size:11px;
      color:var(--muted);
      margin-top:3px;
    }

    .ag-view-badge{
      font-size:9px;
      padding:4px 7px;
      border-radius:999px;
      background:#f0f3f3;
      color:#758583;
      font-weight:800;
      white-space:nowrap;
    }


    /* META */

    .ag-meta{
      display:flex;
      gap:7px;
      flex-wrap:wrap;
      margin:12px 0;
    }

    .ag-chip{
      display:inline-flex;
      align-items:center;
      height:30px;
      padding:0 11px;
      border-radius:999px;
      background:#e8f5f3;
      color:#116c67;
      font-size:10.5px;
      font-weight:850;
    }

    .ag-chip.gray{
      background:#f0f3f3;
      color:#617472;
    }

    .ag-chip.warn{
      background:#fff2de;
      color:#8e6500;
    }


    /* TABLE */

    .ag-table-card{
      padding:0;
      overflow:hidden;
    }

    .ag-table-toolbar{
      padding:17px 18px 13px;
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:center;
      flex-wrap:wrap;
      border-bottom:1px solid var(--border);
    }

    .ag-toolbar-title{
      font-size:15px;
      font-weight:850;
    }

    .ag-toolbar-sub{
      margin-top:3px;
      font-size:10.5px;
      color:var(--muted);
    }

    .ag-toolbar-actions{
      display:flex;
      align-items:center;
      gap:9px;
      flex-wrap:wrap;
    }

    .ag-save-state{
      font-size:10.5px;
      font-weight:750;
      color:#71817f;
    }

    .ag-save-state.dirty{
      color:#a46b00;
    }

    .ag-table-scroll{
      width:100%;
      overflow:auto;
      overscroll-behavior:contain;
      max-height:calc(100vh - 315px);
      min-height:330px;
    }

    .ag-table{
      border-collapse:separate;
      border-spacing:0;
      width:max-content;
      min-width:100%;
      font-size:11px;
    }

    .ag-table th{
      position:sticky;
      top:0;
      z-index:5;
      height:43px;
      padding:7px 8px;
      background:#edf6f5;
      border-right:1px solid #dce9e8;
      border-bottom:1px solid #cddfdd;
      color:#456664;
      font-size:10px;
      font-weight:850;
      text-align:center;
      white-space:nowrap;
    }

    .ag-table td{
      height:42px;
      padding:0;
      background:#fff;
      border-right:1px solid #e1ebea;
      border-bottom:1px solid #e4ecec;
      position:relative;
    }

    .ag-table tbody tr:hover td{
      background:#fbfdfd;
    }

    .ag-no{
      min-width:48px;
      width:48px;
      text-align:center;
      position:sticky !important;
      left:0;
      z-index:4;
      background:#fff !important;
    }

    th.ag-no{
      z-index:8;
      background:#edf6f5 !important;
    }

    .ag-name{
      min-width:215px;
      width:215px;
      position:sticky !important;
      left:48px;
      z-index:4;
      padding:7px 11px !important;
      background:#fff !important;
      box-shadow:3px 0 5px rgba(34,74,72,.04);
    }

    th.ag-name{
      z-index:8;
      background:#edf6f5 !important;
    }

    .ag-student-name{
      font-size:11px;
      font-weight:800;
      line-height:1.25;
      color:#183e3c;
    }

    .ag-student-nis{
      font-size:9px;
      color:#879895;
      margin-top:2px;
    }

    .ag-score-cell{
      width:64px;
      min-width:64px;
    }

    .ag-score-input{
      width:100%;
      height:41px;
      border:0;
      outline:none;
      text-align:center;
      background:transparent;
      color:#173f3d;
      font:inherit;
      font-size:11px;
      font-weight:750;
      padding:0 5px;
      border-radius:0;
    }

    .ag-score-input:focus{
      background:#fff;
      box-shadow:inset 0 0 0 2px var(--primary);
      position:relative;
      z-index:3;
    }

    .ag-score-cell.dirty{
      background:#fff9e8 !important;
    }

    .ag-score-input.invalid{
      background:#fff0ec;
      color:#b04433;
      box-shadow:inset 0 0 0 2px #db7463;
    }

    .ag-score-input[disabled]{
      background:#f6f8f8;
      color:#788785;
    }


    /* FILL HANDLE */

    .ag-fill-handle{
      width:7px;
      height:7px;
      position:absolute;
      right:0;
      bottom:0;
      background:var(--primary);
      cursor:crosshair;
      display:none;
      z-index:7;
    }

    .ag-score-cell:focus-within .ag-fill-handle{
      display:block;
    }

    .ag-fill-preview{
      background:#eaf7f5 !important;
      box-shadow:inset 0 0 0 1px #4ca9a3;
    }


    /* CALCULATED */

    .ag-calc{
      min-width:72px;
      padding:0 8px !important;
      text-align:center;
      font-weight:800;
      color:#335d5a;
      background:#f7faf9 !important;
    }

    .ag-na{
      min-width:76px;
      font-size:11.5px;
      color:#075f5d;
    }

    .ag-predicate{
      min-width:62px;
      font-weight:900;
      font-size:12px;
    }

    .ag-status{
      min-width:82px;
      padding:0 8px !important;
      text-align:center;
      background:#f7faf9 !important;
    }

    .ag-status-pill{
      display:inline-flex;
      padding:4px 8px;
      border-radius:999px;
      font-size:9px;
      font-weight:850;
    }

    .ag-status-pill.ok{
      background:#e8f7ef;
      color:#357352;
    }

    .ag-status-pill.bad{
      background:#fff0ec;
      color:#ad4c39;
    }


    /* TP TOOLTIP */

    .ag-tp-head{
      cursor:help;
    }


    /* FOOTER */

    .ag-footer{
      padding:11px 18px;
      display:flex;
      justify-content:space-between;
      gap:12px;
      flex-wrap:wrap;
      align-items:center;
      background:#fbfdfd;
      border-top:1px solid var(--border);
      color:#758683;
      font-size:10px;
    }


    /* EMPTY */

    .ag-loading{
      display:flex;
      align-items:center;
      gap:9px;
    }


    @media(max-width:850px){
      .ag-filter-grid{
        grid-template-columns:1fr;
      }

      .ag-table-scroll{
        max-height:calc(100vh - 380px);
      }

      .ag-name{
        min-width:170px;
        width:170px;
      }
    }
  `;

  document.head.appendChild(style);
}


/* ==========================================================
   RENDER MODULE
   ========================================================== */
function renderLegger(content){
  injectAcademicGridStyles();

  academicGridState.assignments = [];
  academicGridState.assignmentId = '';
  academicGridState.assignment = null;
  academicGridState.objectives = [];
  academicGridState.students = [];
  academicGridState.canEdit = false;
  academicGridState.dirty = new Map();
  academicGridState.loadToken++;

  content.innerHTML = `
    <div class="ag-head">
      <div>
        <div class="page-title">Input Nilai Akademik</div>
        <div class="page-sub">
          Isi Tugas, TP, WWP, dan ASAS dengan tampilan seperti spreadsheet.
        </div>
      </div>
    </div>

    <div id="academic-grid-root">
      <div class="card">
        <div class="ag-loading">
          <span class="spinner"
            style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)">
          </span>
          Menyiapkan pembelajaran...
        </div>
      </div>
    </div>
  `;

  academicGridBootstrap();
}


/* ==========================================================
   BOOTSTRAP
   ========================================================== */
async function academicGridBootstrap(){
  const root = document.getElementById('academic-grid-root');
  if(!root) return;

  const token = ++academicGridState.loadToken;

  try{
    const result = await academicGridRequest('bootstrap', {
      academic_year: academicGridState.academicYear,
      semester_no: academicGridState.semester
    });

    if(token !== academicGridState.loadToken) return;

    academicGridState.assignments =
      Array.isArray(result.assignments) ? result.assignments : [];

    academicGridState.academicYear =
      result.academic_year || academicGridState.academicYear;

    academicGridState.semester =
      Number(result.semester_no ?? result.semester) || academicGridState.semester;

    if(!academicGridState.assignments.length){
      root.innerHTML = `
        <div class="empty-state">
          <div class="icon">—</div>
          Belum ada penugasan guru pada periode ini.
        </div>
      `;
      return;
    }

    const oldId = academicGridState.assignmentId;

    const validOld = academicGridState.assignments
      .some(a => String(a.id) === String(oldId));

    academicGridState.assignmentId =
      validOld
        ? oldId
        : academicGridState.assignments[0].id;

    renderAcademicGridFilters();

    await academicGridLoad();

  }catch(err){
    if(token !== academicGridState.loadToken) return;

    root.innerHTML = `
      <div class="empty-state">
        <div class="icon">—</div>
        ${escapeHtml(err.message || 'Gagal memuat data akademik.')}
      </div>
    `;
  }
}


/* ==========================================================
   FILTER UI
   ========================================================== */
function academicSelectedAssignment(){
  return academicGridState.assignments.find(
    a => String(a.id) === String(academicGridState.assignmentId)
  ) || null;
}


function renderAcademicGridFilters(){
  const root = document.getElementById('academic-grid-root');
  if(!root) return;

  const selected = academicSelectedAssignment();

  root.innerHTML = `
    <div class="card ag-filter-card">
      <div class="ag-filter-title">Pilih Pembelajaran</div>

      <div class="ag-filter-grid">

        <div class="ag-field">
          <label>Kelas & Mata Pelajaran</label>

          <div class="ag-picker">
            <button
              type="button"
              class="ag-picker-button"
              id="ag-picker-button"
              onclick="academicToggleAssignmentPicker(event)"
            >
              <span class="ag-picker-main">
                <span class="ag-picker-class">
                  ${escapeHtml(selected?.class_name || 'Pilih kelas')}
                </span>
                <span class="ag-picker-subject">
                  ${escapeHtml(selected?.subject_name || 'Pilih mata pelajaran')}
                </span>
              </span>

              <svg class="ag-picker-chevron"
                   viewBox="0 0 24 24"
                   fill="none"
                   stroke="currentColor"
                   stroke-width="2">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>

            <div
              id="ag-picker-menu"
              class="ag-picker-menu"
              style="display:none"
            >
              <div class="ag-picker-search-wrap">
                <input
                  id="ag-picker-search"
                  class="ag-picker-search"
                  placeholder="Cari kelas atau mata pelajaran..."
                  oninput="academicFilterAssignmentOptions()"
                  autocomplete="off"
                >
              </div>

              <div class="ag-picker-options" id="ag-picker-options">
                ${academicGridState.assignments.map(a => `
                  <button
                    type="button"
                    class="ag-picker-option
                      ${String(a.id)===String(academicGridState.assignmentId) ? 'active' : ''}"
                    data-search="${escapeHtml(
                      `${a.class_name || ''} ${a.subject_name || ''}`.toLowerCase()
                    )}"
                    onclick="academicChooseAssignment('${escapeHtml(a.id)}')"
                  >
                    <span class="ag-picker-option-left">
                      <span class="ag-picker-option-class">
                        ${escapeHtml(a.class_name || '-')}
                      </span>
                      <span class="ag-picker-option-subject">
                        ${escapeHtml(a.subject_name || '-')}
                      </span>
                    </span>

                    ${a.can_edit === false
                      ? '<span class="ag-view-badge">LIHAT</span>'
                      : ''
                    }
                  </button>
                `).join('')}
              </div>
            </div>
          </div>
        </div>


        <div class="ag-field">
          <label>Tahun Ajaran</label>
          <div class="ag-readonly">
            ${escapeHtml(academicGridState.academicYear)}
          </div>
        </div>


        <div class="ag-field">
          <label>Semester</label>

          <select
            id="ag-semester"
            class="ag-select"
            onchange="academicSemesterChanged(this.value)"
          >
            <option value="1"
              ${Number(academicGridState.semester) === 1 ? 'selected' : ''}>
              Semester 1
            </option>

            <option value="2"
              ${Number(academicGridState.semester) === 2 ? 'selected' : ''}>
              Semester 2
            </option>
          </select>
        </div>

      </div>
    </div>

    <div id="academic-grid-table-area"></div>
  `;
}


function academicToggleAssignmentPicker(event){
  event?.stopPropagation();

  const menu = document.getElementById('ag-picker-menu');
  const button = document.getElementById('ag-picker-button');

  if(!menu || !button) return;

  const open = menu.style.display === 'none';

  menu.style.display = open ? 'block' : 'none';
  button.classList.toggle('open', open);

  academicGridState.pickerOpen = open;

  if(open){
    setTimeout(() => {
      const search = document.getElementById('ag-picker-search');
      search?.focus();
      search?.select();
    }, 20);
  }
}


function academicCloseAssignmentPicker(){
  const menu = document.getElementById('ag-picker-menu');
  const button = document.getElementById('ag-picker-button');

  if(menu) menu.style.display = 'none';
  if(button) button.classList.remove('open');

  academicGridState.pickerOpen = false;
}


function academicFilterAssignmentOptions(){
  const q =
    (document.getElementById('ag-picker-search')?.value || '')
      .trim()
      .toLowerCase();

  document
    .querySelectorAll('#ag-picker-options .ag-picker-option')
    .forEach(option => {
      option.style.display =
        !q || (option.dataset.search || '').includes(q)
          ? 'flex'
          : 'none';
    });
}


async function academicChooseAssignment(id){
  academicCloseAssignmentPicker();

  if(String(id) === String(academicGridState.assignmentId)){
    return;
  }

  if(academicGridState.dirty.size){
    const lanjut = confirm(
      'Ada perubahan nilai yang belum disimpan. Pindah pembelajaran tanpa menyimpan?'
    );

    if(!lanjut) return;
  }

  academicGridState.assignmentId = id;
  academicGridState.dirty = new Map();

  renderAcademicGridFilters();
  await academicGridLoad();
}


async function academicSemesterChanged(value){
  const next = Number(value) || 1;

  if(next === academicGridState.semester) return;

  if(academicGridState.dirty.size){
    const lanjut = confirm(
      'Ada perubahan nilai yang belum disimpan. Ganti semester tanpa menyimpan?'
    );

    if(!lanjut){
      const el = document.getElementById('ag-semester');
      if(el) el.value = String(academicGridState.semester);
      return;
    }
  }

  academicGridState.semester = next;
  academicGridState.assignmentId = '';
  academicGridState.dirty = new Map();

  await academicGridBootstrap();
}


/* ==========================================================
   LOAD MATRIX
   ========================================================== */
async function academicGridLoad(){
  const area = document.getElementById('academic-grid-table-area');

  if(!area || !academicGridState.assignmentId) return;

  const token = ++academicGridState.loadToken;

  area.innerHTML = `
    <div class="card">
      <div class="ag-loading">
        <span class="spinner"
          style="border-top-color:var(--primary);border-color:rgba(10,110,110,.25)">
        </span>
        Memuat siswa dan nilai...
      </div>
    </div>
  `;

  try{
    const result = await academicGridRequest('load', {
      assignment_id: academicGridState.assignmentId,
      academic_year: academicGridState.academicYear,
      semester_no: academicGridState.semester
    });

    if(token !== academicGridState.loadToken) return;

    academicGridState.assignment = {
      id: academicGridState.assignmentId,
      class_name: result.class_name || '',
      subject_name: result.subject_name || ''
    };

    academicGridState.objectives =
      Array.isArray(result.objectives)
        ? result.objectives
        : [];

    academicGridState.students =
      Array.isArray(result.students)
        ? result.students
        : [];

    academicGridState.canEdit =
      result.can_edit !== false;

    academicGridState.dirty = new Map();

    renderAcademicGridTable();

  }catch(err){
    if(token !== academicGridState.loadToken) return;

    area.innerHTML = `
      <div class="empty-state">
        <div class="icon">—</div>
        ${escapeHtml(err.message || 'Gagal memuat nilai akademik.')}
      </div>
    `;
  }
}


/* ==========================================================
   DATA HELPERS
   ========================================================== */
const ACADEMIC_COMPONENTS = [
  'TUGAS_1',
  'TUGAS_2',
  'TUGAS_3',
  'TUGAS_4',
  'TUGAS_5'
];


function academicNumeric(value){
  if(value === '' || value === null || value === undefined){
    return null;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}


function academicComponentScore(student, type){
  return academicNumeric(
    student?.components?.[type]?.score
  );
}


function academicTPScore(student, objectiveId){
  const row = (student?.tp || []).find(
    x => String(x.learning_objective_id) === String(objectiveId)
  );

  return academicNumeric(row?.score);
}


function academicSetComponentScore(student, type, value){
  if(!student.components) student.components = {};

  if(!student.components[type]){
    student.components[type] = {
      score: null,
      notes: null
    };
  }

  student.components[type].score = value;
}


function academicSetTPScore(student, objectiveId, value){
  if(!Array.isArray(student.tp)){
    student.tp = [];
  }

  let row = student.tp.find(
    x => String(x.learning_objective_id) === String(objectiveId)
  );

  if(!row){
    const objective = academicGridState.objectives.find(
      x => String(x.id) === String(objectiveId)
    );

    row = {
      learning_objective_id: objectiveId,
      code: objective?.code || '',
      score: null,
      notes: null
    };

    student.tp.push(row);
  }

  row.score = value;
}


function academicAverage(values){
  const valid = values.filter(v => v !== null);

  if(!valid.length) return null;

  return valid.reduce((sum, n) => sum + n, 0) / valid.length;
}


function academicTaskAverage(student){
  return academicAverage(
    ACADEMIC_COMPONENTS.map(type =>
      academicComponentScore(student, type)
    )
  );
}


function academicTPAverage(student){
  return academicAverage(
    academicGridState.objectives.map(o =>
      academicTPScore(student, o.id)
    )
  );
}


function academicStudentComplete(student){
  const tasksComplete =
    ACADEMIC_COMPONENTS.every(
      type => academicComponentScore(student, type) !== null
    );

  const tpComplete =
    academicGridState.objectives.length > 0 &&
    academicGridState.objectives.every(
      o => academicTPScore(student, o.id) !== null
    );

  const wwpComplete =
    academicComponentScore(student, 'WWP') !== null;

  const asasComplete =
    academicComponentScore(student, 'ASAS') !== null;

  return (
    tasksComplete &&
    tpComplete &&
    wwpComplete &&
    asasComplete
  );
}


function academicFinalScore(student){
  if(!academicStudentComplete(student)){
    return null;
  }

  const taskAvg = academicTaskAverage(student);
  const tpAvg = academicTPAverage(student);
  const wwp = academicComponentScore(student, 'WWP');
  const asas = academicComponentScore(student, 'ASAS');

  return (
    (taskAvg * 0.10) +
    (tpAvg * 0.30) +
    (wwp * 0.10) +
    (asas * 0.50)
  );
}


function academicPredicate(score){
  if(score === null) return '—';
  if(score >= 89) return 'A';
  if(score >= 82) return 'B';
  if(score >= 75) return 'C';
  return 'D';
}


function academicFormatScore(value){
  if(value === null || value === undefined){
    return '—';
  }

  const n = Math.round(Number(value) * 100) / 100;

  if(Number.isInteger(n)){
    return String(n);
  }

  return n
    .toFixed(2)
    .replace(/0+$/, '')
    .replace(/\.$/, '');
}


/* ==========================================================
   TABLE
   ========================================================== */
function renderAcademicGridTable(){
  const area = document.getElementById('academic-grid-table-area');
  if(!area) return;

  const students = academicGridState.students;
  const objectives = academicGridState.objectives;

  if(!students.length){
    area.innerHTML = `
      <div class="empty-state">
        <div class="icon">—</div>
        Belum ada siswa aktif pada kelas ini.
      </div>
    `;
    return;
  }

  const assignment = academicSelectedAssignment();

  area.innerHTML = `
    <div class="ag-meta">
      <span class="ag-chip">
        ${students.length} siswa
      </span>

      <span class="ag-chip">
        ${escapeHtml(assignment?.class_name || academicGridState.assignment?.class_name || '')}
      </span>

      <span class="ag-chip">
        ${escapeHtml(assignment?.subject_name || academicGridState.assignment?.subject_name || '')}
      </span>

      <span class="ag-chip gray">
        ${objectives.length} TP
      </span>

      ${academicGridState.canEdit
        ? ''
        : '<span class="ag-chip warn">Mode Lihat</span>'
      }
    </div>


    <div class="card ag-table-card">

      <div class="ag-table-toolbar">
        <div>
          <div class="ag-toolbar-title">
            Nilai Siswa
          </div>

          <div class="ag-toolbar-sub">
            ← → pindah kolom · Enter / ↓ turun · Shift+Enter / ↑ naik ·
            Ctrl+V tempel dari Excel · tarik titik pojok sel untuk mengisi ke bawah.
          </div>
        </div>

        <div class="ag-toolbar-actions">
          <span
            class="ag-save-state"
            id="ag-save-state"
          >
            Semua perubahan tersimpan
          </span>

          ${academicGridState.canEdit
            ? `
              <button
                class="btn btn-sm"
                id="ag-save-button"
                onclick="academicGridSave()"
                disabled
              >
                Simpan Perubahan
              </button>
            `
            : ''
          }
        </div>
      </div>


      <div class="ag-table-scroll">
        <table class="ag-table" id="academic-score-table">

          <thead>
            <tr>

              <th class="ag-no">No</th>

              <th class="ag-name">
                Nama Siswa
              </th>

              ${ACADEMIC_COMPONENTS.map((_, i) => `
                <th title="Tugas ${i + 1}">
                  T${i + 1}
                </th>
              `).join('')}

              <th>
                RT
              </th>

              ${objectives.map((o, i) => `
                <th
                  class="ag-tp-head"
                  title="${escapeHtml(
                    `${o.code || `TP${i+1}`} — ${o.topic || o.description || ''}`
                  )}"
                >
                  ${escapeHtml(o.code || `TP${i + 1}`)}
                </th>
              `).join('')}

              <th>
                RTP
              </th>

              <th>
                WWP
              </th>

              <th>
                ASAS
              </th>

              <th>
                NA
              </th>

              <th>
                Pred.
              </th>

              <th>
                Status
              </th>

            </tr>
          </thead>


          <tbody>

            ${students.map((student, rowIndex) => {

              const taskAvg =
                academicTaskAverage(student);

              const tpAvg =
                academicTPAverage(student);

              const finalScore =
                academicFinalScore(student);

              const predicate =
                academicPredicate(finalScore);

              const status =
                finalScore === null
                  ? '—'
                  : finalScore >= 75
                    ? 'Tuntas'
                    : 'Belum';

              return `
                <tr
                  data-student-id="${escapeHtml(student.id)}"
                  data-row="${rowIndex}"
                >

                  <td class="ag-no">
                    ${rowIndex + 1}
                  </td>

                  <td class="ag-name">
                    <div class="ag-student-name">
                      ${escapeHtml(student.name)}
                    </div>

                    <div class="ag-student-nis">
                      ${escapeHtml(student.nis || student.nisn || '')}
                    </div>
                  </td>


                  ${ACADEMIC_COMPONENTS.map((type, colIndex) =>
                    academicGridInputCell(
                      student,
                      rowIndex,
                      colIndex,
                      {
                        kind: 'component',
                        type
                      },
                      academicComponentScore(student, type)
                    )
                  ).join('')}


                  <td
                    class="ag-calc"
                    data-calc="task-average"
                  >
                    ${academicFormatScore(taskAvg)}
                  </td>


                  ${objectives.map((objective, index) =>
                    academicGridInputCell(
                      student,
                      rowIndex,
                      ACADEMIC_COMPONENTS.length + index,
                      {
                        kind: 'tp',
                        objectiveId: objective.id
                      },
                      academicTPScore(student, objective.id)
                    )
                  ).join('')}


                  <td
                    class="ag-calc"
                    data-calc="tp-average"
                  >
                    ${academicFormatScore(tpAvg)}
                  </td>


                  ${academicGridInputCell(
                    student,
                    rowIndex,
                    ACADEMIC_COMPONENTS.length + objectives.length,
                    {
                      kind: 'component',
                      type: 'WWP'
                    },
                    academicComponentScore(student, 'WWP')
                  )}


                  ${academicGridInputCell(
                    student,
                    rowIndex,
                    ACADEMIC_COMPONENTS.length + objectives.length + 1,
                    {
                      kind: 'component',
                      type: 'ASAS'
                    },
                    academicComponentScore(student, 'ASAS')
                  )}


                  <td
                    class="ag-calc ag-na"
                    data-calc="final"
                  >
                    ${academicFormatScore(finalScore)}
                  </td>


                  <td
                    class="ag-calc ag-predicate"
                    data-calc="predicate"
                  >
                    ${predicate}
                  </td>


                  <td
                    class="ag-status"
                    data-calc="status"
                  >
                    ${
                      status === '—'
                        ? '—'
                        : `<span class="ag-status-pill ${status==='Tuntas'?'ok':'bad'}">
                            ${status}
                           </span>`
                    }
                  </td>

                </tr>
              `;

            }).join('')}

          </tbody>

        </table>
      </div>


      <div class="ag-footer">
        <span>
          Nilai Akhir =
          Rata Tugas 10% +
          Rata TP 30% +
          WWP 10% +
          ASAS 50%.
        </span>

        <span>
          Nilai Akhir tampil setelah seluruh komponen siswa terisi.
        </span>
      </div>

    </div>
  `;

  academicUpdateSaveState();
}


function academicGridInputCell(
  student,
  rowIndex,
  colIndex,
  config,
  value
){
  const disabled =
    academicGridState.canEdit ? '' : 'disabled';

  let dataset = '';

  if(config.kind === 'component'){
    dataset = `
      data-kind="component"
      data-component="${escapeHtml(config.type)}"
    `;
  }else{
    dataset = `
      data-kind="tp"
      data-objective-id="${escapeHtml(config.objectiveId)}"
    `;
  }

  return `
    <td
      class="ag-score-cell"
      data-row="${rowIndex}"
      data-col="${colIndex}"
    >

      <input
        class="ag-score-input"
        type="text"
        inputmode="decimal"
        autocomplete="off"

        value="${
          value === null
            ? ''
            : escapeHtml(academicFormatScore(value))
        }"

        data-student-id="${escapeHtml(student.id)}"
        data-row="${rowIndex}"
        data-col="${colIndex}"

        ${dataset}
        ${disabled}

        onfocus="this.select()"
        oninput="academicGridInputChanged(this)"
        onkeydown="academicGridKeydown(event,this)"
        onpaste="academicGridPaste(event,this)"
      >

      ${academicGridState.canEdit
        ? `
          <span
            class="ag-fill-handle"
            title="Tarik ke bawah"
            onpointerdown="academicFillStart(event,this)"
          ></span>
        `
        : ''
      }

    </td>
  `;
}


/* ==========================================================
   INPUT
   ========================================================== */
function academicParseInput(input){
  const raw =
    String(input.value || '')
      .trim()
      .replace(',', '.');

  if(raw === ''){
    input.classList.remove('invalid');
    return null;
  }

  if(!/^(?:\\d{1,3})(?:\\.\\d{0,2})?$/.test(raw)){
    input.classList.add('invalid');
    return undefined;
  }

  const value = Number(raw);

  if(
    !Number.isFinite(value) ||
    value < 0 ||
    value > 100
  ){
    input.classList.add('invalid');
    return undefined;
  }

  input.classList.remove('invalid');

  return value;
}


function academicGridInputChanged(input){
  const value = academicParseInput(input);

  if(value === undefined){
    return;
  }

  academicApplyInputValue(input, value, true);
}


function academicApplyInputValue(
  input,
  value,
  markDirty = true
){
  const studentId = input.dataset.studentId;

  const student = academicGridState.students.find(
    s => String(s.id) === String(studentId)
  );

  if(!student) return;

  if(input.dataset.kind === 'tp'){

    const objectiveId =
      input.dataset.objectiveId;

    academicSetTPScore(
      student,
      objectiveId,
      value
    );

    if(markDirty){
      const key =
        `${studentId}|TP|${objectiveId}`;

      academicGridState.dirty.set(key, {
        kind: 'tp',
        student_id: studentId,
        learning_objective_id: objectiveId,
        score: value
      });
    }

  }else{

    const type =
      input.dataset.component;

    academicSetComponentScore(
      student,
      type,
      value
    );

    if(markDirty){
      const key =
        `${studentId}|${type}`;

      academicGridState.dirty.set(key, {
        kind: 'component',
        student_id: studentId,
        assessment_type: type,
        score: value
      });
    }
  }

  input
    .closest('.ag-score-cell')
    ?.classList.toggle('dirty', markDirty);

  academicRefreshStudentRow(studentId);
  academicUpdateSaveState();
}


/* ==========================================================
   CALCULATIONS
   ========================================================== */
function academicRefreshStudentRow(studentId){
  const row = document.querySelector(
    `#academic-score-table tbody tr[data-student-id="${CSS.escape(String(studentId))}"]`
  );

  if(!row) return;

  const student = academicGridState.students.find(
    s => String(s.id) === String(studentId)
  );

  if(!student) return;

  const taskAvg =
    academicTaskAverage(student);

  const tpAvg =
    academicTPAverage(student);

  const finalScore =
    academicFinalScore(student);

  const predicate =
    academicPredicate(finalScore);

  const status =
    finalScore === null
      ? '—'
      : finalScore >= 75
        ? 'Tuntas'
        : 'Belum';

  const taskEl =
    row.querySelector('[data-calc="task-average"]');

  const tpEl =
    row.querySelector('[data-calc="tp-average"]');

  const finalEl =
    row.querySelector('[data-calc="final"]');

  const predEl =
    row.querySelector('[data-calc="predicate"]');

  const statusEl =
    row.querySelector('[data-calc="status"]');

  if(taskEl)
    taskEl.textContent =
      academicFormatScore(taskAvg);

  if(tpEl)
    tpEl.textContent =
      academicFormatScore(tpAvg);

  if(finalEl)
    finalEl.textContent =
      academicFormatScore(finalScore);

  if(predEl)
    predEl.textContent =
      predicate;

  if(statusEl){
    statusEl.innerHTML =
      status === '—'
        ? '—'
        : `
          <span class="ag-status-pill ${status==='Tuntas'?'ok':'bad'}">
            ${status}
          </span>
        `;
  }
}


/* ==========================================================
   KEYBOARD NAVIGATION
   ========================================================== */
function academicGridInputs(){
  return [
    ...document.querySelectorAll(
      '#academic-score-table tbody .ag-score-input'
    )
  ];
}


function academicInputAt(row, col){
  return document.querySelector(
    `#academic-score-table .ag-score-input[data-row="${row}"][data-col="${col}"]`
  );
}


function academicGridKeydown(event, input){
  const key = event.key;

  const row =
    Number(input.dataset.row);

  const col =
    Number(input.dataset.col);

  let target = null;


  if(key === 'ArrowLeft'){
    event.preventDefault();

    target =
      academicInputAt(row, col - 1);
  }


  else if(key === 'ArrowRight'){
    event.preventDefault();

    target =
      academicInputAt(row, col + 1);
  }


  else if(key === 'ArrowUp'){
    event.preventDefault();

    target =
      academicInputAt(row - 1, col);
  }


  else if(key === 'ArrowDown'){
    event.preventDefault();

    target =
      academicInputAt(row + 1, col);
  }


  else if(key === 'Enter'){
    event.preventDefault();

    target =
      academicInputAt(
        row + (event.shiftKey ? -1 : 1),
        col
      );
  }


  if(target){
    target.focus();
    target.select();
  }
}


/* ==========================================================
   PASTE FROM EXCEL
   ========================================================== */
function academicGridPaste(event, input){
  if(!academicGridState.canEdit) return;

  const text =
    event.clipboardData?.getData('text');

  if(!text) return;

  if(
    !text.includes('\\t') &&
    !text.includes('\\n') &&
    !text.includes('\\r')
  ){
    return;
  }

  event.preventDefault();

  const startRow =
    Number(input.dataset.row);

  const startCol =
    Number(input.dataset.col);

  const matrix = text
    .replace(/\\r/g, '')
    .split('\\n')
    .filter((row, index, arr) =>
      !(index === arr.length - 1 && row === '')
    )
    .map(row => row.split('\\t'));

  let filled = 0;

  matrix.forEach((rowValues, rowOffset) => {

    rowValues.forEach((raw, colOffset) => {

      const target =
        academicInputAt(
          startRow + rowOffset,
          startCol + colOffset
        );

      if(!target) return;

      const cleaned =
        String(raw || '')
          .trim()
          .replace(',', '.');

      if(cleaned === ''){

        target.value = '';
        target.classList.remove('invalid');

        academicApplyInputValue(
          target,
          null,
          true
        );

        filled++;
        return;
      }

      const n = Number(cleaned);

      if(
        !Number.isFinite(n) ||
        n < 0 ||
        n > 100
      ){
        return;
      }

      target.value =
        academicFormatScore(n);

      target.classList.remove('invalid');

      academicApplyInputValue(
        target,
        n,
        true
      );

      filled++;
    });
  });

  if(filled){
    showToast(
      `${filled} nilai ditempel dari clipboard.`
    );
  }
}


/* ==========================================================
   FILL HANDLE
   ========================================================== */
function academicFillStart(event, handle){
  if(!academicGridState.canEdit) return;

  event.preventDefault();
  event.stopPropagation();

  const cell =
    handle.closest('.ag-score-cell');

  const input =
    cell?.querySelector('.ag-score-input');

  if(!input) return;

  input.focus();

  academicGridState.fill.active = true;
  academicGridState.fill.startInput = input;
  academicGridState.fill.lastInput = input;

  document.body.style.userSelect = 'none';

  document.addEventListener(
    'pointermove',
    academicFillMove
  );

  document.addEventListener(
    'pointerup',
    academicFillEnd,
    { once:true }
  );
}


function academicFillMove(event){
  if(!academicGridState.fill.active) return;

  const element =
    document.elementFromPoint(
      event.clientX,
      event.clientY
    );

  const cell =
    element?.closest?.('.ag-score-cell');

  const target =
    cell?.querySelector('.ag-score-input');

  if(!target) return;

  const start =
    academicGridState.fill.startInput;

  if(
    Number(target.dataset.col) !==
    Number(start.dataset.col)
  ){
    return;
  }

  academicGridState.fill.lastInput = target;

  document
    .querySelectorAll('.ag-fill-preview')
    .forEach(el =>
      el.classList.remove('ag-fill-preview')
    );

  const startRow =
    Number(start.dataset.row);

  const endRow =
    Number(target.dataset.row);

  const min =
    Math.min(startRow, endRow);

  const max =
    Math.max(startRow, endRow);

  for(let row = min; row <= max; row++){
    const inp =
      academicInputAt(
        row,
        Number(start.dataset.col)
      );

    inp?.closest('.ag-score-cell')
      ?.classList.add('ag-fill-preview');
  }
}


function academicFillEnd(){
  if(!academicGridState.fill.active) return;

  document.removeEventListener(
    'pointermove',
    academicFillMove
  );

  document.body.style.userSelect = '';

  const start =
    academicGridState.fill.startInput;

  const end =
    academicGridState.fill.lastInput;

  academicGridState.fill.active = false;

  document
    .querySelectorAll('.ag-fill-preview')
    .forEach(el =>
      el.classList.remove('ag-fill-preview')
    );

  if(!start || !end) return;

  const parsed =
    academicParseInput(start);

  if(parsed === undefined) return;

  const startRow =
    Number(start.dataset.row);

  const endRow =
    Number(end.dataset.row);

  const col =
    Number(start.dataset.col);

  const min =
    Math.min(startRow, endRow);

  const max =
    Math.max(startRow, endRow);

  let count = 0;

  for(let row = min; row <= max; row++){

    const target =
      academicInputAt(row, col);

    if(!target) continue;

    target.value =
      parsed === null
        ? ''
        : academicFormatScore(parsed);

    target.classList.remove('invalid');

    academicApplyInputValue(
      target,
      parsed,
      true
    );

    count++;
  }

  if(count > 1){
    showToast(
      `${count} sel diisi dengan nilai yang sama.`
    );
  }
}


/* ==========================================================
   SAVE STATE
   ========================================================== */
function academicUpdateSaveState(){
  const count =
    academicGridState.dirty.size;

  const button =
    document.getElementById('ag-save-button');

  const state =
    document.getElementById('ag-save-state');

  if(button){
    button.disabled =
      count === 0;

    button.textContent =
      count
        ? `Simpan Perubahan (${count})`
        : 'Simpan Perubahan';
  }

  if(state){
    state.textContent =
      count
        ? `${count} nilai belum disimpan`
        : 'Semua perubahan tersimpan';

    state.classList.toggle(
      'dirty',
      count > 0
    );
  }
}


/* ==========================================================
   SAVE
   ========================================================== */
async function academicGridSave(){
  if(
    !academicGridState.canEdit ||
    !academicGridState.dirty.size
  ){
    return;
  }

  const invalid =
    document.querySelector(
      '#academic-score-table .ag-score-input.invalid'
    );

  if(invalid){
    showToast(
      'Masih ada nilai yang tidak valid. Gunakan angka 0–100.',
      true
    );

    invalid.focus();
    return;
  }

  const button =
    document.getElementById('ag-save-button');

  const changes = [
    ...academicGridState.dirty.values()
  ];

  if(button){
    button.disabled = true;
    button.innerHTML =
      '<span class="spinner"></span>Menyimpan...';
  }


  try{

    /* ----------------------------------
       GROUP COMPONENTS
       ---------------------------------- */

    const componentGroups = new Map();

    changes
      .filter(x => x.kind === 'component')
      .forEach(change => {

        const type =
          change.assessment_type;

        if(!componentGroups.has(type)){
          componentGroups.set(type, []);
        }

        componentGroups.get(type).push({
          student_id: change.student_id,
          score: change.score
        });
      });


    /* ----------------------------------
       GROUP TP
       ---------------------------------- */

    const tpGroups = new Map();

    changes
      .filter(x => x.kind === 'tp')
      .forEach(change => {

        const objectiveId =
          change.learning_objective_id;

        if(!tpGroups.has(objectiveId)){
          tpGroups.set(objectiveId, []);
        }

        tpGroups.get(objectiveId).push({
          student_id: change.student_id,
          score: change.score
        });
      });


    let saved = 0;


    /* ----------------------------------
       SAVE COMPONENTS
       ---------------------------------- */

    for(const [assessmentType, scores]
      of componentGroups.entries()){

      const result =
        await academicGridRequest(
          'save_component',
          {
            assignment_id:
              academicGridState.assignmentId,

            academic_year:
              academicGridState.academicYear,

            semester_no:
              academicGridState.semester,

            assessment_type:
              assessmentType,

            scores
          },
          45000
        );

      saved +=
        Number(result.saved) || 0;
    }


    /* ----------------------------------
       SAVE TP
       ---------------------------------- */

    for(const [objectiveId, scores]
      of tpGroups.entries()){

      const result =
        await academicGridRequest(
          'save_tp',
          {
            assignment_id:
              academicGridState.assignmentId,

            academic_year:
              academicGridState.academicYear,

            semester_no:
              academicGridState.semester,

            learning_objective_id:
              objectiveId,

            scores
          },
          45000
        );

      saved +=
        Number(result.saved) || 0;
    }


    academicGridState.dirty =
      new Map();

    document
      .querySelectorAll(
        '#academic-score-table .ag-score-cell.dirty'
      )
      .forEach(cell =>
        cell.classList.remove('dirty')
      );

    academicUpdateSaveState();

    showToast(
      `${saved || changes.length} nilai berhasil disimpan.`
    );


    /* baca ulang dari database */
    await academicGridLoad();


  }catch(err){

    showToast(
      err.message ||
      'Nilai belum berhasil disimpan.',
      true
    );

    academicUpdateSaveState();


  }finally{

    const b =
      document.getElementById('ag-save-button');

    if(b){
      b.disabled =
        academicGridState.dirty.size === 0;

      b.textContent =
        academicGridState.dirty.size
          ? `Simpan Perubahan (${academicGridState.dirty.size})`
          : 'Simpan Perubahan';
    }
  }
}


/* ==========================================================
   CLOSE DROPDOWN
   ========================================================== */
document.addEventListener('click', event => {
  if(
    academicGridState.pickerOpen &&
    !event.target.closest('.ag-picker')
  ){
    academicCloseAssignmentPicker();
  }
});
