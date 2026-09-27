// CHK-003 — drives the real app in a headless browser.
//
// Covers G3 (practice never changes progress), G4 (cumulative quizzes, pass threshold,
// configurable passing score, persistence), G5 (level tests), C-PRIVATE (no outside network)
// and C-PROGRESS-SAFE (reload, export/import, course update, and — via the launcher's
// scripts/serve.py — progress kept in a file that survives wiping the browser's data).
//
// The app is served from a throwaway local HTTP server and also opened straight from disk
// (file://), which is how Clara normally uses it. Any request to a host other than the local
// one fails the run.
//
//   node checks/scripts/app-test.mjs            # all scenarios
//   node checks/scripts/app-test.mjs --headed   # watch it

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
let courseDataOverride = null;

// ---------------------------------------------------------------- tiny static server
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json" };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  let p = decodeURIComponent(url.pathname);
  if (p === "/") p = "/index.html";
  if (p === "/course-data.js" && courseDataOverride) {
    res.writeHead(200, { "content-type": "text/javascript" });
    return res.end(courseDataOverride);
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
async function progress(page) {
  return page.evaluate((k) => localStorage.getItem(k), STORE_KEY);
}
async function setProgress(page, obj) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [STORE_KEY, obj]);
}
function availableLessons(c) {
  return c.levels.flatMap((l) => l.lessons).filter((l) => !l.missing);
}
function passedState(lessonIds, testIds = [], settings = {}) {
  const lessons = {};
  lessonIds.forEach((id) => (lessons[id] = { attempts: 1, best: 100, lastScore: 100, passed: true }));
  const tests = {};
  testIds.forEach((id) => (tests[id] = { attempts: 1, best: 100, lastScore: 100, passed: true }));
  return { version: 1, settings: { passScore: 80, quizLength: 20, speechRate: 0.9, ...settings }, lessons, tests, misses: {}, flagged: [] };
}
// Everything before `lessonId` in course order passed (and every earlier level test).
function progressUpTo(c, lessonId) {
  const ids = [];
  const tests = [];
  for (const level of c.levels) {
    for (const l of level.lessons) {
      if (l.id === lessonId) return passedState(ids, tests);
      ids.push(l.id);
    }
    tests.push(level.id);
  }
  return passedState(ids, tests);
}

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
      const words = item.answer.split(/\s+/);
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

// ---------------------------------------------------------------- scenarios
async function scenarioFileUrl() {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await page.goto("file://" + path.join(APP, "index.html"));
  const title = await page.textContent("h1");
  check("opens straight from disk (file://)", title && title.includes("Spanish course"), title);
  const c = await course(page);
  const first = availableLessons(c)[0];
  await page.goto("file://" + path.join(APP, "index.html") + "#/quiz/" + first.id);
  await answerAll(page, () => true);
  await page.reload();
  await page.goto("file://" + path.join(APP, "index.html") + "#/");
  const status = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  check("file:// progress survives a reload", status === "passed", `status=${status}`);
  await ctx.close();
}

async function scenarioPracticeAndQuizBasics() {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await page.goto(BASE);
  const c = await course(page);
  const lessons = availableLessons(c);
  const first = lessons[0];
  check("course data loaded", lessons.length > 0, `${lessons.length} lessons with content`);
  const status0 = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  check("first lesson open on a fresh start", status0 === "open", status0);
  const second = c.levels[0].lessons[1];
  const s2 = await page.getAttribute(`[data-lesson="${second.id}"]`, "data-status");
  check("second lesson locked on a fresh start", s2 === "locked", s2);

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
      for (const w of item.answer.split(/\s+/)) await q.locator(".tiles.pool button").filter({ hasText: exact(w) }).first().click();
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
  check("practice shows right/wrong feedback with the correct answer", sawWrongFeedback && sawRightFeedback, `wrong=${sawWrongFeedback} right=${sawRightFeedback}`);
  const after = await progress(page);
  check("practice leaves stored progress unchanged", before === after, `before=${before} after=${after}`);

  // G4: failing a quiz does not pass or unlock
  await page.goto(BASE + "#/quiz/" + first.id);
  await answerAll(page, () => false);
  const failPass = await page.getAttribute("[data-role=result]", "data-pass");
  await page.goto(BASE + "#/");
  const afterFail = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  const nextAfterFail = await page.getAttribute(`[data-lesson="${second.id}"]`, "data-status");
  check("a quiz below the passing score does not pass the lesson", failPass === "false" && afterFail !== "passed" && nextAfterFail === "locked", `${failPass} ${afterFail} ${nextAfterFail}`);

  // G4: passing unlocks the next lesson and shows on the dashboard; survives reload
  await page.goto(BASE + "#/quiz/" + first.id);
  await answerAll(page, () => true);
  const passFlag = await page.getAttribute("[data-role=result]", "data-pass");
  await page.goto(BASE + "#/");
  await page.reload();
  const afterPass = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  const nextAfterPass = await page.getAttribute(`[data-lesson="${second.id}"]`, "data-status");
  const overall = await page.textContent("[data-role=level-progress]");
  check("passing a quiz passes the lesson, and it persists after reload", passFlag === "true" && afterPass === "passed", `${passFlag} ${afterPass}`);
  check("passing unlocks the next lesson", second.missing ? nextAfterPass === "locked" : nextAfterPass === "open", `next=${nextAfterPass} (missing content: ${!!second.missing})`);
  check("dashboard shows level progress", /1 \/ \d+ lessons/.test(overall), overall);
  await ctx.close();
}

