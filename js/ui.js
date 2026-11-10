// Small helpers for building screen elements.
// Text always goes in with textContent, so whatever people type is shown as text
// and can never run as HTML or code.

export function el(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

export function button(label, className, onClick) {
  const element = el("button", className, label);
  element.type = "button";
  if (onClick) element.addEventListener("click", onClick);
  return element;
}

// A labelled text field: { label, input }. hideLabel keeps the label for screen readers only,
// so the screen shows just the placeholder (fewer words).
export function textField(labelText, { type = "text", value = "", placeholder = "", hideLabel = false } = {}) {
  const label = el("label", "field");
  const input = el("input");
  input.type = type;
  input.value = value;
  if (placeholder) input.placeholder = placeholder;
  label.append(el("span", hideLabel ? "sr-only" : "", labelText), input);
  return { label, input };
}

// A 24-hour time picker: hours 00-23 and minutes in steps of 5. Returns { label, hour, minute }.
// Not <input type="time">: that one shows AM/PM or 24 h depending on the computer's
// language settings, and a web page can't change it.
export function timePicker(labelText, value = "") {
  const label = el("label", "field");
  const hour = el("select");
  hour.setAttribute("aria-label", "Hour");
  hour.append(new Option("--", ""));
  for (let h = 0; h < 24; h++) hour.append(new Option(String(h).padStart(2, "0")));
  const minute = el("select");
  minute.setAttribute("aria-label", "Minutes");
  minute.append(new Option("--", ""));
  for (let m = 0; m < 60; m += 5) minute.append(new Option(String(m).padStart(2, "0")));
  if (value) [hour.value, minute.value] = value.split(":");
  // Picking an hour fills in :00; clearing the hour clears the minutes too.
  hour.addEventListener("change", () => {
    if (hour.value && !minute.value) minute.value = "00";
    if (!hour.value) minute.value = "";
  });
  const box = el("span", "time-pick");
  box.append(hour, el("span", "", ":"), minute);
  label.append(el("span", "", labelText), box);
  return { label, hour, minute };
}

// A labelled list: options are [value, text] pairs; onChange gets the chosen value as text.
export function select(labelText, options, current, onChange) {
  const label = el("label", "field");
  const box = el("select");
  for (const [value, text] of options) box.append(new Option(text, String(value)));
  box.value = String(current);
  box.addEventListener("change", () => onChange(box.value));
  label.append(el("span", "", labelText), box);
  return { label, select: box };
}

// Chips where one is chosen: options are [value, text] pairs.
export function choices(options, current, onPick) {
  const box = el("div", "choices");
  for (const [value, text] of options) {
    const chip = button(text, "choice", () => {
      for (const other of box.children) other.setAttribute("aria-pressed", String(other === chip));
      onPick(value);
    });
    chip.setAttribute("aria-pressed", String(value === current));
    box.append(chip);
  }
  return box;
}

// A fold: only its title shows until it's tapped. Built on <details>/<summary>, so it
// works without any JavaScript of its own. Used everywhere to show fewer things at once.
export function fold(title, ...children) {
  const details = el("details", "fold");
  details.append(el("summary", "", title), ...children);
  return details;
}

// Empties a page's body and returns it, ready to draw into.
export function pageBody(name) {
  const body = document.querySelector(`#page-${name} .page-body`);
  body.replaceChildren();
  return body;
}

// A link that looks like a button and opens a website in a new tab.
export function linkButton(label, url, className = "btn small") {
  const link = el("a", className, label);
  link.href = url;
  if (url.startsWith("http")) {
    link.target = "_blank";
    link.rel = "noopener";
  }
  return link;
}

export function sampleTag() {
  return el("span", "tag-sample", "sample");
}

// "source: nhs.uk" in the bottom-right corner of a card; opens in a new tab.
export function sourceLink(url, label = "source") {
  const link = el("a", "source", `${label}: ${new URL(url).hostname.replace(/^www\./, "")}`);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  return link;
}

// Simple line icons (24×24 SVG). These strings are fixed here and never come from what
// people type, which is why innerHTML is safe for them.
const ICONS = {
  today: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  focus: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  help: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  more: '<circle cx="5" cy="12" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="19" cy="12" r="1.2"/>',
  goals: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  notes: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  sleep: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  tips: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5 1.1 1.2 1.1 2V17h5v-1.2c0-.8.5-1.5 1.1-2A6 6 0 0 0 12 3z"/>',
  saved: '<path d="M7 3h10v18l-5-4-5 4z"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  play: '<path d="M8 5v14l11-7z"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  reset: '<path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"/>',
  skip: '<path d="M6 5l9 7-9 7zM18 5v14"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
};

export function icon(name) {
  const span = el("span", "icon");
  span.setAttribute("aria-hidden", "true");
  span.innerHTML = `<svg viewBox="0 0 24 24">${ICONS[name]}</svg>`;
  return span;
}

// A button with an icon and a few words (or only an icon, with a label for screen readers).
export function iconButton(iconName, text, className, onClick, ariaLabel = "") {
  const element = button("", className, onClick);
  element.append(icon(iconName));
  if (text) element.append(el("span", "", text));
  if (ariaLabel) element.setAttribute("aria-label", ariaLabel);
  return element;
}
