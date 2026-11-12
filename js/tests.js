// Checks for the pure functions and for content.js. Open tests.html (through start.bat).

import { toISODate, fromISODate, addDays, daysBetween, friendlyDate, isNight, joinTime, toMinutes, shiftTime,
  minutesUntil, lastTimeOf, isBetweenTimes, monthGrid, nextOccurrence, occursOn, daysWord } from "./dates.js";
import { makeTask, isOverdue, orderTasks, timelineView, finishTask, postponeTask, lengthLabel,
  upgradeTask, toggleStep, addStep, nextStepIndex } from "./tasks.js";
import { topProblems } from "./questionnaire.js";
import { normalize, checkContent, mergeContent } from "./content-check.js";
import { pickRealization, fillText, RealizationCard } from "./realization.js";
import * as realContent from "../content/content.js";
import * as extraContent from "../content/extra.js";
import { formatRemaining, nextPhase, phaseMinutes, prepareTimer, changeLength, currentTimer, timeLeft, resetTimer } from "./focus-timer.js";
import { dueTaskReminders, dueDateReminders, dueSleepReminders, reminderText } from "./notifications.js";
import { sessionFrom, errorMessage, isSecretKey, tokensFromLink, mergeStates } from "./account.js";
import { sortGoals, topGoal, priorityMap, priorityLabel } from "./goal-list.js";
import { sleepStatus, sleepLength, isEvening } from "./sleep.js";
import { fromSaved } from "./store.js";

const lines = [];
let passed = 0;
let failed = 0;

// Compares by JSON text, so arrays and objects can be compared too.
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    passed++;
    lines.push(`PASS  ${name}`);
  } else {
    failed++;
    lines.push(`FAIL  ${name}\n        expected ${JSON.stringify(expected)}\n        got      ${JSON.stringify(actual)}`);
  }
}

// ---------- dates.js ----------
check("toISODate pads month and day", toISODate(new Date(2026, 0, 5)), "2026-01-05");
check("fromISODate gives the local day", fromISODate("2026-11-05").getDate(), 5);
check("addDays crosses a month end", addDays("2026-02-28", 1), "2026-03-01");
check("addDays crosses a year end", addDays("2026-12-31", 1), "2027-01-01");
check("daysBetween across the Nov 1 clock change", daysBetween("2026-10-31", "2026-11-02"), 2);
check("friendlyDate today", friendlyDate("2026-11-04", "2026-11-04"), "today");
check("friendlyDate tomorrow", friendlyDate("2026-11-05", "2026-11-04"), "tomorrow");
check("friendlyDate yesterday", friendlyDate("2026-11-03", "2026-11-04"), "yesterday");
check("friendlyDate this week shows the day", friendlyDate("2026-11-07", "2026-11-04"), "Sat");
check("friendlyDate further away shows the date", friendlyDate("2026-11-20", "2026-11-04"), "Nov 20");
check("friendlyDate no date", friendlyDate("", "2026-11-04"), "anytime");
check("isNight at 23:30", isNight(new Date(2026, 10, 4, 23, 30)), true);
check("isNight at 22:59", isNight(new Date(2026, 10, 4, 22, 59)), false);
check("isNight at 04:59", isNight(new Date(2026, 10, 4, 4, 59)), true);
check("isNight at 05:00", isNight(new Date(2026, 10, 4, 5, 0)), false);
check("joinTime hour and minutes", joinTime("09", "30"), "09:30");
check("joinTime hour only means on the hour", joinTime("14", ""), "14:00");
check("joinTime no hour means no time", joinTime("", "30"), "");

// ---------- tasks.js ----------
const today = "2026-11-04";
const t = (id, date, time = "") => makeTask({ title: id, date, time }, "2026-11-01", id);
const tasks = [t("future", "2026-11-09"), t("anytime", ""), t("today-untimed", today), t("today-14", today, "14:00"),
  t("missed", "2026-11-02"), t("today-09", today, "09:00")];

