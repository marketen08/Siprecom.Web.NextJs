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
  /** Sheet ancho (4xl en vez del default 2xl). */
  wide?: boolean
}

export function NewPendienteSheet({ hideOverlay, wide }: NewPendienteSheetProps = {}) {
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
      <SheetContent
        className={`w-full overflow-y-auto ${wide ? "sm:max-w-4xl!" : "sm:max-w-2xl!"}`}
        hideOverlay={hideOverlay}
      >
        {/* Header sticky en mobile para que el título siga a la vista al
            scrollear el form largo (y así el X de cerrar quede accesible). */}
        <SheetHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b pr-10">
          <SheetTitle className="text-base sm:text-lg">Nuevo pendiente</SheetTitle>
          <SheetDescription className="text-xs sm:text-sm">
            {desdePid
              ? `Se registrará en el PID ${prefill?.pid ?? ""} (pág. ${prefill?.pidPagina}).`
              : "Levantá una observación o trabajo pendiente del proyecto."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 sm:mt-6 px-3 sm:px-4 pb-2 sm:pb-6">
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
