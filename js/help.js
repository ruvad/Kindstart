// Help: "what's going on?" (a realization, your goal, tips, people to talk to),
// About you (one statement at a time), and Crisis (always one tap away through SOS).

import { state, save } from "./store.js";
import { content } from "./content-check.js";
import { toISODate } from "./dates.js";
import { topProblems } from "./questionnaire.js";
import { topGoal } from "./goal-list.js";
import { RealizationCard } from "./realization.js";
import { tipCard, contactCard, problemLabels, topProblemIds } from "./cards.js";
import { renderTimeline } from "./timeline.js";
import { showPage } from "./nav.js";
import { el, button, fold, pageBody, sampleTag, linkButton, iconButton } from "./ui.js";

const FIRST_PROBLEMS = 6; // how many problems show before "More"

let allProblems = false;
let picked = null; // the problem id chosen last
let helpCard = null; // the realization shown for it (kept when the page is redrawn)

// ---------- Help ----------

export function drawHelp() {
  const body = pageBody("help");
  body.append(el("p", "lead", "What's going on?"));

  // The person's top problems first; the rest keep their order from the content files.
  const top = topProblemIds();
  const problems = content.problems
    .filter((problem) => problem.help)
    .sort((a, b) => Number(top.includes(b.id)) - Number(top.includes(a.id)));
  const visible = allProblems ? problems : problems.slice(0, FIRST_PROBLEMS);

  const grid = el("div", "problem-grid");
  const result = el("div");
  for (const problem of visible) {
    const choice = button(problem.label, "choice", () => {
      picked = problem.id;
      for (const other of grid.children) other.setAttribute("aria-pressed", String(other === choice));
      showHelp(problem, result);
      result.scrollIntoView({ block: "start" });
    });
    choice.setAttribute("aria-pressed", String(problem.id === picked));
    grid.append(choice);
  }
  if (problems.length > FIRST_PROBLEMS) {
    grid.append(button(allProblems ? "Less" : "More", "choice quiet", () => {
      allProblems = !allProblems;
      drawHelp();
    }));
  }
  body.append(grid, result);
  // Redrawn (e.g. after More/Less): the last answer stays, even if its button is folded away.
  const pickedProblem = problems.find((problem) => problem.id === picked);
  if (pickedProblem) showHelp(pickedProblem, result, false);

  // The rest of Help, folded.
  const about = el("div");
  const known = top.length > 0 ? el("p", "muted", problemLabels(top).join(" · ")) : "";
  about.append(known, button(state.profile?.date ? "Again" : "Start", "btn", () => {
    restartTest();
    showPage("test");
  }));
  body.append(fold("About you", about), fold("Talk to someone", ...professionalCards()), selfCheckFold());
}

// fresh = false when the page is only redrawn: the same card stays (and isn't counted twice).
function showHelp(problem, result, fresh = true) {
  result.replaceChildren(el("h2", "", problem.label));
  if (fresh) helpCard = RealizationCard.forMoment("need-help", [problem.id]);
  helpCard?.placeIn(result);

  const goal = topGoal(state.goals);
  if (goal) {
    const card = el("div", "card goal-card");
    card.append(el("p", "card-kind", "Your goal"), el("p", "", goal.text));
    result.append(card);
  }

  const tips = content.tips.filter((tip) => tip.problems.includes(problem.id));
  if (tips.length > 0) result.append(fold(`What can help (${tips.length})`, ...tips.map(tipCard)));
}

function professionalCards() {
  const professionals = content.contacts.filter((contact) => contact.kind === "professional");
  return [el("p", "muted small", "If this keeps happening, a professional can help."), ...professionals.map(contactCard)];
}

function selfCheckFold() {
  const check = content.selfCheck;
  if (!check) return "";
  const card = el("div", "card");
  const kind = el("p", "card-kind", "Outside screener");
  if (check.sample) kind.append(sampleTag());
  const actions = el("div", "actions");
  actions.append(linkButton("Open", check.link, "btn primary"));
  card.append(kind, el("h3", "", check.name), el("p", "", check.text), el("p", "", check.advice), actions);
  return fold("ADHD self-check", card);
}

// ---------- About you: one statement at a time ----------

let test = null; // { index, answers } while the questions are open

export function restartTest() {
  test = null;
}

export function drawTest() {
  const body = pageBody("test");
  const questions = content.aboutQuestions;
  test ??= { index: 0, answers: { ...(state.profile?.answers ?? {}) } }; // a copy: saved only at the end
  if (test.index >= questions.length) {
    finishTest(body);
    return;
  }

  const question = questions[test.index];
  body.append(el("p", "step-count", `${test.index + 1}/${questions.length}`));
  const text = el("p", "statement-text", question.text);
  if (question.sample) text.append(sampleTag());
  body.append(text);

  const scale = el("div", "scale");
  content.scale.forEach((label, score) => {
    const choice = button(label, "choice", () => {
      test.answers[question.id] = score;
      test.index++;
      drawTest();
    });
    choice.setAttribute("aria-pressed", String(test.answers[question.id] === score));
    scale.append(choice);
  });
  body.append(scale);

  const actions = el("div", "actions");
  if (test.index > 0) {
    actions.append(iconButton("back", "", "btn quiet", () => {
      test.index--;
      drawTest();
    }, "Back"));
  }
  actions.append(
    button("Skip", "btn quiet", () => {
      test.index++;
      drawTest();
    }),
    button("Finish", "btn quiet", () => {
      test.index = questions.length;
      drawTest();
    }),
  );
  body.append(actions);
}

function finishTest(body) {
  const top = topProblems(test.answers, content.aboutQuestions);
  state.profile = { ...(state.profile ?? { name: "" }), answers: test.answers, topProblems: top, date: toISODate() };
  save();
  test = null;
  renderTimeline(); // the welcome card disappears

  const card = el("div", "card");
  card.append(el("p", "card-kind", "Your top"), el("p", "", top.length > 0 ? problemLabels(top).join(" · ") : "Nothing stood out."));
  body.append(card);
  RealizationCard.forMoment("questionnaire", top)?.placeIn(body);
  const actions = el("div", "actions");
  const goals = button(state.goals.length > 0 ? "Goals" : "Set a goal", "btn primary");
  goals.dataset.go = "goals";
  const today = button("Today", "btn");
  today.dataset.go = "today";
  actions.append(goals, today);
  body.append(actions);
}

// ---------- Crisis ----------

export function drawCrisis() {
  const body = pageBody("crisis");
  body.append(el("p", "lead", "You don't have to handle this alone."));
  const crisis = content.contacts.filter((contact) => contact.kind === "crisis");
  for (const contact of crisis) body.append(contactCard(contact));
  if (crisis.length === 0) body.append(el("p", "how", "If you're in danger, call your local emergency number."));
  body.append(el("p", "muted small", "Kindstart can't respond to emergencies or see what you type. If you're in danger, call."));
}
