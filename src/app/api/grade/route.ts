import { NextRequest, NextResponse } from "next/server";
import { cosineSimilarity, embedTexts, generateJson } from "@/lib/gemini";
import { gradingSchema, rubricsSchema } from "@/lib/schemas";
import {
  DEFAULT_MAX_MARKS,
  type ExtractedQuestion,
  type GradedQuestion,
  type GradingSummary,
  type MappedAnswer,
  type QuestionKey,
  type RubricCriterion,
  type Verdict,
} from "@/lib/types";

export const maxDuration = 90;

const RUBRIC_SYSTEM_INSTRUCTION = `You are an exam rubric designer. For each question given (by itself, without seeing any student's answer, so the rubric stays unbiased), produce:
- modelAnswerSummary: a concise correct-answer summary (2-4 sentences, or bullet-style facts) covering what a full-marks answer must contain.
- criteria: a breakdown of gradeable points, each with a short "point" description and the "marks" it is worth. The marks across all criteria for a question MUST sum exactly to that question's maxMarks. If maxMarks is 1, a single criterion worth 1 mark is fine.`;

const GRADING_SYSTEM_INSTRUCTION = `You are grading a student's handwritten exam answers against a rubric. For each question you're given the question text, its rubric criteria, the maximum marks, the student's transcribed answer, and a semantic-similarity score (0-1, a rough automated signal of topical overlap between the answer and the model answer — use it only as a weak sanity check, never as the primary basis for the grade).

For each question, award marksAwarded as a number between 0 and maxMarks (fractions allowed), choose a verdict:
- "correct": essentially full credit, all/nearly all criteria met.
- "partial": some criteria met, meaningfully incomplete or partially incorrect.
- "incorrect": little to no creditable content, or fundamentally wrong.

Write feedback as 1-3 sentences, specific to what the student actually wrote (what they got right, what's missing or wrong) — never generic. Judge strictly on the merits of the answer's content against the rubric; do not let handwriting quality or length alone influence the score.`;

interface GradeQuestionInput extends ExtractedQuestion {
  key: QuestionKey;
  answer: MappedAnswer | null;
}

export async function POST(req: NextRequest) {
  try {
    const { questions } = (await req.json()) as { questions: GradeQuestionInput[] };
    if (!questions?.length) {
      return NextResponse.json({ error: "No questions provided" }, { status: 400 });
    }

    const withResolvedMarks = questions.map((q) => ({
      ...q,
      maxMarksResolved: q.maxMarks ?? DEFAULT_MAX_MARKS,
    }));

    const rubricResult = await generateJson<{
      rubrics: { key: string; modelAnswerSummary: string; criteria: RubricCriterion[] }[];
    }>({
      contents: JSON.stringify(
        withResolvedMarks.map((q) => ({ key: q.key, text: q.text, maxMarks: q.maxMarksResolved })),
      ),
      schema: rubricsSchema,
      systemInstruction: RUBRIC_SYSTEM_INSTRUCTION,
    });
    const rubricByKey = new Map(rubricResult.rubrics.map((r) => [r.key, r]));

    const answered = withResolvedMarks.filter((q) => q.answer && q.answer.text.trim().length > 0);
    const unanswered = withResolvedMarks.filter((q) => !q.answer || q.answer.text.trim().length === 0);

    const semanticByKey = new Map<string, number>();
    if (answered.length > 0) {
      const texts = answered.flatMap((q) => [
        rubricByKey.get(q.key)?.modelAnswerSummary ?? q.text,
        q.answer!.text,
      ]);
      const embeddings = await embedTexts(texts);
      answered.forEach((q, i) => {
        const modelVec = embeddings[i * 2];
        const answerVec = embeddings[i * 2 + 1];
        semanticByKey.set(q.key, modelVec && answerVec ? cosineSimilarity(modelVec, answerVec) : 0);
      });
    }

    let gradesByKey = new Map<
      string,
      { marksAwarded: number; verdict: Verdict; feedback: string }
    >();
    if (answered.length > 0) {
      const gradingInput = answered.map((q) => ({
        key: q.key,
        text: q.text,
        maxMarks: q.maxMarksResolved,
        rubric: rubricByKey.get(q.key)?.criteria ?? [],
        answerText: q.answer!.text,
        semanticSimilarity: semanticByKey.get(q.key) ?? 0,
      }));
      const gradingResult = await generateJson<{
        grades: { key: string; marksAwarded: number; verdict: Verdict; feedback: string }[];
      }>({
        contents: JSON.stringify(gradingInput),
        schema: gradingSchema,
        systemInstruction: GRADING_SYSTEM_INSTRUCTION,
      });
      gradesByKey = new Map(gradingResult.grades.map((g) => [g.key, g]));
    }

    const graded: GradedQuestion[] = withResolvedMarks.map((q) => {
      const rubric = rubricByKey.get(q.key)?.criteria ?? [];
      if (unanswered.includes(q)) {
        return {
          ...q,
          rubric,
          marksAwarded: 0,
          verdict: "unanswered",
          feedback: "No matching answer was found on the answer sheet for this question.",
          semanticSimilarity: null,
        };
      }
      const grade = gradesByKey.get(q.key);
      const marksAwarded = Math.max(0, Math.min(q.maxMarksResolved, grade?.marksAwarded ?? 0));
      return {
        ...q,
        rubric,
        marksAwarded,
        verdict: grade?.verdict ?? "incorrect",
        feedback: grade?.feedback ?? "Unable to generate feedback for this answer.",
        semanticSimilarity: semanticByKey.get(q.key) ?? null,
      };
    });

    const summary: GradingSummary = graded.reduce<GradingSummary>(
      (acc, q) => {
        acc.totalAwarded += q.marksAwarded ?? 0;
        acc.totalPossible += q.maxMarksResolved;
        if (q.verdict) acc.counts[q.verdict] += 1;
        return acc;
      },
      {
        totalAwarded: 0,
        totalPossible: 0,
        percentage: 0,
        counts: { correct: 0, partial: 0, incorrect: 0, unanswered: 0 },
      },
    );
    summary.percentage = summary.totalPossible > 0 ? (summary.totalAwarded / summary.totalPossible) * 100 : 0;

    return NextResponse.json({ questions: graded, summary });
  } catch (err) {
    console.error("grade error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
