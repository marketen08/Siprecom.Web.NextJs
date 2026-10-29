"use client"

import { useState } from "react"
import { AlertTriangle, Eraser, Info, Loader2 } from "lucide-react"

import {
  useGetTareasSinElementos,
  useLimpiarTareasSinElementos,
} from "@/features/tareas/api/use-tareas-sin-elementos"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  open: boolean
  onClose: () => void
}

function fecha(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-AR")
}

/**
 * Da de baja las tareas del proyecto cuyo tipo de elemento no está en el alcance.
 *
 * El caso: al crear un proyecto se le copia la configuración de otro, y en ese momento
 * todavía no hay elementos cargados, así que la copia se trae el catálogo completo del
 * origen. Las tareas de tipos que este proyecto no tiene quedan inertes — el generador
 * matchea por tipo de elemento, así que no instancian nada y tampoco salen en Faltantes—
 * pero ensucian el listado y mantienen planillas "en uso" impidiendo darlas de baja.
 *
 * Por eso esta limpieza corre DESPUÉS de importar los elementos: antes no hay con qué
 * comparar. El panel muestra el estado de esa carga arriba de todo, porque es el dato con
 * el que se decide — correrla a mitad de camino borra tareas que la tanda siguiente iba a
 * necesitar.
 */
export function LimpiarTareasSinElementosSheet({ open, onClose }: Props) {
  const [resultado, setResultado] = useState<string | null>(null)

  const { data: preview, isLoading } = useGetTareasSinElementos(open)
  const limpiarMut = useLimpiarTareasSinElementos()

  const errorDelApply = limpiarMut.error instanceof Error ? limpiarMut.error.message : null

  const cerrar = () => {
    setResultado(null)
    limpiarMut.reset()
    onClose()
  }

  const aplicar = async () => {
    const r = await limpiarMut.mutateAsync()
    setResultado(
      r ? `Se dieron de baja ${r.eliminadas} tarea(s).` : "Listo.",
    )
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && cerrar()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Limpiar tareas sin elementos</SheetTitle>
          <SheetDescription>
            Da de baja las tareas cuyo tipo de elemento no existe en este proyecto. Son las
            que la copia de configuración trajo de otra obra y que nunca van a asignarse a
            nada.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Analizando el catálogo…
            </p>
          )}

          {preview && (
            <>
              {/* Estado de la carga de elementos: el dato con el que se decide. */}
              <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">Alcance cargado</p>
                <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1 text-gray-700">
                  <dt>Elementos activos</dt>
                  <dd className="text-right font-medium">{preview.elementosActivos}</dd>
                  <dt>Tipos presentes</dt>
                  <dd className="text-right font-medium">{preview.tiposConElementos}</dd>
                  <dt>Último elemento cargado</dt>
                  <dd className="text-right font-medium">{fecha(preview.ultimoElementoCargado)}</dd>
                  <dt>Tareas del proyecto</dt>
                  <dd className="text-right font-medium">{preview.totalTareasProyecto}</dd>
                </dl>
              </div>

              {!preview.sePuedeAplicar && (
                <p className="flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{preview.motivoNoAplicable}</span>
                </p>
              )}

              {preview.sePuedeAplicar && preview.tareasABorrar === 0 && (
                <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
                  No hay nada para limpiar: todas las tareas tienen elementos de su tipo en
                  el proyecto.
                </p>
              )}

              {preview.tareasABorrar > 0 && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-900">
                    Se darían de baja{" "}
                    <span className="font-semibold">{preview.tareasABorrar}</span> de{" "}
                    {preview.totalTareasProyecto} tareas, en{" "}
                    {preview.grupos.length} tipo(s) de elemento sin presencia en la obra:
                  </p>

                  {preview.grupos.map((g) => (
                    <div key={g.elementoTipoId} className="rounded-md border px-3 py-2">
                      <p className="text-sm font-medium text-gray-900">
                        {g.elementoTipoNombre ?? "(tipo sin nombre)"}
                        {g.especialidadNombre && (
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            · {g.especialidadNombre}
                          </span>
                        )}
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          · {g.tareas.length} tarea(s)
                        </span>
                      </p>
                      <ul className="mt-1 space-y-0.5 text-xs text-gray-600">
                        {g.tareas.map((t) => (
                          <li key={t.id}>
                            <span className="font-mono">{t.codigo}</span> — {t.nombre}
                            {t.nivelNombre && ` · ${t.nivelNombre}`}
                            {t.planillaCodigo && ` · ${t.planillaCodigo}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {preview.excluidas.length > 0 && (
                <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-blue-900">
                    <Info className="h-4 w-4" />
                    {preview.excluidas.length} quedan afuera
                  </p>
                  <ul className="mt-1 space-y-0.5 text-xs text-blue-800">
                    {preview.excluidas.map((e) => (
                      <li key={e.id}>
                        <span className="font-mono">{e.codigo}</span> — {e.nombre}: {e.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {errorDelApply && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorDelApply}</p>
          )}

          {resultado && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">{resultado}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={cerrar} disabled={limpiarMut.isPending}>
              {resultado ? "Cerrar" : "Cancelar"}
            </Button>
            {!resultado && (
              <Button
                variant="destructive"
                onClick={aplicar}
                disabled={
                  !preview ||
                  !preview.sePuedeAplicar ||
                  preview.tareasABorrar === 0 ||
                  limpiarMut.isPending
                }
                className="gap-1.5"
              >
                <Eraser className="h-4 w-4" />
                {limpiarMut.isPending
                  ? "Limpiando…"
                  : `Dar de baja ${preview?.tareasABorrar ?? 0}`}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
