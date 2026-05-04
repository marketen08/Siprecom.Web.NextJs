"use client"

import { useNewTarea } from "../hooks/use-new-tarea"
import { useCreateTarea } from "../api/use-create-tarea"
import { useGetNextTareaCodigo } from "../api/use-get-next-codigo"
import { TareaForm } from "./tarea-form"
import type { TareaFormValues } from "../schema"
import { useGetMisProyectos } from "@/features/auth/api/use-get-mis-proyectos"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

export function NewTareaSheet() {
  const { isOpen, close, cloneFrom } = useNewTarea()
  const mutation = useCreateTarea()
  const { data: proyectos } = useGetMisProyectos()
  const proyectoActivo = proyectos?.find((p) => p.esActivo)

  const isClone = cloneFrom != null

  // Trae el próximo código disponible solo cuando el sheet está abierto.
  // Se usa tanto en "nueva" como en "clonar" para asegurar unicidad.
  const { data: nextCodigoRaw, isLoading: loadingNextCodigo } = useGetNextTareaCodigo(isOpen)
  const nextCodigo = nextCodigoRaw?.data?.codigo

  // En modo clonar, sufijamos el nombre y reemplazamos el código por el sugerido.
  const defaultValues = isClone
    ? { ...cloneFrom, nombre: cloneFrom?.nombre ? `${cloneFrom.nombre} (copia)` : "", codigo: nextCodigo ?? cloneFrom?.codigo ?? 0 }
    : nextCodigo
      ? { codigo: nextCodigo }
      : undefined

  const onSubmit = (values: TareaFormValues) => {
    mutation.mutate(
      { ...values, proyectoId: proyectoActivo?.id ?? "" },
      { onSuccess: close }
    )
  }

  // Esperar a que cargue el próximo código antes de montar el form, para
  // que react-hook-form reciba el valor sugerido en su initialState.
  const ready = isOpen && !loadingNextCodigo

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isClone ? "Clonar tarea" : "Nueva tarea"}</SheetTitle>
          <SheetDescription>
            {isClone
              ? "Datos pre-cargados desde la tarea original. Modificá los que sean distintos. El código se asigna automáticamente."
              : "Completá los datos para crear una nueva tarea."}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6">
          {/* key incluye nextCodigo para forzar remount cuando llegue el valor sugerido,
              y cloneFrom para que cambiar de tarea origen también lo reinicialice. */}
          {ready ? (
            <>
              <TareaForm
                key={`${cloneFrom?.id ?? "new"}-${nextCodigo ?? "0"}`}
                defaultValues={defaultValues}
                onSubmit={onSubmit}
                isPending={mutation.isPending}
                onCancel={close}
              />
              {mutation.isError && (
                <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 whitespace-pre-line">
                  {(mutation.error as Error)?.message ?? "Error al guardar la tarea."}
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
