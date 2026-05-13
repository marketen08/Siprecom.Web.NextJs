"use client"

import { useEffect, useState } from "react"
import { Save, Loader2, Trash2, Plus } from "lucide-react"

import { useGetPerfil } from "@/features/auth/api/use-get-perfil"
import { useGetProyecto } from "@/features/proyectos/api/use-get-proyecto"
import { useUpdateProyectoFlag } from "@/features/proyectos/api/use-update-proyecto-flag"
import { useGetEspecialidades } from "@/features/especialidades/api/use-especialidades"
import {
  useGetCapacidades,
  useUpsertCapacidades,
} from "@/features/planificacion/api/use-planificacion"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface FilaEditable {
  especialidadId: string
  horasPorDia: number
}

function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-medium text-gray-900">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5">{description}</div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${
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

export default function PlanificacionConfiguracionPage() {
  const { data: perfil } = useGetPerfil()
  const proyectoId = perfil?.proyectoId

  const { data: proyectoResp } = useGetProyecto(proyectoId ?? "")
  const proyecto = proyectoResp?.data
  const flagMut = useUpdateProyectoFlag(proyectoId ?? "")

  const { data: especialidadesResp } = useGetEspecialidades()
  const especialidades = especialidadesResp?.data ?? []

  const { data: capacidadesResp, isLoading: cargandoCap } = useGetCapacidades()
  const upsert = useUpsertCapacidades()

  const [filas, setFilas] = useState<FilaEditable[]>([])
  const [nuevaEspId, setNuevaEspId] = useState("")
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null)
  const [guardado, setGuardado] = useState(false)

  // Cuando llega la data del backend, la cargamos al estado local.
  useEffect(() => {
    const items = capacidadesResp?.data
    if (items) setFilas(items.map((c) => ({ especialidadId: c.especialidadId, horasPorDia: c.horasPorDia })))
  }, [capacidadesResp])

  const especialidadesNoUsadas = especialidades.filter(
    (e) => !filas.some((f) => f.especialidadId === e.id),
  )

  function actualizarHoras(especialidadId: string, valor: string) {
    const horas = parseFloat(valor)
    setFilas((prev) =>
      prev.map((f) =>
        f.especialidadId === especialidadId
          ? { ...f, horasPorDia: isNaN(horas) ? 0 : horas }
          : f,
      ),
    )
  }

  function eliminarFila(especialidadId: string) {
    setFilas((prev) => prev.filter((f) => f.especialidadId !== especialidadId))
  }

  function agregarFila() {
    if (!nuevaEspId) return
    setFilas((prev) => [...prev, { especialidadId: nuevaEspId, horasPorDia: 8 }])
    setNuevaEspId("")
  }

  async function guardar() {
    setErrorGuardar(null)
    setGuardado(false)
    try {
      await upsert.mutateAsync({ capacidades: filas })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2500)
    } catch (e) {
      setErrorGuardar((e as Error).message)
    }
  }

  if (!proyectoId) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Necesitás un proyecto activo para configurar la planificación.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración de planificación</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Calendario laboral y capacidad disponible por especialidad. Los usa el estimador
          para calcular cuántos días faltan para terminar el proyecto.
        </p>
      </div>

      {/* Calendario laboral */}
      <div className="rounded-lg border border-gray-100 bg-white p-5 space-y-4">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Calendario laboral</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            De lunes a viernes son siempre laborables. Activá los días extra si tu obra trabaja
            sábados y/o domingos.
          </p>
        </div>

        <div className="space-y-3">
          <ToggleSwitch
            label="Incluir sábados"
            description="Los sábados cuentan como día laborable en el estimador."
            checked={proyecto?.incluirSabado ?? false}
            onChange={(v) =>
              flagMut.mutate({ campo: "IncluirSabado", valor: v })
            }
            disabled={flagMut.isPending || !proyecto}
          />
          <ToggleSwitch
            label="Incluir domingos"
            description="Los domingos cuentan como día laborable en el estimador."
            checked={proyecto?.incluirDomingo ?? false}
            onChange={(v) =>
              flagMut.mutate({ campo: "IncluirDomingo", valor: v })
            }
            disabled={flagMut.isPending || !proyecto}
          />
        </div>
      </div>

      {/* Capacidad por especialidad */}
      <div className="rounded-lg border border-gray-100 bg-white p-5 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Capacidad por especialidad</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Horas-hombre disponibles por día laborable para cada disciplina. Ej: 3 técnicos
              eléctricos × 8 horas = 24 h/día.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button onClick={guardar} disabled={upsert.isPending} className="gap-2">
              {upsert.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Save className="h-4 w-4" />}
              {upsert.isPending ? "Guardando..." : "Guardar capacidades"}
            </Button>
          </div>
        </div>

        {errorGuardar && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorGuardar}
          </div>
        )}
        {guardado && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            Capacidades guardadas.
          </div>
        )}

        <div className="rounded-lg border bg-white overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Especialidad</TableHead>
                <TableHead className="w-44">Horas / día</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cargandoCap ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Cargando...</TableCell>
                </TableRow>
              ) : filas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                    No hay capacidades configuradas. Agregá una especialidad abajo.
                  </TableCell>
                </TableRow>
              ) : (
                filas.map((f) => {
                  const esp = especialidades.find((e) => e.id === f.especialidadId)
                  return (
                    <TableRow key={f.especialidadId}>
                      <TableCell>
                        <span className="inline-flex items-center gap-2">
                          {esp?.color && (
                            <span
                              className="inline-block h-2.5 w-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: esp.color }}
                            />
                          )}
                          <span className="font-medium">
                            {esp?.codigo ? `${esp.codigo} — ${esp.nombre}` : esp?.nombre ?? "(especialidad desconocida)"}
                          </span>
                        </span>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={f.horasPorDia}
                          onChange={(e) => actualizarHoras(f.especialidadId, e.target.value)}
                          className="w-32"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-red-600"
                          onClick={() => eliminarFila(f.especialidadId)}
                          title="Quitar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Agregar especialidad no usada */}
        {especialidadesNoUsadas.length > 0 && (
          <div className="flex items-end gap-2">
            <div className="flex-1 max-w-md">
              <label className="text-xs font-medium text-gray-600">Agregar especialidad</label>
              <Select value={nuevaEspId || "__none__"} onValueChange={(v) => setNuevaEspId(v === "__none__" ? "" : (v ?? ""))}>
                <SelectTrigger className="mt-1">
                  <SelectValue>
                    {nuevaEspId
                      ? especialidades.find((e) => e.id === nuevaEspId)?.nombre ?? "—"
                      : "Seleccionar especialidad"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Seleccionar especialidad</SelectItem>
                  {especialidadesNoUsadas.map((esp) => (
                    <SelectItem key={esp.id} value={esp.id}>
                      {esp.codigo ? `${esp.codigo} — ${esp.nombre}` : esp.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={agregarFila} disabled={!nuevaEspId} variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Agregar
            </Button>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Recordá hacer click en <strong>Guardar capacidades</strong> después de editar.
        </p>
      </div>
    </div>
  )
}
