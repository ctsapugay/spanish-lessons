// CHK-003 — drives the real app in a headless browser.
//
// Covers G3 (practice never changes progress), G4 (cumulative quizzes, pass threshold,
// configurable passing score, persistence), G5 (level tests) — each for Spanish and, as G11
// requires, for French too — G7 (switching languages keeps each one's progress; progress from
// the Spanish-only version carries over), G10 (French is only ever spoken with a French voice),
// G11 (French typed answers: apostrophes, elision, accents), C-PRIVATE (no outside network),
// C-PROGRESS-SAFE (reload, export/import, course update, and — via the launcher's
// scripts/serve.py — progress kept in a file that survives wiping the browser's data) and
// C-SPANISH-INTACT (every Spanish scenario, reported with an [es] prefix).
//
// The app is served from a throwaway local HTTP server and also opened straight from disk
// (file://). Any request to a host other than the local one fails the run.
//
//   node checks/scripts/app-test.mjs            # all scenarios
//   node checks/scripts/app-test.mjs --headed   # watch it
//   node checks/scripts/app-test.mjs --lang es  # only the per-language scenarios for Spanish
//   node checks/scripts/app-test.mjs --whole    # only the whole-app scenarios

import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import os from "node:os";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = path.join(ROOT, "app");
const STORE_KEY = "spanish-lessons.progress";
const results = [];
const courseDataOverride = {}; // lang -> replacement course-data-<lang>.js

