"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function ViewerRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const documentId = searchParams.get("id")

  useEffect(() => {
    router.replace(documentId ? `/folders/${encodeURIComponent(documentId)}` : "/folders")
  }, [documentId, router])

  return <div className="flex min-h-svh flex-1 items-center justify-center bg-[#f7f5f4] text-sm text-muted-foreground">Opening PDF...</div>
}
