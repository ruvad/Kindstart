// Notifications: tasks with a time, important dates, bedtime and the focus timer.
// Each kind can be set in Me → Notifications.
// They work while the app is open, also in a background tab. With the app closed nothing
// can remind you yet: that needs a push server.
// Without permission for system notifications, the reminder still appears inside the app.

import { state, save } from "./store.js";
import { toISODate, toMinutes, lastTimeOf, shiftTime, nextOccurrence, daysBetween, daysWord, joinTime } from "./dates.js";
import { lengthLabel } from "./tasks.js";
import { el, button, choices, select, timePicker, fold } from "./ui.js";

const CHECK_EVERY_MS = 20_000; // browsers slow this to about once a minute in background tabs

// ---------- What is due (pure functions, checked in tests.html) ----------
// Each returns a list of { key, value, title, body }: state.reminded[key] = value marks it done.

// Tasks: from `minutesBefore` before their time until an hour after it, once per date and
// time, so a task moved to another time is reminded again. minutesBefore -1 = never.
export function dueTaskReminders(tasks, now, minutesBefore, reminded) {
  if (minutesBefore < 0) return [];
  const today = toISODate(now);
  const current = now.getHours() * 60 + now.getMinutes();
  return tasks
    .filter((task) => !task.done && task.date === today && task.time && reminded[task.id] !== reminderKey(task))
    .filter((task) => current >= toMinutes(task.time) - minutesBefore && current <= toMinutes(task.time) + 60)
    .map((task) => ({ key: task.id, value: reminderKey(task), title: task.title, body: reminderText(task) }));
}

export function reminderKey(task) {
  return `${task.date} ${task.time}`;
}

// The line under the task's title: "At 14:00 · next step: open Gmail"
export function reminderText(task) {
  const next = task.steps.find((step) => !step.done);
  return next ? `At ${task.time} · next step: ${next.text}` : `At ${task.time}`;
}

// Important dates: from `remindDays` days before until the day itself, after the time of
// day the person chose, once per occurrence (a yearly date comes back next year).
export function dueDateReminders(dates, now, atTime, reminded) {
  const today = toISODate(now);
  if (now.getHours() * 60 + now.getMinutes() < toMinutes(atTime)) return [];
  const due = [];
  for (const entry of dates) {
    if (entry.remindDays < 0) continue;
    const day = nextOccurrence(entry.date, entry.yearly, today);
    if (!day) continue;
    const days = daysBetween(today, day);
    const key = `date:${entry.id}`;
    if (days <= entry.remindDays && reminded[key] !== day) {
      due.push({ key, value: day, title: entry.title, body: daysWord(days) });
    }
  }
  return due;
}

// Bedtime: windDown minutes before ("Wind down"), and at bedtime ("Time to sleep"), each up
// to half an hour late, once a day. windDown 0 = only at bedtime, -1 = none.
export function dueSleepReminders(sleep, now, windDown, reminded) {
  if (!sleep.on || windDown < 0) return [];
  const due = [];
  const check = (key, time, title, body) => {
    const last = lastTimeOf(time, now);
    if (last.minutes < 30 && reminded[key] !== last.date) due.push({ key, value: last.date, title, body });
  };
  if (windDown > 0) check("sleep:wind-down", shiftTime(sleep.bed, -windDown), "Wind down", `Bed in ${lengthLabel(windDown)}`);
  check("sleep:bed", sleep.bed, "Time to sleep", "Tomorrow is saved here.");
  return due;
}

export function checkReminders(now = new Date()) {
  if (!state.settings.reminders) return;
  const { remindBefore, dateTime, windDown } = state.settings;
  const due = [
    ...dueTaskReminders(state.tasks, now, remindBefore, state.reminded),
    ...dueDateReminders(state.dates, now, dateTime, state.reminded),
    ...dueSleepReminders(state.sleep, now, windDown, state.reminded),
  ];
  for (const item of due) {
    notify(item.title, item.body, item.key);
    state.reminded[item.key] = item.value;
  }
  if (due.length > 0) save();
}

export function startReminders() {
  // A service worker is needed for notifications on Android; it only works on https or localhost.
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
  checkReminders();
  setInterval(checkReminders, CHECK_EVERY_MS);
  document.addEventListener("visibilitychange", () => checkReminders()); // coming back to the tab
}

