"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"

/**
 * Alias del detalle del proyecto activo. El sidebar apunta acá para saltarse la
 * lista intermedia — al aterrizar se resuelve el proyecto activo del user y se
 * redirige a `/alcance/proyectos/{activeId}`. La gestión de todos los proyectos
 * (crear/clonar/archivar) vive en `/configuracion/proyectos`.
 */
export default function ProyectoActivoRedirectPage() {
  const router = useRouter()
  const { data: proyectos, isLoading, isError } = useGetMisProyectos()

  useEffect(() => {
    if (isLoading || isError) return
    const activo = proyectos?.find((p) => p.esActivo)
    if (activo) {
      router.replace(`/alcance/proyectos/${activo.id}`)
    } else if (proyectos && proyectos.length > 0) {
      // No hay activo pero sí accesibles: fallback al primero.
      router.replace(`/alcance/proyectos/${proyectos[0].id}`)
    } else {
      // Sin proyectos accesibles: mandamos a la lista global.
      router.replace("/configuracion/proyectos")
    }
  }, [proyectos, isLoading, isError, router])

  return (
    <div className="flex items-center justify-center py-20 text-sm text-muted-foreground gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      Abriendo el proyecto…
    </div>
  )
}
