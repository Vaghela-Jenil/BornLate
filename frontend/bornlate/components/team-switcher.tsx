"use client"

import { useState, type ReactNode } from "react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ChevronDownIcon, PlusIcon } from "lucide-react"

export function TeamSwitcher({
  teams,
}: {
  teams: {
    name: string
    logo: ReactNode
    plan: string
  }[]
}) {
  const [activeTeam, setActiveTeam] = useState(teams[0])
  if (!activeTeam) {
    return null
  }

  const brandName = (className = "") =>
    activeTeam.name === "BornLate" ? (
      <span className={`truncate font-semibold tracking-[-0.02em] ${className}`}>
        <span className="text-[#0b123d]">Born</span>
        <span className="text-[#642bd4]">Late</span>
      </span>
    ) : (
      <span className={`truncate font-medium ${className}`}>{activeTeam.name}</span>
    )

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarMenuButton className="w-fit px-1.5" />}
          >
            <div className="flex aspect-square size-5 items-center justify-center overflow-hidden rounded-md bg-white">
              {activeTeam.logo}
            </div>
            {brandName()}
            <ChevronDownIcon className="opacity-50" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Teams
              </DropdownMenuLabel>
              {teams.map((team, index) => (
                <DropdownMenuItem
                  key={team.name}
                  onClick={() => setActiveTeam(team)}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center overflow-hidden rounded-xs border bg-white">
                    {team.logo}
                  </div>
                  {team.name === "BornLate" ? (
                    <span className="font-semibold">
                      <span className="text-[#0b123d]">Born</span>
                      <span className="text-[#642bd4]">Late</span>
                    </span>
                  ) : team.name}
                  <DropdownMenuShortcut>⌘{index + 1}</DropdownMenuShortcut>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem className="gap-2 p-2">
                <div className="flex size-6 items-center justify-center rounded-md border bg-background">
                  <PlusIcon className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Add team
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
