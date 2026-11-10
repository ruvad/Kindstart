// Dates are stored as plain text "YYYY-MM-DD" in the person's own time zone.
// new Date("2026-11-05") would mean midnight in London (UTC), which is still Nov 4 in the
// evening in Canada, so this file never reads date text that way.

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const FULL_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

// A Date object -> "2026-11-04", using the local day.
export function toISODate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // getMonth() counts from 0
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// "2026-11-04" -> a Date at local midnight.
export function fromISODate(iso) {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(iso, days) {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days); // Date handles month and year ends itself
  return toISODate(date);
}

// Whole days from one date to another. Math.round because a day with a clock change
// lasts 23 or 25 hours.
export function daysBetween(fromIso, toIso) {
  return Math.round((fromISODate(toIso) - fromISODate(fromIso)) / 86_400_000);
}

// What the timeline shows: "today", "tomorrow", "Fri", "Nov 20"...
export function friendlyDate(iso, today) {
  if (!iso) return "anytime";
  const diff = daysBetween(today, iso);
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff === -1) return "yesterday";
  const date = fromISODate(iso);
  if (diff > 1 && diff < 7) return DAY_NAMES[date.getDay()];
  return `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;
}

// The two lists of the time picker -> "09:30". No hour means no time; an hour without
// minutes means on the hour.
export function joinTime(hour, minute) {
  if (!hour) return "";
  return `${hour}:${minute || "00"}`;
}

export function isNight(date = new Date()) {
  const hour = date.getHours();
  return hour >= 23 || hour < 5;
}

// ---------- Times of day ("HH:MM") ----------

export function pad(number) {
  return String(number).padStart(2, "0");
}

// "07:30" -> 450 (minutes since midnight)
export function toMinutes(hhmm) {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

// "23:00" moved by -60 minutes -> "22:00". Wraps around midnight.
export function shiftTime(hhmm, minutes) {
  const total = (((toMinutes(hhmm) + minutes) % 1440) + 1440) % 1440;
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

// Minutes from now until the clock next shows hhmm (0-1439).
export function minutesUntil(hhmm, now = new Date()) {
  const current = now.getHours() * 60 + now.getMinutes();
  return (toMinutes(hhmm) - current + 1440) % 1440;
}

// When the clock last showed hhmm: how many minutes ago, and on which day.
export function lastTimeOf(hhmm, now = new Date()) {
  const current = now.getHours() * 60 + now.getMinutes();
  const minutes = (current - toMinutes(hhmm) + 1440) % 1440;
  return { minutes, date: toISODate(new Date(now.getTime() - minutes * 60_000)) };
}

// Is the clock between two times? Works across midnight, e.g. "22:00" to "07:00".
export function isBetweenTimes(now, from, to) {
  const current = now.getHours() * 60 + now.getMinutes();
  const start = toMinutes(from);
  const end = toMinutes(to);
  return start <= end ? current >= start && current < end : current >= start || current < end;
}

// ---------- Calendar ----------

// The weeks of a month: rows of 7 "YYYY-MM-DD" texts, "" outside the month.
// Weeks start on Monday. month counts from 0, like Date.
export function monthGrid(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const days = new Date(year, month + 1, 0).getDate(); // day 0 of next month = last day of this one
  const cells = Array(offset).fill("");
  for (let day = 1; day <= days; day++) cells.push(toISODate(new Date(year, month, day)));
  while (cells.length % 7 !== 0) cells.push("");
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// The next day a date happens, from today on. A yearly date (a birthday) comes back every
// year; a one-time date that has passed gives "".
export function nextOccurrence(iso, yearly, today) {
  if (!yearly) return iso >= today ? iso : "";
  const [, month, day] = iso.split("-").map(Number);
  const year = Number(today.slice(0, 4));
  const thisYear = toISODate(new Date(year, month - 1, day));
  return thisYear >= today ? thisYear : toISODate(new Date(year + 1, month - 1, day));
}

// Does a (yearly) date fall on this day?
export function occursOn(iso, yearly, day) {
  return yearly ? day >= iso && day.slice(5) === iso.slice(5) : day === iso;
}

// 0 -> "today", 1 -> "tomorrow", 5 -> "in 5 days"
export function daysWord(days) {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
