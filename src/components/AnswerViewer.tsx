"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import type { AnswerRegion, GradedQuestion, PageImage } from "@/lib/types";

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
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef(new Map<number, HTMLDivElement>());

  const regionsByPage = useMemo(() => {
    const map = new Map<number, AnswerRegion[]>();
    for (const region of selectedQuestion?.answer?.regions ?? []) {
      const list = map.get(region.page) ?? [];
      list.push(region);
      map.set(region.page, list);
    }
    return map;
  }, [selectedQuestion]);

  const scrollToPage = (pageNum: number) => {
    pageRefs.current.get(pageNum)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Track which page is most visible while the teacher scrolls, to keep the "Page X of Y" label honest.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        let best: { page: number; ratio: number } | null = null;
        for (const entry of entries) {
          const page = Number((entry.target as HTMLElement).dataset.page);
          if (entry.intersectionRatio > (best?.ratio ?? 0)) best = { page, ratio: entry.intersectionRatio };
        }
        if (best) setCurrentPage(best.page);
      },
      { root: container, threshold: [0.25, 0.5, 0.75] },
    );
    pageRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [pages]);

  // Jump to the answer's first page whenever the selected question changes.
  useEffect(() => {
    const firstRegionPage = selectedQuestion?.answer?.regions[0]?.page;
    if (firstRegionPage) scrollToPage(firstRegionPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQuestion?.key]);

  const answerPages = selectedQuestion?.answer?.regions.map((r) => r.page) ?? [];
  const spansMultiplePages = new Set(answerPages).size > 1;

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
              onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
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
              onClick={() => scrollToPage(Math.min(pages.length, currentPage + 1))}
              className="rounded p-1 hover:bg-neutral-800 disabled:opacity-30"
              disabled={currentPage >= pages.length}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {spansMultiplePages && (
        <div className="shrink-0 bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-300">
          This answer spans pages {[...new Set(answerPages)].join(", ")}
        </div>
      )}

      <div ref={containerRef} className="flex-1 space-y-6 overflow-auto p-6">
        {pages.map((page) => (
          <div key={page.page} className="mx-auto" style={{ width: `${zoom}%`, maxWidth: "none" }}>
            <p className="mb-1.5 text-xs font-medium text-neutral-500">Page {page.page}</p>
            <div
              ref={(el) => {
                if (el) pageRefs.current.set(page.page, el);
                else pageRefs.current.delete(page.page);
              }}
              data-page={page.page}
              className="relative bg-white shadow-xl"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- data URL, variable size, already client-rasterized */}
              <img
                src={page.dataUrl}
                alt={`Answer sheet page ${page.page}`}
                className="block w-full"
                draggable={false}
              />
              {(regionsByPage.get(page.page) ?? []).map((region, i) => (
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
        ))}
      </div>
    </div>
  );
}
