// Sleep: the person's bedtime and wake-up time, the "bed in ..." line on Today, and the
// darker, warmer colours in the evening (less blue light before sleep).

import { state, save } from "./store.js";
import { minutesUntil, isBetweenTimes, shiftTime, toMinutes, joinTime } from "./dates.js";
import { lengthLabel } from "./tasks.js";
import { el, button, timePicker, choices, pageBody } from "./ui.js";

// What Today shows next to the clock, or null without a schedule. Pure, so tests.html checks it.
export function sleepStatus(sleep, now) {
  if (!sleep.on) return null;
  if (isBetweenTimes(now, sleep.bed, sleep.wake)) return { asleep: true, text: "sleep time" };
  const minutes = minutesUntil(sleep.bed, now);
  return { asleep: false, minutes, text: minutes === 0 ? "bed now" : `bed in ${lengthLabel(minutes)}` };
}

// How long the night is: 23:00 to 07:00 -> 480 minutes.
export function sleepLength(sleep) {
  return (toMinutes(sleep.wake) - toMinutes(sleep.bed) + 1440) % 1440;
}

// Evening = from an hour before bedtime until wake-up.
export function isEvening(sleep, now) {
  return sleep.on && isBetweenTimes(now, shiftTime(sleep.bed, -60), sleep.wake);
}

// Adds or removes the "evening" class on <html>; style.css then uses the dark warm colours.
export function updateEvening(now = new Date()) {
  const on = state.settings.warmEvening && isEvening(state.sleep, now);
  document.documentElement.classList.toggle("evening", on);
}

export function drawSleep() {
  const body = pageBody("sleep");
  const bed = timePicker("Bed", state.sleep.bed);
  const wake = timePicker("Wake up", state.sleep.wake);
  const length = el("p", "muted");
  const showLength = () => {
    const sleep = { bed: joinTime(bed.hour.value, bed.minute.value) || state.sleep.bed, wake: joinTime(wake.hour.value, wake.minute.value) || state.sleep.wake };
    length.textContent = `Sleep: ${lengthLabel(sleepLength(sleep)) || "0 min"}`;
  };
  for (const list of [bed.hour, bed.minute, wake.hour, wake.minute]) list.addEventListener("change", showLength);
  showLength();

  const row = el("div", "row");
  row.append(bed.label, wake.label);
  const saveButton = button(state.sleep.on ? "Save" : "Set", "btn primary", () => {
    state.sleep = {
      on: true,
      bed: joinTime(bed.hour.value, bed.minute.value) || state.sleep.bed,
      wake: joinTime(wake.hour.value, wake.minute.value) || state.sleep.wake,
    };
    save();
    updateEvening();
    drawSleep();
  });
  const actions = el("div", "actions");
  actions.append(saveButton);
  if (state.sleep.on) {
    actions.append(button("Turn off", "btn quiet", () => {
      state.sleep = { ...state.sleep, on: false };
      save();
      updateEvening();
      drawSleep();
    }));
  }
  body.append(row, length, actions);

  // Less blue light before sleep: the evening colours (only with a schedule).
  const warm = el("div", "setting");
  warm.append(
    el("span", "", "Warm screen in the evening"),
    choices([[true, "On"], [false, "Off"]], state.settings.warmEvening, (value) => {
      state.settings.warmEvening = value;
      save();
      updateEvening();
    }),
  );
  body.append(warm);
}
