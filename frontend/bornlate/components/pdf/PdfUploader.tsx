"use client";

import { useState } from "react";
import { FileUpIcon, Loader2Icon } from "lucide-react";

import { useDocuments } from "@/lib/documents";

import type { PdfMetadata } from "@/lib/pdf/types";

type Props = {
  onComplete?: (pdf: PdfMetadata) => void;
};

export default function PdfUploader({
  onComplete,
}: Props) {
  const { addFiles } = useDocuments();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected =
      event.target.files?.[0];

    if (!selected) return;
    const valid = selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf");
    setFile(valid ? selected : null);
    setStatus(valid ? "" : "Please select a PDF file.");
  }

  async function handleUpload() {
    if (!file || loading) return;
    setLoading(true);
    setStatus("Saving and indexing your PDF...");
    const added = await addFiles([file]);
    if (added[0]) {
      setFile(null);
      setStatus("PDF saved locally.");
      onComplete?.(added[0]);
    } else {
      setStatus("The PDF could not be saved. Check browser storage permissions and try again.");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-2xl border border-[#eadede] bg-white p-5 shadow-[0_10px_35px_rgb(93,44,44,0.06)]">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#f6eaea] text-[#b44b4b]"><FileUpIcon className="size-5" /></span>
        <div><h2 className="font-semibold">Add a PDF</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Your original file and extracted text stay on this device.</p></div>
      </div>

      <input
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="mt-4 block w-full rounded-xl border border-border bg-[#fbfbfa] p-2.5 text-sm"
      />

      {file && (
        <div className="mt-3 rounded-xl bg-[#fbfbfa] p-3">
          <p className="font-medium">
            {file.name}
          </p>

          <p className="mt-1 text-sm text-gray-500">
            {(file.size / 1024 / 1024).toFixed(
              2
            )}{" "}
            MB
          </p>
        </div>
      )}

      <button onClick={() => void handleUpload()} disabled={!file || loading} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#29292b] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#b44b4b] disabled:cursor-not-allowed disabled:opacity-50">
        {loading && <Loader2Icon className="size-4 animate-spin" />}
        {loading ? "Processing..." : "Save PDF"}
      </button>

      {status && (
        <p className="mt-3 text-xs text-muted-foreground" role="status">
          {status}
        </p>
      )}
    </div>
  );
}