"use client"

import { useOpenSubSistema } from "../hooks/use-open-subsistema"
import { useGetSubSistema } from "../api/use-get-subsistema"
import { useUpdateSubSistema } from "../api/use-update-subsistema"
import { SubSistemaForm } from "./subsistema-form"
import { SubSistemaNivelesEditor } from "./subsistema-niveles-editor"
import type { SubSistemaFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

export function EditSubSistemaSheet() {
  const { id, isOpen, close } = useOpenSubSistema()
  const { data, isLoading } = useGetSubSistema(id)
  const mutation = useUpdateSubSistema(id ?? "")

  const subsistema = data?.data

  const onSubmit = (values: SubSistemaFormValues) => {
    mutation.mutate(
      { ...values, proyectoId: subsistema!.proyectoId },
      { onSuccess: close }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar subsistema</SheetTitle>
          <SheetDescription>
            Modificá los datos del subsistema.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : subsistema ? (
            <div className="space-y-6">
              <SubSistemaForm
                defaultValues={subsistema}
                onSubmit={onSubmit}
                isPending={mutation.isPending}
                onCancel={close}
              />
              <Separator />
              <SubSistemaNivelesEditor subSistemaId={subsistema.id} />
            </div>
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el subsistema.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
