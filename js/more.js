// The pages under ⋯: Notes, Tips, Saved and Me. (Goals and Sleep have their own files.)
// Every part of Me starts folded: only its title shows until it's tapped.

import { state, save, newId, deleteEverything } from "./store.js";
import { content } from "./content-check.js";
import { toISODate, friendlyDate } from "./dates.js";
import { RealizationCard } from "./realization.js";
import { tipCard, problemLabels, topProblemIds } from "./cards.js";
import { renderTimeline, openAddTask } from "./timeline.js";
import { restartTest } from "./help.js";
import { showPage } from "./nav.js";
import { notificationSettings } from "./notifications.js";
import { accountsEnabled, currentUser, syncStatus, onStatusChange, signIn, signUp, signOut, deleteAccountData } from "./account.js";
import { el, button, textField, fold, pageBody } from "./ui.js";

// ---------- Notes ----------

export function drawNotes() {
  const body = pageBody("notes");
  const text = el("textarea");
  text.placeholder = "Write…";
  text.setAttribute("aria-label", "New note");
  const add = button("Add", "btn primary", () => {
    if (!text.value.trim()) {
      text.focus();
      return;
    }
    state.notes.unshift({ id: newId("n"), text: text.value.trim(), date: toISODate() }); // newest first
    save();
    drawNotes();
  });
  const actions = el("div", "actions");
  actions.append(add);
  body.append(text, actions);

  const today = toISODate();
  for (const note of state.notes) {
    const row = el("div", "card note");
    const remove = button("×", "icon-btn", () => {
      state.notes = state.notes.filter((n) => n.id !== note.id);
      save();
      drawNotes();
    });
    remove.setAttribute("aria-label", "Delete note");
    // → Task: opens the add-task form on Today with the note's first line as the title.
    const toTask = button("→ Task", "btn small quiet", () => openAddTask({ title: note.text.split("\n")[0].slice(0, 120) }));
    toTask.setAttribute("aria-label", "Make this note a task");
    row.append(el("span", "muted small", friendlyDate(note.date, today)), el("p", "", note.text), toTask, remove);
    body.append(row);
  }
}

// ---------- Tips ----------

const KIND_HEADINGS = [["tip", "Tips"], ["advice", "Advice"], ["tool", "Tools"]];

export function drawTips() {
  const body = pageBody("tips");
  const top = topProblemIds();
  const forYou = content.tips.filter((tip) => tip.problems.some((p) => top.includes(p)));
  const rest = content.tips.filter((tip) => !forYou.includes(tip));
  if (content.tips.length === 0) body.append(el("p", "muted", "No tips yet."));
  if (forYou.length > 0) {
    body.append(el("h2", "", "For you"), el("p", "muted small", problemLabels(top).join(" · ")));
    for (const tip of forYou) body.append(tipCard(tip));
  }
  for (const [kind, heading] of KIND_HEADINGS) {
    const ofKind = rest.filter((tip) => tip.kind === kind);
    if (ofKind.length > 0) body.append(fold(`${heading} (${ofKind.length})`, ...ofKind.map(tipCard)));
  }
}

// ---------- Saved realizations ----------

export function drawSaved() {
  const body = pageBody("saved");
  // A Map finds a realization by its id quickly: byId.get("you-did-it").
  const byId = new Map(content.realizations.map((r) => [r.id, r]));
  const saved = state.saved.map((id) => byId.get(id)).filter(Boolean); // skip ids deleted from the content files
  const seen = content.realizations.filter((r) => state.seen[r.id] && !state.saved.includes(r.id));
  if (saved.length === 0 && seen.length === 0) {
    body.append(el("p", "muted", "Realizations you see are kept here."));
    return;
  }
  for (const r of saved) new RealizationCard(r).placeIn(body);
  if (seen.length > 0) {
    const seenFold = fold(`Seen (${seen.length})`);
    for (const r of seen) new RealizationCard(r).placeIn(seenFold);
    body.append(seenFold);
  }
}

// ---------- Me ----------

let deleteArmed = false; // the first click on "Delete all my data" only asks again

export function drawMe() {
  const body = pageBody("me");
  body.append(fold("Account", accountSection()), fold("Name", nameSection()), fold("Notifications", notificationSettings()),
    fold("About you", aboutSection()), fold("Your data", dataSection()));
}

