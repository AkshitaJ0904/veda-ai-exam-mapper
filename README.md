# VedaAI — Exam Answer Extraction & Mapping

Upload a question paper and a student's handwritten answer sheet. The app extracts every
question (including labelled sub-parts), transcribes and localizes the handwritten answers,
maps each answer to its question, highlights the exact answer region on the sheet, and grades
each answer against an auto-generated rubric with AI feedback.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind + shadcn/ui
- `pdfjs-dist` — client-side PDF → page-image rasterization (also used for on-screen display)
- `@google/genai` (Gemini) — OCR/extraction, answer↔question mapping, rubric generation,
  contextual grading, and embeddings for a semantic-similarity signal
- No database, no auth — all pipeline state lives in the browser after each API call returns

## Approach

1. **Upload & rasterize** — PDFs/images are rendered to page images entirely in the browser
   (`src/lib/pdf.ts`). The same images are used for display and for the API calls.
2. **Extract questions** (`/api/extract-questions`) — one multimodal Gemini call over all
   question-paper pages, forced into a strict JSON schema. Sub-parts (`11(a)`, `11(b)`) come
   back as separate entries; original numbering is preserved verbatim.
3. **Extract answers** (`/api/extract-answers`) — one call per answer-sheet page. Each block of
   handwriting comes back with a transcription, the label the student wrote near it (if any),
   and a normalized bounding box — kept page-local so coordinates never get mixed across pages.
4. **Map answers to questions** (`/api/map-answers`) — deterministic label normalization first
   (`"Q2"`, `"Ans 4(b)"` → matched against known question keys); anything left over (no label,
   or a label that doesn't match) goes through one Gemini call that proposes content-based
   matches with a confidence level, or leaves it unmatched. Multi-page answers merge into one
   logical answer with one region per page.
5. **Grade** (`/api/grade`) — for each question: a rubric is generated from the question text
   alone (never the student's answer, to keep it unbiased); a semantic-similarity score
   (embeddings) is computed as a secondary signal; a contextual Gemini call does the actual
   grading against the rubric, producing marks + feedback. Unanswered questions are scored
   deterministically (0 marks, no LLM call needed).

Every extraction/mapping/grading step returns strict JSON via Gemini's `responseSchema`, so the
UI never has to parse free text.

## AI model / API used

Google **Gemini** (`@google/genai`, server-side only) — `gemini-3.6-flash` for all
extraction/mapping/grading calls, `gemini-embedding-001` for the semantic-similarity signal.
Both are on Gemini's free tier. No other AI provider or Cloud Vision dependency is used (see
Assumptions).

## Assumptions & limitations

- OCR, extraction, mapping, and grading are entirely Gemini-based. Google Cloud Vision was
  considered but the provided key format doesn't support Vision's API-key auth (Vision requires
  a service account/OAuth2), so bounding boxes and transcription both come from Gemini's own
  multimodal reads instead.
- "Sentiment analysis" (from the original brief) is implemented as a confidence/completeness
  signal folded into the grading call rather than a standalone model — true sentiment
  (positive/negative emotion) doesn't meaningfully apply to grading factual/scientific answers.
  The real secondary scoring signal is embedding-based semantic similarity.
- Default max marks per question is **2** when the paper doesn't print a mark value.
- Bounding boxes are Gemini's own read of where it saw the text — reliable at block/paragraph
  granularity (verified against real renders), not guaranteed pixel-perfect at the word level.
- Single answer sheet per run — batch grading of a whole class is out of scope.
- In-memory only: nothing persists server-side between requests; state lives in the browser for
  the duration of the session.

## Running locally

```bash
npm install
cp .env.example .env.local   # then fill in GEMINI_API_KEY
npm run dev
```

Open http://localhost:3000, upload a question paper and an answer sheet (PDF or image, ≤10MB
each), and click **Start Mapping**.

## Deploying

```bash
vercel link
vercel env add GEMINI_API_KEY production preview development
vercel --prod
```
