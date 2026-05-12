"use client"

import { useNewPendiente } from "../hooks/use-new-pendiente"
import { useCreatePendiente } from "../api/use-create-pendiente"
import { PendienteForm } from "./pendiente-form"
import type { PendienteFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewPendienteSheet() {
  const { isOpen, close, prefill } = useNewPendiente()
  const mutation = useCreatePendiente()

  const onSubmit = (values: PendienteFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo pendiente</SheetTitle>
          <SheetDescription>
            Levantá una observación o trabajo pendiente del proyecto.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <PendienteForm
            defaultValues={{
              elementoId: prefill?.elementoId ?? null,
              subSistemaId: prefill?.subSistemaId ?? null,
              especialidadId: prefill?.especialidadId ?? null,
            }}
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
