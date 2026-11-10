// =====================================================================================
//  Kindstart content: everything people read in the app.
//
//  Everything people read in the app that isn't their own (problems, questions,
//  realizations, tips, contacts) lives in this one file. Change the text, add entries,
//  delete entries. The app picks them up when you reload the page (Ctrl+Shift+R).
//
//  HOW TO WRITE AN ENTRY
//  - Each entry is { ... } with fields like  id: "short-name",  text: "...",
//    and a comma after it. The last one may keep its comma too.
//  - Text goes between "double quotes". To use a " inside the text, write \"
//  - id: short, unique, lowercase-with-dashes. Never reuse one.
//  - sample: true marks an entry Claude wrote as a placeholder (it shows a SAMPLE tag).
//    Delete that line when the entry is yours.
//  - source: a link starting with https:// (optional). It appears in the card's
//    bottom-right corner.
//  - {name} and {goal} in a text are replaced with the person's name and goal.
//
//  PROBLEMS connect everything: a realization or tip lists the problem ids it helps with.
//
//  MOMENTS say when a realization may appear by itself:
//    "task-question"  someone picks an answer (with problems) in the questions before a new task
//    "new-goal"       someone sets or changes their goal
//    "need-help"      someone picks a problem on the Help page
//    "postponed"      someone presses Later on a task
//    "missed"         a task's day has passed and it isn't done
//    "finished"       someone ticks a task done
//    "night"          the app is opened between 23:00 and 05:00
//    "questionnaire"  right after the About you questions (Help → About you)
//  A realization with  problems: []  is general: it can appear at its moments for anyone.
//
//  MADE A MISTAKE? The app shows a red line at the top saying what's wrong.
//  tests.html also checks every entry and names the one with a problem.
// =====================================================================================


// The problems the app knows about. help: true means it's a button on the Help page.
export const problems = [
  { id: "cant-start", label: "I can't start", help: true },
  { id: "focus", label: "I can't focus", help: true },
  { id: "distractions", label: "I keep getting distracted", help: true },
  { id: "scrolling", label: "I'm stuck scrolling or gaming", help: true },
  { id: "boring", label: "It's too boring", help: true },
  { id: "motivation", label: "I have no motivation", help: true },
  { id: "shame", label: "I feel ashamed", help: true },
  { id: "loops", label: "I'm stuck in a draining loop", help: true },
  { id: "sleep", label: "I can't sleep", help: true },
  { id: "organisation", label: "I've lost track of things", help: false },
  { id: "interest", label: "My interest comes and goes", help: false },
  { id: "confidence", label: "I don't believe I can do it", help: false },
  { id: "patience", label: "I've run out of patience", help: false },
];


// About you (Help → About you). Answers on this scale score 0, 1, 2, 3, 4.
// Problems scoring 2 ("Sometimes") or more become the person's top problems (max 3).
export const scale = ["Never", "Rarely", "Sometimes", "Often", "Very often"];

export const aboutQuestions = [
  { id: "a-start", problem: "cant-start", text: "I put off starting tasks, even ones I want to do.", sample: true },
  { id: "a-focus", problem: "focus", text: "My attention drifts away even when I'm trying to concentrate.", sample: true },
  { id: "a-distract", problem: "distractions", text: "Small things around me pull me away from what I'm doing.", sample: true },
  { id: "a-scroll", problem: "scrolling", text: "I find it hard to stop scrolling, gaming or other quick-reward activities.", sample: true },
  { id: "a-boring", problem: "boring", text: "I can't make myself do tasks that bore me.", sample: true },
  { id: "a-motivation", problem: "motivation", text: "I struggle to find the motivation to do things that matter to me.", sample: true },
  { id: "a-shame", problem: "shame", text: "I feel ashamed about things I didn't get done.", sample: true },
  { id: "a-loops", problem: "loops", text: "I get stuck in loops (thinking, scrolling, redoing) that drain my energy.", sample: true },
  { id: "a-sleep", problem: "sleep", text: "It's hard for me to fall asleep or stay asleep.", sample: true },
  { id: "a-organise", problem: "organisation", text: "I lose track of tasks, dates or things I need.", sample: true },
  { id: "a-interest", problem: "interest", text: "My interest in things comes in strong waves and then disappears.", sample: true },
  { id: "a-confidence", problem: "confidence", text: "I doubt I can do things well, even when I have before.", sample: true },
  { id: "a-patience", problem: "patience", text: "Waiting or slow progress makes me give up or get angry.", sample: true },
];


