"use client"

import { useNewTarea } from "../hooks/use-new-tarea"
import { useCreateTarea } from "../api/use-create-tarea"
import { TareaForm } from "./tarea-form"
import type { TareaFormValues } from "../schema"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewTareaSheet() {
  const { isOpen, close } = useNewTarea()
  const mutation = useCreateTarea()
  const { data: proyectos } = useGetMisProyectos()
  const proyectoActivo = proyectos?.find((p) => p.esActivo)

  const onSubmit = (values: TareaFormValues) => {
    mutation.mutate(
      { ...values, proyectoId: proyectoActivo?.id ?? "" },
      { onSuccess: close }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nueva tarea</SheetTitle>
          <SheetDescription>
            Completá los datos para crear una nueva tarea.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <TareaForm
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
