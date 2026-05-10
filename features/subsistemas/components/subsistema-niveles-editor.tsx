"use client"

import { useEffect, useState } from "react"
import { CalendarRange, Save, Loader2 } from "lucide-react"

import {
  useGetSubSistemaNiveles,
  useUpsertSubSistemaNiveles,
} from "../api/use-subsistema-niveles"
import { useGetNivelesSelect } from "@/features/niveles/api/use-get-niveles-select"
import type { SubSistemaNivelUpsertInput } from "../types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Props {
  subSistemaId: string
}

interface NivelCatalogo {
  id: string
  nombre: string
  posicion: number
}

interface RowState {
  nivelId: string
  nivelNombre: string
  nivelPosicion: number
  activo: boolean
  fechaInicio: string
  fechaFin: string
}

export function SubSistemaNivelesEditor({ subSistemaId }: Props) {
  const { data: nivelesRaw, isLoading: loadingNiveles } = useGetNivelesSelect()
  const { data: filasRaw, isLoading: loadingFilas } = useGetSubSistemaNiveles(subSistemaId)
  const upsert = useUpsertSubSistemaNiveles(subSistemaId)

  const niveles: NivelCatalogo[] = (nivelesRaw as any)?.data ?? []
  const filasPlanificadas = filasRaw?.data ?? []

  const [rows, setRows] = useState<RowState[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  // Sincronizar el estado local cuando se cargan las dos fuentes (catálogo + filas existentes).
  useEffect(() => {
    if (niveles.length === 0) return
    const ordenados = [...niveles].sort((a, b) => a.posicion - b.posicion)
    const next = ordenados.map<RowState>((n) => {
      const existente = filasPlanificadas.find((f) => f.nivelId === n.id)
      return {
        nivelId: n.id,
        nivelNombre: n.nombre,
        nivelPosicion: n.posicion,
        activo: !!existente,
        fechaInicio: existente?.fechaInicio?.substring(0, 10) ?? "",
        fechaFin: existente?.fechaFin?.substring(0, 10) ?? "",
      }
    })
    setRows(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [niveles.length, filasPlanificadas.length])

  function updateRow(i: number, patch: Partial<RowState>) {
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)))
    if (saved) setSaved(false)
    if (error) setError(null)
  }

  async function handleGuardar() {
    setError(null)
    const items: SubSistemaNivelUpsertInput[] = rows
      .filter((r) => r.activo)
      .map((r) => ({
        nivelId: r.nivelId,
        fechaInicio: r.fechaInicio || null,
        fechaFin: r.fechaFin || null,
      }))

    try {
      await upsert.mutateAsync(items)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loadingNiveles || loadingFilas) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando planificación por nivel...
      </div>
    )
  }

  if (niveles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-3">
        No hay niveles definidos en el sistema. Cargá niveles primero desde la configuración.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" />
        Planificación por nivel
      </div>
      <p className="text-xs text-muted-foreground">
        Marcá los niveles que atraviesa este subsistema y cargá las fechas planeadas para cada uno.
      </p>

      <div className="rounded-md border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left text-xs font-medium text-gray-600 px-3 py-2 w-12">Aplica</th>
              <th className="text-left text-xs font-medium text-gray-600 px-3 py-2">Nivel</th>
              <th className="text-left text-xs font-medium text-gray-600 px-3 py-2">Inicio</th>
              <th className="text-left text-xs font-medium text-gray-600 px-3 py-2">Fin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.nivelId} className="border-t">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={r.activo}
                    onChange={(e) => updateRow(i, { activo: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </td>
                <td className="px-3 py-2 font-medium">{r.nivelNombre}</td>
                <td className="px-3 py-2">
                  <Input
                    type="date"
                    value={r.fechaInicio}
                    onChange={(e) => updateRow(i, { fechaInicio: e.target.value })}
                    disabled={!r.activo || upsert.isPending}
                    className="h-8"
                  />
                </td>
                <td className="px-3 py-2">
                  <Input
                    type="date"
                    value={r.fechaFin}
                    onChange={(e) => updateRow(i, { fechaFin: e.target.value })}
                    disabled={!r.activo || upsert.isPending}
                    className="h-8"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {saved && <p className="text-xs text-green-700">Guardado</p>}

      <Button
        size="sm"
        onClick={handleGuardar}
        disabled={upsert.isPending}
        className="gap-1.5"
      >
        {upsert.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Save className="h-3.5 w-3.5" />
        )}
        Guardar planificación
      </Button>

      <p className="sr-only">
        <Label>{/* etiqueta semántica oculta */}</Label>
      </p>
    </div>
  )
}
