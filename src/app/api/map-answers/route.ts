import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { mapAssignmentsSchema } from "@/lib/schemas";
import { buildQuestionKeySet, normalizeLabel, questionKey } from "@/lib/mapping";
import type {
  AnswerBlock,
  ExtractedQuestion,
  MappedAnswer,
  QuestionKey,
  UnmatchedAnswerBlock,
} from "@/lib/types";

export const maxDuration = 60;

const SYSTEM_INSTRUCTION = `You are matching handwritten answer blocks from a student's answer sheet to the questions they answer.

You will be given a list of answer blocks (each with an id and its transcribed text) that could not be confidently matched by their handwritten label, and a list of candidate questions (each with a key and its text) that still need a match. Some candidate questions may already have other blocks matched to them via explicit labels — you are only resolving the leftover ambiguous ones.

For EVERY block in the input, output exactly one assignment: either the key of the single best-matching candidate question (based on the content of the answer vs. the content of the question), or null if the block's content does not genuinely answer any candidate question (e.g. it's a stray note, a duplicate, or unrelated scribble). Multiple blocks may map to the same question key (e.g. an answer that continues across pages). Include a confidence: "high" if you are quite sure, "medium" if plausible but uncertain, "low" if it's a guess. Prefer null over a "low" guess when the content truly doesn't match any candidate.`;

export async function POST(req: NextRequest) {
  try {
    const { questions, blocks } = (await req.json()) as {
      questions: ExtractedQuestion[];
      blocks: AnswerBlock[];
    };
    if (!questions?.length) {
      return NextResponse.json({ error: "No questions provided" }, { status: 400 });
    }

    const keySet = buildQuestionKeySet(questions);
    const matchedByKey = new Map<QuestionKey, { block: AnswerBlock; confidence: MappedAnswer["matchConfidence"] }[]>();
    const unresolved: AnswerBlock[] = [];

    for (const block of blocks ?? []) {
      const normalized = normalizeLabel(block.questionLabelSeen);
      if (normalized && keySet.has(normalized)) {
        const list = matchedByKey.get(normalized) ?? [];
        list.push({ block, confidence: "explicit" });
        matchedByKey.set(normalized, list);
      } else {
        unresolved.push(block);
      }
    }

    const unmatched: UnmatchedAnswerBlock[] = [];

    if (unresolved.length > 0) {
      const stillNeeded = questions.filter((q) => !matchedByKey.has(questionKey(q.number, q.subpart)));
      const candidateQuestions = stillNeeded.length > 0 ? stillNeeded : questions;

      const llmInput = {
        blocks: unresolved.map((b) => ({ id: b.id, text: b.transcribedText.slice(0, 1500) })),
        candidateQuestions: candidateQuestions.map((q) => ({
          key: questionKey(q.number, q.subpart),
          text: q.text.slice(0, 1000),
        })),
      };

      const result = await generateJson<{
        assignments: { blockId: string; questionKey: string | null; confidence: "high" | "medium" | "low" }[];
      }>({
        contents: JSON.stringify(llmInput),
        schema: mapAssignmentsSchema,
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const assignmentByBlockId = new Map(result.assignments.map((a) => [a.blockId, a]));

      for (const block of unresolved) {
        const assignment = assignmentByBlockId.get(block.id);
        const key = assignment?.questionKey ? assignment.questionKey.toLowerCase() : null;
        if (key && keySet.has(key)) {
          const list = matchedByKey.get(key) ?? [];
          list.push({ block, confidence: assignment!.confidence });
          matchedByKey.set(key, list);
        } else {
          unmatched.push({ page: block.page, text: block.transcribedText, bbox: block.bbox });
        }
      }
    }

    const confidenceRank: Record<MappedAnswer["matchConfidence"], number> = {
      explicit: 3,
      high: 2,
      medium: 1,
      low: 0,
    };

    const answers: Record<QuestionKey, MappedAnswer> = {};
    for (const [key, entries] of matchedByKey.entries()) {
      const sorted = [...entries].sort((a, b) => a.block.page - b.block.page);
      const worstConfidence = sorted.reduce(
        (worst, e) => (confidenceRank[e.confidence] < confidenceRank[worst] ? e.confidence : worst),
        sorted[0].confidence,
      );
      answers[key] = {
        text: sorted.map((e) => e.block.transcribedText).join("\n\n"),
        regions: sorted.map((e) => ({ page: e.block.page, bbox: e.block.bbox })),
        matchConfidence: worstConfidence,
      };
    }

    return NextResponse.json({ answers, unmatched });
  } catch (err) {
    console.error("map-answers error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
