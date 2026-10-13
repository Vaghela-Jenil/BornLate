"use client"

import { useState, type ComponentProps } from "react"
import {
  FolderIcon,
  FileTextIcon,
  CalendarIcon,
  BlocksIcon,
  HomeIcon,
  MessageCircleQuestionIcon,
  MessageCircleIcon,
  MessageSquarePlusIcon,
  PinIcon,
  PinOffIcon,
  ChevronDownIcon,
  SearchIcon,
  Settings2Icon,
  Trash2Icon,
  ChartNoAxesCombinedIcon,
} from "lucide-react"
import { usePathname } from "next/navigation"

import { NavSecondary } from "@/components/nav-secondary"
import { TeamSwitcher } from "@/components/team-switcher"
import { UserNav } from "@/components/user-nav"
import { useChats, type ChatItem } from "@/lib/chats"
import { useDocuments } from "@/lib/documents"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const teams = [
  { name: "BornLate", logo: <img src="/Symbol.png" alt="BornLate" className="size-5 rounded-md object-cover" />, plan: "PDF workspace" },
]

export function AppSidebar({
  onSearch,
  onNewChat,
  onSelectDocument,
  onTogglePinChat,
  onDeleteChat,
  documentSelectionLocked = false,
  navigationLocked = false,
  chats = [],
  ...props
}: ComponentProps<typeof Sidebar> & {
  onSearch: () => void
  onNewChat?: () => void
  onSelectDocument?: (documentId: string) => void
  onTogglePinChat?: (chatId: string) => void
  onDeleteChat?: (chatId: string) => void
  documentSelectionLocked?: boolean
  navigationLocked?: boolean
  chats?: ChatItem[]
}) {
  const pathname = usePathname()
  const storedChatState = useChats()
  const visibleChats = [...(chats.length > 0 ? chats : storedChatState.chats)]
  const pinnedChats = visibleChats.filter((chat) => chat.pinned)
  const regularChats = visibleChats.filter((chat) => !chat.pinned)
  const togglePin = onTogglePinChat ?? storedChatState.togglePinChat
  const removeChat = onDeleteChat ?? storedChatState.deleteChat
  const [chatToDelete, setChatToDelete] = useState<ChatItem | null>(null)
  const [pinnedOpen, setPinnedOpen] = useState(true)
  const [yourChatsOpen, setYourChatsOpen] = useState(true)
  const { documents } = useDocuments()

  function renderChat(chat: ChatItem) {
    return (
      <SidebarMenuItem key={chat.id}>
        <SidebarMenuButton className="pr-16" render={<a href={`/dashboard?chat=${encodeURIComponent(chat.id)}`} />}>
          <MessageCircleIcon />
          <span className="truncate">{chat.title}</span>
        </SidebarMenuButton>
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 opacity-0 transition-opacity group-hover/menu-item:opacity-100">
          <button type="button" aria-label={chat.pinned ? `Unpin ${chat.title}` : `Pin ${chat.title}`} title={chat.pinned ? "Unpin chat" : "Pin chat"} onClick={() => togglePin(chat.id)} className={`rounded p-1.5 text-muted-foreground hover:bg-sidebar-accent hover:text-foreground ${chat.pinned ? "text-[#b44b4b]" : ""}`}>
            {chat.pinned ? <PinOffIcon className="size-3.5" /> : <PinIcon className="size-3.5" />}
          </button>
          <button type="button" aria-label={`Delete ${chat.title}`} title="Delete chat" onClick={() => setChatToDelete(chat)} className="rounded p-1.5 text-black hover:bg-black/10">
            <Trash2Icon className="size-3.5" />
          </button>
        </div>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar className={`border-r border-sidebar-border/70 ${navigationLocked ? "pointer-events-none opacity-60" : ""}`} {...props}>
      <SidebarHeader className="gap-4 p-3">
        <TeamSwitcher teams={teams} />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="#" onClick={onSearch} />}>
              <SearchIcon />
              <span>Search chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton render={<a href="/dashboard" onClick={onNewChat} />}>
              <MessageSquarePlusIcon />
              <span>New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem className="group/folders">
            <SidebarMenuButton isActive={pathname === "/folders"} render={<a href="/folders" />}>
              <FolderIcon />
              <span>Folders</span>
            </SidebarMenuButton>
            {documents.length > 0 && (
              <div className="invisible absolute left-full top-0 z-30 ml-2 w-64 translate-x-1 rounded-xl border border-border bg-white p-2 opacity-0 shadow-xl transition-all group-hover/folders:visible group-hover/folders:translate-x-0 group-hover/folders:opacity-100">
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Select a PDF</div>
                <div className="max-h-64 overflow-y-auto">
                  {documents.map((document) => (
                    <button
                      key={document.id}
                      type="button"
                      disabled={documentSelectionLocked}
                      onClick={() => onSelectDocument?.(document.id)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors hover:bg-[#fdf1f1] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <FileTextIcon className="size-4 shrink-0 text-red-500" />
                      <span className="min-w-0 flex-1 truncate">{document.name}</span>
                      <span className="text-[10px] text-muted-foreground">{document.size}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={pathname === "/dashboard"} render={<a href="/dashboard" />}>
              <HomeIcon />
              <span>Home</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton isActive={pathname === "/metrics"} render={<a href="/metrics" />}>
              <ChartNoAxesCombinedIcon />
              <span>Metrics</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            {pinnedChats.length > 0 && <>
              <button type="button" onClick={() => setPinnedOpen((open) => !open)} className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground">
                <span>Pinned chats</span>
                <ChevronDownIcon className={`size-3.5 transition-transform ${pinnedOpen ? "" : "-rotate-90"}`} />
              </button>
              {pinnedOpen && <div className="max-h-40 overflow-y-auto"><SidebarMenu>{pinnedChats.map(renderChat)}</SidebarMenu></div>}
            </>}
            <button type="button" onClick={() => setYourChatsOpen((open) => !open)} className="flex w-full items-center justify-between px-2 py-1.5 text-[11px] uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground">
              <span>Your Chats</span>
              <ChevronDownIcon className={`size-3.5 transition-transform ${yourChatsOpen ? "" : "-rotate-90"}`} />
            </button>
            {yourChatsOpen && <div className="max-h-56 overflow-y-auto"><SidebarMenu>
              {regularChats.map(renderChat)}
              {visibleChats.length === 0 && (
                <SidebarMenuItem>
                  <SidebarMenuButton className="h-auto py-2 text-sidebar-foreground/50">
                    <MessageCircleIcon />
                    <span>No chats yet</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu></div>}
          </SidebarGroupContent>
        </SidebarGroup>
        <NavSecondary
          items={[
            { title: "Calendar", url: "#", icon: <CalendarIcon /> },
            { title: "Settings", url: "#", icon: <Settings2Icon /> },
            { title: "Templates", url: "#", icon: <BlocksIcon /> },
            { title: "Trash", url: "#", icon: <Trash2Icon /> },
            { title: "Help", url: "#", icon: <MessageCircleQuestionIcon /> },
          ]}
          className="mt-auto"
        />
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/70 p-2">
        <UserNav />
      </SidebarFooter>
      <SidebarRail />
      <Dialog open={chatToDelete !== null} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogTitle>Delete this chat?</DialogTitle>
          <DialogDescription>This will permanently remove “{chatToDelete?.title}” from this browser.</DialogDescription>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setChatToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (chatToDelete) removeChat(chatToDelete.id); setChatToDelete(null) }}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
