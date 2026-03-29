"use client"

import { useOpenUsuario } from "../hooks/use-open-usuario"
import { useGetUsuario } from "../api/use-get-usuario"
import { useUpdateUsuario } from "../api/use-update-usuario"
import { UsuarioForm } from "./usuario-form"
import { UsuarioProyectosPanel } from "./usuario-proyectos-panel"
import type { UsuarioFormValues } from "../schema"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

export function EditUsuarioSheet() {
  const { id, isOpen, close } = useOpenUsuario()
  const { data: result, isLoading } = useGetUsuario(id)
  const mutation = useUpdateUsuario()

  const usuario = (result as any)?.data?.[0] ?? null

  const onSubmit = (values: UsuarioFormValues) => {
    mutation.mutate(
      { id: id!, ...values },
      { onSuccess: close }
    )
  }

  return (
    <Sheet open={isOpen} onOpenChange={close}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar usuario</SheetTitle>
          <SheetDescription>
            Modificá los datos y los proyectos del usuario.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 px-4 pb-6 flex flex-col gap-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando...</p>
          ) : usuario ? (
            <>
              <UsuarioForm
                defaultValues={usuario}
                onSubmit={onSubmit}
                isPending={mutation.isPending}
                onCancel={close}
              />
              <Separator />
              <UsuarioProyectosPanel usuarioId={id!} />
            </>
          ) : (
            <p className="text-sm text-destructive">No se pudo cargar el usuario.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
