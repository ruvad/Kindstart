// Cards used on more than one page: a tip, a contact (crisis line or professional),
// and problem names.

import { state } from "./store.js";
import { content } from "./content-check.js";
import { fillText, personFill } from "./realization.js";
import { el, sampleTag, sourceLink, linkButton } from "./ui.js";

const KIND_LABELS = { tip: "Tip", advice: "Advice", tool: "Tool" };

// One tip, advice or tool. Used on Help and Tips.
export function tipCard(tip) {
  const card = el("article", "card");
  const kind = el("p", "card-kind", KIND_LABELS[tip.kind] ?? tip.kind);
  if (tip.sample) kind.append(sampleTag());
  card.append(kind, el("h3", "", tip.title), el("p", "", fillText(tip.text, personFill())));
  const foot = el("div", "card-foot");
  if (tip.link) foot.append(linkButton("Open", tip.link));
  if (tip.source) foot.append(sourceLink(tip.source));
  if (foot.children.length > 0) card.append(foot);
  return card;
}

// A crisis line or a professional directory.
export function contactCard(contact) {
  const isCrisis = contact.kind === "crisis";
  const card = el("article", isCrisis ? "card contact" : "card");
  card.append(el("h3", "", contact.name));
  if (contact.region) card.append(el("p", "muted small", contact.region));
  card.append(el("p", isCrisis ? "how" : "", contact.how));

  const actions = el("div", "actions");
  // tel: and sms: links open the phone's call or message app.
  if (contact.call) actions.append(linkButton(`Call ${contact.call}`, `tel:${contact.call}`, "btn danger"));
  if (contact.text) actions.append(linkButton(`Text ${contact.text}`, `sms:${contact.text}`, "btn"));
  if (contact.link) actions.append(linkButton(contact.linkLabel || "Website", contact.link, "btn"));
  if (actions.children.length > 0) card.append(actions);

  if (contact.source) {
    const foot = el("div", "card-foot");
    foot.append(sourceLink(contact.source));
    card.append(foot);
  }
  return card;
}

export function problemLabels(ids) {
  return ids.map((id) => content.problems.find((p) => p.id === id)?.label ?? id);
}

export function topProblemIds() {
  return state.profile?.topProblems ?? [];
}
