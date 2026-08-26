import { NextRequest, NextResponse } from "next/server";
import { generateJson, imagePart, createUserContent } from "@/lib/gemini";
import { questionsSchema } from "@/lib/schemas";
import type { ExtractedQuestion, PageImage } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM_INSTRUCTION = `You are an exam question-paper parser. You will be given images of every page of a printed question paper, in page order.

Extract every question in the exact order they appear on the page, including every labelled sub-part (e.g. 11(a), 11(b)) as a SEPARATE entry in the output list. Preserve the original printed numbering/labels exactly as printed — never renumber, never invent numbering that isn't printed.

For each entry capture:
- number: the main printed question number, e.g. "11".
- subpart: the printed sub-part label, e.g. "a" — or null if this question has no lettered sub-parts.
- text: the full question text (excluding the printed number/label itself). If a question has a shared preamble/scenario followed by lettered sub-questions, repeat the shared preamble inside EACH sub-part's text so every entry is self-contained and gradable on its own.
- maxMarks: the marks printed for that specific entry (e.g. from "[2]" or "(5 marks)") if shown, else null. If a shared max-marks value applies to multiple sub-parts, and it isn't clear how it splits, put the total against the first sub-part and null for the rest.
- page: the 1-indexed page number the question appears on.

Output strictly as JSON matching the provided schema. Do not skip any question.`;

export async function POST(req: NextRequest) {
  try {
    const { pages } = (await req.json()) as { pages: PageImage[] };
    if (!pages?.length) {
      return NextResponse.json({ error: "No pages provided" }, { status: 400 });
    }

    const parts = pages.flatMap((p) => [`Page ${p.page}:`, imagePart(p.dataUrl)]);
    const contents = createUserContent(parts);

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
