"use client"

import { useOpenElemento } from "../hooks/use-open-elemento"
import { useGetElemento } from "../api/use-get-elemento"
import { useUpdateElemento } from "../api/use-update-elemento"
import { ElementoForm } from "./elemento-form"
import type { ElementoFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditElementoSheet() {
  const { id, isOpen, close } = useOpenElemento()
  const { data, isLoading } = useGetElemento(id)
  const mutation = useUpdateElemento(id ?? "")

  const elemento = data?.data

  const onSubmit = (values: ElementoFormValues) => {
    mutation.mutate(
      {
        ...values,
        proyectoId: elemento!.proyectoId,
        terminalId: elemento!.terminalId,
        codigo: elemento!.codigo,
      },
      { onSuccess: close }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar elemento</SheetTitle>
          <SheetDescription>
            Modificá los datos del elemento.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : elemento ? (
            <ElementoForm
              defaultValues={elemento}
              onSubmit={onSubmit}
              isPending={mutation.isPending}
              onCancel={close}
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el elemento.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
