"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ClipboardCheck, FileSpreadsheet, History, Pencil, Plus, Trash2 } from "lucide-react"

import { descargarTrazabilidad, lineas as apiLineas, useDeleteJunta, useJuntas } from "@/features/soldadura/api/use-juntas"
import { descargar } from "@/features/soldadura/api/use-inspeccion"
import { fechaCorta } from "@/features/soldadura/types"
import {
  ESTADO_JUNTA, EstadoJunta, OrigenWps, PasadaJunta, ResultadoHabilitacion, UbicacionJunta, type Junta,
} from "@/features/soldadura/types-juntas"
import type { ResultadoCarga } from "@/features/soldadura/types-inspeccion"
import { CLASE_SELECT, ConfirmarBorrado, Encabezado, FilaVacia, usePermisosSoldadura } from "@/features/soldadura/components/comunes"
import { JuntaSheet, formDeJunta } from "@/features/soldadura/components/junta-sheet"
import { HistorialSheet } from "@/features/soldadura/components/historial-sheet"
import { VisualDialog } from "@/features/soldadura/components/visual-dialog"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

const COLOR_HAB: Record<ResultadoHabilitacion, string> = {
  [ResultadoHabilitacion.Habilitado]: "text-green-700",
  [ResultadoHabilitacion.ConAdvertencia]: "text-amber-700",
  [ResultadoHabilitacion.NoHabilitado]: "text-red-700 font-semibold",
}

/**
 * Juntas de una línea. La línea elegida va en la URL (?linea=) para que el link desde
 * la pantalla de líneas abra directo y para que se pueda compartir.
 */
export default function JuntasPage() {
  // useSearchParams pide un límite de Suspense en el render estático.
  return (
    <Suspense fallback={null}>
      <Juntas />
    </Suspense>
  )
}

