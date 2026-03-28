"use client"

import { useNewCliente } from "../hooks/use-new-cliente"
import { useCreateCliente } from "../api/use-create-cliente"
import { ClienteForm } from "./cliente-form"
import type { ClienteFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewClienteSheet() {
  const { isOpen, close } = useNewCliente()
  const mutation = useCreateCliente()

  const onSubmit = (values: ClienteFormValues) => {
    mutation.mutate(
      {
        nombre: values.nombre,
        urlLogo: values.urlLogo || undefined,
        esContratista: values.esContratista,
      },
      { onSuccess: close }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo cliente</SheetTitle>
          <SheetDescription>
            Completá los datos para crear un nuevo cliente o contratista.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          <ClienteForm
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