// ---------- Showing one ----------

// Shows the reminder inside the app, and as a system notification when allowed.
// banner: false = no banner in the app (the focus timer has its own full-screen alert).
// sticky: true = the system notification stays until it's closed, and phones vibrate.
export async function notify(title, body, tag, { banner = true, sticky = false } = {}) {
  if (banner) showBanner(title, body);
  if (permission() !== "granted") return "banner";
  const options = sticky ? { body, tag, requireInteraction: true, renotify: true, vibrate: [200, 100, 200] } : { body, tag };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration) await registration.showNotification(title, options);
    else new Notification(title, options);
    return "system";
  } catch {
    return "banner"; // e.g. a browser that refuses notifications from a page
  }
}

// "granted", "denied", "default" (not asked yet) or "unsupported".
export function permission() {
  return "Notification" in window ? Notification.permission : "unsupported";
}

// Must be called from a click: browsers only ask for permission after a person's action.
export async function askPermission() {
  if (permission() !== "default") return permission();
  try {
    return await Notification.requestPermission();
  } catch {
    return permission();
  }
}

// The banner at the top of the screen. It stays until it's closed, so it can't be missed.
function showBanner(title, body) {
  const box = el("div", "toast");
  const text = el("div", "toast-text");
  text.append(el("strong", "", title), el("span", "", body));
  const close = button("×", "icon-btn", () => box.remove());
  close.setAttribute("aria-label", "Close reminder");
  box.append(text, close);
  document.getElementById("toasts").append(box);
}

// ---------- Settings (Me → Notifications) ----------

const PERMISSION_TEXT = {
  granted: "",
  denied: "Blocked in this browser: reminders show inside the app only. To allow them, click the icon left of the address.",
  default: "",
  unsupported: "This browser can't show notifications, so they show inside the app only. On an iPhone, add the app to the Home Screen first.",
};

const BEFORE = [[-1, "Off"], [0, "At the time"], [5, "5 min before"], [10, "10 min before"], [15, "15 min before"], [30, "30 min before"], [60, "1 h before"]];
const DAYS_BEFORE = [[-1, "Off"], [0, "On the day"], [1, "1 day before"], [3, "3 days before"], [7, "1 week before"]];
const WIND_DOWN = [[-1, "Off"], [0, "At bedtime"], [15, "15 min before + bedtime"], [30, "30 min before + bedtime"], [60, "1 h before + bedtime"]];
export { DAYS_BEFORE };

export function notificationSettings() {
  const box = el("div");
  const status = el("p", "muted small");
  const details = el("div");
  const show = () => {
    status.textContent = state.settings.reminders ? PERMISSION_TEXT[permission()] : "";
    details.hidden = !state.settings.reminders;
  };

  box.append(choices([[true, "On"], [false, "Off"]], state.settings.reminders, async (value) => {
    if (value) await askPermission(); // the browser asks the person once
    state.settings.reminders = value;
    save();
    show();
    if (value) checkReminders();
  }), status, details);

  const setNumber = (key) => (value) => {
    state.settings[key] = Number(value);
    save();
  };
  const dateTime = timePicker("Dates: at", state.settings.dateTime);
  const saveDateTime = () => {
    const value = joinTime(dateTime.hour.value, dateTime.minute.value);
    if (value) {
      state.settings.dateTime = value;
      save();
    }
  };
  dateTime.hour.addEventListener("change", saveDateTime);
  dateTime.minute.addEventListener("change", saveDateTime);

  const focusEnd = el("div", "setting");
  focusEnd.append(el("span", "", "Focus timer"), choices([[true, "On"], [false, "Off"]], state.settings.focusEnd, (value) => {
    state.settings.focusEnd = value;
    save();
  }));

  details.append(
    select("Tasks", BEFORE, state.settings.remindBefore, setNumber("remindBefore")).label,
    dateTime.label,
    select("Sleep", WIND_DOWN, state.settings.windDown, setNumber("windDown")).label,
    focusEnd,
    button("Test", "btn small", () => notify("Test", "This is how a reminder looks.", "test")),
    fold("When do they come?", el("p", "muted small", "While Kindstart is open, also in a background tab. Each important date has its own setting in the calendar.")),
  );
  show();
  return box;
}
