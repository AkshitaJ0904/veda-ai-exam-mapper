"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { UploadScreen } from "@/components/UploadScreen";
import { LoadingScreen } from "@/components/LoadingScreen";
import { MappingScreen } from "@/components/MappingScreen";
import { fileToDataUrl, rasterizeFile } from "@/lib/pdf";
import { questionKey } from "@/lib/mapping";
import { mapWithConcurrency } from "@/lib/utils";
import type {
  AnswerBlock,
  ExtractedQuestion,
  GradedQuestion,
  GradingSummary,
  MappedAnswer,
  PipelineResult,
  QuestionKey,
  UnmatchedAnswerBlock,
} from "@/lib/types";

type Stage = "upload" | "loading" | "mapping";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `Request to ${url} failed`);
  }
  return res.json() as Promise<T>;
}

export default function Home() {
  const [stage, setStage] = useState<Stage>("upload");
  const [loadingMessage, setLoadingMessage] = useState("Extracting…");
  const [result, setResult] = useState<PipelineResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const sidebarCollapsed = stage !== "upload" && !sidebarExpanded;

  const handleStart = async (questionFile: File, answerFile: File) => {
    setError(null);
    setStage("loading");
    try {
      setLoadingMessage("Reading files…");
      const [questionDataUrl, answerPages] = await Promise.all([
        fileToDataUrl(questionFile),
        rasterizeFile(answerFile),
      ]);

      setLoadingMessage("Extracting questions…");
      const { questions } = await postJson<{ questions: ExtractedQuestion[] }>(
        "/api/extract-questions",
        { file: { dataUrl: questionDataUrl } },
      );

      setLoadingMessage("Extracting handwritten answers…");
      const blockLists = await mapWithConcurrency(answerPages, 4, (page) =>
        postJson<{ blocks: AnswerBlock[] }>("/api/extract-answers", { page }).then((r) => r.blocks),
      );
      const blocks = blockLists.flat();

      setLoadingMessage("Mapping answers to questions…");
      const { answers, unmatched } = await postJson<{
        answers: Record<QuestionKey, MappedAnswer>;
        unmatched: UnmatchedAnswerBlock[];
      }>("/api/map-answers", { questions, blocks });

      const withAnswers = questions.map((q) => ({
        ...q,
        key: questionKey(q.number, q.subpart),
        answer: answers[questionKey(q.number, q.subpart)] ?? null,
      }));

      setLoadingMessage("Grading answers…");
      const { questions: graded, summary } = await postJson<{
        questions: GradedQuestion[];
        summary: GradingSummary;
      }>("/api/grade", { questions: withAnswers });

      setResult({ questions: graded, unmatched, summary, answerPages });
      setStage("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStage("upload");
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar collapsed={sidebarCollapsed} onExpand={() => setSidebarExpanded(true)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          onBack={
            stage === "mapping"
              ? () => {
                  setStage("upload");
                  setSidebarExpanded(false);
                }
              : undefined
          }
        />
        {error && (
          <div className="shrink-0 bg-red-50 px-4 py-2 text-center text-sm font-medium text-red-600">
            {error}
          </div>
        )}
        {stage === "upload" && <UploadScreen onStart={handleStart} />}
        {stage === "loading" && <LoadingScreen message={loadingMessage} />}
        {stage === "mapping" && result && <MappingScreen result={result} />}
      </div>
    </div>
  );
}
