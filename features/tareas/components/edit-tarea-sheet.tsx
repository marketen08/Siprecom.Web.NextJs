"use client"

import { useOpenTarea } from "../hooks/use-open-tarea"
import { useGetTarea } from "../api/use-get-tarea"
import { useUpdateTarea } from "../api/use-update-tarea"
import { TareaForm } from "./tarea-form"
import type { TareaFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditTareaSheet() {
  const { id, isOpen, close } = useOpenTarea()
  const { data: tareaResult, isLoading } = useGetTarea(id)
  const mutation = useUpdateTarea()

  const tarea = (tareaResult as any)?.data ?? tareaResult

  const onSubmit = (values: TareaFormValues) => {
    mutation.mutate(
      { ...values, id: id!, proyectoId: tarea?.proyectoId ?? "" },
      { onSuccess: close }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar tarea</SheetTitle>
          <SheetDescription>
            Modificá los datos de la tarea.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : tarea ? (
            <TareaForm
              defaultValues={tarea}
              onSubmit={onSubmit}
              isPending={mutation.isPending}
              onCancel={close}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
