"use client"

import { useEffect, useRef, useState } from "react"
import { FileTextIcon } from "lucide-react"

import { loadPdf } from "@/lib/pdf/pdfjs"
import { readRemotePdf } from "@/lib/pdf/remote"

type Props = { fileName: string }

export default function PdfThumbnail({ fileName }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function renderThumbnail() {
      try {
        setLoading(true)
        setError(false)
        const pdf = await loadPdf(await readRemotePdf(fileName))
        const page = await pdf.getPage(1)
        const canvas = canvasRef.current
        const container = containerRef.current
        const context = canvas?.getContext("2d")
        if (!canvas || !container || !context || cancelled) return

        const baseViewport = page.getViewport({ scale: 1 })
        const scale = Math.min(0.9, container.clientWidth / baseViewport.width)
        const viewport = page.getViewport({ scale })
        canvas.width = viewport.width
        canvas.height = viewport.height
        await page.render({ canvas, canvasContext: context, viewport }).promise
        if (!cancelled) setLoading(false)
      } catch {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      }
    }

    void renderThumbnail()
    return () => { cancelled = true }
  }, [fileName])

  return (
    <div ref={containerRef} className="flex h-full items-start justify-center overflow-hidden bg-[#f2eeee] p-3">
      {(loading || error) && <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-white text-[#b44b4b]"><FileTextIcon className="size-10" /><span className="text-[10px] font-semibold uppercase tracking-[0.16em]">{error ? "PDF preview" : "Loading"}</span></div>}
      <canvas ref={canvasRef} className={loading || error ? "hidden" : "block h-auto max-w-full bg-white shadow-sm"} />
    </div>
  )
}