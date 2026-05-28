"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"

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
  const createMutation = useCreateCliente()
  const qc = useQueryClient()
  const [busy, setBusy] = useState(false)
  const [logoWarning, setLogoWarning] = useState<string | null>(null)

  const onSubmit = async (values: ClienteFormValues, logoFile: File | null) => {
    setBusy(true)
    setLogoWarning(null)
    try {
      // Step 1: crear el cliente.
      const created: any = await createMutation.mutateAsync({
        nombre: values.nombre,
        esContratista: values.esContratista,
      })
      const nuevoId = created?.data?.id ?? created?.data?.Id

      // Step 2: si hay archivo, subir el logo. Si falla, el cliente ya quedó creado
      // y avisamos al admin para que reintente desde "Editar".
      if (logoFile && nuevoId) {
        try {
          const fd = new FormData()
          fd.append("archivo", logoFile, logoFile.name)
          const res = await fetch(`/api/clientes/${nuevoId}/logo`, { method: "POST", body: fd })
          if (!res.ok) {
            const body = await res.json().catch(() => ({}))
            setLogoWarning(body?.message ?? "El cliente se creó pero falló la subida del logo. Cargalo desde \"Editar\".")
            return
          }
        } catch {
          setLogoWarning("El cliente se creó pero falló la subida del logo. Cargalo desde \"Editar\".")
          return
        } finally {
          qc.invalidateQueries({ queryKey: ["clientes"] })
        }
      }
      close()
    } finally {
      setBusy(false)
    }
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
          {logoWarning && (
            <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              {logoWarning}
            </p>
          )}
          <ClienteForm
            onSubmit={onSubmit}
            isPending={busy || createMutation.isPending}
            onCancel={close}
            fixedEsContratista={esContratista}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}
