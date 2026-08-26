"use client";

import { useState } from "react";
import { QuestionList } from "./QuestionList";
import { AnswerViewer } from "./AnswerViewer";
import type { PipelineResult } from "@/lib/types";

export function MappingScreen({ result }: { result: PipelineResult }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(result.questions[0]?.key ?? null);
  const [mobileTab, setMobileTab] = useState<"questions" | "answers">("questions");

  const selectedQuestion = result.questions.find((q) => q.key === selectedKey) ?? null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 border-b border-neutral-200 bg-white lg:hidden">
        {(["questions", "answers"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setMobileTab(tab)}
            className={`flex-1 py-3 text-sm font-semibold capitalize ${
              mobileTab === tab
                ? "border-b-2 border-neutral-900 text-neutral-900"
                : "text-neutral-400"
            }`}
          >
            {tab === "questions" ? "Questions" : "Answer Sheet"}
          </button>
        ))}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div
          className={`w-full overflow-hidden lg:block lg:w-[46%] lg:border-r lg:border-neutral-200 ${
            mobileTab === "questions" ? "block" : "hidden"
          }`}
        >
          <QuestionList
            questions={result.questions}
            unmatched={result.unmatched}
            summary={result.summary}
            selectedKey={selectedKey}
            onSelect={(key) => {
              setSelectedKey(key);
              setMobileTab("answers");
            }}
          />
        </div>
        <div
          className={`w-full overflow-hidden lg:block lg:flex-1 ${
            mobileTab === "answers" ? "block" : "hidden"
          }`}
        >
          <AnswerViewer pages={result.answerPages} selectedQuestion={selectedQuestion} />
        </div>
      </div>
    </div>
  );
}
