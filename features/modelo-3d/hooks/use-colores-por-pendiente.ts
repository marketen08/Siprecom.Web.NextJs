"use client"

import { useEffect, useState } from "react"

import { useColoresPorPendiente as useGetColoresPorPendiente } from "../api/use-ifc-entidades"
import type { ColoresPorPendiente, FiltroVisor } from "../types"
import type { GrupoColor } from "../unified-viewer"

/**
 * Paleta por criticidad del punch. El backend manda los buckets ordenados de más
 * a menos crítico (A, B, C, D…), así que el color va por posición: el primero
 * siempre es el rojo, sin importar cómo se llamen las categorías en el tenant.
 */
export const PALETA_PENDIENTES = [
  0xdc2626, // rojo   — la más crítica (A: bloquea)
  0xf97316, // naranja
  0xeab308, // amarillo
  0x3b82f6, // azul
  0xa855f7, // violeta
  0x64748b, // gris azulado
] as const

/** Elementos que tuvieron pendientes y ya no tienen ninguno abierto. */
export const COLOR_RESUELTOS = 0x10b981 // verde

interface Options {
  proyectoId: string | null
  archivoId: string | null
  archivoCargado: boolean
  applyColorPorGrupos: (grupos: GrupoColor[] | null) => Promise<void> | void
  filtro?: FiltroVisor | null
}

/**
 * Modo de coloreado "Pendientes" del visor 3D: pinta cada Elemento con el color
 * de la categoría de su pendiente abierto MÁS crítico, y en verde los que ya no
 * tienen ninguno abierto.
 *
 * Los elementos sin pendientes NO se pintan a propósito: son la mayoría, y
 * pintarlos taparía la señal. Se quedan con su color original.
 *
 * Excluyente con los otros modos de color — lo garantiza el selector de la página.
 */
export function useColoresPorPendienteToggle({
  proyectoId, archivoId, archivoCargado, applyColorPorGrupos, filtro,
}: Options) {
  const [activo, setActivo] = useState(false)

  useEffect(() => { setActivo(false) }, [archivoId])

  const habilitado = activo && archivoCargado
  const query = useGetColoresPorPendiente(proyectoId, archivoId, habilitado, filtro)
  const datos: ColoresPorPendiente | null = query.data?.data ?? null

  // Solo PINTA — ver el comentario en use-colores-por-estado sobre por qué la
  // limpieza vive en la página y no acá.
  useEffect(() => {
    if (!archivoCargado) return
    if (!activo || !datos) return

    const grupos: GrupoColor[] = datos.buckets.map((b, i) => ({
      guids: b.guids,
      ids: b.ids,
      hex: PALETA_PENDIENTES[Math.min(i, PALETA_PENDIENTES.length - 1)],
    }))
    if (datos.resueltos.guids.length > 0) {
      grupos.push({
        guids: datos.resueltos.guids,
        ids: datos.resueltos.ids,
        hex: COLOR_RESUELTOS,
      })
    }
    void applyColorPorGrupos(grupos)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, datos, archivoCargado])

  const limpiar = () => { void applyColorPorGrupos(null) }

  return {
    activo,
    setActivo,
    limpiar,
    datos,
    loading: query.isFetching && activo,
    error: query.error as Error | null,
  }
}