async function scenarioPassScoreSetting() {
  for (const [score, expectPass] of [[50, true], [80, false]]) {
    const ctx = await freshContext();
    const page = await newPage(ctx);
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
    check(`passing score ${score}%: a ~65% quiz ${expectPass ? "passes" : "fails"}`, pass === String(expectPass), `pass=${pass}, ${rightCount}/${total}`);
    await ctx.close();
  }
}

async function scenarioCumulativeQuiz() {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await page.goto(BASE);
  const c = await course(page);
  const lessons = availableLessons(c);
  const target = lessons[lessons.length - 1];
  const earlier = lessons.slice(0, -1);
  if (earlier.length < 3) {
    check("cumulative quiz draws on earlier lessons", false, "need at least 4 lessons with content to test");
    return ctx.close();
  }
  // Heavily missed item in an early lesson should be favoured.
  const weak = earlier[1].items.find((it) => it.type !== "listen");
  const st = progressUpTo(c, target.id);
  st.misses[weak.id] = 1000; // heavy enough that "favoured" is near-certain, not a coin flip
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
    await setProgress(page, { ...st });
  }
  check("a late quiz includes questions from several earlier lessons", Math.min(...spans) >= 3, `earlier lessons per run: ${spans.join(", ")}`);
  check("most of a quiz comes from the current lesson", Math.min(...ownShare) >= 0.5, `own share: ${ownShare.map((x) => x.toFixed(2)).join(", ")}`);
  check("items previously missed are favoured", sawWeak >= 2, `weak item appeared in ${sawWeak}/3 quizzes`);
  await ctx.close();
}

async function scenarioLevelTest() {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await page.goto(BASE);
  const c = await course(page);
  const complete = c.levels.filter((l) => l.lessons.every((x) => !x.missing));
  if (!complete.length) {
    check("level test is reachable and cumulative", false, "no level has all its lessons written yet");
    return ctx.close();
  }
  const level = complete[complete.length - 1];
  const li = c.levels.indexOf(c.levels.find((l) => l.id === level.id));
  const nextLevel = c.levels[li + 1];
  const st = progressUpTo(c, nextLevel ? nextLevel.lessons[0].id : "__end__");
  delete st.tests[level.id];
  await setProgress(page, st);
  await page.goto(BASE + "#/");
  const tstatus = await page.getAttribute(`[data-test="${level.id}"]`, "data-status");
  check(`${level.id} level test unlocks when all its lessons are passed`, tstatus === "open", tstatus);
  if (nextLevel) {
    const n0 = await page.getAttribute(`[data-lesson="${nextLevel.lessons[0].id}"]`, "data-status");
    check(`next level stays locked until the ${level.id} test is passed`, n0 === "locked", n0);
  }
  await page.goto(BASE + "#/test/" + level.id);
  const seen = await answerAll(page, () => true);
  const own = new Set(seen.map((s) => s.lesson).filter((l) => level.lessons.some((x) => x.id === l)));
  const back = seen.filter((s) => !level.lessons.some((x) => x.id === s.lesson)).length;
  check(`${level.id} test spans the level`, own.size >= Math.min(10, level.lessons.length), `${own.size} of ${level.lessons.length} lessons`);
  if (li > 0) check(`${level.id} test includes earlier levels`, back > 0, `${back} questions from earlier levels`);
  const pass = await page.getAttribute("[data-role=result]", "data-pass");
  await page.goto(BASE + "#/");
  const after = await page.getAttribute(`[data-test="${level.id}"]`, "data-status");
  check(`passing the ${level.id} test is recorded on the dashboard`, pass === "true" && after === "passed", `${pass} ${after}`);
  if (nextLevel && !nextLevel.lessons[0].missing) {
    const n1 = await page.getAttribute(`[data-lesson="${nextLevel.lessons[0].id}"]`, "data-status");
    check("passing a level test opens the next level", n1 === "open", n1);
  }
  await ctx.close();
}

