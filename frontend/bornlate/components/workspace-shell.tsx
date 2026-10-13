"use client"

import { usePathname } from "next/navigation"
import { useEffect, useState, type ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { SettingsDialog } from "@/components/settings-dialog"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useChats } from "@/lib/chats"

const WORKSPACE_ROUTES = ["/dashboard", "/folders", "/viewer", "/metrics"]

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [searchOpen, setSearchOpen] = useState(false)
  const [navigationLocked, setNavigationLocked] = useState(false)
  const { chats } = useChats()
  const isWorkspaceRoute = WORKSPACE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))

  useEffect(() => {
    const setLocked = (event: Event) => setNavigationLocked((event as CustomEvent<boolean>).detail)
    window.addEventListener("bornlate:navigation-lock", setLocked)
    return () => window.removeEventListener("bornlate:navigation-lock", setLocked)
  }, [])

  if (!isWorkspaceRoute) return children

  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <AppSidebar
        navigationLocked={navigationLocked}
        onSearch={() => setSearchOpen(true)}
        onNewChat={() => window.dispatchEvent(new Event("bornlate:new-chat"))}
        onSelectDocument={(documentId) => window.dispatchEvent(new CustomEvent("bornlate:select-document", { detail: documentId }))}
      />
      {children}
      <SettingsDialog open={searchOpen} onOpenChange={setSearchOpen} chats={chats} />
    </SidebarProvider>
  )
}
