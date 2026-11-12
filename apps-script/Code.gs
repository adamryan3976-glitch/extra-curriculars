/**
 * Extra-Curriculars — Google Sheet backend
 *
 * Paste this whole file into Extensions > Apps Script of your Google Sheet,
 * then Deploy > New deployment > Web app
 *   Execute as: Me
 *   Who has access: Anyone
 * Copy the Web app URL into config.js on the website.
 */

const SHEET_NAME = 'Activities';
const HEADERS = ['id', 'week', 'days', 'name', 'period', 'location', 'teacher', 'grades', 'notes', 'updated'];
const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const VALID_PERIODS = ['Before School', 'Lunch', 'After School'];

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) sh = ss.insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    // Plain-text format stops Sheets turning dates/times into numbers.
    sh.getRange(1, 1, sh.getMaxRows(), HEADERS.length).setNumberFormat('@');
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  // Keep the header row in step with HEADERS if the layout ever changes.
  const header = sh.getRange(1, 1, 1, HEADERS.length);
  if (header.getDisplayValues()[0].join('|') !== HEADERS.join('|')) header.setValues([HEADERS]).setFontWeight('bold');
  return sh;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readAll_(sh) {
  const last = sh.getLastRow();
  if (last < 2) return [];
  const values = sh.getRange(2, 1, last - 1, HEADERS.length).getDisplayValues();
  return values
    .filter(function (row) { return row[0]; })
    .map(function (row) {
      const o = {};
      HEADERS.forEach(function (h, i) { o[h] = row[i]; });
      o.days = o.days ? o.days.split(',') : [];
      return o;
    });
}

function text_(v, max) {
  let s = String(v == null ? '' : v).trim().slice(0, max);
  // Stop anything being treated as a spreadsheet formula.
  if (/^[=+@]/.test(s)) s = "'" + s;
  return s;
}

function clean_(a) {
  if (!a || typeof a !== 'object') throw new Error('Missing activity');
  const week = String(a.week || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) throw new Error('Bad week');
  const days = (Array.isArray(a.days) ? a.days : []).filter(function (d) {
    return VALID_DAYS.indexOf(d) !== -1;
  });
  if (!days.length) throw new Error('Pick at least one day');
  const period = String(a.period || '');
  if (VALID_PERIODS.indexOf(period) === -1) throw new Error('Pick Before School, Lunch or After School');
  const name = text_(a.name, 120);
  if (!name) throw new Error('Activity name is required');
  return {
    id: text_(a.id, 64) || Utilities.getUuid(),
    week: week,
    days: days.join(','),
    name: name,
    period: period,
    location: text_(a.location, 120),
    teacher: text_(a.teacher, 120),
    grades: text_(a.grades, 60),
    notes: text_(a.notes, 300),
    updated: new Date().toISOString()
  };
}

function findRow_(sh, id) {
  const last = sh.getLastRow();
  if (last < 2) return -1;
  const ids = sh.getRange(2, 1, last - 1, 1).getDisplayValues();
  for (let i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2;
  }
  return -1;
}

function doGet(e) {
  try {
    const week = (e && e.parameter && e.parameter.week) || '';
    const rows = readAll_(getSheet_()).filter(function (r) { return !week || r.week === week; });
    return json_({ ok: true, activities: rows });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const body = JSON.parse(e.postData.contents);
    const sh = getSheet_();

    if (body.action === 'save') {
      const a = clean_(body.activity);
      const rowValues = [HEADERS.map(function (h) { return a[h]; })];
      const row = findRow_(sh, a.id);
      if (row > 0) {
        sh.getRange(row, 1, 1, HEADERS.length).setValues(rowValues);
      } else {
        const newRow = sh.getLastRow() + 1;
        sh.getRange(newRow, 1, 1, HEADERS.length).setNumberFormat('@').setValues(rowValues);
      }
      return json_({ ok: true, id: a.id });
    }

    if (body.action === 'delete') {
      const row = findRow_(sh, String(body.id || ''));
      if (row > 0) sh.deleteRow(row);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: 'Unknown action' });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  } finally {
    lock.releaseLock();
  }
}