// ---------------------------------------------------------------- tiny static server
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/index.html";
  const ov = p.match(/^\/course-data-(\w+)\.js$/);
  if (ov && courseDataOverride[ov[1]]) {
    res.writeHead(200, { "content-type": "text/javascript" });
    return res.end(courseDataOverride[ov[1]]);
  }
  const file = path.join(APP, p);
  if (!file.startsWith(APP) || !fs.existsSync(file)) {
    res.writeHead(404);
    return res.end("not found");
  }
  res.writeHead(200, { "content-type": types[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

// ---------------------------------------------------------------- browser
const headed = process.argv.includes("--headed");
let browser;
try {
  browser = await chromium.launch({ channel: "chrome", headless: !headed });
} catch {
  browser = await chromium.launch({ headless: !headed });
}
const outsideRequests = [];
const extraBases = []; // the launcher's own local server, when running

async function newPage(context) {
  const page = await context.newPage();
  page.on("pageerror", (err) => results.push({ name: "no page errors", ok: false, detail: String(err) }));
  await page.route("**/*", (route) => {
    const u = route.request().url();
    if (u.startsWith(BASE) || extraBases.some((b) => u.startsWith(b)) || u.startsWith("file://") || u.startsWith("data:") || u.startsWith("blob:")) return route.continue();
    outsideRequests.push(u);
    return route.abort();
  });
  return page;
}
async function freshContext() {
  return browser.newContext({ acceptDownloads: true });
}

// ---------------------------------------------------------------- helpers
const exact = (w) => new RegExp("^" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$");
function check(name, ok, detail = "") {
  results.push({ name, ok: !!ok, detail });
}
async function course(page) {
  return page.evaluate(() => window.COURSE);
}
// Open the app on a language: pick it on the welcome screen, or switch to it in the header.
async function openCourse(page, url, lang) {
  await page.goto(url);
  await page.waitForSelector("#app h1");
  if (await page.locator(`[data-choose-lang="${lang}"]`).count()) {
    await page.click(`[data-choose-lang="${lang}"]`);
  } else if ((await page.getAttribute(`[data-switch-lang="${lang}"]`, "aria-pressed")) !== "true") {
    await page.click(`[data-switch-lang="${lang}"]`);
  }
  await page.waitForFunction((l) => window.COURSE && window.COURSE.lang && window.COURSE.lang.code === l &&
    document.getElementById("app").dataset.lang === l, lang);
}
function readCourseData(lang) {
  const text = fs.readFileSync(path.join(APP, `course-data-${lang}.js`), "utf8");
  const marker = `).${lang} = `;
  return JSON.parse(text.slice(text.indexOf(marker) + marker.length).replace(/;\s*$/, ""));
}
async function progress(page) {
  return page.evaluate((k) => localStorage.getItem(k), STORE_KEY);
}
async function setProgress(page, obj) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [STORE_KEY, obj]);
}
function availableLessons(c) {
  return c.levels.flatMap((l) => l.lessons).filter((l) => !l.missing);
}
function passedState(lang, lessonIds, testIds = [], settings = {}) {
  const lessons = {};
  lessonIds.forEach((id) => (lessons[id] = { attempts: 1, best: 100, lastScore: 100, passed: true }));
  const tests = {};
  testIds.forEach((id) => (tests[id] = { attempts: 1, best: 100, lastScore: 100, passed: true }));
  return { version: 2, settings: { passScore: 80, quizLength: 20, speechRate: 0.9, ...settings }, language: lang,
    langs: { [lang]: { lessons, tests, misses: {}, flagged: [] } } };
}
// Everything before `lessonId` in course order passed (and every earlier level test).
function progressUpTo(c, lessonId) {
  const lang = c.lang.code;
  const ids = [];
  const tests = [];
  for (const level of c.levels) {
    for (const l of level.lessons) {
      if (l.id === lessonId) return passedState(lang, ids, tests);
      ids.push(l.id);
    }
    tests.push(level.id);
  }
  return passedState(lang, ids, tests);
}
const langOf = (st) => st.langs[st.language];

// Answer the current question; plan(i) returns true (answer right) or false (answer wrong).
async function answerAll(page, plan) {
  const seen = [];
  for (let i = 0; i < 200; i++) {
    const q = page.locator(".question");
    if ((await q.count()) === 0) break;
    const id = await q.getAttribute("data-item-id");
    const item = await page.evaluate((iid) => {
      for (const lv of window.COURSE.levels) for (const l of lv.lessons) for (const it of l.items || []) if (it.id === iid) return it;
      return null;
    }, id);
    const right = plan(i, item);
    seen.push({ id, lesson: id.split(":")[0], right });
    if (item.type === "mc") {
      const idx = right ? item.answer : (item.answer + 1) % item.options.length;
      await q.locator(`[data-option="${idx}"]`).click();
    } else if (item.type === "build") {
      const words = item.answer.split(/[ \t\r\n]+/);
      const order = right ? words : words.slice().reverse();
      for (const w of order) await q.locator(".tiles.pool button").filter({ hasText: exact(w) }).first().click();
      if (!right && words.join(" ") === words.slice().reverse().join(" ")) {
        // palindromic order: clear and add nothing but the first word
        await q.locator("[data-action=clear]").click();
        await q.locator(".tiles.pool button").first().click();
      }
      await q.locator("[data-action=check]").click();
    } else {
      await q.locator("input").fill(right ? item.answers[0] : "zzzz qqqq");
      await q.locator("[data-action=check]").click();
    }
    await q.locator(".feedback").waitFor();
    await q.locator("[data-action=next]").click();
  }
  return seen;
}

// ---------------------------------------------------------------- per-language scenarios
// Each runs once per language; its checks are reported with a [es] / [fr] prefix.
let T = "";
const named = (name) => `${T} ${name}`;
const checkL = (name, ok, detail = "") => check(named(name), ok, detail);

async function scenarioFileUrl(lang) {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  const FILE = "file://" + path.join(APP, "index.html");
  await openCourse(page, FILE, lang);
  const title = await page.textContent("h1");
  const c = await course(page);
  checkL("opens straight from disk (file://)", title && title.includes(`${c.lang.name} course`), title);
  const first = availableLessons(c)[0];
  await page.goto(FILE + "#/quiz/" + first.id);
  await answerAll(page, () => true);
  await page.reload();
  await page.goto(FILE + "#/");
  const status = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  checkL("file:// progress survives a reload", status === "passed", `status=${status}`);
  await ctx.close();
}

async function scenarioPracticeAndQuizBasics(lang) {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await openCourse(page, BASE, lang);
  const c = await course(page);
  const lessons = availableLessons(c);
  const first = lessons[0];
  checkL("course data loaded", lessons.length > 0, `${lessons.length} lessons with content`);
  const status0 = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  checkL("first lesson open on a fresh start", status0 === "open", status0);
  const second = c.levels[0].lessons[1];
  const s2 = await page.getAttribute(`[data-lesson="${second.id}"]`, "data-status");
  checkL("second lesson locked on a fresh start", s2 === "locked", s2);

  // G3: practice gives feedback and never changes progress
  const before = await progress(page);
  await page.goto(BASE + "#/practice/lesson/" + first.id);
  let sawWrongFeedback = false;
  let sawRightFeedback = false;
  for (let i = 0; i < 12; i++) {
    const q = page.locator(".question");
    if ((await q.count()) === 0) break;
    const id = await q.getAttribute("data-item-id");
    const item = await page.evaluate((iid) => window.COURSE.levels.flatMap((l) => l.lessons).flatMap((l) => l.items || []).find((x) => x.id === iid), id);
    const right = i % 2 === 0;
    if (item.type === "mc") await q.locator(`[data-option="${right ? item.answer : (item.answer + 1) % item.options.length}"]`).click();
    else if (item.type === "build") {
      for (const w of item.answer.split(/[ \t\r\n]+/)) await q.locator(".tiles.pool button").filter({ hasText: exact(w) }).first().click();
      await q.locator("[data-action=check]").click();
    } else {
      await q.locator("input").fill(right ? item.answers[0] : "zzzz qqqq");
      await q.locator("[data-action=check]").click();
    }
    const fb = q.locator(".feedback");
    await fb.waitFor();
    const cls = await fb.getAttribute("class");
    const text = await fb.textContent();
    if (cls.includes("wrong")) {
      const expected = item.type === "mc" ? item.options[item.answer] : item.type === "build" ? item.answer : item.answers[0];
      if (text.includes(expected)) sawWrongFeedback = true;
    } else sawRightFeedback = true;
    await q.locator("[data-action=next]").click();
  }
  checkL("practice shows right/wrong feedback with the correct answer", sawWrongFeedback && sawRightFeedback, `wrong=${sawWrongFeedback} right=${sawRightFeedback}`);

  // Multiple choice: the right answer is not always in the same place on screen.
  const positions = [];
  for (let round = 0; round < 10 && positions.length < 8; round++) {
    await page.goto(BASE + "#/");
    await page.goto(BASE + "#/practice/lesson/" + first.id);
    for (let i = 0; i < 12 && (await page.locator(".question").count()); i++) {
      const q = page.locator(".question");
      if ((await q.getAttribute("data-type")) === "mc") {
        const id = await q.getAttribute("data-item-id");
        const item = await page.evaluate((iid) => window.COURSE.levels.flatMap((l) => l.lessons).flatMap((l) => l.items || []).find((x) => x.id === iid), id);
        const shown = await q.locator("[data-option]").evaluateAll((bs) => bs.map((b) => Number(b.dataset.option)));
        if (shown.length > 2 && !item.gen) positions.push(shown.indexOf(item.answer)); // authored items
        await q.locator(`[data-option="${item.answer}"]`).click();
      } else {
        await q.locator("input").fill("x").catch(() => {});
        await q.locator("[data-action=check]").click().catch(() => {});
      }
      await q.locator(".feedback").waitFor();
      await q.locator("[data-action=next]").click();
    }
  }
  checkL("the right multiple-choice answer is not always in the same position", positions.length >= 4 && new Set(positions).size >= 2, `positions seen: ${positions.join(",")}`);
  const after = await progress(page);
  checkL("practice leaves stored progress unchanged", before === after, `before=${before} after=${after}`);

  // G4: failing a quiz does not pass or unlock
  await page.goto(BASE + "#/quiz/" + first.id);
  await answerAll(page, () => false);
  const failPass = await page.getAttribute("[data-role=result]", "data-pass");
  await page.goto(BASE + "#/");
  const afterFail = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  const nextAfterFail = await page.getAttribute(`[data-lesson="${second.id}"]`, "data-status");
  checkL("a quiz below the passing score does not pass the lesson", failPass === "false" && afterFail !== "passed" && nextAfterFail === "locked", `${failPass} ${afterFail} ${nextAfterFail}`);

  // G4: passing unlocks the next lesson and shows on the dashboard; survives reload
  await page.goto(BASE + "#/quiz/" + first.id);
  await answerAll(page, () => true);
  const passFlag = await page.getAttribute("[data-role=result]", "data-pass");
  await page.goto(BASE + "#/");
  await page.reload();
  const afterPass = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  const nextAfterPass = await page.getAttribute(`[data-lesson="${second.id}"]`, "data-status");
  const overall = await page.textContent("[data-role=level-progress]");
  checkL("passing a quiz passes the lesson, and it persists after reload", passFlag === "true" && afterPass === "passed", `${passFlag} ${afterPass}`);
  checkL("passing unlocks the next lesson", second.missing ? nextAfterPass === "locked" : nextAfterPass === "open", `next=${nextAfterPass} (missing content: ${!!second.missing})`);
  checkL("dashboard shows level progress", /1 \/ \d+ lessons/.test(overall), overall);
  await ctx.close();
}

async function scenarioPassScoreSetting(lang) {
  for (const [score, expectPass] of [[50, true], [80, false]]) {
    const ctx = await freshContext();
    const page = await newPage(ctx);
    await openCourse(page, BASE, lang);
    await page.goto(BASE + "#/settings");
    await page.fill("#passScore", String(score));
    await page.click("#saveSettings");
    const c = await course(page);
    const first = availableLessons(c)[0];
    await page.goto(BASE + "#/quiz/" + first.id);
    const counter = await page.textContent("[data-role=counter]");
    const total = Number(counter.match(/of (\d+)/)[1]);
    const rightCount = Math.round(total * 0.65);
    await answerAll(page, (i) => i < rightCount);
    const pass = await page.getAttribute("[data-role=result]", "data-pass");
    checkL(`passing score ${score}%: a ~65% quiz ${expectPass ? "passes" : "fails"}`, pass === String(expectPass), `pass=${pass}, ${rightCount}/${total}`);
    await ctx.close();
  }
}

async function scenarioCumulativeQuiz(lang) {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await openCourse(page, BASE, lang);
  const c = await course(page);
  const lessons = availableLessons(c);
  const target = lessons[lessons.length - 1];
  const earlier = lessons.slice(0, -1);
  if (earlier.length < 3) {
    checkL("cumulative quiz draws on earlier lessons", false, "need at least 4 lessons with content to test");
    return ctx.close();
  }
  // Heavily missed item in an early lesson should be favoured.
  const weak = earlier[1].items.find((it) => it.type !== "listen");
  const st = progressUpTo(c, target.id);
  langOf(st).misses[weak.id] = 1000; // heavy enough that "favoured" is near-certain, not a coin flip
  await setProgress(page, st);
  let sawWeak = 0;
  let spans = [];
  let ownShare = [];
  for (let run = 0; run < 3; run++) {
    await page.goto(BASE + "#/");
    await page.goto(BASE + "#/quiz/" + target.id);
    const seen = await answerAll(page, () => true);
    const byLesson = {};
    seen.forEach((s) => (byLesson[s.lesson] = (byLesson[s.lesson] || 0) + 1));
    spans.push(Object.keys(byLesson).filter((l) => l !== target.id).length);
    ownShare.push((byLesson[target.id] || 0) / seen.length);
    if (seen.some((s) => s.id === weak.id)) sawWeak++;
    await setProgress(page, JSON.parse(JSON.stringify(st)));
  }
  checkL("a late quiz includes questions from several earlier lessons", Math.min(...spans) >= 3, `earlier lessons per run: ${spans.join(", ")}`);
  checkL("most of a quiz comes from the current lesson", Math.min(...ownShare) >= 0.5, `own share: ${ownShare.map((x) => x.toFixed(2)).join(", ")}`);
  checkL("items previously missed are favoured", sawWeak >= 2, `weak item appeared in ${sawWeak}/3 quizzes`);
  await ctx.close();
}

async function scenarioLevelTest(lang) {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await openCourse(page, BASE, lang);
  const c = await course(page);
  const complete = c.levels.filter((l) => l.lessons.every((x) => !x.missing));
  if (!complete.length) {
    checkL("level test is reachable and cumulative", false, "no level has all its lessons written yet");
    return ctx.close();
  }
  const level = complete[complete.length - 1];
  const li = c.levels.indexOf(c.levels.find((l) => l.id === level.id));
  const nextLevel = c.levels[li + 1];
  const st = progressUpTo(c, nextLevel ? nextLevel.lessons[0].id : "__end__");
  delete langOf(st).tests[level.id];
  await setProgress(page, st);
  await page.goto(BASE + "#/");
  await page.reload(); // the dashboard may already be open: show the progress just set
  await page.waitForSelector(`[data-test="${level.id}"]`, { state: "attached" });
  const tstatus = await page.getAttribute(`[data-test="${level.id}"]`, "data-status");
  checkL(`${level.id} level test unlocks when all its lessons are passed`, tstatus === "open", tstatus);
  if (nextLevel) {
    const n0 = await page.getAttribute(`[data-lesson="${nextLevel.lessons[0].id}"]`, "data-status");
    checkL(`next level stays locked until the ${level.id} test is passed`, n0 === "locked", n0);
  }
  await page.goto(BASE + "#/test/" + level.id);
  const seen = await answerAll(page, () => true);
  const own = new Set(seen.map((s) => s.lesson).filter((l) => level.lessons.some((x) => x.id === l)));
  const back = seen.filter((s) => !level.lessons.some((x) => x.id === s.lesson)).length;
  checkL(`${level.id} test spans the level`, own.size >= Math.min(10, level.lessons.length), `${own.size} of ${level.lessons.length} lessons`);
  if (li > 0) checkL(`${level.id} test includes earlier levels`, back > 0, `${back} questions from earlier levels`);
  const pass = await page.getAttribute("[data-role=result]", "data-pass");
  await page.goto(BASE + "#/");
  const after = await page.getAttribute(`[data-test="${level.id}"]`, "data-status");
  checkL(`passing the ${level.id} test is recorded on the dashboard`, pass === "true" && after === "passed", `${pass} ${after}`);
  if (nextLevel && !nextLevel.lessons[0].missing) {
    const n1 = await page.getAttribute(`[data-lesson="${nextLevel.lessons[0].id}"]`, "data-status");
    checkL("passing a level test opens the next level", n1 === "open", n1);
  }
  await ctx.close();
}

async function scenarioExportImportAndUpdate(lang) {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await openCourse(page, BASE, lang);
  const c = await course(page);
  const first = availableLessons(c)[0];
  await page.goto(BASE + "#/quiz/" + first.id);
  await answerAll(page, () => true);
  await page.goto(BASE + "#/settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#export")]);
  const file = await download.path();
  const exported = JSON.parse(fs.readFileSync(file, "utf8"));
  const exLessons = (exported.langs && exported.langs[lang] && exported.langs[lang].lessons) || {};
  checkL("export contains the passed lesson", exLessons[first.id] && exLessons[first.id].passed, JSON.stringify(exLessons).slice(0, 120));

  await page.evaluate(() => localStorage.clear());
  await openCourse(page, BASE + "#/", lang);
  await page.reload();
  await page.waitForSelector(`[data-lesson="${first.id}"]`, { state: "attached" });
  const cleared = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  await page.goto(BASE + "#/settings");
  await page.setInputFiles("#import", file);
  await page.waitForFunction(() => document.getElementById("ioMsg") && document.getElementById("ioMsg").textContent.length > 0);
  await page.goto(BASE + "#/");
  const restored = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  checkL("clearing site data then importing the export restores progress", cleared === "open" && restored === "passed", `cleared=${cleared} restored=${restored}`);

  // Course update: a new lesson is inserted and items change; existing progress survives.
  const data = readCourseData(lang);
  data.levels[0].lessons.splice(1, 0, { id: "zz-new", level: data.levels[0].id, title: "A new lesson", objective: "Added in an update", missing: true });
  data.levels[0].lessons[0].items = data.levels[0].lessons[0].items.slice(1);
  courseDataOverride[lang] = `(window.COURSES = window.COURSES || {}).${lang} = ` + JSON.stringify(data) + ";";
  await page.goto(BASE + "#/");
  await page.reload();
  await page.waitForSelector(`[data-lesson="${first.id}"]`, { state: "attached" });
  const afterUpdate = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  const stored = JSON.parse(await progress(page));
  checkL("progress survives an update to the course content", afterUpdate === "passed" && stored.langs[lang].lessons[first.id].passed, `status=${afterUpdate}`);
  delete courseDataOverride[lang];
  await ctx.close();
}

