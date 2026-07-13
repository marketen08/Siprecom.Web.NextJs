"use client"

import { useEffect, useState } from "react"

import { useOpenSeccion } from "../hooks/use-open-seccion"
import { useUpdateSeccion } from "../api/use-update-seccion"
import type { PlanillaSeccion } from "../types"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface EditSeccionSheetProps {
  /** Lista completa de secciones de la planilla (la actual se busca por id). */
  secciones: PlanillaSeccion[]
  planillaId: string
}

export function EditSeccionSheet({ secciones, planillaId }: EditSeccionSheetProps) {
  const { id, isOpen, close } = useOpenSeccion()
  const seccion = secciones.find((s) => s.id === id) ?? null

  const [nombre, setNombre] = useState("")
  const [nombreAlt, setNombreAlt] = useState("")
  const [descripcion, setDescripcion] = useState("")
  const [mostrarTitulo, setMostrarTitulo] = useState(true)

  const mutation = useUpdateSeccion()

  // Hidratar form cada vez que cambia la sección a editar.
  useEffect(() => {
    if (seccion) {
      setNombre(seccion.nombre)
      setNombreAlt(seccion.nombreAlt ?? "")
      setDescripcion(seccion.descripcion ?? "")
      // Default true por compat con secciones viejas (backend hace lo mismo).
      setMostrarTitulo(seccion.mostrarTitulo ?? true)
    }
  }, [seccion?.id, seccion?.nombre, seccion?.nombreAlt, seccion?.descripcion, seccion?.mostrarTitulo])

  const handleSave = () => {
    if (!seccion || !nombre.trim()) return
    mutation.mutate(
      {
        id: seccion.id,
        planillaId,
        nombre: nombre.trim(),
        nombreAlt: nombreAlt.trim() || null,
        descripcion: descripcion.trim() || undefined,
        orden: seccion.orden,
        mostrarTitulo,
      },
      { onSuccess: close }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar sección</SheetTitle>
          <SheetDescription>
            Modificá el nombre y la descripción. Estos cambios afectan solo a esta planilla.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 px-4 pb-6 space-y-4">
          {!seccion ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="seccion-nombre">Nombre *</Label>
                <Input
                  id="seccion-nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Datos generales"
                  disabled={mutation.isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seccion-nombre-alt">Nombre alternativo</Label>
                <Input
                  id="seccion-nombre-alt"
                  value={nombreAlt}
                  onChange={(e) => setNombreAlt(e.target.value)}
                  placeholder="General information (traducción o aclaración)"
                  maxLength={200}
                  disabled={mutation.isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Se renderiza debajo del título en itálica. Útil para traducciones o
                  aclaraciones. Dejalo vacío para no mostrar.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seccion-descripcion">Descripción</Label>
                <Textarea
                  id="seccion-descripcion"
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Notas o ayuda para esta sección (opcional)"
                  rows={4}
                  disabled={mutation.isPending}
                />
              </div>

              <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 mt-0.5"
                  checked={mostrarTitulo}
                  onChange={(e) => setMostrarTitulo(e.target.checked)}
                  disabled={mutation.isPending}
                />
                <span>
                  Mostrar título en el PDF
                  <span className="block text-xs text-muted-foreground">
                    Si lo desactivás, la sección funciona sólo como agrupador en el
                    editor — los campos se emiten al PDF sin el bloque de título.
                  </span>
                </span>
              </label>

              {mutation.isError && (
                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-line">
                  {(mutation.error as Error)?.message ?? "Error al guardar."}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className="flex-1 bg-blue-900 hover:bg-blue-800"
                  onClick={handleSave}
                  disabled={mutation.isPending || !nombre.trim()}
                >
                  {mutation.isPending ? "Guardando..." : "Guardar"}
                </Button>
                <Button variant="outline" onClick={close} disabled={mutation.isPending}>
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
