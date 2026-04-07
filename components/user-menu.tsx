"use client"

import { useMutation } from "@tanstack/react-query"
import { LogOut, UserCircle } from "lucide-react"
import Link from "next/link"

import { useAuthStore } from "@/store/auth-store"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

async function logoutRequest() {
  await fetch("/api/auth/logout", { method: "POST" })
}

export function UserMenu() {
  const { user, clearUser } = useAuthStore()

  const mutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      clearUser()
      window.location.href = "/login"
    },
  })

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer bg-transparent border-0 p-0">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-blue-900 text-white text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="truncate text-sm px-2 py-1.5">
            {user?.email ?? "Usuario"}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href="/perfil">
            <UserCircle className="h-4 w-4 mr-2" />
            Mi perfil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {mutation.isPending ? "Cerrando sesión..." : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
