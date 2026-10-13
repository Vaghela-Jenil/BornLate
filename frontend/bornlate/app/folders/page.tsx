"use client"

import { useRef, useState, type ChangeEvent } from "react"
import { FileUpIcon, FileTextIcon, FolderOpenIcon, MessageCircleIcon, SparklesIcon, Trash2Icon } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import PdfThumbnail from "@/components/pdf/PdfThumbnail"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useDocuments } from "@/lib/documents"

export default function Page() {
  const { documents, addFiles, removeDocument, isLoading, error, uploadProgress } = useDocuments()
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    void addFiles(Array.from(event.target.files ?? []))
    event.target.value = ""
  }

  return (
      <SidebarInset className="bg-[#fbfbfa]">
        <header className="flex h-14 shrink-0 items-center border-b border-border/60 px-4">
          <SidebarTrigger />
          <div className="ml-3 text-sm font-medium text-foreground/80">Folders</div>
          <Button className="ml-auto gap-2" size="sm" onClick={() => fileInputRef.current?.click()}>
            <FileUpIcon />
            Add PDFs
          </Button>
        </header>
        <main
          className={`min-h-0 flex-1 overflow-auto px-6 py-8 transition-colors md:px-10 ${isDragging ? "bg-[#fdf4f4]" : ""}`}
          onDragOver={(event) => {
            event.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) setIsDragging(false)
          }}
          onDrop={(event) => {
            event.preventDefault()
            setIsDragging(false)
            void addFiles(Array.from(event.dataTransfer.files))
          }}
        >
          <div className="mx-auto max-w-6xl">
            {isDragging && (
              <div className="pointer-events-none fixed inset-4 z-10 flex items-center justify-center rounded-2xl border-2 border-dashed border-[#b44b4b] bg-[#fdf4f4]/90 text-sm font-semibold text-[#b44b4b] md:inset-8">
                Drop PDF files to add them to your library
              </div>
            )}
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-[#b44b4b]">
                  <SparklesIcon className="size-3.5" /> Your library
                </p>
                <h1 className="text-3xl font-semibold tracking-[-0.03em] text-foreground">PDF folders</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Browse every PDF you have connected to BornLate.
                </p>
              </div>
              <span className="hidden text-sm text-muted-foreground sm:block">
                {documents.length} {documents.length === 1 ? "file" : "files"}
              </span>
            </div>

            {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
            {Object.entries(uploadProgress).map(([name, status]) => (
              <div key={name} className="mb-5 rounded-xl border border-[#eadede] bg-white p-4">
                <div className="flex justify-between text-xs font-medium"><span className="truncate">{name}</span><span>{status.stage}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#f2e8e8]"><div className="h-full rounded-full bg-[#b44b4b] transition-all" style={{ width: `${status.progress}%` }} /></div>
              </div>
            ))}

            {isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3].map((item) => <div key={item} className="h-80 animate-pulse rounded-2xl border border-[#eadede] bg-white" />)}
              </div>
            ) : documents.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {documents.map((document, index) => (
                  <article
                    key={`${document.name}-${index}`}
                    className="group overflow-hidden rounded-2xl border border-[#e8dada] bg-white shadow-[0_8px_30px_rgb(93,44,44,0.06)] transition-transform hover:-translate-y-1"
                  >
                    <Link href={`/folders/${encodeURIComponent(document.id)}`} className="block">
                      <div className="relative h-48 overflow-hidden bg-[#f2eeee] sm:h-52">
                        <PdfThumbnail fileName={document.opfsFileName} />
                        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[#b44b4b] shadow-sm">PDF</span>
                      </div>
                    </Link>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          <FileTextIcon className="mt-0.5 size-4 shrink-0 text-red-500" />
                          <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold text-foreground" title={document.name}>{document.name}</h2>
                            <p className="mt-1 text-xs text-muted-foreground">{(document.size / 1024 / 1024).toFixed(1)} MB · {document.pageCount} pages</p>
                          </div>
                        </div>
                        <button type="button" aria-label={`Delete ${document.name}`} onClick={() => { if (window.confirm(`Delete "${document.name}"?`)) void removeDocument(document.id) }} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600">
                          <Trash2Icon className="size-4" />
                        </button>
                      </div>
                      <Link href={`/dashboard?document=${encodeURIComponent(document.id)}`} className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-[#29292b] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#b44b4b]">
                        <MessageCircleIcon className="size-3.5" /> Chat with this PDF
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-[#e0cfcf] bg-white/60 px-6 text-center">
                <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-[#f2e8e8] text-[#b44b4b]">
                  <FolderOpenIcon className="size-7" />
                </div>
                <h2 className="text-lg font-semibold">Your PDF folder is empty</h2>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Upload a PDF from here or head back to Home to start a conversation.
                </p>
                <Button className="mt-5 gap-2" onClick={() => fileInputRef.current?.click()}>
                  <FileUpIcon />
                  Upload a PDF
                </Button>
              </div>
            )}
          </div>
        </main>
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={handleFiles} />
      </SidebarInset>
  )
}