"use client"

import { useEffect, useState } from "react"
import { useColoresPorTestGroup as useGetColoresPorTestGroup } from "../api/use-ifc-entidades"
import type { ColoresPorTestGroup, FiltroVisor } from "../types"

interface Options {
  proyectoId: string | null
  archivoId: string | null
  archivoCargado: boolean
  applyColorPorTestGroup: (buckets: ColoresPorTestGroup | null) => Promise<void> | void
  filtro?: FiltroVisor | null
}

/**
 * Toggle "Colores por TestGroup" del visor 3D. Mismo patrón que el toggle
 * "Colores por estado" pero pintando cada pack de un color distinto. Es
 * mutuamente excluyente con Colores por estado — la página se encarga de
 * apagar uno al prender el otro.
 */
export function useColoresPorTestGroupToggle({
  proyectoId, archivoId, archivoCargado, applyColorPorTestGroup, filtro,
}: Options) {
  const [activo, setActivo] = useState(false)

  useEffect(() => { setActivo(false) }, [archivoId])

  const habilitado = activo && archivoCargado
  const query = useGetColoresPorTestGroup(proyectoId, archivoId, habilitado, filtro)
  const buckets = query.data?.data ?? null

  useEffect(() => {
    if (!archivoCargado) return
    if (activo && buckets) {
      void applyColorPorTestGroup(buckets)
    } else if (!activo) {
      void applyColorPorTestGroup(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, buckets, archivoCargado])

  return {
    activo,
    setActivo,
    buckets,
    loading: query.isFetching && activo,
    error: query.error as Error | null,
  }
}