async function scenarioSessionControls(lang) {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await openCourse(page, BASE, lang);
  const c = await course(page);
  const first = availableLessons(c)[0];
  await page.goto(BASE + "#/practice/lesson/" + first.id);
  const counter = () => page.textContent("[data-role=counter]");
  const itemOf = async () => {
    const id = await page.locator(".question").getAttribute("data-item-id");
    return page.evaluate((iid) => window.COURSE.levels.flatMap((l) => l.lessons).flatMap((l) => l.items || []).find((x) => x.id === iid), id);
  };
  let enterShows = null, enterAdvances = null, reviewOk = null, returnOk = null;
  for (let n = 0; n < 12; n++) {
    const q = page.locator(".question");
    if ((await q.count()) === 0) break;
    const item = await itemOf();
    if (n >= 1 && reviewOk === null) { // any question after the first: look back, then return
      const curId = await q.getAttribute("data-item-id");
      await page.click("[data-action=prev]");
      const rc = await counter();
      reviewOk = new RegExp(`Reviewing question ${n} of`).test(rc) && (await page.locator(".question .feedback").count()) === 1 && (await page.locator(".question").getAttribute("data-item-id")) !== curId;
      await page.click("[data-action=forward]");
      returnOk = new RegExp(`^Question ${n + 1} of`).test(await counter()) && (await page.locator(".question").getAttribute("data-item-id")) === curId;
    }
    const typed = ["fill", "translate", "listen"].includes(item.type);
    if (typed && enterShows === null) {
      const before = await counter();
      await q.locator("input").fill(item.answers[0]);
      await q.locator("input").press("Enter");
      await page.waitForTimeout(150);
      enterShows = (await q.locator(".feedback").count()) === 1 && (await counter()) === before;
      await page.keyboard.press("Enter");
      await page.waitForTimeout(150);
      enterAdvances = (await counter()) !== before;
      continue;
    }
    if (item.type === "mc") await q.locator(`[data-option="${item.answer}"]`).click();
    else if (item.type === "build") {
      for (const w of item.answer.split(/[ \t\r\n]+/)) await q.locator(".tiles.pool button").filter({ hasText: exact(w) }).first().click();
      await q.locator("[data-action=check]").click();
    } else {
      await q.locator("input").fill(item.answers[0]);
      await q.locator("[data-action=check]").click();
    }
    await q.locator(".feedback").waitFor();
    await q.locator("[data-action=next]").click();
  }
  checkL("Enter on a typed answer shows the result instead of skipping it", enterShows === true, `enterShows=${enterShows}`);
  checkL("Enter again moves on to the next question", enterAdvances === true, `enterAdvances=${enterAdvances}`);
  checkL("Previous shows the earlier question with its result", reviewOk === true, `reviewOk=${reviewOk}`);
  checkL("returning from review goes back to the current question", returnOk === true, `returnOk=${returnOk}`);
  // Practise again restarts the session (its link points at the page already open)
  await page.locator("a.btn:has-text(\"Practise again\")").waitFor();
  await page.click("a.btn:has-text(\"Practise again\")");
  await page.locator(".question").waitFor({ timeout: 3000 }).catch(() => {});
  const again = (await page.locator(".question").count()) === 1 && /^Question 1 of/.test(await counter());
  checkL("Practise again starts a new practice session", again, await page.textContent("#app").then((t) => t.slice(0, 80)));
  // Try again on a failed quiz restarts the quiz
  await page.goto(BASE + "#/quiz/" + first.id);
  await answerAll(page, () => false);
  await page.click("a.btn:has-text(\"Try again\")");
  await page.locator(".question").waitFor({ timeout: 3000 }).catch(() => {});
  const retry = (await page.locator(".question").count()) === 1 && /^Question 1 of/.test(await counter());
  checkL("Try again after a quiz starts the quiz over", retry, "");
  await ctx.close();
}

