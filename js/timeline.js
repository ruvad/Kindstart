// Today: the top lines (time, bedtime, top goal, next important date, focus timer), moment
// cards, the timeline of tasks, and the wins. A task shows its title and next step; a tap
// rolls out its steps and buttons. The circle on the left marks it done.

import { state, save } from "./store.js";
import { content } from "./content-check.js";
import { toISODate, friendlyDate, isNight, addDays, nextOccurrence, daysBetween, daysWord, pad } from "./dates.js";
import { timelineView, isOverdue, finishTask, reopenTask, postponeTask, toggleStep, addStep, nextStepIndex, lengthLabel } from "./tasks.js";
import { priorityMap, topGoal } from "./goal-list.js";
import { RealizationCard } from "./realization.js";
import { openTaskForm } from "./task-form.js";
import { currentTimer, timeLeft, formatRemaining, resetTimer } from "./focus-timer.js";
import { startFocusFor } from "./focus.js";
import { sleepStatus } from "./sleep.js";
import { showPage, currentPage } from "./nav.js";
import { el, button, icon, iconButton } from "./ui.js";

// Things that last while the page is open, but aren't saved:
let flash = null; // { taskId, card }: the card under a task just marked done or moved
let missed = null; // { taskId, card }: the once-a-day card under the first missed task
let nightCard; // undefined = not chosen yet; null = nothing fitting
let showAll = false; // "+N" opened
let welcomeHidden = false; // the welcome card's "Later" was pressed
let openTaskId = null; // the task whose steps and buttons are rolled out
let winsOpen = false;

// Called by nav.js whenever Today is shown.
export function showTimeline() {
  flash = null;
  renderTimeline();
}

document.addEventListener("focus-timer-change", () => renderTop());

export function renderTimeline() {
  const today = toISODate();
  renderTop();
  renderMoments();

  // A task just marked done stays visible (crossed out) with its card until the next action.
  const tasks = state.tasks.map((task) =>
    task.id === flash?.taskId && task.done ? { ...task, done: false, justDone: true } : task,
  );
  const priorities = priorityMap(state.goals);
  const view = timelineView(tasks, today, 4, priorities);
  let shown = view.shown;
  let hidden = view.hidden;
  if (showAll) {
    shown = [...shown, ...hidden];
    hidden = [];
  }
  // A task moved by Later can land in the hidden part; pull it up so its card is seen.
  const flashed = hidden.find((task) => task.id === flash?.taskId);
  if (flashed) {
    shown = [...shown, flashed];
    hidden = hidden.filter((task) => task !== flashed);
  }

  const list = el("ol", "timeline");
  if (shown.length === 0) list.append(el("li", "muted", "Nothing planned."));
  for (const task of shown) list.append(taskItem(task, today, priorities));

  let toggle = "";
  if (hidden.length > 0) toggle = `+${hidden.length}`;
  else if (showAll && view.hidden.length > 0) toggle = "Less";
  if (toggle) {
    const more = el("li", "more");
    const moreButton = button(toggle, "", () => {
      showAll = !showAll;
      renderTimeline();
    });
    if (hidden.length > 0) moreButton.setAttribute("aria-label", `Show ${hidden.length} more`);
    more.append(moreButton);
    list.append(more);
  }

  document.getElementById("timeline-body").replaceChildren(list, winsLine(today));
}

// ---------- The lines at the top ----------

export function renderTop(now = new Date()) {
  const top = document.getElementById("today-top");
  if (!top) return;
  const lines = [];

  const clock = el("p", "clock");
  clock.append(el("span", "clock-time", `${pad(now.getHours())}:${pad(now.getMinutes())}`));
  const sleep = sleepStatus(state.sleep, now);
  if (sleep) clock.append(topLink("sleep", "sleep", sleep.text));
  lines.push(clock);

  const goal = topGoal(state.goals);
  if (goal) lines.push(topLink("goals", "goals", goal.text));

  const soon = nextImportantDate(toISODate(now));
  if (soon) lines.push(topLink("calendar", "star", `${soon.title} · ${daysWord(soon.days)}`));

  const timer = currentTimer();
  if (timer) {
    const pill = topLink("focus", timer.running ? "focus" : "pause", "");
    const time = el("span", "", formatRemaining(timeLeft()));
    time.id = "focus-pill-time";
    pill.querySelector("span:last-child").replaceWith(time);
    pill.classList.add("pill");
    lines.push(pill);
  }
  top.replaceChildren(...lines);
}

function topLink(page, iconName, text) {
  const link = button("", "top-link");
  link.dataset.go = page; // nav.js handles every [data-go] button
  link.append(icon(iconName), el("span", "", text));
  return link;
}

