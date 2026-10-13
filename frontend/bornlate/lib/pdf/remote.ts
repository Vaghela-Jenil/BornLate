const pdfCache = new Map<string, ArrayBuffer>()
const pdfRequests = new Map<string, Promise<ArrayBuffer>>()

export async function readRemotePdf(url: string): Promise<ArrayBuffer> {
  const cached = pdfCache.get(url)
  if (cached) return cached.slice(0)

  const existingRequest = pdfRequests.get(url)
  if (existingRequest) return existingRequest.then((data) => data.slice(0))

  const request = fetch(url, { cache: "force-cache" })
    .then(async (response) => {
      if (!response.ok) throw new Error("Unable to load this PDF from the RAG backend.")
      const data = await response.arrayBuffer()
      pdfCache.set(url, data)
      return data
    })
    .finally(() => pdfRequests.delete(url))

  pdfRequests.set(url, request)
  return request.then((data) => data.slice(0))
}
