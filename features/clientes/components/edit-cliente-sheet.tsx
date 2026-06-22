"use client"

import { useState } from "react"

import { useOpenCliente } from "../hooks/use-open-cliente"
import { useGetCliente } from "../api/use-get-cliente"
import { useUpdateCliente } from "../api/use-update-cliente"
import { useUploadClienteLogo } from "../api/use-upload-cliente-logo"
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
  const updateMutation = useUpdateCliente(id ?? "")
  const uploadLogoMutation = useUploadClienteLogo(id ?? "")
  const [busy, setBusy] = useState(false)
  const [logoWarning, setLogoWarning] = useState<string | null>(null)

  const cliente = data?.data

  const onSubmit = async (values: ClienteFormValues, logoFile: File | null) => {
    if (!cliente) return
    setBusy(true)
    setLogoWarning(null)
    try {
      // Si el update falla (ej. nombre duplicado), el mensaje se muestra vía
      // updateMutation.error en el form; cortamos sin propagar el reject.
      try {
        await updateMutation.mutateAsync({
          nombre: values.nombre,
          // Tipo es read-only en edición: forzamos el valor original del backend.
          esContratista: cliente.esContratista,
        })
      } catch {
        return
      }

      if (logoFile) {
        try {
          await uploadLogoMutation.mutateAsync(logoFile)
        } catch (err) {
          setLogoWarning(
            (err as Error)?.message ?? "Los datos se guardaron pero falló la subida del logo. Reintentá."
          )
          return
        }
      }
      close()
    } finally {
      setBusy(false)
    }
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
          {logoWarning && (
            <p className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              {logoWarning}
            </p>
          )}
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : cliente ? (
            <ClienteForm
              defaultValues={cliente}
              onSubmit={onSubmit}
              isPending={busy || updateMutation.isPending || uploadLogoMutation.isPending}
              onCancel={close}
              readOnlyTipo
              errorMessage={updateMutation.isError ? (updateMutation.error as Error)?.message : null}
            />
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
