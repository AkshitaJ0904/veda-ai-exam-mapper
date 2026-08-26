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

export function isBareNumber(normalizedLabel: string): boolean {
  return /^\d+$/.test(normalizedLabel);
}

export function numericPrefix(key: string): string | null {
  const match = /^\d+/.exec(key);
  return match ? match[0] : null;
}

function alnumOnly(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// A block whose entire transcribed text reduces to the same characters as its
// own label (e.g. transcribedText "Ans 1." with questionLabelSeen "1.") carries
// no actual answer content — it's a bare section heading, not something any
// question's answer should be attributed to.
export function isBareHeadingBlock(questionLabelSeen: string | null, transcribedText: string): boolean {
  if (!questionLabelSeen) return false;
  return alnumOnly(transcribedText) === alnumOnly(questionLabelSeen);
}
