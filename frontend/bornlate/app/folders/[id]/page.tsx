"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeftIcon, FileTextIcon, SearchIcon } from "lucide-react"
import { useParams } from "next/navigation"

import PdfSearch from "@/components/pdf/PdfSearch"
import PdfViewer, { type PdfViewerHandle } from "@/components/pdf/PdfViewer"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import type { PdfMetadata } from "@/lib/pdf/types"
import { useDocuments } from "@/lib/documents"

export default function FolderPdfPage() {
  const { id } = useParams<{ id: string }>()
  const [pdf, setPdf] = useState<PdfMetadata | null>(null)
  const [error, setError] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const viewerRef = useRef<PdfViewerHandle>(null)
  const { documents, isLoading } = useDocuments()

  useEffect(() => {
    if (!id) return
    const metadata = documents.find((document) => document.id === id)
    if (metadata) setPdf(metadata)
    else if (!isLoading) setError("This PDF is not available in the RAG library.")
  }, [documents, id, isLoading])

  return (
    <SidebarInset className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f5f4]">
      <header className="sticky top-0 z-50 flex h-14 shrink-0 items-center gap-3 border-b border-border/70 bg-background/95 px-3 backdrop-blur sm:px-4">
        <SidebarTrigger />
        <Link href="/folders" className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeftIcon className="size-4" /> Back to folders</Link>
        <div className="h-5 w-px bg-border" />
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-foreground"><FileTextIcon className="size-4 shrink-0 text-[#b44b4b]" /><span className="truncate">{pdf?.name ?? "PDF viewer"}</span></div>
        {pdf && <button type="button" onClick={() => setSearchOpen(true)} aria-label="Search PDF" title="Search PDF" className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-medium text-background shadow-sm transition-colors hover:bg-foreground/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"><SearchIcon className="size-3.5" /><span className="hidden sm:inline">Search PDF</span><span className="sm:hidden">Search</span></button>}
      </header>
      {pdf ? (
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#f7f5f4] p-3 sm:p-5 lg:p-8">
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
            <section className="flex min-h-0 flex-1 flex-col"><div className="mb-3 flex shrink-0 items-center justify-between gap-4 px-1 text-xs text-muted-foreground"><span>{pdf.pageCount} pages</span><span className="text-right">{(pdf.size / 1024 / 1024).toFixed(2)} MB <span className="hidden sm:inline">· Stored in RAG</span></span></div><PdfViewer ref={viewerRef} fileName={pdf.opfsFileName} pageCount={pdf.pageCount} /></section>
          </div>
          <PdfSearch pages={pdf.pages} open={searchOpen} onClose={() => setSearchOpen(false)} onSelectPage={(pageNumber) => viewerRef.current?.goToPage(pageNumber)} />
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 items-center justify-center bg-[#f7f5f4] px-6 text-center"><div className="max-w-sm"><FileTextIcon className="mx-auto size-10 text-[#b44b4b]" /><h1 className="mt-4 text-lg font-semibold">Unable to open PDF</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">{error || (isLoading ? "Loading PDF metadata..." : "This PDF is not available in the RAG library.")}</p><Link href="/folders" className="mt-5 inline-flex rounded-lg bg-[#29292b] px-4 py-2 text-sm font-medium text-white">Back to folders</Link></div></main>
      )}
    </SidebarInset>
  )
}
