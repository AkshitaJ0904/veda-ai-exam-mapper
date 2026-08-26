"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import type { GradedQuestion, PageImage } from "@/lib/types";

function bboxStyle(bbox: [number, number, number, number]) {
  const [ymin, xmin, ymax, xmax] = bbox;
  return {
    top: `${ymin / 10}%`,
    left: `${xmin / 10}%`,
    width: `${(xmax - xmin) / 10}%`,
    height: `${(ymax - ymin) / 10}%`,
  };
}

export function AnswerViewer({
  pages,
  selectedQuestion,
}: {
  pages: PageImage[];
  selectedQuestion: GradedQuestion | null;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [trackedKey, setTrackedKey] = useState(selectedQuestion?.key);

  if (selectedQuestion?.key !== trackedKey) {
    setTrackedKey(selectedQuestion?.key);
    const firstRegionPage = selectedQuestion?.answer?.regions[0]?.page;
    if (firstRegionPage) setCurrentPage(firstRegionPage);
  }

  const page = pages.find((p) => p.page === currentPage) ?? pages[0];
  const regionsOnPage =
    selectedQuestion?.answer?.regions.filter((r) => r.page === currentPage) ?? [];
  const otherPagesForAnswer =
    selectedQuestion?.answer?.regions.filter((r) => r.page !== currentPage).map((r) => r.page) ?? [];

  if (!page) return null;

  return (
    <div className="flex h-full flex-col bg-neutral-900">
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-800 px-4 py-2.5 text-sm text-white">
        <span className="font-medium">Answer Sheet</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(50, z - 10))}
              className="rounded p-1 hover:bg-neutral-800"
              aria-label="Zoom out"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-10 text-center text-xs">{zoom}%</span>
            <button
              onClick={() => setZoom((z) => Math.min(200, z + 10))}
              className="rounded p-1 hover:bg-neutral-800"
              aria-label="Zoom in"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rounded p-1 hover:bg-neutral-800 disabled:opacity-30"
              disabled={currentPage <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs">
              Page {currentPage} of {pages.length}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(pages.length, p + 1))}
              className="rounded p-1 hover:bg-neutral-800 disabled:opacity-30"
              disabled={currentPage >= pages.length}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {otherPagesForAnswer.length > 0 && (
        <div className="shrink-0 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-300">
          This answer continues on page{otherPagesForAnswer.length > 1 ? "s" : ""}{" "}
          {otherPagesForAnswer.join(", ")}
        </div>
      )}

      <div className="flex-1 overflow-auto p-6">
        <div
          className="relative mx-auto bg-white shadow-xl"
          style={{ width: `${zoom}%`, maxWidth: "none" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL, variable size, already client-rasterized */}
          <img src={page.dataUrl} alt={`Answer sheet page ${page.page}`} className="block w-full" draggable={false} />
          {regionsOnPage.map((region, i) => (
            <div
              key={i}
              className="absolute rounded-md border-2 border-emerald-400 bg-emerald-400/10"
              style={bboxStyle(region.bbox)}
            >
              <span className="absolute -top-6 left-0 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                Q{selectedQuestion?.number}
                {selectedQuestion?.subpart ?? ""}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
