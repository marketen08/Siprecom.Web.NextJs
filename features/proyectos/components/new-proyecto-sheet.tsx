"use client"

import { useNewProyecto } from "../hooks/use-new-proyecto"
import { useCreateProyecto } from "../api/use-create-proyecto"
import { ProyectoForm } from "./proyecto-form"
import type { ProyectoFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewProyectoSheet() {
  const { isOpen, close } = useNewProyecto()
  const mutation = useCreateProyecto()

  const onSubmit = (values: ProyectoFormValues) => {
    const tienePlantilla = !!values.proyectoPlantillaId
    mutation.mutate(
      {
        nombre: values.nombre,
        clienteId: values.clienteId,
        contratistaId: values.contratistaId,
        estado: values.estado as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        observaciones: values.observaciones,
        proyectoPlantillaId: tienePlantilla ? values.proyectoPlantillaId : undefined,
        clonar: tienePlantilla && values.clonar ? {
          tareas: values.clonar.tareas ?? true,
          flags: values.clonar.flags ?? true,
          firmas: values.clonar.firmas ?? true,
          acceso: values.clonar.acceso ?? true,
          estructura: values.clonar.estructura ?? false,
        } : undefined,
      },
      { onSuccess: close }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo proyecto</SheetTitle>
          <SheetDescription>
            Completá los datos para crear un nuevo proyecto.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <ProyectoForm
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
            mostrarClonado
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