// ---------------------------------------------------------------- whole-app scenarios
async function scenarioAppearance() {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await openCourse(page, BASE, "es");
  await page.goto(BASE + "#/settings");
  const accents = await page.$$eval("[data-accent-choice]", (bs) => bs.map((b) => b.dataset.accentChoice));
  check("accent colour can be chosen, pink included", accents.length >= 3 && accents.includes("pink"), accents.join(", "));
  const colours = () => page.evaluate(() => {
    const probe = (prop) => { const d = document.createElement("div"); d.style.color = `var(${prop})`; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number); };
    return { bg: probe("--bg"), accent: probe("--accent"), ink: probe("--accent-ink"), panel: probe("--panel") };
  });
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bad = [];
  let modesOk = true;
  for (const theme of ["light", "dark"]) {
    await page.click(`[data-theme-choice="${theme}"]`);
    for (const a of accents) {
      await page.click(`[data-accent-choice="${a}"]`);
      const c = await colours();
      if ((theme === "dark") !== (lum(c.bg) < 0.1)) modesOk = false;
      const text = Math.min(contrast(c.accent, c.bg), contrast(c.accent, c.panel));
      const button = contrast(c.ink, c.accent);
      if (text < 4.5 || button < 4.5) bad.push(`${theme}/${a}: text ${text.toFixed(2)} button ${button.toFixed(2)}`);
    }
  }
  check("light and dark mode can be chosen", modesOk, "");
  check("every accent colour is readable in light and dark mode (contrast ≥ 4.5)", bad.length === 0, bad.join("; "));
  await page.click(`[data-theme-choice="dark"]`);
  await page.click(`[data-accent-choice="pink"]`);
  await page.reload();
  await page.goto(BASE + "#/");
  const kept = await page.evaluate(() => [document.documentElement.dataset.theme, document.documentElement.dataset.accent]);
  check("appearance choices are remembered after a reload", kept[0] === "dark" && kept[1] === "pink", kept.join("/"));
  await ctx.close();
}

