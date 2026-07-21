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

interface NewPendienteSheetProps {
  /** Oculta el backdrop — usado desde el visor de PID para que se siga viendo el plano. */
  hideOverlay?: boolean
}

export function NewPendienteSheet({ hideOverlay }: NewPendienteSheetProps = {}) {
  const { isOpen, close, prefill } = useNewPendiente()
  const mutation = useCreatePendiente()

  const desdePid = !!prefill?.pidArchivoId

  const onSubmit = (values: PendienteFormValues) => {
    // Los 4 campos PID no viven en el form: cuando vienen del visor los pegamos
    // al payload en el submit (el backend valida que van los 4 juntos).
    mutation.mutate(
      {
        ...values,
        pidArchivoId: prefill?.pidArchivoId ?? null,
        pidPagina: prefill?.pidPagina ?? null,
        pidCoordX: prefill?.pidCoordX ?? null,
        pidCoordY: prefill?.pidCoordY ?? null,
      },
      { onSuccess: close },
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto" hideOverlay={hideOverlay}>
        <SheetHeader>
          <SheetTitle>Nuevo pendiente</SheetTitle>
          <SheetDescription>
            {desdePid
              ? `Se registrará en el PID ${prefill?.pid ?? ""} (pág. ${prefill?.pidPagina}).`
              : "Levantá una observación o trabajo pendiente del proyecto."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <PendienteForm
            defaultValues={{
              elementoId: prefill?.elementoId ?? null,
              subSistemaId: prefill?.subSistemaId ?? null,
              especialidadId: prefill?.especialidadId ?? null,
              pid: prefill?.pid ?? null,
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