check("makeTask trims the title", makeTask({ title: "  Essay  " }, today, "x").title, "Essay");
check("makeTask without a date is anytime", makeTask({ title: "A" }, today, "x").date, "");
check("isOverdue for a past day", isOverdue(tasks[4], today), true);
check("isOverdue not for today", isOverdue(tasks[2], today), false);
check("isOverdue not for anytime", isOverdue(tasks[1], today), false);
check("orderTasks: missed, today by time, untimed, anytime, later",
  orderTasks(tasks, today).map((task) => task.id),
  ["missed", "today-09", "today-14", "today-untimed", "anytime", "future"]);
const view = timelineView([...tasks, finishTask(t("done", today), today)], today, 4);
check("timelineView shows 4", view.shown.length, 4);
check("timelineView hides the rest", view.hidden.map((task) => task.id), ["anytime", "future"]);
check("timelineView counts done today", view.doneToday, 1);
check("finishTask marks the day", finishTask(tasks[0], today).doneDate, today);
check("postponeTask moves to tomorrow", postponeTask(tasks[4], today).date, "2026-11-05");
check("postponeTask counts", postponeTask(postponeTask(tasks[4], today), today).postponed, 2);
check("lengthLabel 10", lengthLabel(10), "10 min");
check("lengthLabel 90", lengthLabel(90), "1 h 30 min");
check("lengthLabel 120", lengthLabel(120), "2 h");
check("lengthLabel empty", lengthLabel(null), "");

// steps
const withSteps = makeTask({ title: "Essay", steps: [" open the doc ", "", "write the intro"] }, today, "s");
check("makeTask keeps steps, trimmed, without empty ones", withSteps.steps,
  [{ text: "open the doc", done: false }, { text: "write the intro", done: false }]);
check("makeTask still accepts one firstStep", makeTask({ title: "A", firstStep: "go" }, today, "x").steps, [{ text: "go", done: false }]);
check("upgradeTask turns an old firstStep into a step", upgradeTask({ id: "o", title: "Old", firstStep: "open it" }),
  { id: "o", title: "Old", steps: [{ text: "open it", done: false }] });
check("upgradeTask with an empty firstStep gives no steps", upgradeTask({ id: "o", firstStep: "" }).steps, []);
check("upgradeTask leaves new tasks alone", upgradeTask(withSteps), withSteps);
const ticked = toggleStep(withSteps, 0);
check("toggleStep ticks one step", ticked.steps.map((s) => s.done), [true, false]);
check("toggleStep doesn't change the original", withSteps.steps[0].done, false);
check("toggleStep again unticks", toggleStep(ticked, 0).steps[0].done, false);
check("nextStepIndex skips ticked steps", nextStepIndex(ticked), 1);
check("nextStepIndex is -1 when all are ticked", nextStepIndex(toggleStep(ticked, 1)), -1);
check("addStep adds at the end", addStep(withSteps, "  check it ").steps.at(-1), { text: "check it", done: false });
check("addStep ignores an empty text", addStep(withSteps, "   ").steps.length, 2);

// ---------- focus-timer.js ----------
check("formatRemaining 10 minutes", formatRemaining(600_000), "10:00");
check("formatRemaining pads seconds", formatRemaining(65_000), "1:05");
check("formatRemaining rounds up the last second", formatRemaining(400), "0:01");
check("formatRemaining never goes below zero", formatRemaining(-5_000), "0:00");

// ---------- focus-timer.js: the pomodoro rounds ----------
check("nextPhase: focus -> short break", nextPhase("work", 1, 4), { phase: "short", round: 1 });
check("nextPhase: the last focus round -> long break", nextPhase("work", 4, 4), { phase: "long", round: 4 });
check("nextPhase: short break -> next focus round", nextPhase("short", 1, 4), { phase: "work", round: 2 });
check("nextPhase: long break -> round 1 again", nextPhase("long", 4, 4), { phase: "work", round: 1 });
const pomodoro = { work: 25, short: 5, long: 15, rounds: 4 };
check("phaseMinutes: a focus round", phaseMinutes("work", pomodoro), 25);
check("phaseMinutes: a 10-minute task gets a 10-minute round", phaseMinutes("work", pomodoro, 10), 10);
check("phaseMinutes: a long task still gets 25", phaseMinutes("work", pomodoro, 90), 25);
check("phaseMinutes: breaks", [phaseMinutes("short", pomodoro), phaseMinutes("long", pomodoro)], [5, 15]);
prepareTimer(25, { phase: "work", round: 1 });
currentTimer().left = 20 * 60_000; // 5 minutes done
changeLength(30);
check("changeLength: longer keeps the time done (30 - 5 = 25 min left)", timeLeft(), 25 * 60_000);
changeLength(4);
check("changeLength: shorter than the time done ends it (0 left)", timeLeft(), 0);
resetTimer();