// G7: each language keeps exactly its own progress through switching, reloads and export/import.
async function scenarioLanguageSwitching() {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await page.goto(BASE);
  const brand = await page.textContent(".brand");
  const title = await page.title();
  check("the app presents itself as Polyglotte", /Polyglotte/.test(brand) && /Polyglotte/.test(title), `${brand} / ${title}`);
  const choices = await page.$$eval("[data-choose-lang]", (bs) => bs.map((b) => b.dataset.chooseLang));
  check("a new learner chooses Spanish or French", choices.includes("es") && choices.includes("fr"), choices.join(", "));

  const statuses = async (ids) => {
    const out = {};
    for (const id of ids) out[id] = await page.getAttribute(`[data-lesson="${id}"]`, "data-status");
    return out;
  };
  await openCourse(page, BASE, "es");
  const es = availableLessons(await course(page));
  await openCourse(page, BASE, "fr");
  const fr = availableLessons(await course(page));
  if (es.length < 2 || fr.length < 2) {
    check("switching languages keeps each language's progress", false, `need two lessons with content in each language (es ${es.length}, fr ${fr.length})`);
    return ctx.close();
  }
  // Different progress in each: Spanish passes its first quiz, French its first two.
  await openCourse(page, BASE, "es");
  await page.goto(BASE + "#/quiz/" + es[0].id);
  await answerAll(page, () => true);
  await openCourse(page, BASE, "fr");
  for (const l of fr.slice(0, 2)) {
    await page.goto(BASE + "#/quiz/" + l.id);
    await answerAll(page, () => true);
  }
  const expectEs = { [es[0].id]: "passed", [es[1].id]: "open" };
  const expectFr = { [fr[0].id]: "passed", [fr[1].id]: "passed" };
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const verify = async (label) => {
    await openCourse(page, BASE + "#/", "es");
    const sEs = await statuses(Object.keys(expectEs));
    const esTitle = await page.textContent("h1");
    await openCourse(page, BASE + "#/", "fr");
    const sFr = await statuses(Object.keys(expectFr));
    const frTitle = await page.textContent("h1");
    check(`each language shows exactly its own progress (${label})`, same(sEs, expectEs) && same(sFr, expectFr) && /Spanish/.test(esTitle) && /French/.test(frTitle),
      `es=${JSON.stringify(sEs)} fr=${JSON.stringify(sFr)}`);
  };
  await verify("after switching");
  await openCourse(page, BASE, "es");
  await page.reload();
  const kept = await page.evaluate(() => window.COURSE.lang.code);
  check("the language being learned is remembered after a reload", kept === "es", kept);
  await verify("after a reload");
  // Practising French doesn't touch Spanish.
  const st0 = JSON.parse(await progress(page));
  await openCourse(page, BASE, "fr");
  await page.goto(BASE + "#/practice/lesson/" + fr[0].id);
  await answerAll(page, () => false);
  const st1 = JSON.parse(await progress(page));
  check("working in one language leaves the other's progress unchanged", same(st0.langs.es, st1.langs.es), "");
  // Export, wipe, import: both languages come back.
  await page.goto(BASE + "#/settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#export")]);
  const file = await download.path();
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await openCourse(page, BASE + "#/", "fr");
  await page.goto(BASE + "#/settings");
  await page.setInputFiles("#import", file);
  await page.waitForFunction(() => document.getElementById("ioMsg") && document.getElementById("ioMsg").textContent.length > 0);
  await verify("after export, clearing site data and import");
  await ctx.close();
}

