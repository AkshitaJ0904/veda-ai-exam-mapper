import { NextRequest, NextResponse } from "next/server";
import { generateJson, filePart, createUserContent } from "@/lib/gemini";
import { questionsSchema } from "@/lib/schemas";
import type { ExtractedQuestion } from "@/lib/types";

export const maxDuration = 120;

const SYSTEM_INSTRUCTION = `You are an exam question-paper parser. You will be given the full question paper as a single document (it may span many pages), in page order.

Extract every question in the exact order they appear on the page, including every labelled sub-part (e.g. 11(a), 11(b)) as a SEPARATE entry in the output list. Preserve the original printed numbering/labels exactly as printed — never renumber, never invent numbering that isn't printed.

For each entry capture:
- number: the main printed question number, e.g. "11".
- subpart: the printed sub-part label, e.g. "a" — or null if this question has no lettered sub-parts.
- text: the specific instruction/question text for that entry (excluding the printed number/label itself), including any short quoted excerpt or line the entry itself refers to (e.g. a quoted sentence, an assertion/reason pair, a data table). If a SHORT shared scenario (one or two sentences, e.g. "A diagram shows two potted plants...") precedes several lettered sub-questions, repeat that short scenario inside each sub-part's text so each entry is self-contained. Do NOT do this for a long shared reading passage/comprehension text (multiple paragraphs) — in that case leave the passage out of every sub-question's text entirely; each sub-question's own text plus its paragraph reference (e.g. "Paragraph (1)") is enough, and repeating a multi-paragraph passage into every sub-question would make the extracted list unreadable.
- maxMarks: the marks printed for that specific entry (e.g. from "[2]" or "(5 marks)") if shown, else null. If a shared max-marks value applies to multiple sub-parts, and it isn't clear how it splits, put the total against the first sub-part and null for the rest.
- page: the 1-indexed page number the question appears on.

Output strictly as JSON matching the provided schema. Do not skip any question.`;

export async function POST(req: NextRequest) {
  try {
    const { file } = (await req.json()) as { file: { dataUrl: string } };
    if (!file?.dataUrl) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const contents = createUserContent([
      "Extract all questions from this question paper.",
      filePart(file.dataUrl),
    ]);

    const result = await generateJson<{ questions: ExtractedQuestion[] }>({
      contents,
      schema: questionsSchema,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    return NextResponse.json({ questions: result.questions });
  } catch (err) {
    console.error("extract-questions error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