function nameSection() {
  const box = el("div");
  const name = textField("Name", { value: state.profile?.name ?? "", hideLabel: true, placeholder: "Name" });
  const status = el("span", "muted small");
  const actions = el("div", "actions");
  actions.append(button("Save", "btn primary", () => {
    state.profile = { ...(state.profile ?? { answers: {}, topProblems: [], date: "" }), name: name.input.value.trim() };
    save();
    status.textContent = "Saved";
  }), status);
  box.append(name.label, actions);
  return box;
}

function aboutSection() {
  const box = el("div");
  const top = topProblemIds();
  box.append(el("p", "", top.length > 0 ? problemLabels(top).join(" · ") : "—"));
  box.append(button(state.profile?.date ? "Again" : "Start", "btn", () => {
    restartTest();
    showPage("test");
  }));
  return box;
}

function dataSection() {
  const box = el("div");
  const signedIn = currentUser() !== null;
  box.append(el("p", "muted small", signedIn ? "In this browser and in your account." : "Only in this browser. Nothing is sent anywhere."));
  const again = signedIn ? "Delete everything, here and in your account" : "Delete everything";
  const message = el("p", "small");
  const wipe = button(deleteArmed ? again : "Delete all my data", deleteArmed ? "btn danger" : "btn", async () => {
    if (!deleteArmed) {
      deleteArmed = true;
      drawMe();
      body().querySelector("details:last-of-type").open = true;
      return;
    }
    deleteArmed = false;
    if (signedIn) {
      try {
        await deleteAccountData();
      } catch (error) {
        message.textContent = `Nothing was deleted. ${error.message}`;
        return;
      }
    } else {
      deleteEverything();
    }
    renderTimeline();
    showPage("today");
  });
  box.append(wipe, message);
  return box;
}

function body() {
  return document.querySelector("#page-me .page-body");
}

// The status line under "Signed in as" changes while data is being sent.
onStatusChange((status) => {
  const line = document.getElementById("sync-status");
  if (line) line.textContent = statusText(status);
});

function statusText(status) {
  if (status === "saving") return "Saving…";
  if (status === "saved") return "Saved ✓";
  if (status.startsWith("error: ")) return `Not saved yet. ${status.slice(7)} It tries again with your next change.`;
  return "";
}

function accountSection() {
  const section = el("div");
  if (!accountsEnabled()) {
    section.append(el("p", "muted small", "Accounts aren't switched on yet, so everything stays in this browser."));
    return section;
  }

  const message = el("p", "small");
  message.setAttribute("role", "status");
  const user = currentUser();
  if (user) {
    const sync = el("p", "muted small", statusText(syncStatus()));
    sync.id = "sync-status";
    const out = button("Sign out", "btn", async () => {
      out.disabled = true;
      message.textContent = "Signing out…";
      try {
        await signOut();
        drawMe();
      } catch (error) {
        message.textContent = `Your last changes couldn't be saved, so you're still signed in. ${error.message}`;
        out.disabled = false;
      }
    });
    section.append(el("p", "", user.email), sync, out, message);
    return section;
  }

  section.append(el("p", "muted small", "Keep your data on every device."));
  const form = el("form");
  const email = textField("Email", { type: "email", placeholder: "Email", hideLabel: true });
  email.input.autocomplete = "email";
  const password = textField("Password", { type: "password", placeholder: "Password", hideLabel: true });
  password.input.autocomplete = "current-password";
  const signInButton = el("button", "btn primary", "Sign in");
  signInButton.type = "submit"; // Enter in a field also signs in
  const create = button("Create account", "btn", () => run("create"));
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    run("sign-in");
  });

  async function run(action) {
    const address = email.input.value.trim();
    const secret = password.input.value;
    if (!address || !secret) {
      message.textContent = "Type your email and a password.";
      return;
    }
    if (action === "create" && secret.length < 6) {
      message.textContent = "Use a password of at least 6 characters.";
      return;
    }
    message.textContent = action === "create" ? "Creating your account…" : "Signing in…";
    try {
      if (action === "create" && (await signUp(address, secret)) === "check-email") {
        message.textContent = `Almost done: open the email sent to ${address}, click its link, then come back here.`;
        return;
      }
      if (action === "sign-in") await signIn(address, secret);
      drawMe();
      body().querySelector("details").open = true; // keep Account open
    } catch (error) {
      message.textContent = error.message;
    }
  }

  const actions = el("div", "actions");
  actions.append(signInButton, create);
  form.append(email.label, password.label, actions, message);
  section.append(form);
  return section;
}
