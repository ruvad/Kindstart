// Navigation: which page is visible, the ⋯ menu, and every [data-go] button.
// Pages hand this file a draw function at start-up (registerPage), so nav.js never has to
// import them. Otherwise the files would import each other in a circle.

const drawers = {};
let current = "today";

const TABS = ["today", "calendar", "focus", "help"]; // the four pages with their own tab
const UNDER = { test: "help", crisis: "" }; // pages reached from another place; the rest live under ⋯

export function registerPage(name, draw) {
  drawers[name] = draw;
}

export function currentPage() {
  return current;
}

export function showPage(name) {
  closeMore();
  current = name;
  for (const section of document.querySelectorAll("[data-page]")) {
    section.hidden = section.dataset.page !== name;
  }
  const tab = TABS.includes(name) ? name : UNDER[name] ?? "more";
  for (const item of document.querySelectorAll(".tabs [data-tab]")) {
    if (item.dataset.tab === tab) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  }
  drawers[name]?.(); // ?. = only if this page has a draw function
  window.scrollTo(0, 0);
}

function moreButton() {
  return document.querySelector("[data-more]");
}

export function closeMore() {
  document.getElementById("more-menu").hidden = true;
  moreButton().setAttribute("aria-expanded", "false");
}

function toggleMore() {
  const menu = document.getElementById("more-menu");
  menu.hidden = !menu.hidden;
  moreButton().setAttribute("aria-expanded", String(!menu.hidden));
}

// One click listener for the whole page. closest() finds the button even when the click
// lands on the icon inside it, and it works for buttons drawn later too.
export function wireNavigation() {
  document.addEventListener("click", (event) => {
    const go = event.target.closest("[data-go]");
    if (go) {
      showPage(go.dataset.go);
      return;
    }
    if (event.target.closest("[data-more]")) {
      toggleMore();
      return;
    }
    if (!event.target.closest("#more-menu")) closeMore(); // a tap anywhere else closes ⋯
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMore();
  });
}
