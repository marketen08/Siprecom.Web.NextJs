"use client"

import { useEffect, useState } from "react"
import { FileUp, Loader2 } from "lucide-react"

import { useUploadIfcArchivo } from "../api/use-ifc-archivos"
import { setApsTagProperties } from "../api/use-aps-codificaciones"
import { useUploadNwd } from "@/features/aps/api/use-aps"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
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
  // Property names para el matching de TAG. Es config DEL PROYECTO, no del
  // archivo, así que arranca con lo que el proyecto ya tiene y solo se guarda si
  // el usuario la cambia. Sin esto había que ir a editar el proyecto antes de
  // subir, y si no lo hacías la maqueta se procesaba y vinculaba cero.
  const [tagProps, setTagProps] = useState("")

  const { data: proyectoRaw } = useGetProyecto(open ? proyectoId : null)
  const tagPropsProyecto = proyectoRaw?.data?.apsTagProperties ?? ""
  useEffect(() => { setTagProps(tagPropsProyecto) }, [tagPropsProyecto])

  const esNwd = (archivo?.name.toLowerCase().match(/.[^.]+$/)?.[0] ?? "") === ".nwd"

  const uploadIfc = useUploadIfcArchivo(proyectoId)
  const uploadNwd = useUploadNwd(proyectoId)
  const enviando = uploadIfc.isPending || uploadNwd.isPending

  function reset() {
    setNombre("")
    setDisciplina("")
    setArchivo(null)
    setMarcarPrincipal(false)
    setTagProps(tagPropsProyecto)
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
      // Guardar los property names ANTES de subir: el worker los lee del proyecto
      // cuando arranca a procesar, así que después del upload puede ser tarde.
      if (ext === ".nwd" && tagProps.trim() !== tagPropsProyecto.trim()) {
        await setApsTagProperties(proyectoId, tagProps.trim())
      }
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

          {/* Solo para NWD: el pipeline IFC (xbim) no usa matching por property.
              Se muestra recién al elegir el archivo, cuando sabemos la extensión. */}
          {esNwd && (
            <div>
              <label className="text-sm font-medium">
                Property names para matching de TAG
              </label>
              <Input
                value={tagProps}
                onChange={(e) => setTagProps(e.target.value)}
                placeholder="CADWorx.Tag,CADWorx.Line Number"
                disabled={enviando}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                De qué property del modelo sale el TAG, en orden (gana la primera con
                valor). Es configuración <b>del proyecto</b>: si la cambiás acá, queda
                para las próximas maquetas también. Vacío = se prueban los defaults y,
                si no vinculan nada, el sistema busca la property por su cuenta.
              </p>
              {tagPropsProyecto && tagProps.trim() !== tagPropsProyecto.trim() && (
                <p className="text-xs text-amber-700 mt-1">
                  El proyecto tenía <code>{tagPropsProyecto}</code> — se va a reemplazar.
                </p>
              )}
            </div>
          )}

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
