// The Focus page: a pomodoro timer. Focus rounds with short breaks, a long break after the
// last round. Started from a task, it shows that task's next step while it runs.
// Lengths and rounds can be changed while it runs; when a part ends, a full-screen alert
// and a system notification say so.

import { state, save } from "./store.js";
import { currentTimer, onTimer, prepareTimer, startTimer, resumeTimer, pauseTimer, resetTimer, timeLeft,
  nextPhase, phaseMinutes, formatRemaining, changeLength } from "./focus-timer.js";
import { notify, permission, askPermission } from "./notifications.js";
import { showPage, currentPage } from "./nav.js";
import { el, button, pageBody, iconButton } from "./ui.js";

const PHASE_NAMES = { work: "Focus", short: "Break", long: "Long break" };

let settingsOpen = false; // the Timer fold stays open while its numbers are changed
let pageTitle = null; // the tab title before an alert changed it

// Every second: only the time texts change (here and on Today), nothing is redrawn.
onTimer({
  tick: (msLeft) => showTime(msLeft),
  end: (ended) => {
    const settings = state.settings.focus;
    const next = nextPhase(ended.phase, ended.round, settings.rounds);
    const task = state.tasks.find((t) => t.id === ended.taskId);
    prepareTimer(phaseMinutes(next.phase, settings, task?.minutes), { ...next, taskId: ended.taskId });
    const title = ended.phase === "work" ? "Break time" : "Back to focus";
    const body = ended.phase === "work" ? "Well done. Rest a little." : task?.title ?? "Next round";
    showEndAlert(title, body, next.phase); // fills the whole screen, on any page
    if (state.settings.focusEnd) notify(title, body, "focus", { banner: false, sticky: true }); // over other windows too
    refresh();
  },
});

function showTime(msLeft = timeLeft()) {
  for (const id of ["focus-time", "focus-pill-time"]) {
    const text = document.getElementById(id);
    if (text) text.textContent = formatRemaining(msLeft);
  }
}

function refresh() {
  if (currentPage() === "focus") drawFocus();
  document.dispatchEvent(new Event("focus-timer-change")); // Today redraws its timer line
}

// Called from a task on Today: a focus round for that task.
export function startFocusFor(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  askForNotifications();
  startTimer(phaseMinutes("work", state.settings.focus, task?.minutes), { phase: "work", round: 1, taskId });
  showPage("focus");
}

// The end-of-timer notification needs the browser's permission, asked once, on a tap.
function askForNotifications() {
  if (state.settings.focusEnd && permission() === "default") askPermission();
}

export function drawFocus() {
  const body = pageBody("focus");
  const settings = state.settings.focus;
  if (!currentTimer()) prepareTimer(settings.work, { phase: "work", round: 1, taskId: null });
  const timer = currentTimer();
  const task = state.tasks.find((t) => t.id === timer.taskId && !t.done);

  body.append(el("p", "phase", PHASE_NAMES[timer.phase]));
  const time = el("p", "big-time", formatRemaining(timeLeft()));
  time.id = "focus-time";
  time.setAttribute("role", "timer");
  body.append(time, roundDots());

  if (task) {
    const next = task.steps.find((step) => !step.done);
    const line = el("div", "focus-task");
    line.append(el("strong", "", task.title));
    if (next) line.append(el("span", "muted", next.text));
    body.append(line);
  }

  const controls = el("div", "focus-controls");
  const main = timer.running
    ? iconButton("pause", "Pause", "btn primary big", () => {
      pauseTimer();
      refresh();
    })
    : iconButton("play", "Start", "btn primary big", () => {
      askForNotifications();
      resumeTimer();
      refresh();
    });
  controls.append(
    main,
    iconButton("reset", "", "btn round", () => {
      resetTimer();
      refresh();
    }, "Reset"),
    iconButton("skip", "", "btn round", () => {
      const next = nextPhase(timer.phase, timer.round, settings.rounds);
      prepareTimer(phaseMinutes(next.phase, settings, task?.minutes), { ...next, taskId: timer.taskId });
      refresh();
    }, "Skip to the next part"),
  );
  body.append(controls);

  // Lengths and rounds: − and +, even while the timer runs. The part that's on now changes
  // at once (the time already done is kept); the others change for next time.
  const details = el("details", "fold");
  details.open = settingsOpen;
  details.addEventListener("toggle", () => {
    settingsOpen = details.open;
  });
  details.append(
    el("summary", "", "Timer"),
    stepper("Focus", settings.work, { min: 5, max: 90, step: 5, unit: " min" }, (value) => setLength("work", value)),
    stepper("Break", settings.short, { min: 1, max: 30, step: 1, unit: " min" }, (value) => setLength("short", value)),
    stepper("Long break", settings.long, { min: 5, max: 60, step: 5, unit: " min" }, (value) => setLength("long", value)),
    stepper("Rounds", settings.rounds, { min: 1, max: 8, step: 1 }, (value) => {
      settings.rounds = value;
      save();
      if (currentTimer().round > value) currentTimer().round = value;
      document.getElementById("round-dots").replaceWith(roundDots());
    }),
  );
  body.append(details);
}

