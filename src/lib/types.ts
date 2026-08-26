export interface PageImage {
  page: number; // 1-indexed
  dataUrl: string; // base64 data URL, sent to the API and used for display
  width: number;
  height: number;
}

export interface ExtractedQuestion {
  number: string; // verbatim as printed, e.g. "11"
  subpart: string | null; // e.g. "a", "b" — null if the question has no sub-parts
  text: string;
  maxMarks: number | null; // null if not printed on the paper
  page: number;
}

// Normalized bbox on a 0-1000 scale, Gemini's convention: [ymin, xmin, ymax, xmax]
export type BBox = [number, number, number, number];

export interface AnswerBlock {
  id: string;
  page: number;
  questionLabelSeen: string | null; // raw label the student wrote, e.g. "Q2", "4b" — null if none visible
  transcribedText: string;
  bbox: BBox;
}

export interface AnswerRegion {
  page: number;
  bbox: BBox;
}

export type QuestionKey = string; // `${number}${subpart ?? ""}`

export interface MappedAnswer {
  text: string;
  regions: AnswerRegion[];
  matchConfidence: "explicit" | "high" | "medium" | "low";
}

export type Verdict = "correct" | "partial" | "incorrect" | "unanswered";

export interface RubricCriterion {
  point: string;
  marks: number;
}

export interface GradedQuestion extends ExtractedQuestion {
  key: QuestionKey;
  answer: MappedAnswer | null;
  maxMarksResolved: number; // maxMarks with default fallback applied
  rubric: RubricCriterion[];
  marksAwarded: number | null; // null until graded
  verdict: Verdict | null;
  feedback: string | null;
  semanticSimilarity: number | null;
}

export interface UnmatchedAnswerBlock {
  page: number;
  text: string;
  bbox: BBox;
}

export interface GradingSummary {
  totalAwarded: number;
  totalPossible: number;
  percentage: number;
  counts: Record<Verdict, number>;
}

export interface PipelineResult {
  questions: GradedQuestion[];
  unmatched: UnmatchedAnswerBlock[];
  summary: GradingSummary;
  answerPages: PageImage[];
}

export const DEFAULT_MAX_MARKS = 2;
