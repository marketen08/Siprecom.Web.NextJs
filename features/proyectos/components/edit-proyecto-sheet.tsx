"use client"

import { useOpenProyecto } from "../hooks/use-open-proyecto"
import { useGetProyecto } from "../api/use-get-proyecto"
import { useUpdateProyecto } from "../api/use-update-proyecto"
import { ProyectoForm } from "./proyecto-form"
import type { ProyectoFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditProyectoSheet() {
  const { id, isOpen, close } = useOpenProyecto()
  const { data, isLoading } = useGetProyecto(id)
  const mutation = useUpdateProyecto(id ?? "")

  const proyecto = data?.data

  const onSubmit = (values: ProyectoFormValues) => {
    mutation.mutate(
      {
        nombre: values.nombre,
        clienteId: values.clienteId,
        contratistaId: values.contratistaId,
        estado: values.estado as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        observaciones: values.observaciones,
      },
      { onSuccess: close }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar proyecto</SheetTitle>
          <SheetDescription>
            Modificá los datos del proyecto.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : proyecto ? (
            <ProyectoForm
              defaultValues={proyecto}
              onSubmit={onSubmit}
              isPending={mutation.isPending}
              onCancel={close}
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el proyecto.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
