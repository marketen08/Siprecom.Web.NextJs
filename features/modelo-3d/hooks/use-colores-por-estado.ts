"use client"

import { useEffect, useState } from "react"
import { useColoresPorEstado as useGetColoresPorEstado } from "../api/use-ifc-entidades"
import type { ColoresPorEstado } from "../types"

interface Options {
  proyectoId: string | null
  archivoId: string | null
  /** True cuando el archivo ya está cargado en el viewer. */
  archivoCargado: boolean
  /**
   * Aplica los buckets de colores al viewer. Pasale `null` para limpiar
   * (volver al color IFC original).
   */
  applyColorPorEstado: (buckets: ColoresPorEstado | null) => Promise<void> | void
}

/**
 * Encapsula el toggle "Colores por estado" del visor:
 *  - Trae los buckets cuando el toggle está activo (react-query la cachea)
 *  - Aplica los colores al viewer cuando llegan
 *  - Cuando se apaga, llama applyColorPorEstado(null) para resetear
 *  - Se desactiva automáticamente al cambiar de archivo
 */
export function useColoresPorEstadoToggle({
  proyectoId, archivoId, archivoCargado, applyColorPorEstado,
}: Options) {
  const [activo, setActivo] = useState(false)

  // Reset al cambiar de archivo.
  useEffect(() => { setActivo(false) }, [archivoId])

  const habilitado = activo && archivoCargado
  const query = useGetColoresPorEstado(proyectoId, archivoId, habilitado)
  const buckets = query.data?.data ?? null

  // Aplicar al viewer cuando llegan los datos. Si se apaga, limpiar.
  useEffect(() => {
    if (!archivoCargado) return
    if (activo && buckets) {
      void applyColorPorEstado(buckets)
    } else if (!activo) {
      void applyColorPorEstado(null)
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