function Juntas() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const lineas = apiLineas.useList()
  const listaLineas = useMemo(() => lineas.data ?? [], [lineas.data])
  const lineaId = params.get("linea") ?? ""
  const linea = listaLineas.find((l) => l.id === lineaId) ?? null

  // Sin línea elegida, la primera: la pantalla nunca queda vacía si hay líneas.
  useEffect(() => {
    if (!lineaId && listaLineas.length > 0) router.replace(`${pathname}?linea=${listaLineas[0].id}`)
  }, [lineaId, listaLineas, pathname, router])

  const juntas = useJuntas(linea?.id ?? null)
  const borrar = useDeleteJunta()
  const { padron } = usePermisosSoldadura()
  const [editando, setEditando] = useState<ReturnType<typeof formDeJunta> | null>(null)
  const [aBorrar, setABorrar] = useState<Junta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [buscar, setBuscar] = useState("")
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set())
  const [visualAbierta, setVisualAbierta] = useState(false)
  const [historialId, setHistorialId] = useState<string | null>(null)
  const [carga, setCarga] = useState<ResultadoCarga | null>(null)

  const todas = useMemo(() => (linea ? juntas.data ?? [] : []), [juntas.data, linea])
  const lista = useMemo(() => {
    const q = buscar.trim().toLowerCase()
    return todas.filter((j) => !q || [j.identificacion, j.numero, ...j.soldadores.map((s) => s.cuno ?? "")].some((v) => v.toLowerCase().includes(q)))
  }, [todas, buscar])

  const resumen = useMemo(() => ({
    total: todas.length,
    soldadas: todas.filter((j) => j.estado === EstadoJunta.Soldada).length,
    sinWps: todas.filter((j) => !j.wpsId).length,
    difieren: todas.filter((j) => j.wpsDifiereDeMatriz).length,
    noHabilitadas: todas.filter((j) => j.habilitacion === ResultadoHabilitacion.NoHabilitado).length,
    rechazadas: todas.filter((j) => j.estado === EstadoJunta.Rechazada).length,
    liberadas: todas.filter((j) => j.estado === EstadoJunta.Liberada).length,
  }), [todas])

  // La visual se carga sobre juntas soldadas; las que no lo están se descartan de la selección.
  const elegidas = todas.filter((j) => seleccion.has(j.id) && j.estado !== EstadoJunta.Registrada)
  function alternar(id: string) {
    setSeleccion((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  if (!lineas.isLoading && listaLineas.length === 0) {
    return (
      <div className="space-y-4">
        <Encabezado titulo="Juntas" descripcion="Todavía no hay líneas. Las juntas se cargan dentro de una línea." />
        <p className="text-sm">
          Creá la primera en <Link href="/calidad/soldadura/lineas" className="text-blue-700 underline">Líneas</Link>{" "}
          o cargá todo junto desde <Link href="/calidad/soldadura/importar-juntas" className="text-blue-700 underline">Importar juntas</Link>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Juntas"
        descripcion="Las juntas de la línea con su WPS, sus soldadores por pasada y su material. El WPS sale de la matriz y cada soldador se valida contra sus calificaciones a la fecha de soldadura."
      >
        {linea && (
          <>
            <Button variant="outline" className="gap-2" disabled={!padron || elegidas.length === 0}
              title={elegidas.length === 0 ? "Elegí juntas soldadas en la tabla." : undefined}
              onClick={() => setVisualAbierta(true)}>
              <ClipboardCheck className="h-4 w-4" /> Visual{elegidas.length > 0 ? ` (${elegidas.length})` : ""}
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => descargarTrazabilidad(linea.id)}>
              <FileSpreadsheet className="h-4 w-4" /> Trazabilidad
            </Button>
            <Button className="gap-2" disabled={!padron} onClick={() => setEditando(formDeJunta(linea))}>
              <Plus className="h-4 w-4" /> Nueva junta
            </Button>
          </>
        )}
      </Encabezado>

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Línea</label>
          <select value={lineaId} onChange={(e) => router.replace(`${pathname}?linea=${e.target.value}`)} className={`${CLASE_SELECT} mt-0.5 w-72`}>
            {listaLineas.map((l) => <option key={l.id} value={l.id}>{l.codigo}{l.claseCodigo ? ` · ${l.claseCodigo}` : ""}</option>)}
          </select>
        </div>
        <Input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar junta o cuño" className="max-w-xs" />
      </div>

      {linea && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <span><strong className="tabular-nums">{resumen.soldadas}</strong> de <strong className="tabular-nums">{resumen.total}</strong> soldadas</span>
          {resumen.sinWps > 0 && <span className="text-amber-700">{resumen.sinWps} sin WPS</span>}
          {resumen.difieren > 0 && <span className="text-amber-700">{resumen.difieren} con WPS distinto de la matriz</span>}
          {resumen.noHabilitadas > 0 && <span className="text-red-700">{resumen.noHabilitadas} con soldador no habilitado</span>}
          {resumen.rechazadas > 0 && <span className="text-red-700">{resumen.rechazadas} rechazadas para reparar</span>}
          <span className="text-green-700">{resumen.liberadas} liberadas</span>
          <span className="ml-auto flex gap-3 text-xs">
            <button className="text-blue-700 underline" onClick={() => descargar(`lineas/${linea.id}/inspeccion-visual`)}>Registro de visual</button>
            <button className="text-blue-700 underline" onClick={() => descargar(`lineas/${linea.id}/control-parametros`)}>Control de parámetros</button>
          </span>
        </div>
      )}
      {carga && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm">
          Visual cargada en {carga.procesadas} junta{carga.procesadas !== 1 ? "s" : ""}
          {carga.rechazadas > 0 && <>, {carga.rechazadas} rechazada{carga.rechazadas !== 1 ? "s" : ""}</>}
          {carga.noConformidadesCreadas > 0 && <>, {carga.noConformidadesCreadas} no conformidad{carga.noConformidadesCreadas !== 1 ? "es" : ""} abierta{carga.noConformidadesCreadas !== 1 ? "s" : ""}</>}.
          {carga.avisos.map((a) => <p key={a} className="text-amber-800 text-xs mt-1">{a}</p>)}
          <button className="ml-2 text-xs underline" onClick={() => setCarga(null)}>cerrar</button>
        </div>
      )}

      <div className="rounded-lg border bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8">
                <input type="checkbox" className="h-4 w-4 accent-blue-600" title="Elegir todas las soldadas"
                  checked={lista.length > 0 && lista.filter((j) => j.estado !== EstadoJunta.Registrada).every((j) => seleccion.has(j.id))}
                  onChange={(e) => setSeleccion(e.target.checked ? new Set(lista.filter((j) => j.estado !== EstadoJunta.Registrada).map((j) => j.id)) : new Set())} />
              </TableHead>
              <TableHead className="font-semibold text-gray-700">Junta</TableHead>
              <TableHead className="w-20 font-semibold text-gray-700">Tipo</TableHead>
              <TableHead className="w-28 font-semibold text-gray-700">Ø / esp.</TableHead>
              <TableHead className="font-semibold text-gray-700">WPS</TableHead>
              <TableHead className="font-semibold text-gray-700">Raíz</TableHead>
              <TableHead className="font-semibold text-gray-700">Relleno / term.</TableHead>
              <TableHead className="font-semibold text-gray-700">Material</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700">Estado</TableHead>
              <TableHead className="w-32 font-semibold text-gray-700 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {juntas.isLoading || lista.length === 0 ? (
              <FilaVacia columnas={10} cargando={juntas.isLoading} vacio={todas.length ? "Ninguna junta coincide." : "La línea no tiene juntas."} />
            ) : lista.map((j) => (
              <TableRow key={j.id}>
                <TableCell>
                  <input type="checkbox" className="h-4 w-4 accent-blue-600" disabled={j.estado === EstadoJunta.Registrada}
                    checked={seleccion.has(j.id)} onChange={() => alternar(j.id)} />
                </TableCell>
                <TableCell className="font-mono font-medium">
                  {j.identificacion}
                  <span className="block font-sans text-xs text-muted-foreground">
                    {j.ubicacion === UbicacionJunta.Prefabricado ? "Prefabricado" : "Obra"}{j.claseCodigo ? ` · ${j.claseCodigo}` : ""}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{j.tipoJunta ?? "—"}</TableCell>
                <TableCell className="text-sm tabular-nums">{j.diametro != null ? `${j.diametro}"` : "—"}{j.espesor != null ? ` · ${j.espesor} mm` : ""}</TableCell>
                <TableCell className="text-sm">
                  {j.wpsTexto ?? <span className="text-amber-700">Sin WPS</span>}
                  {j.origenWps === OrigenWps.Manual && <span className="block text-xs text-muted-foreground">elegido a mano</span>}
                  {(j.wpsDifiereDeMatriz || (!j.wpsId && j.wpsObservacion)) && <span className="block text-xs text-amber-700" title={j.wpsObservacion ?? undefined}>{j.wpsDifiereDeMatriz ? "distinto de la matriz" : "ver motivo"}</span>}
                </TableCell>
                <TableCell className="text-sm"><Cunos j={j} pasadas={[PasadaJunta.Raiz, PasadaJunta.Completa]} /></TableCell>
                <TableCell className="text-sm"><Cunos j={j} pasadas={[PasadaJunta.RellenoTerminacion, PasadaJunta.Completa]} /></TableCell>
                <TableCell className="text-xs">
                  {[j.piezaACodigo, j.piezaBCodigo].filter(Boolean).join(" + ") || "—"}
                  {j.lotes.length > 0 && <span className="block text-muted-foreground">{j.lotes.map((l) => l.texto).join(", ")}</span>}
                </TableCell>
                <TableCell className="tabular-nums text-sm">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_JUNTA[j.estado].clase}`}>{ESTADO_JUNTA[j.estado].label}</span>
                  {j.cicloActual > 0 && <span className="ml-1 text-xs text-muted-foreground">R{j.cicloActual}</span>}
                  {j.fechaSoldadura && <span className="block text-xs text-muted-foreground">{fechaCorta(j.fechaSoldadura)}</span>}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" className="h-8 w-8" title="Historial, reparación y controles" onClick={() => setHistorialId(j.id)}>
                    <History className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!padron || !linea} title="Editar"
                    onClick={() => linea && setEditando(formDeJunta(linea, j))}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" disabled={!padron} title="Eliminar"
                    onClick={() => { setError(null); setABorrar(j) }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-sm text-muted-foreground">{lista.length} juntas</p>

      {linea && editando && <JuntaSheet linea={linea} inicial={editando} onCerrar={() => setEditando(null)} />}
      {linea && visualAbierta && elegidas.length > 0 && (
        <VisualDialog juntas={elegidas} onCerrar={(r) => { setVisualAbierta(false); if (r) { setCarga(r); setSeleccion(new Set()) } }} />
      )}
      {historialId && <HistorialSheet juntaId={historialId} onCerrar={() => setHistorialId(null)} />}

      <ConfirmarBorrado
        abierto={aBorrar !== null}
        titulo="Eliminar junta"
        descripcion={<>¿Eliminar la junta <strong>{aBorrar?.identificacion}</strong>? Sus soldaduras dejan de contar para la continuidad de los soldadores.</>}
        pendiente={borrar.isPending}
        error={error}
        onCancelar={() => setABorrar(null)}
        onConfirmar={async () => { try { await borrar.mutateAsync(aBorrar!.id); setABorrar(null) } catch (e) { setError((e as Error).message) } }}
      />
    </div>
  )
}

/** Cuños de las pasadas pedidas, coloreados por el resultado de la habilitación. */
function Cunos({ j, pasadas }: { j: Junta; pasadas: PasadaJunta[] }) {
  const s = j.soldadores.filter((x) => pasadas.includes(x.pasada))
  if (s.length === 0) return <span className="text-muted-foreground">—</span>
  return (
    <span className="flex flex-wrap gap-x-2">
      {s.map((x) => (
        <span key={x.id} className={`font-mono ${COLOR_HAB[x.resultado]}`} title={`${x.nombre ?? ""}${x.proceso ? ` · ${x.proceso}` : ""}\n${x.detalle ?? ""}${x.forzar ? `\nForzado: ${x.motivoForzado ?? ""}` : ""}`}>
          {x.cuno}{x.forzar ? "*" : ""}
        </span>
      ))}
    </span>
  )
}