// The nearest important date within a week, or null.
function nextImportantDate(today) {
  let best = null;
  for (const entry of state.dates) {
    const day = nextOccurrence(entry.date, entry.yearly, today);
    if (!day) continue;
    const days = daysBetween(today, day);
    if (days <= 7 && (best === null || days < best.days)) best = { title: entry.title, days };
  }
  return best;
}

// ---------- Moments: welcome, night ----------

function renderMoments() {
  const slot = document.getElementById("moment-slot");
  slot.replaceChildren();
  if (!state.profile?.date && !welcomeHidden) slot.append(welcomeCard()); // first visit
  if (isNight()) {
    if (nightCard === undefined) nightCard = RealizationCard.forMoment("night", ["sleep"]);
    nightCard?.placeIn(slot);
  }
}

function welcomeCard() {
  const card = el("div", "card welcome");
  card.append(
    el("h2", "", "Kindstart"),
    el("p", "slogan", "Success is a direction, not a destination."),
    el("p", "muted", "Understand yourself. Set your goals."),
  );
  const start = button("Start", "btn primary");
  start.dataset.go = "test";
  const later = button("Later", "btn quiet", () => {
    welcomeHidden = true;
    renderTimeline();
  });
  const actions = el("div", "actions");
  actions.append(start, later);
  card.append(actions);
  return card;
}

// ---------- One task ----------

function taskItem(task, today, priorities) {
  const item = el("li", "task");
  const overdue = isOverdue(task, today);
  if (overdue) item.classList.add("overdue");
  if (task.justDone) item.classList.add("done");
  if (priorities[task.goalId] === 1) item.classList.add("top-goal");
  const open = openTaskId === task.id && !task.justDone;
  const next = task.steps[nextStepIndex(task)];

  const row = el("div", "task-row");
  // The circle marks a task done; tapped again right after, it brings the task back.
  const tick = button("", "tick", () => (task.justDone ? undoDone(task.id) : markDone(task.id)));
  tick.setAttribute("aria-label", task.justDone ? `Not done: ${task.title}` : `Done: ${task.title}`);
  if (task.justDone) {
    tick.append(icon("check"));
  } else if (task.steps.length > 0 && !next) {
    tick.classList.add("ready"); // every step ticked
  }

  const toggle = button("", "task-open", () => {
    openTaskId = open ? null : task.id;
    renderTimeline();
  });
  toggle.setAttribute("aria-expanded", String(open));
  toggle.append(el("span", "task-title", task.title));
  if (next && !task.justDone && !open) toggle.append(el("span", "task-next", next.text));

  row.append(tick, toggle);
  const when = whenLabel(task, today, overdue);
  if (task.justDone) row.append(undoButton(task)); // a mis-tap is fixed right here
  else if (when) row.append(el("span", "task-when", when));
  item.append(row);
  if (open) item.append(taskMore(task));

  if (flash?.taskId === task.id) flash.card?.placeIn(item);
  else if (overdue) missedCardFor(task, today)?.placeIn(item);
  return item;
}

// Rolled out: steps, Focus, Later, + Step.
function taskMore(task) {
  const box = el("div", "task-more");
  if (task.steps.length > 0) box.append(stepList(task));
  const actions = el("div", "actions");
  const addStepButton = button("+ Step", "btn small quiet", () => showStepInput(task.id, actions, addStepButton));
  actions.append(
    iconButton("play", "Focus", "btn small primary", () => startFocusFor(task.id)),
    button("Later", "btn small quiet", () => moveLater(task.id)),
    addStepButton,
  );
  const goal = state.goals.find((g) => g.id === task.goalId);
  const facts = [task.minutes ? lengthLabel(task.minutes) : "", goal ? goal.text : ""].filter(Boolean).join(" · ");
  if (facts) actions.append(el("span", "muted small", facts));
  box.append(actions);
  return box;
}

// The task's steps as tick boxes. The first unticked one is the "next" step.
function stepList(task) {
  const list = el("ul", "steps");
  const next = nextStepIndex(task);
  task.steps.forEach((step, index) => {
    const item = el("li", step.done ? "step done" : index === next ? "step next" : "step");
    const label = el("label");
    const box = el("input");
    box.type = "checkbox";
    box.checked = step.done;
    box.addEventListener("change", () => tickStep(task.id, index));
    label.append(box, el("span", "", step.text));
    item.append(label);
    list.append(item);
  });
  return list;
}

