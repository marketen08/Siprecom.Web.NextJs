"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Building2, Check, Loader2, LogOut, UserCircle, PenLine, ShieldCheck, Users } from "lucide-react"
import Link from "next/link"

import { useAuthStore } from "@/store/auth-store"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetCliente } from "@/features/clientes/api/use-get-cliente"
import { useCambiarEquipoActivo, useGetMisEquipos } from "@/features/equipos/api/use-equipos"
import {
  FUNCIONALIDAD,
  useFuncionalidadPlataforma,
} from "@/features/funcionalidades/api/use-funcionalidades-plataforma"
import { useMeetsRole } from "@/lib/use-roles"
import { etiquetaRolPrincipal } from "@/lib/roles"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

/**
 * En los sitios federados el endpoint devuelve logoutUrl: la URL de end_session
 * del IDP. Hay que navegar ahí, porque borrar solo nuestras cookies deja abierta
 * la sesión del proveedor y el próximo "Continuar con YPF" entra sin pedir nada.
 * El IDP después vuelve a /api/auth/logout/callback.
 */
async function logoutRequest(): Promise<{ logoutUrl: string | null }> {
  const res = await fetch("/api/auth/logout", { method: "POST" })
  const data = await res.json().catch(() => ({}) as { logoutUrl?: string | null })
  return { logoutUrl: (data as { logoutUrl?: string | null }).logoutUrl ?? null }
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
  const queryClient = useQueryClient()
  const { data: perfil } = useGetPerfil()
  const { data: clienteRaw } = useGetCliente(perfil?.clienteId ?? null)
  const cliente = clienteRaw?.data

  const mutation = useMutation({
    mutationFn: logoutRequest,
    onSuccess: ({ logoutUrl }) => {
      // Antes que clearUser: HidratarSesion repuebla el store desde la query de
      // perfil, asi que si la caja quedara cargada volveria a escribir el mail y
      // los roles en localStorage justo despues de limpiarlos.
      queryClient.clear()
      clearUser()
      // Con federación vamos al IDP a cerrar la sesión de allá; él nos devuelve a
      // /api/auth/logout/callback y de ahí al login. Sin federación, directo.
      window.location.href = logoutUrl ?? "/login"
    },
  })

  const nombreCompleto = [perfil?.nombre, perfil?.apellido].filter(Boolean).join(" ").trim()
  const email = perfil?.email ?? user?.email ?? ""
  const iniciales = buildIniciales(perfil?.nombre, perfil?.apellido, email)
  const profileImageUrl = perfil?.profileImageUrl
  const logoClienteUrl = cliente?.logoSasUrl ?? cliente?.urlLogo ?? null

  // Del perfil y NO del store: el store guarda los roles del JWT, que vienen expandidos
  // (un SuperAdmin trae los ocho). El perfil devuelve los asignados en la base. Igual se
  // toma el más alto, porque nada impide que haya dos.
  const rolEtiqueta = etiquetaRolPrincipal(perfil?.roles)

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

        {/* Rol. Va antes del equipo porque es el dato más general: el rol dice qué puede
            hacer en toda la plataforma, y el equipo sólo qué catálogo administra. */}
        {rolEtiqueta && (
          <>
            <DropdownMenuSeparator className="my-0" />
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Rol
                </p>
                <p className="truncate text-xs font-medium text-gray-700">{rolEtiqueta}</p>
              </div>
            </div>
          </>
        )}

        <EquipoDelPerfil />

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

/**
 * Equipo de administración del usuario, dentro del menú del perfil: es el lugar donde ya se
 * mira "quién soy", y el equipo es exactamente eso.
 *
 * Con **un solo equipo —el caso normal— se muestra el nombre y nada más**: ninguna opción de
 * cambio. La opción aparece recién con más de uno, que es la excepción (una suplencia, una
 * consultora con dos clientes). Así el Admin de un equipo nunca tiene que decidir nada.
 *
 * El equipo define qué catálogo de planillas administra, no a qué proyectos entra. Ver
 * Siprecom.Server.Api/Docs/PLAN-EQUIPOS-ADMINISTRACION-PLANILLAS.md.
 */
function EquipoDelPerfil() {
  // Solo Admin+ tiene equipos: para un User el endpoint devolvería 403 y la sección no
  // significa nada.
  const esAdmin = useMeetsRole("Admin")
  // La estructura de equipos se puede apagar en toda la plataforma: entonces no hay
  // equipo del que informar ni entre qué elegir.
  const hayEquipos = useFuncionalidadPlataforma(FUNCIONALIDAD.equiposAdministracion)
  const { data } = useGetMisEquipos(esAdmin && hayEquipos)
  const cambiar = useCambiarEquipoActivo()

  if (!esAdmin || !hayEquipos || !data) return null

  const { equipos, equipoActivoId, puedeElegirGlobales } = data
  // Sin equipos y sin poder elegir globales no hay nada que mostrar: es un alta a medias, y
  // el aviso correspondiente lo da la pantalla de planillas, donde importa.
  if (equipos.length === 0 && !puedeElegirGlobales) return null

  const activo = equipos.find((e) => e.id === equipoActivoId)
  const etiquetaActivo = activo?.nombre ?? (puedeElegirGlobales ? "Globales" : "Sin equipo")
  const hayQueElegir = equipos.length > 1 || puedeElegirGlobales

  return (
    <>
      <DropdownMenuSeparator className="my-0" />
      {hayQueElegir ? (
        <div className="p-1">
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Users className="mr-2 h-4 w-4" />
              <span className="flex-1 truncate">
                Equipo: <span className="font-medium">{etiquetaActivo}</span>
              </span>
              {cambiar.isPending && <Loader2 className="ml-1 h-3.5 w-3.5 animate-spin" />}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-56">
              {puedeElegirGlobales && (
                <DropdownMenuItem
                  className="cursor-pointer"
                  disabled={cambiar.isPending}
                  onClick={() => cambiar.mutate(null)}
                >
                  <span className="flex-1">Globales</span>
                  {!equipoActivoId && <Check className="h-4 w-4 text-blue-900" />}
                </DropdownMenuItem>
              )}
              {equipos.map((e) => (
                <DropdownMenuItem
                  key={e.id}
                  className="cursor-pointer"
                  disabled={cambiar.isPending || e.id === equipoActivoId}
                  onClick={() => cambiar.mutate(e.id)}
                >
                  <span className="flex-1 truncate">{e.nombre}</span>
                  {e.id === equipoActivoId && <Check className="h-4 w-4 shrink-0 text-blue-900" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </div>
      ) : (
        // Un solo equipo: es un dato del perfil, no un control.
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white">
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Equipo
            </p>
            <p className="truncate text-xs font-medium text-gray-700">{etiquetaActivo}</p>
          </div>
        </div>
      )}
    </>
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
