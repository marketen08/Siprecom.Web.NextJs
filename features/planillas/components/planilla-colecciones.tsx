"use client"

import { useMemo, useState } from "react"
import { Plus, X } from "lucide-react"

import type { Planilla } from "../types"
import {
  useAsignarPlanillasAGrupo,
  useGetPlanillasGrupos,
  useQuitarPlanillaDeGrupo,
} from "@/features/planillas-grupos/api/use-planillas-grupos"

import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

/** Valor sentinela del select cuando no hay nada elegido — Base UI Select no acepta "". */
const NINGUNA = "__none__"

/**
 * Colecciones de la planilla, editables desde la propia planilla. Es el mismo M:N que se
 * administra en Configuración → Colecciones, visto del otro lado.
 *
 * Va fuera del form y aplica al instante (igual que el transfer de la colección): la
 * asignación no es un dato de la planilla sino una fila aparte, y atarla al "Guardar"
 * haría que cerrar el panel sin guardar la perdiera sin aviso.
 *
 * Solo se ofrecen las colecciones del MISMO dueño que la planilla y que quien mira puede
 * editar: el backend rechaza las demás (ver `AsignarPlanillasAsync`), y ofrecerlas sería
 * dejar elegir algo que va a fallar.
 */
export function PlanillaColecciones({ planilla }: { planilla: Planilla }) {
  const { data } = useGetPlanillasGrupos()
  const asignar = useAsignarPlanillasAGrupo()
  const quitar = useQuitarPlanillaDeGrupo()

  const [seleccion, setSeleccion] = useState(NINGUNA)
  const [error, setError] = useState<string | null>(null)

  const actuales = useMemo(() => planilla.grupos ?? [], [planilla.grupos])
  const colecciones = useMemo(() => data?.data ?? [], [data])
  // Para saber si una colección actual se puede tocar: el chip de la planilla no trae
  // `puedeEditar`, el listado de colecciones sí.
  const porId = useMemo(() => new Map(colecciones.map((c) => [c.id, c])), [colecciones])

  const dueno = planilla.equipoId ?? null
  const opciones = useMemo(() => {
    const yaEsta = new Set(actuales.map((g) => g.id))
    return colecciones.filter((c) =>
      !yaEsta.has(c.id)
      && (c.equipoId ?? null) === dueno
      && c.puedeEditar !== false)
  }, [colecciones, actuales, dueno])

  const elegida = opciones.find((c) => c.id === seleccion)

  async function agregar() {
    if (!elegida) return
    setError(null)
    try {
      await asignar.mutateAsync({ grupoId: elegida.id, planillaIds: [planilla.id] })
      setSeleccion(NINGUNA)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  async function sacar(grupoId: string) {
    setError(null)
    try { await quitar.mutateAsync({ grupoId, planillaId: planilla.id }) }
    catch (e) { setError((e as Error).message) }
  }

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">Colecciones</p>
        <p className="text-[11px] text-muted-foreground">
          {actuales.length === 0
            ? "Sin colección: disponible en todos los proyectos. Al sumarla a una, solo la ven los proyectos que la habilitan."
            : "Solo la ven los proyectos que habilitan alguna de estas colecciones. Los cambios se aplican al instante."}
        </p>
      </div>

      {actuales.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {actuales.map((g) => {
            const editable = porId.get(g.id)?.puedeEditar !== false
            return (
              <span
                key={g.id}
                className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 py-0.5 pl-2 pr-1 text-xs font-medium text-blue-800"
              >
                {g.nombre}
                <button
                  type="button"
                  className="rounded-full p-0.5 hover:bg-blue-100 disabled:opacity-40"
                  disabled={!editable || quitar.isPending}
                  onClick={() => sacar(g.id)}
                  title={editable ? "Quitar de la colección" : "No podés editar esta colección"}
                  aria-label={`Quitar de ${g.nombre}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Select value={seleccion} onValueChange={(v) => setSeleccion(v ?? NINGUNA)}>
          <SelectTrigger className="flex-1" disabled={opciones.length === 0}>
            <SelectValue>
              {elegida?.nombre
                ?? (opciones.length === 0 ? "No hay otras colecciones disponibles" : "Elegí una colección…")}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {opciones.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="gap-1"
          disabled={!elegida || asignar.isPending}
          onClick={agregar}
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </Button>
      </div>

      {error && (
        <p className="whitespace-pre-line rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
