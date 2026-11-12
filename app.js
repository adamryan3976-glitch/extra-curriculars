(function () {
  'use strict';

  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  // ---------- Dates ----------
  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function parseIso(s) {
    var p = s.split('-').map(Number);
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function mondayOf(d) {
    var x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
    return x;
  }
  function addDays(d, n) { var x = new Date(d); x.setDate(x.getDate() + n); return x; }
  // The week teachers are planning for. Newsletters go out Friday, so the
  // planning week rolls over on Sunday: from Sunday onward it's the Monday
  // 8 days after that Sunday (i.e. the week after next).
  function planningWeek(today) {
    var d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var lastSunday = addDays(d, -d.getDay());
    return addDays(lastSunday, 8);
  }
  function longDate(d) { return MONTHS[d.getMonth()] + ' ' + d.getDate(); }
  function weekLabel(mondayIso) {
    var m = parseIso(mondayIso), f = addDays(m, 4);
    var end = m.getMonth() === f.getMonth() ? f.getDate() : longDate(f);
    return longDate(m) + '–' + end;
  }
  function dayDate(mondayIso, day) {
    return addDays(parseIso(mondayIso), DAYS.indexOf(day));
  }

  // ---------- Formatting ----------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var PERIODS = ['Before School', 'Lunch', 'After School'];
  function byName(a, b) { return a.name.localeCompare(b.name); }

  // ---------- Newsletter grid (inline styles so it pastes cleanly into Google Docs) ----------
  // Rows = time periods, columns = Monday–Friday.
  function renderNewsletter(activities, week) {
    var title = '<p style="font-size:14pt;margin:0 0 8pt"><b>Extra-Curricular Activities: Week of ' +
      esc(weekLabel(week)) + '</b></p>';
    if (!activities.length) {
      return title + '<p><i>No extra-curricular activities have been entered for this week yet.</i></p>';
    }
    var grid = {};
    PERIODS.forEach(function (p) {
      grid[p] = {};
      DAYS.forEach(function (d) { grid[p][d] = []; });
    });
    activities.forEach(function (a) {
      if (!grid[a.period]) return;
      (a.days || []).forEach(function (d) { if (grid[a.period][d]) grid[a.period][d].push(a); });
    });

    var cell = 'border:1px solid #999;padding:5pt;vertical-align:top;font-size:10pt;';
    var head = cell + 'background:#1f3a68;color:#ffffff;text-align:center;';
    var html = '<table style="border-collapse:collapse;width:100%;table-layout:fixed"><tbody><tr>' +
      '<td style="' + head + 'width:14%"></td>';
    DAYS.forEach(function (d) {
      html += '<td style="' + head + '"><b>' + d + '</b><br>' + esc(longDate(dayDate(week, d))) + '</td>';
    });
    html += '</tr>';
    PERIODS.forEach(function (p) {
      html += '<tr><td style="' + cell + 'background:#e8edf5;vertical-align:middle"><b>' + p + '</b></td>';
      DAYS.forEach(function (d) {
        var items = grid[p][d].sort(byName).map(function (a) {
          var extra = [a.grades, a.teacher].filter(Boolean).join('; ');
          return '<b>' + esc(a.name) + '</b>' +
            (a.location ? '<br>' + esc(a.location) : '') +
            (extra ? '<br>' + esc(extra) : '') +
            (a.notes ? '<br><i>' + esc(a.notes) + '</i>' : '');
        });
        html += '<td style="' + cell + '">' + items.join('<br><br>') + '</td>';
      });
      html += '</tr>';
    });
    return title + html + '</tbody></table>';
  }

  // Expose pure helpers for testing in Node.
  if (typeof module !== 'undefined') {
    module.exports = { renderNewsletter: renderNewsletter, mondayOf: mondayOf, iso: iso, weekLabel: weekLabel, planningWeek: planningWeek };
  }
  if (typeof document === 'undefined') return;

  // ---------- Browser app ----------
  var $ = function (id) { return document.getElementById(id); };
  var SCRIPT_URL = (window.SCRIPT_URL || '').trim();
  var cache = {};       // week -> activities
  var editingId = null;

  if (!SCRIPT_URL) $('setup').classList.remove('hidden');

  function api(params) {
    return fetch(SCRIPT_URL + '?' + new URLSearchParams(params)).then(function (r) { return r.json(); });
  }
  function post(body) {
    return fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    }).then(function (r) { return r.json(); });
  }
  function load(week, force) {
    if (!SCRIPT_URL) return Promise.resolve([]);
    if (cache[week] && !force) return Promise.resolve(cache[week]);
    return api({ week: week, t: Date.now() }).then(function (res) {
      if (!res.ok) throw new Error(res.error || 'Could not load');
      cache[week] = res.activities;
      return res.activities;
    });
  }
  function setMsg(el, text, kind) {
    el.textContent = text;
    el.className = 'msg' + (kind ? ' ' + kind : '');
  }

  // ----- Week pickers -----
  // Teachers: the planning week (default) plus the two after it, for planning ahead.
  // Newsletter: same upcoming weeks, plus a "Look back" group of earlier weeks.
  var PLAN = planningWeek(new Date());
  var PLAN_ISO = iso(PLAN);
  var THIS_WEEK_ISO = iso(addDays(PLAN, -7)); // the school week running now (or starting tomorrow, on a Sunday)

  function option(value, text, selected) {
    var o = document.createElement('option');
    o.value = value; o.textContent = text; o.selected = !!selected;
    return o;
  }
  function upcomingGroup(label) {
    var g = document.createElement('optgroup');
    g.label = label;
    for (var i = 0; i < 3; i++) {
      var m = iso(addDays(PLAN, i * 7));
      g.appendChild(option(m, weekLabel(m) + (i === 0 ? ' (next newsletter)' : ''), i === 0));
    }
    return g;
  }
  $('week').appendChild(upcomingGroup('Plan for'));
  $('nl-week').appendChild(upcomingGroup('Upcoming'));

  // Fill "Look back" with every earlier week that has entries (plus the week happening now).
  var pastLoaded = false;
  function loadPastWeeks() {
    if (pastLoaded || !SCRIPT_URL) return;
    pastLoaded = true;
    api({ t: Date.now() }).then(function (res) {
      if (!res.ok) throw new Error(res.error);
      var counts = {};
      res.activities.forEach(function (a) { counts[a.week] = (counts[a.week] || 0) + 1; });
      if (THIS_WEEK_ISO < PLAN_ISO && !counts[THIS_WEEK_ISO]) counts[THIS_WEEK_ISO] = 0;
      var weeks = Object.keys(counts).filter(function (w) { return w < PLAN_ISO; }).sort().reverse();
      if (!weeks.length) return;
      var g = document.createElement('optgroup');
      g.label = 'Look back';
      weeks.forEach(function (w) {
        var n = counts[w];
        g.appendChild(option(w, weekLabel(w) + (w === THIS_WEEK_ISO ? ' (this week)' : '') +
          ' · ' + n + (n === 1 ? ' activity' : ' activities')));
      });
      $('nl-week').appendChild(g);
    }).catch(function () { pastLoaded = false; });
  }

  DAYS.forEach(function (d) {
    var l = document.createElement('label');
    l.innerHTML = '<input type="checkbox" value="' + d + '"><span>' + d + '</span>';
    $('days').appendChild(l);
  });
  PERIODS.forEach(function (p) {
    var l = document.createElement('label');
    l.innerHTML = '<input type="radio" name="period" value="' + p + '"><span>' + p + '</span>';
    $('periods').appendChild(l);
  });
  function periodBoxes() { return Array.prototype.slice.call($('periods').querySelectorAll('input')); }
  function dayBoxes() { return Array.prototype.slice.call($('days').querySelectorAll('input')); }

  // Tabs (#newsletter in the URL opens the secretary view directly)
  function showTab(name) {
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
    $('tab-add').classList.toggle('hidden', name !== 'add');
    $('tab-newsletter').classList.toggle('hidden', name !== 'newsletter');
    if (name === 'newsletter') { history.replaceState(null, '', '#newsletter'); loadPastWeeks(); renderOutput(true); }
    else { history.replaceState(null, '', location.pathname); renderList(true); }
  }
  document.querySelectorAll('.tab').forEach(function (t) {
    t.addEventListener('click', function () { showTab(t.dataset.tab); });
  });

  // ----- Teacher list -----
  function renderList(force) {
    var week = $('week').value;
    $('list-week').textContent = 'the week of ' + weekLabel(week);
    var list = $('list');
    if (!SCRIPT_URL) { list.innerHTML = '<p class="empty">Not connected yet.</p>'; return; }
    list.innerHTML = '<p class="empty">Loading…</p>';
    load(week, force).then(function (acts) {
      if ($('week').value !== week) return;
      if (!acts.length) { list.innerHTML = '<p class="empty">Nothing entered yet for this week.</p>'; return; }
      list.innerHTML = '';
      acts.slice().sort(function (a, b) {
        return DAYS.indexOf(a.days[0]) - DAYS.indexOf(b.days[0]) || PERIODS.indexOf(a.period) - PERIODS.indexOf(b.period) || byName(a, b);
      }).forEach(function (a) {
        var div = document.createElement('div');
        div.className = 'item';
        div.innerHTML = '<div><b>' + esc(a.name) + '</b><div class="meta">' +
          esc(a.days.join(', ')) + ' · ' + esc(a.period) + ' · ' + esc(a.location) +
          (a.teacher ? ' · ' + esc(a.teacher) : '') + '</div></div>' +
          '<div class="btns"><button data-act="edit">Edit</button><button data-act="del">Delete</button></div>';
        div.querySelector('[data-act=edit]').onclick = function () { startEdit(a); };
        div.querySelector('[data-act=del]').onclick = function () { remove(a); };
        list.appendChild(div);
      });
    }).catch(function (e) {
      list.innerHTML = '<p class="msg err">Couldn\'t load activities: ' + esc(e.message) + '</p>';
    });
  }
  $('week').addEventListener('change', function () { renderList(false); });

  function startEdit(a) {
    editingId = a.id;
    $('name').value = a.name;
    periodBoxes().forEach(function (b) { b.checked = b.value === a.period; });
    $('location').value = a.location;
    $('teacher').value = a.teacher;
    $('grades').value = a.grades;
    $('notes').value = a.notes;
    dayBoxes().forEach(function (b) { b.checked = a.days.indexOf(b.value) !== -1; });
    $('form-title').textContent = 'Edit activity';
    $('save').textContent = 'Save changes';
    $('cancel').classList.remove('hidden');
    setMsg($('form-msg'), '');
    $('form').scrollIntoView({ behavior: 'smooth' });
  }
  function resetForm() {
    editingId = null;
    periodBoxes().forEach(function (b) { b.checked = false; });
    ['name', 'location', 'teacher', 'grades', 'notes'].forEach(function (id) { $(id).value = ''; });
    dayBoxes().forEach(function (b) { b.checked = false; });
    $('form-title').textContent = 'Add an activity';
    $('save').textContent = 'Add activity';
    $('cancel').classList.add('hidden');
  }
  $('cancel').onclick = function () { resetForm(); setMsg($('form-msg'), ''); };

  function remove(a) {
    if (!confirm('Delete "' + a.name + '"?')) return;
    post({ action: 'delete', id: a.id }).then(function (res) {
      if (!res.ok) throw new Error(res.error);
      if (editingId === a.id) resetForm();
      renderList(true);
    }).catch(function (e) { alert('Could not delete: ' + e.message); });
  }

  $('form').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var msg = $('form-msg');
    var days = dayBoxes().filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
    if (!days.length) { setMsg(msg, 'Please pick at least one day.', 'err'); return; }
    var period = (periodBoxes().filter(function (b) { return b.checked; })[0] || {}).value;
    if (!period) { setMsg(msg, 'Please pick Before School, Lunch or After School.', 'err'); return; }
    if (!SCRIPT_URL) { setMsg(msg, 'The app isn\'t connected to its Google Sheet yet.', 'err'); return; }
    var activity = {
      id: editingId || '',
      week: $('week').value,
      days: days,
      name: $('name').value.trim(),
      period: period,
      location: $('location').value.trim(),
      teacher: $('teacher').value.trim(),
      grades: $('grades').value.trim(),
      notes: $('notes').value.trim()
    };
    var wasEdit = !!editingId;
    $('save').disabled = true;
    setMsg(msg, 'Saving…');
    post({ action: 'save', activity: activity }).then(function (res) {
      if (!res.ok) throw new Error(res.error);
      setMsg(msg, wasEdit ? 'Changes saved.' : '"' + activity.name + '" added. Thank you!', 'ok');
      resetForm();
      renderList(true);
    }).catch(function (e) {
      setMsg(msg, 'Could not save: ' + e.message, 'err');
    }).then(function () { $('save').disabled = false; });
  });

  // ----- Secretary output -----
  function renderOutput(force) {
    var week = $('nl-week').value;
    var out = $('output');
    if (!SCRIPT_URL) { out.innerHTML = '<p class="empty">Not connected yet.</p>'; return; }
    out.innerHTML = '<p class="empty">Loading…</p>';
    load(week, force).then(function (acts) {
      if ($('nl-week').value !== week) return;
      out.innerHTML = renderNewsletter(acts, week);
    }).catch(function (e) {
      out.innerHTML = '<p class="msg err">Couldn\'t load activities: ' + esc(e.message) + '</p>';
    });
  }
  $('nl-week').addEventListener('change', function () { renderOutput(false); });
  $('refresh').onclick = function () { setMsg($('nl-msg'), ''); renderOutput(true); };

  $('copy').onclick = function () {
    var out = $('output'), msg = $('nl-msg');
    var done = function () { setMsg(msg, 'Copied! Now paste it into the newsletter Google Doc (Ctrl+V / ⌘V).', 'ok'); };
    var fallback = function () {
      var range = document.createRange();
      range.selectNodeContents(out);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      sel.removeAllRanges();
      if (ok) done(); else setMsg(msg, 'Copy didn\'t work. Select the preview below and copy it manually.', 'err');
    };
    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([out.innerHTML], { type: 'text/html' }),
        'text/plain': new Blob([out.innerText], { type: 'text/plain' })
      })]).then(done, fallback);
    } else {
      fallback();
    }
  };

  // If the app was left open (e.g. on a phone home screen) past Sunday, refresh to the new week.
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden && iso(planningWeek(new Date())) !== PLAN_ISO) location.reload();
  });

  showTab(location.hash === '#newsletter' ? 'newsletter' : 'add');
})();
