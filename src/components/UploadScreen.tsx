"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowRight, FileText, GraduationCap, Upload, X } from "lucide-react";
import { formatBytes } from "@/lib/utils";
import { getPageCount } from "@/lib/pdf";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPT = "application/pdf,image/png,image/jpeg,image/webp";

interface SlotState {
  file: File;
  pageCount: number | null;
}

function UploadSlot({
  label,
  accentLabel,
  slot,
  onSelect,
  onRemove,
  error,
}: {
  label: string;
  accentLabel: string;
  slot: SlotState | null;
  onSelect: (file: File) => void;
  onRemove: () => void;
  error: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (!file) return;
      onSelect(file);
    },
    [onSelect],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`relative flex min-h-[180px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white p-6 text-center transition-colors ${
        dragOver ? "border-orange-400 bg-orange-50/40" : "border-neutral-300"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        suppressHydrationWarning
      />

      {!slot ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center gap-3"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
            <Upload className="h-5 w-5 text-neutral-600" />
          </span>
          <span className="text-[15px] font-semibold text-neutral-900">
            {label} <span className="text-orange-500">{accentLabel}</span>
          </span>
          <span className="text-xs text-neutral-400">Max 10MB</span>
        </button>
      ) : (
        <div className="flex w-full items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <FileText className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-sm font-semibold text-neutral-900">{slot.file.name}</p>
            <p className="text-xs text-neutral-500">
              {formatBytes(slot.file.size)}
              {slot.pageCount ? ` • ${slot.pageCount} Page${slot.pageCount > 1 ? "s" : ""}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-white hover:bg-neutral-700"
            aria-label="Remove file"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
    </div>
  );
}

export function UploadScreen({
  onStart,
}: {
  onStart: (questionFile: File, answerFile: File) => void;
}) {
  const [questionSlot, setQuestionSlot] = useState<SlotState | null>(null);
  const [answerSlot, setAnswerSlot] = useState<SlotState | null>(null);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const handleSelect = useCallback(
    async (file: File, which: "question" | "answer") => {
      const setError = which === "question" ? setQuestionError : setAnswerError;
      const setSlot = which === "question" ? setQuestionSlot : setAnswerSlot;

      if (file.size > MAX_SIZE_BYTES) {
        setError("File exceeds the 10MB limit.");
        return;
      }
      setError(null);
      setSlot({ file, pageCount: null });
      try {
        const pageCount = await getPageCount(file);
        setSlot({ file, pageCount });
      } catch {
        setSlot({ file, pageCount: null });
      }
    },
    [],
  );

  const canStart = !!questionSlot && !!answerSlot;

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-10 sm:py-16">
      <h1 className="text-center text-2xl font-bold text-neutral-900 sm:text-[34px]">
        Upload{" "}
        <span className="rounded-lg bg-orange-100 px-2 py-1 text-orange-600 underline decoration-orange-400 underline-offset-4">
          Question Paper &amp; Answer Sheets
        </span>
      </h1>
      <p className="mt-3 text-sm text-neutral-500 sm:text-base">Upload both files to get started</p>

      <div className="relative my-8 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-b from-orange-100 to-orange-50">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          <GraduationCap className="h-8 w-8 text-orange-500" />
        </div>
      </div>

      <div className="flex w-full max-w-3xl flex-col gap-4 sm:flex-row">
        <UploadSlot
          label="Upload"
          accentLabel="Question Paper"
          slot={questionSlot}
          error={questionError}
          onSelect={(f) => handleSelect(f, "question")}
          onRemove={() => setQuestionSlot(null)}
        />
        <UploadSlot
          label="Upload"
          accentLabel="Answer Sheet"
          slot={answerSlot}
          error={answerError}
          onSelect={(f) => handleSelect(f, "answer")}
          onRemove={() => setAnswerSlot(null)}
        />
      </div>

      <button
        type="button"
        disabled={!canStart}
        onClick={() => canStart && onStart(questionSlot!.file, answerSlot!.file)}
        className={`mt-8 flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-colors ${
          canStart
            ? "bg-neutral-900 text-white hover:bg-neutral-800"
            : "cursor-not-allowed bg-neutral-200 text-neutral-400"
        }`}
      >
        Start Mapping
        <ArrowRight className="h-4 w-4" />
      </button>
      <p className="mt-3 max-w-sm text-center text-xs text-neutral-400">
        Once both files are uploaded, you&apos;ll be able to map answers with questions
      </p>
    </div>
  );
}
