"use client"

import { useOpenElementoTipo } from "../hooks/use-open-elementotipo"
import { useGetElementoTipo } from "../api/use-get-elementotipo"
import { useUpdateElementoTipo } from "../api/use-update-elementotipo"
import { ElementoTipoForm } from "./elementotipo-form"
import type { ElementoTipoFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditElementoTipoSheet() {
  const { id, isOpen, close } = useOpenElementoTipo()
  const { data, isLoading } = useGetElementoTipo(id)
  const mutation = useUpdateElementoTipo(id ?? "")

  const tipo = data?.data

  const onSubmit = (values: ElementoTipoFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar tipo de elemento</SheetTitle>
          <SheetDescription>
            Modificá los datos del tipo de elemento.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : tipo ? (
            <ElementoTipoForm
              defaultValues={tipo}
              onSubmit={onSubmit}
              isPending={mutation.isPending}
              onCancel={close}
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el tipo de elemento.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
