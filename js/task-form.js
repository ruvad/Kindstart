// Adding a task: only "What?" and "First step" show; everything else rolls out under More.
// Then the questions from content.js, one at a time (with Skip). An answer with problems
// can show a realization card right under the question.

import { state, save, newId } from "./store.js";
import { content } from "./content-check.js";
import { toISODate, addDays, joinTime } from "./dates.js";
import { makeTask, lengthLabel } from "./tasks.js";
import { sortGoals, priorityLabel } from "./goal-list.js";
import { RealizationCard } from "./realization.js";
import { el, button, sampleTag, textField, timePicker, choices, fold } from "./ui.js";

const LENGTHS = [5, 10, 15, 30, 45, 60, 90, 120, 180];

// area: where the form is drawn. onDone: called after saving or cancelling.
// prefill: { title, date } (from Notes → Task, or a day in the calendar).
export function openTaskForm(area, onDone, prefill = {}) {
  const today = toISODate();
  let when = !prefill.date || prefill.date === today ? "today" : "pick";

  const form = el("form", "card task-form");
  const title = textField("What?", { placeholder: "What?", value: prefill.title ?? "", hideLabel: true });
  title.input.required = true;
  const firstStep = textField("First step", { placeholder: "First step", hideLabel: true });
  firstStep.input.required = true;

  // ----- More -----
  const date = el("input");
  date.type = "date";
  date.min = today;
  date.value = prefill.date && prefill.date !== today ? prefill.date : "";
  date.hidden = when !== "pick";
  date.setAttribute("aria-label", "Day");
  const whenChoices = choices([["today", "Today"], ["tomorrow", "Tomorrow"], ["pick", "Day…"], ["anytime", "Anytime"]], when, (value) => {
    when = value;
    date.hidden = value !== "pick";
    if (value === "pick") date.focus();
  });

  const moreSteps = el("div", "more-steps");
  const addStepButton = button("+ Step", "btn small quiet", () => addStepField());
  function addStepField() {
    const row = el("div", "step-field");
    const field = textField("Next step", { placeholder: "Next step", hideLabel: true });
    const remove = button("×", "icon-btn", () => {
      row.remove();
      addStepButton.focus();
    });
    remove.setAttribute("aria-label", "Remove this step");
    row.append(field.label, remove);
    moreSteps.append(row);
    field.input.focus();
  }

  const time = timePicker("Time");
  const length = el("label", "field");
  length.append(el("span", "", "Length"));
  const lengthSelect = el("select");
  lengthSelect.append(new Option("—", ""));
  for (const minutes of LENGTHS) lengthSelect.append(new Option(lengthLabel(minutes), String(minutes)));
  length.append(lengthSelect);
  const timeRow = el("div", "row");
  timeRow.append(time.label, length);

  const goalSelect = el("select");
  goalSelect.append(new Option("No goal", ""));
  for (const goal of sortGoals(state.goals)) goalSelect.append(new Option(`${goal.text} (${priorityLabel(goal.priority)})`, goal.id));
  const goalField = el("label", "field");
  goalField.append(el("span", "", "Goal"), goalSelect);

  const more = fold("More", whenChoices, date, moreSteps, addStepButton, timeRow);
  if (state.goals.length > 0) more.append(goalField);
  if (when === "pick") more.open = true; // a day chosen in the calendar should be visible

  const actions = el("div", "actions");
  const add = el("button", "btn primary", "Add");
  add.type = "submit";
  const cancel = button("×", "icon-btn", () => onDone(null));
  cancel.setAttribute("aria-label", "Cancel");
  actions.append(add, cancel);

  form.append(title.label, firstStep.label, more, actions);

  // Pressing Enter or Add lands here. preventDefault stops the browser from reloading the
  // page, which is what a form does by default.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!title.input.value.trim()) {
      title.input.focus(); // only spaces typed
      return;
    }
    if (!firstStep.input.value.trim()) {
      firstStep.input.focus(); // the first step is required
      return;
    }
    if (when === "pick" && !date.value) {
      more.open = true;
      date.focus();
      return;
    }
    const fields = {
      title: title.input.value,
      date: { today, tomorrow: addDays(today, 1), pick: date.value, anytime: "" }[when],
      time: joinTime(time.hour.value, time.minute.value),
      minutes: lengthSelect.value,
      steps: [firstStep.input, ...moreSteps.querySelectorAll("input")].map((input) => input.value),
      goalId: goalSelect.value,
    };
    if (content.taskQuestions.length > 0) askQuestions(area, fields, onDone);
    else saveTask(fields, {}, onDone);
  });

  area.replaceChildren(form);
  // With a title already there, the next thing to fill in is the first step.
  (prefill.title ? firstStep.input : title.input).focus();
}

// One question at a time. Next moves on (an unanswered question is simply skipped),
// Skip saves the task straight away.
function askQuestions(area, fields, onDone) {
  const questions = content.taskQuestions;
  const answers = {};
  let index = 0;
  const box = el("div", "card");

  function showQuestion() {
    const question = questions[index];
    const isLast = index === questions.length - 1;
    box.replaceChildren();

    const heading = el("h3", "", question.text);
    if (question.sample) heading.append(sampleTag());
    box.append(el("p", "step-count", `${index + 1}/${questions.length}`), heading);

    const options = el("div", "choices");
    const cardSlot = el("div");
    for (const answer of question.answers) {
      const choice = button(answer.label, "choice", () => {
        answers[question.id] = answer.id;
        for (const other of options.children) other.setAttribute("aria-pressed", String(other === choice));
        cardSlot.replaceChildren();
        if (answer.problems.length > 0) RealizationCard.forMoment("task-question", answer.problems)?.placeIn(cardSlot);
      });
      choice.setAttribute("aria-pressed", "false");
      options.append(choice);
    }

    const actions = el("div", "actions");
    actions.append(
      button(isLast ? "Add" : "Next", "btn primary", () => {
        if (isLast) {
          saveTask(fields, answers, onDone);
        } else {
          index++;
          showQuestion();
        }
      }),
      button("Skip", "btn quiet", () => saveTask(fields, answers, onDone)),
    );
    box.append(options, cardSlot, actions);
  }

  area.replaceChildren(box);
  showQuestion();
}

function saveTask(fields, answers, onDone) {
  const task = makeTask({ ...fields, answers }, toISODate(), newId("t"));
  state.tasks.push(task);
  save();
  onDone(task);
}
