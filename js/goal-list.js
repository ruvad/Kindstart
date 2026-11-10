// Goals as data: sorted by the priority the person gave them. Pure functions, no screen.

export const PRIORITIES = [
  [1, "High"],
  [2, "Medium"],
  [3, "Low"],
];

export function priorityLabel(priority) {
  return PRIORITIES.find(([value]) => value === priority)?.[1] ?? "";
}

// High first. Goals with the same priority keep the order they were added in
// (sort keeps equal items in place).
export function sortGoals(goals) {
  return [...goals].sort((a, b) => a.priority - b.priority);
}

export function topGoal(goals) {
  return sortGoals(goals)[0] ?? null;
}

// goal id -> priority, so the timeline can put tasks of important goals first.
export function priorityMap(goals) {
  return Object.fromEntries(goals.map((goal) => [goal.id, goal.priority]));
}
