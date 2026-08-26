import type { ExtractedQuestion, QuestionKey } from "./types";

export function questionKey(number: string, subpart: string | null): QuestionKey {
  return `${number}${subpart ?? ""}`.trim().toLowerCase();
}

export function normalizeLabel(label: string | null): string | null {
  if (!label) return null;
  const stripped = label
    .toLowerCase()
    .replace(/\b(question|q|ans|answer|no\.?)\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
  return stripped.length > 0 ? stripped : null;
}

export function buildQuestionKeySet(questions: ExtractedQuestion[]): Set<QuestionKey> {
  return new Set(questions.map((q) => questionKey(q.number, q.subpart)));
}
