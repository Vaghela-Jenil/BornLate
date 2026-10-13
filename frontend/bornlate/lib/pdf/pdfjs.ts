import * as pdfjsLib from "pdfjs-dist";

import type { PdfPage } from "./types";

let initialized = false;

function initializePdfJs() {
  if (initialized) return;

  if (typeof window === "undefined") {
    throw new Error(
      "PDF.js can only be initialized in the browser."
    );
  }

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdfjs/pdf.worker.min.mjs";

  initialized = true;
}

export async function loadPdf(
  data: ArrayBuffer
) {
  initializePdfJs();

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(data),
  });

  return await loadingTask.promise;
}

export async function getPdfPageCount(
  data: ArrayBuffer
): Promise<number> {
  const pdf = await loadPdf(data);

  return pdf.numPages;
}

export async function extractPdfText(
  data: ArrayBuffer,
  onProgress?: (page: number, total: number) => void
): Promise<{
  pageCount: number;
  pages: PdfPage[];
}> {
  const pdf = await loadPdf(data);

  const pageCount = pdf.numPages;

  const pages: PdfPage[] = [];

  for (
    let pageNumber = 1;
    pageNumber <= pageCount;
    pageNumber++
  ) {
    onProgress?.(pageNumber, pageCount);

    const page = await pdf.getPage(pageNumber);

    const textContent =
      await page.getTextContent();

    const text = textContent.items
      .map((item) => {
        if ("str" in item) {
          return item.str;
        }

        return "";
      })
      .join(" ");

    pages.push({
      pageNumber,
      text: text.trim(),
    });
  }

  return {
    pageCount,
    pages,
  };
}