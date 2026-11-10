// Start-up: connects the buttons, loads the content, shows Today, and starts the clock,
// the reminders and the account.

import { wireNavigation, registerPage, showPage } from "./nav.js";
import { loadContent } from "./content-check.js";
import { showTimeline, renderTimeline, renderTop, openAddTask } from "./timeline.js";
import { drawCalendar } from "./calendar.js";
import { drawFocus } from "./focus.js";
import { drawHelp, drawTest, drawCrisis } from "./help.js";
import { drawGoals } from "./goals.js";
import { drawSleep, updateEvening } from "./sleep.js";
import { drawNotes, drawTips, drawSaved, drawMe } from "./more.js";
import { startReminders } from "./notifications.js";
import { startAccount, onDataReplaced } from "./account.js";

wireNavigation();

const { error, problems } = await loadContent();
showContentWarning(error, problems);

registerPage("today", showTimeline);
registerPage("calendar", drawCalendar);
registerPage("focus", drawFocus);
registerPage("help", drawHelp);
registerPage("test", drawTest);
registerPage("crisis", drawCrisis);
registerPage("goals", drawGoals);
registerPage("notes", drawNotes);
registerPage("sleep", drawSleep);
registerPage("tips", drawTips);
registerPage("saved", drawSaved);
registerPage("me", drawMe);

document.getElementById("add-task").addEventListener("click", () => openAddTask());

showPage("today");
updateEvening();
// Every 30 seconds: the clock and "bed in ..." on Today, and the evening colours.
setInterval(() => {
  renderTop();
  updateEvening();
}, 30_000);

startReminders();
onDataReplaced(() => {
  renderTimeline(); // data from the account replaced this device's
  updateEvening();
});
startAccount(); // not awaited: the app can be used while it talks to the account

// The red line at the top: only visible when a content file has a mistake.
function showContentWarning(error, problems) {
  const line = document.getElementById("content-error");
  if (error) {
    line.textContent = error;
  } else if (problems.length > 0) {
    line.textContent = `The content has ${problems.length} problem(s). First one: ${problems[0]}. Open tests.html for the full list.`;
  }
  line.hidden = !error && problems.length === 0;
}
