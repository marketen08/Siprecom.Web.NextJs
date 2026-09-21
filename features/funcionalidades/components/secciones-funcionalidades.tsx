"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ChevronRight } from "lucide-react"

/** Lo mínimo que una funcionalidad necesita para agruparse. */
export interface FuncionalidadAgrupable {
  clave: string
  categoria: string
  categoriaOrden: number
}

/**
 * Funcionalidades agrupadas en secciones colapsables, con cuántas están activas en el
 * encabezado de cada una.
 *
 * La usan la pantalla del proyecto y la global del SuperAdmin: la lista pasaba las veinte
 * filas y se leía como veinte cosas del mismo peso. Agrupar por módulo la vuelve
 * navegable, y la categoría viene del backend, así las dos pantallas se agrupan igual y
 * una funcionalidad nueva ya nace en su sección.
 *
 * Colapsado por defecto: esta pantalla se abre para cambiar UNA cosa, no para leerla
 * entera. Lo que se perdería al colapsar —ver qué está prendido— lo devuelve el contador
 * del encabezado, así que el panorama está sin abrir nada.
 *
 * Recuerda qué secciones quedaron abiertas, por pantalla. Si el navegador no deja
 * guardar (modo privado, storage bloqueado) arranca todo colapsado y sigue funcionando.
 */
export function SeccionesFuncionalidades<T extends FuncionalidadAgrupable>({
  items,
  estaActiva,
  renderFila,
  storageKey,
}: {
  items: T[]
  estaActiva: (f: T) => boolean
  renderFila: (f: T) => ReactNode
  /** Clave para recordar las secciones abiertas; distinta por pantalla. */
  storageKey: string
}) {
  const secciones = useMemo(() => {
    const porCategoria = new Map<string, { orden: number; items: T[] }>()
    for (const f of items) {
      const s = porCategoria.get(f.categoria) ?? { orden: f.categoriaOrden, items: [] }
      s.items.push(f)
      porCategoria.set(f.categoria, s)
    }
    return [...porCategoria.entries()]
      .map(([nombre, s]) => ({ nombre, ...s }))
      .sort((a, b) => a.orden - b.orden)
  }, [items])

  // Inicializador perezoso y no un effect: leer el storage en un effect y después hacer
  // setState dispara un segundo render que se nota como un parpadeo de secciones.
  //
  // No hay riesgo de que el HTML del servidor difiera del cliente: las dos pantallas
  // montan este componente recién cuando llegan los datos, que en el servidor no están
  // (no hay prefetch). Si algún día se prefetchearan, esto habría que moverlo a
  // useSyncExternalStore.
  const [abiertas, setAbiertas] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set()
    try {
      const guardado = window.localStorage.getItem(storageKey)
      return guardado ? new Set(JSON.parse(guardado) as string[]) : new Set()
    } catch {
      return new Set() // storage no disponible: arranca todo colapsado
    }
  })

  function toggle(nombre: string) {
    setAbiertas((prev) => {
      const next = new Set(prev)
      if (next.has(nombre)) next.delete(nombre)
      else next.add(nombre)
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]))
      } catch {
        /* no se recuerda, pero la sección se abre igual */
      }
      return next
    })
  }

  return (
    <div className="space-y-2">
      {secciones.map((s) => {
        const abierta = abiertas.has(s.nombre)
        const activas = s.items.filter(estaActiva).length
        return (
          <section key={s.nombre} className="overflow-hidden rounded-lg border bg-white">
            <button
              type="button"
              onClick={() => toggle(s.nombre)}
              aria-expanded={abierta}
              className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-gray-50"
            >
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${abierta ? "rotate-90" : ""}`}
              />
              <span className="flex-1 text-sm font-semibold text-gray-900">{s.nombre}</span>
              <span className="text-xs tabular-nums text-muted-foreground">
                {activas === 0
                  ? "ninguna activa"
                  : `${activas} de ${s.items.length} activa${activas === 1 ? "" : "s"}`}
              </span>
            </button>
            {/* Dentro de la sección las filas van con divisores y no como tarjetas
                sueltas: la sección ya es la tarjeta, y veinte bordes apilados eran
                buena parte del peso visual de la pantalla. */}
            {abierta && (
              <div className="divide-y border-t">
                {s.items.map((f) => (
                  <div key={f.clave} className="px-4 py-3">
                    {renderFila(f)}
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}
