"use client"

import { Loader2 } from "lucide-react"

import { useOpenCampo } from "../hooks/use-open-campo"
import { useGetCampo } from "../api/use-get-campo"
import { useGetCampoUso } from "../api/use-get-campo-uso"
import { useUpdateCampoGlobal } from "../api/use-update-campo"
import { CampoForm } from "./campo-form"
import { CampoOpcionesEditor } from "./campo-opciones-editor"
import type { CampoFormValues } from "../schema"
import type { CampoTipoDato } from "@/features/planillas/types"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function EditCampoSheet() {
  const { id, isOpen, close } = useOpenCampo()
  const { data: result, isLoading } = useGetCampo(id)
  const campo = (result as any)?.data
  const { data: usoResult } = useGetCampoUso(id)
  const planillasUso = (usoResult as any)?.data ?? []
  const usoCount = campo?.usoCount ?? planillasUso.length ?? 0

  const mutation = useUpdateCampoGlobal()

  const handleSubmit = (values: CampoFormValues) => {
    if (!id) return
    mutation.mutate(
      { id, ...values, tipoDato: values.tipoDato as CampoTipoDato },
      { onSuccess: close }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar campo</SheetTitle>
          <SheetDescription>
            Cambios afectan a todas las planillas que usan este campo.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {isLoading || !campo ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : (
            <>
              <CampoForm
                key={campo.id}
                defaultValues={campo}
                usoCount={usoCount}
                onSubmit={handleSubmit}
                onCancel={close}
                isPending={mutation.isPending}
              />
              {mutation.isError && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-line">
                  {(mutation.error as Error)?.message ?? "Error al guardar el campo."}
                </div>
              )}

              {/* Editor de opciones — sólo para campos Lista (tipoDato === 5). */}
              {campo.tipoDato === 5 && id && <CampoOpcionesEditor campoId={id} />}

              {planillasUso.length > 0 && (
                <div className="mt-6 rounded-md border bg-gray-50 p-3">
                  <p className="text-xs font-semibold text-gray-700 mb-2">
                    Usado en {planillasUso.length} planilla{planillasUso.length !== 1 ? "s" : ""}:
                  </p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {planillasUso.map((p: any) => (
                      <li key={p.planillaId} className="flex gap-2">
                        {p.planillaCodigo && (
                          <span className="font-mono shrink-0">{p.planillaCodigo}</span>
                        )}
                        <span className="truncate">{p.planillaNombre}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
