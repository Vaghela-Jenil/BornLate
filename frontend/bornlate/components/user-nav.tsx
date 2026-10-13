"use client"

import { useState } from "react"
import { useClerk, useUser } from "@clerk/nextjs"
import { ChevronsUpDown, LogOut, Settings } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import Image from "next/image"

export function UserNav() {
  const [open, setOpen] = useState(false)
  const { user } = useUser()
  const { signOut } = useClerk()
  const name = user?.username
  const email = user?.primaryEmailAddress?.emailAddress || "Manage your workspace"
  const userImage = user?.imageUrl
  const initials = (name || "U").slice(0, 2).toUpperCase()

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger render={<SidebarMenuButton className="h-12 gap-2 px-2 data-popup-open:bg-sidebar-accent" />}>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#f2e8e8] text-xs font-semibold text-[#b44b4b]">
              {userImage ? (
                <img
                  src={userImage}
                  alt={`${name || "User"} profile image`}
                  width={32}
                  height={32}
                  className="size-8 rounded-full object-cover"
                />
              ) : (
                initials
              )}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs font-normal text-sidebar-foreground/55">{email}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-sidebar-foreground/50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-60" side="top" align="start" sideOffset={6}>
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate font-medium">{name}</span>
                <span className="block truncate text-xs text-muted-foreground">{email}</span>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Settings />
              Account settings
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setOpen(false)
                void signOut({ redirectUrl: "/sign-in" })
              }}
            >
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}