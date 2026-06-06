"use client"

import { useEffect, useState } from "react"
import { filtrarEntidades } from "../api/use-ifc-entidades"
import { filtroVacio, isFiltroVacio, type FiltroResultado, type FiltroVisor } from "../types"

interface Options {
  proyectoId: string | null
  archivoId: string | null
  /** True cuando el archivo terminó de cargarse en el visor. */
  archivoCargado: boolean
  /**
   * Función para aplicar el ghost mode al viewer. Recibe los GUIDs que deben
   * quedar visibles. Pasale `null` para limpiar el ghost (todo vuelve a su
   * color original). La función puede retornar null/undefined si el viewer
   * aún no está disponible — el hook ignora el error.
   *
   * El segundo argumento `opts.hide` controla cómo se ven las entidades fuera
   * del filtro: true = invisibles, false (default) = semi-transparentes.
   * El hook lo deriva de `filtro.ocultarNoVinculadas`.
   */
  applyGhost: (visibleGuids: string[] | null, opts?: { hide?: boolean }) => Promise<void> | void
}

/**
 * Encapsula el ciclo de vida del filtro visual del visor 3D:
 *  - Mantiene el estado del filtro (multi-select por categoría)
 *  - Cuando cambia, llama al backend para resolver los GUIDs que matchean
 *  - Aplica/limpia el "ghost" sobre el viewer según el resultado
 * Las dos páginas (gestión y fullscreen) lo consumen igual.
 */
export function useFiltroVisor({
  proyectoId, archivoId, archivoCargado, applyGhost,
}: Options) {
  const [filtro, setFiltro] = useState<FiltroVisor>(filtroVacio())
  const [resultado, setResultado] = useState<FiltroResultado | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset cuando cambia el archivo.
  useEffect(() => {
    setFiltro(filtroVacio())
    setResultado(null)
    setError(null)
  }, [archivoId])

  useEffect(() => {
    if (!archivoCargado || !proyectoId || !archivoId) return

    // Filtro vacío → limpiar ghost.
    if (isFiltroVacio(filtro)) {
      setResultado(null)
      void applyGhost(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const r = await filtrarEntidades(proyectoId, archivoId, filtro)
        if (cancelled) return
        setResultado(r)
        // Cuando el modo "ocultar no vinculadas" está activo, le pedimos al
        // viewer que oculte los no-isolated en vez de atenuarlos. El backend
        // ya excluye las no-vinculadas de los GUIDs cuando ese flag está set.
        await applyGhost(r.guidsCoinciden, { hide: filtro.ocultarNoVinculadas })
      } catch (e) {
        if (!cancelled) setError((e as Error).message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro, archivoCargado, archivoId, proyectoId])

  return {
    filtro,
    setFiltro,
    resultado,
    loading,
    error,
    activo: !isFiltroVacio(filtro),
  }
}
