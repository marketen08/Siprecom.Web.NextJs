"use client"

import { useNewCampo } from "../hooks/use-new-campo"
import { useCreateCampo } from "../api/use-create-campo"
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

export function NewCampoSheet() {
  const { isOpen, close } = useNewCampo()
  const mutation = useCreateCampo()

  const handleSubmit = (values: CampoFormValues) => {
    mutation.mutate(
      { ...values, tipoDato: values.tipoDato as CampoTipoDato },
      { onSuccess: close }
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
