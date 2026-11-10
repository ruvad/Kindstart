// Scoring for the About you questions on the Test page.
// answers: { questionId: score 0-4 }. Returns the person's top problems: those scoring
// at least `threshold` ("Sometimes" = 2), highest score first, at most `max`.

export function topProblems(answers, questions, max = 3, threshold = 2) {
  const ranked = questions
    .map((question, index) => ({ problem: question.problem, score: answers[question.id] ?? -1, index }))
    .filter((item) => item.score >= threshold)
    .sort((a, b) => b.score - a.score || a.index - b.index); // ties keep the question order
  const unique = [...new Set(ranked.map((item) => item.problem))];
  return unique.slice(0, max);
}
