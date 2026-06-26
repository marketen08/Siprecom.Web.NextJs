"use client"

import { useEffect, useMemo, useState } from "react"
import { Loader2, Save, Sparkles } from "lucide-react"

import {
  useGetElementoPlanillasDisponibles,
  useGetElementoValoresPrecargados,
  useUpsertElementoValoresPrecargados,
} from "../api/use-elemento-valores-precargados"
import { useGetPlanillaEstructura } from "@/features/planillas/api/use-get-planilla-estructura"
import type {
  ElementoValorPrecargado,
  ElementoValorPrecargadoUpsertInput,
} from "../types"
import type { PlanillaCampoDetalle, PlanillaEstructura } from "@/features/planillas/types"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  elementoId: string
}

interface RowValue {
  valorTexto: string | null
  valorNumero: number | null
  valorFecha: string | null
  valorBit: boolean | null
}

const EMPTY_ROW: RowValue = {
  valorTexto: null,
  valorNumero: null,
  valorFecha: null,
  valorBit: null,
}

function buildInitialState(
  valores: ElementoValorPrecargado[],
): Record<string, RowValue> {
  const out: Record<string, RowValue> = {}
  for (const v of valores) {
    out[v.planillaCampoId] = {
      valorTexto: v.valorTexto,
      valorNumero: v.valorNumero,
      valorFecha: v.valorFecha ? v.valorFecha.substring(0, 10) : null,
      valorBit: v.valorBit,
    }
  }
  return out
}

function isRowEmpty(r: RowValue): boolean {
  return (
    (r.valorTexto === null || r.valorTexto === "") &&
    r.valorNumero === null &&
    (r.valorFecha === null || r.valorFecha === "") &&
    r.valorBit === null
  )
}

export function ElementoValoresPrecargadosEditor({ elementoId }: Props) {
  const [planillaId, setPlanillaId] = useState<string | null>(null)
  const [rows, setRows] = useState<Record<string, RowValue>>({})
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const { data: planillasRaw, isLoading: loadingPlanillas } =
    useGetElementoPlanillasDisponibles(elementoId)
  const { data: estructuraRaw, isLoading: loadingEstructura } =
    useGetPlanillaEstructura(planillaId)
  const { data: valoresRaw, isLoading: loadingValores } =
    useGetElementoValoresPrecargados(elementoId, planillaId)
  const upsert = useUpsertElementoValoresPrecargados(elementoId, planillaId ?? "")

  const planillas = (planillasRaw as { data?: { id: string; codigo: string; nombre: string }[] })?.data ?? []
  const estructura = ((estructuraRaw as { data?: PlanillaEstructura })?.data ?? estructuraRaw) as PlanillaEstructura | undefined
  const valores = valoresRaw?.data ?? []

  // Cuando llegan los valores existentes, hidratamos el estado local.
  useEffect(() => {
    if (!planillaId) return
    setRows(buildInitialState(valores))
    setSaved(false)
    setError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planillaId, valores.length])

  const camposVisibles = useMemo<PlanillaCampoDetalle[]>(() => {
    if (!estructura) return []
    return [...estructura.campos]
      .filter((c) => c.campoTipoDato !== 8 && c.campoTipoDato !== 10) // Imagen y Label no son inputs
      .sort((a, b) => a.orden - b.orden)
  }, [estructura])

  function updateRow(campoId: string, patch: Partial<RowValue>) {
    setRows((prev) => ({
      ...prev,
      [campoId]: { ...EMPTY_ROW, ...prev[campoId], ...patch },
    }))
    if (saved) setSaved(false)
    if (error) setError(null)
  }

  async function handleGuardar() {
    if (!planillaId) return
    setError(null)
    const items: ElementoValorPrecargadoUpsertInput[] = Object.entries(rows)
      .filter(([, v]) => !isRowEmpty(v))
      .map(([planillaCampoId, v]) => ({
        planillaCampoId,
        valorTexto: v.valorTexto,
        valorNumero: v.valorNumero,
        valorFecha: v.valorFecha,
        valorBit: v.valorBit,
      }))

    try {
      await upsert.mutateAsync(items)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  if (loadingPlanillas) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando planillas...
      </div>
    )
  }

  if (planillas.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic py-3">
        Este elemento no tiene tareas con planilla asignada. Sin planillas, no hay
        campos para precargar.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5" />
        Valores precargados por planilla
      </div>
      <p className="text-xs text-muted-foreground">
        Cargá los datos que vienen ya rellenados al iniciar el registro digital y se
        imprimen como datos pre-llenados en la planilla PDF en blanco.
      </p>

      <div>
        <Label className="text-xs">Planilla</Label>
        <Select
          value={planillaId ?? ""}
          onValueChange={(v) => setPlanillaId(v || null)}
        >
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Elegí una planilla..." />
          </SelectTrigger>
          <SelectContent>
            {planillas.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.codigo ? `${p.codigo} — ${p.nombre}` : p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {planillaId && (loadingEstructura || loadingValores) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando campos de la planilla...
        </div>
      )}

      {planillaId && !loadingEstructura && !loadingValores && camposVisibles.length === 0 && (
        <p className="text-sm text-muted-foreground italic py-3">
          La planilla no tiene campos cargables.
        </p>
      )}

      {planillaId && !loadingEstructura && !loadingValores && camposVisibles.length > 0 && (
        <>
          <div className="rounded-md border divide-y">
            {camposVisibles.map((campo) => {
              const row = rows[campo.id] ?? EMPTY_ROW
              return (
                <div key={campo.id} className="px-3 py-2.5 grid grid-cols-12 gap-3 items-center">
                  <div className="col-span-5">
                    <p className="text-sm font-medium">{campo.campoEtiqueta}</p>
                    {campo.campoUnidad && (
                      <p className="text-xs text-muted-foreground">{campo.campoUnidad}</p>
                    )}
                  </div>
                  <div className="col-span-7">
                    <CampoInput
                      campo={campo}
                      row={row}
                      onChange={(patch) => updateRow(campo.id, patch)}
                      disabled={upsert.isPending}
                    />
                  </div>
                </div>
              )
            })}
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
            Guardar precargados
          </Button>
        </>
      )}
    </div>
  )
}