async function scenarioExportImportAndUpdate() {
  const ctx = await freshContext();
  const page = await newPage(ctx);
  await page.goto(BASE);
  const c = await course(page);
  const first = availableLessons(c)[0];
  await page.goto(BASE + "#/quiz/" + first.id);
  await answerAll(page, () => true);
  await page.goto(BASE + "#/settings");
  const [download] = await Promise.all([page.waitForEvent("download"), page.click("#export")]);
  const file = await download.path();
  const exported = JSON.parse(fs.readFileSync(file, "utf8"));
  check("export contains the passed lesson", exported.lessons && exported.lessons[first.id] && exported.lessons[first.id].passed, JSON.stringify(exported.lessons || {}).slice(0, 120));

  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + "#/");
  await page.reload();
  const cleared = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  await page.goto(BASE + "#/settings");
  await page.setInputFiles("#import", file);
  await page.waitForFunction(() => document.getElementById("ioMsg") && document.getElementById("ioMsg").textContent.length > 0);
  await page.goto(BASE + "#/");
  const restored = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  check("clearing site data then importing the export restores progress", cleared === "open" && restored === "passed", `cleared=${cleared} restored=${restored}`);

  // Course update: a new lesson is inserted and items change; existing progress survives.
  const data = JSON.parse(fs.readFileSync(path.join(APP, "course-data.js"), "utf8").replace(/^[^\n]*\nwindow\.COURSE = /, "").replace(/;\s*$/, ""));
  data.levels[0].lessons.splice(1, 0, { id: "zz-new", level: data.levels[0].id, title: "A new lesson", objective: "Added in an update", missing: true });
  data.levels[0].lessons[0].items = data.levels[0].lessons[0].items.slice(1);
  courseDataOverride = "window.COURSE = " + JSON.stringify(data) + ";";
  await page.goto(BASE + "#/");
  await page.reload();
  const afterUpdate = await page.getAttribute(`[data-lesson="${first.id}"]`, "data-status");
  const stored = JSON.parse(await progress(page));
  check("progress survives an update to the course content", afterUpdate === "passed" && stored.lessons[first.id].passed, `status=${afterUpdate}`);
  courseDataOverride = null;
  await ctx.close();
}

async function scenarioLauncherFile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "spanish-progress-"));
  const dataFile = path.join(dir, "my-progress.json");
  const proc = spawn("python3", [path.join(ROOT, "scripts/serve.py"), "--port", "0", "--no-browser", "--data", dataFile], { stdio: ["ignore", "pipe", "pipe"] });
  try {
    const LBASE = await new Promise((resolve, reject) => {
      let out = "";
      const t = setTimeout(() => reject(new Error("launcher did not start: " + out)), 10000);
      proc.stdout.on("data", (d) => {
        out += d;
        const m = out.match(/running at (http:\/\/127\.0\.0\.1:\d+\/)/);
        if (m) { clearTimeout(t); resolve(m[1]); }
      });
      proc.on("exit", (code) => reject(new Error("launcher exited " + code + ": " + out)));
    });
    extraBases.push(LBASE);
    const readFile = () => { try { return JSON.parse(fs.readFileSync(dataFile, "utf8")); } catch { return null; } };
    const waitFor = async (pred) => { for (let i = 0; i < 50; i++) { if (pred()) return true; await new Promise((r) => setTimeout(r, 100)); } return false; };

    // Pass the first quiz in one browser profile…
    let ctx = await freshContext();
    let page = await newPage(ctx);
    await page.goto(LBASE);
    const c = await course(page);
    const first = availableLessons(c)[0];
    await page.goto(LBASE + "#/quiz/" + first.id);
    await answerAll(page, () => true);
    const saved = await waitFor(() => { const d = readFile(); return d && d.lessons && d.lessons[first.id] && d.lessons[first.id].passed; });
    check("launcher saves progress to a file on this computer", saved, dataFile);
    await page.goto(LBASE + "#/settings");
    const note = await page.textContent("#app");
    check("settings says progress is saved to the file", note.includes("my-progress.json"), note.slice(0, 80));
    await ctx.close();

    // …then a brand-new profile (browser data wiped) still has it.
    ctx = await freshContext();
    page = await newPage(ctx);
    await page.goto(LBASE);
    await page.waitForSelector(`[data-lesson="${first.id}"]`);
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

    // Other websites open in the browser cannot write the file.
    const before = fs.readFileSync(dataFile, "utf8");
    const res = await fetch(LBASE + "api/progress", { method: "PUT", headers: { "Content-Type": "application/json", Origin: "http://evil.example" }, body: JSON.stringify({ lessons: {} }) });
    check("the progress file rejects writes from other websites", res.status === 403 && fs.readFileSync(dataFile, "utf8") === before, `status=${res.status}`);
  } finally {
    proc.kill();
  }
}

// ---------------------------------------------------------------- run
const scenarios = [scenarioFileUrl, scenarioPracticeAndQuizBasics, scenarioPassScoreSetting, scenarioCumulativeQuiz, scenarioLevelTest, scenarioExportImportAndUpdate, scenarioLauncherFile];
for (const s of scenarios) {
  try {
    await s();
  } catch (err) {
    check(`${s.name} ran to completion`, false, String(err).split("\n")[0]);
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
