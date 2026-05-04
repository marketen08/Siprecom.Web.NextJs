"use client"

import { useOpenCliente } from "../hooks/use-open-cliente"
import { useGetCliente } from "../api/use-get-cliente"
import { useUpdateCliente } from "../api/use-update-cliente"
import { ClienteForm } from "./cliente-form"
import type { ClienteFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditClienteSheet() {
  const { id, isOpen, close } = useOpenCliente()
  const { data, isLoading } = useGetCliente(id)
  const mutation = useUpdateCliente(id ?? "")

  const cliente = data?.data

  const onSubmit = (values: ClienteFormValues) => {
    if (!cliente) return
    mutation.mutate(
      {
        nombre: values.nombre,
        urlLogo: values.urlLogo || undefined,
        // Tipo es read-only en edición: forzamos el valor original del backend
        esContratista: cliente.esContratista,
      },
      { onSuccess: close }
    )
  }

  const tipoLabel = cliente?.esContratista ? "contratista" : "cliente"

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar {tipoLabel}</SheetTitle>
          <SheetDescription>
            Modificá los datos del {tipoLabel}.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : cliente ? (
            <ClienteForm
              defaultValues={cliente}
              onSubmit={onSubmit}
              isPending={mutation.isPending}
              onCancel={close}
              readOnlyTipo
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