function setLength(phase, minutes) {
  state.settings.focus[phase] = minutes; // the settings use the same names: work, short, long
  save();
  if (currentTimer()?.phase === phase) changeLength(minutes);
  showTime();
  document.dispatchEvent(new Event("focus-timer-change"));
}

// Round dots: ● done or running, ○ still to come.
function roundDots() {
  const { round } = currentTimer();
  const { rounds } = state.settings.focus;
  const dots = el("p", "round-dots");
  dots.id = "round-dots";
  dots.setAttribute("aria-label", `Round ${round} of ${rounds}`);
  dots.textContent = Array.from({ length: rounds }, (_, i) => (i < round ? "●" : "○")).join(" ");
  return dots;
}

// − value +. Changes take effect right away.
function stepper(label, start, { min, max, step, unit = "" }, onChange) {
  let value = start;
  const row = el("div", "stepper");
  const shown = el("span", "stepper-value", `${value}${unit}`);
  const change = (delta) => {
    const next = Math.min(max, Math.max(min, value + delta));
    if (next === value) return;
    value = next;
    shown.textContent = `${value}${unit}`;
    onChange(value);
  };
  const less = button("−", "btn round small", () => change(-step));
  less.setAttribute("aria-label", `${label}: less`);
  const more = button("+", "btn round small", () => change(step));
  more.setAttribute("aria-label", `${label}: more`);
  row.append(el("span", "stepper-label", label), less, shown, more);
  return row;
}

// ---------- The alert when a part ends: over the whole screen, on any page ----------

function showEndAlert(title, text, nextPhase) {
  closeEndAlert();
  const overlay = el("div", "end-alert");
  overlay.id = "end-alert";
  overlay.setAttribute("role", "alertdialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "end-alert-title");
  const card = el("div", "end-card");
  const heading = el("h2", "", title);
  heading.id = "end-alert-title";
  const actions = el("div", "actions");
  const start = iconButton("play", nextPhase === "work" ? "Start focus" : "Start break", "btn primary big", () => {
    closeEndAlert();
    resumeTimer();
    refresh();
  });
  actions.append(start, button("Later", "btn quiet", () => {
    closeEndAlert();
    refresh();
  }));
  card.append(heading, el("p", "muted", text), actions);
  overlay.append(card);
  document.body.append(overlay);
  start.focus();
  // The tab title says it too, for when another tab is in front.
  pageTitle ??= document.title;
  document.title = `⏰ ${title} · Kindstart`;
}

function closeEndAlert() {
  document.getElementById("end-alert")?.remove();
  if (pageTitle) {
    document.title = pageTitle;
    pageTitle = null;
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeEndAlert();
});
