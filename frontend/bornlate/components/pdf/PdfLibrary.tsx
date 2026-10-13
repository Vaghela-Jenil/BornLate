"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  getAllPdfMetadata,
  deletePdfMetadata,
  searchPdfText,
} from "@/lib/pdf/indexeddb";

import {
  deletePdfFromOPFS,
} from "@/lib/pdf/opfs";

import type { PdfMetadata } from "@/lib/pdf/types";

type Props = {
  refreshKey?: number;
};

export default function PdfLibrary({
  refreshKey,
}: Props) {
  const [pdfs, setPdfs] =
    useState<PdfMetadata[]>([]);

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  async function loadPdfs() {
    setLoading(true);

    try {
      const data =
        search.trim()
          ? await searchPdfText(search)
          : await getAllPdfMetadata();

      setPdfs(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPdfs();
  }, [refreshKey]);

  useEffect(() => {
    const timer =
      window.setTimeout(
        loadPdfs,
        250
      );

    return () =>
      window.clearTimeout(timer);
  }, [search]);

  async function handleDelete(
    pdf: PdfMetadata
  ) {
    const confirmed =
      window.confirm(
        `Delete "${pdf.name}"?`
      );

    if (!confirmed) return;

    try {
      await deletePdfFromOPFS(
        pdf.opfsFileName
      );

      await deletePdfMetadata(
        pdf.id
      );

      setPdfs((current) =>
        current.filter(
          (item) =>
            item.id !== pdf.id
        )
      );
    } catch (error) {
      console.error(error);

      alert(
        "Failed to delete PDF."
      );
    }
  }

  return (
    <div className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold">
          My PDFs
        </h2>

        <span className="text-sm text-gray-500">
          {pdfs.length} PDF
          {pdfs.length !== 1
            ? "s"
            : ""}
        </span>
      </div>

      <input
        value={search}
        onChange={(e) =>
          setSearch(e.target.value)
        }
        placeholder="Search PDF name or extracted text..."
        className="mb-5 w-full rounded-lg border bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black"
      />

      {loading ? (
        <p className="text-gray-500">
          Loading...
        </p>
      ) : pdfs.length === 0 ? (
        <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
          No PDFs found.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {pdfs.map((pdf) => (
            <div
              key={pdf.id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold">
                    {pdf.name}
                  </h3>

                  <p className="mt-1 text-sm text-gray-500">
                    {pdf.pageCount} pages
                  </p>

                  <p className="text-sm text-gray-500">
                    {(
                      pdf.size /
                      1024 /
                      1024
                    ).toFixed(2)}{" "}
                    MB
                  </p>
                </div>

                <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                  Local
                </span>
              </div>

              <div className="mt-5 flex gap-2">
                <Link
                  href={`/pdf/${pdf.id}`}
                  className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Open
                </Link>

                <button
                  onClick={() =>
                    handleDelete(pdf)
                  }
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}