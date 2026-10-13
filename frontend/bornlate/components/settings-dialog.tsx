"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquareText, Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { ChatItem } from "@/lib/chats"

export function SettingsDialog({
  open,
  onOpenChange,
  chats = [],
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  chats?: ChatItem[]
}) {
  const [query, setQuery] = useState("")
  const router = useRouter()
  const normalizedQuery = query.trim().toLowerCase()
  const filteredChats = (normalizedQuery ? chats : chats.slice(0, 3)).filter((chat) =>
    `${chat.title} ${chat.messages.map((message) => message.content).join(" ")}`.toLowerCase().includes(normalizedQuery),
  )

  function getPreview(chat: ChatItem) {
    const message = chat.messages.at(-1)?.content ?? "No messages yet"
    return message.length > 72 ? `${message.slice(0, 72).trimEnd()}...` : message
  }

  function openChat(chatId: string) {
    onOpenChange(false)
    router.push(`/dashboard?chat=${encodeURIComponent(chatId)}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden rounded-2xl p-0 sm:max-w-140">
        <div className="border-b border-border/70 px-6 py-5">
          <DialogTitle className="text-base font-semibold tracking-[-0.01em]">Search conversations</DialogTitle>
          <DialogDescription className="mt-1.5 text-xs text-muted-foreground">
            Find a question or answer from your PDF chats.
          </DialogDescription>
        </div>
        <div className="px-6 py-5">
          <div className="relative rounded-xl border border-border bg-muted/40 transition-colors focus-within:border-ring focus-within:bg-background focus-within:ring-3 focus-within:ring-ring/20">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your chats..."
              className="h-12 border-0 bg-transparent px-4 pl-11 pr-4 text-sm shadow-none focus-visible:border-0 focus-visible:ring-0"
            />
          </div>
          <div className="mt-5 space-y-1">
            {!normalizedQuery && filteredChats.length > 0 && (
              <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recent chats</p>
            )}
            {filteredChats.map((chat) => (
              <button
                key={chat.id}
                type="button"
                onClick={() => openChat(chat.id)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-red-50 text-red-500">
                  <MessageSquareText className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{chat.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{getPreview(chat)}</span>
                </span>
                <span className="text-[11px] text-muted-foreground">Open</span>
              </button>
            ))}
            {filteredChats.length === 0 && (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">No conversations found.</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