// Questions asked (one at a time) before each new task. People can skip them all.
// An answer with problems can trigger a realization (moment "task-question").
// An answer with  problems: []  triggers nothing.
export const taskQuestions = [
  {
    id: "feeling",
    text: "How do you feel about this task?",
    sample: true,
    answers: [
      { id: "bored", label: "Bored", problems: ["boring"] },
      { id: "scared", label: "Scared", problems: ["confidence"] },
      { id: "excited", label: "Excited", problems: ["interest"] },
      { id: "fine", label: "Fine", problems: [] },
    ],
  },
  {
    id: "size",
    text: "How big does it feel?",
    sample: true,
    answers: [
      { id: "small", label: "Small", problems: [] },
      { id: "medium", label: "Medium", problems: [] },
      { id: "huge", label: "Huge", problems: ["cant-start"] },
    ],
  },
  {
    id: "clear",
    text: "Do you know exactly what the first step is?",
    sample: true,
    answers: [
      { id: "yes", label: "Yes", problems: [] },
      { id: "not-really", label: "Not really", problems: ["organisation"] },
    ],
  },
];


// Realizations and reassurance: short messages that appear by themselves at the right moment.
// kind: "realization" or "reassurance". Saved ones are kept under ⋯ → Saved.
export const realizations = [
  {
    id: "starting-makes-ready",
    kind: "realization",
    text: "You don't need to feel ready to start. Starting is what makes you ready.",
    problems: ["cant-start"],
    moments: ["task-question", "need-help", "postponed"],
    sample: true,
  },
  {
    id: "fear-means-it-matters",
    kind: "realization",
    text: "Fear often means it matters to you. Begin with the part that scares you least.",
    problems: ["confidence"],
    moments: ["task-question", "need-help"],
    sample: true,
  },
  {
    id: "boring-finish-line",
    kind: "realization",
    text: "Boring tasks feel endless because they have no finish line. Give this one a finish line: 10 minutes, then you may stop.",
    problems: ["boring"],
    moments: ["task-question", "need-help"],
    sample: true,
  },
  {
    id: "ride-the-wave",
    kind: "realization",
    text: "This interest is a wave. Ride it now: do the first step while it's strong.",
    problems: ["interest"],
    moments: ["task-question", "new-goal"],
    sample: true,
  },
  {
    id: "only-the-first-step",
    kind: "realization",
    text: "{name}, you don't have to do the whole thing. Just the first step. Then decide again.",
    problems: ["cant-start", "organisation"],
    moments: ["task-question", "postponed", "missed"],
    sample: true,
  },
  {
    id: "moving-is-planning",
    kind: "reassurance",
    text: "Moving a task isn't failing. Moving it on purpose is planning.",
    problems: [],
    moments: ["postponed"],
    sample: true,
  },
  {
    id: "missed-not-worth",
    kind: "reassurance",
    text: "A missed task says nothing about your worth. It only needs a new time.",
    problems: [],
    moments: ["missed"],
    sample: true,
  },
  {
    id: "you-did-it",
    kind: "reassurance",
    text: "You did it. Remember this the next time your brain says you can't.",
    problems: [],
    moments: ["finished"],
    sample: true,
  },
  {
    id: "starting-was-the-hard-part",
    kind: "realization",
    text: "The hardest part was starting, and you did that part too.",
    problems: ["cant-start"],
    moments: ["finished"],
    sample: true,
  },
  {
    id: "night-tasks-are-safe",
    kind: "reassurance",
    text: "Tomorrow's tasks are saved here. You don't have to hold them in your head tonight.",
    problems: ["sleep"],
    moments: ["night", "need-help"],
    sample: true,
  },
  {
    id: "goal-why",
    kind: "realization",
    text: "Think about why \"{goal}\" matters to you. On hard days, the why is what gets you started.",
    problems: [],
    moments: ["new-goal"],
    sample: true,
  },
  {
    id: "answers-not-broken",
    kind: "reassurance",
    text: "These answers don't mean you're broken. They show where a little help makes the biggest difference.",
    problems: [],
    moments: ["questionnaire"],
    sample: true,
  },
  {
    id: "scrolling-not-willpower",
    kind: "realization",
    text: "Those apps are built to be hard to stop. Stopping isn't a willpower test: put the phone in another room.",
    problems: ["scrolling"],
    moments: ["need-help"],
    sample: true,
  },
  {
    id: "name-the-loop",
    kind: "realization",
    text: "Say it out loud: \"I'm in a loop.\" Noticing it is the first step out.",
    problems: ["loops"],
    moments: ["need-help"],
    sample: true,
  },
  {
    id: "focus-is-spread",
    kind: "realization",
    text: "Your focus isn't gone. It's spread over too many things. Pick one and hide the rest.",
    problems: ["focus", "distractions"],
    moments: ["need-help"],
    sample: true,
  },
  {
    id: "motivation-comes-after",
    kind: "realization",
    text: "Motivation often comes after you start, not before.",
    problems: ["motivation"],
    moments: ["need-help", "new-goal"],
    sample: true,
  },
  {
    id: "talk-like-a-friend",
    kind: "reassurance",
    text: "Talk to yourself the way you'd talk to a friend in the same situation.",
    problems: ["shame"],
    moments: ["need-help", "missed"],
    sample: true,
  },
];