// ---------- dates.js: times of day and the calendar ----------
check("toMinutes", toMinutes("07:30"), 450);
check("shiftTime back over midnight", shiftTime("00:30", -60), "23:30");
check("shiftTime forward over midnight", shiftTime("23:30", 45), "00:15");
check("minutesUntil later today", minutesUntil("23:00", new Date(2026, 10, 9, 21, 15)), 105);
check("minutesUntil tomorrow", minutesUntil("07:00", new Date(2026, 10, 9, 23, 0)), 480);
check("lastTimeOf earlier today", lastTimeOf("22:30", new Date(2026, 10, 9, 22, 40)), { minutes: 10, date: "2026-11-09" });
check("lastTimeOf yesterday", lastTimeOf("23:50", new Date(2026, 10, 10, 0, 5)), { minutes: 15, date: "2026-11-09" });
check("isBetweenTimes across midnight: at 01:00", isBetweenTimes(new Date(2026, 10, 9, 1, 0), "23:00", "07:00"), true);
check("isBetweenTimes across midnight: at 12:00", isBetweenTimes(new Date(2026, 10, 9, 12, 0), "23:00", "07:00"), false);
check("isBetweenTimes in one day", isBetweenTimes(new Date(2026, 10, 9, 12, 0), "09:00", "17:00"), true);
const november = monthGrid(2026, 10); // Nov 1, 2026 is a Sunday
check("monthGrid: weeks start on Monday", november[0], ["", "", "", "", "", "", "2026-11-01"]);
check("monthGrid: 6 rows for November 2026", november.length, 6);
check("monthGrid: the last day", november.flat().filter(Boolean).at(-1), "2026-11-30");
check("nextOccurrence: a yearly date later this year", nextOccurrence("2001-12-03", true, "2026-11-09"), "2026-12-03");
check("nextOccurrence: a yearly date that passed comes next year", nextOccurrence("2001-03-14", true, "2026-11-09"), "2027-03-14");
check("nextOccurrence: a one-time date that passed", nextOccurrence("2026-11-01", false, "2026-11-09"), "");
check("occursOn: yearly", occursOn("2001-12-03", true, "2026-12-03"), true);
check("occursOn: not before the first year", occursOn("2027-12-03", true, "2026-12-03"), false);
check("daysWord", [0, 1, 4].map(daysWord), ["today", "tomorrow", "in 4 days"]);

// ---------- notifications.js ----------
const at = (h, m) => new Date(2026, 10, 7, h, m);
const rt = (id, time, extra = {}) => ({ ...makeTask({ title: id, date: "2026-11-07", time, steps: ["open it"] }, "2026-11-07", id), ...extra });
const rTasks = [rt("r1", "14:00"), rt("r2", "14:30"), rt("r3", ""), rt("r4", "14:05", { done: true }), rt("r5", "14:00", { date: "2026-11-08" })];
const due = (now, before, reminded = {}) => dueTaskReminders(rTasks, now, before, reminded).map((item) => item.key);
check("tasks: 10 min before, only the task in range", due(at(13, 50), 10), ["r1"]);
check("tasks: not 11 min before", due(at(13, 49), 10), []);
check("tasks: skips a task already reminded", due(at(13, 55), 10, { r1: "2026-11-07 14:00" }), []);
check("tasks: a task moved to a new time is reminded again", due(at(14, 25), 10, { r1: "2026-11-07 14:00", r2: "2026-11-07 14:00" }), ["r2"]);
check("tasks: nothing more than an hour late", due(at(15, 31), 10), []);
check("tasks: 0 = at the task's time", due(at(14, 0), 0), ["r1"]);
check("tasks: -1 = off", due(at(14, 0), -1), []);
check("reminderText shows the next step", reminderText(rTasks[0]), "At 14:00 · next step: open it");
const birthday = { id: "b", title: "Mom's birthday", date: "1975-11-10", yearly: true, remindDays: 1 };
const exam = { id: "e", title: "Exam", date: "2026-11-12", yearly: false, remindDays: 3 };
const quiet = { id: "q", title: "No reminder", date: "2026-11-07", yearly: false, remindDays: -1 };
const dates = [birthday, exam, quiet];
check("dates: before the chosen time, nothing yet", dueDateReminders(dates, at(8, 0), "09:00", {}), []);
check("dates: 1 day before a birthday, and 3+ days before an exam... only those in range",
  dueDateReminders(dates, new Date(2026, 10, 9, 9, 30), "09:00", {}).map((d) => [d.key, d.value, d.body]),
  [["date:b", "2026-11-10", "tomorrow"], ["date:e", "2026-11-12", "in 3 days"]]);
