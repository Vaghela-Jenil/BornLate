"use client"

import { useEffect, useState } from "react"

export type ChatItem = {
  id: string
  title: string
  messages: ChatMessage[]
  selectedDocumentId: string | null
  pinned: boolean
}

export type ChatMessage = { role: "user" | "assistant"; content: string }

const CHATS_STORAGE_KEY = "bornlate-chats"
const RAG_API = "http://localhost:8000"

export function useChats() {
  const [chats, setChats] = useState<ChatItem[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    const savedChats = window.localStorage.getItem(CHATS_STORAGE_KEY)
    if (savedChats) {
      try {
        const saved = JSON.parse(savedChats) as Partial<ChatItem>[]
        setChats(saved.map((chat) => ({
          id: chat.id ?? crypto.randomUUID(),
          title: chat.title ?? "New conversation",
          messages: chat.messages ?? [],
          selectedDocumentId: chat.selectedDocumentId ?? null,
          pinned: chat.pinned ?? false,
        })))
      } catch {
        window.localStorage.removeItem(CHATS_STORAGE_KEY)
      }
    }
    void fetch(`${RAG_API}/api/v1/chat/conversations?tenant_id=default&user_id=default`)
      .then((response) => response.ok ? response.json() as Promise<{ id: string; title: string }[]> : [])
      .then(async (remote) => {
        const details = await Promise.all(remote.map(async (item) => {
          const response = await fetch(`${RAG_API}/api/v1/chat/conversations/${item.id}?tenant_id=default&user_id=default`)
          return response.ok ? { ...item, messages: (await response.json()).messages as ChatMessage[] } : null
        }))
        setChats((current) => {
          const existing = new Set(current.map((chat) => chat.id))
          const imported = details.filter((item): item is { id: string; title: string; messages: ChatMessage[] } => Boolean(item) && !existing.has(item.id))
            .map((item) => ({ ...item, selectedDocumentId: null, pinned: false }))
          return [...imported, ...current]
        })
      })
      .catch(() => undefined)
    setHasLoaded(true)
  }, [])

  useEffect(() => {
    if (hasLoaded) window.localStorage.setItem(CHATS_STORAGE_KEY, JSON.stringify(chats))
  }, [chats, hasLoaded])

  function createChat(title: string, selectedDocumentId: string | null, messages: ChatMessage[] = [], id = crypto.randomUUID()) {
    const chat = { id, title: title.trim().slice(0, 48) || "New conversation", messages, selectedDocumentId, pinned: false }
    setChats((current) => [chat, ...current])
    return chat
  }

  function updateChat(id: string, messages: ChatMessage[], selectedDocumentId: string | null) {
    setChats((current) => current.map((chat) => chat.id === id ? { ...chat, messages, selectedDocumentId } : chat))
  }

  function togglePinChat(id: string) {
    setChats((current) => {
      const chat = current.find((item) => item.id === id)
      if (!chat) return current
      const nextPinned = !chat.pinned
      const updatedChat = { ...chat, pinned: nextPinned }
      const remaining = current.filter((item) => item.id !== id)
      return [updatedChat, ...remaining]
    })
  }

  function deleteChat(id: string) {
    setChats((current) => current.filter((chat) => chat.id !== id))
    void fetch(`http://localhost:8000/api/v1/chat/conversations/${encodeURIComponent(id)}?tenant_id=default&user_id=default`, { method: "DELETE" }).catch(() => undefined)
  }

  return { chats, createChat, updateChat, togglePinChat, deleteChat }
}
