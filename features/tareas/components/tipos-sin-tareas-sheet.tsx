"use client"

import Link from "next/link"
import { AlertTriangle, Boxes, CheckCircle2, Info, Loader2 } from "lucide-react"

import { useGetTiposSinTareas } from "@/features/tareas/api/use-tipos-sin-tareas"

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

/**
 * Tipos de elemento que están en la obra y no tienen ninguna tarea en el catálogo.
 *
 * Es la contracara de LimpiarTareasSinElementosSheet, y existe porque este agujero no se ve
 * en ninguna otra pantalla: "Generación de tareas" arranca de las tareas y sólo mira
 * elementos de los tipos que YA tienen tareas, así que los tipos sin ninguna son invisibles
 * ahí. Y en el avance esos elementos no aportan ni al numerador ni al denominador: un
 * subsistema puede marcar 100% conteniendo elementos sin nada asignado.
 *
 * Sólo lectura: la salida es crear o importar las tareas que faltan, y eso no se puede
 * adivinar desde acá.
 */
export function TiposSinTareasSheet({ open, onClose }: Props) {
  const { data: preview, isLoading } = useGetTiposSinTareas(open)

  const fisicos = preview?.tipos.filter((t) => !t.esSintetico) ?? []
  const sinteticos = preview?.tipos.filter((t) => t.esSintetico) ?? []

  const sinElementos = preview != null && preview.elementosActivos === 0
  const todoCubierto = preview != null && !sinElementos && preview.tipos.length === 0

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-3xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Tipos sin tareas</SheetTitle>
          <SheetDescription>
            Tipos de elemento que están cargados en la obra y no tienen ninguna tarea en el
            catálogo del proyecto. Sus elementos no aparecen en Generación de tareas y no
            aportan al avance, así que pasan desapercibidos.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4 px-4 pb-6">
          {isLoading && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Comparando el catálogo con el alcance…
            </p>
          )}

          {preview && (
            <>
              <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm">
                <p className="font-medium text-gray-900">Alcance cargado</p>
                <dl className="mt-1 grid max-w-sm grid-cols-2 gap-x-3 gap-y-1 text-gray-700">
                  <dt>Elementos activos</dt>
                  <dd className="text-right font-medium">{preview.elementosActivos}</dd>
                  <dt>Tipos presentes</dt>
                  <dd className="text-right font-medium">{preview.tiposPresentes}</dd>
                  <dt>Tipos sin tareas</dt>
                  <dd className="text-right font-medium">{preview.tiposSinTareas}</dd>
                  <dt>Elementos sin ninguna tarea</dt>
                  <dd className="text-right font-medium">{preview.elementosAfectados}</dd>
                </dl>
              </div>

              {sinElementos && (
                <p className="flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    El proyecto todavía no tiene elementos cargados, así que no hay alcance con
                    el que comparar el catálogo. Importá los elementos y volvé acá.
                  </span>
                </p>
              )}

              {todoCubierto && (
                <p className="flex gap-2 rounded-md bg-green-50 px-3 py-2 text-sm text-green-800">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Todos los tipos de elemento presentes en la obra tienen tareas en el
                    catálogo.
                  </span>
                </p>
              )}

              {fisicos.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-900">
                    A estos <span className="font-semibold">{fisicos.length}</span> tipo(s) les
                    falta configurar tareas en el proyecto:
                  </p>

                  <div className="overflow-hidden rounded-md border">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-xs text-gray-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">Tipo de elemento</th>
                          <th className="px-3 py-2 text-left font-medium">Especialidad</th>
                          <th className="px-3 py-2 text-right font-medium">Elementos</th>
                          <th className="px-3 py-2 text-right font-medium">Sin ninguna tarea</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {fisicos.map((t) => (
                          <tr key={t.elementoTipoId}>
                            <td className="px-3 py-2 font-medium text-gray-900">
                              {t.elementoTipoNombre ?? "(tipo sin nombre)"}
                            </td>
                            <td className="px-3 py-2 text-gray-600">
                              {t.especialidadNombre ?? "—"}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-700">{t.elementos}</td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {t.elementosSinNingunaTarea}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* La diferencia entre las dos columnas es información, no un error: a esos
                      elementos los cubre algo que no es el catálogo de su tipo —una tarea
                      puntual asignada a mano, o un test pack—, así que el tipo sigue sin
                      configurar pero esos elementos no están fuera del seguimiento. */}
                  {fisicos.some((t) => t.elementosSinNingunaTarea < t.elementos) && (
                    <p className="flex gap-2 text-xs text-muted-foreground">
                      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>
                        Cuando la última columna es menor, al resto de los elementos los cubre
                        algo que no es el catálogo de su tipo: una tarea puntual asignada a
                        mano, o un paquete de prueba.
                      </span>
                    </p>
                  )}
                </div>
              )}

              {sinteticos.length > 0 && (
                <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-blue-900">
                    <Boxes className="h-4 w-4" />
                    {sinteticos.length} tipo(s) de paquete de prueba sin tareas
                  </p>
                  <p className="text-xs text-blue-800">
                    Son tipos sintéticos: no son elementos de la obra, son los portadores de las
                    tareas de un test pack. Que no tengan tareas significa que los paquetes de
                    ese tipo no llevan nada — es un problema de la configuración del paquete, no
                    del alcance, y por eso no entra en los números de arriba.
                  </p>
                  <ul className="space-y-0.5 text-xs text-blue-800">
                    {sinteticos.map((t) => (
                      <li key={t.elementoTipoId}>
                        <span className="font-medium">
                          {t.elementoTipoNombre ?? "(tipo sin nombre)"}
                        </span>
                        {t.especialidadNombre && ` · ${t.especialidadNombre}`}
                        {" · "}
                        {t.elementos} paquete(s)
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            {preview && preview.tipos.length > 0 && (
              <Link
                href="/alcance/importacion-tareas"
                className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-white px-3 text-sm font-medium hover:bg-gray-50"
                onClick={onClose}
              >
                Importar tareas
              </Link>
            )}
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