check("dates: not twice for the same occurrence", dueDateReminders([birthday], new Date(2026, 10, 10, 10, 0), "09:00", { "date:b": "2026-11-10" }), []);
check("dates: -1 = no reminder", dueDateReminders([quiet], at(10, 0), "09:00", {}), []);
const night = { on: true, bed: "23:00", wake: "07:00" };
check("sleep: wind-down 30 min before", dueSleepReminders(night, new Date(2026, 10, 9, 22, 35), 30, {}).map((d) => d.title), ["Wind down"]);
check("sleep: at bedtime", dueSleepReminders(night, new Date(2026, 10, 9, 23, 2), 30, { "sleep:wind-down": "2026-11-09" }).map((d) => d.title), ["Time to sleep"]);
check("sleep: once a night", dueSleepReminders(night, new Date(2026, 10, 9, 23, 5), 30, { "sleep:wind-down": "2026-11-09", "sleep:bed": "2026-11-09" }), []);
check("sleep: none without a schedule", dueSleepReminders({ ...night, on: false }, new Date(2026, 10, 9, 23, 0), 30, {}), []);
check("sleep: -1 = off", dueSleepReminders(night, new Date(2026, 10, 9, 23, 0), -1, {}), []);

// ---------- sleep.js ----------
check("sleepStatus without a schedule", sleepStatus({ on: false, bed: "23:00", wake: "07:00" }, at(20, 0)), null);
check("sleepStatus in the evening", sleepStatus(night, new Date(2026, 10, 9, 21, 15)).text, "bed in 1 h 45 min");
check("sleepStatus at night", sleepStatus(night, new Date(2026, 10, 9, 2, 0)).text, "sleep time");
check("sleepLength", sleepLength(night), 480);
check("isEvening an hour before bed", isEvening(night, new Date(2026, 10, 9, 22, 0)), true);
check("isEvening in the afternoon", isEvening(night, new Date(2026, 10, 9, 15, 0)), false);

// ---------- goal-list.js ----------
const goals = [{ id: "a", text: "A", priority: 2 }, { id: "b", text: "B", priority: 1 }, { id: "c", text: "C", priority: 2 }, { id: "d", text: "D", priority: 3 }];
check("sortGoals: high first; same priority keeps its order", sortGoals(goals).map((g) => g.id), ["b", "a", "c", "d"]);
check("topGoal", topGoal(goals).text, "B");
check("topGoal with no goals", topGoal([]), null);
check("priorityMap", priorityMap(goals), { a: 2, b: 1, c: 2, d: 3 });
check("priorityLabel", [1, 2, 3].map(priorityLabel), ["High", "Medium", "Low"]);
const forGoals = [makeTask({ title: "none", date: today }, today, "n"), makeTask({ title: "low", date: today, goalId: "d" }, today, "l"),
  makeTask({ title: "high", date: today, goalId: "b" }, today, "h")];
check("orderTasks: tasks of a high-priority goal first", orderTasks(forGoals, today, priorityMap(goals)).map((t) => t.title), ["high", "low", "none"]);

