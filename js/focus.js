// The Focus page: a pomodoro timer. Focus rounds with short breaks, a long break after the
// last round. Started from a task, it shows that task's next step while it runs.

import { state, save } from "./store.js";
import { currentTimer, onTimer, prepareTimer, startTimer, resumeTimer, pauseTimer, resetTimer, timeLeft,
  nextPhase, phaseMinutes, formatRemaining } from "./focus-timer.js";
import { notify } from "./notifications.js";
import { showPage, currentPage } from "./nav.js";
import { el, button, select, fold, pageBody, iconButton } from "./ui.js";

const PHASE_NAMES = { work: "Focus", short: "Break", long: "Long break" };

// Every second: only the time texts change (here and on Today), nothing is redrawn.
onTimer({
  tick: (msLeft) => {
    for (const id of ["focus-time", "focus-pill-time"]) {
      const text = document.getElementById(id);
      if (text) text.textContent = formatRemaining(msLeft);
    }
  },
  end: (ended) => {
    const settings = state.settings.focus;
    const next = nextPhase(ended.phase, ended.round, settings.rounds);
    const task = state.tasks.find((t) => t.id === ended.taskId);
    prepareTimer(phaseMinutes(next.phase, settings, task?.minutes), { ...next, taskId: ended.taskId });
    if (state.settings.focusEnd) {
      notify(ended.phase === "work" ? "Break time" : "Back to focus", ended.phase === "work" ? "Well done. Rest a little." : task?.title ?? "Next round", "focus");
    }
    if (currentPage() === "focus") drawFocus();
    document.dispatchEvent(new Event("focus-timer-change")); // Today redraws its timer line
  },
});

// Called from a task on Today: a focus round for that task.
export function startFocusFor(taskId) {
  const task = state.tasks.find((t) => t.id === taskId);
  startTimer(phaseMinutes("work", state.settings.focus, task?.minutes), { phase: "work", round: 1, taskId });
  showPage("focus");
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
  body.append(time);

  // Round dots: ● done or running, ○ still to come.
  const dots = el("p", "round-dots");
  dots.setAttribute("aria-label", `Round ${timer.round} of ${settings.rounds}`);
  dots.textContent = Array.from({ length: settings.rounds }, (_, i) => (i < timer.round ? "●" : "○")).join(" ");
  body.append(dots);

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
      drawFocus();
    })
    : iconButton("play", "Start", "btn primary big", () => {
      resumeTimer();
      drawFocus();
    });
  controls.append(
    main,
    iconButton("reset", "", "btn round", () => {
      resetTimer();
      drawFocus();
    }, "Reset"),
    iconButton("skip", "", "btn round", () => {
      const next = nextPhase(timer.phase, timer.round, settings.rounds);
      prepareTimer(phaseMinutes(next.phase, settings, task?.minutes), { ...next, taskId: timer.taskId });
      drawFocus();
    }, "Skip to the next part"),
  );
  body.append(controls);

  // The minutes roll out only when asked for.
  const minutes = (key, label, values) =>
    select(label, values.map((m) => [m, `${m} min`]), settings[key], (value) => {
      settings[key] = Number(value);
      save();
      if (!currentTimer()?.running) {
        resetTimer();
        drawFocus();
      }
    }).label;
  const rounds = select("Rounds", [2, 3, 4, 5, 6].map((n) => [n, String(n)]), settings.rounds, (value) => {
    settings.rounds = Number(value);
    save();
    drawFocus();
  }).label;
  const row = el("div", "row");
  row.append(minutes("work", "Focus", [10, 15, 20, 25, 30, 45, 50]), minutes("short", "Break", [3, 5, 10]),
    minutes("long", "Long break", [10, 15, 20, 30]), rounds);
  body.append(fold("Timer", row));
}
