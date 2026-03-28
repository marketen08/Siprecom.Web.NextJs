"use client"

import { useOpenSistema } from "../hooks/use-open-sistema"
import { useGetSistema } from "../api/use-get-sistema"
import { useUpdateSistema } from "../api/use-update-sistema"
import { SistemaForm } from "./sistema-form"
import type { SistemaFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditSistemaSheet() {
  const { id, isOpen, close } = useOpenSistema()
  const { data, isLoading } = useGetSistema(id)
  const mutation = useUpdateSistema(id ?? "")

  const sistema = data?.data

  const onSubmit = (values: SistemaFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar sistema</SheetTitle>
          <SheetDescription>
            Modificá los datos del sistema.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : sistema ? (
            <SistemaForm
              defaultValues={sistema}
              onSubmit={onSubmit}
              isPending={mutation.isPending}
              onCancel={close}
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el sistema.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