// ---------- store.js: data from older versions ----------
const old = fromSaved({ profile: { name: "Sam", goal: "pass math", answers: {}, topProblems: [], date: "2026-11-01" }, settings: { reminders: true } });
check("fromSaved: the old single goal becomes a high-priority goal", old.goals, [{ id: "g-old-pass-math", text: "pass math", priority: 1 }]);
const joinedGoals = mergeStates(
  { goals: [{ id: "g1", text: "run", priority: 2 }], profile: { name: "", answers: {} } },
  { profile: { name: "Sam", goal: "pass math", answers: {} } },
).goals.map((g) => g.text);
check("mergeStates: an old goal in the account isn't lost next to this device's goals", joinedGoals, ["run", "pass math"]);
check("fromSaved: and leaves the profile", "goal" in old.profile, false);
check("fromSaved: old settings keep their value and get the new fields", [old.settings.reminders, old.settings.windDown, old.settings.focus.work], [true, 30, 25]);
check("fromSaved: nothing saved yet", fromSaved(null).sleep, { on: false, bed: "23:00", wake: "07:00" });

// ---------- account.js ----------
check("sessionFrom keeps the tokens and the user",
  sessionFrom({ access_token: "a", refresh_token: "r", expires_at: 1000, user: { id: "u1", email: "e@x.com", role: "authenticated" } }),
  { accessToken: "a", refreshToken: "r", expiresAt: 1_000_000, user: { id: "u1", email: "e@x.com" } });