// ⋯ → Tips, and the tips shown on the Help page for a problem.
// kind: "advice", "tip" or "tool". link: where a tool can be found (optional).
export const tips = [
  {
    id: "two-minute-start",
    kind: "tip",
    title: "Two-minute start",
    text: "Set a timer for two minutes and do only the first step. When it rings, you're allowed to stop.",
    problems: ["cant-start", "boring"],
    sample: true,
  },
  {
    id: "phone-in-another-room",
    kind: "tip",
    title: "Phone in another room",
    text: "Out of reach works better than willpower. Put the phone in another room before you start.",
    problems: ["scrolling", "distractions", "focus"],
    sample: true,
  },
  {
    id: "pair-with-something-nice",
    kind: "advice",
    title: "Pair it with something you like",
    text: "Do the boring task with music you like, a drink, or in a place you enjoy.",
    problems: ["boring", "motivation"],
    sample: true,
  },
  {
    id: "screens-off-before-bed",
    kind: "advice",
    title: "Screens off an hour before bed",
    text: "The NHS suggests not using phones, tablets or computers for an hour before bed, and getting up for a calm activity if you're still awake after about 20 minutes.",
    problems: ["sleep", "scrolling"],
    source: "https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/how-to-fall-asleep-faster-and-sleep-better/",
    sample: true,
  },
  {
    id: "goblin-tools",
    kind: "tool",
    title: "Goblin Tools: Magic ToDo",
    text: "Type a task and it breaks it into smaller steps. Free.",
    link: "https://goblin.tools/",
    problems: ["cant-start", "organisation"],
    sample: true,
  },
  {
    id: "focusmate",
    kind: "tool",
    title: "Focusmate",
    text: "Video co-working with another person (body doubling). The free plan allows 3 sessions a week.",
    link: "https://www.focusmate.com/",
    problems: ["cant-start", "focus", "motivation"],
    sample: true,
  },
];


// Contacts. kind "crisis" shows on the Crisis page (SOS); kind "professional" under Help → Talk to someone.
// call / text: the number to call or text (optional). link: the website (optional).
// Claude checked these against the official sites on 2026-11-05. Check again before changing a number.
export const contacts = [
  {
    id: "emergency",
    kind: "crisis",
    name: "Emergency services",
    region: "Canada and the US",
    how: "Call 911 if you or someone else is in immediate danger.",
    call: "911",
  },
  {
    id: "988-canada",
    kind: "crisis",
    name: "9-8-8: Suicide Crisis Helpline",
    region: "Canada · 24 hours a day, every day",
    how: "Call or text 9-8-8.",
    call: "988",
    text: "988",
    link: "https://988.ca/",
  },
  {
    id: "988-us",
    kind: "crisis",
    name: "988 Suicide & Crisis Lifeline",
    region: "US · 24/7, free and confidential",
    how: "Call or text 988, or chat online.",
    call: "988",
    text: "988",
    link: "https://chat.988lifeline.org/",
    linkLabel: "Chat online",
    source: "https://988lifeline.org/",
  },
  {
    id: "find-a-helpline",
    kind: "crisis",
    name: "Find A Helpline",
    region: "Other countries",
    how: "Free, confidential helplines in over 175 countries.",
    link: "https://findahelpline.com/",
  },
  {
    id: "caddac",
    kind: "professional",
    name: "CADDAC: Find a resource",
    region: "Canada",
    how: "ADHD services by province, including assessments and psychologists. Listings are submitted by the providers, so check qualifications and fees with each one.",
    link: "https://caddac.ca/find-a-resource/",
  },
  {
    id: "chadd",
    kind: "professional",
    name: "CHADD Professional Directory",
    region: "US",
    how: "Find ADHD professionals in your area.",
    link: "https://chadd.org/professional-directory/",
  },
];


// The ADHD self-check (Help → ADHD self-check): a link to an outside screener, plus the advice
// not to self-diagnose.
export const selfCheck = {
  name: "Adult ADHD Self-Report Scale (ASRS v1.1) screener",
  text: "Six questions from the World Health Organization's adult ADHD screener. It is a screening tool, not a diagnosis.",
  advice: "Please don't diagnose yourself from a quiz, in either direction. If your result is high, or problems like the ones in this app make daily life hard, talk to your family doctor or an ADHD professional.",
  link: "https://www.hcp.med.harvard.edu/ncs/asrs.php",
  sample: true,
};
