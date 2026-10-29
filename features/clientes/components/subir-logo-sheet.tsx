"use client"

import { useEffect, useRef, useState } from "react"
import { ImageIcon, Upload, X } from "lucide-react"

import { useOpenClienteLogo } from "../hooks/use-open-cliente-logo"
import { useGetCliente } from "../api/use-get-cliente"
import { useUploadClienteLogo } from "../api/use-upload-cliente-logo"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

/** Mismo límite y formato que el campo de logo del formulario de alta. */
const LOGO_MAX_BYTES = 500 * 1024
const LOGO_MIME = "image/png"

/**
 * Carga del logo de una empresa, sin tocar nada más.
 *
 * El Admin puede cargarle el logo a las empresas que dio de alta él, pero no renombrarlas,
 * así que esto no puede ser el sheet de edición: serían dos permisos distintos en la misma
 * pantalla. El backend valida lo mismo (POST /clientes/{id}/logo).
 */
export function SubirLogoSheet() {
  const { id, isOpen, cerrarLogo } = useOpenClienteLogo()
  const { data } = useGetCliente(id)
  const upload = useUploadClienteLogo(id ?? "")

  const cliente = data?.data
  const inputRef = useRef<HTMLInputElement>(null)
  // El archivo y su URL de preview viajan juntos en un solo estado: separarlos obligaba a
  // sincronizarlos con un effect, y hacer setState dentro de un effect dispara un render en
  // cascada (la regla del linter lo corta).
  const [elegido, setElegido] = useState<{ file: File; url: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  const archivo = elegido?.file ?? null

  // Lo único que hace el effect es liberar la URL del preview anterior: es limpieza de un
  // recurso del browser, no sincronización de estado.
  useEffect(() => {
    if (!elegido) return
    return () => URL.revokeObjectURL(elegido.url)
  }, [elegido])

  /** Cierra y limpia. Va acá y no en un effect sobre isOpen, por lo mismo que arriba. */
  function cerrar() {
    setElegido(null)
    setError(null)
    cerrarLogo()
  }

  function elegir(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0] ?? null
    ev.target.value = "" // permite volver a elegir el mismo archivo
    if (!file) return
    if (file.type !== LOGO_MIME) {
      setError("El logo tiene que ser un PNG.")
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      setError(`El archivo supera los ${LOGO_MAX_BYTES / 1024} KB.`)
      return
    }
    setError(null)
    setElegido({ file, url: URL.createObjectURL(file) })
  }

  async function guardar() {
    if (!archivo) return
    setError(null)
    try {
      await upload.mutateAsync(archivo)
      cerrar()
    } catch (e) {
      // Incluye el 403 del backend cuando la empresa no es de quien la quiere cambiar.
      setError((e as Error).message)
    }
  }

  const logoActual = cliente?.logoSasUrl ?? cliente?.urlLogo ?? null

  return (
    <Sheet open={isOpen} onOpenChange={(v) => !v && cerrar()}>
      <SheetContent className="w-full sm:max-w-md!">
        <SheetHeader>
          <SheetTitle>Logo — {cliente?.nombre ?? ""}</SheetTitle>
          <SheetDescription>
            Se usa en el encabezado de los PDF de los proyectos de esta empresa. PNG, hasta{" "}
            {LOGO_MAX_BYTES / 1024} KB.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
              {elegido || logoActual ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={elegido?.url ?? logoActual ?? ""}
                  alt={cliente?.nombre ?? "Logo"}
                  className="h-full w-full object-contain"
                />
              ) : (
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <input
                ref={inputRef}
                type="file"
                accept="image/png"
                className="hidden"
                onChange={elegir}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={upload.isPending}
                  onClick={() => inputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {logoActual || archivo ? "Cambiar" : "Elegir archivo"}
                </Button>
                {archivo && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    disabled={upload.isPending}
                    onClick={() => setElegido(null)}
                  >
                    <X className="h-4 w-4" />
                    Quitar
                  </Button>
                )}
              </div>
              {archivo && (
                <p className="truncate text-xs text-muted-foreground">{archivo.name}</p>
              )}
            </div>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" disabled={!archivo || upload.isPending} onClick={guardar}>
              {upload.isPending ? "Subiendo..." : "Guardar logo"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={cerrar}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
