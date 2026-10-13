"use client"

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react"
import Link from "next/link"
import {
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  FileUpIcon,
  PaperclipIcon,
  SendIcon,
  SparklesIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { useDocuments } from "@/lib/documents"
import { useChats, type ChatMessage } from "@/lib/chats"

type Message = ChatMessage
type ChatSession = { messages: Message[]; activeChatId: string | null; selectedDocumentId: string | null }

const CHAT_SESSION_KEY = "bornlate-active-chat"
const RAG_API = "http://localhost:8000"

function getSavedSession(): ChatSession {
  if (typeof window === "undefined") return { messages: [], activeChatId: null, selectedDocumentId: null }
  try {
    return JSON.parse(window.sessionStorage.getItem(CHAT_SESSION_KEY) ?? "null") ?? { messages: [], activeChatId: null, selectedDocumentId: null }
  } catch {
    return { messages: [], activeChatId: null, selectedDocumentId: null }
  }
}

export default function Page() {
  const { documents, addFiles } = useDocuments()
  const { chats, createChat, updateChat, deleteChat } = useChats()
  const [question, setQuestion] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [sessionReady, setSessionReady] = useState(false)
  const [copiedMessage, setCopiedMessage] = useState<number | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const selectedDocument = documents.find((document) => document.id === selectedDocumentId)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    function handleNewChat() {
      handleNewChatState()
    }
    function handleSelectDocument(event: Event) {
      handleSelectDocumentState((event as CustomEvent<string>).detail)
    }
    window.addEventListener("bornlate:new-chat", handleNewChat)
    window.addEventListener("bornlate:select-document", handleSelectDocument)
    return () => {
      window.removeEventListener("bornlate:new-chat", handleNewChat)
      window.removeEventListener("bornlate:select-document", handleSelectDocument)
    }
  }, [activeChatId, messages, updateChat])

  useEffect(() => {
    const savedSession = getSavedSession()
    setMessages(savedSession.messages)
    setActiveChatId(savedSession.activeChatId)
    setSelectedDocumentId(savedSession.selectedDocumentId)
    setSessionReady(true)
  }, [])

  useEffect(() => {
    const documentId = new URLSearchParams(window.location.search).get("document")
    if (documentId && documents.some((document) => document.id === documentId)) setSelectedDocumentId(documentId)
  }, [documents])

  useEffect(() => {
    const chatId = new URLSearchParams(window.location.search).get("chat")
    const savedChat = chats.find((chat) => chat.id === chatId)
    if (!savedChat) return
    setActiveChatId(savedChat.id)
    setMessages(savedChat.messages)
    setSelectedDocumentId(savedChat.selectedDocumentId)
  }, [chats])

  useEffect(() => {
    if (sessionReady) window.sessionStorage.setItem(CHAT_SESSION_KEY, JSON.stringify({ messages, activeChatId, selectedDocumentId }))
  }, [messages, activeChatId, selectedDocumentId, sessionReady])

  function handleSelectDocumentState(documentId: string | null) {
    setSelectedDocumentId(documentId)
    if (activeChatId) updateChat(activeChatId, messages, documentId)
  }

  function handleSelectDocument(documentId: string | null) {
    handleSelectDocumentState(documentId)
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    if (messages.length > 0) return
    const newDocuments = await addFiles(Array.from(event.target.files ?? []))
    if (newDocuments[0]) handleSelectDocument(newDocuments[0].id)
    event.target.value = ""
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedQuestion = question.trim()
    if (!trimmedQuestion || !selectedDocument) return

    const nextMessages: Message[] = [
      ...messages,
      { role: "user", content: trimmedQuestion },
    ]
    setMessages(nextMessages)
    setQuestion("")
    setIsGenerating(true)
    window.dispatchEvent(new CustomEvent("bornlate:navigation-lock", { detail: true }))
    try {
      const response = await fetch(`${RAG_API}/api/v1/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmedQuestion,
          tenant_id: "default",
          user_id: "default",
          conversation_id: activeChatId,
        }),
      })
      if (!response.ok || !response.body) throw new Error("The RAG backend could not answer.")
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let conversationId = activeChatId
      let answer = ""
      while (true) {
        const chunk = await reader.read()
        buffer += decoder.decode(chunk.value, { stream: !chunk.done })
        const events = buffer.split("\n\n")
        buffer = events.pop() ?? ""
        for (const line of events) {
          if (!line.startsWith("data: ")) continue
          const event = JSON.parse(line.slice(6)) as { type: string; conversation_id?: string; token?: string; answer?: string }
          if (event.conversation_id) conversationId = event.conversation_id
          if (event.token) {
            answer += event.token
            setMessages([...nextMessages, { role: "assistant", content: answer }])
          }
          if (event.answer) answer = event.answer
        }
        if (chunk.done) break
      }
      const answeredMessages = [...nextMessages, { role: "assistant" as const, content: answer }]
      const chat = activeChatId ? null : createChat(trimmedQuestion, selectedDocument.id, answeredMessages, conversationId ?? undefined)
      if (chat) setActiveChatId(chat.id)
      if (conversationId && activeChatId) updateChat(activeChatId, answeredMessages, selectedDocument.id)
      setMessages(answeredMessages)
    } catch (reason: unknown) {
      setMessages([...nextMessages, { role: "assistant", content: reason instanceof Error ? reason.message : "The RAG backend could not answer." }])
    } finally {
      setIsGenerating(false)
      window.dispatchEvent(new CustomEvent("bornlate:navigation-lock", { detail: false }))
    }
  }

  function handleNewChatState() {
    setMessages([])
    setActiveChatId(null)
    setQuestion("")
    setSelectedDocumentId(null)
    window.sessionStorage.removeItem(CHAT_SESSION_KEY)
  }

  function handleNewChat() {
    handleNewChatState()
  }

  function handleDeleteChat(chatId: string) {
    deleteChat(chatId)
    if (activeChatId === chatId) handleNewChat()
  }

  async function handleCopyMessage(content: string, index: number) {
    await navigator.clipboard.writeText(content)
    setCopiedMessage(index)
    window.setTimeout(() => setCopiedMessage((current) => current === index ? null : current), 1500)
  }

  return (
      <SidebarInset className="bg-[#fbfbfa]">
        <header className="flex h-14 shrink-0 items-center border-b border-border/60 px-4">
          <SidebarTrigger />
          <div className="ml-3 min-w-0 truncate text-sm font-medium text-foreground/80">
            {messages.length ? chats.find((chat) => chat.id === activeChatId)?.title ?? "Conversation" : "New conversation"}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <label htmlFor="header-pdf-select" className="sr-only">Select a PDF</label>
            <select
              id="header-pdf-select"
              value={selectedDocumentId ?? ""}
              disabled={messages.length > 0 || isGenerating}
              onChange={(event) => handleSelectDocument(event.target.value || null)}
              className="max-w-52 truncate rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors focus:border-[#b44b4b] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Select PDF</option>
              {documents.map((document) => <option key={document.id} value={document.id}>{document.name}</option>)}
            </select>
            <span className="hidden text-xs text-muted-foreground sm:inline">{documents.length} PDF{documents.length === 1 ? "" : "s"}</span>
          </div>
        </header>
        <main
          className={`relative flex min-h-0 flex-1 flex-col items-center justify-center px-4 pb-8 pt-8 transition-colors ${isDragging ? "bg-[#fdf4f4]" : ""}`}
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
            if (messages.length > 0) return
            void addFiles(Array.from(event.dataTransfer.files)).then((newDocuments) => {
              if (newDocuments[0]) handleSelectDocument(newDocuments[0].id)
            })
          }}
        >
          <section className={`flex min-h-0 w-full max-w-3xl flex-1 flex-col ${messages.length ? "justify-end" : "items-center justify-center text-center"}`}>
            {messages.length > 0 ? (
              <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-1 py-8">
                {messages.map((message, index) => (
                  <div key={`${message.role}-${index}`} className={`group/message flex w-full gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`flex max-w-[min(85%,44rem)] items-start gap-1 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`px-1 text-[15px] leading-7 ${message.role === "user" ? "rounded-2xl rounded-br-md bg-[#eeeeee] px-4 py-2 text-foreground" : "text-foreground"}`}>
                        {message.content}
                      </div>
                      <button type="button" aria-label="Copy message" title="Copy message" onClick={() => void handleCopyMessage(message.content, index)} className="mt-1 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover/message:opacity-100">
                        {copiedMessage === index ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              <>
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#f2e8e8] text-[#b44b4b]">
                  <SparklesIcon className="size-6" />
                </div>
                <h1 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">What would you like to know?</h1>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">Upload a PDF and ask anything about its contents.</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`mt-6 flex w-full max-w-sm items-center gap-3 rounded-xl border border-dashed px-4 py-3 text-left transition-colors ${isDragging ? "border-[#b44b4b] bg-[#fdf4f4]" : "border-border bg-white/70 hover:border-[#b44b4b]/60 hover:bg-white"}`}
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#f2e8e8] text-[#b44b4b]"><FileUpIcon className="size-4" /></span>
                  <span className="min-w-0"><span className="block text-sm font-medium">Drop a PDF here or browse</span><span className="block text-xs text-muted-foreground">PDF files up to 50 MB</span></span>
                </button>
              </>
            )}
          </section>
          <div className="pointer-events-none absolute right-4 top-4 z-10 sm:right-6 sm:top-6">
            {selectedDocument ? (
              <Link href={`/folders/${encodeURIComponent(selectedDocument.id)}`} className="pointer-events-auto flex max-w-65 items-center gap-2 rounded-xl border border-[#e8dada] bg-white p-2 shadow-sm transition-colors hover:border-[#b44b4b]">
                <div className="size-10 shrink-0 overflow-hidden rounded-lg bg-[#f2eeee]">
                  <FileUpIcon className="m-3 size-4 text-[#b44b4b]" />
                </div>
                <span className="min-w-0 text-left"><span className="block text-[10px] uppercase tracking-wider text-[#b44b4b]">Selected PDF</span><span className="block truncate text-xs font-medium">{selectedDocument.name}</span></span>
              </Link>
            ) : documents.length > 0 ? (
              <span className="hidden rounded-lg border border-border bg-white px-3 py-2 text-xs text-muted-foreground shadow-sm sm:block">Select a PDF to start</span>
            ) : null}
          </div>
          <form className="w-full max-w-3xl" onSubmit={handleSubmit}>
            <div className="flex min-h-14 items-center gap-2 rounded-2xl border border-border bg-white px-2 shadow-[0_8px_30px_rgb(0,0,0,0.05)]">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Attach a PDF" disabled={messages.length > 0 || isGenerating} onClick={() => fileInputRef.current?.click()}>
                <PaperclipIcon />
              </Button>
              <textarea
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Ask a question about your PDF..."
                rows={1}
                className="max-h-32 min-h-10 min-w-0 flex-1 resize-none bg-transparent px-1 py-3 text-sm outline-none placeholder:text-muted-foreground"
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
              />
              <Button type="submit" size="icon-sm" aria-label="Send question" disabled={!question.trim() || !selectedDocument || isGenerating}>
                {question.trim() ? <SendIcon /> : <ArrowUpIcon />}
              </Button>
            </div>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">{isGenerating ? "Generating from your sources. Please wait..." : selectedDocument ? "BornLate can make mistakes. Check important information in the source PDF." : "Select or upload a PDF to start asking questions."}</p>
          </form>
        </main>
        <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" multiple className="hidden" onChange={handleFiles} />
      </SidebarInset>
  )
}
