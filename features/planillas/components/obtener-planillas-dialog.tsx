"use client"

import { useState, useMemo } from "react"
import { Download, Loader2, FileDown, X } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import { useGetSubSistemasSelect } from "@/features/subsistemas/api/use-get-subsistemas-select"
import { useGetElementosTiposSelect } from "@/features/elementostipos/api/use-get-elementostipos-select"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { apiClient } from "@/lib/api-client"
import type { ElementoTarea } from "@/features/elementos-tareas/types"
import type { PagedResponse } from "@/features/proyectos/types"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Nivel {
  id: string
  nombre: string
  posicion: number
}

interface Filtros {
  nivelId: string
  subSistemaId: string
  especialidadId: string
  elementoTipoId: string
  soloPendientes: boolean
  agruparPorTarea: boolean
}

// ─── Hook: buscar ElementoTareas con filtros ──────────────────────────────────

function useBuscarPlanillas(filtros: Filtros, proyectoId: string | undefined) {
  return useQuery({
    queryKey: ["planillas-bulk-search", filtros, proyectoId],
    queryFn: () =>
      apiClient.post<PagedResponse<ElementoTarea>>("/api/elementos-tareas/search", {
        filter: {
          proyectoId,
          tienePlanilla: true,
          ...(filtros.nivelId       && { nivelId:       filtros.nivelId }),
          ...(filtros.subSistemaId  && { subSistemaId:  filtros.subSistemaId }),
          ...(filtros.especialidadId && { especialidadId: filtros.especialidadId }),
          ...(filtros.elementoTipoId && { elementoTipoId: filtros.elementoTipoId }),
          ...(filtros.soloPendientes && { estado: 1 }), // 1 = PENDIENTE
        },
        page: 1,
        pageSize: 2000,
      }),
    enabled: !!proyectoId,
    staleTime: 1000 * 30,
  })
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  open: boolean
  onClose: () => void
}

export function ObtenerPlanillasDialog({ open, onClose }: Props) {
  const { data: perfil } = useGetPerfil()

  const [filtros, setFiltros] = useState<Filtros>({
    nivelId: "",
    subSistemaId: "",
    especialidadId: "",
    elementoTipoId: "",
    soloPendientes: false,
    agruparPorTarea: true,
  })

  const [descargando, setDescargando] = useState(false)

  // Datos para los selects
  const { data: nivelesRaw }       = useGetNivelesSelect()
  const { data: subSistemasRaw }   = useGetSubSistemasSelect()
  const { data: elementosTiposRaw} = useGetElementosTiposSelect()
  const { data: especialidadesRaw } = useGetEspecialidades()

  const nivelesResponse = nivelesRaw as { data: Nivel[] } | Nivel[] | undefined
  const niveles = Array.isArray(nivelesResponse)
    ? nivelesResponse
    : (nivelesResponse as { data: Nivel[] } | undefined)?.data ?? []
  const subSistemas   = subSistemasRaw?.data ?? []
  const elementosTipos = elementosTiposRaw?.data ?? []
  const especialidades = especialidadesRaw?.data ?? []

  // Búsqueda reactiva
  const { data: resultados, isLoading: buscando } = useBuscarPlanillas(
    filtros,
    perfil?.proyectoId
  )

  const tareas = resultados?.data ?? []
  const total  = tareas.length

  function set<K extends keyof Filtros>(key: K, value: Filtros[K]) {
    setFiltros((prev) => ({ ...prev, [key]: value }))
  }

  async function handleDescargar() {
    if (total === 0 || descargando) return
    setDescargando(true)
    try {
      const ids = tareas.map((t) => t.id)
      const res = await fetch("/api/planillas/pdf/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elementoTareaIds: ids, agruparPorTarea: filtros.agruparPorTarea }),
      })
      if (!res.ok) throw new Error("Error al generar el ZIP")
      const blob = await res.blob()
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href     = url
      a.download = `Planillas_Bulk_${new Date().toISOString().slice(0, 10)}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
    } finally {
      setDescargando(false)
    }
  }

  if (!open) return null

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-md mx-4 rounded-xl bg-white shadow-xl border border-gray-200">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Obtener planillas</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Seleccionar el filtro para obtener las planillas requeridas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors mt-0.5"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <Separator />

        {/* Filtros */}
        <div className="px-6 py-4 space-y-4">

          {/* Nivel */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Nivel</label>
            <Select
              value={filtros.nivelId || "__all__"}
              onValueChange={(v) => set("nivelId", v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filtros.nivelId
                    ? (niveles.find((n) => n.id === filtros.nivelId)?.nombre ?? "TODOS")
                    : "TODOS"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">TODOS</SelectItem>
                {[...niveles].sort((a, b) => a.posicion - b.posicion).map((n) => (
                  <SelectItem key={n.id} value={n.id}>{n.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subsistema */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Subsistema</label>
            <Select
              value={filtros.subSistemaId || "__all__"}
              onValueChange={(v) => set("subSistemaId", v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filtros.subSistemaId
                    ? (subSistemas.find((ss) => ss.id === filtros.subSistemaId)?.nombre ?? "TODOS")
                    : "TODOS"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">TODOS</SelectItem>
                {subSistemas.map((ss) => (
                  <SelectItem key={ss.id} value={ss.id}>
                    {ss.codigo} — {ss.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Especialidad */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Especialidad</label>
            <Select
              value={filtros.especialidadId || "__all__"}
              onValueChange={(v) => set("especialidadId", v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filtros.especialidadId
                    ? (especialidades.find((e) => e.id === filtros.especialidadId)?.nombre ?? "TODOS")
                    : "TODOS"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">TODOS</SelectItem>
                {especialidades.map((esp) => (
                  <SelectItem key={esp.id} value={esp.id}>
                    {esp.codigo ? `${esp.codigo} — ${esp.nombre}` : esp.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de elemento */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Tipo de elemento</label>
            <Select
              value={filtros.elementoTipoId || "__all__"}
              onValueChange={(v) => set("elementoTipoId", v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue>
                  {filtros.elementoTipoId
                    ? (elementosTipos.find((et) => et.id === filtros.elementoTipoId)?.nombre ?? "TODOS")
                    : "TODOS"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">TODOS</SelectItem>
                {elementosTipos.map((et) => (
                  <SelectItem key={et.id} value={et.id}>{et.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Toggles */}
          <div className="space-y-3">
            <Toggle
              label="Agrupar las planillas por nombre de la tarea"
              checked={filtros.agruparPorTarea}
              onChange={(v) => set("agruparPorTarea", v)}
            />
            <Toggle
              label="Descargar solo las planillas pendientes"
              checked={filtros.soloPendientes}
              onChange={(v) => set("soloPendientes", v)}
            />
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 gap-3">
          {/* Contador */}
          <span className="text-sm text-muted-foreground shrink-0">
            {buscando ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Calculando...
              </span>
            ) : (
              <span className={`font-medium ${total > 0 ? "text-gray-700" : "text-gray-400"}`}>
                ({total} planilla{total !== 1 ? "s" : ""} encontrada{total !== 1 ? "s" : ""})
              </span>
            )}
          </span>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cerrar
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleDescargar}
              disabled={total === 0 || descargando || buscando}
            >
              {descargando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              {descargando ? "Generando..." : "Descargar"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── Toggle accesible ─────────────────────────────────────────────────────────

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? "bg-blue-600" : "bg-gray-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}
