/* Polyglotte — local, offline language courses from A1 to C1 (Spanish and French).
 *
 * Everything runs in the browser. Each language's course comes from course-data-<lang>.js
 * (built from content/ by scripts/build.py). Progress lives in localStorage — one record per
 * language, plus shared settings — and can be exported to a file and imported back. When the
 * app is started with the launcher (scripts/serve.py), progress is also saved to
 * my-progress.json on this computer, and that file wins on startup. Nothing is ever sent off
 * this machine.
 */
(function () {
  "use strict";

  const COURSES = window.COURSES || {};
  const LANG_CODES = Object.keys(COURSES);
  // The key predates the second language; keeping it keeps the progress already saved.
  const STORE_KEY = "spanish-lessons.progress";
  const DEFAULT_SETTINGS = { passScore: 80, quizLength: 20, speechRate: 0.9, theme: "system", accent: "pink" };
  const THEMES = [["system", "Match my computer"], ["light", "Light"], ["dark", "Dark"]];
  const ACCENTS = [["pink", "Pink", "#db2777"], ["purple", "Purple", "#9333ea"], ["blue", "Blue", "#2563eb"], ["teal", "Teal", "#0d9488"], ["orange", "Orange", "#ea580c"]];
  const QUIZ_CURRENT_SHARE = 0.6;   // share of a lesson quiz drawn from the lesson itself
  const PRACTICE_LENGTH = 12;

  // ------------------------------------------------------------------ course index
  // The course of the language being learned; switching language re-points all of these.
  let LANG = null;                  // { code, name, native, speech, voices, tagline, sample }
  let COURSE = { levels: [] };
  let LESSONS = [];                 // every lesson in course order
  let BY_ID = {};
  let LEVEL_BY_ID = {};
  function useLanguage(code) {
    const c = COURSES[code];
    if (!c) return false;
    if (!c.indexed) {
      let n = 0;
      c.levels.forEach((level, li) => level.lessons.forEach((lesson) => {
        lesson.levelIndex = li;
        lesson.index = n++;
      }));
      c.indexed = true;
    }
    LANG = c.lang;
    COURSE = c;
    LESSONS = c.levels.flatMap((l) => l.lessons);
    BY_ID = {};
    LESSONS.forEach((l) => (BY_ID[l.id] = l));
    LEVEL_BY_ID = {};
    c.levels.forEach((l) => (LEVEL_BY_ID[l.id] = l));
    window.COURSE = c; // the current course, for the browser checks
    return true;
  }

  // ------------------------------------------------------------------ progress store
  // Version 2: shared settings, the language being learned, and one record per language.
  // Version 1 (Spanish only) kept lessons/tests/misses/flagged at the top; it is read as Spanish.
  function freshProgress() {
    return { lessons: {}, tests: {}, misses: {}, flagged: [] };
  }
  function cleanProgress(p) {
    p = p && typeof p === "object" ? p : {};
    return {
      lessons: p.lessons && typeof p.lessons === "object" ? p.lessons : {},
      tests: p.tests && typeof p.tests === "object" ? p.tests : {},
      misses: p.misses && typeof p.misses === "object" ? p.misses : {},
      flagged: Array.isArray(p.flagged) ? p.flagged : [],
    };
  }
  function freshState() {
    const langs = {};
    LANG_CODES.forEach((c) => (langs[c] = freshProgress()));
    return { version: 2, settings: { ...DEFAULT_SETTINGS }, language: null, langs };
  }
  function loadState() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return freshState();
      return upgrade(JSON.parse(raw));
    } catch (e) {
      console.warn("Could not read saved progress", e);
      return freshState();
    }
  }
  function upgrade(s) {
    const base = freshState();
    if (!s || typeof s !== "object") return base;
    const out = { version: 2, settings: { ...base.settings, ...(s.settings || {}) }, language: null, langs: {} };
    if (s.langs && typeof s.langs === "object") {
      Object.keys(s.langs).forEach((c) => (out.langs[c] = cleanProgress(s.langs[c])));
      out.language = typeof s.language === "string" ? s.language : null;
    } else {
      out.langs.es = cleanProgress(s); // a version 1 record: the Spanish course
      out.language = "es";
    }
    LANG_CODES.forEach((c) => { if (!out.langs[c]) out.langs[c] = freshProgress(); });
    if (out.language && !COURSES[out.language]) out.language = null;
    return out;
  }
  // The progress record of the language being learned.
  function P() {
    if (!state.langs[LANG.code]) state.langs[LANG.code] = freshProgress();
    return state.langs[LANG.code];
  }
  let state = loadState();
  function applyAppearance() {
    const root = document.documentElement;
    const t = state.settings.theme;
    if (t === "light" || t === "dark") root.dataset.theme = t; else delete root.dataset.theme;
    root.dataset.accent = ACCENTS.some(([id]) => id === state.settings.accent) ? state.settings.accent : "pink";
  }
  applyAppearance();
  function save() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      if (!fileMode) alert("Your progress could not be saved in this browser. Use Settings → Export to keep a copy.");
    }
    saveToFile();
  }

  // ------------------------------------------------------------------ progress file (launcher)
  // Only when served by scripts/serve.py: the file is the source of truth, localStorage a copy.
  let fileMode = false;
  let fileName = "my-progress.json";
  let fileSaving = false;
  let fileDirty = false;
  async function syncFromFile() {
    if (!/^https?:$/.test(location.protocol)) return;
    try {
      const r = await fetch("api/progress", { cache: "no-store" });
      if (!r.ok) return;
      const body = await r.json();
      fileMode = true;
      if (body.file) fileName = body.file;
      if (body.progress && typeof body.progress === "object") {
        localStorage.setItem(STORE_KEY, JSON.stringify(upgrade(body.progress)));
      } else if (localStorage.getItem(STORE_KEY)) {
        saveToFile(); // first launch: move what this browser already has into the file
      }
    } catch (e) {
      /* no launcher: browser storage only */
    }
  }
  function saveToFile() {
    if (!fileMode) return;
    fileDirty = true;
    if (fileSaving) return;
    fileSaving = true;
    fileDirty = false;
    fetch("api/progress", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) })
      .then((r) => { if (!r.ok) throw new Error(r.status); showFileWarning(false); })
      .catch(() => showFileWarning(true))
      .finally(() => { fileSaving = false; if (fileDirty) saveToFile(); });
  }
  function showFileWarning(on) {
    let el = document.getElementById("fileWarn");
    if (!on) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement("div");
    el.id = "fileWarn";
    el.className = "file-warn";
    el.textContent = "Couldn't save to your progress file — is the Start Polyglotte window still open? Your progress is still kept in this browser for now.";
    document.body.prepend(el);
  }

  // ------------------------------------------------------------------ unlock rules
  const lessonPassed = (id) => !!(P().lessons[id] && P().lessons[id].passed);
  const testPassed = (levelId) => !!(P().tests[levelId] && P().tests[levelId].passed);
  function levelLessonsPassed(level) {
    return level.lessons.every((l) => lessonPassed(l.id));
  }
  function lessonUnlocked(lesson) {
    if (lesson.missing) return false;
    if (lesson.index === 0) return true;
    const level = COURSE.levels[lesson.levelIndex];
    if (level.lessons[0].id === lesson.id) {
      const prevLevel = COURSE.levels[lesson.levelIndex - 1];
      return testPassed(prevLevel.id);
    }
    return lessonPassed(LESSONS[lesson.index - 1].id);
  }
  function testUnlocked(level) {
    return level.lessons.length > 0 && levelLessonsPassed(level) && level.lessons.every((l) => !l.missing);
  }
  function nextStep() {
    for (const level of COURSE.levels) {
      for (const lesson of level.lessons) {
        if (!lessonPassed(lesson.id)) return lessonUnlocked(lesson) ? { kind: "lesson", lesson } : null;
      }
      if (!testPassed(level.id)) return testUnlocked(level) ? { kind: "test", level } : null;
    }
    return null;
  }

  // ------------------------------------------------------------------ helpers
  const $app = document.getElementById("app");
  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function h(html) {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content;
  }
  function inline(text) {
    // **bold**, *Spanish or French* (rendered emphasised and speakable)
    return esc(text)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, (m, s) => `<em class="say" data-say="${s.replace(/<[^>]*>/g, "")}">${s}</em>`);
  }
  function paragraphs(text) {
    const blocks = String(text).split(/\n\s*\n/);
    return blocks
      .map((b) => {
        const lines = b.split("\n");
        if (lines.every((l) => /^\s*[-•] /.test(l))) {
          return "<ul>" + lines.map((l) => "<li>" + inline(l.replace(/^\s*[-•] /, "")) + "</li>").join("") + "</ul>";
        }
        return "<p>" + lines.map(inline).join("<br>") + "</p>";
      })
      .join("");
  }
  function pct(n, d) {
    return d ? Math.round((100 * n) / d) : 0;
  }
  function shuffle(a, rnd = Math.random) {
    const arr = a.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  function lessonNumber(lesson) {
    const level = COURSE.levels[lesson.levelIndex];
    return level.id + "." + (level.lessons.indexOf(lesson) + 1);
  }

  // ------------------------------------------------------------------ speech
  // Only a voice of the language being learned is ever used: never a voice of another one.
  function pickVoice() {
    if (!("speechSynthesis" in window) || !LANG) return null;
    const voices = speechSynthesis.getVoices().filter((v) => v.lang.replace("_", "-").toLowerCase().split("-")[0] === LANG.code);
    for (const p of LANG.voices) {
      const v = voices.find((x) => x.lang.replace("_", "-").toLowerCase() === p.toLowerCase());
      if (v) return v;
    }
    return voices[0] || null;
  }
  if ("speechSynthesis" in window) {
    speechSynthesis.onvoiceschanged = pickVoice;
  }
  function canSpeak() {
    return !!pickVoice();
  }
  function speak(text) {
    const voice = pickVoice();
    if (!voice) return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = Number(state.settings.speechRate) || 0.9;
    speechSynthesis.speak(u);
    return true;
  }
  document.addEventListener("click", (ev) => {
    const el = ev.target.closest("[data-say]");
    if (el) {
      if (!speak(el.getAttribute("data-say"))) {
        el.title = `No ${LANG ? LANG.name : ""} voice is available on this computer.`;
      }
    }
  });
  const speakBtn = (text) => `<button class="speak" type="button" data-say="${esc(text)}" title="Listen" aria-label="Listen">🔊</button>`;

  // ------------------------------------------------------------------ answer checking
  function normalise(s) {
    return String(s)
      .normalize("NFC")
      .toLowerCase()
      .replace(/[¿¡?!.,;:"“”«»()—–]/g, " ")
      .replace(/’/g, "'")
      .replace(/'\s+/g, "'")
      .replace(/\s+/g, " ")
      .trim();
  }
  function fold(s) {
    return normalise(s).replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function checkTyped(given, answers) {
    const g = normalise(given);
    if (!g) return { correct: false };
    for (const a of answers) if (normalise(a) === g) return { correct: true };
    for (const a of answers) if (fold(a) === fold(given)) return { correct: true, accentNote: a };
    return { correct: false };
  }
  function correctAnswerText(item) {
    if (item.type === "mc") return item.options[item.answer];
    if (item.type === "build") return item.answer;
    return item.answers[0];
  }

  // ------------------------------------------------------------------ item pools
  function playable(item) {
    return item.type !== "listen" || canSpeak();
  }
  function lessonItems(lesson) {
    return (lesson.items || []).filter(playable);
  }
  function weightedSample(items, n, rnd = Math.random, weight = (it) => 1 + 3 * (P().misses[it.id] || 0)) {
    const pool = items.map((it) => ({ it, w: weight(it) }));
    const out = [];
    while (out.length < n && pool.length) {
      const total = pool.reduce((s, p) => s + p.w, 0);
      let r = rnd() * total;
      let k = 0;
      while (k < pool.length - 1 && r >= pool[k].w) r -= pool[k++].w;
      out.push(pool.splice(k, 1)[0].it);
    }
    return out;
  }
  // Spread earlier-lesson questions: visit lessons round-robin, lessons with more past misses
  // first, so a late quiz reaches back across the whole course and revisits weak spots.
  function spreadSample(lessons, n) {
    const withItems = lessons.map((l) => lessonItems(l)).filter((b) => b.length);
    const buckets = weightedSample(
      withItems.map((b, k) => ({ id: "bucket" + k, b, missSum: b.reduce((s, it) => s + (P().misses[it.id] || 0), 0) })),
      withItems.length,
      Math.random,
      (x) => 1 + 3 * x.missSum
    ).map((x) => x.b);
    const out = [];
    const used = new Set();
    let guard = 0;
    while (out.length < n && buckets.length && guard++ < 10000) {
      for (let b = 0; b < buckets.length && out.length < n; b++) {
        const avail = buckets[b].filter((it) => !used.has(it.id));
        if (!avail.length) continue;
        const [pick] = weightedSample(avail, 1);
        used.add(pick.id);
        out.push(pick);
      }
      if (buckets.every((bk) => bk.every((it) => used.has(it.id)))) break;
    }
    return out;
  }
  function composeLessonQuiz(lesson) {
    const n = Number(state.settings.quizLength) || 20;
    const earlier = LESSONS.slice(0, lesson.index).filter((l) => !l.missing);
    const own = lessonItems(lesson);
    const ownCount = earlier.length ? Math.min(own.length, Math.ceil(n * QUIZ_CURRENT_SHARE)) : Math.min(own.length, n);
    const picked = weightedSample(own, ownCount);
    const fromEarlier = spreadSample(earlier, n - picked.length);
    return shuffle(picked.concat(fromEarlier)).map((it) => ({ ...it, _lesson: it.id.split(":")[0] }));
  }
  function composeLevelTest(level) {
    const n = level.test.questions || 30;
    const share = earlierLevels(level).length ? level.test.fromThisLevel || 0.7 : 1;
    const own = spreadSample(level.lessons.filter((l) => !l.missing), Math.round(n * share));
    const earlier = earlierLevels(level).flatMap((l) => l.lessons).filter((l) => !l.missing);
    const back = spreadSample(earlier, n - own.length);
    return shuffle(own.concat(back)).map((it) => ({ ...it, _lesson: it.id.split(":")[0] }));
  }
  function earlierLevels(level) {
    return COURSE.levels.slice(0, COURSE.levels.indexOf(level));
  }

  // ------------------------------------------------------------------ question widget
  function renderQuestion(host, item, onAnswered) {
    let answered = false;
    const wrap = document.createElement("div");
    wrap.className = "question";
    wrap.dataset.itemId = item.id;
    wrap.dataset.type = item.type;
    host.appendChild(wrap);

    const finish = (correct, details = {}) => {
      if (answered) return;
      answered = true;
      wrap.querySelectorAll("input, .options button, .tiles button, [data-action=check]").forEach((el) => (el.disabled = true));
      const fb = document.createElement("div");
      const right = correctAnswerText(item);
      if (correct) {
        fb.className = "feedback " + (details.accentNote ? "note" : "right");
        fb.innerHTML = details.accentNote
          ? `✔ Correct — but watch the accents: <strong>${esc(details.accentNote)}</strong>`
          : "✔ Correct!";
      } else {
        fb.className = "feedback wrong";
        fb.innerHTML = `✘ Not quite. The answer is: <strong>${esc(right)}</strong> ${speakableAnswer(item) ? speakBtn(right) : ""}`;
      }
      if (item.explain) fb.innerHTML += `<div class="hint">${inline(item.explain)}</div>`;
      if (item.translation) fb.innerHTML += `<div class="hint">“${esc(item.translation)}”</div>`;
      const next = document.createElement("div");
      next.className = "row";
      next.style.marginTop = "10px";
      let correctFinal = correct;
      if (!correct && details.typed) {
        const override = document.createElement("button");
        override.className = "btn secondary small";
        override.type = "button";
        override.dataset.action = "override";
        override.textContent = "I was right — count it";
        override.onclick = () => {
          P().flagged.push({ id: item.id, prompt: item.prompt || item.audio, given: details.given, at: new Date().toISOString() });
          save();
          override.remove();
          fb.className = "feedback note";
          fb.innerHTML = "Counted as correct, and noted in Settings → Flagged answers so the key can be fixed.";
          correctFinal = true;
        };
        next.appendChild(override);
      }
      const cont = document.createElement("button");
      cont.className = "btn";
      cont.type = "button";
      cont.dataset.action = "next";
      cont.textContent = "Continue →";
      cont.onclick = () => onAnswered(correctFinal);
      next.appendChild(cont);
      fb.appendChild(next);
      wrap.appendChild(fb);
      wrap.dataset.answered = "true";
      cont.focus(); // so Enter (or Space) now moves on
    };

    const promptHtml = `<div class="prompt">${inline(item.prompt || "")} ${item.say ? speakBtn(item.say) : ""}</div>`;
    if (item.type === "mc") {
      wrap.appendChild(h(promptHtml + '<div class="options"></div>'));
      const box = wrap.querySelector(".options");
      // Shown in a fresh random order each time, so where the right answer sits gives nothing away.
      shuffle(item.options.map((_, i) => i)).forEach((i) => {
        const b = document.createElement("button");
        b.type = "button";
        b.dataset.option = String(i);
        b.textContent = item.options[i];
        b.onclick = () => {
          const ok = i === item.answer;
          b.classList.add(ok ? "chosen-right" : "chosen-wrong");
          if (!ok) box.querySelector(`[data-option="${item.answer}"]`).classList.add("reveal");
          finish(ok);
        };
        box.appendChild(b);
      });
    } else if (item.type === "build") {
      const words = item.answer.split(/\s+/);
      let order = shuffle(words.map((w, i) => ({ w, i })));
      if (words.length > 1 && order.every((o, k) => o.i === k)) order = order.slice(1).concat(order[0]);
      wrap.appendChild(h(promptHtml + '<div class="tiles answer"></div><div class="tiles pool"></div><div class="row"><button class="btn" type="button" data-action="check">Check</button><button class="btn secondary small" type="button" data-action="clear">Clear</button></div>'));
      const ans = wrap.querySelector(".tiles.answer");
      const pool = wrap.querySelector(".tiles.pool");
      const chosen = [];
      const draw = () => {
        ans.innerHTML = "";
        pool.innerHTML = "";
        chosen.forEach((o, k) => {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = o.w;
          b.onclick = () => { if (!answered) { chosen.splice(k, 1); draw(); } };
          ans.appendChild(b);
        });
        order.filter((o) => !chosen.includes(o)).forEach((o) => {
          const b = document.createElement("button");
          b.type = "button";
          b.textContent = o.w;
          b.dataset.word = o.w;
          b.onclick = () => { if (!answered) { chosen.push(o); draw(); } };
          pool.appendChild(b);
        });
      };
      draw();
      wrap.querySelector("[data-action=clear]").onclick = () => { if (!answered) { chosen.length = 0; draw(); } };
      wrap.querySelector("[data-action=check]").onclick = () => {
        const given = chosen.map((o) => o.w).join(" ");
        finish(normalise(given) === normalise(item.answer));
      };
    } else {
      // fill, translate, listen: typed answers
      let top = promptHtml;
      if (item.type === "listen") {
        top = `<div class="prompt">${esc(item.prompt)}</div><div class="row"><button class="btn secondary" type="button" data-say="${esc(item.audio)}">🔊 Play</button></div>`;
      }
      const hint = item.hint ? `<div class="hint">${inline(item.hint)}</div>` : "";
      wrap.appendChild(h(`${top}${hint}<div class="row" style="margin-top:10px"><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Your answer"><button class="btn" type="button" data-action="check">Check</button></div><div class="hint">Tip: accents count, but a missing accent is only flagged, not marked wrong.</div>`));
      const input = wrap.querySelector("input");
      const check = () => {
        if (!input.value.trim()) { input.focus(); return; }
        const res = checkTyped(input.value, item.answers);
        finish(res.correct, { accentNote: res.accentNote, typed: true, given: input.value });
      };
      wrap.querySelector("[data-action=check]").onclick = check;
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault(); // otherwise the same key press also clicks "Continue", skipping the result
        check();
      });
      setTimeout(() => input.focus(), 0);
      if (item.type === "listen") setTimeout(() => speak(item.audio), 250);
    }
  }
  function speakableAnswer(item) {
    return item.type !== "mc" || item.lang === LANG.code;
  }

  // ------------------------------------------------------------------ session runner
  function runSession({ title, subtitle, items, mode, onFinish }) {
    let i = 0;                 // the question being answered
    let viewing = null;        // index of an earlier question being reviewed, or null
    const results = [];
    const done = [];           // answered questions, kept so they can be looked at again
    let current = null;        // the current question's element (kept while reviewing)
    const quitHref = mode === "quiz" ? "#/quizzes" : "#/practice";
    const quitText = mode === "quiz" ? "Quit quiz (no score recorded)" : "Quit practice";

    $app.innerHTML = "";
    $app.appendChild(h(`
      <div class="row"><div><h1>${esc(title)}</h1><div class="muted">${esc(subtitle || "")}</div></div>
      <div class="spacer"></div><div class="muted small" data-role="counter"></div></div>
      <div class="progress" style="margin:12px 0 4px"><span data-role="bar"></span></div>
      <div class="card" id="qhost"></div>
      <div class="row session-nav"><button class="btn secondary small" type="button" data-action="prev">← Previous</button>
      <button class="btn secondary small" type="button" data-action="forward"></button>
      <span class="spacer"></span><a href="${quitHref}" class="small">${quitText}</a></div>`));
    const host = document.getElementById("qhost");
    const counter = $app.querySelector("[data-role=counter]");
    const bar = $app.querySelector("[data-role=bar]");
    const prevBtn = $app.querySelector("[data-action=prev]");
    const fwdBtn = $app.querySelector("[data-action=forward]");

    const show = (el) => { host.innerHTML = ""; host.appendChild(el); };
    const refreshNav = () => {
      bar.style.width = pct(i, items.length) + "%";
      const at = viewing === null ? i : viewing;
      counter.textContent = viewing === null ? `Question ${i + 1} of ${items.length}` : `Reviewing question ${viewing + 1} of ${items.length}`;
      prevBtn.hidden = at === 0;
      fwdBtn.hidden = viewing === null;
      fwdBtn.textContent = viewing !== null && viewing + 1 < done.length ? "Next →" : "Back to current question →";
    };
    const next = () => {
      viewing = null;
      if (i >= items.length) return onFinish(results);
      const it = items[i];
      host.innerHTML = "";
      renderQuestion(host, it, (correct) => {
        results.push({ id: it.id, correct, lesson: it._lesson || it.id.split(":")[0] });
        current.classList.add("reviewed"); // hides its Continue / "I was right" buttons
        done.push(current);
        i++;
        next();
      });
      current = host.querySelector(".question");
      refreshNav();
    };
    prevBtn.onclick = () => {
      viewing = viewing === null ? done.length - 1 : viewing - 1;
      if (viewing < 0) { viewing = null; return; }
      show(done[viewing]);
      refreshNav();
    };
    fwdBtn.onclick = () => {
      if (viewing !== null && viewing + 1 < done.length) {
        viewing++;
        show(done[viewing]);
      } else {
        viewing = null;
        show(current);
        const focusable = current.dataset.answered ? current.querySelector("[data-action=next]") : current.querySelector("input");
        if (focusable) focusable.focus();
      }
      refreshNav();
    };
    next();
  }

  // ------------------------------------------------------------------ views
  function viewDashboard() {
    const total = LESSONS.length;
    const passed = LESSONS.filter((l) => lessonPassed(l.id)).length;
    const next = nextStep();
    const tests = COURSE.levels.filter((l) => testPassed(l.id)).length;
    let html = `<h1>Your ${esc(LANG.name)} course</h1>
      <p class="muted">${esc(LANG.tagline)}</p>
      <div class="card"><div class="row">
        <div><div class="stat" data-role="overall">${pct(passed, total)}%</div><div class="muted small">of the course passed</div></div>
        <div><div class="stat">${passed}<span class="muted small"> / ${total}</span></div><div class="muted small">lessons passed</div></div>
        <div><div class="stat">${tests}<span class="muted small"> / ${COURSE.levels.length}</span></div><div class="muted small">level tests passed</div></div>
        <div class="spacer"></div>
        ${next ? (next.kind === "lesson"
          ? `<a class="btn" data-action="continue" href="#/lesson/${next.lesson.id}">Continue: ${esc(lessonNumber(next.lesson))} ${esc(next.lesson.title)} →</a>`
          : `<a class="btn" data-action="continue" href="#/test/${next.level.id}">Take the ${esc(next.level.id)} level test →</a>`)
        : (passed === total ? "<strong>🎉 Course complete!</strong>" : "")}
      </div><div class="progress" style="margin-top:12px"><span style="width:${pct(passed, total)}%"></span></div>
      <p class="small muted" style="margin-bottom:0">Passing score: ${state.settings.passScore}% (change it in <a href="#/settings">Settings</a>). Only quizzes and level tests move your progress.</p></div>`;
    COURSE.levels.forEach((level) => {
      const lp = level.lessons.filter((l) => lessonPassed(l.id)).length;
      const open = next ? (next.kind === "lesson" ? next.lesson.levelIndex : COURSE.levels.indexOf(next.level)) === COURSE.levels.indexOf(level) : false;
      html += `<div class="card" data-level="${level.id}">
        <details ${open ? "open" : ""}><summary class="level-head"><h2>${esc(level.title)}</h2><div class="spacer"></div>
        <span class="muted small" data-role="level-progress">${lp} / ${level.lessons.length} lessons${testPassed(level.id) ? " · test passed ✔" : ""}</span></summary>
        <div class="progress" style="margin-top:10px"><span style="width:${pct(lp, level.lessons.length)}%"></span></div>
        <ul class="lesson-list">`;
      level.lessons.forEach((lesson) => {
        const rec = P().lessons[lesson.id];
        const unlocked = lessonUnlocked(lesson);
        const isNext = next && next.kind === "lesson" && next.lesson === lesson;
        let badge = "";
        if (lesson.missing) badge = '<span class="badge">coming soon</span>';
        else if (rec && rec.passed) badge = `<span class="badge passed">passed · best ${rec.best}%</span>`;
        else if (isNext) badge = '<span class="badge next">next</span>';
        else if (!unlocked) badge = '<span class="badge">🔒 locked</span>';
        else if (rec) badge = `<span class="badge">best ${rec.best}%</span>`;
        html += `<li class="${unlocked ? "" : "locked"}" data-lesson="${lesson.id}" data-status="${rec && rec.passed ? "passed" : unlocked ? "open" : "locked"}">
          <span class="num">${esc(lessonNumber(lesson))}</span>
          <span>${unlocked ? `<a href="#/lesson/${lesson.id}">${esc(lesson.title)}</a>` : esc(lesson.title)}<br><span class="small muted">${esc(lesson.objective)}</span></span>
          <span class="spacer"></span>${badge}</li>`;
      });
      const tr = P().tests[level.id];
      const tu = testUnlocked(level);
      html += `<li data-test="${level.id}" data-status="${tr && tr.passed ? "passed" : tu ? "open" : "locked"}" class="${tu ? "" : "locked"}"><span class="num">★</span>
        <span>${tu ? `<a href="#/test/${level.id}">${esc(level.test.title)}</a>` : esc(level.test.title)}<br><span class="small muted">A cumulative test of the whole level, plus earlier levels. Passing it opens the next level.</span></span>
        <span class="spacer"></span>${tr && tr.passed ? `<span class="badge passed">passed · best ${tr.best}%</span>` : tu ? '<span class="badge next">ready</span>' : '<span class="badge">🔒 locked</span>'}</li>`;
      html += "</ul></details></div>";
    });
    $app.innerHTML = html;
  }

  function viewLesson(id) {
    const lesson = BY_ID[id];
    if (!lesson || lesson.missing) return notFound();
    if (!lessonUnlocked(lesson) && !lessonPassed(id)) {
      $app.innerHTML = `<h1>${esc(lesson.title)}</h1><div class="card">🔒 This lesson unlocks when you pass the quiz for the lesson before it. <a href="#/">Back to the dashboard</a></div>`;
      return;
    }
    const rec = P().lessons[id];
    let html = `<div class="muted small">${esc(lessonNumber(lesson))} · ${esc(COURSE.levels[lesson.levelIndex].title)}</div>
      <h1>${esc(lesson.title)}</h1><p class="muted">Goal: ${esc(lesson.objective)}</p><div class="lesson-body">`;
    lesson.sections.forEach((sec) => {
      html += `<div class="card">${sec.heading ? `<h3>${esc(sec.heading)}</h3>` : ""}${paragraphs(sec.body || "")}`;
      if (sec.table) {
        html += `<table class="grid"><thead><tr>${sec.table.head.map((c) => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>`;
        sec.table.rows.forEach((r) => (html += `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`));
        html += "</tbody></table>";
      }
      html += "</div>";
    });
    html += `</div><h2>Vocabulary</h2><div class="card"><ul class="pairs">`;
    lesson.vocab.forEach(([word, en, ipa]) => (html += `<li>${speakBtn(word)}<span class="tl">${esc(word)}</span>${ipa ? `<span class="ipa" title="Pronunciation">/${esc(ipa)}/</span>` : ""}<span class="muted">— ${esc(en)}</span></li>`));
    html += `</ul></div><h2>Examples</h2><div class="card"><ul class="pairs">`;
    lesson.examples.forEach(([tl, en]) => (html += `<li>${speakBtn(tl)}<span><span class="tl">${esc(tl)}</span><br><span class="muted">${esc(en)}</span></span></li>`));
    html += `</ul></div>
      <div class="card row"><div><strong>Ready?</strong><div class="small muted">Practise as much as you like, then take the quiz. The quiz also includes questions from earlier lessons.</div></div><div class="spacer"></div>
      <a class="btn secondary" href="#/practice/lesson/${id}">Practise this lesson</a>
      <a class="btn" href="#/quiz/${id}" data-action="take-quiz">Take the quiz</a></div>
      ${rec ? `<p class="small muted">Quiz attempts: ${rec.attempts} · best ${rec.best}% · last ${rec.lastScore}%${rec.passed ? " · passed ✔" : ""}</p>` : ""}`;
    if (!canSpeak()) html += `<p class="small muted">🔇 No ${esc(LANG.name)} voice found on this computer, so audio and listening exercises are off. On a Mac: System Settings → Accessibility → Spoken Content → System voice → Manage Voices → add a ${LANG.code === "fr" ? "French (France)" : "Spanish (Mexico)"} voice. On Windows: Settings → Time & language → Speech → Add voices.</p>`;
    $app.innerHTML = html;
  }

  function viewPracticeHome() {
    const open = LESSONS.filter((l) => !l.missing && (lessonUnlocked(l) || lessonPassed(l.id)));
    let html = `<h1>Practice center</h1><p class="muted">Drill any lesson you have reached, as often as you like. Practice never changes your progress.</p>
      <div class="card row"><div><strong>Mixed review</strong><div class="small muted">A random mix from every lesson you have reached.</div></div><div class="spacer"></div>
      <a class="btn" href="#/practice/mixed" ${open.length ? "" : 'aria-disabled="true"'}>Start mixed practice</a></div><div class="card"><ul class="lesson-list">`;
    open.forEach((l) => (html += `<li data-lesson="${l.id}"><span class="num">${esc(lessonNumber(l))}</span><span>${esc(l.title)}</span><span class="spacer"></span><a class="btn secondary small" href="#/practice/lesson/${l.id}">Practise</a></li>`));
    html += "</ul></div>";
    $app.innerHTML = html;
  }

  function startPractice(kind, id) {
    let pool, title;
    if (kind === "lesson") {
      const lesson = BY_ID[id];
      if (!lesson || lesson.missing || !(lessonUnlocked(lesson) || lessonPassed(id))) return notFound();
      pool = lessonItems(lesson);
      title = "Practice: " + lesson.title;
    } else {
      const open = LESSONS.filter((l) => !l.missing && (lessonUnlocked(l) || lessonPassed(l.id)));
      pool = open.flatMap(lessonItems);
      title = "Mixed practice";
    }
    const items = shuffle(pool).slice(0, PRACTICE_LENGTH);
    runSession({
      title, subtitle: "Practice — nothing here changes your progress.", items, mode: "practice",
      onFinish: (results) => {
        const right = results.filter((r) => r.correct).length;
        $app.innerHTML = `<h1>${esc(title)}</h1><div class="card"><div class="result-score">${right} / ${results.length}</div>
          <p>Practice complete. Your progress is unchanged.</p>
          <div class="row"><a class="btn" href="#/practice/${kind === "lesson" ? "lesson/" + id : "mixed"}">Practise again</a>
          <a class="btn secondary" href="#/practice">Practice center</a>${kind === "lesson" ? `<a class="btn secondary" href="#/lesson/${id}">Back to the lesson</a>` : ""}</div></div>`;
      },
    });
  }

  function viewQuizzesHome() {
    const next = nextStep();
    let html = `<h1>Quiz and testing center</h1>
      <p class="muted">Quizzes are cumulative: each one mixes the current lesson with questions from every earlier lesson, favouring ones you've missed before. Score at least ${state.settings.passScore}% to pass and unlock what comes next.</p>`;
    if (next) {
      html += next.kind === "lesson"
        ? `<div class="card row"><div><strong>Up next:</strong> ${esc(lessonNumber(next.lesson))} ${esc(next.lesson.title)}</div><div class="spacer"></div><a class="btn" href="#/quiz/${next.lesson.id}">Take the quiz</a></div>`
        : `<div class="card row"><div><strong>Up next:</strong> ${esc(next.level.test.title)}</div><div class="spacer"></div><a class="btn" href="#/test/${next.level.id}">Start the test</a></div>`;
    }
    html += `<h2>Retake a quiz</h2><div class="card"><ul class="lesson-list">`;
    LESSONS.filter((l) => lessonPassed(l.id)).forEach((l) => {
      const r = P().lessons[l.id];
      html += `<li><span class="num">${esc(lessonNumber(l))}</span><span>${esc(l.title)}</span><span class="spacer"></span><span class="badge passed">best ${r.best}%</span><a class="btn secondary small" href="#/quiz/${l.id}">Retake</a></li>`;
    });
    COURSE.levels.filter((lv) => testPassed(lv.id)).forEach((lv) => {
      html += `<li><span class="num">★</span><span>${esc(lv.test.title)}</span><span class="spacer"></span><span class="badge passed">best ${P().tests[lv.id].best}%</span><a class="btn secondary small" href="#/test/${lv.id}">Retake</a></li>`;
    });
    html += `</ul>${LESSONS.some((l) => lessonPassed(l.id)) ? "" : '<p class="muted small">Nothing passed yet.</p>'}</div>`;
    $app.innerHTML = html;
  }

  function recordMisses(results) {
    results.forEach((r) => {
      const m = P().misses;
      if (!r.correct) m[r.id] = (m[r.id] || 0) + 1;
      else if (m[r.id]) m[r.id] = Math.max(0, m[r.id] - 1);
    });
  }
  function recordAttempt(store, key, score) {
    const pass = score >= Number(state.settings.passScore);
    const prev = store[key] || { attempts: 0, best: 0, passed: false };
    store[key] = {
      attempts: prev.attempts + 1,
      best: Math.max(prev.best, score),
      lastScore: score,
      passed: prev.passed || pass,
      passedAt: prev.passedAt || (pass ? new Date().toISOString() : undefined),
    };
    return pass;
  }

  function startQuiz(id) {
    const lesson = BY_ID[id];
    if (!lesson || lesson.missing) return notFound();
    if (!lessonUnlocked(lesson) && !lessonPassed(id)) {
      $app.innerHTML = `<h1>Quiz locked</h1><div class="card">🔒 Pass the previous lesson's quiz first. <a href="#/">Dashboard</a></div>`;
      return;
    }
    const items = composeLessonQuiz(lesson);
    const lessonsIn = [...new Set(items.map((it) => it._lesson))];
    runSession({
      title: "Quiz: " + lesson.title,
      subtitle: `${items.length} questions · covers ${lessonsIn.length} lesson${lessonsIn.length === 1 ? "" : "s"} · pass at ${state.settings.passScore}%`,
      items, mode: "quiz",
      onFinish: (results) => {
        const score = pct(results.filter((r) => r.correct).length, results.length);
        recordMisses(results);
        const pass = recordAttempt(P().lessons, id, score);
        save();
        showResult({ title: "Quiz: " + lesson.title, score, pass, results, retry: `#/quiz/${id}`, back: `#/lesson/${id}` });
      },
    });
  }

  function startTest(levelId) {
    const level = LEVEL_BY_ID[levelId];
    if (!level) return notFound();
    if (!testUnlocked(level) && !testPassed(levelId)) {
      $app.innerHTML = `<h1>${esc(level.test.title)}</h1><div class="card">🔒 Pass every lesson in ${esc(level.id)} to unlock this test. <a href="#/">Dashboard</a></div>`;
      return;
    }
    const items = composeLevelTest(level);
    runSession({
      title: level.test.title,
      subtitle: `${items.length} questions from all of ${level.id}${earlierLevels(level).length ? " and earlier levels" : ""} · pass at ${state.settings.passScore}%`,
      items, mode: "quiz",
      onFinish: (results) => {
        const score = pct(results.filter((r) => r.correct).length, results.length);
        recordMisses(results);
        const pass = recordAttempt(P().tests, levelId, score);
        save();
        showResult({ title: level.test.title, score, pass, results, retry: `#/test/${levelId}`, back: "#/" });
      },
    });
  }

  function showResult({ title, score, pass, results, retry, back }) {
    const byLesson = {};
    results.forEach((r) => {
      byLesson[r.lesson] = byLesson[r.lesson] || { right: 0, total: 0 };
      byLesson[r.lesson].total++;
      if (r.correct) byLesson[r.lesson].right++;
    });
    const next = nextStep();
    $app.innerHTML = `<h1>${esc(title)}</h1><div class="card" data-role="result" data-pass="${pass}">
      <div class="result-score">${score}%</div>
      <p>${pass ? "✔ Passed! Your progress has been saved." : `Not passed yet — you need ${state.settings.passScore}%. Review the lesson, practise, and try again.`}</p>
      <div class="chips">${Object.entries(byLesson).map(([l, v]) => `<span class="chip">${esc(BY_ID[l] ? lessonNumber(BY_ID[l]) : l)}: ${v.right}/${v.total}</span>`).join("")}</div>
      <div class="row" style="margin-top:14px">
        ${pass && next ? `<a class="btn" href="${next.kind === "lesson" ? "#/lesson/" + next.lesson.id : "#/test/" + next.level.id}">Next →</a>` : ""}
        <a class="btn ${pass ? "secondary" : ""}" href="${retry}">Try again</a>
        <a class="btn secondary" href="${back}">Back</a><a class="btn secondary" href="#/">Dashboard</a></div></div>`;
  }

  function viewSettings() {
    const s = state.settings;
    $app.innerHTML = `<h1>Settings</h1>
      <div class="card"><h3>Language</h3>
        <p class="muted small">The course you are learning. Each language keeps its own progress; switching never changes the other.</p>
        <div class="choices" role="group" aria-label="Language">${LANG_CODES.map((c) =>
          `<button class="choice" type="button" data-lang-choice="${c}" aria-pressed="${state.language === c}">${esc(COURSES[c].lang.native)} <span class="muted small">(${esc(COURSES[c].lang.name)})</span></button>`).join("")}</div></div>
      <div class="card"><h3>Appearance</h3>
        <p class="muted small">Light or dark mode, and the accent colour. Changes apply straight away.</p>
        <div class="choices" role="group" aria-label="Theme">${THEMES.map(([id, label]) =>
          `<button class="choice" type="button" data-theme-choice="${id}" aria-pressed="${s.theme === id}">${label}</button>`).join("")}</div>
        <div class="choices" role="group" aria-label="Accent colour" style="margin-top:10px">${ACCENTS.map(([id, label, sw]) =>
          `<button class="choice" type="button" data-accent-choice="${id}" aria-pressed="${s.accent === id}"><span class="swatch" style="background:${sw}"></span>${label}</button>`).join("")}</div></div>
      <div class="card"><h3>Passing score</h3><p class="muted small">The score you need on a quiz or level test to pass it.</p>
        <div class="row"><input type="number" id="passScore" min="50" max="100" step="5" value="${esc(s.passScore)}"> %</div>
        <h3>Quiz length</h3><div class="row"><input type="number" id="quizLength" min="10" max="40" step="5" value="${esc(s.quizLength)}"> questions per lesson quiz</div>
        <h3>Speech speed</h3><div class="row"><input type="number" id="speechRate" min="0.5" max="1.2" step="0.1" value="${esc(s.speechRate)}"> ${canSpeak() ? `<button class="btn secondary small" type="button" data-say="${esc(LANG.sample)}">Test voice</button>` : `<span class="small muted">No ${esc(LANG.name)} voice installed.</span>`}</div>
        <div class="row" style="margin-top:14px"><button class="btn" id="saveSettings" type="button">Save settings</button><span id="saved" class="muted small"></span></div></div>
      <div class="card"><h3>Back up your progress</h3><p class="muted small">${fileMode
          ? `Progress is saved automatically to <strong>${esc(fileName)}</strong> in the course folder (the previous version is kept as a backup). Export makes an extra copy you can keep anywhere.`
          : "Progress is stored in this browser. Start the course with the <strong>Start Polyglotte</strong> launcher to save it to a file instead. Export a copy now and then; import it to restore."} Export and import cover every language.</p>
        <div class="row"><button class="btn secondary" id="export" type="button">Export progress</button>
        <label class="btn secondary">Import progress<input type="file" id="import" accept="application/json,.json" hidden></label>
        <button class="btn secondary" id="reset" type="button">Reset ${esc(LANG.name)} progress</button></div><div id="ioMsg" class="small" style="margin-top:8px"></div></div>
      <div class="card"><h3>Flagged answers (${esc(LANG.name)})</h3><p class="muted small">Answers you marked “I was right”. They help find answer keys that need fixing.</p>
        ${P().flagged.length ? `<ul class="pairs">${P().flagged.map((f) => `<li><span class="muted small">${esc(f.id)}</span><span>${esc(f.prompt || "")} → <strong>${esc(f.given || "")}</strong></span></li>`).join("")}</ul><button class="btn secondary small" id="clearFlags" type="button">Clear list</button>` : '<p class="small muted">None.</p>'}</div>`;
    $app.querySelectorAll("[data-lang-choice]").forEach((b) => (b.onclick = () => switchLanguage(b.dataset.langChoice, "#/settings")));
    $app.querySelectorAll("[data-theme-choice]").forEach((b) => (b.onclick = () => {
      s.theme = b.dataset.themeChoice; save(); applyAppearance(); viewSettings();
    }));
    $app.querySelectorAll("[data-accent-choice]").forEach((b) => (b.onclick = () => {
      s.accent = b.dataset.accentChoice; save(); applyAppearance(); viewSettings();
    }));
    document.getElementById("saveSettings").onclick = () => {
      const clamp = (v, lo, hi, d) => (isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
      s.passScore = Math.round(clamp(Number(document.getElementById("passScore").value), 50, 100, 80));
      s.quizLength = Math.round(clamp(Number(document.getElementById("quizLength").value), 10, 40, 20));
      s.speechRate = clamp(Number(document.getElementById("speechRate").value), 0.5, 1.2, 0.9);
      save();
      viewSettings();
      document.getElementById("saved").textContent = "Saved.";
    };
    document.getElementById("export").onclick = () => {
      const blob = new Blob([JSON.stringify({ app: "polyglotte", exportedAt: new Date().toISOString(), ...state }, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `polyglotte-progress-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      document.getElementById("ioMsg").textContent = "Exported.";
    };
    document.getElementById("import").onchange = (ev) => {
      const file = ev.target.files[0];
      if (!file) return;
      file.text().then((text) => {
        let data;
        try { data = JSON.parse(text); } catch (e) { data = null; }
        if (!data || typeof data !== "object" || (typeof data.lessons !== "object" && typeof data.langs !== "object")) {
          document.getElementById("ioMsg").textContent = "That file is not a progress export from this app.";
          return;
        }
        state = upgrade(data);
        if (!state.language) state.language = LANG.code;
        useLanguage(state.language);
        applyAppearance();
        renderHeader();
        save();
        viewSettings();
        document.getElementById("ioMsg").textContent = "Progress imported.";
      });
    };
    document.getElementById("reset").onclick = () => {
      if (confirm(`Erase all your ${LANG.name} progress? Your other languages are not affected. Export a backup first if you might want it back.`)) {
        state.langs[LANG.code] = freshProgress();
        save();
        viewSettings();
      }
    };
    const cf = document.getElementById("clearFlags");
    if (cf) cf.onclick = () => { P().flagged = []; save(); viewSettings(); };
  }

  // ------------------------------------------------------------------ choosing a language
  function viewChooseLanguage() {
    $app.innerHTML = `<h1>Welcome to Polyglotte</h1>
      <p class="muted">Which language would you like to learn? You can switch at any time, and each language keeps its own progress.</p>
      <div class="lang-cards">${LANG_CODES.map((c) => {
        const L = COURSES[c].lang;
        const n = COURSES[c].levels.reduce((k, l) => k + l.lessons.length, 0);
        return `<button class="card lang-card" type="button" data-choose-lang="${c}"><span class="lang-native">${esc(L.native)}</span>
          <span class="muted">${esc(L.name)} · ${n} lessons</span><span class="small">${esc(L.tagline)}</span></button>`;
      }).join("")}</div>`;
    $app.querySelectorAll("[data-choose-lang]").forEach((b) => (b.onclick = () => switchLanguage(b.dataset.chooseLang, "#/")));
  }
  function switchLanguage(code, hash) {
    if (!COURSES[code]) return;
    state.language = code;
    if (!state.langs[code]) state.langs[code] = freshProgress();
    useLanguage(code);
    save();
    renderHeader();
    if (location.hash === hash) route(); else location.hash = hash;
  }
  function renderHeader() {
    const box = document.getElementById("langSwitch");
    if (!box) return;
    box.innerHTML = LANG_CODES.map((c) =>
      `<button type="button" class="lang-btn" data-switch-lang="${c}" aria-pressed="${state.language === c}" title="${esc(COURSES[c].lang.name)}">${esc(COURSES[c].lang.native)}</button>`).join("");
    box.querySelectorAll("[data-switch-lang]").forEach((b) => (b.onclick = () => {
      if (b.dataset.switchLang !== state.language) switchLanguage(b.dataset.switchLang, "#/");
    }));
    document.documentElement.lang = state.language || "en";
    document.title = state.language ? `Polyglotte · ${COURSES[state.language].lang.native}` : "Polyglotte";
  }

  function notFound() {
    $app.innerHTML = `<h1>Not found</h1><div class="card">That page doesn't exist. <a href="#/">Go to the dashboard</a></div>`;
  }

  // ------------------------------------------------------------------ router
  function route() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    state = loadState(); // progress may have changed in another tab (every change is saved at once)
    applyAppearance();
    renderHeader();
    if (!state.language || !useLanguage(state.language)) {
      document.querySelectorAll("[data-nav]").forEach((n) => n.classList.remove("active"));
      $app.dataset.lang = "";
      return viewChooseLanguage();
    }
    $app.dataset.lang = LANG.code; // which course the page is showing
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    const [a, b, c] = parts;
    document.querySelectorAll("[data-nav]").forEach((n) => n.classList.remove("active"));
    const nav = { "": "dashboard", lesson: "dashboard", practice: "practice", quizzes: "quizzes", quiz: "quizzes", test: "quizzes", settings: "settings" }[a || ""];
    const navEl = document.querySelector(`[data-nav=${nav}]`);
    if (navEl) navEl.classList.add("active");
    window.scrollTo(0, 0);
    if (!a) return viewDashboard();
    if (a === "lesson") return viewLesson(b);
    if (a === "practice" && !b) return viewPracticeHome();
    if (a === "practice" && b === "lesson") return startPractice("lesson", c);
    if (a === "practice" && b === "mixed") return startPractice("mixed");
    if (a === "quizzes") return viewQuizzesHome();
    if (a === "quiz") return startQuiz(b);
    if (a === "test") return startTest(b);
    if (a === "settings") return viewSettings();
    notFound();
  }
  window.addEventListener("hashchange", route);
  // A link to the page already open ("Practise again", "Try again") changes nothing in the URL,
  // so no hashchange fires; start that page over instead.
  document.addEventListener("click", (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (a && a.getAttribute("href") === location.hash && !e.defaultPrevented) {
      e.preventDefault();
      route();
    }
  });
  window.addEventListener("storage", (e) => { if (e.key === STORE_KEY) { state = loadState(); } });
  syncFromFile().then(route);
})();
