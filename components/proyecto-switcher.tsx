"use client"

import { Loader2, FolderOpen, Check, ChevronDown, BarChart3, Settings2 } from "lucide-react"
import { useIsFetching } from "@tanstack/react-query"
import { useRouter } from "next/navigation"

import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"
import { useCambiarProyectoActivo } from "@/features/auth/api/use-cambiar-proyecto-activo"
import { useMeetsRole } from "@/lib/use-roles"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ProyectoSwitcher() {
  const router = useRouter()
  const { data: proyectos, isLoading: loadingProyectos } = useGetMisProyectos()
  const mutation = useCambiarProyectoActivo()
  const isFetching = useIsFetching()
  // "Configuración de todos los proyectos" solo tiene sentido para Admin+ (gestión).
  const isAdmin = useMeetsRole("Admin")

  const isUpdating = mutation.isPending || (mutation.isSuccess && isFetching > 0)
  const proyectoActivo = proyectos?.find((p) => p.esActivo)

  if (loadingProyectos) {
    return (
      <div className="flex items-center gap-2 px-3 h-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    )
  }

  if (!proyectos || proyectos.length === 0) return null

  // Si solo tiene un proyecto, mostrar estático sin dropdown
  if (proyectos.length === 1) {
    return (
      <div className="flex items-center gap-2 px-3 h-8 rounded-md border border-gray-200 text-sm text-gray-700">
        <FolderOpen className="h-4 w-4 text-blue-900 shrink-0" />
        <span className="max-w-45 truncate hidden sm:block">{proyectos[0].nombre}</span>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={isUpdating}
        className="flex items-center gap-2 px-3 h-8 rounded-md border border-gray-200 text-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed outline-none cursor-pointer"
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0 text-blue-900" />
        ) : (
          <FolderOpen className="h-4 w-4 text-blue-900 shrink-0" />
        )}
        <span className="max-w-45 truncate hidden sm:block">
          {proyectoActivo?.nombre ?? "Sin proyecto"}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        {proyectos.map((proyecto) => (
          <DropdownMenuItem
            key={proyecto.id}
            disabled={proyecto.esActivo}
            onClick={() => {
              if (proyecto.esActivo) return
              // Tras cambiar el proyecto activo, redirigimos a la pantalla de avance
              // por sistemas para que el usuario vea inmediatamente datos del nuevo
              // proyecto en lugar de quedarse en una pantalla con datos del anterior.
              mutation.mutate(proyecto.id, {
                onSuccess: () => router.push("/ejecucion/sistemas"),
              })
            }}
            className="flex items-center justify-between gap-2 cursor-pointer"
          >
            <span className="truncate">{proyecto.nombre}</span>
            {proyecto.esActivo && <Check className="h-4 w-4 shrink-0 text-blue-900" />}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => router.push("/ejecucion/proyectos")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <BarChart3 className="h-4 w-4 shrink-0 text-blue-900" />
          <span className="truncate">Avance de todos los proyectos</span>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => router.push("/configuracion/proyectos")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <Settings2 className="h-4 w-4 shrink-0 text-blue-900" />
            <span className="truncate">Configuración de todos los proyectos</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