// G10: French is spoken only with a French voice (France preferred); Spanish only with Spanish.
async function scenarioVoices() {
  const stub = (langs) => `(() => {
    const voices = ${JSON.stringify(langs)}.map((lang, i) => ({ name: "Voice " + i, lang, localService: true, default: i === 0, voiceURI: "v" + i }));
    window.__spoken = [];
    window.SpeechSynthesisUtterance = function (text) { this.text = text; };
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      getVoices: () => voices, cancel() {}, speak(u) { window.__spoken.push({ text: u.text, voice: u.voice && u.voice.lang, lang: u.lang }); },
      set onvoiceschanged(f) {}, get onvoiceschanged() { return null; } } });
  })();`;
  const run = async (langs, lang) => {
    const ctx = await freshContext();
    await ctx.addInitScript(stub(langs));
    const page = await newPage(ctx);
    await openCourse(page, BASE, lang);
    const first = availableLessons(await course(page))[0];
    await page.goto(BASE + "#/lesson/" + first.id);
    await page.waitForSelector(".pairs");
    await page.locator(".pairs [data-say]").first().click();
    const spoken = await page.evaluate(() => window.__spoken);
    const note = await page.textContent("#app");
    await page.goto(BASE + "#/practice/lesson/" + first.id);
    let listen = 0;
    for (let i = 0; i < 12 && (await page.locator(".question").count()); i++) {
      if ((await page.locator(".question").getAttribute("data-type")) === "listen") listen++;
      await page.locator(".question [data-option]").first().click().catch(async () => {
        await page.locator(".question input").fill("x").catch(() => {});
        await page.locator(".question [data-action=check]").click();
      });
      await page.locator(".question .feedback").waitFor();
      await page.click(".question [data-action=next]");
    }
    await ctx.close();
    return { spoken, note, listen };
  };
  const all = ["en-US", "es-ES", "es-MX", "fr-CA", "fr-FR"];
  const fr = await run(all, "fr");
  check("French is spoken with a French (France) voice", fr.spoken.length > 0 && fr.spoken.every((s) => s.voice === "fr-FR"), JSON.stringify(fr.spoken));
  const es = await run(all, "es");
  check("Spanish is still spoken with a Latin American voice", es.spoken.length > 0 && es.spoken.every((s) => s.voice === "es-MX"), JSON.stringify(es.spoken));
  const frOnlyCA = await run(["en-US", "es-MX", "fr-CA"], "fr");
  check("without a France voice, another French voice is used", frOnlyCA.spoken.length > 0 && frOnlyCA.spoken.every((s) => /^fr/.test(s.voice)), JSON.stringify(frOnlyCA.spoken));
  const none = await run(["en-US", "es-MX"], "fr");
  check("with no French voice, French is never spoken with another language's voice", none.spoken.length === 0 && /No French voice/.test(none.note) && none.listen === 0,
    `spoken=${JSON.stringify(none.spoken)} listening items=${none.listen}`);
}

