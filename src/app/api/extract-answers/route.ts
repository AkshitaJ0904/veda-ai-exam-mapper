import { NextRequest, NextResponse } from "next/server";
import { generateJson, imagePart, createUserContent } from "@/lib/gemini";
import { answerBlocksSchema } from "@/lib/schemas";
import type { AnswerBlock, BBox, PageImage } from "@/lib/types";

export const maxDuration = 60;

const SYSTEM_INSTRUCTION = `You are transcribing ONE page of a student's handwritten exam answer sheet.

Identify every distinct handwritten answer block on this page. A block is a contiguous piece of writing that answers one question — e.g. everything written under a "Q2" label, or a diagram with its caption/labels.

For each block return:
- questionLabelSeen: the exact question number/label the student wrote near this block (e.g. "Q2", "4(b)", "Ans 3", "11 a"), copied verbatim — or null if no label is visible near this block at all.
- transcribedText: a faithful plain-text transcription of everything handwritten in the block, including any text/labels inside diagrams. If part of the text is crossed out, still transcribe it and wrap it in [struck: ...].
- boundingBox: [ymin, xmin, ymax, xmax] normalized to a 0-1000 scale over the FULL page image, tightly bounding the entire block (including any diagram/drawing that is part of it).

If the page has no handwriting at all, return an empty blocks array. Never skip a block because its content seems irrelevant or off-topic — every distinct block of handwriting must be reported so nothing is silently dropped.`;

export async function POST(req: NextRequest) {
  try {
    const { page } = (await req.json()) as { page: PageImage };
    if (!page) {
      return NextResponse.json({ error: "No page provided" }, { status: 400 });
    }

    const contents = createUserContent([
      `This is page ${page.page} of the student's answer sheet.`,
      imagePart(page.dataUrl),
    ]);

    const result = await generateJson<{
      blocks: { questionLabelSeen: string | null; transcribedText: string; boundingBox: BBox }[];
    }>({
      contents,
      schema: answerBlocksSchema,
      systemInstruction: SYSTEM_INSTRUCTION,
    });

    const blocks: AnswerBlock[] = result.blocks.map((b, i) => ({
      id: `p${page.page}-b${i}`,
      page: page.page,
      questionLabelSeen: b.questionLabelSeen,
      transcribedText: b.transcribedText,
      bbox: b.boundingBox,
    }));

    return NextResponse.json({ blocks });
  } catch (err) {
    console.error("extract-answers error", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 },
    );
  }
}
