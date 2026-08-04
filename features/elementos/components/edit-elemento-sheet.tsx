"use client"

import { useState } from "react"
import { AlertTriangle, Sparkles } from "lucide-react"

import { useOpenElemento } from "../hooks/use-open-elemento"
import { useGetElemento } from "../api/use-get-elemento"
import { useUpdateElemento } from "../api/use-update-elemento"
import { ElementoForm } from "./elemento-form"
import { ElementoValoresPrecargadosDialog } from "./elemento-valores-precargados-dialog"
import type { ElementoFormValues } from "../schema"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

export function EditElementoSheet() {
  const { id, isOpen, close } = useOpenElemento()
  const { data, isLoading } = useGetElemento(id)
  const mutation = useUpdateElemento(id ?? "")
  const [valoresOpen, setValoresOpen] = useState(false)

  const elemento = data?.data

  const onSubmit = (values: ElementoFormValues) => {
    mutation.mutate(
      {
        ...values,
        proyectoId: elemento!.proyectoId,
        terminalId: elemento!.terminalId,
        codigo: elemento!.codigo,
      },
      { onSuccess: close }
    )
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={close}>
        <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar elemento</SheetTitle>
            <SheetDescription>
              Modificá los datos del elemento.
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 px-4 pb-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : elemento && elemento.esSintetico ? (
              // Elemento sintético: es el portador de un TestGroup. Se crea y edita
              // desde el flujo del pack — no debería tocarse desde /alcance/elementos.
              // El backend también rechaza el PUT si esto se bypasea.
              <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
                <div className="space-y-1">
                  <p className="font-medium">Elemento no editable</p>
                  <p className="text-xs">
                    <strong>{elemento.tag}</strong> es el portador de un Test Group.
                    Se gestiona desde el detalle del pack, no desde acá.
                  </p>
                </div>
              </div>
            ) : elemento ? (
              <div className="space-y-6">
                <ElementoForm
                  defaultValues={elemento}
                  onSubmit={onSubmit}
                  isPending={mutation.isPending}
                  onCancel={close}
                />
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Valores precargados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Datos que vienen rellenados al iniciar el registro digital y se imprimen
                    en la planilla PDF en blanco. Se aplican a todas las planillas del elemento.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setValoresOpen(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Editar valores precargados
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-destructive">No se pudo cargar el elemento.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {elemento && (
        <ElementoValoresPrecargadosDialog
          elementoId={elemento.id}
          open={valoresOpen}
          onClose={() => setValoresOpen(false)}
        />
      )}
    </>
  )
}