interface CampoInputProps {
  campo: PlanillaCampoDetalle
  row: RowValue
  onChange: (patch: Partial<RowValue>) => void
  disabled?: boolean
}

function CampoInput({ campo, row, onChange, disabled }: CampoInputProps) {
  switch (campo.campoTipoDato) {
    case 2: // Número
      return (
        <Input
          type="number"
          step="any"
          value={row.valorNumero ?? ""}
          onChange={(e) => {
            const v = e.target.value
            onChange({ valorNumero: v === "" ? null : Number(v) })
          }}
          disabled={disabled}
          className="h-8"
        />
      )
    case 3: // Fecha
      return (
        <Input
          type="date"
          value={row.valorFecha ?? ""}
          onChange={(e) => onChange({ valorFecha: e.target.value || null })}
          disabled={disabled}
          className="h-8"
        />
      )
    case 4: // Boolean
      return (
        <Select
          value={row.valorBit === null ? "" : row.valorBit ? "true" : "false"}
          onValueChange={(v) =>
            onChange({ valorBit: v === "" ? null : v === "true" })
          }
          disabled={disabled}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">Sí</SelectItem>
            <SelectItem value="false">No</SelectItem>
          </SelectContent>
        </Select>
      )
    case 5: { // Lista
      const opciones = [...campo.opciones].sort((a, b) => a.orden - b.orden)
      return (
        <Select
          value={row.valorTexto ?? ""}
          onValueChange={(v) => onChange({ valorTexto: v || null })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8">
            <SelectValue placeholder="—" />
          </SelectTrigger>
          <SelectContent>
            {opciones.map((o) => (
              <SelectItem key={o.id} value={o.valor}>
                {o.etiqueta ?? o.valor}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    default: // 1 = Texto
      return (
        <Input
          type="text"
          value={row.valorTexto ?? ""}
          onChange={(e) => onChange({ valorTexto: e.target.value || null })}
          disabled={disabled}
          className="h-8"
        />
      )
  }
}