// "+ Step" turns into a small field with Add; Enter works too.
function showStepInput(id, actions, addStepButton) {
  const form = el("form", "step-add");
  const input = el("input");
  input.type = "text";
  input.placeholder = "Step";
  input.setAttribute("aria-label", "New step");
  const add = el("button", "btn small", "Add");
  add.type = "submit";
  form.append(input, add);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input.value.trim()) {
      input.focus();
      return;
    }
    state.tasks = state.tasks.map((task) => (task.id === id ? addStep(task, input.value) : task));
    save();
    renderTimeline();
  });
  addStepButton.remove();
  actions.after(form);
  input.focus();
}

function tickStep(id, index) {
  state.tasks = state.tasks.map((task) => (task.id === id ? toggleStep(task, index) : task));
  save();
  renderTimeline();
}

// Today: just the time (or nothing). Other days: "tomorrow", "Fri", "Nov 20"; missed: "missed".
function whenLabel(task, today, overdue) {
  if (overdue) return "missed";
  if (task.date === today) return task.time;
  if (task.date === "") return "";
  const day = friendlyDate(task.date, today);
  return task.time ? `${day} ${task.time}` : day;
}

// ---------- Wins: what's been done (self-esteem needs evidence) ----------

function winsLine(today) {
  const weekStart = addDays(today, -6);
  const week = state.tasks.filter((task) => task.done && task.doneDate >= weekStart);
  if (week.length === 0) return "";
  const todayCount = week.filter((task) => task.doneDate === today).length;
  const box = el("div", "wins");
  const toggle = iconButton("check", `${todayCount} today · ${week.length} this week`, "wins-toggle", () => {
    winsOpen = !winsOpen;
    renderTimeline();
  });
  toggle.setAttribute("aria-expanded", String(winsOpen));
  box.append(toggle);
  if (winsOpen) {
    const list = el("ul", "list-plain wins-list");
    for (const task of [...week].sort((a, b) => b.doneDate.localeCompare(a.doneDate))) {
      const item = el("li", "with-undo");
      item.append(el("span", "", `${task.title} · ${friendlyDate(task.doneDate, today)}`), undoButton(task));
      list.append(item);
    }
    box.append(list);
  }
  return box;
}

// "Undo": brings a done task back onto the timeline. Also used in the calendar.
export function undoButton(task, after = () => {}) {
  const undo = button("Undo", "undo", () => {
    undoDone(task.id);
    after();
  });
  undo.setAttribute("aria-label", `Not done: ${task.title}`);
  return undo;
}

export function undoDone(id) {
  state.tasks = state.tasks.map((task) => (task.id === id ? reopenTask(task) : task));
  save();
  if (flash?.taskId === id) flash = null; // the "done" card goes too
  renderTimeline();
}

// ---------- Cards for missed / done / later ----------

// The first missed task gets one card a day; the same card stays while the page is open.
function missedCardFor(task, today) {
  if (missed) return missed.taskId === task.id ? missed.card : null;
  if (state.shownOn.missed === today) return null;
  const card = RealizationCard.forMoment("missed", problemsFor(task));
  state.shownOn.missed = today;
  save();
  missed = { taskId: task.id, card };
  return card;
}

// Problems linked to a task: from its question answers, plus the person's top problems.
function problemsFor(task) {
  const fromAnswers = content.taskQuestions.flatMap((question) => {
    const answer = question.answers.find((a) => a.id === task.answers[question.id]);
    return answer ? answer.problems : [];
  });
  return [...new Set([...fromAnswers, ...(state.profile?.topProblems ?? [])])];
}

function markDone(id) {
  if (currentTimer()?.taskId === id) resetTimer();
  const today = toISODate();
  state.tasks = state.tasks.map((task) => (task.id === id ? finishTask(task, today) : task));
  save();
  const task = state.tasks.find((t) => t.id === id);
  flash = { taskId: id, card: RealizationCard.forMoment("finished", problemsFor(task)) };
  openTaskId = null;
  renderTimeline();
}

function moveLater(id) {
  if (currentTimer()?.taskId === id) resetTimer();
  const today = toISODate();
  state.tasks = state.tasks.map((task) => (task.id === id ? postponeTask(task, today) : task));
  save();
  const task = state.tasks.find((t) => t.id === id);
  flash = { taskId: id, card: RealizationCard.forMoment("postponed", problemsFor(task)) };
  openTaskId = null;
  renderTimeline();
}

// ---------- Adding ----------

// Opens the add-task form at the top of Today. prefill: { title, date } (Notes, Calendar).
export function openAddTask(prefill = {}) {
  if (currentPage() !== "today") showPage("today");
  const area = document.getElementById("task-area");
  openTaskForm(area, () => {
    area.replaceChildren();
    flash = null;
    renderTimeline();
  }, prefill);
  area.scrollIntoView({ block: "nearest" });
}
