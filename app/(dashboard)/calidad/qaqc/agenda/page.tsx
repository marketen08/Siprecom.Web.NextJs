"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertOctagon, Eye, PenLine } from "lucide-react"

import { useAgenda } from "@/features/qaqc/api/use-qaqc"
import { CLASE_SELECT, Encabezado, FilaVacia, TipoBadge } from "@/features/qaqc/components/comunes"
import { TipoPunto } from "@/features/qaqc/types"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/**
 * Puntos de inspección: las intervenciones HP y W que esperan a una parte y que ningún HP
 * anterior frena. Primero lo que ya se puede firmar; los W avisan que hay que presenciar.
 */
export default function AgendaQaqcPage() {
  const { data, isLoading, error } = useAgenda()
  const [pie, setPie] = useState("")
  const [soloMias, setSoloMias] = useState(false)
  const [soloListos, setSoloListos] = useState(false)

  const pies = useMemo(() => [...new Map((data ?? []).map((a) => [a.pieId, a.pieCodigo])).entries()], [data])
  const filas = useMemo(
    () => (data ?? []).filter((a) => (!pie || a.pieId === pie) && (!soloMias || a.esMia) && (!soloListos || a.listo)),
    [data, pie, soloMias, soloListos],
  )
  const hp = (data ?? []).filter((a) => a.tipo === TipoPunto.HP).length
  const w = (data ?? []).filter((a) => a.tipo === TipoPunto.W).length
  const listos = (data ?? []).filter((a) => a.listo).length

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Puntos de inspección"
        descripcion="Los puntos de detención (HP) y de presencia (W) que esperan a cada parte. No aparecen los que todavía frena un HP anterior sin firmar."
      />

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        <span className="inline-flex items-center gap-1.5 text-red-700"><AlertOctagon className="h-4 w-4" /><strong className="tabular-nums">{hp}</strong> HP</span>
        <span className="inline-flex items-center gap-1.5 text-amber-800"><Eye className="h-4 w-4" /><strong className="tabular-nums">{w}</strong> W a presenciar</span>
        <span className="inline-flex items-center gap-1.5 text-blue-700"><PenLine className="h-4 w-4" /><strong className="tabular-nums">{listos}</strong> listos para firmar</span>
        <div className="ml-auto flex flex-wrap items-center gap-4">
          <select value={pie} onChange={(e) => setPie(e.target.value)} className={`${CLASE_SELECT} w-56`}>
            <option value="">Todos los PIE</option>
            {pies.map(([id, codigo]) => <option key={id} value={id}>{codigo}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
            <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={soloMias} onChange={(e) => setSoloMias(e.target.checked)} /> Solo mis partes
          </label>
          <label className="flex items-center gap-2 cursor-pointer select-none whitespace-nowrap">
            <input type="checkbox" className="h-4 w-4 accent-blue-600" checked={soloListos} onChange={(e) => setSoloListos(e.target.checked)} /> Solo listos para firmar
          </label>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{(error as Error).message}</p>}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Tipo</TableHead>
              <TableHead>PIE / hoja</TableHead>
              <TableHead className="w-16">Punto</TableHead>
              <TableHead>Actividad</TableHead>
              <TableHead>Parte</TableHead>
              <TableHead>Situación</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filas.length === 0 && <FilaVacia columnas={6} cargando={isLoading} vacio="No hay puntos de inspección pendientes." />}
            {filas.map((a) => (
              <TableRow key={`${a.puntoId}-${a.parteId}`}>
                <TableCell><TipoBadge tipo={a.tipo} /></TableCell>
                <TableCell>
                  <div className="font-medium">{a.pieCodigo}</div>
                  <div className="text-xs text-muted-foreground">{a.hojaNumero ? `PIE Nº ${a.hojaNumero} · ` : ""}{a.hojaNombre} · {a.etapaNombre}</div>
                </TableCell>
                <TableCell className="tabular-nums">{a.puntoNumero}</TableCell>
                <TableCell className="max-w-md whitespace-normal">
                  <Link href={`/calidad/qaqc/pie/${a.pieId}`} className="hover:underline">{a.actividad}</Link>
                </TableCell>
                <TableCell>
                  <div>{a.parteNombre}</div>
                  {a.esMia && <div className="text-xs font-medium text-blue-700">Te toca</div>}
                </TableCell>
                <TableCell className="max-w-xs whitespace-normal text-xs">
                  {a.listo
                    ? <span className="font-medium text-blue-700">{a.tipo === TipoPunto.W ? "Presenciar y firmar" : "Listo para firmar"}</span>
                    : <span className="text-muted-foreground">{a.motivo}</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
