"use client"

import { useOpenModulo } from "../hooks/use-open-modulo"
import { useGetModulo } from "../api/use-get-modulo"
import { useUpdateModulo } from "../api/use-update-modulo"
import { ModuloForm } from "./modulo-form"
import type { ModuloFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditModuloSheet() {
  const { id, isOpen, close } = useOpenModulo()
  const { data, isLoading } = useGetModulo(id)
  const mutation = useUpdateModulo(id ?? "")

  const modulo = data?.data

  const onSubmit = (values: ModuloFormValues) => {
    mutation.mutate(values, { onSuccess: close })
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar módulo</SheetTitle>
          <SheetDescription>Modificá los datos del módulo.</SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : modulo ? (
            <ModuloForm
              defaultValues={modulo}
              onSubmit={onSubmit}
              isPending={mutation.isPending}
              onCancel={close}
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el módulo.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
