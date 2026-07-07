"use client"

import { useNewCampo } from "../hooks/use-new-campo"
import { useCreateCampo } from "../api/use-create-campo"
import { useCreateOpcion } from "../api/use-create-opcion"
import { CampoForm } from "./campo-form"
import type { CampoFormValues } from "../schema"
import type { CampoTipoDato } from "@/features/planillas/types"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

// Preset de opciones para campos Checklist recién creados desde el catálogo.
// Cuando el usuario crea un Campo Checklist ahí, seguramente lo va a usar como
// verificación Sí/No/N/A — le ahorramos abrir el editor de opciones aparte.
const OPCIONES_CHECKLIST_PRESET: Array<{ valor: string; etiqueta: string }> = [
  { valor: "SI", etiqueta: "Sí" },
  { valor: "NO", etiqueta: "No" },
  { valor: "NA", etiqueta: "No Aplica" },
]

export function NewCampoSheet() {
  const { isOpen, close } = useNewCampo()
  const mutation = useCreateCampo()
  const createOpcion = useCreateOpcion()

  const handleSubmit = (values: CampoFormValues) => {
    mutation.mutate(
      { ...values, tipoDato: values.tipoDato as CampoTipoDato },
      {
        onSuccess: async (result: any) => {
          // Si es Checklist, precargamos Sí/No/N/A en el catálogo. Los errores
          // no bloquean el flujo — el usuario puede completar/editar después.
          if (values.tipoDato === 11) {
            const newId = result?.data?.id ?? result?.id
            if (newId) {
              for (let i = 0; i < OPCIONES_CHECKLIST_PRESET.length; i++) {
                const op = OPCIONES_CHECKLIST_PRESET[i]
                try {
                  await createOpcion.mutateAsync({
                    campoId: newId,
                    valor: op.valor,
                    etiqueta: op.etiqueta,
                    orden: i + 1,
                  })
                } catch { /* opción ya existe o error transitorio; ignoramos */ }
              }
            }
          }
          close()
        },
      }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo campo</SheetTitle>
          <SheetDescription>
            Definí un campo reutilizable. Después podrás agregarlo a las planillas que quieras.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <CampoForm
            onSubmit={handleSubmit}
            onCancel={close}
            isPending={mutation.isPending}
          />
          {mutation.isError && (
            <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-line">
              {(mutation.error as Error)?.message ?? "Error al guardar el campo."}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
