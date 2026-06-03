"use client"

import { useState } from "react"
import { FileUp, Loader2 } from "lucide-react"

import { useUploadIfcArchivo } from "../api/use-ifc-archivos"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  proyectoId: string
  open: boolean
  onClose: () => void
}

export function UploadIfcSheet({ proyectoId, open, onClose }: Props) {
  const [nombre, setNombre] = useState("")
  const [disciplina, setDisciplina] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = useUploadIfcArchivo(proyectoId)

  function reset() {
    setNombre("")
    setDisciplina("")
    setArchivo(null)
    setError(null)
  }

  function closeAndReset() {
    reset()
    onClose()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!archivo) {
      setError("Elegí un archivo .ifc.")
      return
    }
    if (!nombre.trim()) {
      setError("Poné un nombre al archivo.")
      return
    }
    if (!archivo.name.toLowerCase().endsWith(".ifc")) {
      setError("El archivo debe tener extensión .ifc.")
      return
    }
    if (archivo.size > 500 * 1024 * 1024) {
      setError("El archivo supera los 500 MB.")
      return
    }
    try {
      await upload.mutateAsync({
        nombre: nombre.trim(),
        disciplina: disciplina.trim() || undefined,
        archivo,
      })
      closeAndReset()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeAndReset()}>
      <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Cargar archivo IFC</SheetTitle>
          <SheetDescription>
            Subí un IFC del proyecto. Después podés visualizarlo en el viewer 3D.
            Tamaño máx 500 MB.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="mt-6 px-4 pb-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Planta principal - Eléctrico"
              className="mt-1"
              maxLength={500}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Disciplina</label>
            <Input
              value={disciplina}
              onChange={(e) => setDisciplina(e.target.value)}
              placeholder="Eléctrico, Mecánico, Civil, …"
              className="mt-1"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Opcional. Sirve para distinguir cuando el proyecto tiene varios archivos.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium">Archivo .ifc</label>
            <Input
              type="file"
              accept=".ifc"
              className="mt-1"
              onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
              required
            />
            {archivo && (
              <p className="text-xs text-muted-foreground mt-1">
                {archivo.name} · {Math.round(archivo.size / (1024 * 1024) * 10) / 10} MB
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={upload.isPending} className="flex-1 gap-2">
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {upload.isPending ? "Cargando…" : "Cargar"}
            </Button>
            <Button type="button" variant="outline" onClick={closeAndReset} className="flex-1">
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
