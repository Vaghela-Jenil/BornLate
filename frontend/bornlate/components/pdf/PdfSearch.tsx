"use client"

import { useMemo, useState } from "react"
import { SearchIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { PdfPage } from "@/lib/pdf/types"

type Props = { pages: PdfPage[]; open: boolean; onClose: () => void; onSelectPage: (pageNumber: number) => void }

export default function PdfSearch({ pages, open, onClose, onSelectPage }: Props) {
  const [query, setQuery] = useState("")
  const normalizedQuery = query.trim().toLowerCase()
  const results = useMemo(() => normalizedQuery ? pages.filter((page) => page.text.toLowerCase().includes(normalizedQuery)) : [], [normalizedQuery, pages])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent
        className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-140"
        style={{ display: "flex", flexDirection: "column", height: "min(520px, calc(100vh - 2rem))", minHeight: 0 }}
      >
        <div className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="text-base font-semibold tracking-[-0.01em]">Search document</DialogTitle>
          <DialogDescription className="mt-1.5 text-xs text-muted-foreground">Find text and jump directly to a page.</DialogDescription>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-6 py-5">
          <div className="relative rounded-xl border border-border bg-muted/40 transition-colors focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20">
            <SearchIcon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search in this PDF..." className="h-12 border-0 bg-transparent px-4 pl-11 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0" />
          </div>
          {normalizedQuery && <p className="mt-4 text-xs text-muted-foreground">Found on {results.length} page{results.length === 1 ? "" : "s"}</p>}
          <div className="mt-5 shrink-0 space-y-1 overflow-y-auto overscroll-contain pr-1" style={{ height: "12.25rem", minHeight: "12.25rem", maxHeight: "12.25rem", WebkitOverflowScrolling: "touch" }}>
            {results.map((page) => (
              <button key={page.pageNumber} type="button" onClick={() => { onSelectPage(page.pageNumber); onClose() }} className="block h-24 min-h-24 max-h-24 w-full overflow-hidden rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted">
                <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#b44b4b]">Page {page.pageNumber}</span>
                <span className="mt-1 line-clamp-2 block text-sm leading-6 text-foreground">{getSnippet(page.text, query)}</span>
              </button>
            ))}
            {normalizedQuery && results.length === 0 && <p className="px-3 py-8 text-center text-sm text-muted-foreground">No matching pages found.</p>}
            {!normalizedQuery && <p className="px-2 py-8 text-center text-sm text-muted-foreground">Type a word or phrase to search this PDF.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getSnippet(text: string, query: string) {
  const index = text.toLowerCase().indexOf(query.trim().toLowerCase())
  if (index === -1) return text.slice(0, 250)
  const start = Math.max(0, index - 90)
  const end = Math.min(text.length, index + query.length + 140)
  return `${start > 0 ? "... " : ""}${text.slice(start, end)}${end < text.length ? " ..." : ""}`
}
