// Loads the content files safely and checks every entry.
// If content.js has a typo, the app still opens and says what's wrong.

// The moments the app knows. content.js lists the same ones in its header.
export const MOMENTS = [
  "task-question",
  "new-goal",
  "need-help",
  "postponed",
  "missed",
  "finished",
  "night",
  "questionnaire",
];

// One shared object. It starts empty and loadContent() fills it, so every file that
// imports `content` sees the loaded entries.
export const content = emptyContent();

function emptyContent() {
  return {
    problems: [],
    scale: [],
    aboutQuestions: [],
    taskQuestions: [],
    realizations: [],
    tips: [],
    contacts: [],
    selfCheck: null,
  };
}

// import() with a path loads a module while the app is running, and returns a Promise.
// A typo in content.js makes that Promise fail. The catch turns the failure into a
// message instead of a blank page.
// Two files: content.js (required) and extra.js (part 2; if it's broken, the app goes on without it).
export async function loadContent(path = "../content/content.js", extraPath = "../content/extra.js") {
  let main;
  try {
    main = await import(path);
  } catch (error) {
    return { error: `content.js has a mistake and couldn't be loaded (${error.message}). Press F12 and open Console to see the line.`, problems: [] };
  }
  let extra = {};
  let error = null;
  try {
    extra = await import(extraPath);
  } catch (problem) {
    error = `content/extra.js couldn't be loaded (${problem.message}), so the app is using content.js only. Press F12 and open Console to see the line.`;
  }
  Object.assign(content, normalize(mergeContent(main, extra)));
  return { error, problems: checkContent(content) };
}

// The lists both content files can have. Merging puts the second file's entries after the first's.
const LIST_KEYS = ["problems", "aboutQuestions", "taskQuestions", "realizations", "tips", "contacts"];

// Joins two content files into one. scale and selfCheck come from the first file
// (or from the second, if the first doesn't have them).
export function mergeContent(first, second) {
  const merged = { scale: first.scale ?? second.scale, selfCheck: first.selfCheck ?? second.selfCheck };
  for (const key of LIST_KEYS) merged[key] = [...(first[key] ?? []), ...(second[key] ?? [])];
  return merged;
}

// Fills in missing lists and fields, so the rest of the app never has to check for them.
export function normalize(loaded) {
  const result = emptyContent();
  for (const key of Object.keys(result)) {
    if (loaded[key] !== undefined) result[key] = loaded[key];
  }
  const withDefaults = (entry) => ({ problems: [], moments: [], source: "", sample: false, ...entry });
  result.realizations = result.realizations.map(withDefaults);
  result.tips = result.tips.map(withDefaults);
  result.taskQuestions = result.taskQuestions.map((question) => ({
    ...question,
    answers: (question.answers || []).map((answer) => ({ problems: [], ...answer })),
  }));
  return result;
}

// Returns a list of readable problems, e.g.  realizations #3 "fear": unknown problem "fear".
// An empty list means everything is fine. tests.html runs this on the real file.
export function checkContent(c) {
  const found = [];
  const problemIds = new Set(c.problems.map((p) => p.id));

  const checkList = (listName, list, required) => {
    const seen = new Set();
    list.forEach((entry, index) => {
      const where = `${listName} #${index + 1}${entry.id ? ` "${entry.id}"` : ""}`;
      for (const field of required) {
        if (typeof entry[field] !== "string" || entry[field].trim() === "") {
          found.push(`${where}: missing "${field}"`);
        }
      }
      if (entry.id && seen.has(entry.id)) found.push(`${where}: the id is used twice`);
      seen.add(entry.id);
      for (const problem of entry.problems || []) {
        if (!problemIds.has(problem)) found.push(`${where}: unknown problem "${problem}"`);
      }
      for (const field of ["source", "link"]) {
        if (entry[field] && !/^https?:\/\//.test(entry[field])) {
          found.push(`${where}: ${field} must start with https://`);
        }
      }
    });
  };

  checkList("problems", c.problems, ["id", "label"]);
  checkList("aboutQuestions", c.aboutQuestions, ["id", "problem", "text"]);
  checkList("taskQuestions", c.taskQuestions, ["id", "text"]);
  checkList("realizations", c.realizations, ["id", "kind", "text"]);
  checkList("tips", c.tips, ["id", "kind", "title", "text"]);
  checkList("contacts", c.contacts, ["id", "name", "how"]);

  c.aboutQuestions.forEach((q, index) => {
    if (q.problem && !problemIds.has(q.problem)) {
      found.push(`aboutQuestions #${index + 1} "${q.id}": unknown problem "${q.problem}"`);
    }
  });
  c.taskQuestions.forEach((q) => {
    if (!q.answers || q.answers.length < 2) found.push(`taskQuestions "${q.id}": needs at least 2 answers`);
    checkList(`taskQuestions "${q.id}" answers`, q.answers || [], ["id", "label"]);
  });
  c.realizations.forEach((r, index) => {
    const where = `realizations #${index + 1} "${r.id}"`;
    if (r.moments.length === 0) found.push(`${where}: needs at least one moment`);
    for (const moment of r.moments) {
      if (!MOMENTS.includes(moment)) found.push(`${where}: unknown moment "${moment}"`);
    }
  });
  c.contacts.forEach((contact, index) => {
    const where = `contacts #${index + 1} "${contact.id}"`;
    if (!["crisis", "professional"].includes(contact.kind)) found.push(`${where}: kind must be "crisis" or "professional"`);
    for (const field of ["call", "text"]) {
      if (contact[field] && !/^\+?[0-9]+$/.test(contact[field])) found.push(`${where}: ${field} must be digits only`);
    }
  });
  if (c.selfCheck) {
    for (const field of ["name", "text", "advice", "link"]) {
      if (!c.selfCheck[field]) found.push(`selfCheck: missing "${field}"`);
    }
  }
  if (c.scale.length < 2) found.push(`scale: needs at least 2 answers`);
  return found;
}
