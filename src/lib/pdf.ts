"use client";

import type { PageImage } from "./types";

const MAX_DIMENSION = 1900;
const JPEG_QUALITY = 0.82;

async function loadPdfjs() {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();
  return pdfjsLib;
}

function canvasToDataUrl(canvas: HTMLCanvasElement): string {
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function rasterizePdf(file: File): Promise<PageImage[]> {
  const pdfjsLib = await loadPdfjs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pages: PageImage[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(2, MAX_DIMENSION / Math.max(baseViewport.width, baseViewport.height));
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not get canvas context");

    await page.render({ canvas, viewport }).promise;

    pages.push({
      page: pageNum,
      dataUrl: canvasToDataUrl(canvas),
      width: canvas.width,
      height: canvas.height,
    });
  }

  return pages;
}

export async function rasterizeImageFile(file: File): Promise<PageImage[]> {
  const dataUrl = await fileToDataUrl(file);

  const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });

  // Re-encode large images down to a sane size/quality via canvas, matching PDF pages.
  const scale = Math.min(1, MAX_DIMENSION / Math.max(dims.width, dims.height));
  if (scale >= 1) {
    return [{ page: 1, dataUrl, width: dims.width, height: dims.height }];
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(dims.width * scale);
  canvas.height = Math.round(dims.height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not get canvas context");

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = dataUrl;
  });
  context.drawImage(img, 0, 0, canvas.width, canvas.height);

  return [{ page: 1, dataUrl: canvasToDataUrl(canvas), width: canvas.width, height: canvas.height }];
}

export async function getPageCount(file: File): Promise<number> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    const pdfjsLib = await loadPdfjs();
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    return pdf.numPages;
  }
  return 1;
}

export async function rasterizeFile(file: File): Promise<PageImage[]> {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    return rasterizePdf(file);
  }
  return rasterizeImageFile(file);
}
