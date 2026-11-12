// Task logic as pure functions: data in, data out, no screen and no storage.
// That's what lets tests.html check them.

import { addDays } from "./dates.js";

export function makeTask(fields, today, id) {
  return {
    id,
    title: fields.title.trim(),
    date: fields.date || "", // "" means anytime
    time: fields.time || "", // "14:00" or ""
    minutes: fields.minutes ? Number(fields.minutes) : null,
    steps: makeSteps(fields.steps ?? [fields.firstStep]), // [{ text, done }]; the first one is required in the form
    goalId: fields.goalId || "", // the goal this task is for ("" = none)
    answers: fields.answers || {}, // questionId -> answerId, from the questions before the task
    done: false,
    doneDate: "",
    postponed: 0,
    created: today,
  };
}

// A list of texts -> step objects. Empty texts are dropped.
function makeSteps(texts) {
  return (texts || [])
    .map((text) => (text || "").trim())
    .filter((text) => text !== "")
    .map((text) => ({ text, done: false }));
}

// Tasks saved before steps existed have one "firstStep" text instead of a list.
// store.js runs every saved task through this when the app opens.
export function upgradeTask(task) {
  if (Array.isArray(task.steps)) return task;
  const { firstStep, ...rest } = task; // everything except firstStep
  return { ...rest, steps: makeSteps([firstStep]) };
}

// Ticks a step, or unticks it if it was ticked.
export function toggleStep(task, index) {
  return { ...task, steps: task.steps.map((step, i) => (i === index ? { ...step, done: !step.done } : step)) };
}

export function addStep(task, text) {
  const extra = makeSteps([text]);
  return extra.length > 0 ? { ...task, steps: [...task.steps, ...extra] } : task;
}

// Position of the first step not ticked yet; -1 when there is none.
export function nextStepIndex(task) {
  return task.steps.findIndex((step) => !step.done);
}

// "YYYY-MM-DD" text sorts in date order, so < and > work on it directly.
export function isOverdue(task, today) {
  return !task.done && task.date !== "" && task.date < today;
}

// Order on the timeline: missed, today, anytime, later days.
function group(task, today) {
  if (task.date === "") return 2;
  if (task.date < today) return 0;
  if (task.date === today) return 1;
  return 3;
}

// priorities: goal id -> 1 (high), 2, 3 (from goal-list.js). Tasks without a goal count as 4.
export function orderTasks(tasks, today, priorities = {}) {
  const rank = (task) => priorities[task.goalId] ?? 4;
  return tasks
    .filter((task) => !task.done)
    .sort(
      (a, b) =>
        group(a, today) - group(b, today) ||
        a.date.localeCompare(b.date) ||
        (a.time || "99:99").localeCompare(b.time || "99:99") || // tasks with a time come first
        rank(a) - rank(b), // then tasks for the most important goals
    );
}

// What the main screen shows: the first few open tasks, the rest hidden behind "+N".
export function timelineView(tasks, today, limit = 4, priorities = {}) {
  const open = orderTasks(tasks, today, priorities);
  return {
    shown: open.slice(0, limit),
    hidden: open.slice(limit),
    doneToday: tasks.filter((task) => task.done && task.doneDate === today).length,
  };
}

export function finishTask(task, today) {
  return { ...task, done: true, doneDate: today };
}

// Brings a done task back: a mis-tap, or it wasn't really finished. Its steps stay as they were.
export function reopenTask(task) {
  return { ...task, done: false, doneDate: "" };
}

// Later = tomorrow.
export function postponeTask(task, today) {
  return { ...task, date: addDays(today, 1), postponed: task.postponed + 1 };
}

export function lengthLabel(minutes) {
  if (!minutes) return "";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
