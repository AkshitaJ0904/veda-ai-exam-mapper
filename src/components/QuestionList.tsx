"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GradedQuestion, GradingSummary, UnmatchedAnswerBlock } from "@/lib/types";

function scorePillClasses(question: GradedQuestion): string {
  if (question.verdict === "unanswered") return "bg-neutral-100 text-neutral-500";
  const max = question.maxMarksResolved;
  const awarded = question.marksAwarded ?? 0;
  if (awarded >= max) return "bg-emerald-100 text-emerald-700";
  if (awarded <= 0) return "bg-red-100 text-red-600";
  return "bg-amber-100 text-amber-700";
}

function ScorePill({ question }: { question: GradedQuestion }) {
  if (question.verdict === "unanswered") {
    return (
      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", scorePillClasses(question))}>
        Not answered
      </span>
    );
  }
  return (
    <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold", scorePillClasses(question))}>
      {question.marksAwarded}/{question.maxMarksResolved}
    </span>
  );
}

function SummaryStrip({ summary }: { summary: GradingSummary }) {
  return (
    <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <div>
        <p className="text-xs font-medium text-neutral-400">Grading Summary</p>
        <p className="text-lg font-bold text-neutral-900">
          {summary.totalAwarded} / {summary.totalPossible}{" "}
          <span className="text-sm font-normal text-neutral-400">({summary.percentage.toFixed(0)}%)</span>
        </p>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium">
        <span className="text-emerald-600">{summary.counts.correct} correct</span>
        <span className="text-amber-600">{summary.counts.partial} partial</span>
        <span className="text-red-500">{summary.counts.incorrect} incorrect</span>
        <span className="text-neutral-400">{summary.counts.unanswered} unanswered</span>
      </div>
    </div>
  );
}

export function QuestionList({
  questions,
  unmatched,
  summary,
  selectedKey,
  onSelect,
}: {
  questions: GradedQuestion[];
  unmatched: UnmatchedAnswerBlock[];
  summary: GradingSummary;
  selectedKey: string | null;
  onSelect: (key: string) => void;
}) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [showUnmatched, setShowUnmatched] = useState(false);

  const allExpanded = expandedKeys.size >= questions.length && questions.length > 0;

  const toggleOne = (key: string) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-4 pt-4 sm:px-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-500">
            Extracted Questions (from question paper)
          </h2>
          <button
            type="button"
            onClick={() =>
              setExpandedKeys(allExpanded ? new Set() : new Set(questions.map((q) => q.key)))
            }
            className="shrink-0 text-xs font-semibold text-neutral-500 hover:text-neutral-800"
          >
            {allExpanded ? "Collapse All" : "Expand All"}
          </button>
        </div>
        <SummaryStrip summary={summary} />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 pb-4 sm:px-5">
        {questions.map((q) => {
          const isSelected = selectedKey === q.key;
          const isExpanded = expandedKeys.has(q.key);
          return (
            <div
              key={q.key}
              className={cn(
                "rounded-2xl border bg-white transition-colors",
                isSelected ? "border-orange-400 shadow-sm" : "border-neutral-200",
              )}
            >
              <button
                type="button"
                onClick={() => {
                  onSelect(q.key);
                  toggleOne(q.key);
                }}
                className="flex w-full items-start gap-3 px-4 py-3 text-left"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white">
                  {q.number}
                </span>
                {q.subpart && (
                  <span className="mt-1 shrink-0 text-sm font-semibold text-neutral-500">{q.subpart}.</span>
                )}
                <span className="min-w-0 flex-1 text-sm font-medium text-neutral-800">{q.text}</span>
                <ScorePill question={q} />
                {isExpanded ? (
                  <ChevronUp className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
                ) : (
                  <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-neutral-400" />
                )}
              </button>
              {isExpanded && (
                <div className="border-t border-orange-200 px-4 py-3">
                  <p className="mb-1 text-xs font-semibold text-neutral-900">AI Feedback</p>
                  <p className="text-sm text-neutral-600">{q.feedback ?? "No feedback available."}</p>
                  {q.rubric.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs text-neutral-500">
                      {q.rubric.map((r, i) => (
                        <li key={i}>
                          • {r.point} ({r.marks} mark{r.marks === 1 ? "" : "s"})
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {unmatched.length > 0 && (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50">
            <button
              type="button"
              onClick={() => setShowUnmatched((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold text-neutral-600"
            >
              Unmatched content on answer sheet ({unmatched.length})
              {showUnmatched ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {showUnmatched && (
              <ul className="space-y-2 px-4 pb-3 text-xs text-neutral-500">
                {unmatched.map((u, i) => (
                  <li key={i} className="rounded-lg bg-white px-3 py-2">
                    <span className="font-medium text-neutral-700">Page {u.page}:</span> {u.text.slice(0, 140)}
                    {u.text.length > 140 ? "…" : ""}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
