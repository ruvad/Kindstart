// Everything the app remembers about the person, saved in this browser (localStorage).
// This is the only file that touches storage. account.js uses the functions at the bottom
// to copy the same data to and from the person's account.

import { upgradeTask } from "./tasks.js";

const KEY = "kindstart:v1";
const SESSION_KEY = "kindstart:session"; // the signed-in account (account.js)
const UNSAVED_KEY = "kindstart:unsaved"; // "1" while changes haven't reached the account yet

// The app used to be called ADHD-Helper. Data saved under the old names moves over once.
function moveOldKeys() {
  try {
    for (const [oldKey, newKey] of [["adhd-helper:v1", KEY], ["adhd-helper:session", SESSION_KEY], ["adhd-helper:unsaved", UNSAVED_KEY]]) {
      const old = localStorage.getItem(oldKey);
      if (old !== null && localStorage.getItem(newKey) === null) localStorage.setItem(newKey, old);
      localStorage.removeItem(oldKey);
    }
  } catch {
    // storage blocked: nothing to move
  }
}

function emptyState() {
  return {
    profile: null, // { name, answers: { questionId: 0-4 }, topProblems: [...], date }
    goals: [], // { id, text, priority: 1 (high) | 2 (medium) | 3 (low) }
    tasks: [], // made by makeTask() in tasks.js
    dates: [], // important dates: { id, title, date: "YYYY-MM-DD", yearly, remindDays: -1 (none) | 0 | 1 | 3 | 7 }
    notes: [], // { id, text, date }
    saved: [], // ids of realizations the person saved
    seen: {}, // realization id -> how many times it has been shown
    shownOn: {}, // moment -> last day a once-a-day card was shown, e.g. { missed: "2026-11-04" }
    sleep: { on: false, bed: "23:00", wake: "07:00" }, // on = the person has set a schedule
    settings: {
      reminders: false, // notifications on or off
      remindBefore: 10, // tasks with a time: minutes before (-1 = no reminder)
      dateTime: "09:00", // important dates: the time of day their reminder comes
      windDown: 30, // sleep: minutes before bedtime, plus one at bedtime (0 = only at bedtime, -1 = none)
      focusEnd: true, // focus timer: a reminder when a round ends
      warmEvening: true, // darker, warmer colours from an hour before bedtime until wake-up
      focus: { work: 25, short: 5, long: 15, rounds: 4 }, // the focus timer, in minutes
    },
    reminded: {}, // what was last reminded, e.g. task id -> "date time", so nothing comes twice
  };
}

// Saved data (from this browser or from the account) -> a complete state object.
// Exported for tests.html.
export function fromSaved(saved) {
  const base = emptyState();
  const loaded = withOldGoal({ ...base, ...saved });
  // Settings saved by an older version miss the newer fields: fill them in.
  loaded.settings = { ...base.settings, ...saved?.settings, focus: { ...base.settings.focus, ...saved?.settings?.focus } };
  loaded.sleep = { ...base.sleep, ...saved?.sleep };
  loaded.tasks = loaded.tasks.map(upgradeTask); // older tasks get the newer fields
  return loaded;
}

// Before goals had priorities, the profile held one goal. It becomes a high-priority goal
// (unless a goal with that text already exists). The id comes from the text, so the same
// old goal on two devices becomes the same goal. account.js uses this on both sides
// before joining a device's data with the account's.
export function withOldGoal(data) {
  if (!data?.profile || data.profile.goal === undefined) return data;
  const { goal, ...profile } = data.profile;
  const goals = [...(data.goals ?? [])];
  if (goal && !goals.some((g) => g.text === goal)) {
    goals.unshift({ id: `g-old-${goal.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`, text: goal, priority: 1 });
  }
  return { ...data, profile, goals };
}

// The one state object. Other files change it directly, then call save().
export const state = load();

function load() {
  moveOldKeys();
  try {
    return fromSaved(JSON.parse(localStorage.getItem(KEY)));
  } catch {
    return emptyState(); // storage blocked or data unreadable: start fresh
  }
}

let afterSave = null; // set by account.js: sends the change to the account too

export function save() {
  let saved = true;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    saved = false; // e.g. storage full or blocked in a private window
  }
  afterSave?.();
  return saved;
}

export function onSave(callback) {
  afterSave = callback;
}

export function deleteEverything() {
  try {
    localStorage.removeItem(KEY);
    localStorage.removeItem(UNSAVED_KEY);
  } catch {
    // nothing saved to remove
  }
  Object.assign(state, emptyState());
}

// A unique id such as "t-lq2k8x3f9a1c": the time in base 36 plus 4 random characters.
export function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

// ---------- For account.js ----------

// A plain copy of the state, to send to the account.
export function exportState() {
  return JSON.parse(JSON.stringify(state));
}

// Replaces everything with data from the account, and keeps it in this browser too.
export function replaceState(data) {
  Object.assign(state, fromSaved(data));
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // the account still has it
  }
}

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function writeSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // without storage, the person signs in again next time
  }
}

export function hasUnsaved() {
  try {
    return localStorage.getItem(UNSAVED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setUnsaved(unsaved) {
  try {
    if (unsaved) localStorage.setItem(UNSAVED_KEY, "1");
    else localStorage.removeItem(UNSAVED_KEY);
  } catch {
    // nothing to do
  }
}
