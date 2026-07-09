"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { CalendarClock, ExternalLink, Loader2 } from "lucide-react"

import { useGetCiclosPreservacion } from "@/features/preservacion/api/use-get-ciclos"
import {
  ESTADO_ET,
  ESTADO_ET_LABEL,
  ESTADOS_ABIERTOS,
} from "@/features/preservacion/types"
import { useBreadcrumb } from "@/components/breadcrumb-context"

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

const ALL = "__all__"

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—"
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function diasHasta(iso: string | null | undefined): number | null {
  if (!iso) return null
  const target = new Date(iso)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  const ms = target.getTime() - hoy.getTime()
  return Math.round(ms / (1000 * 60 * 60 * 24))
}

// Chip de estado con color según semántica.
function EstadoBadge({ estado }: { estado: number }) {
  const label = ESTADO_ET_LABEL[estado] ?? String(estado)
  const cls =
    estado === ESTADO_ET.PENDIENTE
      ? "bg-amber-100 text-amber-800"
      : estado === ESTADO_ET.EN_PROCESO
        ? "bg-blue-100 text-blue-800"
        : estado === ESTADO_ET.COMPLETADO
          ? "bg-indigo-100 text-indigo-800"
          : estado === ESTADO_ET.APROBADO || estado === ESTADO_ET.FIRMADO
            ? "bg-green-100 text-green-800"
            : estado === ESTADO_ET.RECHAZADO
              ? "bg-red-100 text-red-800"
              : "bg-gray-100 text-gray-700"
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

export default function PreservacionDashboardPage() {
  useBreadcrumb([{ label: "Ejecución" }, { label: "Preservación" }])

  const [estado, setEstado] = useState<string>(ALL)
  const [desde, setDesde] = useState<string>("")
  const [hasta, setHasta] = useState<string>("")
  const [soloAbiertos, setSoloAbiertos] = useState(true)

  const { data, isLoading } = useGetCiclosPreservacion({
    desde: desde || null,
    hasta: hasta || null,
    estado: estado !== ALL ? Number(estado) : null,
  })

  const ciclos = data?.data ?? []

  const filtrados = useMemo(() => {
    return soloAbiertos ? ciclos.filter((c) => ESTADOS_ABIERTOS.has(c.estado)) : ciclos
  }, [ciclos, soloAbiertos])

  const stats = useMemo(() => {
    const abiertos = ciclos.filter((c) => ESTADOS_ABIERTOS.has(c.estado))
    const vencidos = abiertos.filter((c) => {
      const d = diasHasta(c.fechaPlanificada)
      return d != null && d < 0
    }).length
    const semanaProxima = abiertos.filter((c) => {
      const d = diasHasta(c.fechaPlanificada)
      return d != null && d >= 0 && d <= 7
    }).length
    return { total: ciclos.length, abiertos: abiertos.length, vencidos, semanaProxima }
  }, [ciclos])

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-blue-700" />
            Preservación
          </h1>
          <p className="text-sm text-muted-foreground">
            Ciclos de mantenimiento recurrente programados para este proyecto.
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total del proyecto" value={stats.total} />
        <StatCard label="Ciclos abiertos" value={stats.abiertos} highlight="blue" />
        <StatCard label="Vencidos" value={stats.vencidos} highlight="red" />
        <StatCard label="Próximos 7 días" value={stats.semanaProxima} highlight="amber" />
      </div>

      {/* Filtros */}
      <div className="rounded-xl border bg-white p-3 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Desde</label>
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Hasta</label>
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Estado</label>
          <Select value={estado} onValueChange={(v) => v && setEstado(v)}>
            <SelectTrigger className="w-44">
              <SelectValue>
                {estado === ALL ? "Todos" : ESTADO_ET_LABEL[Number(estado)] ?? "—"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {Object.entries(ESTADO_ET_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700 mb-2 cursor-pointer">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 accent-blue-900"
            checked={soloAbiertos}
            onChange={(e) => setSoloAbiertos(e.target.checked)}
          />
          Sólo abiertos
        </label>
      </div>

      {/* Tabla */}
      <div className="rounded-xl border bg-white overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando ciclos...
          </div>
        ) : filtrados.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            No hay ciclos de preservación para los filtros seleccionados.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Programado</TableHead>
                <TableHead>Elemento</TableHead>
                <TableHead>Tarea</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtrados.map((c) => {
                const dias = diasHasta(c.fechaPlanificada)
                const vencido = dias != null && dias < 0 && ESTADOS_ABIERTOS.has(c.estado)
                return (
                  <TableRow key={c.elementoTareaId}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className={vencido ? "font-medium text-red-700" : ""}>
                          {fmt(c.fechaPlanificada)}
                        </span>
                        {dias != null && ESTADOS_ABIERTOS.has(c.estado) && (
                          <span className="text-[11px] text-muted-foreground">
                            {dias < 0
                              ? `${Math.abs(dias)} día(s) vencido`
                              : dias === 0
                                ? "Hoy"
                                : `en ${dias} día(s)`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono text-xs text-blue-700 font-semibold">
                          {c.elementoTag}
                        </span>
                        <span className="text-sm text-gray-800">{c.elementoNombre}</span>
                        {c.elementoRetirado && (
                          <span className="text-[11px] text-red-600">Elemento retirado</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm text-gray-800">{c.tareaNombre}</span>
                        <span className="text-[11px] text-muted-foreground">
                          Cod. {c.tareaCodigo}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {c.cicloNumero > 0 ? `#${c.cicloNumero}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.periodoSemanasEfectivo != null ? `${c.periodoSemanasEfectivo} sem.` : "—"}
                    </TableCell>
                    <TableCell>
                      <EstadoBadge estado={c.estado} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Link
                        href={`/ejecucion/elementos?elementoId=${c.elementoId}`}
                        className="inline-flex items-center gap-1 text-xs text-blue-700 hover:text-blue-900"
                      >
                        Ver elemento
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

function StatCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: number
  highlight?: "blue" | "red" | "amber"
}) {
  const cls =
    highlight === "red"
      ? "text-red-700"
      : highlight === "amber"
        ? "text-amber-700"
        : highlight === "blue"
          ? "text-blue-700"
          : "text-gray-900"
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-bold ${cls}`}>{value}</p>
    </div>
  )
}