// G11: French typed answers are judged fairly — apostrophes, elision, accents, œ.
async function scenarioFrenchTyping() {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await openCourse(page, BASE, "fr");
  const c = await course(page);
  const lessons = availableLessons(c);
  const typed = lessons.flatMap((l) => l.items.filter((it) => ["fill", "translate"].includes(it.type)).map((it) => ({ l, it })));
  const withApos = typed.find(({ it }) => /\b\w'\w/.test(it.answers[0]));
  const withAccent = typed.find(({ it }) => /[éèêàâîôûç]/.test(it.answers[0]) && !it.answers.some((a) => a.normalize("NFD").replace(/[̀-ͯ]/g, "") === a));
  if (!withApos || !withAccent) {
    check("French typed answers: apostrophes, elision and accents", false, "no French typed exercise with an apostrophe and one with an accent yet");
    return ctx.close();
  }
  const st = progressUpTo(c, lessons[lessons.length - 1].id);
  await setProgress(page, st);
  const tryAnswer = async ({ l, it }, text) => {
    for (let attempt = 0; attempt < 40; attempt++) {
      await page.goto(BASE + "#/");
      await page.goto(BASE + "#/practice/lesson/" + l.id);
      for (let i = 0; i < 12 && (await page.locator(".question").count()); i++) {
        if ((await page.locator(".question").getAttribute("data-item-id")) === it.id) {
          await page.fill(".question input", text);
          await page.click(".question [data-action=check]");
          return page.getAttribute(".question .feedback", "class");
        }
        await page.locator(".question [data-option]").first().click().catch(async () => {
          await page.locator(".question input").fill("x").catch(() => {});
          await page.locator(".question [data-action=check]").click();
        });
        await page.locator(".question .feedback").waitFor();
        await page.click(".question [data-action=next]");
      }
    }
    return null;
  };
  const a = withApos.it.answers[0];
  const curly = await tryAnswer(withApos, a.replace(/'/g, "’"));
  const spaced = await tryAnswer(withApos, a.replace(/'/g, "' "));
  check("a curly apostrophe (’) is accepted like a straight one", curly && /right/.test(curly), `${a} → ${curly}`);
  check("a space after an elided word (l' ami) is accepted", spaced && /right/.test(spaced), `${a} → ${spaced}`);
  const b = withAccent.it.answers[0];
  const bare = await tryAnswer(withAccent, b.normalize("NFD").replace(/[̀-ͯ]/g, ""));
  check("a missing accent is flagged, not marked wrong", bare && /note/.test(bare), `${b} → ${bare}`);
  await ctx.close();
}

async function scenarioLauncherFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "polyglotte-progress-"));
  const dataFile = path.join(dir, "my-progress.json");
  // A progress file saved by the Spanish-only version (format 1) must carry over unchanged.
  const legacy = { version: 1, settings: { passScore: 75, quizLength: 20, speechRate: 0.9, theme: "system", accent: "teal" },
    lessons: { "a1-01": { attempts: 2, best: 90, lastScore: 90, passed: true, passedAt: "2026-09-27T10:00:00.000Z" } },
    tests: {}, misses: { "a1-01:abc": 2 }, flagged: [] };
  fs.writeFileSync(dataFile, JSON.stringify(legacy));
  const start = () => {
    const proc = spawn("python3", [path.join(ROOT, "scripts/serve.py"), "--port", "0", "--no-browser", "--data", dataFile], { stdio: ["ignore", "pipe", "pipe"] });
    const url = new Promise((resolve, reject) => {
      let out = "";
      const t = setTimeout(() => reject(new Error("launcher did not start: " + out)), 10000);
      proc.stdout.on("data", (d) => {
        out += d;
        const m = out.match(/running at (http:\/\/127\.0\.0\.1:\d+\/)/);
        if (m) { clearTimeout(t); resolve(m[1]); }
      });
      proc.on("exit", (code) => reject(new Error("launcher exited " + code + ": " + out)));
    });
    return { proc, url };
  };
  let { proc, url } = start();
  try {
    let LBASE = await url;
    extraBases.push(LBASE);
    const readFile = () => { try { return JSON.parse(fs.readFileSync(dataFile, "utf8")); } catch { return null; } };
    const waitFor = async (pred) => { for (let i = 0; i < 50; i++) { if (pred()) return true; await new Promise((r) => setTimeout(r, 100)); } return false; };

    // The Spanish-only progress file opens as Spanish, unchanged.
    let ctx = await freshContext();
    let page = await newPage(ctx);
    await page.goto(LBASE);
    await page.waitForSelector("#app h1");
    const lang0 = await page.evaluate(() => window.COURSE && window.COURSE.lang.code);
    const st0 = await page.getAttribute('[data-lesson="a1-01"]', "data-status").catch(() => null);
    await page.goto(LBASE + "#/settings");
    const ps = await page.inputValue("#passScore");
    const stored = JSON.parse(await progress(page));
    check("progress saved by the Spanish-only version carries over unchanged", lang0 === "es" && st0 === "passed" && ps === "75" &&
      JSON.stringify(stored.langs.es.lessons) === JSON.stringify(legacy.lessons) && JSON.stringify(stored.langs.es.misses) === JSON.stringify(legacy.misses),
      `lang=${lang0} a1-01=${st0} passScore=${ps}`);
    await ctx.close();

    // Pass the first quiz in one browser profile…
    ctx = await freshContext();
    page = await newPage(ctx);
    await openCourse(page, LBASE, "es");
    const c = await course(page);
    const first = availableLessons(c)[1];
    await page.goto(LBASE + "#/quiz/" + first.id);
    await answerAll(page, () => true);
    const saved = await waitFor(() => { const d = readFile(); return d && d.langs && d.langs.es.lessons[first.id] && d.langs.es.lessons[first.id].passed; });
    check("launcher saves progress to a file on this computer", saved, dataFile);
    await page.goto(LBASE + "#/settings");
    const note = await page.textContent("#app");
    check("settings says progress is saved to the file", note.includes("my-progress.json"), note.slice(0, 80));
    // …and some French progress too, when there is French to pass.
    await openCourse(page, LBASE, "fr");
    const frFirst = availableLessons(await course(page))[0];
    if (frFirst) {
      await page.goto(LBASE + "#/quiz/" + frFirst.id);
      await answerAll(page, () => true);
      await waitFor(() => { const d = readFile(); return d && d.langs.fr && d.langs.fr.lessons[frFirst.id]; });
    }
    await ctx.close();

    // …then a brand-new profile (browser data wiped) still has it.
    ctx = await freshContext();
    page = await newPage(ctx);
    await page.goto(LBASE);
    await page.waitForSelector("#app h1");
    await openCourse(page, LBASE, "es");
    await page.waitForSelector(`[data-lesson="${first.id}"]`, { state: "attached" });
    const status = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
    check("progress survives wiping the browser's data (read back from the file)", status === "passed", `status=${status}`);

    // A later change is saved too, and the previous version is kept as a backup.
    await page.goto(LBASE + "#/settings");
    await page.fill("#passScore", "85");
    await page.click("#saveSettings");
    const updated = await waitFor(() => { const d = readFile(); return d && d.settings && d.settings.passScore === 85; });
    const backup = path.join(dir, "my-progress.backup.json");
    check("each save updates the file and keeps the previous version as a backup", updated && fs.existsSync(backup), `updated=${updated} backup=${fs.existsSync(backup)}`);
    await ctx.close();

    // Restarting the launcher: both languages' progress is still there.
    proc.kill();
    await new Promise((r) => setTimeout(r, 300));
    ({ proc, url } = start());
    LBASE = await url;
    extraBases.push(LBASE);
    ctx = await freshContext();
    page = await newPage(ctx);
    await openCourse(page, LBASE, "es");
    await page.waitForSelector(`[data-lesson="${first.id}"]`, { state: "attached" });
    const esAfter = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
    let frAfter = "n/a";
    if (frFirst) {
      await openCourse(page, LBASE, "fr");
      await page.waitForSelector(`[data-lesson="${frFirst.id}"]`, { state: "attached" });
      frAfter = await page.getAttribute(`[data-lesson="${frFirst.id}"]`, "data-status");
    }
    check("both languages' progress survives restarting the launcher", esAfter === "passed" && frAfter === "passed", `es=${esAfter} fr=${frAfter}`);
    await ctx.close();

    // Other websites open in the browser cannot write the file.
    const before = fs.readFileSync(dataFile, "utf8");
    const res = await fetch(LBASE + "api/progress", { method: "PUT", headers: { "Content-Type": "application/json", Origin: "http://evil.example" }, body: JSON.stringify({ lessons: {} }) });
    check("the progress file rejects writes from other websites", res.status === 403 && fs.readFileSync(dataFile, "utf8") === before, `status=${res.status}`);
  } finally {
    proc.kill();
  }
}

// ---------------------------------------------------------------- run
const only = process.argv.includes("--whole") ? [] : process.argv.includes("--lang") ? [process.argv[process.argv.indexOf("--lang") + 1]] : ["es", "fr"];
const perLanguage = [scenarioFileUrl, scenarioPracticeAndQuizBasics, scenarioPassScoreSetting, scenarioCumulativeQuiz, scenarioLevelTest, scenarioExportImportAndUpdate, scenarioSessionControls];
const whole = [scenarioAppearance, scenarioLanguageSwitching, scenarioVoices, scenarioFrenchTyping, scenarioLauncherFile];
for (const lang of only) {
  T = `[${lang}]`;
  for (const s of perLanguage) {
    const t0 = Date.now();
    try {
      await s(lang);
      if (process.env.APP_TEST_TIMING) console.error(`${T} ${s.name}: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    } catch (err) {
      check(`${T} ${s.name} ran to completion`, false, String(err).split("\n")[0]);
    }
  }
}
T = "";
if (!process.argv.includes("--lang")) {
  for (const s of whole) {
    const t0 = Date.now();
    try {
      await s();
      if (process.env.APP_TEST_TIMING) console.error(`${s.name}: ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    } catch (err) {
      check(`${s.name} ran to completion`, false, String(err).split("\n")[0]);
    }
  }
}
check("no requests to outside hosts (works offline)", outsideRequests.length === 0, outsideRequests.slice(0, 3).join(" "));
await browser.close();
server.close();

let failed = 0;
for (const r of results) {
  if (!r.ok) failed++;
  console.log(`${r.ok ? "  ok  " : "  FAIL"} ${r.name}${r.ok ? "" : "  — " + r.detail}`);
}
console.log(failed ? `\nAPP CHECK FAILED: ${failed} of ${results.length} checks` : `\napp ok: ${results.length} checks passed`);
process.exit(failed ? 1 : 0);
