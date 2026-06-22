"use client"

import { useState } from "react"
import { FileUp, Loader2 } from "lucide-react"

import { useUploadIfcArchivo } from "../api/use-ifc-archivos"
import { useUploadNwd } from "@/features/aps/api/use-aps"
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

// Extensiones aceptadas — IFC pasa por xbim, NWD por APS Model Derivative.
const EXTENSIONES_ACEPTADAS = [".ifc", ".nwd"]

export function UploadIfcSheet({ proyectoId, open, onClose }: Props) {
  const [nombre, setNombre] = useState("")
  const [disciplina, setDisciplina] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [marcarPrincipal, setMarcarPrincipal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadIfc = useUploadIfcArchivo(proyectoId)
  const uploadNwd = useUploadNwd(proyectoId)
  const enviando = uploadIfc.isPending || uploadNwd.isPending

  function reset() {
    setNombre("")
    setDisciplina("")
    setArchivo(null)
    setMarcarPrincipal(false)
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
      setError("Elegí un archivo (.ifc o .nwd).")
      return
    }
    if (!nombre.trim()) {
      setError("Poné un nombre al archivo.")
      return
    }
    const ext = archivo.name.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (!ext || !EXTENSIONES_ACEPTADAS.includes(ext)) {
      setError(`El archivo debe tener extensión ${EXTENSIONES_ACEPTADAS.join(" o ")}.`)
      return
    }
    // NWD admite hasta 600 MB; IFC hasta 500 MB (pasa por la API).
    const maxMb = ext === ".nwd" ? 600 : 500
    if (archivo.size > maxMb * 1024 * 1024) {
      setError(`El archivo supera los ${maxMb} MB.`)
      return
    }
    try {
      if (ext === ".nwd") {
        await uploadNwd.mutateAsync({
          proyectoId,
          nombre: nombre.trim(),
          disciplina: disciplina.trim() || undefined,
          marcarComoPrincipal: marcarPrincipal,
          archivo,
        })
      } else {
        await uploadIfc.mutateAsync({
          nombre: nombre.trim(),
          disciplina: disciplina.trim() || undefined,
          archivo,
        })
      }
      closeAndReset()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeAndReset()}>
      <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Cargar archivo 3D</SheetTitle>
          <SheetDescription>
            Subí un IFC o un NWD del proyecto. Después podés visualizarlo en el
            viewer 3D. Tamaño máx 500 MB. El NWD se traduce automáticamente a
            SVF2 con Autodesk Platform Services (puede tardar unos minutos).
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
            <label className="text-sm font-medium">Archivo (.ifc o .nwd)</label>
            <Input
              type="file"
              accept=".ifc,.nwd"
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

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={marcarPrincipal}
              onChange={(e) => setMarcarPrincipal(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Marcar como archivo principal del proyecto</span>
          </label>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={enviando} className="flex-1 gap-2">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
              {enviando ? "Cargando…" : "Cargar"}
            </Button>
            <Button type="button" variant="outline" onClick={closeAndReset} className="flex-1" disabled={enviando}>
              Cancelar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
