"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { useVencimientos } from "@/features/soldadura/api/use-soldadura"
import { EstadoVencimiento, TipoVencimiento, fechaCorta } from "@/features/soldadura/types"
import { CLASE_SELECT, Encabezado, EstadoBadge, FilaVacia } from "@/features/soldadura/components/comunes"

import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"

const FILTROS = [
  { valor: "alerta", label: "Vencidas y por vencer" },
  { valor: "todas", label: "Todas" },
] as const

/**
 * Tablero de vencimientos: calificaciones de los soldadores habilitados en el
 * proyecto y certificados del personal de END. Una calificación vence por la primera
 * de sus dos fechas —la del certificado o la de continuidad—, y la columna Motivo
 * dice cuál manda.
 */
export default function SoldaduraVencimientosPage() {
  const [dias, setDias] = useState(30)
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["valor"]>("alerta")
  const { data, isLoading } = useVencimientos(dias)

  const items = useMemo(
    () => (data?.items ?? []).filter((i) => filtro === "todas" || i.estado !== EstadoVencimiento.Vigente),
    [data, filtro],
  )

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Control de soldadura"
        descripcion={
          <>
            Vencimientos de las calificaciones de los soldadores habilitados y de los certificados
            del personal de END. Una calificación caduca por su vencimiento o por continuidad: si
            el soldador no usa el proceso durante los meses que fija la norma (seis en ASME IX).
          </>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
        <Contador titulo="Vencidas" valor={data?.vencidas} clase="text-red-700" />
        <Contador titulo={`Por vencer (${dias} días)`} valor={data?.porVencer} clase="text-amber-700" />
        <Contador titulo="Vigentes" valor={data?.vigentes} clase="text-green-700" />
      </div>

      {(data?.soldadoresSinCalificacionVigente.length ?? 0) > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 max-w-3xl">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Soldadores habilitados sin ninguna calificación vigente</p>
            <p className="text-xs mt-0.5">
              No pueden soldar en el proyecto hasta que se cargue o renueve su calificación.
            </p>
            <ul className="mt-1.5 list-disc pl-5">
              {data!.soldadoresSinCalificacionVigente.map((s) => <li key={s}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Mostrar</label>
          <select value={filtro} onChange={(e) => setFiltro(e.target.value as typeof filtro)} className={`${CLASE_SELECT} mt-0.5 w-56`}>
            {FILTROS.map((f) => <option key={f.valor} value={f.valor}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Aviso con anticipación</label>
          <select value={dias} onChange={(e) => setDias(Number(e.target.value))} className={`${CLASE_SELECT} mt-0.5 w-36`}>
            {[15, 30, 60, 90].map((d) => <option key={d} value={d}>{d} días</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-28 font-semibold text-gray-700">Estado</TableHead>
              <TableHead className="font-semibold text-gray-700">Persona</TableHead>
              <TableHead className="font-semibold text-gray-700">Calificación</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700">Vale hasta</TableHead>
              <TableHead className="w-48 font-semibold text-gray-700">Motivo</TableHead>
              <TableHead className="w-24 font-semibold text-gray-700 text-right">Días</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || items.length === 0 ? (
              <FilaVacia
                columnas={6}
                cargando={isLoading}
                vacio={filtro === "alerta" ? "No hay nada vencido ni por vencer." : "No hay calificaciones cargadas."}
              />
            ) : (
              items.map((i) => (
                <TableRow key={`${i.tipo}-${i.id}`}>
                  <TableCell><EstadoBadge estado={i.estado} /></TableCell>
                  <TableCell className="font-medium">
                    {i.cuno && <span className="font-mono text-xs text-muted-foreground mr-2">{i.cuno}</span>}
                    {i.persona}
                    <span className="block text-xs text-muted-foreground">
                      {i.tipo === TipoVencimiento.PersonalEnd ? "Personal de END" : "Soldador"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">{i.detalle}</TableCell>
                  <TableCell className="tabular-nums">{fechaCorta(i.fechaLimite)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{i.motivo}</TableCell>
                  <TableCell className={`text-right tabular-nums ${i.diasRestantes < 0 ? "text-red-700" : ""}`}>
                    {i.diasRestantes}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-sm text-muted-foreground">
        Las calificaciones se cargan en <Link href="/calidad/soldadura/soldadores" className="text-blue-700 underline">Soldadores</Link>{" "}
        y los certificados de ensayistas en <Link href="/calidad/soldadura/personal-end" className="text-blue-700 underline">Personal de END</Link>.
      </p>
    </div>
  )
}

function Contador({ titulo, valor, clase }: { titulo: string; valor: number | undefined; clase: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{titulo}</p>
      <p className={`mt-1 text-3xl font-semibold tabular-nums ${clase}`}>{valor ?? "—"}</p>
    </div>
  )
}
