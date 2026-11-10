// The Goals page: the person's goals with a priority they choose (High / Medium / Low).
// The app sorts them, shows the top one on Today, and puts tasks for important goals first.
// A tap on a goal rolls out its options; nothing else is shown until asked for.

import { state, save, newId } from "./store.js";
import { PRIORITIES, sortGoals, priorityLabel } from "./goal-list.js";
import { RealizationCard } from "./realization.js";
import { el, button, choices, pageBody, iconButton } from "./ui.js";

let openId = null; // the goal whose options are rolled out
let adding = false; // the "+ Goal" form is open
let deleteArmed = null; // the goal whose Delete was pressed once
let card = null; // the realization shown after a new goal

export function drawGoals() {
  const body = pageBody("goals");
  const goals = sortGoals(state.goals);

  const list = el("ul", "goal-list");
  if (goals.length === 0 && !adding) body.append(el("p", "muted", "No goals yet."));
  for (const goal of goals) list.append(goalItem(goal));
  body.append(list);

  if (adding) body.append(addForm());
  else body.append(iconButton("plus", "Goal", "btn primary", () => {
    adding = true;
    card = null;
    drawGoals();
  }));
  if (card) card.placeIn(body);
}

function goalItem(goal) {
  const item = el("li", `goal p${goal.priority}`);
  const open = openId === goal.id;
  const row = button("", "goal-row", () => {
    openId = open ? null : goal.id;
    deleteArmed = null;
    drawGoals();
  });
  row.setAttribute("aria-expanded", String(open));
  row.append(el("span", "prio", priorityLabel(goal.priority)), el("span", "goal-text", goal.text));
  const linked = state.tasks.filter((task) => task.goalId === goal.id && !task.done).length;
  if (linked > 0) row.append(el("span", "muted small", `${linked} task${linked === 1 ? "" : "s"}`));
  item.append(row);

  if (open) {
    const options = el("div", "goal-options");
    options.append(choices(PRIORITIES, goal.priority, (priority) => {
      goal.priority = priority;
      save();
      drawGoals();
    }));
    const armed = deleteArmed === goal.id;
    options.append(button(armed ? "Delete it" : "Delete", armed ? "btn small danger" : "btn small quiet", () => {
      if (!armed) {
        deleteArmed = goal.id;
        drawGoals();
        return;
      }
      state.goals = state.goals.filter((g) => g.id !== goal.id);
      for (const task of state.tasks) if (task.goalId === goal.id) task.goalId = "";
      openId = null;
      deleteArmed = null;
      save();
      drawGoals();
    }));
    item.append(options);
  }
  return item;
}

function addForm() {
  const form = el("form", "card");
  const input = el("input");
  input.type = "text";
  input.placeholder = "Goal";
  input.setAttribute("aria-label", "Goal");
  let priority = state.goals.length === 0 ? 1 : 2; // the first goal starts as High
  const actions = el("div", "actions");
  const add = el("button", "btn primary", "Add");
  add.type = "submit";
  actions.append(add, button("Cancel", "btn quiet", () => {
    adding = false;
    drawGoals();
  }));
  form.append(input, choices(PRIORITIES, priority, (value) => {
    priority = value;
  }), actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    state.goals.push({ id: newId("g"), text, priority });
    save();
    adding = false;
    card = RealizationCard.forMoment("new-goal", state.profile?.topProblems ?? [], { goal: text });
    drawGoals();
  });
  queueMicrotask(() => input.focus());
  return form;
}
