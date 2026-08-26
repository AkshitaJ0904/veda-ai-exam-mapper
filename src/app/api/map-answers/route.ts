import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/gemini";
import { mapAssignmentsSchema } from "@/lib/schemas";
import {
  buildQuestionKeySet,
  isBareHeadingBlock,
  isBareNumber,
  normalizeLabel,
  numericPrefix,
  questionKey,
} from "@/lib/mapping";
import { mapWithConcurrency } from "@/lib/utils";
import type {
  AnswerBlock,
  ExtractedQuestion,
  MappedAnswer,
  QuestionKey,
  UnmatchedAnswerBlock,
} from "@/lib/types";

export const maxDuration = 120;

const BLOCK_BATCH_SIZE = 20;

function chunk<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

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
    const unmatched: UnmatchedAnswerBlock[] = [];

    // Students often write a bare "Ans 1" heading once, then just "(i)", "(ii)", ...
    // for each sub-part without repeating "1" — carry the last-seen main number
    // forward (in block reading order) so a bare sub-part label like "(ii)" can
    // still resolve to "1ii" rather than falling through to the LLM residual pass.
    let lastMainNumber: string | null = null;
    // A continuation of a multi-page answer often carries NO label at all on the
    // next page. If an unlabelled block is the very first block on a page, and
    // the last successful match was on the immediately preceding page, treat it
    // as continuing that same answer — but only in that narrow position, so an
    // unrelated unlabelled aside elsewhere on the page is left alone.
    let lastMatchedKey: string | null = null;
    let lastMatchedPage: number | null = null;
    let prevBlockPage: number | null = null;

    for (const block of blocks ?? []) {
      const normalized = normalizeLabel(block.questionLabelSeen);
      const isFirstOnItsPage = block.page !== prevBlockPage;
      let matchedKey: string | null = null;
      let confidence: MappedAnswer["matchConfidence"] = "explicit";

      if (normalized) {
        if (keySet.has(normalized)) {
          matchedKey = normalized;
        } else if (lastMainNumber && keySet.has(lastMainNumber + normalized)) {
          matchedKey = lastMainNumber + normalized;
        }

        if (isBareNumber(normalized)) {
          lastMainNumber = normalized;
        } else if (matchedKey) {
          lastMainNumber = numericPrefix(matchedKey) ?? lastMainNumber;
        }
      } else if (isFirstOnItsPage && lastMatchedKey && lastMatchedPage === block.page - 1) {
        matchedKey = lastMatchedKey;
        confidence = "high";
      }

      if (matchedKey) {
        const list = matchedByKey.get(matchedKey) ?? [];
        list.push({ block, confidence });
        matchedByKey.set(matchedKey, list);
        lastMatchedKey = matchedKey;
        lastMatchedPage = block.page;
      } else if (isBareHeadingBlock(block.questionLabelSeen, block.transcribedText)) {
        // e.g. a block that's just "Ans 1." with no actual answer content —
        // never send this to the LLM matcher, which may otherwise guess an
        // assignment for it rather than leaving it correctly unmatched.
        unmatched.push({ page: block.page, text: block.transcribedText, bbox: block.bbox });
      } else {
        unresolved.push(block);
      }
      prevBlockPage = block.page;
    }

    if (unresolved.length > 0) {
      const stillNeeded = questions.filter((q) => !matchedByKey.has(questionKey(q.number, q.subpart)));
      const candidateQuestions = stillNeeded.length > 0 ? stillNeeded : questions;

      const candidatesForPrompt = candidateQuestions.map((q) => ({
        key: questionKey(q.number, q.subpart),
        text: q.text.slice(0, 1000),
      }));

      const batches = await mapWithConcurrency(chunk(unresolved, BLOCK_BATCH_SIZE), 3, (blockBatch) =>
        generateJson<{
          assignments: { blockId: string; questionKey: string | null; confidence: "high" | "medium" | "low" }[];
        }>({
          contents: JSON.stringify({
            blocks: blockBatch.map((b) => ({ id: b.id, text: b.transcribedText.slice(0, 1500) })),
            candidateQuestions: candidatesForPrompt,
          }),
          schema: mapAssignmentsSchema,
          systemInstruction: SYSTEM_INSTRUCTION,
        }),
      );

      const assignmentByBlockId = new Map(batches.flatMap((r) => r.assignments).map((a) => [a.blockId, a]));

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
