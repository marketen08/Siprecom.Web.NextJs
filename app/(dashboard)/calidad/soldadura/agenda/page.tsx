"use client"

import { useMemo, useState } from "react"
import { BellRing, PenLine } from "lucide-react"

import { useAgenda, usePartes } from "@/features/soldadura/api/use-cierre"
import { ESTADO_TAREA_LABEL } from "@/features/soldadura/types-cierre"
import { CLASE_SELECT, Encabezado, FilaVacia } from "@/features/soldadura/components/comunes"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/** Fecha y hora local corta. Las fechas planificadas sí tienen hora: se muestran en la zona del navegador. */
function fechaHora(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

/**
 * Agenda de puntos de inspección: cada intervención de una parte en una tarea que todavía
 * no terminó. Primero lo que hay que atender: partes a convocar (ya entró en su aviso
 * previo) y firmas de puntos de espera pendientes.
 */
export default function AgendaPage() {
  const { data, isLoading } = useAgenda()
  const partes = usePartes()
  const [parte, setParte] = useState("")
  const [soloAtender, setSoloAtender] = useState(false)

  const filas = useMemo(
    () => (data ?? []).filter((a) => (!parte || a.parteId === parte) && (!soloAtender || a.convocar || a.firmaPendiente)),
    [data, parte, soloAtender],
  )
  const convocar = (data ?? []).filter((a) => a.convocar).length
  const firmas = (data ?? []).filter((a) => a.firmaPendiente).length

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Puntos de inspección"
        descripcion="Las intervenciones de cada parte en las tareas que no terminaron. Una parte se convoca desde la fecha planificada menos su aviso previo; un punto de espera queda pendiente hasta que la parte firma el registro."
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-amber-800"><BellRing className="h-4 w-4" /><strong className="tabular-nums">{convocar}</strong> a convocar</span>
        <span className="inline-flex items-center gap-1.5 text-red-700"><PenLine className="h-4 w-4" /><strong className="tabular-nums">{firmas}</strong> firmas de punto de espera pendientes</span>
        <div className="ml-auto flex items-center gap-4">
          <select value={parte} onChange={(e) => setParte(e.target.value)} className={`${CLASE_SELECT} w-56`}>
            <option value="">Todas las partes</option>
            {(partes.data ?? []).map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
            <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={soloAtender} onChange={(e) => setSoloAtender(e.target.checked)} />
            Solo lo que hay que atender
          </label>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-40 font-semibold text-gray-700">Tag</TableHead>
              <TableHead className="font-semibold text-gray-700">Tarea</TableHead>
              <TableHead className="font-semibold text-gray-700">Parte</TableHead>
              <TableHead className="w-20 font-semibold text-gray-700">Código</TableHead>
              <TableHead className="w-40 font-semibold text-gray-700">Planificada</TableHead>
              <TableHead className="w-40 font-semibold text-gray-700">Avisar desde</TableHead>
              <TableHead className="w-48 font-semibold text-gray-700">Situación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || filas.length === 0 ? (
              <FilaVacia columnas={7} cargando={isLoading} vacio="No hay puntos de inspección pendientes." />
            ) : filas.map((a) => (
              <TableRow key={`${a.elementoTareaId}-${a.parteId}`} className={a.firmaPendiente ? "bg-red-50/40" : a.convocar ? "bg-amber-50/40" : undefined}>
                <TableCell className="font-mono text-sm font-medium">{a.elementoTag}</TableCell>
                <TableCell className="text-sm">
                  {a.tareaNombre}
                  <span className="block text-xs text-muted-foreground">{ESTADO_TAREA_LABEL[a.estadoTarea] ?? a.estadoTarea}</span>
                </TableCell>
                <TableCell className="text-sm">{a.parteNombre}</TableCell>
                <TableCell className="font-mono font-medium">{a.codigo}</TableCell>
                <TableCell className="text-sm tabular-nums">{fechaHora(a.fechaPlanificada)}</TableCell>
                <TableCell className="text-sm tabular-nums">{a.fechaPlanificada ? fechaHora(a.avisarDesde) : "Sin planificar"}</TableCell>
                <TableCell className="text-sm">
                  {a.firmaPendiente ? <span className="text-red-700">Falta su firma{a.obligatoria ? " (punto de espera)" : ""}</span>
                    : a.convocar ? <span className="text-amber-800">Convocar</span>
                    : <span className="text-muted-foreground">{a.obligatoria ? "Punto de espera" : "Aviso"}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
