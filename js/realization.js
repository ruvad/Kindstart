// Realizations: pick the right message for a moment, and show it as a card anywhere.
//
// One line puts a card on any page, for any moment:
//   RealizationCard.forMoment("finished", ["cant-start"])?.placeIn(someElement);
// forMoment() returns null when nothing fits, and ?. then does nothing.

import { content } from "./content-check.js";
import { state, save } from "./store.js";
import { topGoal } from "./goal-list.js";
import { el, button, sampleTag, sourceLink } from "./ui.js";

// Chooses a realization for a moment, or null. Pure, so tests.html checks it.
// 1. Only realizations that list this moment.
// 2. Ones made for the given problems, plus general ones (problems: []).
// 3. The one shown least often so far; on a tie, the one written first in content.js.
export function pickRealization(list, moment, problems = [], seen = {}) {
  const forMoment = list.filter((r) => r.moments.includes(moment));
  const specific = forMoment.filter((r) => r.problems.some((p) => problems.includes(p)));
  const general = forMoment.filter((r) => r.problems.length === 0);
  let best = null;
  for (const r of [...specific, ...general]) {
    if (best === null || (seen[r.id] || 0) < (seen[best.id] || 0)) best = r;
  }
  return best;
}

// Puts the person's name and goal into a text: "{name}, you can..." -> "Sam, you can..."
export function fillText(text, profile) {
  const name = profile?.name?.trim() || "Hey";
  const goal = profile?.goal?.trim() || "your goal";
  return text.replaceAll("{name}", name).replaceAll("{goal}", goal);
}

// The person's name and their top goal, for {name} and {goal}.
export function personFill() {
  return { name: state.profile?.name, goal: topGoal(state.goals)?.text };
}

export class RealizationCard {
  // fill: values for {name} / {goal} in this card, e.g. { goal: "the goal just added" }.
  constructor(realization, fill = {}) {
    this.realization = realization;
    this.fill = fill;
    this.element = this.build();
  }

  // Finds a realization for this moment, counts it as seen, and returns a card (or null).
  static forMoment(moment, problems = [], fill = {}) {
    const realization = pickRealization(content.realizations, moment, problems, state.seen);
    if (realization === null) return null;
    state.seen[realization.id] = (state.seen[realization.id] || 0) + 1;
    save();
    return new RealizationCard(realization, fill);
  }

  build() {
    const r = this.realization;
    const card = el("aside", "card realization");
    card.dataset.realization = r.id;

    const kind = el("p", "card-kind", r.kind === "reassurance" ? "Reassurance" : "Realization");
    if (r.sample) kind.append(sampleTag());

    const text = el("p", "", fillText(r.text, { ...personFill(), ...this.fill }));

    const foot = el("div", "card-foot");
    // An arrow function keeps `this` pointing at this card when the click happens.
    this.saveButton = button("", "btn small", () => this.toggleSave());
    foot.append(this.saveButton);
    if (r.source) foot.append(sourceLink(r.source));
    this.showSaved();

    card.append(kind, text, foot);
    return card;
  }

  isSaved() {
    return state.saved.includes(this.realization.id);
  }

  toggleSave() {
    const id = this.realization.id;
    state.saved = this.isSaved() ? state.saved.filter((x) => x !== id) : [...state.saved, id];
    save();
    this.showSaved();
  }

  showSaved() {
    const saved = this.isSaved();
    this.saveButton.textContent = saved ? "Saved ✓" : "Save";
    this.saveButton.setAttribute("aria-pressed", String(saved));
  }

  placeIn(container) {
    container.append(this.element);
    return this;
  }

  placeAfter(element) {
    element.after(this.element);
    return this;
  }
}
