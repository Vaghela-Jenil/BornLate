"use client"

import { useEffect, useState } from "react"

import type { PdfMetadata } from "@/lib/pdf/types"

export type DocumentItem = PdfMetadata
const RAG_API = "http://localhost:8000"
let cachedDocuments: DocumentItem[] | null = null
let documentsRequest: Promise<DocumentItem[]> | null = null

type RagDocument = {
  document_id: string
  filename: string
  status: string
  page_count?: number
  size?: number
}

function toDocument(document: RagDocument): DocumentItem {
  return {
    id: document.document_id,
    name: document.filename,
    size: document.size ?? 0,
    type: "application/pdf",
    pageCount: document.page_count ?? 1,
    opfsFileName: `${RAG_API}/api/v1/documents/${document.document_id}/file?tenant_id=default`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    pages: [],
  }
}

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<Record<string, { stage: string; progress: number }>>({})

  useEffect(() => {
    let cancelled = false
    function loadDocuments() {
      if (cachedDocuments) return Promise.resolve(cachedDocuments)
      if (!documentsRequest) {
        documentsRequest = fetch(`${RAG_API}/api/v1/documents?tenant_id=default`)
          .then(async (response) => {
            if (!response.ok) throw new Error("Unable to load PDFs from the RAG backend.")
            return (await response.json() as RagDocument[]).map(toDocument)
          })
          .then((saved) => {
            cachedDocuments = saved
            return saved
          })
          .finally(() => { documentsRequest = null })
      }
      return documentsRequest
    }

    loadDocuments()
      .then((saved) => {
        if (!cancelled) setDocuments(saved)
      })
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Unable to load your PDFs.")
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    function refreshDocuments() {
      cachedDocuments = null
      documentsRequest = null
      void fetch(`${RAG_API}/api/v1/documents?tenant_id=default`)
        .then((response) => {
          if (!response.ok) throw new Error("Unable to refresh PDFs.")
          return response.json() as Promise<RagDocument[]>
        })
        .then((saved) => {
          cachedDocuments = saved.map(toDocument)
          setDocuments(cachedDocuments)
        })
        .catch(() => undefined)
    }
    window.addEventListener("bornlate:documents-updated", refreshDocuments)
    return () => window.removeEventListener("bornlate:documents-updated", refreshDocuments)
  }, [])

  async function addFiles(files: File[]) {
    const pdfFiles = files.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"))
    const added: DocumentItem[] = []
    setError(null)

    for (const file of pdfFiles) {
      try {
        const form = new FormData()
        form.append("file", file)
        form.append("tenant_id", "default")
        const response = await fetch(`${RAG_API}/api/v1/documents/upload/stream`, { method: "POST", body: form })
        if (!response.ok || !response.body) throw new Error("Failed to upload PDF.")
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""
        let result: RagDocument & { document_id: string } | null = null
        setUploadProgress((current) => ({ ...current, [file.name]: { stage: "uploaded", progress: 10 } }))
        while (true) {
          const chunk = await reader.read()
          buffer += decoder.decode(chunk.value, { stream: !chunk.done })
          const lines = buffer.split("\n\n")
          buffer = lines.pop() ?? ""
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue
            const event = JSON.parse(line.slice(6)) as { stage: string; progress: number; error?: string; document_id?: string; filename?: string; size?: number; page_count?: number }
            setUploadProgress((current) => ({ ...current, [file.name]: { stage: event.stage, progress: event.progress } }))
            if (event.error) throw new Error(event.error)
            if (event.document_id) result = { ...event, document_id: event.document_id, filename: event.filename ?? file.name }
          }
          if (chunk.done) break
        }
        if (!result) throw new Error("The backend did not finish indexing this PDF.")
        added.push(toDocument(result))
        setUploadProgress((current) => {
          const next = { ...current }
          delete next[file.name]
          return next
        })
      } catch (reason: unknown) {
        const message = reason instanceof Error ? reason.message : `Failed to process ${file.name}.`
        setError(message)
      }
    }

    if (added.length > 0) {
      cachedDocuments = [...added, ...(cachedDocuments ?? [])]
      setDocuments(cachedDocuments)
      window.dispatchEvent(new Event("bornlate:documents-updated"))
    }
    return added
  }

  async function removeDocument(id: string) {
    const document = documents.find((item) => item.id === id)
    if (!document) return

    setError(null)
    try {
      const response = await fetch(`${RAG_API}/api/v1/documents/${encodeURIComponent(id)}?tenant_id=default`, { method: "DELETE" })
      if (!response.ok) throw new Error("Unable to delete this PDF.")
      cachedDocuments = (cachedDocuments ?? []).filter((item) => item.id !== id)
      setDocuments(cachedDocuments)
      window.dispatchEvent(new Event("bornlate:documents-updated"))
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Unable to delete this PDF.")
    }
  }

  return { documents, addFiles, removeDocument, isLoading, error, uploadProgress }
}
