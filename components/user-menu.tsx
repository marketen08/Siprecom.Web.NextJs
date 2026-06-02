"use client"

import { useMutation } from "@tanstack/react-query"
import { Building2, LogOut, UserCircle, PenLine } from "lucide-react"
import Link from "next/link"

import { useAuthStore } from "@/store/auth-store"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetCliente } from "@/features/clientes/api/use-get-cliente"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

async function logoutRequest() {
  await fetch("/api/auth/logout", { method: "POST" })
}

function buildIniciales(nombre?: string, apellido?: string, email?: string): string {
  const n = (nombre ?? "").trim()
  const a = (apellido ?? "").trim()
  if (n || a) {
    return `${n[0] ?? ""}${a[0] ?? ""}`.toUpperCase() || "U"
  }
  return (email ?? "U").slice(0, 2).toUpperCase()
}

export function UserMenu() {
  const { user, clearUser } = useAuthStore()
  const { data: perfil } = useGetPerfil()
  const { data: clienteRaw } = useGetCliente(perfil?.clienteId ?? null)
  const cliente = clienteRaw?.data

  const mutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: () => {
      clearUser()
      window.location.href = "/login"
    },
  })

  const nombreCompleto = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ").trim()
  const email = perfil?.email ?? user?.email ?? ""
  const iniciales = buildIniciales(perfil?.nombre, perfil?.apellido, email)
  const profileImageUrl = perfil?.profileImageUrl
  const logoClienteUrl = cliente?.logoSasUrl ?? cliente?.urlLogo ?? null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500 cursor-pointer bg-transparent border-0 p-0">
        <Avatar className="h-8 w-8">
          {profileImageUrl && <AvatarImage src={profileImageUrl} alt={nombreCompleto || email} />}
          <AvatarFallback className="bg-blue-900 text-white text-xs">
            {iniciales}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 p-0">
        {/* Header: avatar + nombre + email */}
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar size="lg" className="h-10 w-10 shrink-0">
            {profileImageUrl && <AvatarImage src={profileImageUrl} alt={nombreCompleto || email} />}
            <AvatarFallback className="bg-blue-900 text-white text-sm font-medium">
              {iniciales}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            {nombreCompleto ? (
              <>
                <p className="text-sm font-semibold text-gray-900 truncate">{nombreCompleto}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </>
            ) : (
              <p className="text-sm text-gray-900 truncate">{email || "Usuario"}</p>
            )}
          </div>
        </div>

        {/* Empresa (si hay cliente asignado) */}
        {cliente && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
              <LogoEmpresa src={logoClienteUrl} alt={cliente.nombre} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {cliente.esContratista ? "Contratista" : "Empresa"}
                </p>
                <p className="text-xs font-medium text-gray-700 truncate">{cliente.nombre}</p>
              </div>
            </div>
          </>
        )}

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1">
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/perfil">
              <UserCircle className="h-4 w-4 mr-2" />
              Mi perfil
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="cursor-pointer">
            <Link href="/mis-firmas">
              <PenLine className="h-4 w-4 mr-2" />
              Mis firmas
            </Link>
          </DropdownMenuItem>
        </div>

        <DropdownMenuSeparator className="my-0" />

        <div className="p-1">
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {mutation.isPending ? "Cerrando sesión..." : "Cerrar sesión"}
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** Logo de empresa con fallback a icono Building2 si no hay URL o la imagen falla. */
function LogoEmpresa({ src, alt }: { src: string | null; alt: string }) {
  if (!src) {
    return (
      <div className="h-8 w-8 rounded-md bg-white border flex items-center justify-center shrink-0">
        <Building2 className="h-4 w-4 text-muted-foreground" />
      </div>
    )
  }
  return (
    <div className="h-8 w-8 rounded-md bg-white border flex items-center justify-center overflow-hidden shrink-0">
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-contain"
        onError={(e) => { e.currentTarget.style.visibility = "hidden" }}
      />
    </div>
  )
}
