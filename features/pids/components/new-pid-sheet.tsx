"use client"

import { useNewPid } from "../hooks/use-new-pid"
import { useCreatePid } from "../api/use-mutate-pids"
import { PidForm } from "./pid-form"
import type { PidArchivoFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewPidSheet() {
  const { isOpen, close } = useNewPid()
  const mutation = useCreatePid()

  const onSubmit = (values: PidArchivoFormValues, archivo: File | null) => {
    if (!archivo) return
    mutation.mutate(
      {
        codigo: values.codigo,
        nombre: values.nombre,
        descripcion: values.descripcion || undefined,
        subSistemaIds: values.subSistemaIds ?? [],
        archivo,
      },
      { onSuccess: close },
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo PID</SheetTitle>
          <SheetDescription>
            Subí el PDF del diagrama y completá los datos. Podés vincularlo a los subsistemas
            que representa.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <PidForm
            requireArchivo
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
          />
          {mutation.error && (
            <p className="text-sm text-destructive mt-3 whitespace-pre-line">
              {(mutation.error as Error).message}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
