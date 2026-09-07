"use client"

import { useEffect, useState } from "react"
import { useColoresPorEstado as useGetColoresPorEstado } from "../api/use-ifc-entidades"
import type { ColoresPorEstado, FiltroVisor } from "../types"

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
  /**
   * Filtro actual del visor. Si tiene NivelIds, el cálculo de estado del
   * elemento en backend respeta ese filtro (cuenta solo las tareas de esos
   * niveles). Sin filtro o sin NivelIds → comportamiento global.
   */
  filtro?: FiltroVisor | null
}

/**
 * Encapsula el toggle "Colores por estado" del visor:
 *  - Trae los buckets cuando el toggle está activo (react-query la cachea)
 *  - Aplica los colores al viewer cuando llegan
 *  - Cuando se apaga, llama applyColorPorEstado(null) para resetear
 *  - Se desactiva automáticamente al cambiar de archivo
 */
export function useColoresPorEstadoToggle({
  proyectoId, archivoId, archivoCargado, applyColorPorEstado, filtro,
}: Options) {
  const [activo, setActivo] = useState(false)

  // Reset al cambiar de archivo.
  useEffect(() => { setActivo(false) }, [archivoId])

  const habilitado = activo && archivoCargado
  const query = useGetColoresPorEstado(proyectoId, archivoId, habilitado, filtro)
  const buckets = query.data?.data ?? null

  // Aplicar al viewer cuando llegan los datos. Si se apaga, limpiar.
  // Solo PINTA. La limpieza la dispara la página vía `limpiar()` antes de
  // cambiar de modo: si cada hook limpiara al desactivarse, el orden de los
  // efectos (por declaración) podía hacer que el modo saliente borrara lo que el
  // entrante ya había pintado — pasa cuando la query del entrante viene cacheada.
  useEffect(() => {
    if (!archivoCargado) return
    if (!activo || !buckets) return
    void applyColorPorEstado(buckets)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, buckets, archivoCargado])

  /** Apaga el pintado de este modo (y su auto-isolate). La llama la página. */
  const limpiar = () => { void applyColorPorEstado(null) }

  return {
    activo,
    setActivo,
    limpiar,
    buckets,
    loading: query.isFetching && activo,
    error: query.error as Error | null,
  }
}
