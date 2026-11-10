// The focus timer (pomodoro): a focus round, a short break, again; after the last round
// a long break. This file only keeps time; focus.js draws it. Nothing here is saved.

let timer = null; // { phase: "work" | "short" | "long", round, taskId, left (ms), endsAt, running }
let interval = null;
let listeners = {};

// focus.js says what happens every second and when a round ends.
export function onTimer({ tick, end }) {
  listeners = { tick, end };
}

export function currentTimer() {
  return timer;
}

// After a phase: focus -> short break, or the long break after the last round; a break -> focus.
export function nextPhase(phase, round, rounds) {
  if (phase === "work") return round >= rounds ? { phase: "long", round } : { phase: "short", round };
  return { phase: "work", round: phase === "long" ? 1 : round + 1 };
}

// Minutes for a phase. A focus round for a short task lasts as long as the task.
export function phaseMinutes(phase, settings, taskMinutes = null) {
  if (phase === "short") return settings.short;
  if (phase === "long") return settings.long;
  return taskMinutes && taskMinutes < settings.work ? taskMinutes : settings.work;
}

// Sets a phase up without starting it.
export function prepareTimer(minutes, meta) {
  stopTicking();
  timer = { ...meta, left: minutes * 60_000, endsAt: null, running: false };
}

export function startTimer(minutes, meta) {
  prepareTimer(minutes, meta);
  resumeTimer();
}

// The time is counted from the end moment, not by adding up ticks: browsers slow timers
// down in background tabs, and this way the time left is still right when you come back.
export function resumeTimer() {
  if (!timer || timer.running) return;
  timer.endsAt = Date.now() + timer.left;
  timer.running = true;
  interval = setInterval(() => {
    const left = timer.endsAt - Date.now();
    if (left > 0) {
      listeners.tick?.(left);
      return;
    }
    stopTicking();
    const ended = { ...timer };
    timer = { ...timer, left: 0, running: false };
    listeners.end?.(ended);
  }, 1000);
}

export function pauseTimer() {
  if (!timer?.running) return;
  timer.left = timer.endsAt - Date.now();
  timer.running = false;
  stopTicking();
}

export function resetTimer() {
  stopTicking();
  timer = null;
}

export function timeLeft() {
  if (!timer) return 0;
  return timer.running ? Math.max(0, timer.endsAt - Date.now()) : timer.left;
}

function stopTicking() {
  clearInterval(interval);
  interval = null;
}

// Milliseconds -> "9:05". Rounds up, so the last second shows 0:01, not 0:00.
export function formatRemaining(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
