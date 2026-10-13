"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react"
import { ChevronsLeftIcon, ChevronLeftIcon, ChevronRightIcon, ChevronsRightIcon, Loader2Icon } from "lucide-react"

import { loadPdf } from "@/lib/pdf/pdfjs"
import { readRemotePdf } from "@/lib/pdf/remote"

export type PdfViewerHandle = { goToPage: (pageNumber: number) => void }

type Props = { fileName: string; pageCount?: number }

const PdfViewer = forwardRef<PdfViewerHandle, Props>(function PdfViewer({ fileName, pageCount = 1 }, ref) {
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  function goToPage(pageNumber: number) {
    const nextPage = Math.min(pageCount, Math.max(1, pageNumber))
    setCurrentPage(nextPage)
    pageRefs.current[nextPage]?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  useImperativeHandle(ref, () => ({ goToPage }), [pageCount])

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        setLoading(true)
        setError("")
        const pdf = await loadPdf(await readRemotePdf(fileName))
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          const page = await pdf.getPage(pageNumber)
          if (cancelled) return
          const wrapper = pageRefs.current[pageNumber]
          const canvas = wrapper?.querySelector("canvas")
          if (!canvas || !wrapper) continue
          const context = canvas.getContext("2d")
          if (!context) throw new Error("Canvas is not supported.")

          const baseViewport = page.getViewport({ scale: 1 })
          const availableWidth = Math.max(wrapper.clientWidth - 32, 320)
          const scale = Math.min(1.2, availableWidth / baseViewport.width)
          const viewport = page.getViewport({ scale })
          canvas.width = viewport.width
          canvas.height = viewport.height
          await page.render({ canvas, canvasContext: context, viewport }).promise
        }
      } catch (reason: unknown) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Failed to render this PDF.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void render()
    return () => { cancelled = true }
  }, [fileName])

  return (
    <div className="relative mx-auto flex h-full min-h-0 w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
      <div className="sticky top-0 z-50 flex shrink-0 items-center justify-between gap-3 border-b border-border/70 bg-background/95 px-3 py-2.5 backdrop-blur sm:px-4">
        <div className="flex items-center gap-0.5 rounded-xl border border-border/70 bg-muted/40 p-0.5">
          <button type="button" aria-label="First page" title="First page" onClick={() => goToPage(1)} disabled={loading || currentPage === 1} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-35"><ChevronsLeftIcon className="size-4" /></button>
          <button type="button" aria-label="Previous page" title="Previous page" onClick={() => goToPage(currentPage - 1)} disabled={loading || currentPage === 1} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-35"><ChevronLeftIcon className="size-4" /></button>
          <span className="min-w-20 px-1 text-center text-xs font-medium tabular-nums text-foreground">{currentPage} <span className="text-muted-foreground">of</span> {pageCount}</span>
          <button type="button" aria-label="Next page" title="Next page" onClick={() => goToPage(currentPage + 1)} disabled={loading || currentPage === pageCount} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-35"><ChevronRightIcon className="size-4" /></button>
          <button type="button" aria-label="Last page" title="Last page" onClick={() => goToPage(pageCount)} disabled={loading || currentPage === pageCount} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground disabled:opacity-35"><ChevronsRightIcon className="size-4" /></button>
        </div>
        <span className="hidden text-xs text-muted-foreground sm:inline">Scroll to read</span>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain bg-muted/25 p-3 sm:p-6">
        {loading && <div className="flex min-h-80 flex-col items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2Icon className="size-7 animate-spin text-[#b44b4b]" /><span>Rendering pages...</span></div>}
        {error && <div className="flex min-h-80 items-center justify-center px-6 text-center text-sm text-red-600">{error}</div>}
        {!error && Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
          <div key={pageNumber} ref={(element) => { pageRefs.current[pageNumber] = element }} className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-border/70 bg-white shadow-[0_2px_8px_rgb(0,0,0,0.06)] p-2 sm:p-4">
            <div className="mb-2 flex items-center justify-between px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"><span>Page {pageNumber}</span><span>{pageNumber} of {pageCount}</span></div>
            <canvas className="mx-auto block max-w-full" />
          </div>
        ))}
      </div>
    </div>
  )
})

export default PdfViewer
