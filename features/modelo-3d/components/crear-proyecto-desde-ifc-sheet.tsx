"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Box, Loader2 } from "lucide-react"

import { useCrearProyectoDesdeIfc } from "../api/use-crear-proyecto-desde-ifc"
import { useCrearProyectoDesdeNwd } from "../api/use-crear-proyecto-desde-nwd"
import { useGetClientes } from "@/features/clientes/api/use-get-clientes"
import type { Cliente } from "@/features/clientes/types"

// Extensiones soportadas. .ifc va por el pipeline xbim (sincronico) y .nwd por
// APS Model Derivative → SVF2 (background, puede tardar minutos).
const EXTENSIONES_ACEPTADAS = [".ifc", ".nwd"]

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet"

interface Props {
  open: boolean
  onClose: () => void
}

/**
 * Sheet para crear un proyecto nuevo desde un archivo IFC. El backend crea el
 * Proyecto + sube el blob + encola un job de bootstrap. Después de submit
 * redirigimos a la página modelo-3d del proyecto creado, donde el polling
 * existente muestra el progreso.
 */
export function CrearProyectoDesdeIfcSheet({ open, onClose }: Props) {
  const router = useRouter()
  const [nombre, setNombre] = useState("")
  const [clienteId, setClienteId] = useState("")
  const [nombreArchivo, setNombreArchivo] = useState("")
  const [disciplina, setDisciplina] = useState("")
  const [archivo, setArchivo] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data: clientesRaw } = useGetClientes({ pageSize: 200 })
  const clientes: Cliente[] = clientesRaw?.data ?? []

  const crearIfc = useCrearProyectoDesdeIfc()
  const crearNwd = useCrearProyectoDesdeNwd()
  const enviando = crearIfc.isPending || crearNwd.isPending
  // Extensión del archivo elegido — define qué pipeline usar al submit.
  const ext = archivo?.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? null
  const esNwd = ext === ".nwd"

  function reset() {
    setNombre("")
    setClienteId("")
    setNombreArchivo("")
    setDisciplina("")
    setArchivo(null)
    setError(null)
  }

  function closeAndReset() {
    if (enviando) return // no cerrar durante el upload
    reset()
    onClose()
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!archivo) { setError(`Elegí un archivo ${EXTENSIONES_ACEPTADAS.join(" o ")}.`); return }
    if (!nombre.trim()) { setError("Ponele un nombre al proyecto."); return }
    if (!clienteId) { setError("Elegí un cliente."); return }
    if (!ext || !EXTENSIONES_ACEPTADAS.includes(ext)) {
      setError(`El archivo debe tener extensión ${EXTENSIONES_ACEPTADAS.join(" o ")}.`)
      return
    }
    if (archivo.size > 500 * 1024 * 1024) {
      setError("El archivo supera los 500 MB.")
      return
    }
    try {
      const mutator = esNwd ? crearNwd : crearIfc
      const out = await mutator.mutateAsync({
        nombre: nombre.trim(),
        clienteId,
        nombreArchivo: nombreArchivo.trim() || undefined,
        disciplina: disciplina.trim() || undefined,
        archivo,
      })
      reset()
      onClose()
      router.push(`/alcance/proyectos/${out.proyectoId}/modelo-3d`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && closeAndReset()}>
      <SheetContent className="w-full sm:max-w-md! overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Crear proyecto desde archivo 3D</SheetTitle>
          <SheetDescription>
            Subí un archivo IFC o NWD y el sistema crea el proyecto, Sistemas,
            SubSistemas y Elementos automáticamente. El bootstrap corre en
            background — vas a ver el progreso en la página del modelo 3D.
            <br />
            <span className="block mt-1 text-[11px] text-muted-foreground">
              <b>IFC</b>: jerarquía por <code>IfcBuilding</code> / <code>IfcBuildingStorey</code>.
              <b className="ml-1">NWD</b>: agrupación por archivo origen + categoría AutoCAD
              (Plant 3D). Equipment con <code>AutoCad.Tag</code> se vinculan como Elementos.
              La traducción APS puede tardar varios minutos.
            </span>
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="mt-6 px-4 pb-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre del proyecto</label>
            <Input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Planta Petroquímica - Fase 1"
              className="mt-1"
              maxLength={500}
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium">Cliente</label>
            <select
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              className="mt-1 w-full h-9 rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar cliente…</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Nombre del archivo</label>
            <Input
              value={nombreArchivo}
              onChange={(e) => setNombreArchivo(e.target.value)}
              placeholder="Maqueta general"
              className="mt-1"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Opcional. Si lo dejás vacío, se usa el nombre del proyecto.
            </p>
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
                {esNwd && <span className="ml-2 text-amber-700">— pipeline APS (~5-30 min)</span>}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700 whitespace-pre-wrap">
              {error}
            </div>
          )}

          {enviando && (
            <div className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {esNwd
                ? "Subiendo NWD a Autodesk y creando el proyecto…"
                : "Subiendo IFC y creando el proyecto…"}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={enviando} className="flex-1 gap-2">
              {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Box className="h-4 w-4" />}
              {enviando ? "Creando…" : "Crear proyecto"}
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
