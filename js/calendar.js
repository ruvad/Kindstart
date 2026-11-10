// The Calendar page: a month with dots for tasks and stars for important dates.
// A tap on a day shows that day; "+ Date" adds an important date with its own reminder.

import { state, save, newId } from "./store.js";
import { toISODate, fromISODate, monthGrid, occursOn, friendlyDate, FULL_MONTHS, DAY_NAMES } from "./dates.js";
import { DAYS_BEFORE } from "./notifications.js";
import { openAddTask } from "./timeline.js";
import { el, button, choices, select, pageBody, iconButton, icon } from "./ui.js";

let shown = null; // { year, month } on screen
let selected = null; // "YYYY-MM-DD"
let addingDate = false;
let openDateId = null; // the date whose options are rolled out

export function drawCalendar() {
  const body = pageBody("calendar");
  const today = toISODate();
  if (!shown) {
    const now = new Date();
    shown = { year: now.getFullYear(), month: now.getMonth() };
  }
  selected ??= today;

  // ‹ November 2026 ›
  const head = el("div", "cal-head");
  const move = (step) => () => {
    const date = new Date(shown.year, shown.month + step, 1);
    shown = { year: date.getFullYear(), month: date.getMonth() };
    drawCalendar();
  };
  head.append(
    iconButton("back", "", "icon-btn", move(-1), "Previous month"),
    el("h2", "", `${FULL_MONTHS[shown.month]} ${shown.year}`),
    iconButton("next", "", "icon-btn", move(1), "Next month"),
  );
  body.append(head);

  const grid = el("div", "cal-grid");
  for (const letter of ["M", "T", "W", "T", "F", "S", "S"]) grid.append(el("span", "cal-weekday", letter));
  for (const week of monthGrid(shown.year, shown.month)) {
    for (const day of week) {
      if (!day) {
        grid.append(el("span"));
        continue;
      }
      const tasks = state.tasks.filter((task) => task.date === day && !task.done).length;
      const dates = state.dates.filter((entry) => occursOn(entry.date, entry.yearly, day)).length;
      const cell = button("", "cal-day", () => {
        selected = day;
        addingDate = false;
        drawCalendar();
      });
      if (day === today) cell.classList.add("is-today");
      if (day === selected) cell.setAttribute("aria-pressed", "true");
      cell.append(el("span", "", String(Number(day.slice(8)))));
      const marks = el("span", "cal-marks");
      if (tasks > 0) marks.append(el("span", "dot"));
      if (dates > 0) marks.append(icon("star"));
      cell.append(marks);
      cell.setAttribute("aria-label", `${day}${tasks ? `, ${tasks} task${tasks > 1 ? "s" : ""}` : ""}${dates ? `, ${dates} date${dates > 1 ? "s" : ""}` : ""}`);
      grid.append(cell);
    }
  }
  body.append(grid, dayPanel(selected, today));
}

function dayPanel(day, today) {
  const panel = el("section", "day-panel");
  const date = fromISODate(day);
  const when = friendlyDate(day, today);
  panel.append(el("h3", "", `${DAY_NAMES[date.getDay()]} ${date.getDate()} · ${when}`));

  const list = el("ul", "list-plain day-list");
  for (const entry of state.dates.filter((d) => occursOn(d.date, d.yearly, day))) list.append(dateItem(entry));
  for (const task of state.tasks.filter((t) => t.date === day)) {
    list.append(el("li", task.done ? "done" : "", task.time ? `${task.time} ${task.title}` : task.title));
  }
  if (list.children.length > 0) panel.append(list);

  if (addingDate) {
    panel.append(dateForm(day));
  } else {
    const actions = el("div", "actions");
    actions.append(
      iconButton("plus", "Task", "btn small", () => openAddTask({ date: day })),
      iconButton("star", "Date", "btn small", () => {
        addingDate = true;
        drawCalendar();
      }),
    );
    panel.append(actions);
  }
  return panel;
}

function dateItem(entry) {
  const item = el("li", "date-item");
  const open = openDateId === entry.id;
  const row = button("", "date-row", () => {
    openDateId = open ? null : entry.id;
    drawCalendar();
  });
  row.setAttribute("aria-expanded", String(open));
  row.append(icon("star"), el("span", "", entry.title));
  if (entry.yearly) row.append(el("span", "muted small", "every year"));
  item.append(row);
  if (open) {
    const options = el("div", "actions");
    options.append(
      select("Remind", DAYS_BEFORE, entry.remindDays, (value) => {
        entry.remindDays = Number(value);
        save();
      }).label,
      button("Delete", "btn small quiet", () => {
        state.dates = state.dates.filter((d) => d.id !== entry.id);
        openDateId = null;
        save();
        drawCalendar();
      }),
    );
    item.append(options);
  }
  return item;
}

function dateForm(day) {
  const form = el("form", "card");
  const title = el("input");
  title.type = "text";
  title.placeholder = "What's the date?";
  title.setAttribute("aria-label", "Important date");
  let yearly = false;
  let remindDays = 1;
  const actions = el("div", "actions");
  const add = el("button", "btn primary", "Add");
  add.type = "submit";
  actions.append(add, button("Cancel", "btn quiet", () => {
    addingDate = false;
    drawCalendar();
  }));
  form.append(
    title,
    choices([[false, "Once"], [true, "Every year"]], yearly, (value) => {
      yearly = value;
    }),
    select("Remind", DAYS_BEFORE, remindDays, (value) => {
      remindDays = Number(value);
    }).label,
    actions,
  );
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!title.value.trim()) {
      title.focus();
      return;
    }
    state.dates.push({ id: newId("d"), title: title.value.trim(), date: day, yearly, remindDays });
    save();
    addingDate = false;
    drawCalendar();
  });
  queueMicrotask(() => title.focus());
  return form;
}
