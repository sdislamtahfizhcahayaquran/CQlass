const DEFAULT_ROOT_FOLDER_ID = '18ot3_A8wgHJ0KUOTW6mlfdeyVV42k4JG';

function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) || 'health';
  if (action === 'health') return json_({ ok: true, service: 'SMP Rapor PTS Drive Backend', rootFolderId: DEFAULT_ROOT_FOLDER_ID });
  if (action === 'list') return json_({ ok: true, files: listRecent_(DEFAULT_ROOT_FOLDER_ID, 50) });
  return json_({ ok: false, error: 'Unknown action' });
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (body.action === 'upload') return json_(saveUpload_(body));
    if (body.action === 'uploadPdf') return json_(savePdf_(body));
    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function saveUpload_(body) {
  const root = DriveApp.getFolderById(body.rootFolderId || DEFAULT_ROOT_FOLDER_ID);
  const categoryFolder = getOrCreate_(root, body.category === 'homeroom' ? '02_UPLOAD_WALAS' : '01_UPLOAD_GURU');
  const classFolder = getOrCreate_(categoryFolder, clean_(body.className || 'Tanpa Kelas'));
  const subjectFolder = body.category === 'subject' ? getOrCreate_(classFolder, clean_(body.subject || 'Tanpa Mapel')) : classFolder;
  const bytes = Utilities.base64Decode(body.base64 || '');
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyyyMMdd-HHmmss');
  const teacher = clean_(body.teacher || 'Guru');
  const original = clean_(body.fileName || 'upload.xlsx');
  const name = stamp + '__' + teacher + '__' + original;
  const blob = Utilities.newBlob(bytes, body.mimeType || 'application/octet-stream', name);
  const file = subjectFolder.createFile(blob);
  file.setDescription(JSON.stringify({ category: body.category, className: body.className, subject: body.subject, teacher: body.teacher, schoolYear: body.schoolYear, semester: body.semester }));
  return { ok: true, id: file.getId(), name: file.getName(), url: file.getUrl() };
}

function savePdf_(body) {
  const root = DriveApp.getFolderById(body.rootFolderId || DEFAULT_ROOT_FOLDER_ID);
  const pdfRoot = getOrCreate_(root, '03_PDF_RAPOR');
  const classFolder = getOrCreate_(pdfRoot, clean_(body.className || 'Tanpa Kelas'));
  const bytes = Utilities.base64Decode(body.base64 || '');
  const blob = Utilities.newBlob(bytes, 'application/pdf', clean_(body.fileName || 'rapor.pdf'));
  const file = classFolder.createFile(blob);
  return { ok: true, id: file.getId(), name: file.getName(), url: file.getUrl() };
}

function getOrCreate_(parent, name) {
  const it = parent.getFoldersByName(name);
  return it.hasNext() ? it.next() : parent.createFolder(name);
}

function clean_(s) {
  return String(s || '').replace(/[\\/:*?"<>|]/g, '-').trim().substring(0, 120) || 'Untitled';
}

function listRecent_(rootId, limit) {
  const root = DriveApp.getFolderById(rootId);
  const out = [];
  walk_(root, out, limit || 50);
  return out.sort(function(a, b) { return b.updated.localeCompare(a.updated); }).slice(0, limit || 50);
}

function walk_(folder, out, limit) {
  const files = folder.getFiles();
  while (files.hasNext() && out.length < limit * 4) {
    const f = files.next();
    out.push({ id: f.getId(), name: f.getName(), url: f.getUrl(), updated: f.getLastUpdated().toISOString() });
  }
  const folders = folder.getFolders();
  while (folders.hasNext() && out.length < limit * 4) walk_(folders.next(), out, limit);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}