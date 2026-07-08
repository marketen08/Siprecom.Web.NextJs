"use client"

import { useOpenTarea } from "../hooks/use-open-tarea"
import { useGetTarea } from "../api/use-get-tarea"
import { useUpdateTarea } from "../api/use-update-tarea"
import { TareaForm } from "./tarea-form"
import { TareaFirmasConfigEditor } from "./tarea-firmas-config-editor"
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
            <>
              <TareaForm
                key={tarea.id}
                defaultValues={tarea}
                onSubmit={onSubmit}
                isPending={mutation.isPending}
                onCancel={close}
              />
              {mutation.isError && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-line">
                  {(mutation.error as Error)?.message ?? "Error al actualizar la tarea."}
                </div>
              )}

              {/* Editor de override de firmas por tarea. Aparece sólo si el registro
                  de esta tarea requiere firma (es decir, si el proyecto tiene
                  proyectoId — siempre en este flujo). */}
              {tarea?.proyectoId && (
                <TareaFirmasConfigEditor
                  key={`firmas-${tarea.id}`}
                  tareaId={tarea.id}
                  proyectoId={tarea.proyectoId}
                />
              )}
            </>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