check("sessionFrom without expires_at uses expires_in", sessionFrom({ access_token: "a", refresh_token: "r", expires_in: 3600 }, 5000).expiresAt, 3_605_000);
check("errorMessage reads the newer shape", errorMessage({ code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" }), "Invalid login credentials");
check("errorMessage reads the older shape", errorMessage({ error: "invalid_grant", error_description: "Invalid login credentials" }), "Invalid login credentials");
check("errorMessage reads a database error", errorMessage({ code: "42501", message: "new row violates row-level security policy" }), "new row violates row-level security policy");
const fakeJwt = (role) => `x.${btoa(JSON.stringify({ role })).replace(/=+$/, "")}.y`;
check("isSecretKey refuses a secret key", isSecretKey("sb_secret_abc"), true);
check("isSecretKey refuses an old service_role key", isSecretKey(fakeJwt("service_role")), true);
check("isSecretKey allows a publishable key", isSecretKey("sb_publishable_abc"), false);
check("isSecretKey allows an old anon key", isSecretKey(fakeJwt("anon")), false);
check("tokensFromLink reads a confirmation link", tokensFromLink("#access_token=a&expires_in=3600&refresh_token=r&token_type=bearer&type=signup"),
  { access_token: "a", refresh_token: "r", expires_in: 3600 });
check("tokensFromLink ignores other links", tokensFromLink("#section-2"), null);
const here = { profile: null, tasks: [{ id: "t1", title: "here" }, { id: "t2", title: "both: here" }], notes: [{ id: "n-b", text: "here" }],
  saved: ["r1"], seen: { r1: 2, r2: 1 }, shownOn: {}, settings: { reminders: true, remindBefore: 5 }, reminded: {} };
const there = { profile: { name: "Sam" }, tasks: [{ id: "t2", title: "both: account" }, { id: "t3", title: "account" }], notes: [{ id: "n-a", text: "account" }],
  saved: ["r2"], seen: { r1: 1, r3: 4 }, shownOn: {}, settings: null, reminded: {} };
const joined = mergeStates(here, there);
check("mergeStates joins tasks by id; the account wins a tie", joined.tasks.map((t) => t.title), ["here", "both: account", "account"]);
check("mergeStates keeps the newest note first", joined.notes.map((n) => n.id), ["n-b", "n-a"]);
check("mergeStates joins saved realizations", joined.saved, ["r1", "r2"]);
check("mergeStates keeps the higher seen count", joined.seen, { r1: 2, r2: 1, r3: 4 });
check("mergeStates takes the account's profile", joined.profile, { name: "Sam" });
check("mergeStates keeps this device's settings if the account has none", joined.settings, { reminders: true, remindBefore: 5 });

// ---------- questionnaire.js ----------
const qs = [{ id: "a", problem: "focus" }, { id: "b", problem: "sleep" }, { id: "c", problem: "shame" }, { id: "d", problem: "boring" }];
check("topProblems highest first", topProblems({ a: 2, b: 4, c: 3, d: 1 }, qs), ["sleep", "shame", "focus"]);
check("topProblems ignores below Sometimes", topProblems({ a: 1, b: 0 }, qs), []);
check("topProblems ties keep question order", topProblems({ a: 3, b: 3 }, qs), ["focus", "sleep"]);
check("topProblems skips unanswered", topProblems({}, qs), []);

// ---------- realization.js ----------
const rs = [
  { id: "for-p", moments: ["m"], problems: ["p"] },
  { id: "general", moments: ["m"], problems: [] },
  { id: "other-moment", moments: ["n"], problems: ["p"] },
];
const pick = (...args) => pickRealization(rs, ...args)?.id ?? null;
check("pick: made for the problem wins a tie", pick("m", ["p"], {}), "for-p");
check("pick: least shown wins", pick("m", ["p"], { "for-p": 1 }), "general");
check("pick: other problem falls back to general", pick("m", ["q"], {}), "general");
check("pick: wrong moment gives nothing", pick("n", ["q"], {}), null);
check("pick: unknown moment gives nothing", pick("x", [], {}), null);
check("fillText with a name", fillText("{name}, hi", { name: "Sam" }), "Sam, hi");
check("fillText without a profile", fillText("{name}, hi", null), "Hey, hi");
check("fillText goal", fillText("why {goal}", { goal: "pass math" }), "why pass math");
const card = new RealizationCard({ id: "t", kind: "reassurance", text: "<b>not bold</b>", problems: [], moments: ["m"],
  source: "https://www.nhs.uk/page", sample: true });
check("card shows its kind and SAMPLE tag", card.element.querySelector(".card-kind").textContent, "Reassurancesample");
check("card shows text as text, not HTML", card.element.querySelector("b"), null);
check("card puts the source in its foot", card.element.querySelector(".card-foot .source").textContent, "source: nhs.uk");

// ---------- content.js + extra.js ----------
const problemsFound = checkContent(normalize(mergeContent(realContent, extraContent)));
check("content.js + extra.js have no problems", problemsFound, []);
const merged = mergeContent({ scale: ["a", "b"], problems: [{ id: "x" }], tips: [] }, { problems: [{ id: "y" }], tips: [{ id: "t" }] });
check("mergeContent joins the lists in order", merged.problems.map((p) => p.id), ["x", "y"]);
check("mergeContent takes scale from the first file", merged.scale, ["a", "b"]);
check("mergeContent gives empty lists for missing ones", merged.realizations, []);
const twice = normalize(mergeContent({ problems: [{ id: "x", label: "X" }], scale: ["a", "b"] }, { problems: [{ id: "x", label: "X again" }] }));
check("the checker catches an id used in both files", checkContent(twice), ['problems #2 "x": the id is used twice']);
const broken = normalize({ problems: [{ id: "x", label: "X" }], scale: ["a", "b"],
  realizations: [{ id: "r", kind: "realization", text: "", problems: ["nope"], moments: ["sometime"] }] });
check("the checker finds mistakes", checkContent(broken), [
  'realizations #1 "r": missing "text"',
  'realizations #1 "r": unknown problem "nope"',
  'realizations #1 "r": unknown moment "sometime"',
]);

const badContacts = normalize({ problems: [], scale: ["a", "b"],
  contacts: [{ id: "x", kind: "crisis", name: "X", how: "Call", call: "98-8" }, { id: "y", kind: "hotline", name: "Y", how: "Call" }] });
check("the checker catches a bad phone number and kind", checkContent(badContacts), [
  'contacts #1 "x": call must be digits only',
  'contacts #2 "y": kind must be "crisis" or "professional"',
]);

// ---------- report ----------
document.getElementById("summary").textContent =
  failed === 0 ? `All ${passed} checks passed.` : `${failed} of ${passed + failed} checks FAILED.`;
document.getElementById("report").textContent = lines.join("\n");
