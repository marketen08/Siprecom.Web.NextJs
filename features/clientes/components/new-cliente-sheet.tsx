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

interface NewClienteSheetProps {
  /** Fija el tipo (cliente o contratista) ocultando el selector. */
  esContratista?: boolean
}

export function NewClienteSheet({ esContratista }: NewClienteSheetProps = {}) {
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

  const tipoLabel = esContratista === true ? "contratista" : esContratista === false ? "cliente" : "cliente o contratista"

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo {tipoLabel}</SheetTitle>
          <SheetDescription>
            Completá los datos para crear un nuevo {tipoLabel}.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          <ClienteForm
            onSubmit={onSubmit}
            isPending={mutation.isPending}
            onCancel={close}
            fixedEsContratista={esContratista}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
